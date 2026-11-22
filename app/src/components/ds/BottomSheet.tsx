"use client";

import { useCallback, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { useFocusTrap } from "./Dialog";
import { cn } from "./cn";
import { useScrollLock } from "./useScrollLock";
import { usePresence } from "./usePresence";

// Figma: CIR · Design System › Pattern · Responsive › Mobile/Bottom sheet (20:7923) — the mobile replacement for
// every desktop popover and modal below 768 (R02/R03).
// Panel: surface/default, top corners radius/sheet (16), Shadow/Floating, bottom padding = safe area (34 on mobile).
// Handle area pad 8/0/4 · handle 36×4 radius 2 border/strong. Title row pad 4/16/8/16 (mobile/margin), gap control:
// Heading/Module title + 44 ghost ×. Content slot pad 8/16/16/16, gap control; it scrolls (overscroll contained).
// Scrim surface/scrim at 54 % (fill 90 % × layer 60 % in the DS pattern). At most 48 from the top (tall forms).
// Optional `actions`: a sticky Mobile/Action bar (top border, pad 12/16/safe, gap compact) under the content.
// Close: ×, scrim tap, Esc, or swipe the handle / title row down. Focus trapped, returns to the opener.

export function BottomSheet({
  open,
  onClose,
  title,
  locked,
  initialFocus,
  actions,
  className,
  contentClassName,
  role = "dialog",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** While true, scrim / Esc / swipe don't close (a request is in flight). */
  locked?: boolean;
  initialFocus?: string;
  /** Sticky action bar (tall sheets: content scrolls, actions stay). */
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  role?: "dialog" | "alertdialog";
  children: ReactNode;
}) {
  const { mounted, presence } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => {
    if (!locked) onClose();
  }, [locked, onClose]);
  useFocusTrap(open, panel, close, initialFocus);
  useScrollLock(mounted);

  // Swipe down on the handle / title row: the panel follows the finger; past 25 % of its height (or a quick flick)
  // it closes, otherwise it springs back. Transform only (composite).
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const onDown = (e: PointerEvent) => {
    if (locked || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panel.current?.style.setProperty("transition", "none");
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    const d = drag.current, el = panel.current;
    drag.current = null;
    if (!d || !el) return;
    el.style.removeProperty("transition");
    const velocity = d.dy / Math.max(1, performance.now() - d.t);
    if (d.dy > el.offsetHeight * 0.25 || velocity > 0.5) {
      el.style.removeProperty("transform");
      close();
    } else el.style.removeProperty("transform");
  };

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40">
      <div aria-hidden data-state={presence["data-state"]} onClick={close} className="motion-scrim fixed inset-0 bg-surface-scrim opacity-54" />
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        {...presence}
        className={cn(
          "motion-bottom-sheet fixed inset-x-0 bottom-0 flex max-h-[calc(100dvh-var(--spacing-48))] flex-col rounded-t-sheet bg-surface-default shadow-floating",
          !actions && "pb-(--safe-area-bottom)",
          className,
        )}
      >
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className="shrink-0 touch-none">
          <div className="flex justify-center pt-8 pb-4">
            <span aria-hidden className="h-4 w-[calc(var(--spacing-32)+var(--spacing-4))] rounded-[calc(var(--spacing-4)/2)] bg-border-strong" />
          </div>
          <div className="flex items-center gap-control px-layout-gutter pt-4 pb-8">
            <h2 id={titleId} className="min-w-0 flex-1 text-heading-module text-text-primary">
              {title}
            </h2>
            <Button variant="ghost" iconOnly icon="x" aria-label="Close" data-close disabled={locked} onClick={close} className="text-text-primary [&_svg]:size-icon-md" />
          </div>
        </div>
        <div className={cn("flex min-h-0 flex-col gap-control overflow-y-auto overscroll-contain px-layout-gutter pt-8 pb-16", contentClassName)}>{children}</div>
        {actions && <ActionBar className="shrink-0">{actions}</ActionBar>}
      </div>
    </div>,
    document.body,
  );
}

/** Figma Mobile/Action bar (20:7962): surface/default, 1px top border, pad 12/16/safe-area, gap compact; buttons are
 *  44 high and share the width (Primary last = right, the thumb zone). Sticky at the bottom of a page or a sheet. */
export function ActionBar({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex gap-compact border-t border-border-default bg-surface-default px-layout-gutter pt-12 pb-(--safe-area-bottom) *:flex-1", className)}>
      {children}
    </div>
  );
}
