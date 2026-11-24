"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Button, ButtonLink } from "@/components/ds/Button";
import { useFocusTrap } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { usePresence } from "@/components/ds/usePresence";
import { useScrollLock } from "@/components/ds/useScrollLock";
import { NavMascot } from "./NavMascot";
import { GET_STARTED_HREF, LOGIN_HREF } from "./parts";

// Figma LP-D › Navbar (231:80486): 1368 × 58 floating bar, 16 from the top / 36 from the sides, radius 16,
// surface/default, pad 0/8/0/20. Left: logo (Asset/mascot 32 + "CIR" Heading/Panel) · 48 · links (Text/Body, gap 32).
// Right (gap 12): Log in · divider (border/strong) · Primary "Start your first booking".
// LP-T / LP-M: logo + ghost Icon/menu, which opens "LP-M · Navigation menu (open, fullscreen)" (231:83854): a
// full-screen surface/default panel that slides down from the top — logo + ghost Icon/x bar, link rows, then the
// two CTAs pinned to the bottom (safe area).
// No language selector in this build (English only).

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  // Menu rows: close first, then jump — the menu's scroll lock would otherwise swallow the scroll.
  const go = (hash: string) => {
    setOpen(false);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" }));
    history.replaceState(null, "", hash);
  };

  // Logo: already home, so scroll back up to the hero and drop any #section from the URL. Modified clicks
  // (new tab / window) keep the normal link.
  const goTop = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setOpen(false);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" }));
    history.replaceState(null, "", window.location.pathname);
  };

  return (
    <header className="sticky top-16 z-30 mt-16 px-[calc(var(--spacing-32)+var(--spacing-4))] max-desktop:px-24 max-tablet:top-12 max-tablet:mt-12 max-tablet:px-16">
      <nav
        aria-label="Main"
        data-lp-nav
        className="mx-auto flex h-[calc(var(--spacing-48)+var(--spacing-8)+var(--spacing-2))] max-w-[calc(var(--spacing-layout-page-width)-var(--spacing-64)-var(--spacing-8))] items-center justify-between rounded-sheet bg-surface-default pr-8 pl-20 max-tablet:h-mobile-header-height max-tablet:pr-6 max-tablet:pl-16"
      >
        <div className="flex items-center gap-48">
          <Link href="/" aria-label="CIR home" onClick={goTop} className="flex items-center gap-8 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
            <NavMascot intro />
            <span className="text-heading-panel text-text-primary">CIR</span>
          </Link>
          <ul className="flex items-center gap-32 max-desktop:hidden">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="lp-link text-body text-text-primary">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-12 max-desktop:hidden">
          <Link href={LOGIN_HREF} className="lp-link text-body text-text-primary">
            Log in
          </Link>
          <span aria-hidden className="h-[calc(var(--spacing-20)+var(--spacing-2))] w-px bg-border-strong" />
          <ButtonLink href={GET_STARTED_HREF}>Start your first booking</ButtonLink>
        </div>

        <Button
          variant="ghost"
          iconOnly
          icon="menu"
          aria-label="Open menu"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className="hidden max-desktop:inline-flex [&_svg]:size-icon-md"
        />
      </nav>

      <FullscreenMenu open={open} onClose={() => setOpen(false)} onGo={go} onHome={goTop} />
    </header>
  );
}

function FullscreenMenu({
  open,
  onClose,
  onGo,
  onHome,
}: {
  open: boolean;
  onClose: () => void;
  onGo: (hash: string) => void;
  onHome: (e: MouseEvent) => void;
}) {
  // The exit only moves (no fade), so there's no opacity transitionend to unmount on: unmount once the exit
  // (--dur-modal, 250ms) has run, instead of usePresence's 600ms default holding the scroll lock and focus trap.
  const { mounted, presence } = usePresence(open, 300);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panel, onClose, "[data-menu-close]");
  useScrollLock(mounted);

  // The menu only exists below desktop: widening the window past it closes the menu (and releases the lock).
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 80rem)");
    const onChange = () => mq.matches && onClose();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open, onClose]);

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      {...presence}
      className="lp-menu fixed inset-0 z-40 flex flex-col overflow-y-auto overscroll-contain bg-surface-default px-16 pt-12 pb-(--safe-area-bottom) max-desktop:px-[calc(var(--spacing-24)+var(--spacing-16))] max-tablet:px-16"
    >
      <div className="flex h-mobile-header-height shrink-0 items-center justify-between">
        <Link href="/" aria-label="CIR home" onClick={onHome} className="flex items-center gap-8 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
          {/* after the menu has slid in (--dur-modal) */}
          <NavMascot delay={320} />
          <span className="text-heading-panel text-text-primary">CIR</span>
        </Link>
        <Button variant="ghost" iconOnly icon="x" aria-label="Close menu" data-menu-close onClick={onClose} className="[&_svg]:size-icon-md" />
      </div>

      <ul className="flex flex-col pt-24">
        {LINKS.map((l) => (
          <li key={l.href} className="border-b border-border-default">
            <a
              href={l.href}
              onClick={(e) => {
                e.preventDefault();
                onGo(l.href);
              }}
              className="-mx-8 flex min-h-[calc(var(--spacing-48)+var(--spacing-4))] items-center justify-between rounded-control px-8 text-heading-section text-text-primary outline-none [-webkit-tap-highlight-color:transparent] focus-visible:bg-surface-subtle active:bg-surface-subtle"
            >
              {l.label}
              <Icon name="chevron-right" className="size-icon-md" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-12 pt-24">
        <ButtonLink href={GET_STARTED_HREF} size="lg" className="w-full">
          Start your first booking
        </ButtonLink>
        <ButtonLink href={LOGIN_HREF} variant="secondary" size="lg" className="w-full">
          Log in
        </ButtonLink>
      </div>
    </div>,
    document.body,
  );
}
