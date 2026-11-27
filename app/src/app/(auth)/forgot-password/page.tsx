"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ds/Button";
import { Alert } from "@/components/ds/Feedback";
import { InputField } from "@/components/ds/InputField";
import { Txt } from "@/components/ds/Txt";
import { useAuthMascot } from "@/components/login/AuthShell";
import { caretPoint, type MascotState } from "@/components/login/Mascot";
import { NetworkError, requestPasswordReset } from "@/lib/data/repo";
import { EMAIL } from "@/lib/email";

// Figma: Login › Forgot & reset password — FP1 empty · FP2 filled · FP3 sending · FP-E1 email missing ·
// FP-E2 email format · FP-E3 can't reach the server · mobile FMP1 (PASSWORD-RESET-PLAN US-PW1).
// Every answer except a network failure goes back to Login with "Check your email for a reset link" (L-S1) — the same
// for unknown emails, which get no email (no account enumeration). The email typed on Login comes along (?email=)
// and goes back to Login prefilled.

function ForgotForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(() => params.get("email") ?? "");
  const [error, setError] = useState<string>();
  const [network, setNetwork] = useState(false);
  const [pending, setPending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mood, setMood] = useState<"error" | "success" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (mood !== "error") return;
    const t = setTimeout(() => setMood(null), 1600);
    return () => clearTimeout(t);
  }, [mood]);
  const state: MascotState = pending ? "loading" : (mood ?? (focused ? "typing" : "idle"));
  const mascot = useAuthMascot(state);
  const flashError = () => {
    if (mood === "error") mascot.current?.react("shake");
    setMood("error");
  };
  const watchCaret = (el: HTMLInputElement) => {
    const p = caretPoint(el);
    mascot.current?.lookAtClient(p.x, p.y);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const typed = email.trim();
    const msg = !typed ? "Enter your email" : !EMAIL.test(typed) ? "Enter an email like name@company.com" : undefined;
    setError(msg);
    if (msg) {
      flashError();
      input.current?.focus();
      return;
    }
    setPending(true);
    try {
      await requestPasswordReset(typed);
      setMood("success");
      router.replace(`/login?sent=1&email=${encodeURIComponent(typed)}`);
      // stay in "Sending…" until Login takes over
    } catch (err) {
      if (!(err instanceof NetworkError)) throw err;
      setNetwork(true);
      flashError();
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex w-full flex-col items-center gap-base motion-stagger">
      <div className="flex w-[calc(var(--spacing-64)*4+var(--spacing-32)+var(--spacing-12))] flex-col items-center gap-micro">
        <h2 className="text-heading-panel text-text-primary">
          <Txt>Forgot your password?</Txt>
        </h2>
        <p className="text-center text-body text-text-secondary">Enter the email you log in with and we’ll send you a link to reset your password</p>
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
      <InputField
        ref={input}
        label="Email"
        required
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        placeholder="Enter email"
        value={email}
        disabled={pending}
        error={error}
        onFocus={(e) => {
          setFocused(true);
          watchCaret(e.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onSelect={(e) => watchCaret(e.currentTarget)}
        onChange={(e) => {
          mascot.current?.keystroke();
          setEmail(e.target.value);
          if (error) setError(undefined);
        }}
      />
      <div className="flex w-full">
        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Sending…" : network ? "Try again" : "Send reset link"}
        </Button>
      </div>
      <div className="flex w-full">
        <Button
          variant="ghost"
          icon="arrow-left"
          disabled={pending}
          className="w-full"
          onClick={() => router.push(email.trim() ? `/login?email=${encodeURIComponent(email.trim())}` : "/login")}
        >
          Back to login
        </Button>
      </div>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <Fresh />
    </Suspense>
  );
}

/** Cache Components keeps visited routes mounted but hidden (Activity). Each push / replace to this screen starts
 *  fresh — arrival snackbars, ?email= and the "Sending…" state are read again — while browser back / forward still
 *  restores what was typed (Next "Preserving UI state": bfcacheId). */
function Fresh() {
  const { bfcacheId } = useRouter();
  return <ForgotForm key={bfcacheId} />;
}
