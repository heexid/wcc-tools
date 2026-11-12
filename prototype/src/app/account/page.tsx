"use client";

import { AccountSettings } from "@/components/account/AccountSettings";
import { AppShell } from "@/components/shell/AppShell";

// /account — Account settings (Figma AC2–AC7, PRD US-13). A standalone screen: breadcrumb is just its name.
export default function AccountPage() {
  return (
    <AppShell module="booking" page="Account settings" standalone>
      <AccountSettings />
    </AppShell>
  );
}
