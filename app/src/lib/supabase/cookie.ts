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
