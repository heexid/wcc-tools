"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ds/Button";
import { Alert, Toast, ToastRegion } from "@/components/ds/Feedback";
import { usePresence } from "@/components/ds/usePresence";
import { InputField } from "@/components/ds/InputField";
import { Txt } from "@/components/ds/Txt";
import { LiquidBackground } from "@/components/login/LiquidBackground";
import { caretPoint, Mascot, type MascotApi, type MascotState } from "@/components/login/Mascot";
import { lastEmail, login, NetworkError } from "@/lib/data/repo";

// Figma: Login page — P1 empty · P2 filled · P3 logging in · E1 required · E2 email format ·
// E3 wrong credentials · E4 session expired (?expired=1) · E5 Caps Lock · E6 server unreachable ·
// E7 forgot password (PRD §4.3: no self-service reset).
// Mobile (R03, Figma ML1–ML3): card fills the width minus 16 margins, centred between 56 top / safe-area bottom.
// Card: 420 wide, popover/inset, surface/header, radius card, Shadow/Floating. Header "Login"
// (Heading/Module, pad base/group). Panel: surface/default + Gradient/Login Glow, 1px border,
// radius control, pad section/group, gap base, items centred.
// Motion: the card rises in on load and the panel content follows in a 50ms stagger (rare surface, CSS only —
// typing works at once); a notice opens its own row so the fields slide down instead of jumping.
// Mascot (components/login/Mascot): eyes follow the cursor · email focused → watches the caret as you type ·
// password → eyes closed (sneaks a peek now and then) · Show password → peeks · Logging in… → loading ·
// any error → worried shake for a moment · success → happy bounce while the next page loads.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Notice = "wrong" | "expired" | "network" | "forgot" | null;
const NOTICES = {
  wrong: { tone: "danger", title: "Email or password is incorrect", message: "Check them and try again" },
  expired: { tone: "info", title: "Your session expired", message: "Log in again to continue where you left off. Your draft was saved." },
  network: { tone: "warning", title: "Can't connect to CIR", message: "Check your internet connection and try again. Your details are still filled in." },
  forgot: { tone: "info", title: "Forgot your password?", message: "Passwords are managed by your workspace admin. Ask them to reset it, then log in with the new password." },
} as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired") === "1";
  const [email, setEmail] = useState(() => (expired ? lastEmail() : ""));
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [notice, setNotice] = useState<Notice>(expired ? "expired" : null);
  const [pending, setPending] = useState(false);
  const [caps, setCaps] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const mascot = useRef<MascotApi | null>(null);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [mood, setMood] = useState<"error" | "success" | null>(null);
  useEffect(() => {
    if (mood !== "error") return;
    const t = setTimeout(() => setMood(null), 1600);
    return () => clearTimeout(t);
  }, [mood]);
  const flashError = () => {
    if (mood === "error") mascot.current?.react("shake");
    setMood("error");
  };
  const mascotState: MascotState = pending
    ? "loading"
    : mood ?? (focused === "email" ? "typing" : focused === "password" ? (revealed ? "peek" : "password") : "idle");
  // The focused field (the Show password button counts as the password field).
  const fieldOf = (el: EventTarget | null) => {
    if (!(el instanceof HTMLElement)) return null;
    const input = el instanceof HTMLInputElement ? el : el.parentElement?.querySelector("input");
    return input?.name === "email" || input?.name === "password" ? input.name : null;
  };
  const watchCaret = (input: HTMLInputElement) => {
    const p = caretPoint(input);
    mascot.current?.lookAtClient(p.x, p.y);
  };
  // After Log out (Figma LO2, INTERACTIONS 6.10): "You’ve logged out", top-centre, 32 from the top.
  const [loggedOut, setLoggedOut] = useState(params.get("loggedOut") === "1");
  const toast = usePresence(loggedOut);
  useEffect(() => {
    if (!loggedOut) return;
    const t = setTimeout(() => setLoggedOut(false), 4000);
    return () => clearTimeout(t);
  }, [loggedOut]);
  const field = (name: "email" | "password") => form.current?.elements.namedItem(name) as HTMLInputElement | null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your email";
    else if (!EMAIL.test(email.trim())) next.email = "Enter an email like name@company.com";
    if (!password) next.password = "Enter your password";
    setErrors(next);
    if (next.email || next.password) {
      flashError();
      field(next.email ? "email" : "password")?.focus();
      return;
    }
    setPending(true);
    try {
      const r = await login(email, password);
      if (r.ok) {
        setMood("success");
        router.replace(safeNext(params.get("next"))); // same-site paths only (no open redirect)
        return; // stay in "Logging in…" until the next page takes over
      }
      setNotice("wrong");
      flashError();
      setPassword("");
      setPending(false);
      requestAnimationFrame(() => field("password")?.focus());
    } catch (err) {
      if (!(err instanceof NetworkError)) throw err;
      setNotice("network");
      flashError();
      setPending(false);
    }
  }

  const onCaps = (e: KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState("CapsLock"));
  const n = notice ? NOTICES[notice] : null;

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface-default max-tablet:min-h-dvh max-tablet:px-layout-gutter max-tablet:pt-(--spacing-mobile-header-height) max-tablet:pb-(--safe-area-bottom)">
      {/* Page background: WebGL liquid gradient + grain (components/login/LiquidBackground). */}
      <LiquidBackground />
      <section
        aria-labelledby="login-title"
        className="flex w-[calc(var(--spacing-64)*6+var(--spacing-32)+var(--spacing-4))] flex-col overflow-hidden max-tablet:w-full rounded-card bg-surface-header p-popover-inset shadow-floating motion-enter"
      >
        <header className="flex px-group py-base">
          <h1 id="login-title" className="text-heading-module text-text-primary">
            Login
          </h1>
        </header>
        <form
          ref={form}
          noValidate
          onSubmit={submit}
          onFocus={(e) => setFocused(fieldOf(e.target))}
          onBlur={(e) => setFocused(fieldOf(e.relatedTarget))}
          className="flex flex-col items-center gap-base overflow-hidden rounded-control border border-border-default bg-surface-default bg-(image:--gradient-login-glow) px-group py-section motion-stagger"
        >
          <Mascot state={mascotState} apiRef={mascot} />
          <div className="flex w-[calc(var(--spacing-64)*4+var(--spacing-32)+var(--spacing-12))] flex-col items-center gap-micro">
            <h2 className="text-heading-panel text-text-primary">
              <Txt>Hello, welcome 👋</Txt>
            </h2>
            <p className="text-center text-body text-text-secondary">Glad to see you again, use your credential to access your account</p>
          </div>
          {n && (
            // Opens its own row (motion-collapse) so the fields below slide down; -mt-base + pt-base keeps the
            // column gap inside the collapsing row, so the gap doesn't jump in ahead of the slide.
            <div className="motion-collapse -mt-base w-full">
              <div className="min-h-0 overflow-hidden">
                <div className="pt-base">
                  <Alert key={notice} tone={n.tone} title={n.title} className="motion-notice">
                    {n.message}
                  </Alert>
                </div>
              </div>
            </div>
          )}
          <InputField
            label="Email"
            required
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="Enter email"
            value={email}
            disabled={pending}
            error={errors.email}
            onFocus={(e) => watchCaret(e.currentTarget)}
            onSelect={(e) => watchCaret(e.currentTarget)}
            onChange={(e) => {
              mascot.current?.keystroke();
              setEmail(e.target.value);
              if (errors.email) setErrors((x) => ({ ...x, email: undefined }));
            }}
          />
          <InputField
            label="Password"
            required
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            disabled={pending}
            error={errors.password}
            warning={caps ? "Caps Lock is on" : undefined}
            onKeyDown={onCaps}
            onKeyUp={onCaps}
            onBlur={() => setCaps(false)}
            onRevealChange={setRevealed}
            onChange={(e) => {
              mascot.current?.keystroke();
              setPassword(e.target.value);
              if (errors.password) setErrors((x) => ({ ...x, password: undefined }));
            }}
          />
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => setNotice("forgot")}
              className="cursor-pointer rounded-small text-caption-strong text-text-accent outline-none hover:underline focus-visible:shadow-focus-ring"
            >
              Forgot password?
            </button>
          </div>
          {/* Wrapper takes the stagger entrance, so the Button's own press transition keeps its timing. */}
          <div className="flex w-full">
            <Button type="submit" loading={pending} className="w-full">
              {pending ? "Logging in…" : notice === "network" ? "Try again" : "Login"}
            </Button>
          </div>
        </form>
      </section>
      {toast.mounted && (
        <ToastRegion at="page">
          <Toast presence={toast.presence}>You’ve logged out</Toast>
        </ToastRegion>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
