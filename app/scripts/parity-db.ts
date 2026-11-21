// PG3 parity, implementation 3: the Supabase RPCs (save_booking, create_invoice, cancel_booking) on PGlite,
// driven by the same tests/vectors/*.json as tests/unit/parity.test.ts (calc.ts + mock repo).
//   npm run test:parity      → vitest parity (calc + repo), then this file (RPCs)
// RPCs are called as the `authenticated` role with an admin's JWT claims — the same path the API takes —
// so the grants and the role check inside each function are exercised too. Every case rolls back.
import type { PGlite } from "@electric-sql/pglite";
import { isDeepStrictEqual } from "node:util";
import bookingVectors from "../tests/vectors/bookings.json";
import invoiceVectors from "../tests/vectors/invoices.json";
import { bootDb } from "./db-harness";

type Req = { type: string; dp?: { method: string; value: number }; amount?: number };
const ADMIN = "00000000-0000-4000-8000-00000000ad01";

class RpcError extends Error {
  constructor(readonly code: string, readonly detail?: string) {
    super(code);
  }
}

async function rpc<T>(pg: PGlite, sql: string, params: unknown[]): Promise<T> {
  await pg.query("savepoint rpc");
  try {
    const r = await pg.query<{ r: T }>(sql, params);
    await pg.query("release savepoint rpc");
    return r.rows[0].r;
  } catch (e) {
    await pg.query("rollback to savepoint rpc");
    const err = e as { message: string; detail?: string };
    throw new RpcError(err.message, err.detail);
  }
}

const asAdmin = (pg: PGlite) =>
  pg.exec(`set local role authenticated; select set_config('request.jwt.claims', '{"sub":"${ADMIN}","role":"authenticated"}', true);`);
const asOwner = (pg: PGlite) => pg.exec("reset role;");

const saveBooking = (pg: PGlite, payload: unknown) => rpc<Record<string, unknown>>(pg, "select public.save_booking($1::jsonb) as r", [JSON.stringify(payload)]);
const createInvoice = (pg: PGlite, bookingId: string, q: Req) =>
  rpc<{ invoice: Record<string, unknown>; booking: Record<string, unknown> }>(pg, "select public.create_invoice($1::uuid, $2, $3, $4::numeric, $5::numeric) as r", [
    bookingId, q.type, q.dp?.method ?? null, q.dp?.value ?? null, q.amount ?? null,
  ]);
const cancelBooking = (pg: PGlite, id: string) => rpc<unknown>(pg, "select public.cancel_booking($1::uuid, '') as r", [id]);

async function addPackage(pg: PGlite, name: string, price: number, active = true): Promise<string> {
  const r = await pg.query<{ id: string }>(
    "insert into public.packages (name, price, is_active, archived_at) values ($1, $2, $3, case when $3 then null else now() end) returning id",
    [name, price, active],
  );
  return r.rows[0].id;
}

const lines = (items: [number, number][]) => items.map(([price, qty], i) => ({ name: `Item ${i + 1}`, price, qty }));

// ── Invoice vectors ─────────────────────────────────────────────────────────────────────────────
type InvoiceCase = (typeof invoiceVectors.cases)[number] & { cancel?: boolean; editItems?: [number, number][] };

async function invoiceCase(pg: PGlite, c: InvoiceCase) {
  const pkg = await addPackage(pg, "pkg_parity", c.packagePrice);
  await asAdmin(pg);
  const base = { clientName: "Parity Client", clientPhone: "081234567890", packageId: pkg, bookingDate: "2026-12-05", crewIds: [], terms: "" };
  const b = await saveBooking(pg, { ...base, items: lines(c.items as [number, number][]) });
  const id = b.id as string;
  for (const p of c.prior as Req[]) await createInvoice(pg, id, p);
  if (c.editItems) await saveBooking(pg, { ...base, id, items: lines([...(c.items as [number, number][]), ...c.editItems]) });
  if (c.cancel) await cancelBooking(pg, id);
  try {
    const r = await createInvoice(pg, id, c.request as Req);
    return { amount: Number(r.invoice.amount), status: r.booking.status };
  } catch (e) {
    if (e instanceof RpcError) return { error: e.code };
    throw e;
  }
}

// ── Booking vectors ─────────────────────────────────────────────────────────────────────────────
type BookingCase = {
  name: string;
  existing?: { input: Record<string, unknown>; invoices?: Req[]; cancel?: boolean; archive?: string; reprice?: Record<string, number> };
  input: Record<string, unknown>;
  expect: { errors?: Record<string, unknown>; booking?: Record<string, unknown> };
};

const camel = (row: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), typeof v === "string" && /^\d+$/.test(v) && k.match(/total|price/) ? Number(v) : v]));

async function bookingCase(pg: PGlite, c: BookingCase) {
  const pkgIds: Record<string, string> = {};
  for (const p of bookingVectors.packages) pkgIds[p.key] = await addPackage(pg, p.key, p.price, p.active);
  const crewIds: Record<string, string> = {};
  for (const k of bookingVectors.crew) crewIds[k] = (await pg.query<{ id: string }>("insert into public.crew (name) values ($1) returning id", [k])).rows[0].id;

  const payload = (fields: Record<string, unknown>, id?: string, current?: string) => {
    const v = { ...bookingVectors.base, ...fields } as Record<string, unknown>;
    return {
      id,
      clientName: v.clientName,
      clientPhone: v.clientPhone,
      bookingName: v.bookingName,
      packageId: v.packageKey ? pkgIds[v.packageKey as string] : null,
      bookingDate: v.bookingDate ?? null,
      items: v.items,
      crewIds: (v.crewKeys as string[]).map((k) => crewIds[k]),
      terms: v.terms,
      eventStart: v.eventStart,
      location: v.location,
      notes: v.notes,
      paymentInstruction: v.paymentInstruction,
      expectedUpdatedAt: v.expectedUpdatedAt === "$current" ? current : v.expectedUpdatedAt === "$stale" ? "2000-01-01T00:00:00.000Z" : undefined,
    };
  };

  await asAdmin(pg);
  let id: string | undefined;
  if (c.existing) {
    id = (await saveBooking(pg, payload(c.existing.input))).id as string;
    for (const p of c.existing.invoices ?? []) await createInvoice(pg, id, p);
    if (c.existing.cancel) await cancelBooking(pg, id);
    await asOwner(pg);
    for (const [key, price] of Object.entries(c.existing.reprice ?? {})) await pg.query("update public.packages set price = $1 where id = $2", [price, pkgIds[key]]);
    if (c.existing.archive) await pg.query("update public.packages set is_active = false, archived_at = now() where id = $1", [pkgIds[c.existing.archive]]);
    await asAdmin(pg);
  }
  // The version the form would hold: iso_utc(updated_at), read as the owner (the API's own format).
  let current: string | undefined;
  if (id) {
    await asOwner(pg);
    current = (await pg.query<{ v: string }>("select public.iso_utc(updated_at) as v from public.bookings where id = $1", [id])).rows[0].v;
    await asAdmin(pg);
  }
  try {
    const row = camel(await saveBooking(pg, payload(c.input, id, current)));
    // RLS hides booking_crew from `authenticated` (no policies until P4 / P10), so count as the owner.
    await asOwner(pg);
    const crewCount = (await pg.query<{ n: number }>("select count(*)::int as n from public.booking_crew where booking_id = $1", [row.id])).rows[0].n;
    return { booking: { ...row, crewCount } };
  } catch (e) {
    if (!(e instanceof RpcError)) throw e;
    if (e.code !== "booking_invalid") return { errors: { code: e.code } };
    return { errors: JSON.parse(e.detail!) };
  }
}

// ── Runner ──────────────────────────────────────────────────────────────────────────────────────
async function main() {
  const pg = await bootDb({ quiet: true });
  await pg.exec(`insert into auth.users (id, email) values ('${ADMIN}', 'parity-admin@example.test');
                 insert into public.profiles (id, display_name, role) values ('${ADMIN}', 'Parity Admin', 'admin')
                   on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;`);
  let pass = 0;
  const fails: string[] = [];

  const run = async (name: string, fn: () => Promise<unknown>, check: (got: unknown) => boolean, want: unknown) => {
    await pg.exec("begin");
    try {
      const got = await fn();
      if (check(got)) pass++;
      else fails.push(`${name}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
    } catch (e) {
      fails.push(`${name}\n    threw ${(e as Error).message} ${(e as RpcError).detail ?? ""}`);
    } finally {
      await pg.exec("rollback");
    }
  };

  for (const c of invoiceVectors.cases as InvoiceCase[]) {
    await run(`rpc · invoice · ${c.name}`, () => invoiceCase(pg, c), (got) => isDeepStrictEqual(got, c.expect), c.expect);
  }
  for (const c of bookingVectors.cases as BookingCase[]) {
    await run(`rpc · booking · ${c.name}`, () => bookingCase(pg, c), (got) => {
      const g = got as { errors?: unknown; booking?: Record<string, unknown> };
      if (c.expect.errors) return isDeepStrictEqual(g.errors, c.expect.errors);
      return !!g.booking && Object.entries(c.expect.booking!).every(([k, v]) => isDeepStrictEqual(g.booking![k], v));
    }, c.expect);
  }

  await pg.close();
  for (const f of fails) console.error(`✘ ${f}`);
  console.log(`\nRPC parity: ${pass} passed, ${fails.length} failed (${invoiceVectors.cases.length} invoice + ${bookingVectors.cases.length} booking vectors)`);
  process.exit(fails.length ? 1 : 0);
}

main();
