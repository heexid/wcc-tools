// Route guard + session refresh (PRODUCTION-PLAN P4, INTERACTIONS 6.5; Next 16 `proxy`, Node runtime).
// An *optimistic* check, as the Next docs intend: real authorization is in the database (RLS, require_admin).
//   - Refreshes the Supabase session on every page request (getUser early, so refreshed cookies can be written).
//   - No session → /login?next=<page>; a session that existed but can't be used → /login?expired=1 (E4).
//   - Sessions end at 00:00 WIB every day: one that signed in before today's midnight is signed out (E4).
//   - Server Action POSTs are never redirected (a redirect breaks the action protocol; the RPCs enforce roles).
//   - Mock data source (local dev / tests): does nothing — the prototype's client-side guard handles it.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { authenticatedAtFromToken, sessionEndedAtMidnight } from "@/lib/session-day";
import { authCookieOptions, isAuthCookie } from "@/lib/supabase/cookie";

// "/" = marketing landing, "/get-started" = its CTA target (placeholder) — public like the login page. Password reset
// (PASSWORD-RESET-PLAN): /forgot-password, the email link /auth/confirm, and /reset-password (it checks the recovery
// session itself and shows "link expired" without one).
const PUBLIC = new Set(["/", "/login", "/get-started", "/forgot-password", "/auth/confirm", "/reset-password"]);

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") return NextResponse.next();

  // Read before the client runs: an unusable session may be cleared from the request cookies by setAll.
  const hadSession = request.cookies.getAll().some((c) => isAuthCookie(c.name));
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
        for (const [k, v] of Object.entries(headers ?? {})) response.headers.set(k, v);
      },
    },
  });

  // Must run before any response is produced (token refresh writes cookies through setAll).
  // getUser(), not getClaims(): it asks Supabase Auth, so a session revoked elsewhere ("other devices were logged
  // out", US-13) is refused on the next page load instead of when its access token expires. One auth request per
  // page navigation (P11 measures it).
  const { data, error } = await supabase.auth.getUser();
  // Auth unreachable / 5xx is not "signed out": let the page load (the database still enforces access) instead of
  // telling a valid session it expired (review P4 #3).
  if (error && (!error.status || error.status >= 500)) return response;
  let signedIn = !!data?.user?.id;
  let endedAtMidnight = false;
  const path = request.nextUrl.pathname;

  // Sessions end at 00:00 WIB (src/lib/session-day.ts; the database enforces it too, migration 006). getUser()
  // just validated the token, so read `amr` from it locally — no second auth request (review P4 #8).
  if (signedIn) {
    const { data: s } = await supabase.auth.getSession();
    if (sessionEndedAtMidnight(authenticatedAtFromToken(s.session?.access_token))) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      signedIn = false;
      endedAtMidnight = true;
    }
  }

  // Server Actions are POSTs; a GET with a spoofed next-action header still gets the guard (review P4 #2).
  const isAction = request.method === "POST" && request.headers.has("next-action");
  if (signedIn || PUBLIC.has(path) || isAction) {
    if (endedAtMidnight) clearAuthCookies(request, response); // whatever Auth's /logout answered (review P7 #10)
    return response;
  }

  // API routes answer 401 instead of a redirect to the login page (a fetch would otherwise get HTML).
  if (path.startsWith("/api/")) {
    const res = NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
    if (endedAtMidnight) clearAuthCookies(request, res);
    return res;
  }

  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  login.searchParams.set("next", safeNext(path + request.nextUrl.search));
  if (hadSession) login.searchParams.set("expired", "1");
  const redirect = NextResponse.redirect(login);
  // Carry any cookie changes (e.g. a cleared, unrefreshable session) onto the redirect.
  for (const c of response.cookies.getAll()) redirect.cookies.set(c);
  // A session ended at midnight is removed here whatever Auth's /logout answered (review P6 #7).
  if (endedAtMidnight) clearAuthCookies(request, redirect);
  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

function clearAuthCookies(request: NextRequest, response: NextResponse) {
  for (const c of request.cookies.getAll()) if (isAuthCookie(c.name)) response.cookies.delete(c.name);
}

export const config = {
  // Pages only: skip Next internals and public files (images, fonts, Figma references, icons).
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|assets/|fonts/|__figma__/|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|txt|json)$).*)"],
};
