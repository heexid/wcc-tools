"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";
import { usePresence } from "./usePresence";

// Figma: Bookings "Tooltip" (screens 15, 28): text/primary fill, radius 6, pad 6/10, Text/Caption in
// text/inverse, no arrow, no shadow. Shown below the trigger, centred, on hover (after a short delay)
// or keyboard focus; Esc hides it. Linked with aria-describedby.
// Rendered in a portal (position: fixed) so a clipping parent — the table card, the side sheet — can't cut it
// off: 6 below the trigger, flipped above when there's no room below, kept 8 inside the viewport sideways.

let warm = 0; // timestamp of the last tooltip hide — moving between triggers shows the next one at once

// Variants (same behaviour, different surface):
//  • dark    — the Bookings "Tooltip" above.
//  • popover — Figma: "Tooltips" (62:115173), used for KPI ⓘ: Shell/Popover look — surface/header shell, pad
//    popover/inset (6), radius card, 1px border/default, Shadow/Floating; inner panel surface/default,
//    radius control, pad compact (8), 1px border/default; Text/Body in text/primary. 266 wide max (hugs short copy).
const surfaces = {
  dark: "rounded-6 bg-text-primary px-[calc(var(--spacing-12)-var(--spacing-2))] py-tight text-caption text-text-inverse",
  popover: "max-w-[calc(var(--spacing-64)*4+var(--spacing-8)+var(--spacing-2))] rounded-card border border-border-default bg-surface-header p-popover-inset shadow-floating",
};

export function Tooltip({
  content,
  children,
  className,
  variant = "dark",
}: {
  content: ReactNode;
  children: ReactElement;
  className?: string;
  variant?: keyof typeof surfaces;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false); // warm: show without the entrance
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mounted, presence } = usePresence(open, 300);
  const show = (delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    const isWarm = Date.now() - warm < 400;
    timer.current = setTimeout(() => {
      setInstant(isWarm);
      setOpen(true);
    }, isWarm ? 0 : delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    if (open) warm = Date.now();
    setOpen(false);
  };
  const wrap = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!mounted || !open) return;
    const place = () => {
      const t = wrap.current?.getBoundingClientRect();
      const el = tip.current;
      if (!t || !el) return;
      const w = el.offsetWidth, h = el.offsetHeight, gap = 6, edge = 8;
      const above = t.bottom + gap + h > window.innerHeight - edge && t.top - gap - h >= edge;
      const left = Math.min(Math.max(edge, t.left + t.width / 2 - w / 2), window.innerWidth - edge - w);
      setPos({ left, top: above ? t.top - gap - h : t.bottom + gap, above });
    };
    place();
    window.addEventListener("scroll", place, { capture: true, passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, { capture: true });
      window.removeEventListener("resize", place);
    };
  }, [mounted, open]);
  return (
    <span
      ref={wrap}
      className={cn("relative inline-flex", className)}
      onPointerEnter={() => show(400)}
      onPointerLeave={hide}
      onFocus={() => show(0)}
      onBlur={hide}
      onKeyDown={(e) => e.key === "Escape" && hide()}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            ref={tip}
            id={id}
            role="tooltip"
            {...presence}
            data-instant={instant || undefined}
            // Hidden for the one layout pass before it's measured and placed.
            style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? undefined : "hidden", ["--transform-origin" as string]: pos?.above ? "bottom" : "top" }}
            className={cn("motion-tooltip pointer-events-none fixed z-50 block w-max max-w-[calc(var(--spacing-64)*4)]", surfaces[variant])}
          >
            {variant === "popover" ? (
              <span className="block rounded-control border border-border-default bg-surface-default p-compact text-body text-text-primary">{content}</span>
            ) : (
              content
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
