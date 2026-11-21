import { beforeEach, describe, expect, it } from "vitest";
import * as repo from "@/lib/data/repo";
import { getDb, loadFixture, resetDb } from "@/lib/data/store";
import { snapshotIntact } from "@/lib/data/ledger";
import { bookingSchema, bookingToValues, emptyBooking, toBookingInput } from "@/lib/booking/form";

// Event details (2026-11-21, Figma Bookings 03 "Client & schedule" + invoice 11 "Event" column).
beforeEach(() => {
  resetDb();
  loadFixture("seed");
});

const input = (over: Partial<repo.BookingInput> = {}): repo.BookingInput => ({
  clientName: "Sari Wulandari",
  clientPhone: "0812 3456 7890",
  packageId: "pkg_gold",
  bookingDate: "2026-11-12",
  items: [],
  crewIds: [],
  terms: "",
  ...over,
});

describe("event details", () => {
  it("are stored on the booking and copied into the invoice snapshot", async () => {
    const s = await repo.saveBooking(input({ eventStart: "08:00", location: " Hotel Mulia Senayan ", notes: "Akad 08:00" }));
    if (!s.ok) throw new Error(JSON.stringify(s.errors));
    expect(s.booking).toMatchObject({ eventStart: "08:00", location: "Hotel Mulia Senayan", notes: "Akad 08:00" });
    const inv = await repo.createInvoice({ bookingId: s.booking.id, type: "full" });
    if (!inv.ok) throw new Error(inv.error);
    expect(inv.invoice.snapshot.booking).toMatchObject({ eventStart: "08:00", location: "Hotel Mulia Senayan", notes: "Akad 08:00" });
    expect(snapshotIntact(inv.invoice)).toBe(true);
  });

  it("editing the booking afterwards never changes an issued snapshot (rule 4)", async () => {
    const s = await repo.saveBooking(input({ location: "Old venue" }));
    if (!s.ok) throw new Error("save");
    const inv = await repo.createInvoice({ bookingId: s.booking.id, type: "full" });
    if (!inv.ok) throw new Error("invoice");
    await repo.saveBooking(input({ id: s.booking.id, location: "New venue" }));
    const after = getDb().invoices.find((i) => i.id === inv.invoice.id)!;
    expect(after.snapshot.booking.location).toBe("Old venue");
  });

  it("are optional and validated", async () => {
    const s = await repo.saveBooking(input());
    expect(s.ok && s.booking).toMatchObject({ eventStart: null, location: "", notes: "" });
    const bad = await repo.saveBooking(input({ eventStart: "7:00", location: "x".repeat(256), notes: "y".repeat(256) }));
    expect(!bad.ok && bad.errors).toEqual({ eventStart: "invalid", location: "too_long", notes: "too_long" });
  });

  it("seeded BK-2026-0142 matches Figma (08:00, Hotel Mulia, notes)", () => {
    const b = getDb().bookings.find((x) => x.ref === "BK-2026-0142")!;
    expect(b).toMatchObject({ eventStart: "08:00", location: "Hotel Mulia Senayan, Jl. Asia Afrika No. 8, Jakarta" });
  });

  it("form model: empty → null start, edit round-trip, schema limits", () => {
    const empty = emptyBooking("", null, getDb().settings.defaultPayment);
    expect(toBookingInput(empty)).toMatchObject({ eventStart: null, location: "", notes: "" });
    const v = bookingToValues({ ...getDb().bookings.find((x) => x.ref === "BK-2026-0142")! }, (p) => p);
    expect(v.eventStart).toBe("08:00");
    expect(bookingSchema.shape.eventStart.safeParse("25:00").success).toBe(false);
    expect(bookingSchema.shape.eventStart.safeParse("").success).toBe(true);
    expect(bookingSchema.shape.notes.safeParse("y".repeat(256)).success).toBe(false);
  });
});
