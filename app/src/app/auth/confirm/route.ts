import { NextResponse, type NextRequest } from "next/server";

// The reset email's link (PASSWORD-RESET-PLAN US-PW2; template supabase/email/reset-password.html):
// /auth/confirm?token_hash=…&type=recovery. Verifies the one-time token on the server, which writes the recovery
// session cookies, then sends the user to /reset-password. token_hash (not PKCE) so the link works on any device or
// browser, not only the one that asked for it. Only `type=recovery` is accepted, and the destination is fixed (never
// taken from the URL — no open redirect). An expired, used or malformed link → /reset-password?expired=1 (RP-X).
// Mock data source: token_hash=mock stands in for a valid link (/reset-password?token=mock).

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  // A relative Location keeps the browser on the host that served the link (the recovery cookies were set for it);
  // an absolute URL built from nextUrl can switch 127.0.0.1 ↔ localhost behind a proxy or in dev and lose them.
  const to = (search: Record<string, string>) => {
    const q = new URLSearchParams(search).toString();
    return new NextResponse(null, { status: 303, headers: { Location: `/reset-password${q ? `?${q}` : ""}`, "Cache-Control": "no-store" } });
  };
  if (!tokenHash || type !== "recovery") return to({ expired: "1" });

  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "supabase") return to(tokenHash === "mock" ? { token: "mock" } : { expired: "1" });

  const { supabaseServer } = await import("@/lib/supabase/server");
  const sb = await supabaseServer();
  const { error } = await sb.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
  return to(error ? { expired: "1" } : {});
}
