"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ds/Button";
import { AppShell } from "@/components/shell/AppShell";
import { useLeaveGuard } from "@/components/shell/LeaveGuard";

// Dev page proving the leave-guard plumbing (F4). F10 / F13 register the real "Discard …?" dialogs.
function Body() {
  const { setGuard } = useLeaveGuard();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<null | { href: string; proceed: () => void }>(null);
  useEffect(() => {
    setGuard(dirty ? (href, proceed) => (setPending({ href, proceed }), false) : null);
    return () => setGuard(null);
  }, [dirty, setGuard]);
  return (
    <main className="flex flex-col items-start gap-base p-section text-body">
      <h1 className="text-heading-page" data-testid="page-title">Shell playground</h1>
      <label className="flex items-center gap-compact">
        <input type="checkbox" checked={dirty} onChange={(e) => setDirty(e.target.checked)} /> Simulate unsaved changes
      </label>
      {pending && (
        <div role="alertdialog" aria-label="Leave this page?" className="flex items-center gap-compact rounded-control border border-border-default p-control">
          <span>Leave for {pending.href}?</span>
          <Button variant="secondary" onClick={() => setPending(null)}>Stay</Button>
          <Button onClick={() => (setPending(null), setDirty(false), pending.proceed())}>Leave</Button>
        </div>
      )}
    </main>
  );
}

export default function ShellPlayground() {
  return (
    <AppShell module="booking" page="Shell playground">
      <Body />
    </AppShell>
  );
}
