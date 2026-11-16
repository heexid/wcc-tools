"use client";

import { useLayoutEffect } from "react";

// Page scroll lock for modal layers (Side sheet, Dialog): while one is open, wheel / touch / keyboard scrolling
// only moves the layer, never the screen behind it. Ref-counted so stacked layers (sheet → confirm dialog) keep
// the lock until the last one closes. The scrollbar's width is padded back so the page doesn't shift sideways
// (0 with overlay scrollbars).

let locks = 0;
let saved: { overflow: string; paddingRight: string; overscroll: string } | null = null;

export function useScrollLock(active: boolean) {
  useLayoutEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    if (locks++ === 0) {
      const bar = window.innerWidth - html.clientWidth;
      saved = { overflow: html.style.overflow, paddingRight: html.style.paddingRight, overscroll: html.style.overscrollBehavior };
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      if (bar > 0) html.style.paddingRight = `${bar}px`;
    }
    return () => {
      if (--locks === 0 && saved) {
        html.style.overflow = saved.overflow;
        html.style.paddingRight = saved.paddingRight;
        html.style.overscrollBehavior = saved.overscroll;
        saved = null;
      }
    };
  }, [active]);
}
