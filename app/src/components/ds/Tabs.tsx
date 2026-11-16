"use client";

import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
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
          ? // Inside a TabList the border keeps its 2px (the label sits 1px higher, as in Figma) but goes transparent:
            // the list's sliding bar draws the line instead.
            "border-b-2 border-accent-primary group-data-[indicator]/tabs:border-transparent text-ui-tab-active text-text-primary"
          : "text-ui-tab text-text-secondary hover:text-text-primary data-[force=hover]:text-text-primary",
        className,
      )}
      {...rest}
    >
      <Txt>{children}</Txt>
    </button>
  );
}

/**
 * `role="tablist"` with a sliding active-tab indicator (motion.css .motion-tab-indicator): one 2px accent bar at the
 * list's bottom edge, moved to the active tab's offsetLeft / width after every render. Keyboard-driven changes move it
 * at once; pointer changes slide (state indication). The bar renders last, so `children[n]` still indexes the tabs.
 */
export function TabList({
  label,
  className,
  onKeyDown,
  children,
}: {
  label: string;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const own = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const keyboard = useRef(false);
  useLayoutEffect(() => {
    const b = bar.current;
    const tab = own.current?.querySelector<HTMLElement>(':scope > [role="tab"][aria-selected="true"]');
    if (!b) return;
    if (!tab) {
      b.style.opacity = "0";
      return;
    }
    if (keyboard.current) b.dataset.instant = "";
    else delete b.dataset.instant;
    b.style.opacity = "";
    b.style.width = `${tab.offsetWidth}px`;
    b.style.transform = `translateX(${tab.offsetLeft}px)`;
    if (!("ready" in b.dataset)) requestAnimationFrame(() => (b.dataset.ready = ""));
  });
  return (
    <div
      ref={own}
      role="tablist"
      aria-label={label}
      data-indicator=""
      onKeyDownCapture={() => (keyboard.current = true)}
      onPointerDownCapture={() => (keyboard.current = false)}
      onKeyDown={onKeyDown}
      className={cn("group/tabs relative", className)}
    >
      {children}
      <span aria-hidden ref={bar} className="motion-tab-indicator pointer-events-none absolute bottom-0 left-0 h-2 bg-accent-primary" />
    </div>
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
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = items.findIndex((t) => t.value === value);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: items.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const n = (next + items.length) % items.length;
    onChange(items[n].value);
    (e.currentTarget.children[n] as HTMLElement | undefined)?.focus();
  };
  return (
    <TabList label={label} onKeyDown={onKey} className={cn("flex", className)}>
      {items.map((t) => (
        <Tab key={t.value} active={t.value === value} onClick={() => onChange(t.value)} className={tabClassName}>
          {t.label}
        </Tab>
      ))}
    </TabList>
  );
}
