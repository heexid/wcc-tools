"use client";

import { AppShell } from "@/components/shell/AppShell";
import { WorkspaceSettings } from "@/components/workspace/WorkspaceSettings";

// /workspace-settings — Workspace settings (Figma Workspace Setting → WS1). A standalone screen opened from the account
// menu, like Account settings: breadcrumb is just its name and no App launcher tile is current.
export default function WorkspaceSettingsPage() {
  return (
    <AppShell page="Workspace settings" standalone>
      <WorkspaceSettings />
    </AppShell>
  );
}
