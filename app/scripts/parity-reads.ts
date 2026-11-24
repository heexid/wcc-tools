// PG3 read parity (P3): the prototype's read helpers (filterBookings, listBookings, getBooking, computeKpis,
// getCrewSchedule, listPackages) vs the SQL reads of migration 004 / 003, on the same seed.
//   npm run test:parity   (runs after the write parity)
// Ids map through the seed generator's deterministic uuid(). Fields that differ by design are left out:
//   createdBy / canceledBy (prototype stores the text "Admin"; Supabase resolves a profile name),
//   PackageRow.legacyBookings (prototype-only; `bookings` is checked against the real seeded count).
import type { PGlite } from "@electric-sql/pglite";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { seedDb } from "../src/lib/data/seed";
import { computeKpis, filterBookings, listBookings, listPackages, type BookingQuery } from "../src/lib/data/repo";
import { invoicesOf } from "../src/lib/data/ledger";
import type { Db } from "../src/lib/data/types";
import { bootDb } from "./db-harness";

const uuid = (key: string) => {
  const h = createHash("md5").update(`bs.moment-seed:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
};
const TODAY = "2026-11-10";
const db: Db = seedDb();

// ── Normalise the prototype's rows into the DB's ids ───────────────────────────────────────────
type Row = Record<string, unknown>;
const OMIT = new Set(["createdBy", "canceledBy"]);
function mapRow(r: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(r)) {
    if (OMIT.has(k)) continue;
    if (k === "id" || k === "packageId") out[k] = uuid(v as string);
    else if (k === "crewIds") out[k] = (v as string[]).map(uuid);
    else if (k === "items") out[k] = (v as Row[]).map((i) => ({ ...i, id: uuid(i.id as string) }));
    else out[k] = v;
  }
  return out;
}
const strip = (r: Row) => Object.fromEntries(Object.entries(r).filter(([k]) => !OMIT.has(k)));
const mapQuery = (q: BookingQuery) => ({ ...q, crewIds: q.crewIds?.map(uuid), packageIds: q.packageIds?.map(uuid) });

// ── Cases ───────────────────────────────────────────────────────────────────────────────────────
const queries: [string, BookingQuery][] = [
  ["all, default order", {}],
  ["table default (today)", { view: "table", today: TODAY }],
  ["calendar hides canceled", { view: "calendar" }],
  ["calendar shows canceled when filtered", { view: "calendar", status: ["canceled"] }],
  ["search name", { search: "sari" }],
  ["search ref", { search: "BK-2026-014" }],
  ["search local phone 0812", { search: "0812" }],
  ["search phone digits 5550", { search: "5550" }],
  ["search 2 digits (no phone match)", { search: "81" }],
  ["search no hit", { search: "zzz" }],
  ["status partially_paid", { status: ["partially_paid"] }],
  ["status paid + draft", { status: ["paid", "draft"] }],
  ["crew Raka", { crewIds: ["crew_rp"] }],
  ["crew Raka OR Sinta", { crewIds: ["crew_rp", "crew_sd"] }],
  ["package gold", { packageIds: ["pkg_gold"] }],
  ["range Nov", { from: "2026-11-01", to: "2026-11-30" }],
  ["range + status + crew", { from: "2026-10-01", to: "2026-11-15", status: ["partially_paid", "paid"], crewIds: ["crew_da"] }],
  ["sort total desc", { sort: { key: "total", dir: "desc" } }],
  ["sort remaining asc", { sort: { key: "remaining", dir: "asc" } }],
  ["sort status desc", { sort: { key: "status", dir: "desc" } }],
  ["sort date desc", { sort: { key: "bookingDate", dir: "desc" } }],
  ["table + search + sort", { view: "table", today: TODAY, search: "wedding", sort: { key: "total", dir: "asc" } }],
  // P6 search rewrite (escaped ILIKE, index-friendly phone forms) must keep matchesSearch semantics exactly.
  ["search % is literal", { search: "%" }],
  ["search _ is literal", { search: "_" }],
  ["search backslash", { search: "\\" }],
  ["search padded + mixed case", { search: "  SaRi  " }],
  ["search middot name", { search: "Wedding · Sari" }],
  ["search local phone 08123", { search: "08123" }],
  ["search intl phone 62812", { search: "62812" }],
  ["search +62 812-3456", { search: "+62 812-3456" }],
  ["search mid-number 0 (from local form)", { search: "0123" }],
  ["search digits + letters", { search: "bk 0142" }],
  // P6 calendar windows: month grid incl. outside days, a week, a day, with and without filters.
  ["calendar Nov grid", { view: "calendar", from: "2026-10-26", to: "2026-12-06" }],
  ["calendar week", { view: "calendar", from: "2026-11-09", to: "2026-11-15" }],
  ["calendar day", { view: "calendar", from: "2026-11-14", to: "2026-11-14" }],
  ["calendar week + crew + canceled", { view: "calendar", from: "2026-11-23", to: "2026-11-29", status: ["canceled", "draft"], crewIds: ["crew_bs"] }],
];
const pages: [string, BookingQuery][] = [
  ["page 1 / 10", { view: "table", today: TODAY, page: 1, pageSize: 10 }],
  ["page 3 / 10", { view: "table", today: TODAY, page: 3, pageSize: 10 }],
  ["page 2 / 25", { view: "table", today: TODAY, page: 2, pageSize: 25 }],
  ["page 99 clamps", { view: "table", today: TODAY, page: 99, pageSize: 50 }],
  ["page 0 clamps", { page: 0, pageSize: 10 }],
  ["empty result", { search: "zzz", page: 2 }],
  // URL junk (P8 review #4): both sources apply the same floor + clamp + defaults.
  ["pageSize 0 → 1", { pageSize: 0 as unknown as 10 }],
  ["pageSize 10.5 → 10", { pageSize: 10.5 as unknown as 10 }],
  ["pageSize 500 → 100", { pageSize: 500 as unknown as 10 }],
  ["page 2.9 → 2", { page: 2.9, pageSize: 10 }],
  ["pageSize Infinity → 100", { pageSize: "Infinity" as unknown as 10 }],
  ["pageSize 1e400 → 100", { pageSize: "1e400" as unknown as 10 }],
  ["pageSize empty → default", { pageSize: "" as unknown as 10 }],
  ["page Infinity → last", { page: "Infinity" as unknown as number, pageSize: 10 }],
];

async function q<T>(pg: PGlite, sql: string, params: unknown[]): Promise<T> {
  return (await pg.query<{ r: T }>(sql, params)).rows[0].r;
}

async function main() {
  const pg = await bootDb({ quiet: true });
  // Reads run as a signed-in staff member, under RLS.
  await pg.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000e1');
                 insert into public.profiles (id, display_name, role) values ('00000000-0000-4000-8000-0000000000e1', 'Reader', 'crew') on conflict (id) do nothing;
                 set role authenticated; select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1"}', false);`);
  let pass = 0;
  const fails: string[] = [];
  const check = (name: string, want: unknown, got: unknown) => {
    if (isDeepStrictEqual(want, got)) pass++;
    else {
      // Show the first differing row for a readable failure.
      const w = want as Row[], g = got as Row[];
      const i = Array.isArray(w) && Array.isArray(g) ? w.findIndex((x, k) => !isDeepStrictEqual(x, g[k])) : -1;
      fails.push(`${name}\n    want ${JSON.stringify(i >= 0 ? w[i] : want)?.slice(0, 600)}\n    got  ${JSON.stringify(i >= 0 ? g[i] : got)?.slice(0, 600)}${i >= 0 ? `\n    (row ${i}; lengths ${w.length} / ${g.length})` : ""}`);
    }
  };

  for (const [name, query] of queries) {
    const want = filterBookings(db, query).map((r) => mapRow(r as unknown as Row));
    const got = (await q<Row[]>(pg, "select public.list_all_bookings($1::jsonb) as r", [JSON.stringify(mapQuery(query))])).map(strip);
    check(`filter · ${name}`, want, got);
  }
  for (const [name, query] of pages) {
    // The mock's own listBookings (its clamps), not a re-implementation.
    const m = await listBookings(query);
    const want = { ...m, rows: m.rows.map((r) => mapRow(r as unknown as Row)) };
    const got = await q<Row>(pg, "select public.list_bookings($1::jsonb) as r", [JSON.stringify(mapQuery(query))]);
    check(`page · ${name}`, want, { ...got, rows: (got.rows as Row[]).map(strip) });
  }
  for (const ym of ["2026-10", "2026-11", "2026-12", "2027-01"]) {
    check(`kpis · ${ym}`, computeKpis(db, ym), await q(pg, "select public.get_kpis($1) as r", [ym]));
  }
  for (const ref of ["BK-2026-0142", "BK-2026-0146", "BK-2026-0144", "BK-2026-0110"]) {
    const b = db.bookings.find((x) => x.ref === ref)!;
    const row = filterBookings(db, {}).find((r) => r.id === b.id)!;
    const pkg = db.packages.find((p) => p.id === b.packageId)!;
    const want = {
      ...mapRow(row as unknown as Row),
      invoices: invoicesOf(db, b.id).map((i) => ({ ...strip(i as unknown as Row), id: uuid(i.id), bookingId: uuid(i.bookingId) })),
      crew: db.crew.filter((c) => b.crewIds.includes(c.id)).map((c) => ({ ...c, id: uuid(c.id) })),
      package: { ...pkg, id: uuid(pkg.id), legacyBookings: 0 },
    };
    const got = await q<Row>(pg, "select public.get_booking($1) as r", [ref]);
    const g = { ...strip(got), invoices: (got.invoices as Row[]).map(strip) };
    check(`detail · ${ref}`, want, g);
  }
  for (const c of db.crew) {
    const mine = filterBookings(db, { view: "calendar", crewIds: [c.id] });
    const want = { crew: { ...c, id: uuid(c.id) }, monthCount: mine.filter((b) => b.bookingDate.slice(0, 7) === TODAY.slice(0, 7)).length, upcoming: mine.filter((b) => b.bookingDate >= TODAY).map((r) => mapRow(r as unknown as Row)) };
    const got = await q<Row>(pg, "select public.get_crew_schedule($1::uuid, $2::date) as r", [uuid(c.id), TODAY]);
    check(`crew schedule · ${c.name}`, want, { ...got, upcoming: (got.upcoming as Row[]).map(strip) });
  }
  // The mock's own listPackages (its search trimming, its filters). `bookings`: the mock adds Figma's legacy counts,
  // so compare the SQL count with the real number of seeded bookings per package instead.
  for (const tab of [undefined, "active", "archived"] as const) {
    for (const search of [undefined, "wedding", "crew", "  Gold  "]) {
      const want = (await listPackages({ tab, search })).map((p) => ({ ...p, id: uuid(p.id), legacyBookings: 0, bookings: db.bookings.filter((b) => b.packageId === p.id).length }));
      const got = await q<Row[]>(pg, "select public.list_packages($1, $2) as r", [tab ?? null, search ?? null]);
      check(`packages · tab=${tab ?? "all"} search=${JSON.stringify(search ?? "")}`, want, got);
    }
  }

  await pg.close();
  for (const f of fails) console.error(`✘ ${f}`);
  console.log(`\nRead parity: ${pass} passed, ${fails.length} failed`);
  process.exit(fails.length ? 1 : 0);
}

main();
