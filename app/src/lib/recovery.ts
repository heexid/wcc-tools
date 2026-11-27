// A session made by a password-reset link (PASSWORD-RESET-PLAN). Supabase records how a session signed in on the
// access token's `amr` claim; a reset link gives "recovery" (older Auth versions: "otp"). Only such a session may set
// a new password without the current one, and only within RECOVERY_WINDOW_S of opening the link — so an ordinary
// signed-in session (a borrowed laptop, a stolen cookie) can't use /reset-password to skip "Current password".

/** How long a reset link's session may set the password: the link's own lifetime (mailer_otp_exp = 3600). */
export const RECOVERY_WINDOW_S = 60 * 60;
const METHODS = new Set(["recovery", "otp"]);

function claims(accessToken: string | null | undefined): { amr?: unknown } | null {
  const part = accessToken?.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
  } catch {
    return null;
  }
}

/** The access token (already validated by getUser) comes from a reset link opened in the last hour. */
export function isRecoverySession(accessToken: string | null | undefined, nowMs = Date.now()): boolean {
  const amr = claims(accessToken)?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((a: { method?: unknown; timestamp?: unknown }) => typeof a?.method === "string" && METHODS.has(a.method) && typeof a.timestamp === "number" && nowMs / 1000 - a.timestamp <= RECOVERY_WINDOW_S);
}
