"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ds/Button";
import { Toast, ToastRegion } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { useIsMobile } from "@/components/ds/useBreakpoint";
import { cascadeChildren, useEntrance } from "@/components/ds/useEntrance";
import { usePresence } from "@/components/ds/usePresence";
import { getBusiness } from "@/lib/data/repo";
import type { Business } from "@/lib/data/types";
import { useIsReadOnly } from "@/lib/role";
import { PeopleSection } from "./PeopleSection";
import { BusinessDetails, BusinessModal, BusinessRows } from "./BusinessInformation";

// Figma Workspace & Crew → WC1–WC3, WC5b, WC7, WC14–WC17 · mobile WM1, WM5, WM6 (SHARED-DATABASE-PLAN §9, WC-2).
// Module page like Package library: pad section, gap group. Business information card (pad inset/group, gap base):
// head + one row of details on desktop, stacked rows below 768.

export function WorkspaceCrew() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const toast = usePresence(toastOpen);
  const readOnly = useIsReadOnly();
  const mobile = useIsMobile();
  const entering = useEntrance();

  const load = useCallback(
    () =>
      getBusiness().then(
        (b) => (setBusiness(b), setFailed(false)),
        () => setFailed(true),
      ),
    [],
  );
  useEffect(() => void load(), [load]);
  useEffect(() => {
    if (!toastOpen) return;
    const t = setTimeout(() => setToastOpen(false), 4000);
    return () => clearTimeout(t);
  }, [toastOpen]);

  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  return (
    <main data-cascade className={cn("flex flex-col gap-group px-section py-section max-tablet:flex-1 max-tablet:gap-control max-tablet:px-layout-gutter max-tablet:pt-20 max-tablet:pb-group", entering && cascadeChildren())}>
      <div className="flex flex-col gap-2 max-tablet:gap-control">
        <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
          <Txt>Workspace &amp; Crew</Txt>
        </h1>
        <p className="text-caption text-text-secondary">Your business details and everyone who works on your bookings.</p>
      </div>

      <section
        aria-label="Business information"
        aria-busy={!business && !failed}
        className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default px-group py-inset max-tablet:gap-0 max-tablet:px-16 max-tablet:pb-8"
      >
        <div className="flex items-start gap-16 max-tablet:pb-12">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h2 className="flex text-heading-section text-text-primary">
              <Txt>Business information</Txt>
            </h2>
            <p className="text-caption text-text-secondary">Printed in the header of every invoice PDF.</p>
          </div>
          {business && !readOnly && (
            <Button variant="secondary" icon="pencil" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
        {business ? (
          mobile ? (
            <BusinessRows business={business} />
          ) : (
            <BusinessDetails business={business} />
          )
        ) : failed ? (
          <div role="alert" className="flex flex-col items-center gap-base py-region">
            <Icon name="wifi-off" className="size-32 text-text-tertiary" />
            <h3 className="text-center text-heading-section text-text-primary">Couldn’t load business information</h3>
            <p className="text-center text-body text-text-secondary">Check your connection and try again.</p>
            <Button variant="secondary" loading={retrying} onClick={() => void retry()}>
              Try again
            </Button>
          </div>
        ) : (
          <BusinessDetails business={null} />
        )}
      </section>

      <PeopleSection />

      {business && (
        <BusinessModal
          open={editing}
          value={business}
          onClose={() => setEditing(false)}
          onSaved={(b) => {
            setBusiness(b);
            setEditing(false);
            setToastOpen(true);
          }}
        />
      )}
      {toast.mounted && (
        <ToastRegion>
          <Toast presence={toast.presence}>Business information updated</Toast>
        </ToastRegion>
      )}
    </main>
  );
}
