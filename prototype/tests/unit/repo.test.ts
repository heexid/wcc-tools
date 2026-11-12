import { beforeEach, describe, expect, it } from "vitest";
import * as repo from "@/lib/data/repo";
import { getDb, loadFixture, resetDb } from "@/lib/data/store";
import { snapshotIntact } from "@/lib/data/ledger";
import type { BookingInput } from "@/lib/data/repo";

// Every PRD §2.4 business rule, through the same API the UI uses.
beforeEach(() => {
  resetDb();
  loadFixture("seed");
});

const newBooking = (over: Partial<BookingInput> = {}): BookingInput => ({
  clientName: "Sari Wulandari",
  clientPhone: "0812 3456 7890",
  packageId: "pkg_gold",
  bookingDate: "2026-11-12",
  items: [
    { name: "Extra hour", price: 500_000, qty: 2 },
    { name: "Printed album 20×30", price: 750_000, qty: 1 },
    { name: "Guest photobooth", price: 750_000, qty: 1 },
  ],
  crewIds: ["crew_rp", "crew_da", "crew_np"],
  terms: getDb().settings.defaultTerms,
  ...over,
});

async function created(over: Partial<BookingInput> = {}) {
  const r = await repo.saveBooking(newBooking(over));
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.booking;
}

describe("save_booking", () => {
  it("new booking → Draft, next BK number, phone normalised, default name, total recomputed (rules 2, 6)", async () => {
    const b = await created({ bookingName: "" });
    expect([b.status, b.ref, b.clientPhone, b.bookingName, b.total, b.invoiceCount]).toEqual(["draft", "BK-2026-0160", "+6281234567890", "Sari Wulandari · Gold Package", 12_500_000, 0]);
  });
  it("required fields + inline codes (US-1)", async () => {
    const r = await repo.saveBooking(newBooking({ clientName: "S", clientPhone: "12", packageId: null, bookingDate: null }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toMatchObject({ clientName: "length", clientPhone: "invalid", packageId: "required", bookingDate: "required" });
  });
  it("items: price ≥ 0 integer, qty 1–999 (rule 9)", async () => {
    const r = await repo.saveBooking(newBooking({ items: [{ name: "", price: -1, qty: 0 }, { name: "ok", price: 1.5, qty: 1000 }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.items).toEqual({ 0: { name: "required", price: "invalid", qty: "invalid" }, 1: { price: "invalid", qty: "invalid" } });
  });
  it("terms ≤ 255 (US-1)", async () => {
    const r = await repo.saveBooking(newBooking({ terms: "x".repeat(256) }));
    expect(r.ok).toBe(false);
    expect((await repo.saveBooking(newBooking({ terms: "x".repeat(255) }))).ok).toBe(true);
  });
  it("archived package can't be newly picked (rule 13) but an existing booking keeps it", async () => {
    const archived = await repo.saveBooking(newBooking({ packageId: "pkg_wedding_classic" }));
    expect(archived.ok).toBe(false);
    const old = getDb().bookings.find((b) => b.ref === "BK-2026-0114")!; // Rahma & Yusuf on Wedding Classic
    const keep = await repo.saveBooking({ id: old.id, clientName: old.clientName, clientPhone: old.clientPhone, packageId: old.packageId, bookingDate: old.bookingDate, items: old.items, crewIds: old.crewIds, terms: old.terms });
    expect(keep.ok).toBe(true);
  });
  it("package price change never alters existing bookings; re-pick takes the new price (US-0)", async () => {
    const sari = getDb().bookings.find((b) => b.ref === "BK-2026-0142")!;
    await repo.savePackage({ id: "pkg_gold", name: "Gold Package", price: 11_000_000, description: "x" });
    expect(getDb().bookings.find((b) => b.ref === "BK-2026-0142")!.total).toBe(12_500_000);
    const input = { id: sari.id, clientName: sari.clientName, clientPhone: sari.clientPhone, packageId: "pkg_platinum", bookingDate: sari.bookingDate, items: sari.items, crewIds: sari.crewIds, terms: sari.terms };
    await repo.saveBooking(input);
    const back = await repo.saveBooking({ ...input, packageId: "pkg_gold" });
    expect(back.ok && back.booking.total).toBe(13_500_000);
  });
  it("edit that drops the total below paid is rejected with the minimum (rule 10, Figma 08)", async () => {
    const sari = getDb().bookings.find((b) => b.ref === "BK-2026-0142")!;
    const r = await repo.saveBooking({ id: sari.id, clientName: sari.clientName, clientPhone: sari.clientPhone, packageId: "pkg_basic", bookingDate: sari.bookingDate, items: [], crewIds: [], terms: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect([r.errors.total, r.errors.minimumTotal]).toEqual(["below_paid", 5_000_000]);
  });
  it("editing a booking never changes its invoices (US-4)", async () => {
    const sari = getDb().bookings.find((b) => b.ref === "BK-2026-0142")!;
    const before = JSON.stringify(getDb().invoices.filter((i) => i.bookingId === sari.id));
    await repo.saveBooking({ id: sari.id, clientName: "Sari W.", clientPhone: sari.clientPhone, packageId: "pkg_platinum", bookingDate: "2026-11-13", items: sari.items, crewIds: sari.crewIds, terms: sari.terms });
    expect(JSON.stringify(getDb().invoices.filter((i) => i.bookingId === sari.id))).toBe(before);
  });
  it("network failure leaves nothing half-written", async () => {
    repo.failNext("saveBooking");
    await expect(repo.saveBooking(newBooking())).rejects.toThrow(repo.NetworkError);
    expect(getDb().bookings).toHaveLength(40);
  });
});

describe("create_invoice", () => {
  it("DP 40% → Partially paid, numbered INV-YYYY-NNNN, snapshot + hash (rules 4, 5, 7)", async () => {
    const b = await created();
    const r = await repo.createInvoice({ bookingId: b.id, type: "dp", dp: { method: "percentage", value: 40 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([r.invoice.amount, r.invoice.number, r.booking.status, r.booking.remaining]).toEqual([5_000_000, "INV-2026-0202", "partially_paid", 7_500_000]);
    expect(snapshotIntact(r.invoice)).toBe(true);
    expect(r.invoice.snapshot.booking.terms).toBe(b.terms);
  });
  it("numbers are unique and sequential (rule 5)", async () => {
    const b = await created();
    const a = await repo.createInvoice({ bookingId: b.id, type: "dp", dp: { method: "fixed", value: 1_000_000 } });
    const c = await repo.createInvoice({ bookingId: b.id, type: "partial", amount: 1_000_000 });
    expect([a.ok && a.invoice.number, c.ok && c.invoice.number]).toEqual(["INV-2026-0202", "INV-2026-0203"]);
  });
  it("Full → Paid; then no more invoices", async () => {
    const b = await created();
    const r = await repo.createInvoice({ bookingId: b.id, type: "full" });
    expect(r.ok && r.booking.status).toBe("paid");
    expect(await repo.createInvoice({ bookingId: b.id, type: "paid" })).toEqual({ ok: false, error: "booking_paid" });
  });
  it("server re-validates: DP over total, Partial == remaining, wrong type (rule 8)", async () => {
    const b = await created();
    expect(await repo.createInvoice({ bookingId: b.id, type: "dp", dp: { method: "fixed", value: 99_000_000 } })).toEqual({ ok: false, error: "dp_exceeds_total" });
    expect(await repo.createInvoice({ bookingId: b.id, type: "partial", amount: 1 })).toEqual({ ok: false, error: "type_not_allowed" });
    await repo.createInvoice({ bookingId: b.id, type: "dp", dp: { method: "fixed", value: 2_500_000 } });
    expect(await repo.createInvoice({ bookingId: b.id, type: "partial", amount: 10_000_000 })).toEqual({ ok: false, error: "partial_not_less_than_remaining" });
  });
  it("Partial then Paid settles to 0 (Figma 09 → 10)", async () => {
    loadFixture("screen-10"); // Sari saved as Platinum + 4 items (Rp 18.750.000) — 09's edits after Save
    const sari = getDb().bookings.find((b) => b.ref === "BK-2026-0142")!;
    const p = await repo.createInvoice({ bookingId: sari.id, type: "partial", amount: 5_000_000 });
    expect(p.ok && [p.booking.totalPaid, p.booking.remaining]).toEqual([10_000_000, 8_750_000]);
    const paid = await repo.createInvoice({ bookingId: sari.id, type: "paid" });
    expect(paid.ok && [paid.invoice.amount, paid.booking.status, paid.booking.remaining]).toEqual([8_750_000, "paid", 0]);
  });
  it("a failed confirm creates nothing (Figma 23)", async () => {
    const b = await created();
    repo.failNext("createInvoice");
    await expect(repo.createInvoice({ bookingId: b.id, type: "full" })).rejects.toThrow(repo.NetworkError);
    expect(getDb().invoices.filter((i) => i.bookingId === b.id)).toHaveLength(0);
  });
  it("invoices are append-only snapshots: later edits don't change them (rule 3 / 4, US-10)", async () => {
    const b = await created();
    const r = await repo.createInvoice({ bookingId: b.id, type: "dp", dp: { method: "percentage", value: 40 } });
    await repo.saveBooking({ ...newBooking(), id: b.id, clientName: "Renamed", items: [] });
    const inv = getDb().invoices.find((i) => r.ok && i.id === r.invoice.id)!;
    expect([inv.snapshot.booking.clientName, inv.snapshot.total, snapshotIntact(inv)]).toEqual(["Sari Wulandari", 12_500_000, true]);
  });
});

describe("save booking + create invoice (one transaction, F11 Confirm)", () => {
  it("saves a new booking and its first invoice together, with Figma's reserved numbers", async () => {
    loadFixture("screen-04");
    const r = await repo.saveBookingAndCreateInvoice(newBooking({ bookingName: "Wedding · Sari & Dimas" }), { type: "dp", dp: { method: "percentage", value: 40 } });
    if (!r.ok) throw new Error(r.error);
    expect(r.booking).toMatchObject({ ref: "BK-2026-0142", status: "partially_paid", totalPaid: 5_000_000, total: 12_500_000 });
    expect(r.invoice).toMatchObject({ number: "INV-2026-0187", type: "dp", amount: 5_000_000, dpPercentage: 40 });
    expect(r.invoices.map((i) => i.number)).toEqual(["INV-2026-0187"]);
    // The next booking skips numbers that are already taken (0143 … exist in the seed).
    const next = await repo.saveBooking(newBooking());
    expect(next.ok && next.booking.ref).toBe("BK-2026-0160");
  });

  it("a rejected invoice rolls the booking save back (nothing half-saved)", async () => {
    const before = getDb().bookings.length;
    const r = await repo.saveBookingAndCreateInvoice(newBooking(), { type: "dp", dp: { method: "fixed", value: 99_000_000 } });
    expect(r).toEqual({ ok: false, error: "dp_exceeds_total" });
    expect(getDb().bookings.length).toBe(before);
  });

  it("a network failure saves nothing (Bookings 23)", async () => {
    const before = getDb().bookings.length;
    repo.failNext("createInvoice");
    await expect(repo.saveBookingAndCreateInvoice(newBooking(), { type: "full" })).rejects.toThrow(repo.NetworkError);
    expect(getDb().bookings.length).toBe(before);
  });

  it("an invalid booking is reported, not saved", async () => {
    const r = await repo.saveBookingAndCreateInvoice(newBooking({ clientPhone: "" }), { type: "full" });
    expect(r).toMatchObject({ ok: false, error: "booking_invalid", errors: { clientPhone: "required" } });
  });
});

describe("cancel_booking (rule 12, US-12)", () => {
  it("Draft and Partially paid can be canceled; then read-only", async () => {
    const sari = getDb().bookings.find((b) => b.ref === "BK-2026-0142")!;
    const r = await repo.cancelBooking(sari.id, "Client postponed the wedding to next year.");
    expect(r.ok && r.booking.status).toBe("canceled");
    expect(await repo.createInvoice({ bookingId: sari.id, type: "paid" })).toEqual({ ok: false, error: "booking_canceled" });
    const save = await repo.saveBooking({ id: sari.id, clientName: sari.clientName, clientPhone: sari.clientPhone, packageId: sari.packageId, bookingDate: sari.bookingDate, items: sari.items, crewIds: sari.crewIds, terms: sari.terms });
    expect(save.ok).toBe(false);
  });
  it("Paid can't be canceled; reason ≤ 255", async () => {
    const dewi = getDb().bookings.find((b) => b.ref === "BK-2026-0148")!;
    expect(await repo.cancelBooking(dewi.id, "")).toEqual({ ok: false, error: "not_allowed" });
    const hartono = getDb().bookings.find((b) => b.ref === "BK-2026-0144")!;
    expect(await repo.cancelBooking(hartono.id, "x".repeat(256))).toEqual({ ok: false, error: "reason_too_long" });
  });
  it("Canceled: excluded from outstanding + bookings this month, invoices still counted in collected", async () => {
    const before = repo.computeKpis(getDb(), "2026-11");
    const sari = getDb().bookings.find((b) => b.ref === "BK-2026-0142")!;
    await repo.cancelBooking(sari.id, "");
    const after = repo.computeKpis(getDb(), "2026-11");
    expect([after.outstanding, after.outstandingCount, after.bookingsThisMonth, after.collectedThisMonth]).toEqual([before.outstanding - 7_500_000, before.outstandingCount - 1, before.bookingsThisMonth - 1, before.collectedThisMonth]);
  });
});

describe("search, filters, sort, pagination (US-7, US-8)", () => {
  it("search by name, client, ref, and partial phone digits (local or +62)", async () => {
    const names = async (search: string) => (await repo.listBookings({ search, pageSize: 50 })).rows.map((r) => r.ref);
    expect(await names("sari wulandari")).toEqual(["BK-2026-0142"]);
    expect(await names("sari")).toHaveLength(4); // Sari Wulandari, Ratna Sari, Wulan Sari, Sari & Dimas
    const wed = (await repo.listBookings({ search: "wedding", pageSize: 50 })).rows;
    expect(wed.length).toBe(11); // includes "Prewedding · …"
    expect(wed.every((r) => r.bookingName.toLowerCase().includes("wedding"))).toBe(true);
    expect(await names("0812-3456")).toEqual(["BK-2026-0142"]);
    expect(await names("812 3456 7890")).toEqual(["BK-2026-0142"]);
    expect(await names("BK-2026-0139")).toEqual(["BK-2026-0139"]);
  });
  it("filters AND together, values within a filter OR (Figma 02 → the same 4 bookings)", async () => {
    const r = await repo.listBookings({ search: "wedding", status: ["partially_paid"], crewIds: ["crew_rp", "crew_da"], from: "2026-11-01", to: "2026-11-30" });
    expect(r.rows.map((x) => x.bookingName).sort()).toEqual(["Prewedding · Nadia & Fajar", "Wedding · Citra & Reza", "Wedding · Laras & Bima", "Wedding · Sari & Dimas"]);
  });
  it("default sort booking date asc, stable by creation; desc by total", async () => {
    const asc = (await repo.listBookings({ from: "2026-11-10", pageSize: 50 })).rows.map((r) => r.ref);
    expect(asc.slice(0, 3)).toEqual(["BK-2026-0139", "BK-2026-0144", "BK-2026-0142"]);
    const byTotal = (await repo.listBookings({ sort: { key: "total", dir: "desc" } })).rows[0];
    expect(byTotal.ref).toBe("BK-2026-0151");
  });
  it("pagination 10 / 25 / 50", async () => {
    const p = await repo.listBookings({ pageSize: 10, page: 4 });
    expect([p.total, p.pages, p.page, p.rows.length]).toEqual([40, 4, 4, 10]);
    expect((await repo.listBookings({ pageSize: 25, page: 99 })).page).toBe(2);
  });
  it("upcoming rail: next 7 days, Canceled hidden", async () => {
    const up = await repo.getUpcoming();
    expect(up.every((b) => b.bookingDate >= "2026-11-10" && b.bookingDate <= "2026-11-16" && b.status !== "canceled")).toBe(true);
  });
  it("crew schedule (Figma 27): Raka — 5 in Nov, upcoming from today", async () => {
    const s = await repo.getCrewSchedule("crew_rp");
    expect([s!.monthCount, s!.upcoming.map((b) => b.bookingDate.slice(8)).join(",")]).toEqual([5, "10,12,14,21,27"]);
  });
});

describe("packages (US-0)", () => {
  it("duplicate active name, missing price, description > 1000 (Package 05)", async () => {
    const r = await repo.savePackage({ name: "gold package", price: null, description: "x".repeat(1001) });
    expect(r).toEqual({ ok: false, errors: { name: "duplicate", price: "invalid", description: "too_long" } });
  });
  it("archive hides from active list; restore brings it back unless the name is taken", async () => {
    await repo.archivePackage("pkg_gold");
    expect((await repo.listPackages({ tab: "active" })).some((p) => p.id === "pkg_gold")).toBe(false);
    await repo.savePackage({ name: "Gold Package", price: 1, description: "" });
    expect(await repo.restorePackage("pkg_gold")).toEqual({ ok: false, error: "duplicate" });
  });
  it("save failure is reported (Package 06)", async () => {
    repo.failNext("savePackage");
    await expect(repo.savePackage({ name: "New", price: 1, description: "" })).rejects.toThrow(repo.NetworkError);
  });
});

describe("account (US-13, §4.3)", () => {
  it("login with Figma credentials only", async () => {
    expect(await repo.login("bs-moment@email.com", "wrong")).toEqual({ ok: false, error: "invalid_credentials" });
    expect(await repo.login("", "")).toEqual({ ok: false, error: "required" });
    expect(await repo.login("BS-MOMENT@email.com ", "bsmoment26")).toEqual({ ok: true });
  });
  it("display name 2–50, trimmed; new bookings are created by the new name; old ones keep theirs", async () => {
    expect(await repo.updateDisplayName(" a ")).toEqual({ ok: false, error: "length" });
    await repo.updateDisplayName("  Luna  ");
    const b = await created();
    expect([b.createdBy, getDb().bookings.find((x) => x.ref === "BK-2026-0142")!.createdBy]).toEqual(["Luna", "Admin"]);
  });
  it("change password: current must match, rules, confirmation", async () => {
    const r = await repo.changePassword({ current: "nope", next: "short", confirm: "other" });
    expect(r).toEqual({ ok: false, errors: { current: "incorrect", next: "rules", confirm: "mismatch" } });
    expect(await repo.changePassword({ current: "bsmoment26", next: "newpass99", confirm: "newpass99" })).toEqual({ ok: true });
    expect(getDb().profile.passwordChangedAt).toBe("2026-11-10");
  });
});
