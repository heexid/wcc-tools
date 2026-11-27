"use client";

import { useCallback, useEffect, useState } from "react";
import { SETTINGS_MAIN, SETTINGS_PAGE, SettingsCard, SettingsRow } from "@/components/account/SettingsCard";
import { Button } from "@/components/ds/Button";
import { Toast, ToastRegion } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { cascadeChildren, useEntrance } from "@/components/ds/useEntrance";
import { usePresence } from "@/components/ds/usePresence";
import { now } from "@/lib/clock";
import { getBusiness, getProfile } from "@/lib/data/repo";
import type { Business, Profile, Subscription } from "@/lib/data/types";
import { formatDate, isoToLocalDate } from "@/lib/format";
import { useIsReadOnly } from "@/lib/role";
import { BusinessModal, BusinessRows, BusinessRowsLoading } from "./BusinessInformation";

// Figma Workspace Setting → WS1–WS10 · mobile WSM1–WSM4 (opened from the account menu, flow W1–W6).
// Standalone screen with the Account settings layout (AC2): title + intro, Business information, Subscription.
// Crew see Business information without Edit (WS2). Subscription is set by the developer (migration 019) and only shown;
// once Paid until has passed the database makes the workspace read-only for everyone (WS10).

export function WorkspaceSettings() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const toast = usePresence(toastOpen);
  const readOnly = useIsReadOnly();
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
    getProfile().then(setProfile, () => {});
  }, []);
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
    <div data-cascade className={SETTINGS_PAGE}>
      <main className={cn(SETTINGS_MAIN, entering && cascadeChildren())}>
        <div className="flex flex-col gap-micro">
          <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
            <Txt>Workspace settings</Txt>
          </h1>
          <Txt className="text-body text-text-secondary max-tablet:w-auto! max-tablet:shrink max-tablet:whitespace-normal">
            {profile?.workspace ? `Business details shared by everyone in the ${profile.workspace} workspace.` : "Business details shared by everyone in your workspace."}
          </Txt>
        </div>

        <SettingsCard
          title="Business information"
          caption="Printed in the header of every invoice PDF."
          busy={!business && !failed}
          action={
            business &&
            !readOnly && (
              <Button variant="secondary" icon="pencil" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          }
        >
          {business ? (
            <BusinessRows business={business} />
          ) : failed ? (
            // Figma WS4
            <div role="alert" className="flex flex-col items-center gap-base py-region">
              <Icon name="wifi-off" className="size-32 text-text-tertiary" />
              <h3 className="text-center text-heading-section text-text-primary">Couldn’t load business information</h3>
              <p className="text-center text-body text-text-secondary">Check your connection and try again.</p>
              <Button variant="secondary" loading={retrying} onClick={() => void retry()}>
                Try again
              </Button>
            </div>
          ) : (
            <BusinessRowsLoading />
          )}
        </SettingsCard>

        {profile?.subscription && <SubscriptionCard subscription={profile.subscription} />}
      </main>

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
    </div>
  );
}

/** Subscription card (Figma WS1, WS10): Plan · Started · Paid until, each locked. Paid until carries an Active / Expired
 *  badge (Payment status badge style: dot + text). */
function SubscriptionCard({ subscription: { months, start, paidUntil } }: { subscription: Subscription }) {
  const today = isoToLocalDate(now().toISOString());
  const expired = !!paidUntil && paidUntil < today;
  return (
    <SettingsCard title="Subscription" caption="Set by bs internal tools. Contact us to renew or change it.">
      <SettingsRow label="Plan" value={months ? `${months} month${months > 1 ? "s" : ""}` : "None"} note={months ? "Length of the current subscription." : "No subscription."} locked />
      <SettingsRow label="Started" value={start ? formatDate(start) : "—"} note="First day of the subscription." locked />
      <SettingsRow
        label="Paid until"
        value={
          paidUntil ? (
            <span className="flex items-center gap-8">
              <Txt className="text-body-strong text-text-primary">{formatDate(paidUntil)}</Txt>
              <span className={cn("inline-flex h-24 shrink-0 items-center gap-micro rounded-pill py-micro pr-compact pl-tight whitespace-nowrap", expired ? "bg-surface-danger" : "bg-surface-positive")}>
                <span aria-hidden className={cn("size-6 rounded-pill", expired ? "bg-status-danger" : "bg-status-positive")} />
                <Txt className={cn("text-micro", expired ? "text-status-danger" : "text-status-positive")}>{expired ? "Expired" : "Active"}</Txt>
              </span>
            </span>
          ) : (
            "No end date"
          )
        }
        note={
          expired
            ? "The subscription has ended. Everyone can view, but nothing can be changed. Contact us to renew."
            : paidUntil
              ? "Everyone can make changes until the end of this day. After it, the workspace is view only."
              : "Everyone can make changes."
        }
        wrap
        locked
      />
    </SettingsCard>
  );
}
