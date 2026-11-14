// Data model — mirrors PRD §4.2 so the mock layer can be swapped for Supabase later.
import type { BookingStatus, DpMethod, InvoiceType } from "@/lib/booking/calc";
import type { ISODate } from "@/lib/format";

export type { BookingStatus, DpMethod, InvoiceType, ISODate };

export type Package = {
  id: string;
  name: string;
  price: number;
  /** One-line summary shown in the list row and the booking picker ("8-hour coverage · 2 crew · …"). */
  summary: string;
  /** Long description, text area max 1000 (PRD US-0). */
  description: string;
  isActive: boolean;
  archivedAt: ISODate | null;
  updatedAt: ISODate;
  /** Bookings made before the seeded window (Package Library "n bookings" = legacy + seeded). */
  legacyBookings: number;
};

export type Crew = { id: string; name: string; role: string; isActive: boolean };

/** Where the client pays (printed on every invoice) — every booking has one (Figma lane I). */
export type PaymentInstruction = { receiptName: string; accountNumber: string; accountName: string };

/** Business information (Account settings → Business information, PRD US-14). Printed in the invoice PDF's Brand row and
 *  "From" block. `logo` is a PNG / JPEG data URL (≤ 256 px); null = no logo, the PDF shows the name's initials. */
export type Business = { name: string; address: string; phone: string; email: string; logo?: string | null };

export type BookingItem = { id: string; name: string; price: number; qty: number };

export type Booking = {
  id: string;
  ref: string; // BK-2026-0142
  bookingName: string;
  clientName: string;
  clientPhone: string; // E.164 +62…
  packageId: string;
  packageNameSnapshot: string;
  packagePriceSnapshot: number;
  bookingDate: ISODate;
  terms: string;
  paymentInstruction: PaymentInstruction;
  items: BookingItem[];
  crewIds: string[];
  total: number; // derived, recomputed on every write
  totalPaid: number; // Σ non-void invoice amounts
  status: BookingStatus;
  canceledAt: string | null;
  canceledBy: string | null;
  cancelReason: string | null;
  createdBy: string;
  createdAt: string; // ISO timestamp
  updatedAt: string;
};

export type InvoiceSnapshot = {
  invoiceNumber: string;
  issuedAt: string;
  /** Business details at issue time — the PDF is rebuilt from the snapshot only (US-10). */
  business: Business;
  booking: {
    ref: string;
    bookingName: string;
    clientName: string;
    clientPhone: string;
    bookingDate: ISODate;
    packageName: string;
    packagePrice: number;
    /** The package's one-line summary at issue time (PDF item line "Gold Package — 8-hour coverage · …"). */
    packageSummary: string;
    items: { name: string; price: number; qty: number; subtotal: number }[];
    terms: string;
    /** Printed on the invoice (F15). */
    paymentInstruction: PaymentInstruction;
  };
  total: number;
  type: InvoiceType;
  dpMethod: DpMethod | null;
  dpPercentage: number | null;
  amount: number;
  paidBefore: number;
  paidAfter: number;
  remainingAfter: number;
  createdBy: string;
};

export type Invoice = {
  id: string;
  bookingId: string;
  number: string; // INV-2026-0187
  type: InvoiceType;
  dpMethod: DpMethod | null;
  dpPercentage: number | null;
  amount: number;
  issuedAt: string; // ISO timestamp
  snapshot: InvoiceSnapshot;
  snapshotHash: string;
  pdfPath: string | null;
  voidedAt: string | null;
  createdBy: string;
};

export type Role = "admin" | "viewer";

export type Profile = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  workspace: string;
  passwordChangedAt: ISODate;
};

export type Db = {
  version: number;
  fixture: string;
  packages: Package[];
  crew: Crew[];
  bookings: Booking[];
  invoices: Invoice[];
  profile: Profile;
  /** Prototype-only credential store (never shipped): the mock auth checks against it. */
  password: string;
  counters: { booking: Record<number, number>; invoice: Record<number, number> };
  /** `defaultPayment` prefills every new booking's payment instruction. */
  settings: { defaultTerms: string; defaultPayment: PaymentInstruction; business: Business };
};
