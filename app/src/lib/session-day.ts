// Sessions end at 00:00 studio time every day (decided 2026-11-16, user). Studio time = WIB (Asia/Jakarta, UTC+7,
// no daylight saving) — the same clock the app uses for "today". Shared by the proxy, the open-tab timer and the
// tests; the database enforces the same rule in public.session_fresh() (migration 006).
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Epoch ms of the most recent 00:00 WIB at or before `now`. */
export function lastStudioMidnight(now: Date | number = Date.now()): number {
  const t = typeof now === "number" ? now : now.getTime();
  return Math.floor((t + WIB_OFFSET_MS) / DAY_MS) * DAY_MS - WIB_OFFSET_MS;
}

/** Epoch ms of the next 00:00 WIB strictly after `now`. */
export function nextStudioMidnight(now: Date | number = Date.now()): number {
  return lastStudioMidnight(now) + DAY_MS;
}

/** A session that signed in (amr timestamp, seconds) before today's 00:00 WIB is over. Unknown → not expired. */
export function sessionEndedAtMidnight(authenticatedAtSec: number | null | undefined, now: Date | number = Date.now()): boolean {
  if (!authenticatedAtSec) return false;
  return authenticatedAtSec * 1000 < lastStudioMidnight(now);
}

/** The `amr` sign-in time from an access token (already validated by getUser) — a local decode, no network. */
export function authenticatedAtFromToken(accessToken: string | null | undefined): number | null {
  const part = accessToken?.split(".")[1];
  if (!part) return null;
  try {
    const json = typeof atob === "function" ? atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")) : "";
    return authenticatedAt(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The earliest authentication time in a Supabase JWT's `amr` claim (seconds), or null. */
export function authenticatedAt(claims: { amr?: unknown } | null | undefined): number | null {
  const amr = Array.isArray(claims?.amr) ? (claims.amr as { timestamp?: unknown }[]) : [];
  const ts = amr.map((a) => a?.timestamp).filter((v): v is number => typeof v === "number");
  return ts.length ? Math.min(...ts) : null;
}
