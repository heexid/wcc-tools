// Supabase data source — the same contract as the mock (../repo.ts), swapped in at build time by next.config.ts
// when DATA_SOURCE=supabase. Reads: the browser client under RLS, through the SQL read functions (migrations
// 003 / 004) that return the prototype's row shapes. Writes: Server Actions → SECURITY DEFINER RPCs.
// Every function keeps the mock's signature and result shape; ./contract.check.ts makes tsc enforce it.
import type { InvoiceError } from "@/lib/booking/calc";
import { isoToLocalDate, addDays, type ISODate } from "@/lib/format";
import { now } from "@/lib/clock";
import { isAuthCookie, supabaseBrowser } from "@/lib/supabase/browser";
import type { BookingErrors, BookingInput, BookingQuery, BookingRow, BookingDetail, InvoiceInput, PackageErrors, PackageInput, PackageRow } from "../repo";
import type * as Mock from "../repo";
import { invalidateAll } from "../cache";
import { NetworkError, PROFILE_CHANGED, type Catalog } from "../shared";
import type { Business, Crew, Invoice, InvoiceSnapshot, PaymentInstruction, Person, Profile } from "../types";
import * as act from "./actions";
import { countBookingsWith, filterCatalogWith, getKpisWith, listAllBookingsWith, listPackagesWith, rpc } from "./reads";

export { NetworkError, nextInvoiceTypes, passwordRules } from "../shared";
export type * from "../repo";

const today = (): ISODate => isoToLocalDate(now().toISOString());

/** A read under RLS with this tab's client (./reads.ts maps failures to NetworkError). */
const read = <T>(op: string, fn: string, args: Record<string, unknown> = {}): Promise<T> => rpc<T>(supabaseBrowser(), op, fn, args);

/** Await a Server Action: a request that never completes (offline, dropped connection — the action call itself
 *  throws) or a `{network:true}` result → NetworkError, like the mock's failNext(); anything else returns. */
async function settled<T extends { ok: boolean }>(op: string, call: Promise<T>): Promise<Exclude<T, { network: true }>> {
  let r: T;
  try {
    r = await call;
  } catch {
    throw new NetworkError(op);
  } finally {
    invalidateAll(); // every write (and sign-in) goes through here: cached reads (../cache.ts) never outlive it
  }
  if ("network" in r && r.network) throw new NetworkError(op);
  return r as Exclude<T, { network: true }>;
}

const detailJson = <T>(d: string | null | undefined): T => (d ? (JSON.parse(d) as T) : ({} as T));

// ── Auth & profile ──────────────────────────────────────────────────────────────────────────────
const LAST_EMAIL = "data:lastEmail";
let profile: Profile | null = null;

function setProfile(p: Profile | null) {
  profile = p;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROFILE_CHANGED));
}

export const lastEmail: typeof Mock.lastEmail = () => {
  try {
    return localStorage.getItem(LAST_EMAIL) ?? "";
  } catch {
    return "";
  }
};

export const login: typeof Mock.login = async (email, password) => {
  if (!email.trim() || !password) return { ok: false as const, error: "required" as const };
  const r = await settled("login", act.loginAction(email, password));
  if (!r.ok) return { ok: false as const, error: "invalid_credentials" as const };
  try {
    localStorage.setItem(LAST_EMAIL, email.trim().toLowerCase());
  } catch {}
  await getProfile().catch(() => null);
  return { ok: true as const };
};

export const logout: typeof Mock.logout = async () => {
  invalidateAll();
  await act.logoutAction().catch(() => {});
  // Always clear this browser's session too: if the action didn't get through (offline), this still removes the
  // auth cookies, so the user is really signed out here (review P4 #4).
  await supabaseBrowser().auth.signOut({ scope: "local" }).catch(() => {});
  setProfile(null);
};

/** UI guard only (sync, like the mock): an auth cookie exists. P4's proxy enforces sessions on the server. */
export const hasSession: typeof Mock.hasSession = () => {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => isAuthCookie(c.split("=")[0]));
};

export const getProfile: typeof Mock.getProfile = async () => {
  const p = await read<Profile | null>("getProfile", "my_profile");
  if (!p) throw new NetworkError("getProfile");
  setProfile(p);
  return { ...p };
};

/** Pure read of the cache; AppShell loads it on mount (getProfile) and after sign-in. */
export const peekProfile: typeof Mock.peekProfile = () => profile;

/** No cache: the form must read the current workspace defaults (terms, payment) every time it opens. */
export const peekCatalog: typeof Mock.peekCatalog = () => null;
export const loadCatalog: typeof Mock.loadCatalog = async () => {
  const [packages, crewRes, settings] = await Promise.all([
    listPackages({}),
    supabaseBrowser().from("crew").select("id, name, role, is_active, user_id").order("created_at").order("id"),
    getSettings(),
  ]);
  if (crewRes.error) throw new NetworkError("loadCatalog");
  return {
    packages: packages.map(({ bookings: _b, ...p }) => p),
    crew: crewRes.data.map((c) => ({ id: c.id, name: c.name, role: c.role, isActive: c.is_active, userId: c.user_id })),
    terms: settings.defaultTerms,
    payment: settings.defaultPayment,
  } satisfies Catalog;
};

/** Bookings dashboard: packages + crew only — skips get_settings and the logo's Storage signing (loadCatalog). */
export const loadFilterCatalog: typeof Mock.loadFilterCatalog = () => filterCatalogWith(supabaseBrowser());

export const updateDisplayName: typeof Mock.updateDisplayName = async (name) => {
  const r = await settled("updateProfile", act.updateDisplayNameAction(name));
  if (!r.ok) return { ok: false as const, error: "length" as const };
  setProfile(r.data as Profile);
  return { ok: true as const, profile: { ...(r.data as Profile) } };
};

export const changePassword: typeof Mock.changePassword = async (a) => {
  const r = await settled("changePassword", act.changePasswordAction(a));
  if (r.ok) {
    await getProfile().catch(() => null);
    return { ok: true as const };
  }
  if ("errors" in r) return { ok: false as const, errors: r.errors };
  throw new NetworkError("changePassword");
};

// ── Packages ────────────────────────────────────────────────────────────────────────────────────
export const listPackages: typeof Mock.listPackages = (q = {}) => listPackagesWith(supabaseBrowser(), q);

export const savePackage: typeof Mock.savePackage = async (a: PackageInput) => {
  const r = await settled("savePackage", act.savePackageAction(a));
  if (r.ok) return { ok: true as const, package: r.data as PackageRow };
  if ("code" in r && r.code === "package_invalid") return { ok: false as const, errors: detailJson<PackageErrors>(r.details) };
  throw new NetworkError("savePackage");
};

export const archivePackage: typeof Mock.archivePackage = async (id) => {
  const r = await settled("savePackage", act.archivePackageAction(id));
  if (!r.ok) throw new Error("code" in r ? r.code : "not_found");
  return { ok: true as const };
};

export const restorePackage: typeof Mock.restorePackage = async (id) => {
  const r = await settled("savePackage", act.restorePackageAction(id));
  if (r.ok) return { ok: true as const };
  if ("code" in r && r.code === "duplicate") return { ok: false as const, error: "duplicate" as const };
  throw new Error("code" in r ? r.code : "not_found");
};

// ── Crew ────────────────────────────────────────────────────────────────────────────────────────
export const listCrew: typeof Mock.listCrew = async () => {
  let res;
  try {
    res = await supabaseBrowser().from("crew").select("id, name, role, is_active, user_id").eq("is_active", true).order("created_at").order("id");
  } catch {
    throw new NetworkError("listCrew");
  }
  if (res.error) throw new NetworkError("listCrew");
  return res.data.map((c): Crew => ({ id: c.id, name: c.name, role: c.role, isActive: c.is_active, userId: c.user_id }));
};

export const listPeople: typeof Mock.listPeople = () => read<Person[]>("listPeople", "list_people", { p_today: today() });

// ── Bookings: read ──────────────────────────────────────────────────────────────────────────────
export const listBookings: typeof Mock.listBookings = (q: BookingQuery = {}) =>
  read<Awaited<ReturnType<typeof Mock.listBookings>>>("listBookings", "list_bookings", { q });
export const listAllBookings: typeof Mock.listAllBookings = (q: BookingQuery = {}) => listAllBookingsWith(supabaseBrowser(), q);
export const countBookings: typeof Mock.countBookings = () => countBookingsWith(supabaseBrowser());
export const getBooking: typeof Mock.getBooking = (id) => read<BookingDetail | null>("getBooking", "get_booking", { p_id: id });

export const getKpis: typeof Mock.getKpis = (ym) => getKpisWith(supabaseBrowser(), ym ?? today().slice(0, 7));
export const getUpcoming: typeof Mock.getUpcoming = (days = 7) => listAllBookings({ view: "calendar", from: today(), to: addDays(today(), days - 1) });
export const getCrewSchedule: typeof Mock.getCrewSchedule = (crewId) =>
  read<{ crew: Crew; monthCount: number; upcoming: BookingRow[] } | null>("getCrewSchedule", "get_crew_schedule", { p_crew_id: crewId, p_today: today() });

export const getInvoiceSnapshot: typeof Mock.getInvoiceSnapshot = async (invoiceId) => {
  const s = await read<InvoiceSnapshot | null>("generatePdf", "get_invoice_snapshot", { p_id: invoiceId });
  if (!s) throw new Error(`invoice ${invoiceId} not found`);
  return s;
};

// ── Bookings: write ─────────────────────────────────────────────────────────────────────────────
/** BookingInput → the save_booking payload (same field names; ids are already uuids in this source). */
const payload = (a: BookingInput) => ({ ...a });

export const saveBooking: typeof Mock.saveBooking = async (a) => {
  const r = await settled("saveBooking", act.saveBookingAction(payload(a)));
  // The RPC returns the finished row: no second read that could fail after the commit (review P7 #5).
  if (r.ok) return { ok: true as const, booking: r.data as BookingRow };
  if ("code" in r && r.code === "booking_invalid") return { ok: false as const, errors: detailJson<BookingErrors>(r.details) };
  throw new NetworkError("saveBooking");
};

/** The invoice RPCs return { invoice, booking, invoices } in the prototype's shapes (migration 011). */
function invoiceResult(raw: unknown) {
  const { invoice, booking, invoices } = raw as { invoice: Invoice; booking: BookingRow; invoices: Invoice[] };
  // "Generated on confirm" (PLAN §8): render + store the PDF now, quietly. A failure here changes nothing —
  // the first download renders it (and shows dialog 37 if that fails too). The invoice itself is already saved.
  if (typeof window !== "undefined") void fetch(`/api/invoices/${invoice.id}/pdf`, { cache: "no-store" }).catch(() => {});
  return { ok: true as const, invoice, booking, invoices };
}

export const createInvoice: typeof Mock.createInvoice = async (a: InvoiceInput) => saveBookingAndCreateInvoice(null, a);

export const saveBookingAndCreateInvoice: typeof Mock.saveBookingAndCreateInvoice = async (booking, a) => {
  const r = await settled("createInvoice", act.saveBookingAndCreateInvoiceAction(booking ? payload(booking) : null, { ...a }));
  if (r.ok) return invoiceResult(r.data);
  if ("code" in r) {
    if (r.code === "booking_invalid") return { ok: false as const, error: "booking_invalid" as const, errors: detailJson<BookingErrors>(r.details) };
    if (r.code === "not_found") return { ok: false as const, error: "not_found" as const };
    if (r.code !== "forbidden") return { ok: false as const, error: r.code as InvoiceError };
  }
  throw new NetworkError("createInvoice");
};

export const cancelBooking: typeof Mock.cancelBooking = async (id, reason) => {
  const r = await settled("cancelBooking", act.cancelBookingAction(id, reason));
  if (r.ok) return { ok: true as const, booking: r.data as BookingRow };
  if ("code" in r && (r.code === "not_found" || r.code === "not_allowed" || r.code === "reason_too_long")) return { ok: false as const, error: r.code };
  throw new NetworkError("cancelBooking");
};

// ── Settings & business ─────────────────────────────────────────────────────────────────────────
type Settings = { defaultTerms: string; defaultPayment: PaymentInstruction; business: Business };
export const getSettings: typeof Mock.getSettings = async () => {
  const s = await read<Settings | null>("getSettings", "get_settings");
  if (!s) throw new NetworkError("getSettings");
  return { ...s, business: await withLogoUrl(s.business) };
};

/** Shown when a stored logo can't be signed right now: a blank tile, and — unlike null — NOT read as "removed"
 *  by the next business save (P9 review #1). */
export const LOGO_UNAVAILABLE = "about:blank#logo-unavailable";

/** The stored logo is a Storage path (P8); the UI gets a signed URL (1 h) in its place. Never throws: a missing
 *  object or a Storage blip shows a blank tile instead of breaking every settings read (P8 review #2). */
async function withLogoUrl(b: Business, fallback: string | null = LOGO_UNAVAILABLE): Promise<Business> {
  if (!b.logo || b.logo.startsWith("data:")) return b;
  try {
    const res = await supabaseBrowser().storage.from("branding").createSignedUrl(b.logo, 3600);
    return { ...b, logo: res.error ? fallback : res.data.signedUrl };
  } catch {
    return { ...b, logo: fallback };
  }
}
export const getBusiness: typeof Mock.getBusiness = async () => (await getSettings()).business;

export const updateBusiness: typeof Mock.updateBusiness = async (input) => {
  const r = await settled("updateBusiness", act.updateBusinessAction(input));
  // Saved: if signing the new logo fails, keep showing the image the user just picked (P8 review #1).
  if (r.ok) return { ok: true as const, business: await withLogoUrl(r.data, input.logo?.startsWith("data:") ? input.logo : null) };
  if ("errors" in r) return { ok: false as const, errors: r.errors };
  throw new NetworkError("updateBusiness");
};
