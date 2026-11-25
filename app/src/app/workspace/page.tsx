"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { WorkspaceCrew } from "@/components/workspace/WorkspaceCrew";

// /workspace — Workspace & Crew (Figma WC1, SHARED-DATABASE-PLAN §9).
export default function WorkspacePage() {
  return (
    <AppShell module="workspace">
      <Suspense>
        <WorkspaceCrew />
      </Suspense>
    </AppShell>
  );
}
