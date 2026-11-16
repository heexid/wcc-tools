"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";

// Leave guard (PRD US-1 / US-11, INTERACTIONS 2.1 / 2.1b / 6.1a). Every in-app navigation the shell
// offers (module link, breadcrumb, App launcher tiles, Account menu) goes through `navigate()`.
// A page with unsaved input registers a guard (F10 / F13); the guard decides whether to ask first.
// No guard registered → navigate immediately.

/** Return true to allow navigation now; or call `proceed()` later (after "Discard") and return false. */
export type Guard = (href: string, proceed: () => void) => boolean;

type Ctx = {
  navigate: (href: string) => void;
  /** Asks the page's guard first (if any), then runs `proceed` instead of navigating — Log out (6.10) shows its
   *  own confirmation after the leave guard. */
  confirmLeave: (href: string, proceed: () => void) => void;
  setGuard: (g: Guard | null) => void;
};
const LeaveGuardContext = createContext<Ctx | null>(null);

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const guard = useRef<Guard | null>(null);
  const navigate = useCallback(
    (href: string) => {
      const go = () => router.push(href);
      if (!guard.current || guard.current(href, go)) go();
    },
    [router],
  );
  const confirmLeave = useCallback((href: string, proceed: () => void) => {
    if (!guard.current || guard.current(href, proceed)) proceed();
  }, []);
  const setGuard = useCallback((g: Guard | null) => {
    guard.current = g;
  }, []);
  return <LeaveGuardContext.Provider value={{ navigate, confirmLeave, setGuard }}>{children}</LeaveGuardContext.Provider>;
}

export function useLeaveGuard(): Ctx {
  const ctx = useContext(LeaveGuardContext);
  if (!ctx) throw new Error("useLeaveGuard must be used inside <AppShell>");
  return ctx;
}
