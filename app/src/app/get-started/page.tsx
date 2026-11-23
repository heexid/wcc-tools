import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ds/Button";

// Placeholder for the Get started flow (Figma "Get started · Desktop 1440", GS-1 to GS-3: a setup request — CIR has no
// self sign-up). Every landing CTA lands here until that flow is built; ?plan=3-months|6-months|12-months is kept
// in the URL for it.
export const metadata: Metadata = { title: "CIR · Get started" };

export default function GetStarted() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-16 bg-surface-subtle px-layout-gutter text-center">
      <Link href="/" className="flex items-center gap-8 rounded-control">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/mascot-64.png" alt="" width={32} height={32} className="size-32" />
        <span className="text-heading-panel text-text-primary">CIR</span>
      </Link>
      <h1 className="text-marketing-heading text-text-primary">Get started</h1>
      <p className="max-w-[calc(var(--spacing-64)*6)] text-mobile-body text-text-secondary">
        This page is on its way, for now our team can set CIR up for you after a short call
      </p>
      <div className="flex gap-12">
        <ButtonLink href="/" variant="secondary" size="lg">
          Back to home
        </ButtonLink>
        <ButtonLink href="/login" size="lg">
          Log in
        </ButtonLink>
      </div>
    </main>
  );
}
