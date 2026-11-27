"use server";
// Server Actions for the Supabase data source: every write, plus sign-in / sign-out / password change.
// Each runs with the caller's session (cookies). Authorization lives in the RPCs (require_admin) and RLS, so a
// direct POST to an action can do nothing the caller's role can't. Results are plain data; the client wrapper
// (./repo.ts) turns them into the prototype's return shapes or a NetworkError.
import { createHash } from "node:crypto";
import { BUSINESS_MSG, LOGO_MAX_BYTES, validateBusiness, cleanBusiness } from "@/lib/booking/business";
import { newPasswordRules, passwordRules } from "@/lib/data/shared";
import type { ResetPasswordErrors } from "@/lib/data/repo";
import { isRecoverySession } from "@/lib/recovery";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import type { Business } from "@/lib/data/types";

export type Fail = { ok: false; code: string; details?: string | null } | { ok: false; network: true };
export type Done<T> = { ok: true; data: T } | Fail;

type PgError = { code?: string; message: string; details?: string | null };

/** P0001 = a rule rejection with a stable code (migrations' raise_code); anything else is "couldn't reach". */
function fail(e: PgError): Fail {
  if (e.code === "P0001") return { ok: false, code: e.message, details: e.details ?? null };
  if (e.code === "42501") return { ok: false, code: "forbidden" };
  return { ok: false, network: true };
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<Done<T>> {
  try {
    const sb = await supabaseServer();
    // The generated Database types cover every function; the name is checked by the callers below.
    const { data, error } = await sb.rpc(fn as never, args as never);
    if (error) return fail(error);
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, network: true };
  }
}

// ── Auth & profile ──────────────────────────────────────────────────────────────────────────────
export async function loginAction(email: string, password: string): Promise<Done<null> | { ok: false; code: "invalid_credentials" | "rate_limited" }> {
  try {
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (!error) return { ok: true, data: null };
    // Too many attempts (Supabase Auth rate limit, config.toml [auth.rate_limit]). Shown as E3 until its own
    // copy is approved (P4 slice log); kept distinct here so that switch is one line.
    if (error.status === 429) return { ok: false, code: "rate_limited" };
    // Generic on purpose: never tell which half was wrong (no account enumeration, P4 / PRD §4.4).
    if (error.status && error.status < 500) return { ok: false, code: "invalid_credentials" };
    return { ok: false, network: true };
  } catch {
    return { ok: false, network: true };
  }
}

export async function logoutAction(): Promise<void> {
  try {
    const sb = await supabaseServer();
    await sb.auth.signOut({ scope: "local" });
  } catch {}
}

export async function updateDisplayNameAction(name: string) {
  return rpc<unknown>("update_display_name", { p_name: name });
}

export async function changePasswordAction(a: { current: string; next: string; confirm: string }): Promise<Done<null> | { ok: false; code: "invalid"; errors: Partial<Record<"current" | "next" | "confirm", string>> }> {
  try {
    const sb = await supabaseServer();
    const { data: user } = await sb.auth.getUser();
    if (!user.user?.email) return { ok: false, code: "forbidden" };
    const errors: Partial<Record<"current" | "next" | "confirm", string>> = {};
    // Re-verify the current password (US-13) on a throwaway client: this device's cookies and session (and its
    // sign-in time, used by the midnight rule) stay untouched; the check's own session is revoked at once.
    const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const check = await verifier.auth.signInWithPassword({ email: user.user.email, password: a.current });
    if (check.error) {
      // 429 (too many attempts) or 5xx is not "incorrect" (review P4 #5): report it like a connection problem.
      if (!check.error.status || check.error.status === 429 || check.error.status >= 500) return { ok: false, network: true };
      errors.current = "incorrect";
    } else {
      await verifier.auth.signOut({ scope: "local" }).catch(() => {});
    }
    const r = passwordRules(a.current, a.next);
    if (!r.length || !r.letterAndNumber || !r.differs) errors.next = "rules";
    if (a.next !== a.confirm) errors.confirm = "mismatch";
    if (Object.keys(errors).length) return { ok: false, code: "invalid", errors };

    const up = await sb.auth.updateUser({ password: a.next });
    if (up.error) return up.error.status && up.error.status < 500 ? { ok: false, code: "invalid", errors: { next: "rules" } } : { ok: false, network: true };
    await sb.auth.signOut({ scope: "others" }); // "other devices were logged out" (US-13)
    // Best effort: the password HAS changed by now, so a failed "Last changed" stamp must not report a failure.
    await rpc<null>("mark_password_changed", {});
    return { ok: true, data: null };
  } catch {
    return { ok: false, network: true };
  }
}

// ── Password reset (PASSWORD-RESET-PLAN) ───────────────────────────────────────────────────────────
/** Forgot password (US-PW1): asks Supabase Auth to email a reset link. The email's link is the template's
 *  {{ .SiteURL }}/auth/confirm?token_hash=…&type=recovery (supabase/email/reset-password.html), so no redirectTo.
 *  Same answer for every address — unknown accounts, rate limits, rejected addresses and Auth's own errors all read as
 *  "sent" (no account enumeration, PRD §4.4); only a request that never reached Auth is reported (FP-E3). Auth errors
 *  are logged so a broken mailer shows in the server logs. */
export async function requestPasswordResetAction(email: string): Promise<Done<null>> {
  try {
    const sb = await supabaseServer();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim());
    if (error && !error.status) return { ok: false, network: true };
    if (error && (error.status ?? 0) >= 500) console.error("password reset: Auth answered", error.status, error.code ?? error.message);
    return { ok: true, data: null };
  } catch {
    return { ok: false, network: true };
  }
}

/** Create new password (US-PW2): needs the session a reset link made in the last hour (lib/recovery.ts), checks the
 *  rules again on the server, sets the password, stamps "Last changed", then signs out every session of the account,
 *  this one included — the user logs in again with the new password. */
export async function resetPasswordAction(a: { next: string; confirm: string }): Promise<{ ok: true; data: null } | { ok: false; network: true } | { ok: false; expired: true } | { ok: false; errors: ResetPasswordErrors }> {
  try {
    const sb = await supabaseServer();
    const { data: user, error: userError } = await sb.auth.getUser();
    if (userError && (!userError.status || userError.status >= 500)) return { ok: false, network: true };
    const { data: s } = await sb.auth.getSession();
    if (!user?.user || !isRecoverySession(s.session?.access_token)) return { ok: false, expired: true };

    const errors: ResetPasswordErrors = {};
    const r = newPasswordRules(a.next);
    if (!r.length || !r.letterAndNumber) errors.next = "rules";
    if (a.next !== a.confirm) errors.confirm = "mismatch";
    if (Object.keys(errors).length) return { ok: false, errors };

    const up = await sb.auth.updateUser({ password: a.next });
    if (up.error) {
      if (up.error.code === "same_password") return { ok: false, errors: { next: "same" } };
      if (up.error.code === "weak_password") return { ok: false, errors: { next: "rules" } };
      if (up.error.status === 401 || up.error.status === 403) return { ok: false, expired: true };
      return { ok: false, network: true };
    }
    // Best effort: the password HAS changed by now, so a failed "Last changed" stamp must not report a failure.
    await rpc<null>("mark_password_changed", {});
    await sb.auth.signOut({ scope: "global" }).catch(() => {});
    return { ok: true, data: null };
  } catch {
    return { ok: false, network: true };
  }
}

// ── Business information (US-14) ────────────────────────────────────────────────────────────────
export async function updateBusinessAction(input: Business): Promise<Done<Business> | { ok: false; code: "invalid"; errors: ReturnType<typeof validateBusiness> }> {
  const errors = validateBusiness(input); // same rules as the form, re-run on the server
  if (Object.keys(errors).length) return { ok: false, code: "invalid", errors };
  const clean = cleanBusiness(input);
  try {
    const sb = await supabaseServer();
    const [current, me] = await Promise.all([sb.rpc("get_settings"), sb.rpc("my_profile")]);
    if (current.error) return fail(current.error);
    if (me.error) return fail(me.error);
    // Storage and the settings row accept a logo only under the caller's own workspace (migration 018).
    const workspaceId = (me.data as { workspaceId?: string } | null)?.workspaceId;
    if (!workspaceId) return { ok: false, code: "forbidden" };
    const currentPath = (current.data as { business?: { logo?: string | null } } | null)?.business?.logo ?? null;

    // The logo (P8): a new one arrives as the form's data URL → validated here and stored in Storage `branding/`;
    // an unchanged one arrives as the signed URL the form was showing → keep the stored path; none → cleared.
    // Unchanged (a signed URL or the "unavailable" placeholder): the logo key is left OUT of the update, so the
    // database keeps whatever it has now — a concurrent admin's new logo is never overwritten (P9 review #7).
    let logoPath: string | null | undefined = undefined;
    if (!clean.logo) logoPath = null;
    else if (clean.logo.startsWith("data:")) {
      const logo = decodeLogo(clean.logo);
      if ("error" in logo) return { ok: false, code: "invalid", errors: { logo: logo.error } };
      const path = `${workspaceId}/logo/${createHash("sha256").update(logo.bytes).digest("hex")}.${logo.ext}`;
      const up = await sb.storage.from("branding").upload(path, logo.bytes, { contentType: logo.type, upsert: true });
      if (up.error) return (up.error as { statusCode?: string }).statusCode?.startsWith("4") ? { ok: false, code: "forbidden" } : { ok: false, network: true };
      logoPath = path;
    }
    const { logo: _logo, ...fields } = clean;
    const saved = await rpc<Business>("update_business", { p: logoPath === undefined ? fields : { ...fields, logo: logoPath ?? "" } });
    // Replaced or removed logo: delete the old object (best effort; content-named, so never the new one).
    if (saved.ok && logoPath !== undefined && currentPath && currentPath !== logoPath && !currentPath.startsWith("data:")) {
      await sb.storage.from("branding").remove([currentPath]).catch(() => {});
    }
    return saved;
  } catch {
    return { ok: false, network: true };
  }
}

/** PNG / JPEG only (checked by the bytes, not the declared type), ≤ 1 MB — US-14 / migration 010. */
function decodeLogo(dataUrl: string): { bytes: Buffer; type: string; ext: "png" | "jpg" } | { error: string } {
  const m = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { error: BUSINESS_MSG.logoType };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > LOGO_MAX_BYTES) return { error: BUSINESS_MSG.logoSize };
  const png = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (m[1] === "image/png" && png) return { bytes, type: "image/png", ext: "png" };
  if (m[1] === "image/jpeg" && jpeg) return { bytes, type: "image/jpeg", ext: "jpg" };
  return { error: BUSINESS_MSG.logoType };
}

// ── Packages (US-0) ─────────────────────────────────────────────────────────────────────────────
export async function savePackageAction(input: { id?: string; name: string; price: number | null; summary?: string; description: string }) {
  return rpc<unknown>("save_package", { p: input });
}
export async function archivePackageAction(id: string) {
  return rpc<null>("archive_package", { p_id: id });
}
export async function restorePackageAction(id: string) {
  return rpc<null>("restore_package", { p_id: id });
}

// ── Bookings + invoices (save_booking, create_invoice, cancel_booking — migration 002) ──────────
export async function saveBookingAction(payload: Record<string, unknown>) {
  return rpc<unknown>("save_booking", { payload });
}
export async function createInvoiceAction(a: { bookingId: string; type: string; dp?: { method: string; value: number }; amount?: number }) {
  return rpc<unknown>("create_invoice", { booking_id: a.bookingId, type: a.type, dp_method: a.dp?.method ?? null, dp_value: a.dp?.value ?? null, amount: a.amount ?? null });
}
export async function saveBookingAndCreateInvoiceAction(booking: Record<string, unknown> | null, invoice: Record<string, unknown>) {
  return rpc<unknown>("save_booking_and_create_invoice", { booking, invoice });
}
export async function cancelBookingAction(id: string, reason: string) {
  return rpc<unknown>("cancel_booking", { booking_id: id, reason });
}
