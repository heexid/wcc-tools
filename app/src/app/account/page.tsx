"use client";

import { AccountSettings } from "@/components/account/AccountSettings";
import { AppShell } from "@/components/shell/AppShell";

// /account — Account settings (Figma AC2–AC7, PRD US-13). A standalone screen outside every module: breadcrumb is
// just its name and no App launcher tile is current.
export default function AccountPage() {
  return (
    <AppShell page="Account settings" standalone>
      <AccountSettings />
    </AppShell>
  );
}
