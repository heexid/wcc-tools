"use client";

import { useSyncExternalStore } from "react";

// Breakpoints from the CIR Breakpoint variables (R01): mobile < 768 (--breakpoint-tablet), tablet < 1280.
// Layout switches in CSS (max-tablet: / max-desktop:); use this only where the component itself differs
// (a desktop Dialog becomes a mobile BottomSheet). Server / first hydration pass = desktop.

const MOBILE = "(width < 48rem)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(MOBILE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(MOBILE).matches, () => false);
}
