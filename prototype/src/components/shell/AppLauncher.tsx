"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ShellPopover } from "@/components/ds/Surfaces";
import { Txt } from "@/components/ds/Txt";
import { Icon } from "@/components/ds/Icon";
import { usePresence } from "@/components/ds/usePresence";
import { cn } from "@/components/ds/cn";
import { useDismiss } from "./useDismiss";
import { useLeaveGuard } from "./LeaveGuard";

// Trigger: grid icon + "Menu" label (accessible name "Menu").
// Figma: Launchpad L2 "App launcher open" + DS App launcher / Launcher tile (PRD US-11, INTERACTIONS 6.1a).
// Popover 448 (popover/launcher-width) on Shell/Popover; panel gap 28; section "Management" (Heading/Module,
// gap base) with 124×124 tiles (gap compact). Tile: pad inset, gap compact, 56 illustration, Text/Body label,
// radius card. Current: surface/accent + 2px border/accent + Shadow/Card · Available: surface/default + 1px
// border/default + Shadow/Card · Hover: surface/subtle + 1px accent/primary · Locked: surface/header, no stroke.

export type ModuleId = "booking" | "packages";

const TILES = [
  { id: "booking" as const, label: "Booking", href: "/bookings", art: "bookings" },
  { id: "packages" as const, label: "Package Lib", href: "/packages", art: "package-lib" },
  { id: "bookmark" as const, label: "Coming Soon", href: null, art: "lock", name: "Bookmark — coming soon" },
];

/** `current` is the module the page belongs to; leave it out on a standalone screen (Account settings) so no tile is current. */
export function AppLauncher({ current }: { current?: ModuleId }) {
  const [open, setOpen] = useState(false);
  const { mounted, presence } = usePresence(open);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const { navigate } = useLeaveGuard();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, { panel, trigger });

  // Focus the current module's tile (or the first tile on a standalone screen) when the launcher opens (keyboard users land inside the dialog).
  // Cancelled on close, so an Esc pressed before the frame can't have focus stolen back to a tile.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => tiles.current[Math.max(0, TILES.findIndex((t) => t.id === current))]?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open, current]);

  const choose = (t: (typeof TILES)[number]) => {
    if (!t.href) return;
    setOpen(false);
    if (t.id === current) return trigger.current?.focus(); // current tile only closes
    navigate(t.href);
  };

  const onKey = (e: KeyboardEvent) => {
    const enabled = TILES.map((t, i) => (t.href ? i : -1)).filter((i) => i >= 0);
    const at = enabled.indexOf(tiles.current.findIndex((el) => el === document.activeElement));
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step === undefined || at < 0) return;
    e.preventDefault();
    tiles.current[enabled[(at + step + enabled.length) % enabled.length]]?.focus();
  };

  return (
    <div className="relative flex">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        // Figma DS "App launcher trigger" (98:119238): a state layer 6px past each side (so the breadcrumb doesn't move),
        // radius small. Hover → surface/default · Active (pressed or open) → surface/accent + icon/label text/accent ·
        // Focus → surface/default + 1px accent/primary + Effect/Focus Ring (keyboard: instant). No press scale (read as a shake).
        className={cn(
          "relative isolate flex h-24 cursor-pointer items-center gap-tight text-text-primary outline-none",
          "transition-[color] duration-(--dur-hover) ease-(--ease-hover)",
          "before:absolute before:inset-y-0 before:-inset-x-tight before:-z-1 before:rounded-small before:border before:border-transparent before:content-['']",
          "before:transition-[background-color,border-color,box-shadow] before:duration-(--dur-hover) before:ease-(--ease-hover)",
          "hover:before:bg-surface-default",
          "focus-visible:duration-0 focus-visible:before:duration-0 focus-visible:before:bg-surface-default focus-visible:before:border-accent-primary focus-visible:before:shadow-focus-ring",
          "active:text-text-accent active:before:bg-surface-accent aria-expanded:text-text-accent aria-expanded:before:bg-surface-accent",
        )}
      >
        <Icon name="grid" className="size-icon-md" />
        {/* "Menu" label (Figma Breadcrumb › App launcher: Text/Body text/primary, gap tight) — names the module switcher. */}
        <Txt className="text-body">Menu</Txt>
      </button>
      {mounted && (
        <div
          ref={panel}
          role="dialog"
          aria-label="App launcher"
          onKeyDown={onKey}
          className="absolute top-[calc(100%+var(--spacing-12)+var(--spacing-2))] -left-[var(--spacing-8)] z-20 [--transform-origin:top_left]"
        >
          <ShellPopover presence={presence} title="App launcher" onClose={() => (setOpen(false), trigger.current?.focus())} className="w-popover-launcher-width" panelClassName="gap-[calc(var(--spacing-24)+var(--spacing-4))]">
            <section aria-labelledby="launcher-management" className="flex flex-col gap-base">
              <h3 id="launcher-management" className="flex text-heading-module text-text-primary">
                <Txt>Management</Txt>
              </h3>
              <div className="flex gap-compact">
                {TILES.map((t, i) => {
                  const isCurrent = t.id === current;
                  const locked = !t.href;
                  return (
                    <button
                      key={t.id}
                      ref={(el) => {
                        tiles.current[i] = el;
                      }}
                      type="button"
                      disabled={locked}
                      aria-disabled={locked || undefined}
                      aria-current={isCurrent ? "page" : undefined}
                      aria-label={t.name ?? t.label}
                      onClick={() => choose(t)}
                      className={cn(
                        "flex size-launcher-tile shrink-0 flex-col items-center justify-center gap-compact rounded-card p-inset outline-none",
                        "transition-[background-color,border-color,transform] duration-(--dur-hover) ease-(--ease-hover) focus-visible:shadow-focus-ring",
                        "active:scale-(--press-scale) active:duration-(--dur-press) active:ease-(--ease-out) disabled:active:scale-100",
                        locked
                          ? "cursor-not-allowed bg-surface-header"
                          : isCurrent
                            ? "cursor-pointer border-2 border-border-accent bg-surface-accent shadow-card"
                            : "cursor-pointer border border-border-default bg-surface-default shadow-card hover:border-accent-primary hover:bg-surface-subtle",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/assets/tile-${t.art}.png`} srcSet={`/assets/tile-${t.art}.png 1x, /assets/tile-${t.art}@2x.png 2x`} alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
                      <Txt className={cn("text-body", locked ? "text-text-secondary" : "text-text-primary")}>{t.label}</Txt>
                    </button>
                  );
                })}
              </div>
            </section>
          </ShellPopover>
        </div>
      )}
    </div>
  );
}
