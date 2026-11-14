// Pure money and status logic (PRD §2.2–§2.5, PLAN §3). Shared by the UI (live totals,
// < 50 ms per keystroke) and the mock data layer (authoritative re-validation).
// All money is integer Rupiah — no floats leave this file.

export type BookingStatus = "draft" | "partially_paid" | "paid" | "canceled";
export type InvoiceType = "dp" | "full" | "partial" | "paid";
export type DpMethod = "percentage" | "fixed";

export type Item = { name: string; price: number; qty: number };

export const LIMITS = {
  qtyMin: 1,
  qtyMax: 999,
  termsMax: 255,
  cancelReasonMax: 255,
  packageDescriptionMax: 1000,
  clientNameMin: 2,
  clientNameMax: 80,
  displayNameMin: 2,
  displayNameMax: 50,
  businessNameMin: 2,
  businessNameMax: 60,
  businessAddressMax: 150,
  pctMax: 100,
};

const isMoney = (n: number) => Number.isSafeInteger(n) && n >= 0;

export function itemSubtotal(price: number, qty: number): number {
  if (!isMoney(price)) throw new RangeError(`price must be an integer ≥ 0, got ${price}`);
  if (!Number.isInteger(qty) || qty < LIMITS.qtyMin || qty > LIMITS.qtyMax) throw new RangeError(`qty must be 1–999, got ${qty}`);
  return price * qty;
}

export function itemsTotal(items: Item[]): number {
  return items.reduce((s, i) => s + itemSubtotal(i.price, i.qty), 0);
}

/** package_price + Σ(item.price × item.qty) */
export function bookingTotal(packagePrice: number, items: Item[]): number {
  if (!isMoney(packagePrice)) throw new RangeError(`package price must be an integer ≥ 0, got ${packagePrice}`);
  return packagePrice + itemsTotal(items);
}

export const remaining = (total: number, totalPaid: number) => total - totalPaid;

/** PRD §2.5 */
export function bookingStatus(a: { invoiceCount: number; total: number; totalPaid: number; canceled?: boolean }): BookingStatus {
  if (a.canceled) return "canceled";
  if (a.invoiceCount === 0) return "draft";
  if (a.totalPaid < a.total) return "partially_paid";
  return "paid";
}

/** Percentage with ≤ 2 decimals → amount, rounded half-up to the Rupiah (integer maths, no float drift). */
export function dpAmount(total: number, dp: { method: DpMethod; value: number }): number {
  if (dp.method === "fixed") return dp.value;
  const bp = Math.round(dp.value * 100); // basis points; value has ≤ 2 decimals
  return Math.floor((total * bp + 5000) / 10000);
}

/** "40% paid" — floored so it never overstates. */
export const paidPercent = (total: number, totalPaid: number) => (total > 0 ? Math.floor((totalPaid * 100) / total) : 0);

/** Which invoice types the next invoice may use (PRD US-2 / US-5). */
export function allowedInvoiceTypes(invoiceCount: number): InvoiceType[] {
  return invoiceCount === 0 ? ["dp", "full"] : ["partial", "paid"];
}

export type InvoiceError =
  | "booking_canceled"
  | "booking_paid"
  | "type_not_allowed"
  | "pct_invalid"
  | "dp_zero"
  | "dp_exceeds_total"
  | "amount_not_positive"
  | "partial_not_less_than_remaining"
  | "amount_mismatch";

export type InvoiceRequest = {
  type: InvoiceType;
  dp?: { method: DpMethod; value: number }; // DP only
  amount?: number; // Partial only (other types derive it)
};

/**
 * Validates an invoice against the booking and returns the authoritative amount.
 * DP: 1 ≤ amount ≤ total (0 → dp_zero). Full: amount = total. Partial: 1 ≤ amount < remaining.
 * Paid: amount = remaining. (PRD §2.4 rule 8)
 */
export function validateInvoice(
  booking: { total: number; totalPaid: number; invoiceCount: number; canceled?: boolean },
  req: InvoiceRequest,
): { ok: true; amount: number } | { ok: false; error: InvoiceError } {
  const { total, totalPaid, invoiceCount } = booking;
  const rem = remaining(total, totalPaid);
  if (booking.canceled) return { ok: false, error: "booking_canceled" };
  if (invoiceCount > 0 && rem <= 0) return { ok: false, error: "booking_paid" };
  if (!allowedInvoiceTypes(invoiceCount).includes(req.type)) return { ok: false, error: "type_not_allowed" };
  switch (req.type) {
    case "dp": {
      if (!req.dp) return { ok: false, error: "dp_zero" };
      if (req.dp.method === "percentage") {
        const v = req.dp.value;
        if (!Number.isFinite(v) || v < 0 || v > LIMITS.pctMax || Math.round(v * 100) !== v * 100) return { ok: false, error: "pct_invalid" };
      } else if (!Number.isSafeInteger(req.dp.value) || req.dp.value < 0) return { ok: false, error: "amount_not_positive" };
      const amount = dpAmount(total, req.dp);
      if (amount <= 0) return { ok: false, error: "dp_zero" };
      if (amount > total) return { ok: false, error: "dp_exceeds_total" };
      return { ok: true, amount };
    }
    case "full":
      return total > 0 ? { ok: true, amount: total } : { ok: false, error: "amount_not_positive" };
    case "partial": {
      const a = req.amount ?? 0;
      if (!Number.isSafeInteger(a) || a < 1) return { ok: false, error: "amount_not_positive" };
      if (a >= rem) return { ok: false, error: "partial_not_less_than_remaining" };
      return { ok: true, amount: a };
    }
    case "paid":
      if (req.amount !== undefined && req.amount !== rem) return { ok: false, error: "amount_mismatch" };
      return { ok: true, amount: rem };
  }
}

/** UI copy for invoice errors (Figma 05b / 09; PRD US-2 / US-5). */
export function invoiceErrorMessage(error: InvoiceError, ctx: { total: number; remaining: number }, fmt: (n: number) => string): string {
  switch (error) {
    case "dp_zero":
      return "Enter a DP above Rp 0";
    case "dp_exceeds_total":
      return `DP can’t exceed the booking total (${fmt(ctx.total)})`;
    case "partial_not_less_than_remaining":
      return `Must be less than remaining ${fmt(ctx.remaining)} — use Paid to settle in full`;
    case "pct_invalid":
      return "Enter 0–100%, up to 2 decimals";
    case "amount_not_positive":
      return "Enter an amount above Rp 0";
    case "booking_paid":
      return "This booking is already paid in full";
    case "booking_canceled":
      return "This booking is canceled";
    case "type_not_allowed":
      return "This invoice type isn’t available for this booking";
    case "amount_mismatch":
      return `Paid must equal the remaining ${fmt(ctx.remaining)}`;
  }
}

/** PRD US-5 / §2.4 rule 10: an edit may not drop the total below what's already paid. */
export function validateTotalAgainstPaid(total: number, totalPaid: number): { ok: true } | { ok: false; minimum: number } {
  return total >= totalPaid ? { ok: true } : { ok: false, minimum: totalPaid };
}

/** Diff strip (PRD US-4): "Previous total Rp X → New total Rp Y (+/− Rp Z)". */
export const totalDiff = (previous: number, next: number) => next - previous;
