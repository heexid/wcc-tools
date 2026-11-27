import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/login/ResetPasswordForm";
import { isRecoverySession } from "@/lib/recovery";

// Figma: Login › Forgot & reset password — RP1 empty · RP2 filled · RP3 updating · RP-E1 rules / mismatch ·
// RP-E2 can't reach the server · RP-X link expired · mobile FMP2, FMP3 (PASSWORD-RESET-PLAN US-PW2).
// Reached from the email through /auth/confirm, which verified the link and left a recovery session in the cookies.
// The form shows only for a session a reset link made in the last hour; anything else (?expired=1 from
// /auth/confirm, no session, an ordinary signed-in session) shows RP-X.
// Mock data source (local dev, tests): /auth/confirm?token_hash=mock → ?token=mock stands in for the session.
// The check reads request-time data (cookies, search params), so it streams inside <Suspense> (Cache Components);
// until it resolves the card shows only the mascot.

type Search = Promise<Record<string, string | string[] | undefined>>;

export default function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense>
      <Checked searchParams={searchParams} />
    </Suspense>
  );
}

async function Checked({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  let valid = false;
  if (q.expired !== "1") {
    if (process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase") {
      const { supabaseServer } = await import("@/lib/supabase/server");
      const sb = await supabaseServer();
      const { data } = await sb.auth.getUser();
      const { data: s } = await sb.auth.getSession();
      valid = !!data.user && isRecoverySession(s.session?.access_token);
    } else {
      valid = q.token === "mock";
    }
  }
  return <ResetPasswordForm valid={valid} />;
}
