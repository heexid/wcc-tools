"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";

/**
 * A single-line "hug" text box measured the way Figma does (F0 finding): width =
 * ceil(glyph advance − trailing letter-spacing). Browsers keep fractional widths, so a centred or
 * hug-content label would land on a half pixel and every container around it would be up to 1px
 * narrower than the Figma component. Use it for labels inside hug/centred layouts (buttons, badges,
 * tags, tabs, avatars, pagination). Multi-line and fill-width text doesn't need it.
 */
export function Txt({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      el.style.width = "";
      const ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
      // Glyphs stay at the box's left edge — a sub-pixel sweep (F1) showed offset 0 matches Figma best.
      el.style.width = `${Math.ceil(+(el.getBoundingClientRect().width - ls).toFixed(3))}px`;
    };
    fit();
    document.fonts.ready.then(fit);
    return () => {
      alive = false;
    };
  }, [children]);
  return (
    <span ref={ref} className={cn("inline-block shrink-0 whitespace-nowrap text-left", className)}>
      {children}
    </span>
  );
}
