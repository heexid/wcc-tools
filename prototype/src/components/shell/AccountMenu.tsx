"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { MenuItem } from "@/components/ds/Surfaces";
import { Txt } from "@/components/ds/Txt";
import { usePresence } from "@/components/ds/usePresence";
import { initials } from "@/lib/format";
import { useDismiss } from "./useDismiss";

// Figma: Global header → Workspace selector (pill: pad 4/base/4/compact, gap 10, avatar 38, name Body Strong,
// role Caption, chevrons-up-down 16; States like Input field: Hover → 1px border/hover · Focus → 1px accent/primary + Effect/Focus Ring;
// the outline is an INSIDE stroke drawn on ::after so the pill keeps its size. No press scale: the shrink-and-back
// on click read as a shake next to the open state's outline + ring) and Profile AC1 "Account menu open" (PRD US-13, INTERACTIONS 6.6):
// popover inset, surface/header, 1px border, radius card, Shadow/Floating; panel pad compact, gap micro,
// 155px Menu items — Account Setting · Log out (danger). Right-aligned 8px under the trigger.

export function AccountMenu({ name, role, onAccount, onLogout }: { name: string; role: string; onAccount: () => void; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  // Opened from the keyboard (Enter/Space → click with detail 0) → no entrance: keyboard actions never wait on motion.
  const [instant, setInstant] = useState(false);
  const { mounted, presence } = usePresence(open);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, { panel, trigger });
  // Focus the first item on open; cancelled on close so a fast Esc keeps focus on the trigger.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    const items = [...(panel.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    items[(at + step + items.length) % items.length]?.focus();
  };
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="relative flex">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name}, ${role} — account menu`}
        onClick={(e) => {
          setInstant(e.detail === 0);
          setOpen((v) => !v);
        }}
        className="relative flex cursor-pointer items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-pill bg-surface-default py-micro pr-base pl-compact text-left outline-none transition-[box-shadow] duration-(--dur-hover) ease-(--ease-hover) focus-visible:duration-0 after:pointer-events-none after:absolute after:inset-0 after:rounded-pill after:border after:border-transparent after:transition-[border-color] after:duration-(--dur-hover) after:ease-(--ease-hover) focus-visible:after:duration-0 after:content-[''] hover:not-focus-visible:after:border-border-hover focus-visible:shadow-focus-ring focus-visible:after:border-accent-primary aria-expanded:shadow-focus-ring aria-expanded:after:border-accent-primary"
      >
        <Avatar initials={initials(name)} size={38} />
        <span className="flex flex-col">
          <Txt className="text-body-strong text-text-primary">{name}</Txt>
          <Txt className="text-caption text-text-primary">{role}</Txt>
        </span>
        <Icon name="chevrons-up-down" className="size-icon-sm text-text-secondary" />
      </button>
      {mounted && (
        <div
          ref={panel}
          {...presence}
          data-instant={instant || undefined}
          role="menu"
          aria-label="Account"
          onKeyDown={onKey}
          className="motion-popover absolute top-[calc(100%+var(--spacing-8))] right-0 z-20 flex flex-col rounded-card border border-border-default bg-surface-header p-popover-inset shadow-floating [--transform-origin:top_right]"
        >
          <div className="flex flex-col gap-micro rounded-control border border-border-default bg-surface-default p-compact">
            <MenuItem icon="settings" onClick={pick(onAccount)} className="w-[calc(var(--spacing-64)*2+var(--spacing-24)+var(--spacing-6)/2)]">
              Account Setting
            </MenuItem>
            <MenuItem icon="log-out" tone="danger" onClick={pick(onLogout)} className="w-[calc(var(--spacing-64)*2+var(--spacing-24)+var(--spacing-6)/2)]">
              Log out
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  );
}
