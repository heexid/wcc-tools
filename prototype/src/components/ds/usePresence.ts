"use client";

import { useCallback, useEffect, useRef, useState, type TransitionEvent } from "react";

/**
 * Keeps an overlay mounted while its exit transition runs (motion.css: .motion-toast / -modal /
 * -popover). Spread `presence` on the animated element:
 *
 *   const { mounted, presence } = usePresence(open);
 *   return mounted && <ModalPanel {...presence} …/>;
 *
 * Unmounts on the element's own opacity `transitionend`, with a fallback timeout for when transitions
 * are disabled (visual tests) or the element never painted.
 */
export function usePresence(open: boolean, fallbackMs = 600) {
  const [mounted, setMounted] = useState(open);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount during render when opening (React's "adjust state on prop change" pattern).
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open || !mounted) return;
    timer.current = setTimeout(() => setMounted(false), fallbackMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, mounted, fallbackMs]);

  const onTransitionEnd = useCallback(
    (e: TransitionEvent) => {
      if (e.target !== e.currentTarget || e.propertyName !== "opacity" || open) return;
      if (timer.current) clearTimeout(timer.current);
      setMounted(false);
    },
    [open],
  );

  return { mounted, presence: { "data-state": open ? ("open" as const) : ("closed" as const), onTransitionEnd } };
}

export type Presence = ReturnType<typeof usePresence>["presence"];
