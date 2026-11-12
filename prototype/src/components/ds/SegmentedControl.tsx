"use client";

import type { ReactNode } from "react";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Booking components → Segmented control (26:4866) — Selected First / Second.
// Track: surface/header, radius control, pad 3, gap 2, h 40. Options fill equally, h 32,
// pad tight/base, radius 6. Selected: surface/default + Shadow/Card, UI/Tab Active text/primary;
// unselected: UI/Tab text/secondary. Used for DP / Full price and Partial / Paid (PRD US-2, US-5).
// Motion: the selected surface slides between options (state indication, occasional use).

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [{ value: T; label: ReactNode }, { value: T; label: ReactNode }];
  label: string;
  className?: string;
}) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative grid h-[calc(var(--spacing-32)+var(--spacing-8))] grid-cols-2 gap-2 rounded-control bg-surface-header p-[calc(var(--spacing-6)/2)]",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          onChange(options[index === 0 ? 1 : 0].value);
        }
      }}
    >
      {/* selected surface — one element that moves, so the change reads as a slide */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-[calc(var(--spacing-6)/2)] left-[calc(var(--spacing-6)/2)] h-control-height w-[calc((100%-var(--spacing-6)-var(--spacing-2))/2)] rounded-6 bg-surface-default shadow-card",
          "transition-transform duration-(--dur-indicator) ease-(--ease-in-out)",
          index === 1 && "translate-x-[calc(100%+var(--spacing-2))]",
        )}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative flex h-control-height cursor-pointer items-center justify-center rounded-6 px-base py-tight whitespace-nowrap outline-none",
            "transition-[color] duration-(--dur-indicator) ease-(--ease-in-out) focus-visible:shadow-focus-ring",
            i === index ? "text-ui-tab-active text-text-primary" : "text-ui-tab text-text-secondary hover:text-text-primary",
          )}
        >
          <Txt>{o.label}</Txt>
        </button>
      ))}
    </div>
  );
}
