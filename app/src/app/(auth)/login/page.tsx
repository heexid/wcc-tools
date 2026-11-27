"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ds/Button";
import { Alert, Toast, ToastRegion } from "@/components/ds/Feedback";
import { usePresence } from "@/components/ds/usePresence";
import { InputField } from "@/components/ds/InputField";
import { Txt } from "@/components/ds/Txt";
import { useAuthMascot, useAuthToastHost } from "@/components/login/AuthShell";
import { createPortal } from "react-dom";
import { caretPoint, type MascotState } from "@/components/login/Mascot";
import { lastEmail, login, NetworkError } from "@/lib/data/repo";
import { EMAIL } from "@/lib/email";

// Figma: Login page — P1 empty · P2 filled · P3 logging in · E1 required · E2 email format ·
// E3 wrong credentials · E4 session expired (?expired=1) · E5 Caps Lock · E6 server unreachable.
// Forgot password? → /forgot-password (PASSWORD-RESET-PLAN; replaces E7). Arrivals: L-S1 `?sent=1` "Check your email
// for a reset link" · L-S2 `?reset=1` "Password updated. Log in with your new password" (email prefilled via ?email=).
// The card, background and mascot are the shared AuthShell (app/(auth)/layout.tsx).
// Motion: the panel content follows in a 50ms stagger (rare surface, CSS only — typing works at once); a notice opens
// its own row so the fields slide down instead of jumping.
// Mascot: eyes follow the cursor · email focused → watches the caret as you type · password → eyes closed (sneaks a
// peek now and then) · Show password → peeks · Logging in… → loading · any error → worried shake for a moment ·
// success → happy bounce while the next page loads · arriving from a reset → happy for a moment.

type Notice = "wrong" | "expired" | "network" | null;
const NOTICES = {
  wrong: {
    tone: "danger",
    title: "Email or password is incorrect",
    message: "Check them and try again",
  },
  expired: {
    tone: "info",
    title: "Your session expired",
    message:
      "Log in again to continue where you left off. Your draft was saved.",
  },
  network: {
    tone: "warning",
    title: "Can't connect to CIR",
    message:
      "Check your internet connection and try again. Your details are still filled in.",
  },
} as const;

// Snackbars on arrival (Figma LO2, L-S1, L-S2): top-centre, 32 from the top, 4 s.
const ARRIVALS = {
  loggedOut: "You’ve logged out",
  sent: "Check your email for a reset link",
  reset: "Password updated. Log in with your new password",
} as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get("expired") === "1";
  const arrival =
    (["loggedOut", "sent", "reset"] as const).find(
      (k) => params.get(k) === "1",
    ) ?? null;
  const [email, setEmail] = useState(() =>
    expired ? lastEmail() : (params.get("email") ?? ""),
  );
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const [notice, setNotice] = useState<Notice>(expired ? "expired" : null);
  const [pending, setPending] = useState(false);
  const [caps, setCaps] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [mood, setMood] = useState<"error" | "success" | "happy" | null>(
    arrival === "sent" || arrival === "reset" ? "happy" : null,
  );
  useEffect(() => {
    if (mood !== "error" && mood !== "happy") return;
    const t = setTimeout(() => setMood(null), mood === "happy" ? 2000 : 1600);
    return () => clearTimeout(t);
  }, [mood]);
  const mascotState: MascotState = pending
    ? "loading"
    : (mood ??
      (focused === "email"
        ? "typing"
        : focused === "password"
          ? revealed
            ? "peek"
            : "password"
          : "idle"));
  const mascot = useAuthMascot(mascotState);
  const flashError = () => {
    if (mood === "error") mascot.current?.react("shake");
    setMood("error");
  };
  // The focused field (the Show password button counts as the password field).
  const fieldOf = (el: EventTarget | null) => {
    if (!(el instanceof HTMLElement)) return null;
    const input =
      el instanceof HTMLInputElement
        ? el
        : el.parentElement?.querySelector("input");
    return input?.name === "email" || input?.name === "password"
      ? input.name
      : null;
  };
  const watchCaret = (input: HTMLInputElement) => {
    const p = caretPoint(input);
    mascot.current?.lookAtClient(p.x, p.y);
  };
  // The arrival is read once per mount (each arrival is a fresh navigation to /login).
  const [toastText] = useState<string>(() =>
    arrival ? ARRIVALS[arrival] : "",
  );
  const [shown, setShown] = useState(!!arrival);
  const toast = usePresence(shown);
  const toastHost = useAuthToastHost();
  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(false), 4000);
    return () => clearTimeout(t);
  }, [shown]);
  const field = (name: "email" | "password") =>
    form.current?.elements.namedItem(name) as HTMLInputElement | null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Enter your email";
    else if (!EMAIL.test(email.trim()))
      next.email = "Enter an email like name@company.com";
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

  const forgot = () => {
    const typed = email.trim();
    router.push(
      typed
        ? `/forgot-password?email=${encodeURIComponent(typed)}`
        : "/forgot-password",
    );
  };

  const onCaps = (e: KeyboardEvent<HTMLInputElement>) =>
    setCaps(e.getModifierState("CapsLock"));
  const n = notice ? NOTICES[notice] : null;

  return (
    <>
      <form
        ref={form}
        noValidate
        onSubmit={submit}
        onFocus={(e) => setFocused(fieldOf(e.target))}
        onBlur={(e) => setFocused(fieldOf(e.relatedTarget))}
        className="flex w-full flex-col items-center gap-base motion-stagger"
      >
        <div className="flex w-[calc(var(--spacing-64)*4+var(--spacing-32)+var(--spacing-12))] flex-col items-center gap-micro">
          <h2 className="text-heading-panel text-text-primary">
            <Txt>Hello, welcome 👋</Txt>
          </h2>
          <p className="text-center text-body text-text-secondary">
            Glad to see you again, use your credential to access your account
          </p>
        </div>
        {n && (
          // Opens its own row (motion-collapse) so the fields below slide down; -mt-base + pt-base keeps the
          // column gap inside the collapsing row, so the gap doesn't jump in ahead of the slide.
          <div className="motion-collapse -mt-base w-full">
            <div className="min-h-0 overflow-hidden">
              <div className="pt-base">
                <Alert
                  key={notice}
                  tone={n.tone}
                  title={n.title}
                  className="motion-notice"
                >
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
            if (errors.password)
              setErrors((x) => ({ ...x, password: undefined }));
          }}
        />
        <div className="flex w-full justify-end">
          <button
            type="button"
            onClick={forgot}
            disabled={pending}
            className="cursor-pointer rounded-small text-caption-strong text-text-accent outline-none hover:underline focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:text-text-tertiary"
          >
            Forgot password?
          </button>
        </div>
        {/* Wrapper takes the stagger entrance, so the Button's own press transition keeps its timing. */}
        <div className="flex w-full">
          <Button type="submit" loading={pending} className="w-full">
            {pending
              ? "Logging in…"
              : notice === "network"
                ? "Try again"
                : "Login"}
          </Button>
        </div>
      </form>
      {toast.mounted &&
        toastHost &&
        createPortal(
          <ToastRegion at="page">
            <Toast presence={toast.presence}>{toastText}</Toast>
          </ToastRegion>,
          toastHost,
        )}
    </>
  );
}

export default function LoginPage() {
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
  return <LoginForm key={bfcacheId} />;
}
