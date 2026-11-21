// PG3 parity (PRODUCTION-PLAN P2), implementations 1 and 2: calc.ts and the mock repo, driven by the shared
// vectors in tests/vectors/*.json. Implementation 3 (the Supabase RPCs) runs the same files in
// scripts/parity-db.ts. All three must produce identical results and identical error codes.
import { beforeEach, describe, expect, it } from "vitest";
import { bookingStatus, bookingTotal, validateInvoice, type DpMethod, type InvoiceType } from "@/lib/booking/calc";
import { cancelBooking, createInvoice, saveBooking, type BookingInput } from "@/lib/data/repo";
import { getDb, resetDb } from "@/lib/data/store";
import bookingVectors from "../vectors/bookings.json";
import invoiceVectors from "../vectors/invoices.json";

type Req = { type: string; dp?: { method: string; value: number }; amount?: number };
type InvoiceCase = {
  name: string;
  packagePrice: number;
  items: [number, number][];
  prior: Req[];
  cancel?: boolean;
  editItems?: [number, number][];
  request: Req;
  expect: { amount?: number; status?: string; error?: string };
};

const asReq = (r: Req) => ({ type: r.type as InvoiceType, dp: r.dp as { method: DpMethod; value: number } | undefined, amount: r.amount });
const lines = (items: [number, number][]) => items.map(([price, qty], i) => ({ name: `Item ${i + 1}`, price, qty }));

// ── Implementation 1: calc.ts ───────────────────────────────────────────────────────────────────
function viaCalc(c: InvoiceCase) {
  let total = bookingTotal(c.packagePrice, lines(c.items));
  let paid = 0;
  let count = 0;
  for (const p of c.prior) {
    const v = validateInvoice({ total, totalPaid: paid, invoiceCount: count }, asReq(p));
    if (!v.ok) throw new Error(`prior invoice rejected: ${v.error}`);
    paid += v.amount;
    count++;
  }
  if (c.editItems) total = bookingTotal(c.packagePrice, lines([...c.items, ...c.editItems]));
  const v = validateInvoice({ total, totalPaid: paid, invoiceCount: count, canceled: !!c.cancel }, asReq(c.request));
  if (!v.ok) return { error: v.error };
  return { amount: v.amount, status: bookingStatus({ invoiceCount: count + 1, total, totalPaid: paid + v.amount }) };
}

// ── Implementation 2: the mock repo (whole write path, incl. snapshot + recompute) ───────────────
function addPackage(id: string, price: number, active = true) {
  getDb().packages.push({ id, name: id, price, summary: "", description: "", isActive: active, archivedAt: active ? null : "2026-01-01", updatedAt: "2026-01-01", legacyBookings: 0 });
}
const bookingBase = (packageId: string, items: [number, number][]): BookingInput => ({
  clientName: "Parity Client", clientPhone: "081234567890", packageId, bookingDate: "2026-12-05",
  items: lines(items), crewIds: [], terms: "",
});

async function viaRepo(c: InvoiceCase) {
  addPackage("pkg_parity", c.packagePrice);
  const saved = await saveBooking(bookingBase("pkg_parity", c.items));
  if (!saved.ok) throw new Error(`booking rejected: ${JSON.stringify(saved.errors)}`);
  const id = saved.booking.id;
  for (const p of c.prior) {
    const r = await createInvoice({ bookingId: id, ...asReq(p) });
    if (!r.ok) throw new Error(`prior invoice rejected: ${r.error}`);
  }
  if (c.editItems) {
    const r = await saveBooking({ ...bookingBase("pkg_parity", [...c.items, ...c.editItems]), id });
    if (!r.ok) throw new Error(`edit rejected: ${JSON.stringify(r.errors)}`);
  }
  if (c.cancel) {
    const r = await cancelBooking(id, "");
    if (!r.ok) throw new Error(`cancel rejected: ${r.error}`);
  }
  const r = await createInvoice({ bookingId: id, ...asReq(c.request) });
  if (!r.ok) return { error: r.error };
  return { amount: r.invoice.amount, status: r.booking.status };
}

beforeEach(() => resetDb());

describe("PG3 invoice vectors", () => {
  for (const c of invoiceVectors.cases as InvoiceCase[]) {
    it(`calc · ${c.name}`, () => expect(viaCalc(c)).toEqual(c.expect));
    it(`repo · ${c.name}`, async () => expect(await viaRepo(c)).toEqual(c.expect));
  }
});

// ── Booking vectors (mock repo only: calc.ts has no booking validation) ─────────────────────────
type BookingCase = {
  name: string;
  existing?: { input: Record<string, unknown>; invoices?: Req[]; cancel?: boolean; archive?: string; reprice?: Record<string, number> };
  input: Record<string, unknown>;
  expect: { errors?: Record<string, unknown>; booking?: Record<string, unknown> };
};

const STALE = "2000-01-01T00:00:00.000Z";
function toInput(fields: Record<string, unknown>, id?: string, current?: string): BookingInput {
  const v = { ...bookingVectors.base, ...fields } as Record<string, unknown>;
  return {
    id,
    clientName: v.clientName as string,
    clientPhone: v.clientPhone as string,
    bookingName: v.bookingName as string,
    packageId: (v.packageKey as string | null) ?? null,
    bookingDate: (v.bookingDate as BookingInput["bookingDate"]) ?? null,
    items: v.items as BookingInput["items"],
    crewIds: v.crewKeys as string[],
    terms: v.terms as string,
    eventStart: v.eventStart as string | null | undefined,
    location: v.location as string | undefined,
    notes: v.notes as string | undefined,
    paymentInstruction: v.paymentInstruction as BookingInput["paymentInstruction"],
    expectedUpdatedAt: v.expectedUpdatedAt === "$current" ? current : v.expectedUpdatedAt === "$stale" ? STALE : undefined,
  };
}

describe("PG3 booking vectors", () => {
  for (const c of bookingVectors.cases as BookingCase[]) {
    it(`repo · ${c.name}`, async () => {
      for (const p of bookingVectors.packages) addPackage(p.key, p.price, p.active);
      for (const k of bookingVectors.crew) getDb().crew.push({ id: k, name: k, role: "", isActive: true });
      let id: string | undefined;
      let current: string | undefined;
      if (c.existing) {
        const s = await saveBooking(toInput(c.existing.input));
        if (!s.ok) throw new Error(`existing rejected: ${JSON.stringify(s.errors)}`);
        id = s.booking.id;
        for (const p of c.existing.invoices ?? []) {
          const r = await createInvoice({ bookingId: id, ...asReq(p) });
          if (!r.ok) throw new Error(`existing invoice rejected: ${r.error}`);
        }
        if (c.existing.cancel) await cancelBooking(id, "");
        for (const [key, price] of Object.entries(c.existing.reprice ?? {})) getDb().packages.find((p) => p.id === key)!.price = price;
        if (c.existing.archive) Object.assign(getDb().packages.find((p) => p.id === c.existing!.archive)!, { isActive: false, archivedAt: "2026-01-02" });
      }
      if (id) current = getDb().bookings.find((b) => b.id === id)!.updatedAt;
      const r = await saveBooking(toInput(c.input, id, current));
      if (c.expect.errors) {
        expect(r.ok ? {} : r.errors).toEqual(c.expect.errors);
        return;
      }
      if (!r.ok) throw new Error(`rejected: ${JSON.stringify(r.errors)}`);
      const { crewCount, ...fields } = c.expect.booking!;
      expect(r.booking).toMatchObject(fields);
      if (crewCount !== undefined) expect(r.booking.crewIds.length).toBe(crewCount);
    });
  }
});
