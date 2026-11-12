// Named fixtures — one per Figma screen (PROTOTYPE-PLAN §0.1). `?fixture=screen-06` on any page
// loads it. Most screens share the canonical seed; the ones listed with a `patch` change the data the
// way that Figma frame shows it. UI-only state (open dropdowns, form input, hover) is set by the slice
// that builds the screen, not here.
import { at } from "./seed";
import { buildInvoice, recompute, syncCounters } from "./ledger";
import type { Booking, Db } from "./types";

type Fixture = {
  frame: string;
  slice: string;
  patch?: (db: Db) => void;
  /** Last numbers used (applied after syncCounters) — the next record gets Figma's number (e.g. 141 → BK-2026-0142). */
  numbers?: { booking?: number; invoice?: number };
  note?: string;
};

const byRef = (db: Db, ref: string): Booking => {
  const b = db.bookings.find((x) => x.ref === ref);
  if (!b) throw new Error(`fixture: ${ref} not in seed`);
  return b;
};
const dropInvoices = (db: Db, b: Booking) => {
  db.invoices = db.invoices.filter((i) => i.bookingId !== b.id);
  recompute(db, b);
};
const SARI = "BK-2026-0142";
const dropArchived = (db: Db) => (db.packages = db.packages.filter((p) => p.isActive));

/** Screen 21 / 03–05c: Sari & Dimas as a booking created today with no invoices yet. */
function sariAsNewDraft(db: Db) {
  const b = byRef(db, SARI);
  dropInvoices(db, b);
  b.createdAt = b.updatedAt = at("2026-11-10 09:42");
}

/** Screens 09–10: Sari & Dimas as edited in screen 07 — Platinum + 4 items (Rp 18.750.000), moved to 21 Nov. */
function sariEditedToPlatinum(db: Db) {
  const b = byRef(db, SARI);
  const p = db.packages.find((x) => x.id === "pkg_platinum")!;
  Object.assign(b, { packageId: p.id, packageNameSnapshot: p.name, packagePriceSnapshot: p.price, bookingDate: "2026-11-21" });
  b.items = [
    { id: "0142_i1", name: "Extra hour", price: 500_000, qty: 2 },
    { id: "0142_i2", name: "Printed album 20×30", price: 750_000, qty: 1 },
    { id: "0142_i3", name: "Drone footage", price: 1_500_000, qty: 1 },
    { id: "0142_i4", name: "Same-day edit video", price: 1_500_000, qty: 1 },
  ];
  recompute(db, b);
}

export const FIXTURES: Record<string, Fixture> = {
  seed: { frame: "—", slice: "F2", note: "Canonical data (screens 01 / 02)." },
  // Bookings · Screens
  "screen-01": { frame: "01 · Bookings — Calendar (month)", slice: "F6/F7" },
  "screen-02": { frame: "02 · Bookings — Table + filters", slice: "F9" },
  "screen-02b": { frame: "02b · Bookings — Crew filter (multi-select open)", slice: "F9" },
  "screen-03": { frame: "03 · New booking — details & live summary", slice: "F10", patch: (db) => removeBooking(db, SARI), note: "Sari & Dimas not saved yet — the form holds it." },
  "screen-03b": { frame: "03b · New booking — assign crew", slice: "F10", patch: (db) => removeBooking(db, SARI) },
  "screen-04": { frame: "04 · New booking — Create invoice #1 (DP, modal)", slice: "F11", patch: (db) => removeBooking(db, SARI), numbers: { booking: 141, invoice: 186 } },
  "screen-04c": { frame: "04c · New booking — Create invoice #1 (Full price, modal)", slice: "F11", patch: (db) => removeBooking(db, SARI), numbers: { booking: 141, invoice: 186 } },
  "screen-05": {
    frame: "05 · New booking — invoice created (Partially paid)",
    slice: "F11",
    patch: (db) => {
      sariAsNewDraft(db);
      addInvoice(db, SARI, { number: "INV-2026-0187", type: "dp", amount: 5_000_000, at: "2026-11-10 09:48", dp: ["percentage", 40] });
    },
    note: "DP 40% = Rp 5.000.000 (Figma 04/05).",
  },
  "screen-05c": {
    frame: "05c · New booking — invoice created (Paid, full price)",
    slice: "F11",
    patch: (db) => {
      sariAsNewDraft(db);
      addInvoice(db, SARI, { number: "INV-2026-0187", type: "full", amount: 12_500_000, at: "2026-11-10 09:48" });
    },
  },
  "screen-06": { frame: "06 · Booking detail — Partially paid (view)", slice: "F12" },
  "screen-07": { frame: "07 · Edit booking — recalculated total", slice: "F13", note: "Edit form state (Platinum + 4 items, unsaved) is UI state — data stays as seed." },
  "screen-08": { frame: "08 · Edit booking — total below paid", slice: "F13" },
  "screen-09": { frame: "09 · Edit booking — Create invoice #3 (Partial, modal)", slice: "F13", note: "Same unsaved edits as 07 (diff strip shows) — data stays as seed; the modal uses the updated total." },
  "screen-10": {
    frame: "10 · Invoice modal — Paid (Lunas) · invoices after settling",
    slice: "F13",
    patch: (db) => {
      sariEditedToPlatinum(db);
      db.counters.invoice[2026] = 232; // next = INV-2026-0233 (Figma)
    },
  },
  "screen-11": { frame: "11 · Invoice PDF (A4 snapshot)", slice: "F15" },
  "screen-11b": { frame: "11b · Invoice PDF — DP", slice: "F15", patch: (db) => fixtureOf("screen-05").patch!(db) },
  "screen-11c": { frame: "11c · Invoice PDF — Full price", slice: "F15", patch: (db) => fixtureOf("screen-05c").patch!(db) },
  // Bookings · Interaction states
  "screen-12": { frame: "12 · Edit booking — unsaved changes guard", slice: "F13" },
  // The Bookings frames assume a library without the two Package Lib archived packages (13 shows no note, 39's
  // note names only Gold Package) — those two are staged out here.
  "screen-13": { frame: "13 · New booking — package dropdown open", slice: "F10", patch: (db) => (dropArchived(db), removeBooking(db, SARI)) },
  "screen-14": { frame: "14 · New booking — booking date picker", slice: "F10", patch: (db) => removeBooking(db, SARI) },
  "screen-15": { frame: "15 · New booking — required fields missing", slice: "F10", patch: (db) => removeBooking(db, SARI) },
  "screen-16": { frame: "16 · Table — date range filter", slice: "F9" },
  "screen-17": { frame: "17 · Calendar — “+N more” popover & empty-date hover", slice: "F7" },
  "screen-18": { frame: "18 · Table — no results", slice: "F9" },
  "screen-19": { frame: "19 · Calendar — week view", slice: "F8" },
  "screen-20": { frame: "20 · Calendar — day view", slice: "F8" },
  "screen-21": { frame: "21 · Booking detail — Draft (no invoice)", slice: "F12", patch: sariAsNewDraft },
  "screen-22": { frame: "22 · Invoice modal — confirming (loading)", slice: "F11", patch: (db) => removeBooking(db, SARI), numbers: { booking: 141, invoice: 186 } },
  "screen-23": { frame: "23 · Invoice modal — creation failed", slice: "F11", patch: (db) => removeBooking(db, SARI), numbers: { booking: 141, invoice: 186 }, note: "Slice calls failNext('createInvoice')." },
  "screen-24": { frame: "24 · Booking detail — Graduation · Aulia (from rail)", slice: "F12" },
  "screen-25": { frame: "25 · Table — next 7 days", slice: "F9" },
  "screen-26": { frame: "26 · Table — this week · Partially paid · DP", slice: "F9" },
  "screen-27": { frame: "27 · Booking detail — crew schedule popover", slice: "F12" },
  "screen-28": { frame: "28 · Calendar week — hover, drill-in & quick add", slice: "F8" },
  "screen-29": { frame: "29 · Calendar day — row hover & crew schedule", slice: "F8/F12" },
  "screen-30": { frame: "30 · Calendar day — no bookings", slice: "F8" },
  "screen-31": {
    frame: "31 · Calendar week — busy day “+N more”",
    slice: "F8",
    patch: (db) => {
      // Busy Saturday: two 7 Nov bookings moved to 14 Nov with the statuses screen 31 shows, plus Putri & Adi.
      // Screen 31 lists them last (… Putri & Adi → Kopi Nusa → Kenzo), i.e. after Putri & Adi in creation
      // order — they are staged as rebooked on 9 Nov afternoon.
      const kopi = byRef(db, "BK-2026-0137");
      kopi.bookingDate = "2026-11-14";
      kopi.createdAt = kopi.updatedAt = at("2026-11-09 16:00");
      dropInvoices(db, kopi);
      const kenzo = byRef(db, "BK-2026-0136");
      kenzo.bookingDate = "2026-11-14";
      kenzo.createdAt = kenzo.updatedAt = at("2026-11-09 16:30");
      addInvoice(db, "BK-2026-0136", { type: "paid", amount: 1_125_000, at: "2026-11-09 16:45" });
      addBooking(db, {
        ref: "BK-2026-0160", name: "Engagement · Putri & Adi", client: "Putri Lestari", phone: "+6281311223344", pkg: "pkg_silver",
        date: "2026-11-14", crew: ["crew_rp"], created: "2026-11-09 15:00",
      });
      addInvoice(db, "BK-2026-0160", { type: "dp", amount: 1_500_000, at: "2026-11-09 15:20", dp: ["percentage", 50] });
    },
  },
  "screen-32": { frame: "32 · New booking — leave guard", slice: "F10", patch: (db) => removeBooking(db, SARI) },
  "screen-33": { frame: "33 · Edit booking — Cancel booking section", slice: "F14", patch: sariEditedToPlatinum, note: "Sari saved as Platinum + 4 items (as 10)." },
  "screen-34": { frame: "34 · Cancel booking — reason modal", slice: "F14", patch: sariEditedToPlatinum },
  "screen-35": {
    frame: "35 · Booking detail — Canceled (read-only)",
    slice: "F14",
    patch: (db) => {
      const b = byRef(db, SARI);
      Object.assign(b, { canceledAt: at("2026-11-10 10:05"), canceledBy: "Admin", cancelReason: "Client postponed the wedding to next year." });
      recompute(db, b);
    },
  },
  "screen-36": { frame: "36 · Bookings — empty (first use)", slice: "F6", patch: (db) => ((db.bookings = []), (db.invoices = [])) },
  "screen-37": { frame: "37 · Invoice PDF — generation failed", slice: "F15", note: "Slice calls failNext('generatePdf')." },
  "screen-38": {
    frame: "38 · Edit booking — archived package kept",
    slice: "F13",
    patch: (db) => {
      // Gold archived after Sari & Dimas booked it; the booking (saved) keeps Gold at Rp 10.000.000 with 4 items on 21 Nov.
      archive(db, "pkg_gold");
      const b = byRef(db, SARI);
      b.bookingDate = "2026-11-21";
      b.items = [
        { id: "0142_i1", name: "Extra hour", price: 500_000, qty: 2 },
        { id: "0142_i2", name: "Printed album 20×30", price: 750_000, qty: 1 },
        { id: "0142_i3", name: "Drone footage", price: 1_500_000, qty: 1 },
        { id: "0142_i4", name: "Same-day edit video", price: 1_500_000, qty: 1 },
      ];
      recompute(db, b);
    },
  },
  "screen-39": { frame: "39 · New booking — package dropdown (archived hidden)", slice: "F10", patch: (db) => (dropArchived(db), archive(db, "pkg_gold"), removeBooking(db, SARI)) },
  "screen-40": { frame: "40 · New booking — package dropdown (library empty)", slice: "F10", patch: (db) => ((db.packages = db.packages.filter(() => false)), removeBooking(db, SARI)) },
  // Package Lib
  "package-01": { frame: "Package 01 · edit package", slice: "F5" },
  "package-02": { frame: "Package 02 · new package", slice: "F5" },
  "package-03": { frame: "Package 03 · archive confirmation", slice: "F5" },
  "package-04": { frame: "Package 04 · archived tab", slice: "F5" },
  "package-05": { frame: "Package 05 · validation errors", slice: "F5" },
  "package-06": { frame: "Package 06 · save failed", slice: "F5", note: "Slice calls failNext('savePackage')." },
  "package-07": { frame: "Package 07 · empty (first use)", slice: "F5", patch: (db) => ((db.packages = []), (db.bookings = []), (db.invoices = [])) },
  "package-08": { frame: "Package 08 · search no results", slice: "F5" },
  // Launchpad & Profile, Login — data = seed (profile bs.moment / bs-moment@email.com).
  "login": { frame: "Login P1–P3, E1–E7", slice: "F3" },
  "launchpad": { frame: "Launchpad L1–L3, M1–M3", slice: "F4" },
  "profile": { frame: "Profile AC1–AC7, LO1–LO2", slice: "F16" },
};

function fixtureOf(name: string): Fixture {
  const f = FIXTURES[name];
  if (!f) throw new Error(`Unknown fixture "${name}". Known: ${Object.keys(FIXTURES).join(", ")}`);
  return f;
}

export function applyFixture(db: Db, name: string): Db {
  const f = fixtureOf(name);
  f.patch?.(db);
  db.fixture = name;
  syncCounters(db);
  if (f.numbers?.booking !== undefined) db.counters.booking[2026] = f.numbers.booking;
  if (f.numbers?.invoice !== undefined) db.counters.invoice[2026] = f.numbers.invoice;
  return db;
}

// ── patch helpers ──────────────────────────────────────────────────────────────────
function removeBooking(db: Db, ref: string) {
  const b = byRef(db, ref);
  db.bookings = db.bookings.filter((x) => x !== b);
  db.invoices = db.invoices.filter((i) => i.bookingId !== b.id);
}

function archive(db: Db, id: string) {
  const p = db.packages.find((x) => x.id === id)!;
  Object.assign(p, { isActive: false, archivedAt: "2026-11-09", updatedAt: "2026-11-09" });
}

function addInvoice(db: Db, ref: string, i: { type: Db["invoices"][number]["type"]; amount: number; at: string; number?: string; dp?: ["percentage" | "fixed", number] }) {
  const b = byRef(db, ref);
  const number = i.number ?? `INV-2026-${String((db.counters.invoice[2026] ?? 0) + 1).padStart(4, "0")}`;
  if (!i.number) db.counters.invoice[2026] = (db.counters.invoice[2026] ?? 0) + 1;
  db.invoices.push(
    buildInvoice(db, b, { id: `inv_${number.slice(-4)}_fx`, number, type: i.type, amount: i.amount, issuedAt: at(i.at), dpMethod: i.dp?.[0] ?? null, dpPercentage: i.dp?.[0] === "percentage" ? i.dp[1] : null, createdBy: "Admin" }),
  );
  recompute(db, b);
}

function addBooking(db: Db, d: { ref: string; name: string; client: string; phone: string; pkg: string; date: Booking["bookingDate"]; crew: string[]; created: string }) {
  const p = db.packages.find((x) => x.id === d.pkg)!;
  const created = at(d.created);
  const b: Booking = {
    id: `bk_${d.ref.slice(-4)}`, ref: d.ref, bookingName: d.name, clientName: d.client, clientPhone: d.phone,
    packageId: p.id, packageNameSnapshot: p.name, packagePriceSnapshot: p.price, bookingDate: d.date, terms: db.settings.defaultTerms, paymentInstruction: { ...db.settings.defaultPayment },
    items: [], crewIds: d.crew, total: 0, totalPaid: 0, status: "draft", canceledAt: null, canceledBy: null, cancelReason: null,
    createdBy: "Admin", createdAt: created, updatedAt: created,
  };
  db.bookings.push(b);
  recompute(db, b);
}
