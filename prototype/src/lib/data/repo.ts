// Mock data layer — same contracts as the planned Supabase RPCs (PLAN §2): save_booking,
// create_invoice, cancel_booking, plus reads. Every PRD §2.4 business rule is enforced here,
// independently of the UI. All functions are async (simulated latency) and can be made to fail
// once via failNext() to drive the error screens (Package 06, Bookings 23, 37).
import { LIMITS, allowedInvoiceTypes, bookingTotal, validateInvoice, validateTotalAgainstPaid, type DpMethod, type InvoiceError, type InvoiceType } from "@/lib/booking/calc";
import { cleanPayment, validatePayment } from "@/lib/booking/payment";
import { now } from "@/lib/clock";
import { addDays, isoToLocalDate, normalizePhone, parseISODate, type ISODate } from "@/lib/format";
import { buildInvoice, invoicesOf, nextNumber, recompute } from "./ledger";
import { getDb, transaction } from "./store";
import type { Booking, BookingStatus, Crew, Db, Invoice, Package, PaymentInstruction, Profile } from "./types";

// ── Dev controls ───────────────────────────────────────────────────────────────────
type Op = "savePackage" | "saveBooking" | "createInvoice" | "cancelBooking" | "generatePdf" | "login" | "updateProfile" | "changePassword";
const failing = new Set<Op>();
let latencyMs = Number(process.env.NEXT_PUBLIC_LATENCY ?? 0);
/** Next call of `op` throws a NetworkError (Package 06, Bookings 23 / 37). */
export const failNext = (op: Op) => failing.add(op);
export const setLatency = (ms: number) => (latencyMs = ms);

// Browser dev hooks (read once per page load): ?latency=1500 holds loading states on screen (Login P3,
// Bookings 22); ?fail=login makes the next call of that op fail (Login E6, Package 06, Bookings 23 / 37).
if (typeof window !== "undefined") {
  const p = new URLSearchParams(window.location.search);
  if (p.get("latency")) latencyMs = Number(p.get("latency"));
  for (const op of p.getAll("fail")) failing.add(op as Op);
}

export class NetworkError extends Error {
  constructor(op: string) {
    super(`Network error during ${op}`);
    this.name = "NetworkError";
  }
}

async function call<T>(op: Op | null, fn: () => T): Promise<T> {
  if (latencyMs) await new Promise((r) => setTimeout(r, latencyMs));
  if (op && failing.delete(op)) throw new NetworkError(op);
  return fn();
}

/** Who performs a write — stored as text so records keep the name they were created with (US-13). */
const ACTOR = () => getDb().profile.displayName;
const today = (): ISODate => isoToLocalDate(now().toISOString());
const year = () => Number(today().slice(0, 4));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ── Auth & profile (mock: one admin; PRD §4.3, US-13) ───────────────────────────────
const SESSION = "proto:session";
const LAST_EMAIL = "proto:lastEmail";
/** Email of the last successful login — prefilled after a session expires (Login E4). */
export function lastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL) ?? "";
  } catch {
    return "";
  }
}
export async function login(email: string, password: string) {
  return call("login", () => {
    if (!email.trim() || !password) return { ok: false as const, error: "required" as const };
    const d = getDb();
    if (email.trim().toLowerCase() !== d.profile.email || password !== d.password) return { ok: false as const, error: "invalid_credentials" as const };
    try {
      localStorage.setItem(SESSION, "1");
      localStorage.setItem(LAST_EMAIL, d.profile.email);
    } catch {}
    return { ok: true as const };
  });
}
export async function logout() {
  try {
    localStorage.removeItem(SESSION);
  } catch {}
}
export function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION) === "1";
  } catch {
    return false;
  }
}
export async function getProfile(): Promise<Profile> {
  return call(null, () => clone(getDb().profile));
}
export async function updateDisplayName(name: string) {
  return call("updateProfile", () => {
    const n = name.trim();
    if (n.length < LIMITS.displayNameMin || n.length > LIMITS.displayNameMax) return { ok: false as const, error: "length" as const };
    transaction((d) => (d.profile.displayName = n));
    return { ok: true as const, profile: clone(getDb().profile) };
  });
}
export const passwordRules = (current: string, next: string) => ({
  length: next.length >= 8,
  letterAndNumber: /[A-Za-z]/.test(next) && /\d/.test(next),
  differs: next.length > 0 && next !== current,
});
export async function changePassword(a: { current: string; next: string; confirm: string }) {
  return call("changePassword", () => {
    const errors: Partial<Record<"current" | "next" | "confirm", string>> = {};
    if (a.current !== getDb().password) errors.current = "incorrect";
    const r = passwordRules(a.current, a.next);
    if (!r.length || !r.letterAndNumber || !r.differs) errors.next = "rules";
    if (a.next !== a.confirm) errors.confirm = "mismatch";
    if (Object.keys(errors).length) return { ok: false as const, errors };
    transaction((d) => {
      d.password = a.next;
      d.profile.passwordChangedAt = today();
    });
    return { ok: true as const };
  });
}

// ── Packages (US-0) ─────────────────────────────────────────────────────────────────
export type PackageRow = Package & { bookings: number };
const withCount = (d: Db, p: Package): PackageRow => ({ ...clone(p), bookings: p.legacyBookings + d.bookings.filter((b) => b.packageId === p.id).length });

export async function listPackages(q: { tab?: "active" | "archived"; search?: string } = {}): Promise<PackageRow[]> {
  return call(null, () => {
    const d = getDb();
    const s = (q.search ?? "").trim().toLowerCase();
    return d.packages
      .filter((p) => (q.tab === "archived" ? !p.isActive : q.tab === "active" ? p.isActive : true))
      .filter((p) => !s || p.name.toLowerCase().includes(s) || p.summary.toLowerCase().includes(s))
      .map((p) => withCount(d, p));
  });
}

export type PackageInput = { id?: string; name: string; price: number | null; summary?: string; description: string };
export type PackageErrors = Partial<Record<"name" | "price" | "description", "required" | "duplicate" | "invalid" | "too_long">>;

function packageErrors(d: Db, a: PackageInput): PackageErrors {
  const e: PackageErrors = {};
  const name = a.name.trim();
  if (!name) e.name = "required";
  else if (d.packages.some((p) => p.isActive && p.id !== a.id && p.name.toLowerCase() === name.toLowerCase())) e.name = "duplicate";
  if (a.price === null || !Number.isSafeInteger(a.price) || a.price < 0) e.price = "invalid";
  if (a.description.length > LIMITS.packageDescriptionMax) e.description = "too_long";
  return e;
}

export async function savePackage(a: PackageInput) {
  return call("savePackage", () => {
    const d = getDb();
    const errors = packageErrors(d, a);
    if (Object.keys(errors).length) return { ok: false as const, errors };
    const p = transaction((db) => {
      const existing = a.id ? db.packages.find((p) => p.id === a.id) : undefined;
      if (existing) {
        // Price changes never touch existing bookings (they keep their snapshot) — PRD US-0.
        Object.assign(existing, { name: a.name.trim(), price: a.price!, summary: a.summary ?? existing.summary, description: a.description, updatedAt: today() });
        return existing;
      }
      const created: Package = { id: `pkg_${Date.now().toString(36)}`, name: a.name.trim(), price: a.price!, summary: a.summary ?? "", description: a.description, isActive: true, archivedAt: null, updatedAt: today(), legacyBookings: 0 };
      db.packages.push(created);
      return created;
    });
    return { ok: true as const, package: withCount(getDb(), p) };
  });
}

export async function archivePackage(id: string) {
  return call("savePackage", () =>
    transaction((d) => {
      const p = d.packages.find((p) => p.id === id);
      if (!p) throw new Error("not_found");
      Object.assign(p, { isActive: false, archivedAt: today(), updatedAt: today() });
      return { ok: true as const };
    }),
  );
}

export async function restorePackage(id: string) {
  return call("savePackage", () => {
    const d = getDb();
    const p = d.packages.find((p) => p.id === id);
    if (!p) throw new Error("not_found");
    if (d.packages.some((o) => o.isActive && o.name.toLowerCase() === p.name.toLowerCase())) return { ok: false as const, error: "duplicate" as const };
    transaction((db) => Object.assign(db.packages.find((x) => x.id === id)!, { isActive: true, archivedAt: null, updatedAt: today() }));
    return { ok: true as const };
  });
}

// ── Crew ────────────────────────────────────────────────────────────────────────────
export async function listCrew(): Promise<Crew[]> {
  return call(null, () => clone(getDb().crew.filter((c) => c.isActive)));
}

// ── Bookings: read ──────────────────────────────────────────────────────────────────
export type BookingRow = Booking & { remaining: number; latestInvoiceType: InvoiceType | null; invoiceTypes: InvoiceType[]; invoiceCount: number };
const toRow = (d: Db, b: Booking): BookingRow => {
  const inv = invoicesOf(d, b.id);
  return { ...clone(b), remaining: b.total - b.totalPaid, latestInvoiceType: inv[0]?.type ?? null, invoiceTypes: [...new Set(inv.map((i) => i.type))], invoiceCount: inv.length };
};

export type BookingQuery = {
  search?: string;
  status?: BookingStatus[];
  crewIds?: string[];
  packageIds?: string[];
  from?: ISODate;
  to?: ISODate;
  /** Calendar & Upcoming rail hide Canceled unless the status filter includes it (US-12). */
  view?: "calendar" | "table";
  sort?: { key: "bookingDate" | "total" | "remaining" | "status"; dir: "asc" | "desc" };
  /** Table default order (no `sort`): upcoming from `today` ascending, then past bookings newest first
   *  (PRD US-7 "booking date asc from today"; Figma 02 opens on 10 Nov). */
  today?: ISODate;
  page?: number;
  pageSize?: 10 | 25 | 50;
};

const STATUS_ORDER: Record<BookingStatus, number> = { draft: 0, partially_paid: 1, paid: 2, canceled: 3 };

export function matchesSearch(b: Booking, raw: string): boolean {
  const s = raw.trim().toLowerCase();
  if (!s) return true;
  if (b.bookingName.toLowerCase().includes(s) || b.clientName.toLowerCase().includes(s) || b.ref.toLowerCase().includes(s)) return true;
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 3) {
    const phone = b.clientPhone.replace(/\D/g, ""); // 6281234567890
    const local = `0${phone.slice(2)}`; // 081234567890
    return phone.includes(digits) || local.includes(digits);
  }
  return false;
}

export function filterBookings(d: Db, q: BookingQuery): BookingRow[] {
  let rows = d.bookings.map((b) => toRow(d, b));
  if (q.view === "calendar" && !q.status?.includes("canceled")) rows = rows.filter((r) => r.status !== "canceled");
  if (q.search) rows = rows.filter((r) => matchesSearch(r, q.search!));
  if (q.status?.length) rows = rows.filter((r) => q.status!.includes(r.status));
  if (q.crewIds?.length) rows = rows.filter((r) => r.crewIds.some((c) => q.crewIds!.includes(c))); // OR within crew
  if (q.packageIds?.length) rows = rows.filter((r) => q.packageIds!.includes(r.packageId));
  // Invoice type: bookings that HAVE an invoice of a selected type (Figma 02 lists Sari & Dimas under "DP"
  // although its latest invoice is a Partial) — PRD US-8 updated to match.
  if (q.from) rows = rows.filter((r) => r.bookingDate >= q.from!);
  if (q.to) rows = rows.filter((r) => r.bookingDate <= q.to!);
  if (!q.sort && q.today) {
    const t = q.today;
    rows.sort((a, b) => {
      const ua = a.bookingDate >= t, ub = b.bookingDate >= t;
      if (ua !== ub) return ua ? -1 : 1;
      const v = a.bookingDate.localeCompare(b.bookingDate) * (ua ? 1 : -1);
      return v || a.createdAt.localeCompare(b.createdAt);
    });
    return rows;
  }
  const { key, dir } = q.sort ?? { key: "bookingDate", dir: "asc" };
  const sign = dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const v = key === "bookingDate" ? a.bookingDate.localeCompare(b.bookingDate) : key === "status" ? STATUS_ORDER[a.status] - STATUS_ORDER[b.status] : a[key] - b[key];
    return v * sign || a.createdAt.localeCompare(b.createdAt); // stable: creation time
  });
  return rows;
}

export async function listBookings(q: BookingQuery = {}) {
  return call(null, () => {
    const all = filterBookings(getDb(), q);
    const size = q.pageSize ?? 10;
    const pages = Math.max(1, Math.ceil(all.length / size));
    const page = Math.min(Math.max(1, q.page ?? 1), pages);
    return { rows: all.slice((page - 1) * size, page * size), total: all.length, page, pages, pageSize: size };
  });
}

export type BookingDetail = BookingRow & { invoices: Invoice[]; crew: Crew[]; package: Package | null };
export async function getBooking(id: string): Promise<BookingDetail | null> {
  return call(null, () => {
    const d = getDb();
    const b = d.bookings.find((x) => x.id === id || x.ref === id);
    if (!b) return null;
    return { ...toRow(d, b), invoices: clone(invoicesOf(d, b.id)), crew: clone(d.crew.filter((c) => b.crewIds.includes(c.id))), package: clone(d.packages.find((p) => p.id === b.packageId) ?? null) };
  });
}

// ── Bookings: write (save_booking) ──────────────────────────────────────────────────
export type BookingInput = {
  id?: string;
  bookingName?: string;
  clientName: string;
  clientPhone: string;
  packageId: string | null;
  bookingDate: ISODate | null;
  items: { name: string; price: number | null; qty: number | null }[];
  crewIds: string[];
  terms: string;
  /** Left out → a new booking gets the studio default, an existing one keeps its own (it can never be empty). */
  paymentInstruction?: PaymentInstruction;
};
export type BookingErrorCode = "required" | "length" | "invalid" | "archived" | "too_long" | "below_paid" | "canceled";
export type BookingErrors = Partial<Record<"clientName" | "clientPhone" | "packageId" | "bookingDate" | "terms" | "paymentInstruction" | "total" | "booking", BookingErrorCode>> & {
  items?: Record<number, Partial<Record<"name" | "price" | "qty", "required" | "invalid">>>;
  minimumTotal?: number;
};

export function validateBookingInput(d: Db, a: BookingInput): BookingErrors {
  const e: BookingErrors = {};
  const existing = a.id ? d.bookings.find((b) => b.id === a.id) : undefined;
  if (existing?.canceledAt) e.booking = "canceled";
  const name = a.clientName.trim();
  if (!name) e.clientName = "required";
  else if (name.length < LIMITS.clientNameMin || name.length > LIMITS.clientNameMax) e.clientName = "length";
  if (!a.clientPhone.trim()) e.clientPhone = "required";
  else if (!normalizePhone(a.clientPhone)) e.clientPhone = "invalid";
  const pkg = a.packageId ? d.packages.find((p) => p.id === a.packageId) : undefined;
  if (!pkg) e.packageId = "required";
  else if (!pkg.isActive && existing?.packageId !== pkg.id) e.packageId = "archived"; // §2.4 rule 13
  if (!a.bookingDate) e.bookingDate = "required";
  else if (Number.isNaN(Date.UTC(parseISODate(a.bookingDate).y, 0, 1))) e.bookingDate = "invalid";
  if (a.terms.length > LIMITS.termsMax) e.terms = "too_long";
  if (a.paymentInstruction && Object.keys(validatePayment(a.paymentInstruction)).length) e.paymentInstruction = "invalid";
  a.items.forEach((it, i) => {
    const ie: Partial<Record<"name" | "price" | "qty", "required" | "invalid">> = {};
    if (!it.name.trim()) ie.name = "required";
    if (it.price === null) ie.price = "required";
    else if (!Number.isSafeInteger(it.price) || it.price < 0) ie.price = "invalid";
    if (it.qty === null) ie.qty = "required";
    else if (!Number.isInteger(it.qty) || it.qty < LIMITS.qtyMin || it.qty > LIMITS.qtyMax) ie.qty = "invalid";
    if (Object.keys(ie).length) (e.items ??= {})[i] = ie;
  });
  if (existing && pkg && !e.items) {
    const price = existing.packageId === pkg.id ? existing.packagePriceSnapshot : pkg.price;
    const total = bookingTotal(price, a.items.map((i) => ({ name: i.name, price: i.price!, qty: i.qty! })));
    const r = validateTotalAgainstPaid(total, existing.totalPaid); // §2.4 rule 10
    if (!r.ok) {
      e.total = "below_paid";
      e.minimumTotal = r.minimum;
    }
  }
  return e;
}

export async function saveBooking(a: BookingInput) {
  return call("saveBooking", () => {
    const errors = validateBookingInput(getDb(), a);
    if (Object.keys(errors).length) return { ok: false as const, errors };
    const b = transaction((d) => saveBookingTx(d, a));
    return { ok: true as const, booking: toRow(getDb(), b) };
  });
}

function saveBookingTx(d: Db, a: BookingInput): Booking {
  const pkg = d.packages.find((p) => p.id === a.packageId)!;
  const stamp = now().toISOString();
  const existing = a.id ? d.bookings.find((b) => b.id === a.id) : undefined;
  const repick = !existing || existing.packageId !== pkg.id; // snapshot only on (re)pick — US-0
  const b: Booking = existing ?? {
    id: `bk_${Date.now().toString(36)}`,
    ref: nextNumber(d, "booking", year()),
    bookingName: "",
    clientName: "",
    clientPhone: "",
    packageId: pkg.id,
    packageNameSnapshot: pkg.name,
    packagePriceSnapshot: pkg.price,
    bookingDate: a.bookingDate!,
    terms: "",
    paymentInstruction: { ...d.settings.defaultPayment },
    items: [],
    crewIds: [],
    total: 0,
    totalPaid: 0,
    status: "draft",
    canceledAt: null,
    canceledBy: null,
    cancelReason: null,
    createdBy: ACTOR(),
    createdAt: stamp,
    updatedAt: stamp,
  };
  Object.assign(b, {
    clientName: a.clientName.trim(),
    clientPhone: normalizePhone(a.clientPhone)!,
    bookingName: a.bookingName?.trim() || `${a.clientName.trim()} · ${pkg.name}`,
    packageId: pkg.id,
    ...(repick ? { packageNameSnapshot: pkg.name, packagePriceSnapshot: pkg.price } : {}),
    bookingDate: a.bookingDate!,
    terms: a.terms,
    ...(a.paymentInstruction ? { paymentInstruction: cleanPayment(a.paymentInstruction) } : {}),
    items: a.items.map((it, i) => ({ id: `${b.id}_i${i + 1}`, name: it.name.trim(), price: it.price!, qty: it.qty! })),
    crewIds: [...new Set(a.crewIds)].filter((c) => d.crew.some((x) => x.id === c)),
    updatedAt: stamp,
  });
  if (!existing) d.bookings.push(b);
  recompute(d, b);
  if (b.total < b.totalPaid) throw new Error("below_paid"); // defence in depth (rule 10)
  return b;
}

// ── Invoices (create_invoice) ───────────────────────────────────────────────────────
export type InvoiceInput = { bookingId: string; type: InvoiceType; dp?: { method: DpMethod; value: number }; amount?: number };

/** One transaction: lock booking (single-threaded here), re-validate against the server total, number, snapshot, recompute. */
export async function createInvoice(a: InvoiceInput) {
  return saveBookingAndCreateInvoice(null, a);
}

class InvoiceRejected extends Error {
  constructor(readonly code: InvoiceError) {
    super(code);
  }
}

/**
 * Confirm in the invoice modal (PRD US-2, PLAN §5): save the booking if it's new or has unsaved edits, then create
 * the invoice — one transaction, so a failure leaves nothing behind (Bookings 23: "Nothing was saved").
 * `booking` null → the booking is already saved and unchanged; `a.bookingId` names it.
 */
export async function saveBookingAndCreateInvoice(booking: BookingInput | null, a: Omit<InvoiceInput, "bookingId"> & { bookingId?: string }) {
  return call("createInvoice", () => {
    if (booking) {
      const errors = validateBookingInput(getDb(), booking);
      if (Object.keys(errors).length) return { ok: false as const, error: "booking_invalid" as const, errors };
    } else if (!getDb().bookings.some((x) => x.id === a.bookingId)) return { ok: false as const, error: "not_found" as const };
    try {
      const { bk, inv } = transaction((db) => {
        const bk = booking ? saveBookingTx(db, booking) : db.bookings.find((x) => x.id === a.bookingId)!;
        const count = invoicesOf(db, bk.id).length;
        const v = validateInvoice({ total: bk.total, totalPaid: bk.totalPaid, invoiceCount: count, canceled: !!bk.canceledAt }, { type: a.type, dp: a.dp, amount: a.amount });
        if (!v.ok) throw new InvoiceRejected(v.error); // rolls the booking save back too
        const number = nextNumber(db, "invoice", year());
        const inv = buildInvoice(db, bk, {
          id: `inv_${number.slice(-4)}_${Date.now().toString(36)}`,
          number,
          type: a.type,
          amount: v.amount,
          issuedAt: now().toISOString(),
          dpMethod: a.type === "dp" ? a.dp!.method : null,
          dpPercentage: a.type === "dp" && a.dp!.method === "percentage" ? a.dp!.value : null,
          createdBy: ACTOR(),
        });
        db.invoices.push(inv);
        recompute(db, bk);
        return { bk, inv };
      });
      const d = getDb();
      return { ok: true as const, invoice: clone(inv), booking: toRow(d, d.bookings.find((x) => x.id === bk.id)!), invoices: clone(invoicesOf(d, bk.id)) };
    } catch (e) {
      if (e instanceof InvoiceRejected) return { ok: false as const, error: e.code };
      throw e;
    }
  });
}

export const nextInvoiceTypes = (b: { invoiceCount: number }) => allowedInvoiceTypes(b.invoiceCount);

// ── Cancel (cancel_booking, US-12) ──────────────────────────────────────────────────
export async function cancelBooking(id: string, reason: string) {
  return call("cancelBooking", () => {
    const d = getDb();
    const b = d.bookings.find((x) => x.id === id);
    if (!b) return { ok: false as const, error: "not_found" as const };
    if (b.status !== "draft" && b.status !== "partially_paid") return { ok: false as const, error: "not_allowed" as const }; // rule 12
    if (reason.length > LIMITS.cancelReasonMax) return { ok: false as const, error: "reason_too_long" as const };
    transaction((db) => {
      const bk = db.bookings.find((x) => x.id === id)!;
      Object.assign(bk, { canceledAt: now().toISOString(), canceledBy: ACTOR(), cancelReason: reason.trim() || null, updatedAt: now().toISOString() });
      recompute(db, bk);
    });
    return { ok: true as const, booking: toRow(getDb(), getDb().bookings.find((x) => x.id === id)!) };
  });
}

// ── Dashboard (KPIs, Upcoming, crew schedule) ───────────────────────────────────────
const monthOf = (iso: string) => iso.slice(0, 7);
const prevMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** KPI row (Figma 01; PRD US-12 excludes Canceled from bookings + outstanding, keeps their invoices in collected). */
export function computeKpis(d: Db, ym = monthOf(today())) {
  const live = d.bookings.filter((b) => !b.canceledAt);
  const count = (m: string) => live.filter((b) => monthOf(b.bookingDate) === m).length;
  const partial = live.filter((b) => b.status === "partially_paid");
  const collected = (m: string) => d.invoices.filter((i) => !i.voidedAt && monthOf(isoToLocalDate(i.issuedAt)) === m).reduce((s, i) => s + i.amount, 0);
  return {
    bookingsThisMonth: count(ym),
    bookingsPrevMonth: count(prevMonth(ym)),
    outstanding: partial.reduce((s, b) => s + (b.total - b.totalPaid), 0),
    outstandingCount: partial.length,
    collectedThisMonth: collected(ym),
    collectedPrevMonth: collected(prevMonth(ym)),
  };
}
export async function getKpis(ym?: string) {
  return call(null, () => computeKpis(getDb(), ym));
}

/** Upcoming rail: next 7 days from today (inclusive), Canceled hidden, sorted by date then creation. */
export async function getUpcoming(days = 7) {
  return call(null, () => filterBookings(getDb(), { view: "calendar", from: today(), to: addDays(today(), days - 1) }));
}

/** Crew schedule popover (US-9): bookings this month + upcoming from today. */
export async function getCrewSchedule(crewId: string) {
  return call(null, () => {
    const d = getDb();
    const crew = d.crew.find((c) => c.id === crewId);
    if (!crew) return null;
    const mine = filterBookings(d, { view: "calendar", crewIds: [crewId] });
    return { crew: clone(crew), monthCount: mine.filter((b) => monthOf(b.bookingDate) === monthOf(today())).length, upcoming: mine.filter((b) => b.bookingDate >= today()) };
  });
}

/** Business profile + bank details for the PDF (PRD §4.3 Settings). */
export async function getSettings() {
  return call(null, () => clone(getDb().settings));
}
