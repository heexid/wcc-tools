// Runtime values shared by both data sources (mock repo.ts and supabase/repo.ts). Re-exported by repo.ts,
// so components keep importing them from "@/lib/data/repo" whichever source the build uses.
import { allowedInvoiceTypes } from "@/lib/booking/calc";

/** A call that could not reach the data source (offline, 5xx). Drives Package 06, Bookings 23 / 37, Login E6. */
export class NetworkError extends Error {
  constructor(op: string) {
    super(`Network error during ${op}`);
    this.name = "NetworkError";
  }
}

/** Change-password checklist (US-13), shared by the form and the server. */
export const passwordRules = (current: string, next: string) => ({
  length: next.length >= 8,
  letterAndNumber: /[A-Za-z]/.test(next) && /\d/.test(next),
  differs: next.length > 0 && next !== current,
});

export const nextInvoiceTypes = (b: { invoiceCount: number }) => allowedInvoiceTypes(b.invoiceCount);

/** What the booking form needs before it can open: every package (incl. archived — an edited booking keeps
 *  its own), every crew member, and the workspace defaults that prefill a new booking. */
export type Catalog = {
  packages: import("./types").Package[];
  crew: import("./types").Crew[];
  terms: string;
  payment: import("./types").PaymentInstruction;
};

/** Sync profile cache both sources expose (header, role). Notified after login / name change / logout. */
export const PROFILE_CHANGED = "data:profile";
