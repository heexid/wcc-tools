import { describe, expect, it } from "vitest";
import {
  allowedInvoiceTypes,
  bookingStatus,
  bookingTotal,
  dpAmount,
  invoiceErrorMessage,
  itemSubtotal,
  paidPercent,
  remaining,
  totalDiff,
  validateInvoice,
  validateTotalAgainstPaid,
} from "@/lib/booking/calc";
import { formatIDR } from "@/lib/format";

// PLAN §3 test matrix + PRD §2.4 rules 7–10. Figma numbers where they exist.
const sari = { total: 12_500_000, totalPaid: 0, invoiceCount: 0 };

describe("totals", () => {
  it("item subtotal = price × qty", () => expect(itemSubtotal(500_000, 2)).toBe(1_000_000));
  it("booking total = package + Σ items (Figma 03: Gold + 3 items = Rp 12.500.000)", () =>
    expect(bookingTotal(10_000_000, [{ name: "Extra hour", price: 500_000, qty: 2 }, { name: "Printed album 20×30", price: 750_000, qty: 1 }, { name: "Guest photobooth", price: 750_000, qty: 1 }])).toBe(12_500_000));
  it("empty items → package price", () => expect(bookingTotal(2_000_000, [])).toBe(2_000_000));
  it("max qty 999 accepted", () => expect(itemSubtotal(10_000, 999)).toBe(9_990_000));
  it("qty 0 rejected", () => expect(() => itemSubtotal(10_000, 0)).toThrow());
  it("qty 1000 rejected", () => expect(() => itemSubtotal(10_000, 1000)).toThrow());
  it("fractional qty rejected", () => expect(() => itemSubtotal(10_000, 1.5)).toThrow());
  it("negative price rejected", () => expect(() => itemSubtotal(-1, 1)).toThrow());
  it("fractional price rejected (integer Rupiah)", () => expect(() => itemSubtotal(1000.5, 1)).toThrow());
  it("remaining = total − paid", () => expect(remaining(12_500_000, 5_000_000)).toBe(7_500_000));
  it("paid percent floors (Figma 06: 40%)", () => {
    expect(paidPercent(12_500_000, 5_000_000)).toBe(40);
    expect(paidPercent(3, 2)).toBe(66);
    expect(paidPercent(0, 0)).toBe(0);
  });
  it("diff strip delta", () => expect(totalDiff(12_500_000, 18_750_000)).toBe(6_250_000));
});

describe("status (PRD §2.5)", () => {
  it("new booking → draft", () => expect(bookingStatus({ invoiceCount: 0, total: 12_500_000, totalPaid: 0 })).toBe("draft"));
  it("first DP → partially_paid", () => expect(bookingStatus({ invoiceCount: 1, total: 12_500_000, totalPaid: 5_000_000 })).toBe("partially_paid"));
  it("first Full → paid", () => expect(bookingStatus({ invoiceCount: 1, total: 12_500_000, totalPaid: 12_500_000 })).toBe("paid"));
  it("Partial + Paid → paid", () => expect(bookingStatus({ invoiceCount: 3, total: 18_750_000, totalPaid: 18_750_000 })).toBe("paid"));
  it("canceled wins over everything", () => expect(bookingStatus({ invoiceCount: 2, total: 1, totalPaid: 0, canceled: true })).toBe("canceled"));
  it("edit increase after Paid → back to partially_paid", () => expect(bookingStatus({ invoiceCount: 1, total: 13_000_000, totalPaid: 12_500_000 })).toBe("partially_paid"));
});

describe("DP amount — percentage rounds half-up to the Rupiah", () => {
  it("40% of 12.500.000 = 5.000.000 (Figma 04)", () => expect(dpAmount(12_500_000, { method: "percentage", value: 40 })).toBe(5_000_000));
  it("0% → 0", () => expect(dpAmount(12_500_000, { method: "percentage", value: 0 })).toBe(0));
  it("100% → total", () => expect(dpAmount(12_500_000, { method: "percentage", value: 100 })).toBe(12_500_000));
  it("33.33% of 1.000.001 = 333.300 (333.300,33 → down)", () => expect(dpAmount(1_000_001, { method: "percentage", value: 33.33 })).toBe(333_300));
  it("12.5% of 3 = 0,375 → 0; of 4 = 0,5 → 1 (half-up)", () => {
    expect(dpAmount(3, { method: "percentage", value: 12.5 })).toBe(0);
    expect(dpAmount(4, { method: "percentage", value: 12.5 })).toBe(1);
  });
  it("33.33% has no float drift", () => expect(dpAmount(12_500_000, { method: "percentage", value: 33.33 })).toBe(4_166_250));
  it("fixed passes through", () => expect(dpAmount(12_500_000, { method: "fixed", value: 3_000_000 })).toBe(3_000_000));
});

describe("validateInvoice", () => {
  it("first invoice offers DP / Full; later Partial / Paid", () => {
    expect(allowedInvoiceTypes(0)).toEqual(["dp", "full"]);
    expect(allowedInvoiceTypes(2)).toEqual(["partial", "paid"]);
  });
  it("DP 40% ok", () => expect(validateInvoice(sari, { type: "dp", dp: { method: "percentage", value: 40 } })).toEqual({ ok: true, amount: 5_000_000 }));
  it("DP 0% blocked → dp_zero", () => expect(validateInvoice(sari, { type: "dp", dp: { method: "percentage", value: 0 } })).toEqual({ ok: false, error: "dp_zero" }));
  it("DP fixed > total → dp_exceeds_total", () => expect(validateInvoice(sari, { type: "dp", dp: { method: "fixed", value: 12_500_001 } })).toEqual({ ok: false, error: "dp_exceeds_total" }));
  it("DP fixed = total ok", () => expect(validateInvoice(sari, { type: "dp", dp: { method: "fixed", value: 12_500_000 } }).ok).toBe(true));
  it("DP percentage > 100 → pct_invalid", () => expect(validateInvoice(sari, { type: "dp", dp: { method: "percentage", value: 100.01 } })).toEqual({ ok: false, error: "pct_invalid" }));
  it("DP percentage with 3 decimals → pct_invalid", () => expect(validateInvoice(sari, { type: "dp", dp: { method: "percentage", value: 33.333 } })).toEqual({ ok: false, error: "pct_invalid" }));
  it("Full = total", () => expect(validateInvoice(sari, { type: "full" })).toEqual({ ok: true, amount: 12_500_000 }));
  it("Partial on first invoice not allowed", () => expect(validateInvoice(sari, { type: "partial", amount: 1 })).toEqual({ ok: false, error: "type_not_allowed" }));
  const edited = { total: 18_750_000, totalPaid: 5_000_000, invoiceCount: 2 };
  it("Partial 5.000.000 of remaining 13.750.000 ok (Figma 09)", () => expect(validateInvoice(edited, { type: "partial", amount: 5_000_000 })).toEqual({ ok: true, amount: 5_000_000 }));
  it("Partial == remaining → use Paid", () => expect(validateInvoice(edited, { type: "partial", amount: 13_750_000 })).toEqual({ ok: false, error: "partial_not_less_than_remaining" }));
  it("Partial 0 rejected", () => expect(validateInvoice(edited, { type: "partial", amount: 0 })).toEqual({ ok: false, error: "amount_not_positive" }));
  it("Paid = remaining (Figma 10: Rp 13.750.000)", () => expect(validateInvoice(edited, { type: "paid" })).toEqual({ ok: true, amount: 13_750_000 }));
  it("Paid with a different amount rejected", () => expect(validateInvoice(edited, { type: "paid", amount: 1 })).toEqual({ ok: false, error: "amount_mismatch" }));
  it("Paid after an edit increase settles the new remaining", () => expect(validateInvoice({ total: 13_000_000, totalPaid: 12_500_000, invoiceCount: 1 }, { type: "paid" })).toEqual({ ok: true, amount: 500_000 }));
  it("no invoice on a Paid booking", () => expect(validateInvoice({ total: 1_000, totalPaid: 1_000, invoiceCount: 1 }, { type: "paid" })).toEqual({ ok: false, error: "booking_paid" }));
  it("no invoice on a Canceled booking", () => expect(validateInvoice({ ...sari, canceled: true }, { type: "full" })).toEqual({ ok: false, error: "booking_canceled" }));
});

describe("edit guard + copy", () => {
  it("total below paid rejected with the minimum (Figma 08)", () => expect(validateTotalAgainstPaid(4_000_000, 5_000_000)).toEqual({ ok: false, minimum: 5_000_000 }));
  it("total equal to paid ok", () => expect(validateTotalAgainstPaid(5_000_000, 5_000_000)).toEqual({ ok: true }));
  it("error copy matches PRD / Figma", () => {
    const ctx = { total: 12_500_000, remaining: 13_750_000 };
    expect(invoiceErrorMessage("dp_exceeds_total", ctx, formatIDR)).toBe("DP can’t exceed the booking total (Rp 12.500.000)");
    expect(invoiceErrorMessage("dp_zero", ctx, formatIDR)).toBe("Enter a DP above Rp 0");
    expect(invoiceErrorMessage("partial_not_less_than_remaining", ctx, formatIDR)).toBe("Must be less than remaining Rp 13.750.000 — use Paid to settle in full");
  });
});
