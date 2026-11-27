import type { ReactNode } from "react";
import { AuthShell } from "@/components/login/AuthShell";

// Login, Forgot password and Reset password share one card, background and mascot (components/login/AuthShell), so
// moving between them only swaps the card's content. The route group keeps the URLs (/login, /forgot-password,
// /reset-password).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
