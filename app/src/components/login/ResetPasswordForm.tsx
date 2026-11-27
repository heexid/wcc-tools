"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ds/Button";
import { Alert } from "@/components/ds/Feedback";
import { InputField } from "@/components/ds/InputField";
import { PasswordRule } from "@/components/ds/PasswordRule";
import { Txt } from "@/components/ds/Txt";
import { useAuthMascot } from "@/components/login/AuthShell";
import type { MascotState } from "@/components/login/Mascot";
import { NetworkError, newPasswordRules, resetPassword, type ResetPasswordErrors } from "@/lib/data/repo";

// Create new password (Figma RP1–RP3, RP-E1, RP-E2) and Link expired (RP-X). See app/(auth)/reset-password/page.tsx.
// Live rules under New password (the Change password checklist minus "different from current"); on Update, unmet
// rules stay grey ×, New password and Confirm show their errors, the first wrong field takes focus and the mascot
// shakes. Success → every session is signed out → Login with "Password updated. Log in with your new password" (L-S2).

const NEXT_MSG: Record<NonNullable<ResetPasswordErrors["next"]>, string> = {
  rules: "Use a password that meets both rules",
  same: "Use a password you haven’t used for CIR before",
};

/** A password input, or its Show / Hide button (which counts as the field, as on Login). */
const isPasswordField = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const input = el instanceof HTMLInputElement ? el : el.parentElement?.querySelector("input");
  return input?.name === "next" || input?.name === "confirm";
};

export function ResetPasswordForm({ valid }: { valid: boolean }) {
  const [expired, setExpired] = useState(!valid);
  return expired ? <LinkExpired /> : <CreatePassword onExpired={() => setExpired(true)} />;
}

function CreatePassword({ onExpired }: { onExpired: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({ next: "", confirm: "" });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [network, setNetwork] = useState(false);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [mood, setMood] = useState<"error" | "success" | null>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (mood !== "error") return;
    const t = setTimeout(() => setMood(null), 1600);
    return () => clearTimeout(t);
  }, [mood]);
  const state: MascotState = pending ? "loading" : (mood ?? (focused ? (revealed ? "peek" : "password") : "idle"));
  const mascot = useAuthMascot(state);
  const flashError = () => {
    if (mood === "error") mascot.current?.react("shake");
    setMood("error");
  };
  const rules = newPasswordRules(v.next);
  const field = (name: "next" | "confirm") => form.current?.elements.namedItem(name) as HTMLInputElement | null;

  const show = (e: ResetPasswordErrors) => {
    setErrors(e);
    flashError();
    field(e.next ? "next" : "confirm")?.focus();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: ResetPasswordErrors = {};
    if (!rules.length || !rules.letterAndNumber) local.next = "rules";
    if (v.next !== v.confirm) local.confirm = "mismatch";
    if (local.next || local.confirm) return show(local);
    setPending(true);
    try {
      const r = await resetPassword(v);
      if (r.ok) {
        setMood("success");
        router.replace("/login?reset=1");
        return; // stay in "Updating…" until Login takes over
      }
      setPending(false);
      if ("expired" in r) return onExpired();
      show(r.errors);
    } catch (err) {
      if (!(err instanceof NetworkError)) throw err;
      setNetwork(true);
      flashError();
      setPending(false);
    }
  }

  const set = (k: "next" | "confirm") => (e: React.ChangeEvent<HTMLInputElement>) => {
    mascot.current?.keystroke();
    setV((s) => ({ ...s, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <form
      ref={form}
      noValidate
      onSubmit={submit}
      onFocus={(e) => setFocused(isPasswordField(e.target))}
      onBlur={(e) => setFocused(isPasswordField(e.relatedTarget))}
      className="flex w-full flex-col items-center gap-base motion-stagger"
    >
      <div className="flex w-[calc(var(--spacing-64)*4+var(--spacing-32)+var(--spacing-12))] flex-col items-center gap-micro">
        <h2 className="text-heading-panel text-text-primary">
          <Txt>Create a new password</Txt>
        </h2>
        <p className="text-center text-body text-text-secondary">Pick one you don’t use anywhere else</p>
      </div>
      {network && (
        <div className="motion-collapse -mt-base w-full">
          <div className="min-h-0 overflow-hidden">
            <div className="pt-base">
              <Alert tone="warning" title="Can't connect to CIR" className="motion-notice">
                Check your internet connection and try again.
              </Alert>
            </div>
          </div>
        </div>
      )}
      <div className="flex w-full flex-col gap-base">
        <InputField
          label="New password"
          required
          name="next"
          type="password"
          autoComplete="new-password"
          placeholder="Enter new password"
          value={v.next}
          disabled={pending}
          error={errors.next ? NEXT_MSG[errors.next] : undefined}
          aria-describedby="pw-rules"
          onRevealChange={setRevealed}
          onChange={set("next")}
        />
        <ul id="pw-rules" aria-label="Password rules" className="flex flex-col gap-6">
          <PasswordRule ok={rules.length}>At least 8 characters</PasswordRule>
          <PasswordRule ok={rules.letterAndNumber}>Contains a letter and a number</PasswordRule>
        </ul>
      </div>
      <InputField
        label="Confirm new password"
        required
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="Enter it again"
        value={v.confirm}
        disabled={pending}
        error={errors.confirm ? "Passwords don’t match." : undefined}
        onRevealChange={setRevealed}
        onChange={set("confirm")}
      />
      <div className="flex w-full">
        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Updating…" : network ? "Try again" : "Update password"}
        </Button>
      </div>
    </form>
  );
}

function LinkExpired() {
  const router = useRouter();
  useAuthMascot("idle");
  return (
    <div className="flex w-full flex-col items-center gap-base motion-stagger">
      <div className="flex w-[calc(var(--spacing-64)*4+var(--spacing-32)+var(--spacing-12))] flex-col items-center gap-micro">
        <h2 className="text-heading-panel text-text-primary">
          <Txt>This link has expired</Txt>
        </h2>
        <p className="text-center text-body text-text-secondary">Reset links work once and expire after 1 hour. Ask for a new one.</p>
      </div>
      <div className="flex w-full">
        <Button className="w-full" onClick={() => router.push("/forgot-password")}>
          Send a new link
        </Button>
      </div>
      <div className="flex w-full">
        <Button variant="ghost" icon="arrow-left" className="w-full" onClick={() => router.push("/login")}>
          Back to login
        </Button>
      </div>
    </div>
  );
}
