// Ledger helpers shared by the seed and the repo — the "triggers" of PLAN §2:
// booking.total from package + items, booking.totalPaid from non-void invoices, status from both.
import { bookingStatus, bookingTotal, itemSubtotal, type DpMethod, type InvoiceType } from "@/lib/booking/calc";
import { sha256, stableStringify } from "./sha256";
import type { Booking, Db, Invoice, InvoiceSnapshot } from "./types";

export function invoicesOf(db: Db, bookingId: string): Invoice[] {
  return db.invoices.filter((i) => i.bookingId === bookingId && !i.voidedAt).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** Recompute derived fields in place (total, totalPaid, status). */
export function recompute(db: Db, b: Booking): Booking {
  const inv = invoicesOf(db, b.id);
  b.total = bookingTotal(b.packagePriceSnapshot, b.items);
  b.totalPaid = inv.reduce((s, i) => s + i.amount, 0);
  b.status = bookingStatus({ invoiceCount: inv.length, total: b.total, totalPaid: b.totalPaid, canceled: !!b.canceledAt });
  return b;
}

export function nextNumber(db: Db, kind: "booking" | "invoice", year: number): string {
  // Never reuse a number that is already taken (a fixture may reserve a gap, e.g. Figma's BK-2026-0142).
  const taken = new Set(kind === "booking" ? db.bookings.map((b) => b.ref) : db.invoices.map((i) => i.number));
  const fmt = (n: number) => `${kind === "booking" ? "BK" : "INV"}-${year}-${String(n).padStart(4, "0")}`;
  let next = (db.counters[kind][year] ?? 0) + 1;
  while (taken.has(fmt(next))) next++;
  // After a reserved number, carry on above the highest one issued — never back-fill older gaps.
  const highest = Math.max(0, ...[...taken].filter((n) => n.split("-")[1] === String(year)).map((n) => Number(n.split("-")[2])));
  db.counters[kind][year] = Math.max(next, highest);
  return fmt(next);
}

/** Keep counters ≥ every number already present (seed / fixtures may use fixed numbers). */
export function syncCounters(db: Db) {
  for (const [kind, list] of [
    ["booking", db.bookings.map((b) => b.ref)],
    ["invoice", db.invoices.map((i) => i.number)],
  ] as const) {
    for (const n of list) {
      const [, y, seq] = n.split("-");
      const year = Number(y);
      db.counters[kind][year] = Math.max(db.counters[kind][year] ?? 0, Number(seq));
    }
  }
}

export function buildInvoice(
  db: Db,
  b: Booking,
  a: { id: string; number: string; type: InvoiceType; amount: number; issuedAt: string; dpMethod?: DpMethod | null; dpPercentage?: number | null; createdBy: string },
): Invoice {
  const paidBefore = invoicesOf(db, b.id).reduce((s, i) => s + i.amount, 0);
  const total = bookingTotal(b.packagePriceSnapshot, b.items);
  const snapshot: InvoiceSnapshot = {
    invoiceNumber: a.number,
    issuedAt: a.issuedAt,
    booking: {
      ref: b.ref,
      bookingName: b.bookingName,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      bookingDate: b.bookingDate,
      packageName: b.packageNameSnapshot,
      packagePrice: b.packagePriceSnapshot,
      items: b.items.map((i) => ({ name: i.name, price: i.price, qty: i.qty, subtotal: itemSubtotal(i.price, i.qty) })),
      terms: b.terms,
      paymentInstruction: { ...b.paymentInstruction },
    },
    total,
    type: a.type,
    dpMethod: a.dpMethod ?? null,
    dpPercentage: a.dpPercentage ?? null,
    amount: a.amount,
    paidBefore,
    paidAfter: paidBefore + a.amount,
    remainingAfter: total - paidBefore - a.amount,
    createdBy: a.createdBy,
  };
  return {
    id: a.id,
    bookingId: b.id,
    number: a.number,
    type: a.type,
    dpMethod: a.dpMethod ?? null,
    dpPercentage: a.dpPercentage ?? null,
    amount: a.amount,
    issuedAt: a.issuedAt,
    snapshot,
    snapshotHash: sha256(stableStringify(snapshot)),
    pdfPath: null,
    voidedAt: null,
    createdBy: a.createdBy,
  };
}

/** Verifies an invoice still matches its stored hash (snapshot immutability, PRD §2.4 rule 4). */
export const snapshotIntact = (i: Invoice) => sha256(stableStringify(i.snapshot)) === i.snapshotHash;
