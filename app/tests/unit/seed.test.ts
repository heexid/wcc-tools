import { beforeEach, describe, expect, it } from "vitest";
import { seedDb } from "@/lib/data/seed";
import { applyFixture, FIXTURES } from "@/lib/data/fixtures";
import { computeKpis, filterBookings } from "@/lib/data/repo";
import { invoicesOf, snapshotIntact } from "@/lib/data/ledger";
import { formatIDR } from "@/lib/format";
import type { Db } from "@/lib/data/types";

// The seed must reproduce every number Figma shows (F2 export: public/__figma__/specs/F02-frame-texts.json).
let db: Db;
beforeEach(() => (db = seedDb()));
const ref = (r: string) => db.bookings.find((b) => b.ref === r)!;
const nov = (d: Db) => filterBookings(d, { view: "calendar", from: "2026-11-01", to: "2026-11-30" });

describe("seed — PLAN §2.7 shape", () => {
  it("40 bookings over Oct–Dec covering every status", () => {
    expect(db.bookings).toHaveLength(40);
    expect(new Set(db.bookings.map((b) => b.status))).toEqual(new Set(["draft", "partially_paid", "paid", "canceled"]));
  });
  it("8 packages: 6 active + 2 archived (Package Lib 01 / 04)", () => {
    expect(db.packages.filter((p) => p.isActive).map((p) => p.name)).toEqual(["Basic Package", "Silver Package", "Gold Package", "Platinum Package", "Corporate Package", "Event Package"]);
    expect(db.packages.filter((p) => !p.isActive).map((p) => p.name)).toEqual(["Wedding Classic Package", "Studio Mini Package"]);
  });
  it("Package Library booking counts equal Figma", () => {
    const count = (id: string) => db.packages.find((p) => p.id === id)!.legacyBookings + db.bookings.filter((b) => b.packageId === id).length;
    expect([count("pkg_basic"), count("pkg_silver"), count("pkg_gold"), count("pkg_platinum"), count("pkg_corporate"), count("pkg_event")]).toEqual([18, 11, 23, 9, 6, 4]);
    expect([count("pkg_wedding_classic"), count("pkg_studio_mini")]).toEqual([31, 12]);
    for (const p of db.packages) expect(p.legacyBookings).toBeGreaterThanOrEqual(0);
  });
  it("6 crew with Figma roles (03b / 02b)", () =>
    expect(db.crew.map((c) => `${c.name} · ${c.role}`)).toEqual([
      "Raka Pratama · Lead photographer", "Dinda Ayu · Videographer", "Bima Saputra · Photographer",
      "Nadia Putri · Event organizer", "Fajar Nugroho · Assistant", "Sinta Dewi · Make-up artist",
    ]));
  it("every invoice snapshot is intact and every booking's ledger adds up", () => {
    for (const i of db.invoices) expect(snapshotIntact(i)).toBe(true);
    for (const b of db.bookings) expect(b.totalPaid).toBe(invoicesOf(db, b.id).reduce((s, i) => s + i.amount, 0));
    expect(new Set(db.invoices.map((i) => i.number)).size).toBe(db.invoices.length);
    expect(new Set(db.bookings.map((b) => b.ref)).size).toBe(db.bookings.length);
  });
});

describe("seed — Figma screen values", () => {
  it("02 table rows (ref, total, paid, remaining, status)", () => {
    const rows: [string, number, number, string][] = [
      ["BK-2026-0139", 3_500_000, 1_750_000, "partially_paid"], ["BK-2026-0144", 2_000_000, 0, "draft"],
      ["BK-2026-0142", 12_500_000, 5_000_000, "partially_paid"], ["BK-2026-0148", 2_250_000, 2_250_000, "paid"],
      ["BK-2026-0149", 9_000_000, 0, "draft"], ["BK-2026-0150", 6_000_000, 3_000_000, "partially_paid"],
      ["BK-2026-0151", 18_750_000, 5_625_000, "partially_paid"], ["BK-2026-0158", 13_250_000, 4_000_000, "partially_paid"],
      ["BK-2026-0147", 4_500_000, 1_350_000, "partially_paid"],
    ];
    for (const [r, total, paid, status] of rows) expect([r, ref(r).total, ref(r).totalPaid, ref(r).status]).toEqual([r, total, paid, status]);
  });
  it("06 Sari & Dimas: 2 invoices, newest first", () => {
    const inv = invoicesOf(db, ref("BK-2026-0142").id);
    expect(inv.map((i) => `${i.number} ${i.type} ${formatIDR(i.amount)} → ${formatIDR(i.snapshot.paidAfter)}`)).toEqual([
      "INV-2026-0201 partial Rp 2.000.000 → Rp 5.000.000",
      "INV-2026-0187 dp Rp 3.000.000 → Rp 3.000.000",
    ]);
  });
  it("24 Aulia: INV-2026-0179 DP Rp 1.750.000", () => expect(invoicesOf(db, ref("BK-2026-0139").id).map((i) => `${i.number} ${i.type} ${i.amount}`)).toEqual(["INV-2026-0179 dp 1750000"]));
  it("01 month view: 18 Nov bookings on the dates and with the statuses Figma shows", () => {
    const cells = nov(db).reduce<Record<string, string[]>>((m, b) => ((m[b.bookingDate.slice(8)] ??= []).push(`${b.bookingName}:${b.status}`), m), {});
    expect(nov(db)).toHaveLength(18);
    expect(cells["14"]).toEqual(["Maternity · Dewi:paid", "Prewedding · Nadia & Fajar:partially_paid", "Company Profile · BPR Jaya:draft", "Family Portrait · Wijaya:draft"].sort((a, b) => cells["14"].indexOf(a) - cells["14"].indexOf(b)));
    expect(Object.fromEntries(Object.entries(cells).map(([d, v]) => [d, v.length]))).toEqual({ "03": 1, "06": 1, "07": 2, "10": 2, "12": 1, "14": 4, "18": 1, "21": 2, "22": 1, "27": 1, "28": 2 });
    expect(cells["07"].sort()).toEqual(["Birthday · Kenzo:partially_paid", "Product Shoot · Kopi Nusa:paid"]);
    expect(cells["21"].sort()).toEqual(["Aqiqah · Baby Arka:draft", "Wedding · Laras & Bima:partially_paid"]);
  });
  it("Canceled booking hidden on the calendar, present in the table", () => {
    expect(nov(db).some((b) => b.status === "canceled")).toBe(false);
    expect(filterBookings(db, { view: "table" }).some((b) => b.status === "canceled")).toBe(true);
  });
  it("KPIs: outstanding Rp 48.750.000 · 14 bookings, collected Rp 61.200.000, +12,4% vs Oct", () => {
    const k = computeKpis(db, "2026-11");
    expect(k.outstanding).toBe(48_750_000);
    expect(k.outstandingCount).toBe(14);
    expect(k.collectedThisMonth).toBe(61_200_000);
    expect(k.collectedPrevMonth).toBe(54_450_000);
    expect(((k.collectedThisMonth / k.collectedPrevMonth - 1) * 100).toFixed(1)).toBe("12.4");
    expect(k.bookingsPrevMonth).toBe(20);
  });
  it("KNOWN FIGMA INCONSISTENCY (F6 decides): KPI says 24 Nov bookings, the calendar shows 18", () => {
    expect(computeKpis(db, "2026-11").bookingsThisMonth).toBe(18);
  });
  it("27 Raka Pratama: 5 bookings in Nov, upcoming from today in Figma order", () => {
    const mine = filterBookings(db, { view: "calendar", crewIds: ["crew_rp"], from: "2026-11-01", to: "2026-11-30" });
    expect(mine.map((b) => b.bookingName)).toEqual(["Graduation · Aulia", "Wedding · Sari & Dimas", "Prewedding · Nadia & Fajar", "Wedding · Laras & Bima", "Wedding · Citra & Reza"]);
  });
  it("01 Upcoming rail: today + next days in Figma order", () => {
    const up = filterBookings(db, { view: "calendar", from: "2026-11-10", to: "2026-11-16" });
    expect(up.slice(0, 4).map((b) => b.bookingName)).toEqual(["Graduation · Aulia", "Family Session · Hartono", "Wedding · Sari & Dimas", "Prewedding · Nadia & Fajar"]);
  });
  it("20 day view 14 Nov: 2 Draft · 1 Partially paid · 1 Paid", () => {
    const day = filterBookings(db, { view: "calendar", from: "2026-11-14", to: "2026-11-14" });
    const n = (s: string) => day.filter((b) => b.status === s).length;
    expect([day.length, n("draft"), n("partially_paid"), n("paid")]).toEqual([4, 2, 1, 1]);
  });
});

describe("fixtures", () => {
  it("every fixture applies cleanly", () => {
    for (const name of Object.keys(FIXTURES)) expect(() => applyFixture(seedDb(), name), name).not.toThrow();
  });
  it("21 Draft: Sari has no invoices", () => expect(applyFixture(seedDb(), "screen-21").bookings.find((b) => b.ref === "BK-2026-0142")!.status).toBe("draft"));
  it("31 busy Saturday: 7 bookings on 14 Nov", () => {
    const d = applyFixture(seedDb(), "screen-31");
    expect(filterBookings(d, { view: "calendar", from: "2026-11-14", to: "2026-11-14" })).toHaveLength(7);
  });
  it("35 Canceled: Sari read-only with reason", () => {
    const b = applyFixture(seedDb(), "screen-35").bookings.find((b) => b.ref === "BK-2026-0142")!;
    expect([b.status, b.cancelReason]).toEqual(["canceled", "Client postponed the wedding to next year."]);
  });
  it("09/10 edited Sari: total Rp 18.750.000, remaining Rp 13.750.000; 10 numbers the next invoice 0233", () => {
    const d = applyFixture(seedDb(), "screen-10");
    const b = d.bookings.find((b) => b.ref === "BK-2026-0142")!;
    expect([b.total, b.total - b.totalPaid]).toEqual([18_750_000, 13_750_000]);
    expect(d.counters.invoice[2026] + 1).toBe(233);
  });
  it("05 new booking + DP 40% → Partially paid, INV-2026-0187 Rp 5.000.000", () => {
    const d = applyFixture(seedDb(), "screen-05");
    const b = d.bookings.find((b) => b.ref === "BK-2026-0142")!;
    expect([b.status, b.totalPaid, invoicesOf(d, b.id)[0].number]).toEqual(["partially_paid", 5_000_000, "INV-2026-0187"]);
  });
});
