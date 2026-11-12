"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "./Dialog";
import { cn } from "./cn";
import { useScrollLock } from "./useScrollLock";
import { usePresence } from "./usePresence";

// Figma Bookings 06 / 21 / 24 / 27 — Side sheet (booking detail panel), PRD US-9, INTERACTIONS 4.3–4.4.
// Scrim surface/scrim 35 % · panel 560 wide, 8 from the top / right / bottom of the viewport, radius sheet,
// Shadow/Floating, clips; the header stays put and the body scrolls. × / scrim / Esc close; focus is trapped
// and returns to the opener. Motion: .motion-sheet (in from the right edge, out the same way).

export function SideSheet({ open, onClose, label, children, className }: { open: boolean; onClose: () => void; label: string; children: ReactNode; className?: string }) {
  const { mounted, presence } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useFocusTrap(open, panel, close, "[data-sheet-focus]");
  useScrollLock(mounted); // only the layer scrolls while it's open — the screen behind stays put
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40">
      <div aria-hidden data-state={presence["data-state"]} onClick={close} className="motion-scrim fixed inset-0 bg-surface-scrim opacity-35" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        {...presence}
        className={cn(
          "motion-sheet fixed top-8 right-8 bottom-8 flex w-[calc(var(--spacing-64)*8+var(--spacing-48))] flex-col overflow-hidden rounded-sheet bg-surface-default shadow-floating",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
