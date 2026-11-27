"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ds/Button";
import { PanelModal } from "@/components/ds/Dialog";
import { Avatar, Toast, ToastRegion } from "@/components/ds/Feedback";
import { InputField } from "@/components/ds/InputField";
import { PasswordRule } from "@/components/ds/PasswordRule";
import { Txt } from "@/components/ds/Txt";
import { cascadeChildren, useEntrance } from "@/components/ds/useEntrance";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { PROFILE_EVENT } from "@/components/shell/AppShell";
import { SETTINGS_MAIN, SETTINGS_PAGE, SettingsCard, SettingsRow } from "./SettingsCard";
import { LIMITS } from "@/lib/booking/calc";
import { now } from "@/lib/clock";
import { changePassword, getProfile, passwordRules, updateDisplayName } from "@/lib/data/repo";
import type { Profile } from "@/lib/data/types";
import { formatDate, initials, isoToLocalDate } from "@/lib/format";

// Figma Launchpad & Profile → AC2–AC7 (PRD US-13, INTERACTIONS 6.7–6.9; Profile lanes B, C).
// Page: surface/subtle; content 760 centred, pad 40 top / 80 bottom, gap section. Title Heading/Page + intro Body
// secondary (gap 4). Cards (surface/default, hairline border, radius card, pad 20/24/8/24): head (title
// Heading/Section + caption, gap 2, pad-bottom 12) · rows (pad 16/0, top border, gap 16, centred): label 160 Body
// secondary · value (Body Strong + caption tertiary, gap 2, fills) · action (Secondary button or 16 lock).

const ROLE_NOTE = {
  admin: "Full access to Booking and Package Library. Set by your workspace admin.",
  crew: "Can view bookings and download invoices. Set by your workspace admin.",
} as const;

export function AccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const entering = useEntrance(!!profile); // module entrance cascade (motion.css) — starts once the profile is in
  const [modal, setModal] = useState<null | "name" | "password">(null);
  const [toast, setToastState] = useState<{ text: string; open: boolean } | null>(null);
  const toastPresence = usePresence(!!toast?.open);
  useEffect(() => {
    getProfile().then(setProfile);
  }, []);
  useEffect(() => {
    if (!toast?.open) return;
    const t = setTimeout(() => setToastState((v) => v && { ...v, open: false }), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  if (!profile) return <div className="flex-1" aria-busy="true" />;

  const today = isoToLocalDate(now().toISOString());
  const role = profile.role === "admin" ? "Admin" : "Crew";
  const done = (p: Profile, text: string) => {
    setProfile(p);
    setModal(null);
    setToastState({ text, open: true });
    window.dispatchEvent(new Event(PROFILE_EVENT));
  };

  return (
    <div data-cascade className={SETTINGS_PAGE}>
      {/* Mobile (Figma MA1): cards full width (16 margins), gap base; rows stack label over value + action. */}
      <main className={cn(SETTINGS_MAIN, entering && cascadeChildren())}>
        <div className="flex flex-col gap-micro">
          <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
            <Txt>Account settings</Txt>
          </h1>
          <Txt className="text-body text-text-secondary max-tablet:w-auto! max-tablet:shrink max-tablet:whitespace-normal">Your profile and sign-in details for bs internal tools.</Txt>
        </div>

        <SettingsCard title="Profile" caption="How you appear to your team.">
          <div className="flex items-center gap-12 pb-16">
            <Avatar size={38} initials={initials(profile.displayName)} />
            <span className="flex flex-col">
              <Txt className="text-body-strong text-text-primary">{profile.displayName}</Txt>
              <Txt className="text-caption text-text-secondary">{`${role} · ${profile.workspace} workspace`}</Txt>
            </span>
          </div>
          <SettingsRow label="Name" value={profile.displayName} note="Shown in the header and as “Created by” on bookings.">
            <Button variant="secondary" icon="pencil" onClick={() => setModal("name")}>
              Edit name
            </Button>
          </SettingsRow>
          <SettingsRow label="Email" value={profile.email} note="Used to log in. Ask your workspace admin to change it." locked />
          <SettingsRow
            label="Role"
            value={
              <span className="flex self-start rounded-pill bg-surface-accent px-[calc(var(--spacing-12)-var(--spacing-2))] py-2 text-caption-strong text-text-accent">
                <Txt>{role}</Txt>
              </span>
            }
            note={ROLE_NOTE[profile.role === "admin" ? "admin" : "crew"]}
            locked
          />
        </SettingsCard>

        <SettingsCard title="Security" caption="Keep your account safe.">
          <SettingsRow label="Password" value="••••••••••" note={`Last changed ${profile.passwordChangedAt === today ? "today" : formatDate(profile.passwordChangedAt)}`} short>
            <Button variant="secondary" icon="lock" onClick={() => setModal("password")}>
              Change password
            </Button>
          </SettingsRow>
        </SettingsCard>
      </main>

      <ChangeNameModal open={modal === "name"} current={profile.displayName} onClose={() => setModal(null)} onSaved={(p) => done(p, "Name updated")} />
      <ChangePasswordModal
        open={modal === "password"}
        onClose={() => setModal(null)}
        onSaved={() =>
          // The password is already changed: a failed profile refresh must not hide that.
          getProfile()
            .catch(() => profile)
            .then((p) => done(p, "Password updated · other devices were logged out"))
        }
      />
      {toastPresence.mounted && (
        <ToastRegion>
          <Toast presence={toastPresence.presence}>{toast?.text}</Toast>
        </ToastRegion>
      )}
    </div>
  );
}

/** Change name (AC3 / AC3b / AC4, 6.8): Name 2–50 characters, trimmed; "Enter 2–50 characters."; Save name. */
function ChangeNameModal({ open, current, onClose, onSaved }: { open: boolean; current: string; onClose: () => void; onSaved: (p: Profile) => void }) {
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(current); // each opening starts from the saved name (Cancel / Esc / × discard)
      setError(null);
    }
  }
  const valid = (v: string) => v.trim().length >= LIMITS.displayNameMin && v.trim().length <= LIMITS.displayNameMax;
  const save = async () => {
    if (!valid(name)) return setError("Enter 2–50 characters.");
    setBusy(true);
    const r = await updateDisplayName(name).catch(() => null);
    setBusy(false);
    if (!r) return setError("Couldn’t save. Check your connection and try again.");
    if (!r.ok) return setError("Enter 2–50 characters.");
    onSaved(r.profile);
  };
  return (
    <PanelModal
      open={open}
      onClose={onClose}
      locked={busy}
      title="Change name"
      width="w-[calc(var(--spacing-64)*7+var(--spacing-32))]"
      onSubmit={save}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {busy ? "Saving…" : "Save name"}
          </Button>
        </>
      }
    >
      <InputField
        label="Name"
        required
        value={name}
        maxLength={LIMITS.displayNameMax + 10}
        onChange={(e) => {
          setName(e.target.value);
          if (error && valid(e.target.value)) setError(null);
        }}
        error={error ?? undefined}
        helper="2–50 characters. Shown in the header and as “Created by” on bookings."
      />
    </PanelModal>
  );
}

/** Change password (AC5 / AC6 / AC7, 6.9): current / new / confirm with show-hide; live rules under New password;
 *  inline errors on Update ("Current password is incorrect.", "Passwords don’t match."; unmet rules stay grey ×). */
function ChangePasswordModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const empty = { current: "", next: "", confirm: "" };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState<{ current?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setV(empty);
      setErrors({});
    }
  }
  const rules = passwordRules(v.current, v.next);
  const save = async () => {
    setBusy(true);
    const r = await changePassword(v).catch(() => null);
    if (r?.ok) await onSaved(); // stays busy until the refreshed profile closes the modal
    setBusy(false);
    if (!r) return setErrors({ current: "Couldn’t update. Check your connection and try again." });
    if (!r.ok) {
      return setErrors({
        current: r.errors.current ? "Current password is incorrect." : undefined,
        confirm: r.errors.confirm ? "Passwords don’t match." : undefined,
      });
    }
  };
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (k !== "next") setErrors((x) => ({ ...x, [k]: undefined }));
  };
  return (
    <PanelModal
      open={open}
      onClose={onClose}
      locked={busy}
      title="Change password"
      width="w-[calc(var(--spacing-64)*8+var(--spacing-8))]"
      onSubmit={save}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {busy ? "Updating…" : "Update password"}
          </Button>
        </>
      }
    >
      <InputField label="Current password" required type="password" autoComplete="current-password" value={v.current} onChange={set("current")} error={errors.current} />
      <InputField label="New password" required type="password" autoComplete="new-password" value={v.next} onChange={set("next")} aria-describedby="pw-rules" />
      <ul id="pw-rules" aria-label="Password rules" className="flex flex-col gap-6">
        <PasswordRule ok={rules.length}>At least 8 characters</PasswordRule>
        <PasswordRule ok={rules.letterAndNumber}>Contains a letter and a number</PasswordRule>
        <PasswordRule ok={rules.differs}>Different from your current password</PasswordRule>
      </ul>
      <InputField label="Confirm new password" required type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} error={errors.confirm} />
    </PanelModal>
  );
}
