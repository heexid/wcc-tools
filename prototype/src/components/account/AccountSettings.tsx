"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ds/Button";
import { PanelModal } from "@/components/ds/Dialog";
import { Avatar, Toast, ToastRegion } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { InputField } from "@/components/ds/InputField";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { PROFILE_EVENT } from "@/components/shell/AppShell";
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
  viewer: "Can view bookings and download invoices. Set by your workspace admin.",
} as const;

export function AccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
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
  const role = profile.role === "admin" ? "Admin" : "Viewer";
  const done = (p: Profile, text: string) => {
    setProfile(p);
    setModal(null);
    setToastState({ text, open: true });
    window.dispatchEvent(new Event(PROFILE_EVENT));
  };

  return (
    <div className="flex flex-1 flex-col items-center pt-[calc(var(--spacing-32)+var(--spacing-8))] pb-[calc(var(--spacing-64)+var(--spacing-16))]">
      <main className="flex w-[calc(var(--spacing-64)*12-var(--spacing-8))] flex-col gap-section">
        <div className="flex flex-col gap-micro">
          <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
            <Txt>Account settings</Txt>
          </h1>
          <Txt className="text-body text-text-secondary">Your profile and sign-in details for bs internal tools.</Txt>
        </div>

        <Card title="Profile" caption="How you appear to your team.">
          <div className="flex items-center gap-12 pb-16">
            <Avatar size={38} initials={initials(profile.displayName)} />
            <span className="flex flex-col">
              <Txt className="text-body-strong text-text-primary">{profile.displayName}</Txt>
              <Txt className="text-caption text-text-secondary">{`${role} · ${profile.workspace} workspace`}</Txt>
            </span>
          </div>
          <Row label="Name" value={profile.displayName} note="Shown in the header and as “Created by” on bookings.">
            <Button variant="secondary" icon="pencil" onClick={() => setModal("name")}>
              Edit name
            </Button>
          </Row>
          <Row label="Email" value={profile.email} note="Used to log in. Ask your workspace admin to change it." locked />
          <Row
            label="Role"
            value={
              <span className="flex self-start rounded-pill bg-surface-accent px-[calc(var(--spacing-12)-var(--spacing-2))] py-2 text-caption-strong text-text-accent">
                <Txt>{role}</Txt>
              </span>
            }
            note={ROLE_NOTE[profile.role]}
            locked
          />
        </Card>

        <Card title="Security" caption="Keep your account safe.">
          <Row label="Password" value="••••••••••" note={`Last changed ${profile.passwordChangedAt === today ? "today" : formatDate(profile.passwordChangedAt)}`} short>
            <Button variant="secondary" icon="lock" onClick={() => setModal("password")}>
              Change password
            </Button>
          </Row>
        </Card>
      </main>

      <ChangeNameModal open={modal === "name"} current={profile.displayName} onClose={() => setModal(null)} onSaved={(p) => done(p, "Name updated")} />
      <ChangePasswordModal
        open={modal === "password"}
        onClose={() => setModal(null)}
        onSaved={() => getProfile().then((p) => done(p, "Password updated · other devices were logged out"))}
      />
      {toastPresence.mounted && (
        <ToastRegion>
          <Toast presence={toastPresence.presence}>{toast?.text}</Toast>
        </ToastRegion>
      )}
    </div>
  );
}

function Card({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col rounded-card border border-border-default bg-surface-default px-24 pt-20 pb-8">
      <div className="flex flex-col gap-2 pb-12">
        <h2 className="flex text-heading-section text-text-primary">
          <Txt>{title}</Txt>
        </h2>
        <Txt className="text-caption text-text-secondary">{caption}</Txt>
      </div>
      {children}
    </section>
  );
}

/** `short`: the Password row's value column is 360 (the button sits at the row's end; Figma AC2). */
function Row({ label, value, note, locked, short, children }: { label: string; value: ReactNode; note: string; locked?: boolean; short?: boolean; children?: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-16 border-t border-border-default py-16">
      <span className="w-[calc(var(--spacing-64)*2+var(--spacing-32))] shrink-0 text-body text-text-secondary">{label}</span>
      <span className={cn("flex min-w-0 flex-1 flex-col gap-2", short && "max-w-[calc(var(--spacing-64)*6-var(--spacing-24))]")}>
        {typeof value === "string" ? <Txt className="text-body-strong text-text-primary">{value}</Txt> : value}
        <Txt className="text-caption text-text-tertiary">{note}</Txt>
      </span>
      {short && <span className="flex-1" />}
      {locked ? <Icon name="lock" label="Locked" className="size-icon-sm shrink-0 text-text-tertiary" /> : children}
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
            Save name
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
function ChangePasswordModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
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
    setBusy(false);
    if (!r) return setErrors({ current: "Couldn’t update. Check your connection and try again." });
    if (!r.ok) {
      return setErrors({
        current: r.errors.current ? "Current password is incorrect." : undefined,
        confirm: r.errors.confirm ? "Passwords don’t match." : undefined,
      });
    }
    onSaved();
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
            Update password
          </Button>
        </>
      }
    >
      <InputField label="Current password" required type="password" autoComplete="current-password" value={v.current} onChange={set("current")} error={errors.current} />
      <InputField label="New password" required type="password" autoComplete="new-password" value={v.next} onChange={set("next")} aria-describedby="pw-rules" />
      <ul id="pw-rules" aria-label="Password rules" className="flex flex-col gap-6">
        <Rule ok={rules.length}>At least 8 characters</Rule>
        <Rule ok={rules.letterAndNumber}>Contains a letter and a number</Rule>
        <Rule ok={rules.differs}>Different from your current password</Rule>
      </ul>
      <InputField label="Confirm new password" required type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} error={errors.confirm} />
    </PanelModal>
  );
}

/** Rule row: 14 icon (met: circle-check status/positive · unmet: circle-x text/tertiary) · Caption (gap 6). */
function Rule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className="flex items-center gap-6">
      <Icon name={ok ? "circle-check" : "circle-x"} className={cn("size-[calc(var(--spacing-12)+var(--spacing-2))]", ok ? "text-status-positive" : "text-text-tertiary")} />
      <Txt className={cn("text-caption", ok ? "text-text-secondary" : "text-text-tertiary")}>{children}</Txt>
      <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
    </li>
  );
}
