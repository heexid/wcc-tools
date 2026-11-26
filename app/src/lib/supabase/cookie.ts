// The one definition of Supabase's auth cookie (@supabase/ssr default storage key): `sb-<project ref>-auth-token`,
// chunked as .0, .1 … when large. Used by the browser guard (hasSession), the proxy and the tests.
export function authCookieName(url = process.env.NEXT_PUBLIC_SUPABASE_URL!): string {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

export function isAuthCookie(name: string, url = process.env.NEXT_PUBLIC_SUPABASE_URL!): boolean {
  const base = authCookieName(url);
  return name === base || new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.\\d+$`).test(name);
}

// Auth cookies (P10): Secure when hosted, SameSite=Lax, whole site. Not HttpOnly by design: the browser client
// (reads under RLS, P3) must read the session — the database, not the cookie flag, is the security boundary.
export const authCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NEXT_PUBLIC_APP_ENV === "staging" || process.env.NEXT_PUBLIC_APP_ENV === "production",
};

/** The account id in the session cookie (unverified: for display and cache scoping only; the server and the database
 *  check the token itself). null = signed out or unreadable. */
export function accountIdFromCookies(cookies: string, url = process.env.NEXT_PUBLIC_SUPABASE_URL!): string | null {
  const name = authCookieName(url);
  const parts = cookies
    .split("; ")
    .map((c): [string, string] => [c.slice(0, c.indexOf("=")), c.slice(c.indexOf("=") + 1)])
    .filter(([n]) => isAuthCookie(n, url));
  if (!parts.length) return null;
  const order = (n: string) => (n === name ? -1 : Number(n.slice(name.length + 1)));
  try {
    const raw = decodeURIComponent(parts.sort((a, b) => order(a[0]) - order(b[0])).map(([, v]) => v).join(""));
    const json = raw.startsWith("base64-") ? atob(raw.slice(7).replace(/-/g, "+").replace(/_/g, "/")) : raw;
    // Only the token's payload is ASCII-safe to read without decoding names: its `sub` is the account.
    const token = /"access_token":"([^"]+)"/.exec(json)?.[1];
    const sub = token && (JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: unknown }).sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}
