// Canonical seed — PLAN §2.7, built from Figma "bs internal tools" (F2 export:
// public/__figma__/specs/F02-frame-texts.json). Screen 01 (month) + 02 (table) are authoritative;
// per-screen differences live in fixtures.ts.
//
// • Every booking, client, phone, package, item, crew and invoice named in Figma keeps its exact values.
// • Bookings Figma doesn't show (Oct, and the clients of month-only chips) are invented but chosen so
//   the dashboard numbers Figma shows are produced by the data: 14 Partially paid bookings with
//   Rp 48.750.000 outstanding, Rp 61.200.000 collected in Nov, +12,4% vs Oct, Raka's "5 bookings in Nov".
// • Known Figma inconsistency (left for F6): KPI "Bookings this month 24 / +4" vs 18 Nov bookings on the
//   month calendar. Oct has 20 bookings so "+4" would hold if Nov had 24.
import { addDays, type ISODate } from "@/lib/format";
import { buildInvoice, recompute, syncCounters } from "./ledger";
import type { Booking, Crew, Db, DpMethod, InvoiceType, Package } from "./types";

/** "2026-11-02 13:20" (Asia/Jakarta) → ISO UTC. */
export const at = (local: string) => new Date(`${local.replace(" ", "T")}:00+07:00`).toISOString();

/** Studio account (Figma lane I) — prefills every booking's payment instruction. */
/** Saved-data schema version: the store reseeds when localStorage holds another one. Bump on any Db shape change.
 *  2: bookings carry a payment instruction (lane I) · 3: invoice snapshots carry the business + package summary (F15). */
export const DB_VERSION = 3;

export const DEFAULT_PAYMENT = { receiptName: "Bank BCA", accountNumber: "1234567890", accountName: "bs.moment Studio" };

/** Figma Bookings 11 header / "From" block. */
export const DEFAULT_BUSINESS = { name: "bs.moment", address: "Jl. Rawa Mangun No. 12, Jakarta Timur", phone: "+62 21-555-0100", email: "finance@bs-moment.com" };

export const DEFAULT_TERMS =
  "Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked. Reschedule requests must be made at least 14 days before the booking date.";

export const PACKAGES: Package[] = [
  { id: "pkg_basic", name: "Basic Package", price: 2_000_000, summary: "2-hour session · 1 crew · 25 edited photos", description: "2-hour session with 1 crew. 25 edited photos delivered within 7 days via online gallery.", isActive: true, archivedAt: null, updatedAt: "2026-10-02", legacyBookings: 0 },
  { id: "pkg_silver", name: "Silver Package", price: 3_000_000, summary: "4-hour coverage · 1 crew · 60 edited photos", description: "4-hour coverage with 1 crew. 60 edited photos delivered within 10 days via online gallery.", isActive: true, archivedAt: null, updatedAt: "2026-10-02", legacyBookings: 0 },
  { id: "pkg_gold", name: "Gold Package", price: 10_000_000, summary: "8-hour coverage · 2 crew · 1 premium album", description: "8-hour coverage with 2 crew (lead photographer + assistant). Includes 1 premium album 20×30 (20 pages), 150 edited photos delivered within 14 days, and an online gallery for 6 months.", isActive: true, archivedAt: null, updatedAt: "2026-10-15", legacyBookings: 0 },
  { id: "pkg_platinum", name: "Platinum Package", price: 14_000_000, summary: "Full-day coverage · 3 crew · album + video highlight", description: "Full-day coverage with 3 crew. Includes a premium album, a 3–5 minute video highlight and an online gallery for 12 months.", isActive: true, archivedAt: null, updatedAt: "2026-10-15", legacyBookings: 0 },
  { id: "pkg_corporate", name: "Corporate Package", price: 9_000_000, summary: "Half-day event · 2 crew · same-day delivery", description: "Half-day event coverage with 2 crew and same-day delivery of 50 selected photos.", isActive: true, archivedAt: null, updatedAt: "2026-09-28", legacyBookings: 0 },
  { id: "pkg_event", name: "Event Package", price: 6_000_000, summary: "Seminar / launch · 2 crew · 100 edited photos", description: "Seminar or launch coverage with 2 crew. 100 edited photos delivered within 5 days.", isActive: true, archivedAt: null, updatedAt: "2026-11-01", legacyBookings: 0 },
  { id: "pkg_wedding_classic", name: "Wedding Classic Package", price: 8_000_000, summary: "6-hour coverage · 2 crew · 1 album", description: "6-hour wedding coverage with 2 crew and 1 album.", isActive: false, archivedAt: "2026-09-12", updatedAt: "2026-09-12", legacyBookings: 0 },
  { id: "pkg_studio_mini", name: "Studio Mini Package", price: 750_000, summary: "1-hour studio session · 1 crew", description: "1-hour studio session with 1 crew and 10 edited photos.", isActive: false, archivedAt: "2026-08-03", updatedAt: "2026-08-03", legacyBookings: 0 },
];

/** Package Library "n bookings" as shown in Figma (Package Lib 01 / 04). */
export const FIGMA_PACKAGE_BOOKINGS: Record<string, number> = {
  pkg_basic: 18, pkg_silver: 11, pkg_gold: 23, pkg_platinum: 9, pkg_corporate: 6, pkg_event: 4, pkg_wedding_classic: 31, pkg_studio_mini: 12,
};

export const CREW: Crew[] = [
  { id: "crew_rp", name: "Raka Pratama", role: "Lead photographer", isActive: true },
  { id: "crew_da", name: "Dinda Ayu", role: "Videographer", isActive: true },
  { id: "crew_bs", name: "Bima Saputra", role: "Photographer", isActive: true },
  { id: "crew_np", name: "Nadia Putri", role: "Event organizer", isActive: true },
  { id: "crew_fn", name: "Fajar Nugroho", role: "Assistant", isActive: true },
  { id: "crew_sd", name: "Sinta Dewi", role: "Make-up artist", isActive: true },
];

type InvDef = { type: InvoiceType; amount: number; at: string; number?: string; dp?: [DpMethod, number] };
type BookingDef = {
  ref: string;
  name: string;
  client: string;
  phone: string;
  pkg: string;
  date: ISODate;
  items?: [string, number, number][];
  crew?: string[];
  created: string;
  inv?: InvDef[];
  canceled?: { at: string; reason: string };
};

// prettier-ignore
export const BOOKINGS: BookingDef[] = [
  // ── November 2026 — exactly the 18 chips of Figma screen 01 (+ 1 canceled, hidden on the calendar) ──
  { ref: "BK-2026-0131", name: "Corporate Gathering · PT Arta", client: "Hendra Gunawan", phone: "+6281123456789", pkg: "pkg_corporate", date: "2026-11-03", items: [["Extra hour", 1_000_000, 1]], crew: ["crew_da", "crew_np"], created: "2026-10-05 10:12",
    inv: [{ type: "full", amount: 10_000_000, at: "2026-10-20 14:05" }] },
  { ref: "BK-2026-0133", name: "Engagement · Rina & Yoga", client: "Rina Kartika", phone: "+6281298765432", pkg: "pkg_silver", date: "2026-11-06", crew: ["crew_bs"], created: "2026-10-08 16:40",
    inv: [{ type: "dp", amount: 1_500_000, at: "2026-10-12 11:00", dp: ["percentage", 50] }, { type: "paid", amount: 1_500_000, at: "2026-11-05 09:15" }] },
  { ref: "BK-2026-0136", name: "Birthday · Kenzo", client: "Maya Kusuma", phone: "+6285711223344", pkg: "pkg_basic", date: "2026-11-07", items: [["Balloon decoration", 250_000, 1]], crew: ["crew_fn"], created: "2026-10-22 13:30",
    inv: [{ type: "dp", amount: 1_125_000, at: "2026-10-25 10:20", dp: ["percentage", 50] }] },
  { ref: "BK-2026-0137", name: "Product Shoot · Kopi Nusa", client: "Bima Santoso", phone: "+6281377889900", pkg: "pkg_corporate", date: "2026-11-07", crew: ["crew_bs", "crew_sd"], created: "2026-10-24 09:05",
    inv: [{ type: "full", amount: 9_000_000, at: "2026-11-03 15:40" }] },
  { ref: "BK-2026-0139", name: "Graduation · Aulia", client: "Aulia Rahma", phone: "+6281277881020", pkg: "pkg_silver", date: "2026-11-10", items: [["Extra hour", 250_000, 1], ["Printed photos 4R", 10_000, 25]], crew: ["crew_rp"], created: "2026-10-28 11:02",
    inv: [{ type: "dp", amount: 1_750_000, at: "2026-11-02 13:20", number: "INV-2026-0179", dp: ["percentage", 50] }] },
  { ref: "BK-2026-0144", name: "Family Session · Hartono", client: "Budi Hartono", phone: "+628165550192", pkg: "pkg_basic", date: "2026-11-10", crew: ["crew_fn"], created: "2026-11-01 08:47" },
  { ref: "BK-2026-0142", name: "Wedding · Sari & Dimas", client: "Sari Wulandari", phone: "+6281234567890", pkg: "pkg_gold", date: "2026-11-12", items: [["Extra hour", 500_000, 2], ["Printed album 20×30", 750_000, 1], ["Guest photobooth", 750_000, 1]], crew: ["crew_rp", "crew_da", "crew_np"], created: "2026-10-10 09:31",
    inv: [{ type: "dp", amount: 3_000_000, at: "2026-10-10 09:48", number: "INV-2026-0187", dp: ["fixed", 3_000_000] }, { type: "partial", amount: 2_000_000, at: "2026-11-01 10:15", number: "INV-2026-0201" }] },
  { ref: "BK-2026-0147", name: "Prewedding · Nadia & Fajar", client: "Nadia Safitri", phone: "+6281190873321", pkg: "pkg_silver", date: "2026-11-14", items: [["Extra hour", 500_000, 2], ["Outdoor location fee", 500_000, 1]], crew: ["crew_rp", "crew_bs"], created: "2026-10-27 15:20",
    inv: [{ type: "dp", amount: 1_350_000, at: "2026-10-30 10:05", dp: ["percentage", 30] }] },
  { ref: "BK-2026-0149", name: "Company Profile · BPR Jaya", client: "Andi Pratama", phone: "+622155501234", pkg: "pkg_corporate", date: "2026-11-14", crew: ["crew_da", "crew_np"], created: "2026-11-02 10:30" }, // before Dewi: same-day order in Figma 17/19/20 is Nadia → BPR → Dewi → Wijaya
  { ref: "BK-2026-0148", name: "Maternity · Dewi", client: "Dewi Anggraini", phone: "+6281922348890", pkg: "pkg_basic", date: "2026-11-14", items: [["Extra edited photos", 25_000, 10]], crew: ["crew_sd"], created: "2026-11-02 14:10",
    inv: [{ type: "full", amount: 2_250_000, at: "2026-11-06 16:30" }] },
  { ref: "BK-2026-0153", name: "Family Portrait · Wijaya", client: "Hendra Wijaya", phone: "+6281299004411", pkg: "pkg_basic", date: "2026-11-14", crew: ["crew_fn"], created: "2026-11-06 09:55" },
  { ref: "BK-2026-0150", name: "Seminar · Univ. Nusantara", client: "Rizky Maulana", phone: "+6287833210091", pkg: "pkg_event", date: "2026-11-18", crew: ["crew_da", "crew_bs"], created: "2026-11-03 13:15",
    inv: [{ type: "dp", amount: 3_000_000, at: "2026-11-04 10:40", dp: ["percentage", 50] }] },
  { ref: "BK-2026-0151", name: "Wedding · Laras & Bima", client: "Larasati Putri", phone: "+6281322014478", pkg: "pkg_platinum", date: "2026-11-21", items: [["Extra hour", 750_000, 3], ["Same-day edit video", 2_500_000, 1]], crew: ["crew_rp", "crew_da", "crew_bs"], created: "2026-10-16 11:45",
    inv: [{ type: "dp", amount: 5_625_000, at: "2026-10-18 10:00", dp: ["percentage", 30] }] },
  { ref: "BK-2026-0154", name: "Aqiqah · Baby Arka", client: "Siti Rahmawati", phone: "+6285244556677", pkg: "pkg_basic", date: "2026-11-21", crew: ["crew_sd"], created: "2026-11-07 10:00" },
  { ref: "BK-2026-0155", name: "Engagement · Putri & Andre", client: "Putri Anjani", phone: "+6281355667788", pkg: "pkg_silver", date: "2026-11-22", crew: ["crew_bs"], created: "2026-11-08 12:25" },
  { ref: "BK-2026-0158", name: "Wedding · Citra & Reza", client: "Citra Maharani", phone: "+6285711002390", pkg: "pkg_gold", date: "2026-11-27", items: [["Extra hour", 500_000, 2], ["Printed album 20×30", 750_000, 1], ["Drone coverage", 1_500_000, 1]], crew: ["crew_rp", "crew_np"], created: "2026-11-05 15:00",
    inv: [{ type: "dp", amount: 4_000_000, at: "2026-11-07 11:30", dp: ["fixed", 4_000_000] }] },
  { ref: "BK-2026-0156", name: "Birthday · Alya 17th", client: "Ratna Sari", phone: "+6281388990011", pkg: "pkg_basic", date: "2026-11-28", crew: ["crew_fn"], created: "2026-11-08 09:40" },
  { ref: "BK-2026-0157", name: "Launch Event · Tokoku", client: "Kevin Halim", phone: "+6281122334455", pkg: "pkg_event", date: "2026-11-28", crew: ["crew_da", "crew_np"], created: "2026-11-08 14:00",
    inv: [{ type: "dp", amount: 2_400_000, at: "2026-11-08 16:20", dp: ["percentage", 40] }] },
  { ref: "BK-2026-0146", name: "Prewedding · Yuni & Arif", client: "Yuni Lestari", phone: "+6281566778899", pkg: "pkg_silver", date: "2026-11-25", crew: ["crew_bs"], created: "2026-11-02 10:10",
    canceled: { at: "2026-11-05 11:00", reason: "Client chose another vendor." } },
  // ── December ───────────────────────────────────────────────────────────────────────────────
  { ref: "BK-2026-0159", name: "Wedding · Maya & Teguh", client: "Maya Puspita", phone: "+6281244332211", pkg: "pkg_gold", date: "2026-12-05", items: [["Extra hour", 500_000, 2]], crew: ["crew_da", "crew_bs"], created: "2026-11-09 10:00",
    inv: [{ type: "dp", amount: 7_000_000, at: "2026-11-09 11:10", dp: ["fixed", 7_000_000] }] },
  // ── October 2026 (20, not shown in Figma) — +4 vs Nov's 24; 5 Partially paid with Rp 450.000 left each ──
  { ref: "BK-2026-0101", name: "Wedding · Anisa & Rudi", client: "Anisa Putri", phone: "+6281211112222", pkg: "pkg_gold", date: "2026-10-03", items: [["Extra hour", 500_000, 2]], crew: ["crew_rp", "crew_da"], created: "2026-08-20 10:00",
    inv: [{ type: "dp", amount: 5_000_000, at: "2026-09-02 10:00", dp: ["fixed", 5_000_000] }, { type: "paid", amount: 6_000_000, at: "2026-10-06 10:00" }] },
  { ref: "BK-2026-0102", name: "Prewedding · Lina & Hadi", client: "Lina Marlina", phone: "+6281233334444", pkg: "pkg_silver", date: "2026-10-04", crew: ["crew_bs"], created: "2026-09-10 11:00",
    inv: [{ type: "full", amount: 3_000_000, at: "2026-09-20 11:00" }] },
  { ref: "BK-2026-0103", name: "Graduation · Farhan", client: "Farhan Akbar", phone: "+6281255556666", pkg: "pkg_basic", date: "2026-10-05", crew: ["crew_rp"], created: "2026-09-15 09:00",
    inv: [{ type: "full", amount: 2_000_000, at: "2026-09-25 09:30" }] },
  { ref: "BK-2026-0104", name: "Family Session · Gunawan", client: "Agus Gunawan", phone: "+6281277778888", pkg: "pkg_basic", date: "2026-10-07", crew: ["crew_fn"], created: "2026-09-18 10:00",
    inv: [{ type: "full", amount: 2_000_000, at: "2026-09-28 10:00" }] },
  { ref: "BK-2026-0105", name: "Company Profile · CV Maju", client: "Doni Saputra", phone: "+622177001122", pkg: "pkg_corporate", date: "2026-10-08", crew: ["crew_da", "crew_np"], created: "2026-09-05 14:00",
    inv: [{ type: "dp", amount: 4_500_000, at: "2026-09-15 14:00", dp: ["percentage", 50] }, { type: "paid", amount: 4_500_000, at: "2026-11-02 09:30" }] },
  { ref: "BK-2026-0106", name: "Seminar · Bank Sentosa", client: "Rina Hapsari", phone: "+622155443322", pkg: "pkg_event", date: "2026-10-09", crew: ["crew_da", "crew_bs"], created: "2026-09-12 10:30",
    inv: [{ type: "full", amount: 6_000_000, at: "2026-09-28 13:00" }] },
  { ref: "BK-2026-0107", name: "Birthday · Naila 5th", client: "Fitri Handayani", phone: "+6285612345678", pkg: "pkg_basic", date: "2026-10-11", crew: ["crew_fn"], created: "2026-10-01 10:00",
    inv: [{ type: "dp", amount: 1_550_000, at: "2026-10-05 10:00", dp: ["fixed", 1_550_000] }] },
  { ref: "BK-2026-0108", name: "Engagement · Sinta & Bayu", client: "Sinta Maharani", phone: "+6285623456789", pkg: "pkg_silver", date: "2026-10-12", crew: ["crew_bs"], created: "2026-09-29 15:00",
    inv: [{ type: "dp", amount: 2_550_000, at: "2026-10-03 15:00", dp: ["percentage", 85] }] },
  { ref: "BK-2026-0109", name: "Maternity · Ayu", client: "Ayu Lestari", phone: "+6285634567890", pkg: "pkg_basic", date: "2026-10-14", crew: ["crew_sd"], created: "2026-09-30 11:00",
    inv: [{ type: "full", amount: 2_000_000, at: "2026-10-08 11:00" }] },
  { ref: "BK-2026-0110", name: "Wedding · Dian & Fikri", client: "Dian Pertiwi", phone: "+6281299887766", pkg: "pkg_platinum", date: "2026-10-17", items: [["Same-day edit video", 2_000_000, 1], ["Extra hour", 750_000, 2]], crew: ["crew_rp", "crew_da", "crew_bs"], created: "2026-08-28 10:00",
    inv: [{ type: "dp", amount: 6_000_000, at: "2026-09-10 10:00", dp: ["fixed", 6_000_000] }, { type: "paid", amount: 11_500_000, at: "2026-11-03 10:00" }] },
  { ref: "BK-2026-0111", name: "Product Shoot · Batik Laras", client: "Laras Wening", phone: "+6281288776655", pkg: "pkg_corporate", date: "2026-10-18", crew: ["crew_bs", "crew_sd"], created: "2026-09-20 09:00",
    inv: [{ type: "full", amount: 9_000_000, at: "2026-09-30 09:00" }] },
  { ref: "BK-2026-0112", name: "Graduation · Kirana", client: "Kirana Dewi", phone: "+6285645678901", pkg: "pkg_basic", date: "2026-10-19", crew: ["crew_rp"], created: "2026-10-10 10:00",
    inv: [{ type: "dp", amount: 1_550_000, at: "2026-10-16 10:00", dp: ["fixed", 1_550_000] }] },
  { ref: "BK-2026-0113", name: "Family Portrait · Santoso", client: "Teguh Santoso", phone: "+6281277665544", pkg: "pkg_basic", date: "2026-10-21", items: [["Extra edited photos", 25_000, 4]], crew: ["crew_fn"], created: "2026-10-12 10:00",
    inv: [{ type: "full", amount: 2_100_000, at: "2026-10-20 10:00" }] },
  { ref: "BK-2026-0114", name: "Wedding · Rahma & Yusuf", client: "Rahma Aulia", phone: "+6281266554433", pkg: "pkg_wedding_classic", date: "2026-10-24", items: [["Extra hour", 750_000, 2]], crew: ["crew_rp", "crew_np"], created: "2026-08-15 10:00",
    inv: [{ type: "dp", amount: 3_000_000, at: "2026-08-25 10:00", dp: ["fixed", 3_000_000] }, { type: "paid", amount: 6_500_000, at: "2026-10-20 16:00" }] },
  { ref: "BK-2026-0115", name: "Launch Event · Sepatu Lokal", client: "Bayu Prakoso", phone: "+6281255443322", pkg: "pkg_event", date: "2026-10-25", crew: ["crew_da", "crew_np"], created: "2026-10-14 10:00",
    inv: [{ type: "dp", amount: 5_550_000, at: "2026-10-21 10:00", dp: ["fixed", 5_550_000] }] },
  { ref: "BK-2026-0116", name: "Aqiqah · Baby Zahra", client: "Nur Aini", phone: "+6285656789012", pkg: "pkg_basic", date: "2026-10-26", items: [["Extra hour", 300_000, 1]], crew: ["crew_sd"], created: "2026-10-15 10:00",
    inv: [{ type: "full", amount: 2_300_000, at: "2026-11-05 10:00" }] },
  { ref: "BK-2026-0117", name: "Prewedding · Tari & Galih", client: "Tari Wulandari", phone: "+6285667890123", pkg: "pkg_silver", date: "2026-10-28", crew: ["crew_bs"], created: "2026-10-16 10:00",
    inv: [{ type: "dp", amount: 2_550_000, at: "2026-10-22 10:00", dp: ["percentage", 85] }] },
  { ref: "BK-2026-0118", name: "Corporate Gathering · PT Sinar", client: "Yohanes Wibowo", phone: "+622133221100", pkg: "pkg_corporate", date: "2026-10-29", crew: ["crew_da", "crew_np"], created: "2026-09-25 10:00",
    inv: [{ type: "dp", amount: 4_500_000, at: "2026-09-28 10:00", dp: ["percentage", 50] }, { type: "paid", amount: 4_500_000, at: "2026-11-06 10:00" }] },
  { ref: "BK-2026-0119", name: "Birthday · Raffa 10th", client: "Dewi Kartika", phone: "+6285678901234", pkg: "pkg_basic", date: "2026-10-30", items: [["Photo booth", 2_000_000, 1]], crew: ["crew_fn"], created: "2026-10-18 10:00",
    inv: [{ type: "full", amount: 4_000_000, at: "2026-11-07 10:00" }] },
  { ref: "BK-2026-0120", name: "Engagement · Wulan & Doni", client: "Wulan Sari", phone: "+6285689012345", pkg: "pkg_silver", date: "2026-10-31", crew: ["crew_bs"], created: "2026-10-05 10:00",
    inv: [{ type: "dp", amount: 1_500_000, at: "2026-10-15 10:00", dp: ["percentage", 50] }, { type: "paid", amount: 1_500_000, at: "2026-11-08 10:00" }] },
];

const ADMIN = "Admin";
// Figma fixes these numbers; every other invoice is numbered by issue date, skipping them.
const FIXED_INVOICES = new Set(["INV-2026-0179", "INV-2026-0187", "INV-2026-0201"]);
const FIRST_GENERATED_INVOICE = 140;

export function seedDb(): Db {
  const db: Db = {
    version: DB_VERSION,
    fixture: "seed",
    packages: PACKAGES.map((p) => ({ ...p })),
    crew: CREW.map((c) => ({ ...c })),
    bookings: [],
    invoices: [],
    profile: { id: "user_admin", displayName: "bs.moment", email: "bs-moment@email.com", role: "admin", workspace: "bs.moment", passwordChangedAt: "2026-09-12" },
    password: "bsmoment26",
    counters: { booking: {}, invoice: {} },
    settings: {
      defaultTerms: DEFAULT_TERMS,
      defaultPayment: { ...DEFAULT_PAYMENT },
      business: { ...DEFAULT_BUSINESS },
    },
  };

  // Number generated invoices by issue date, skipping the Figma-fixed numbers.
  const all = BOOKINGS.flatMap((b) => (b.inv ?? []).map((i) => ({ b, i }))).sort((x, y) => at(x.i.at).localeCompare(at(y.i.at)));
  let seq = FIRST_GENERATED_INVOICE;
  const numberOf = new Map<InvDef, string>();
  for (const { i } of all) {
    if (i.number) {
      numberOf.set(i, i.number);
      continue;
    }
    let n: string;
    do n = `INV-2026-${String(seq++).padStart(4, "0")}`;
    while (FIXED_INVOICES.has(n));
    numberOf.set(i, n);
  }

  for (const d of BOOKINGS) {
    const pkg = PACKAGES.find((p) => p.id === d.pkg)!;
    const created = at(d.created);
    const b: Booking = {
      id: `bk_${d.ref.slice(-4)}`,
      ref: d.ref,
      bookingName: d.name,
      clientName: d.client,
      clientPhone: d.phone,
      packageId: pkg.id,
      packageNameSnapshot: pkg.name,
      packagePriceSnapshot: pkg.price,
      bookingDate: d.date,
      terms: DEFAULT_TERMS,
      paymentInstruction: { ...DEFAULT_PAYMENT },
      items: (d.items ?? []).map(([name, price, qty], k) => ({ id: `${d.ref.slice(-4)}_i${k + 1}`, name, price, qty })),
      crewIds: d.crew ?? [],
      total: 0,
      totalPaid: 0,
      status: "draft",
      canceledAt: d.canceled ? at(d.canceled.at) : null,
      canceledBy: d.canceled ? ADMIN : null,
      cancelReason: d.canceled?.reason ?? null,
      createdBy: ADMIN,
      createdAt: created,
      updatedAt: created,
    };
    db.bookings.push(b);
    recompute(db, b);
    for (const i of [...(d.inv ?? [])].sort((x, y) => x.at.localeCompare(y.at))) {
      const number = numberOf.get(i)!;
      db.invoices.push(
        buildInvoice(db, b, {
          id: `inv_${number.slice(-4)}`,
          number,
          type: i.type,
          amount: i.amount,
          issuedAt: at(i.at),
          dpMethod: i.dp?.[0] ?? null,
          dpPercentage: i.dp?.[0] === "percentage" ? i.dp[1] : null,
          createdBy: ADMIN,
        }),
      );
      recompute(db, b);
    }
  }

  // Package Library counts = bookings before the seeded window + seeded bookings (Figma Package Lib 01/04).
  for (const p of db.packages) {
    const seeded = db.bookings.filter((b) => b.packageId === p.id).length;
    p.legacyBookings = FIGMA_PACKAGE_BOOKINGS[p.id] - seeded;
  }
  syncCounters(db);
  return db;
}

/** Visible date range helpers used by fixtures/tests. */
export const SEED_WINDOW = { from: "2026-10-01" as ISODate, to: addDays("2026-12-31", 0) };
