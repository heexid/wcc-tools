"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { LiquidBackground } from "./LiquidBackground";
import { Mascot, type MascotApi, type MascotState } from "./Mascot";

// The one card behind Login, Forgot password and Reset password (Figma: Login P1, FP1, RP1, RP-X · mobile ML1, FMP1–3).
// Lives in app/(auth)/layout.tsx, so moving between the three keeps the liquid background, the card and the mascot
// mounted: only the header title and the panel content change (no reload flash, no WebGL re-init).
// Card: 420 wide, popover/inset, surface/header, radius card, Shadow/Floating. Header (Heading/Module, pad base/group).
// Panel: surface/default + Gradient/Login Glow, 1px border, radius control, pad section/group, gap base, items centred.
// Mobile (R03, Figma ML1): the card fills the width minus 16 margins, centred between 56 top / safe-area bottom.
//
// Motion (find-animation-opportunities → better-motion; occasional surface):
// - First load: the card rises in (motion-enter); each page's content follows in a 50ms stagger (motion-stagger).
// - Route swap: the card doesn't move or re-enter. Its height is measured (ResizeObserver on the inner wrapper) and
//   animated from the old to the new height over --dur-modal on --ease-out (WAAPI on `height`, the one layout
//   property tolerated: no transform equivalent). Purpose: prevent the jarring jump of a centred card resizing.
//   Only on route changes — inline errors and notices open their own rows (motion-collapse) and must not lag behind
//   a second height animation. Reduced motion → no height animation (snaps), content fades only.

const TITLES: Record<string, string> = {
  "/login": "Login",
  "/forgot-password": "Forgot password",
  "/reset-password": "Reset password",
};

/** A CSS time token in ms — computed custom properties may come back as ".25s" or "250ms". */
const toMs = (v: string) => {
  const n = parseFloat(v);
  return v.trim().endsWith("ms") ? n : n * 1000;
};

type AuthMascot = {
  /** Sets the mascot's resting state for this screen (idle, typing, password…). */
  setState: (s: MascotState) => void;
  api: RefObject<MascotApi | null>;
};
const Ctx = createContext<AuthMascot | null>(null);
// Where a screen's snackbar renders: beside the card, never inside it (the card's entrance transform would become the
// toast's containing block and pin it to the card for the first frames).
const ToastHost = createContext<HTMLElement | null>(null);

/** Portal target for the auth screens' toasts (null until mounted on the client). */
export const useAuthToastHost = () => useContext(ToastHost);

/** The shared mascot of the auth card. Each screen drives it with its own state. */
export function useAuthMascot(state: MascotState): RefObject<MascotApi | null> {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuthMascot must be used inside AuthShell");
  const { setState, api } = ctx;
  useEffect(() => setState(state), [setState, state]);
  return api;
}

export function AuthShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [state, setState] = useState<MascotState>("idle");
  const api = useRef<MascotApi | null>(null);
  const [ctx] = useState<AuthMascot>(() => ({ setState, api }));
  const [toastHost, setToastHost] = useState<HTMLElement | null>(null);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const last = useRef(0); // the inner wrapper's height before the latest change
  const swap = useRef(0); // a route swap is pending until this time (ms): its first resize animates
  const firstPath = useRef(path);

  const grow = (from: number, to: number) => {
    const box = outer.current;
    if (
      !box ||
      !from ||
      Math.abs(from - to) < 1 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const css = getComputedStyle(document.documentElement);
    for (const a of box.getAnimations()) a.cancel();
    box.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: toMs(css.getPropertyValue("--dur-modal")) || 250,
      easing: css.getPropertyValue("--ease-out").trim() || "ease-out",
    });
  };

  // Measure the inner wrapper (never the animated box). ResizeObserver runs after layout and before paint, so the
  // box starts at the old height in the very frame the new screen appears — no flash of the new size.
  useLayoutEffect(() => {
    const el = inner.current!;
    last.current = el.offsetHeight;
    const ro = new ResizeObserver(() => {
      const h = el.offsetHeight;
      if (swap.current && performance.now() < swap.current) {
        swap.current = 0;
        grow(last.current, h);
      }
      last.current = h;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Route swap: the next screen may commit after the path changes (it suspends on search params), so arm the swap
  // and let the first resize within a second animate; if the new screen is already in, animate now.
  useLayoutEffect(() => {
    if (path === firstPath.current) return;
    firstPath.current = path;
    const h = inner.current!.offsetHeight;
    if (Math.abs(h - last.current) >= 1) {
      grow(last.current, h);
      last.current = h;
    } else swap.current = performance.now() + 1000;
  }, [path]);

  const title = TITLES[path] ?? "Login";
  return (
    <Ctx.Provider value={ctx}>
      <ToastHost.Provider value={toastHost}>
        <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface-default max-tablet:min-h-dvh max-tablet:px-layout-gutter max-tablet:pt-(--spacing-mobile-header-height) max-tablet:pb-(--safe-area-bottom)">
          {/* Page background: WebGL liquid gradient + grain (components/login/LiquidBackground). */}
          <LiquidBackground />
          <section
            aria-labelledby="auth-title"
            className="flex w-[calc(var(--spacing-64)*6+var(--spacing-32)+var(--spacing-4))] flex-col overflow-hidden max-tablet:w-full rounded-card bg-surface-header p-popover-inset shadow-floating motion-enter"
          >
            <div ref={outer} className="overflow-hidden">
              <div ref={inner} className="flex flex-col">
                <header className="flex px-group py-base">
                  <h1
                    id="auth-title"
                    className="text-heading-module text-text-primary"
                  >
                    {title}
                  </h1>
                </header>
                <div
                  data-auth-panel
                  className="flex flex-col items-center gap-base overflow-hidden rounded-control border border-border-default bg-surface-default bg-(image:--gradient-login-glow) px-group py-section"
                >
                  <Mascot state={state} apiRef={api} />
                  {children}
                </div>
              </div>
            </div>
          </section>
          <div ref={setToastHost} className="contents" />
        </main>
      </ToastHost.Provider>
    </Ctx.Provider>
  );
}
