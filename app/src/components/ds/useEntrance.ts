"use client";

import { useEffect, useState } from "react";

/**
 * Module entrance cascade (motion.css .motion-cascade / .motion-cascade-auto): true from the first render until the
 * entrance has landed (~490ms; dropped at 1s), then false — so the classes go away and later swaps, alerts and
 * re-renders never replay it. Pass `ready = false` while the page still shows its loading placeholder.
 */
export function useEntrance(ready = true) {
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    if (!ready || !entering) return;
    const t = setTimeout(() => setEntering(false), 1000);
    return () => clearTimeout(t);
  }, [ready, entering]);
  return entering;
}

/** One element at a fixed step: `cascade(i)` → "motion-cascade [--i:i]". Literal strings so Tailwind generates each --i. */
const STEPS = ["motion-cascade [--i:0]", "motion-cascade [--i:1]", "motion-cascade [--i:2]", "motion-cascade [--i:3]", "motion-cascade [--i:4]", "motion-cascade [--i:5]", "motion-cascade [--i:6]"];
export const cascade = (i: number) => STEPS[Math.min(i, STEPS.length - 1)];

/** A container whose direct children cascade in order, starting at step `base`. */
const AUTO = ["motion-cascade-auto [--base:0]", "motion-cascade-auto [--base:1]"];
export const cascadeChildren = (base: 0 | 1 = 0) => AUTO[base];
