"use client";

import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { cascadeChildren, useEntrance } from "@/components/ds/useEntrance";
import { PeopleSection } from "./PeopleSection";

// Figma Crew → WC1–WC20 · mobile WM1–WM7 (SHARED-DATABASE-PLAN §9). Module page like Package library: pad section,
// gap group. Business information lives in Workspace settings (account menu), not here.

export function Crew() {
  const entering = useEntrance();
  return (
    <main data-cascade className={cn("flex flex-col gap-group px-section py-section max-tablet:flex-1 max-tablet:gap-control max-tablet:px-layout-gutter max-tablet:pt-20 max-tablet:pb-group", entering && cascadeChildren())}>
      <div className="flex flex-col gap-2 max-tablet:gap-control">
        <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
          <Txt>Crew</Txt>
        </h1>
        <p className="text-caption text-text-secondary">Everyone who works on your bookings.</p>
      </div>
      <PeopleSection />
    </main>
  );
}
