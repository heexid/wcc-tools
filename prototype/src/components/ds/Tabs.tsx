"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Txt } from "./Txt";
import { cn, type ForceState } from "./cn";

// Figma: Selection & navigation → Tab (20:1416) — Active / Inactive / Hover.
// 80×52, label centred. Active: UI/Tab Active text/primary + 2px bottom stroke accent/primary
// (INSIDE, counted in layout → label sits 1px higher, as in Figma). Inactive: UI/Tab text/secondary.
// Hover: UI/Tab text/primary.

export function Tab({
  active,
  forceState,
  className,
  children,
  ...rest
}: {
  active?: boolean;
  forceState?: Extract<ForceState, "hover">;
  className?: string;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={!!active}
      tabIndex={active ? 0 : -1}
      data-force={forceState}
      className={cn(
        "inline-flex h-[calc(var(--spacing-48)+var(--spacing-4))] w-[calc(var(--spacing-64)+var(--spacing-16))] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap outline-none",
        "transition-[color] duration-(--dur-hover) ease-(--ease-hover) focus-visible:bg-surface-accent",
        active
          ? "border-b-2 border-accent-primary text-ui-tab-active text-text-primary"
          : "text-ui-tab text-text-secondary hover:text-text-primary data-[force=hover]:text-text-primary",
        className,
      )}
      {...rest}
    >
      <Txt>{children}</Txt>
    </button>
  );
}

/** Tab list with roving focus (← → Home End). */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
  tabClassName,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
  tabClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((t) => t.value === value);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const n = (next + items.length) % items.length;
    onChange(items[n].value);
    (ref.current?.children[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <div ref={ref} role="tablist" aria-label={label} onKeyDown={onKey} className={cn("flex", className)}>
      {items.map((t) => (
        <Tab key={t.value} active={t.value === value} onClick={() => onChange(t.value)} className={tabClassName}>
          {t.label}
        </Tab>
      ))}
    </div>
  );
}
