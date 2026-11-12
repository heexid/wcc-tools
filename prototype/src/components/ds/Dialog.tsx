"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { cn } from "./cn";
import { useScrollLock } from "./useScrollLock";
import { usePresence } from "./usePresence";

// Modal dialogs on a scrim (Figma Package Lib 01–06; later the invoice / cancel / guard dialogs).
// Scrim: surface/scrim at 35 %. Placement (2026-11-12): every modal is centred in the viewport; when it's taller
// than the viewport minus 80 top / bottom it starts 80 from the top and the layer scrolls.
// Focus: first field (or `initialFocus`) on open, Tab trapped inside, Esc / scrim / × close,
// focus returns to the opener. Motion: .motion-modal + scrim fade (motion.css).

// Open dialogs, topmost last — only the topmost handles Esc and the Tab trap (an archive confirm can
// open over the edit modal; Esc must close just the confirm).
const stack: object[] = [];
const isTop = (token: object) => stack[stack.length - 1] === token;

export function useFocusTrap(open: boolean, panel: React.RefObject<HTMLDivElement | null>, onClose: () => void, initialFocus?: string) {
  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => {
      const el = panel.current;
      const target = (initialFocus && el?.querySelector<HTMLElement>(initialFocus)) || el?.querySelector<HTMLElement>("input, textarea, select, button:not([data-close])");
      target?.focus({ preventScroll: true });
    });
    const onKey = (e: KeyboardEvent) => {
      if (!isTop(token)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        return onClose();
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      // Focus returns at the start of the exit (not after it). If the opener is gone (e.g. its row was
      // archived), fall back to the page's main heading so focus never drops to <body>.
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true });
    };
  }, [open, panel, onClose, initialFocus]);
}

export function Dialog({
  open,
  onClose,
  label,
  labelledBy,
  role = "dialog",
  locked,
  width,
  initialFocus,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  labelledBy?: string;
  role?: "dialog" | "alertdialog";
  /** @deprecated Placement is now the same for every modal: centred in the viewport, or 80 from the top when it's
   *  taller than the viewport allows (decision 2026-11-12, replaces the per-screen Figma offsets). Kept so callers compile. */
  top?: "form" | "invoice" | "panel" | "cancel" | "confirm" | "guard";
  /** While true, Esc / scrim don't close (a request is in flight — Bookings 22). */
  locked?: boolean;
  width: string;
  initialFocus?: string;
  className?: string;
  children: ReactNode;
}) {
  const { mounted, presence } = usePresence(open);
  const panel = useRef<HTMLDivElement>(null);
  const lockRef = useRef(locked);
  useEffect(() => {
    lockRef.current = locked;
  }, [locked]);
  const close = useCallback(() => {
    if (!lockRef.current) onClose();
  }, [onClose]);
  useFocusTrap(open, panel, close, initialFocus);
  useScrollLock(mounted); // only the layer scrolls while it's open — the screen behind stays put
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40 overflow-y-auto">
      {/* Only the panel drives unmount (onTransitionEnd); the scrim just follows data-state. */}
      <div aria-hidden data-state={presence["data-state"]} onClick={close} className="motion-scrim fixed inset-0 bg-surface-scrim opacity-35" />
      {/* Centred in the viewport; a modal taller than the viewport minus 80 top / bottom starts 80 from the top and the
          layer scrolls. The wrapper lets clicks through to the scrim; only the panel takes them. */}
      <div className="pointer-events-none relative flex min-h-full items-center justify-center py-[calc(var(--spacing-64)+var(--spacing-16))]">
        <div
          ref={panel}
          role={role}
          aria-modal="true"
          aria-label={label}
          aria-labelledby={labelledBy}
          {...presence}
          className={cn("motion-modal pointer-events-auto relative flex shrink-0 flex-col overflow-hidden rounded-card bg-surface-default shadow-floating", width, className)}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Form modal chrome (Figma "Modal · Edit package"): header surface/header, ghost × + Heading/Section title;
 *  body pad inset, gap base; footer top border, pad base/inset, gap compact, right-aligned (optional start slot). */
export function FormModal({
  open,
  onClose,
  title,
  children,
  footerStart,
  footer,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footerStart?: ReactNode;
  footer: ReactNode;
  onSubmit: () => void;
}) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} width="w-[calc(var(--spacing-64)*10)]">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col"
      >
        <header className="flex items-center gap-control bg-surface-header px-inset py-base">
          <Button variant="ghost" iconOnly icon="x" aria-label="Close" data-close onClick={onClose} />
          <h2 id={titleId} className="text-heading-section text-text-primary">
            {title}
          </h2>
        </header>
        <div className="flex flex-col gap-base p-inset">{children}</div>
        <footer className="flex items-start gap-compact border-t border-border-default px-inset py-base">
          {footerStart}
          <span className="flex-1" />
          {footer}
        </footer>
      </form>
    </Dialog>
  );
}

/** Panel modal (Figma Profile AC3 / AC5 — Change name / Change password): a surface/header frame (radius 16, pad
 *  0/6/6/6, Shadow/Floating) holding a header row (pad 14/18, gap 12: × 20 · 1×22 divider · Heading/Section title)
 *  and a white panel (radius card, hairline border): body (pad 20/24/24/24, gap 16) · footer (top border, pad 16/24,
 *  gap 8, right-aligned). Centred like every modal (see Dialog). */
export function PanelModal({
  open,
  onClose,
  title,
  width,
  locked,
  children,
  footer,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  width: string;
  locked?: boolean;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: () => void;
}) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} locked={locked} labelledBy={titleId} top="panel" width={width} className="rounded-sheet bg-surface-header px-6 pb-6">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col"
      >
        <header className="flex items-center gap-12 px-[calc(var(--spacing-16)+var(--spacing-2))] py-[calc(var(--spacing-12)+var(--spacing-2))]">
          <button type="button" aria-label="Close" data-close disabled={locked} onClick={onClose} className="flex cursor-pointer rounded-small text-text-primary outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed">
            <Icon name="x" className="size-icon-md" />
          </button>
          <span aria-hidden className="h-[calc(var(--spacing-20)+var(--spacing-2))] w-px bg-border-default" />
          <h2 id={titleId} className="text-heading-section text-text-primary">
            {title}
          </h2>
        </header>
        <div className="flex flex-col rounded-card border border-border-default bg-surface-default">
          <div className="flex flex-col gap-16 px-24 pt-20 pb-24">{children}</div>
          <footer className="flex justify-end gap-8 border-t border-border-default px-24 py-16">{footer}</footer>
        </div>
      </form>
    </Dialog>
  );
}
