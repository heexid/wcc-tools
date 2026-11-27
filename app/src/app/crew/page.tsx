"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { Crew } from "@/components/workspace/Crew";

// /crew — Crew module (Figma Crew → WC1, SHARED-DATABASE-PLAN §9).
export default function CrewPage() {
  return (
    <AppShell module="crew">
      <Suspense>
        <Crew />
      </Suspense>
    </AppShell>
  );
}
