// `?next=` after login (INTERACTIONS 6.5) must stay on this site: only an absolute path on our own origin.
// Rejects https://…, //evil.example, /\evil.example and anything with a scheme or control characters —
// otherwise the login page is an open redirect.
const FALLBACK = "/bookings";

export function safeNext(raw: string | null | undefined, fallback = FALLBACK): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  try {
    const u = new URL(raw, "http://same.origin");
    if (u.origin !== "http://same.origin") return fallback;
    if (u.pathname === "/login") return fallback; // never loop back to the login page
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}
