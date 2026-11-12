"use client";

import { useEffect, type RefObject } from "react";

/**
 * Closes a popover on Esc or a pointer-down outside it (and outside its trigger), then returns focus
 * to the trigger (INTERACTIONS 6.1a / 6.6).
 */
export function useDismiss(open: boolean, close: () => void, refs: { panel: RefObject<HTMLElement | null>; trigger: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
      // The trigger ref may be a wrapper (filter menus) — focus the control inside it.
      const t = refs.trigger.current;
      (t?.matches("button, a, input, [tabindex]") ? t : t?.querySelector<HTMLElement>("button, a, input, [tabindex]"))?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (refs.panel.current?.contains(t) || refs.trigger.current?.contains(t)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close, refs.panel, refs.trigger]);
}
