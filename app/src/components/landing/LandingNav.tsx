"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomSheet } from "@/components/ds/BottomSheet";
import { Button, ButtonLink } from "@/components/ds/Button";
import { Icon } from "@/components/ds/Icon";
import { GET_STARTED_HREF, LOGIN_HREF } from "./parts";

// Figma LP-D › Navbar (231:80486): 1368 × 58 floating bar, 16 from the top / 36 from the sides, radius 16,
// surface/default, pad 0/8/0/20. Left: logo (Asset/mascot 32 + "CIR" Heading/Panel) · 48 · links (Text/Body, gap 32).
// Right (gap 12): Log in · divider (border/strong) · Primary "Start your first booking".
// LP-T / LP-M: logo + ghost Icon/menu, which opens "LP-M · Navigation sheet" (DS Mobile/Bottom sheet "Menu").
// No language selector in this build (English only).

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  // Sheet rows: close first, then jump — the sheet's scroll lock would otherwise swallow the scroll.
  const go = (hash: string) => {
    setOpen(false);
    requestAnimationFrame(() => document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" }));
    history.replaceState(null, "", hash);
  };

  return (
    <header className="sticky top-16 z-30 mt-16 px-[calc(var(--spacing-32)+var(--spacing-4))] max-desktop:px-24 max-tablet:top-12 max-tablet:mt-12 max-tablet:px-16">
      <nav
        aria-label="Main"
        data-lp-nav
        className="mx-auto flex h-[calc(var(--spacing-48)+var(--spacing-8)+var(--spacing-2))] max-w-[calc(var(--spacing-layout-page-width)-var(--spacing-64)-var(--spacing-8))] items-center justify-between rounded-sheet bg-surface-default pr-8 pl-20 max-tablet:h-mobile-header-height max-tablet:pr-6 max-tablet:pl-16"
      >
        <div className="flex items-center gap-48">
          <Link href="/" aria-label="CIR home" className="flex items-center gap-8 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/mascot-64.png" alt="" width={32} height={32} className="size-32" />
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

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Menu" contentClassName="gap-0 pb-16">
        <ul className="flex flex-col">
          {LINKS.map((l) => (
            <li key={l.href} className="border-b border-border-default">
              <a
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  go(l.href);
                }}
                className="flex min-h-[calc(var(--spacing-48)+var(--spacing-4))] items-center justify-between text-heading-section text-text-primary outline-none focus-visible:bg-surface-subtle"
              >
                {l.label}
                <Icon name="chevron-right" className="size-icon-md" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-24 flex flex-col gap-12">
          <ButtonLink href={GET_STARTED_HREF} size="lg" className="w-full">
            Start your first booking
          </ButtonLink>
          <ButtonLink href={LOGIN_HREF} variant="secondary" size="lg" className="w-full">
            Log in
          </ButtonLink>
        </div>
      </BottomSheet>
    </header>
  );
}
