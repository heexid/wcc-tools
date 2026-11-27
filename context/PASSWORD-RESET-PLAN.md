# Plan: self-service password reset

| | |
|---|---|
| **Status** | **Planned 2026-11-27.** PW0 plan · PW1 Figma · PW2 code · PW3 ship + live config. |
| **Goal** | Anyone with a CIR login who forgot their password can set a new one by email, without the developer running SQL. |
| **Companions** | `PRD.md` §4.3, §4.4, US-13 · `INTERACTIONS.md` 6.5 · `agents/DEPLOY.md` · Figma page **Login** |
| **Replaces** | Login **E7** ("Passwords are managed by your workspace admin") and the SQL reset path. |

## 1. Executive summary

- **Problem.** There's no self-service reset. **Forgot password?** tells people to ask their workspace admin, but admins have no reset tool, so every reset becomes an SQL query run by the developer.
- **Solution.** A standard email-link reset: Forgot password → email → link → Create new password → back to Login with a success snackbar. It uses Supabase Auth's recovery flow, a CIR-branded email sent through Resend SMTP, and the same card, background and mascot as Login.
- **Success criteria**
  1. Zero SQL password resets after launch, because every reset goes through the flow.
  2. The reset email arrives within 60 s (Resend delivery log), and the link opens the Create new password screen in a different browser or device from the one that asked for it.
  3. The Forgot password response is identical for registered and unknown emails: same copy, same snackbar and same timing order (no account enumeration, checked by e2e).
  4. After a reset, every older session of that account is signed out, and only the new password logs in.
  5. Each new screen matches its Figma frame with tokens only (no raw colours or px in the new code, checked by `npm run g1`), at both 1440 and 390.

## 2. User experience

**Persona.** Any CIR login (admin or crew), on desktop or phone, often on WhatsApp with a client. They're usually locked out at a bad moment, so the flow has to be short.

### Flow

```
Login ──Forgot password?──▶ FP Forgot password ──Send reset link──▶ Login + snackbar "Check your email for a reset link"
                                  │                                    (same for unknown emails; no email is sent)
                                  └─Back to login──▶ Login
Email "Reset your CIR password" ──Reset password──▶ /auth/confirm (verifies the link)
     ├─ valid ──▶ RP Create new password ──Update password──▶ Login + snackbar "Password updated. Log in with your new password"
     └─ expired / used / invalid ──▶ RP-X Link expired ──Send a new link──▶ FP (email prefilled when known)
```

### User stories and acceptance criteria

**US-PW1. As a CIR user who forgot my password, I want to ask for a reset link by email so that I can get back in without waiting on anyone.**
- **Forgot password?** on Login opens `/forgot-password`, carrying the email if one was typed (`?email=`).
- The FP card looks like Login: same header bar (title "Forgot password"), mascot, heading "Forgot your password?", body "Enter the email you log in with and we’ll send you a link to reset your password", Email field, primary **Send reset link** (full width) and a text link **Back to login**.
- Validation matches Login E1 and E2: "Enter your email" and "Enter an email like name@company.com", with the field focused and the mascot shaking.
- While sending, the button reads "Sending…" with a spinner, the field is disabled and the mascot shows loading.
- **Any answer except a network failure** (sent, unknown email, rate limited) → `/login?sent=1` with the email prefilled and the snackbar **"Check your email for a reset link"**. Unknown emails get no email and the same response.
- A network failure keeps the user on FP with a warning alert "Can’t connect to CIR / Check your internet connection and try again." and the button becomes **Try again** (like Login E6).

**US-PW2. As that user, I want the email link to let me set a new password so that I can log in again.**
- The email: subject "Reset your CIR password", CIR mascot and wordmark, the line "We got a request to reset the password for {{ .Email }}.", primary button **Reset password**, "This link expires in 1 hour and works once. If you didn’t ask for this, you can ignore this email — your password won’t change." It uses brand colours from the DS tokens, inlined because email clients don't support CSS variables.
- The link goes to `/auth/confirm?token_hash=…&type=recovery`, which verifies it on the server and redirects to `/reset-password`. It works on any device, because it uses `token_hash` rather than PKCE.
- The RP card looks like Login: title "Reset password", mascot, heading "Create a new password", body "Choose a password you don’t use anywhere else", **New password** and **Confirm new password** fields (show/hide), and the live rules checklist from Change password (at least 8 characters · contains a letter and a number). There's no "different from current" row, since we don't know the current password; Supabase's `same_password` answer is shown as "Use a password you haven’t used for CIR before".
- Errors on submit: unmet rules stay grey with ×, the confirm field shows "Passwords don’t match.", and the first wrong field is focused with the mascot shaking.
- While saving, the button reads "Updating…"; on success the user goes to `/login?reset=1` with the snackbar **"Password updated. Log in with your new password"**. Every session of the account is signed out, including the recovery session.
- An expired, used or malformed link, or `/reset-password` opened with no recovery session, shows **RP-X**: heading "This link has expired", body "Reset links work once and expire after 1 hour. Ask for a new one.", primary **Send a new link** (→ FP) and **Back to login**.

### Non-goals
- No sign-up, magic-link login, 2FA or "remember me".
- Admins don't reset other people's passwords in the app (SQL stays as the fallback, see DEPLOY.md).
- No email-change flow and no Bahasa Indonesia copy (the app is English-only).
- No custom rate-limit UI: Supabase's limits apply silently, and the response stays the same.

## 3. AI system requirements
Not applicable.

## 4. Technical specification

### Architecture

| Piece | File | Notes |
|---|---|---|
| Shared auth card | `src/components/login/AuthCard.tsx` | Main + `LiquidBackground` + card + header + panel, pulled out of `login/page.tsx` so the three screens are identical. |
| Forgot password page | `src/app/forgot-password/page.tsx` | Client form → `requestPasswordReset(email)` from `@/lib/data/repo`. |
| Link verification | `src/app/auth/confirm/route.ts` | GET: `verifyOtp({ type: "recovery", token_hash })` → recovery session cookies → 303 `/reset-password`; error → `/reset-password?expired=1`. Only `type=recovery` is accepted. |
| Reset page | `src/app/reset-password/page.tsx` | Server checks the session (`getUser`); none or `?expired=1` → RP-X. Otherwise client form → `resetPassword({ next, confirm })`. |
| Server actions | `src/lib/data/supabase/actions.ts` | `requestPasswordResetAction(email)` → `auth.resetPasswordForEmail` (only network failures are reported back). `resetPasswordAction` → `passwordRules` server-side, `auth.updateUser({ password })`, `mark_password_changed`, `signOut({ scope: "global" })`. |
| Mock repo | `src/lib/data/repo.ts` | Same contract for local dev and tests: unknown email = no-op; `?fail=requestPasswordReset` / `?fail=resetPassword` drive the network states. The mock reset page treats `/reset-password?token=mock` as a valid session. |
| Route guard | `src/proxy.ts` | `PUBLIC` adds `/forgot-password`, `/reset-password`, `/auth/confirm`. |
| Login toasts | `src/app/login/page.tsx` | `?sent=1` / `?reset=1` snackbars (`Toast`, 4 s, like `?loggedOut=1`); E7 alert removed. |
| Email template | `supabase/templates/reset-password.html` | Local `config.toml [auth.email.template.recovery]`; live via the Management API. |

**Password rules.** `passwordRules` gets a mode without the "differs" rule; client and server both use it.

**Sessions.** The recovery session is a normal Supabase session, so the midnight rule (`session-day.ts`) still applies. It lives only between the link and Update password, and `signOut({ scope: "global" })` ends it together with every other device.

### Integration points
- Supabase Auth: `resetPasswordForEmail`, `verifyOtp`, `updateUser`, `signOut`. `enable_signup` stays false.
- Resend SMTP (`smtp.resend.com:465`, user `resend`, the API key as the password) from a verified sending domain. Sender name "CIR".
- Live Auth config, through the Management API `PATCH /v1/projects/{ref}/config/auth`: `smtp_*`, `mailer_subjects_recovery`, `mailer_templates_recovery_content`, `site_url`, `uri_allow_list` (+ `/auth/confirm`), `mailer_otp_exp` = 3600. Each change is shown to the user before it's applied.

### Security and privacy
- No enumeration: same UI and response for every email. Server timing is the same too, because the action awaits Supabase either way.
- The token is single-use with a 1 h expiry, and only `type=recovery` is accepted on `/auth/confirm`. There's no open redirect: the destination is fixed, not taken from the URL.
- The reset form needs a recovery session. A recovery session that's simply left open expires at midnight WIB like any other session.
- After a reset, every session of the account is revoked.
- The Resend API key lives only in Supabase's Auth config. It never goes into the repo, Vercel or chat logs.
- Deactivated accounts can reset, but still can't use CIR (RLS and `is_staff()` are unchanged).

## 5. Motion (from /find-animation-opportunities, /better-motion, /animate)

| Moment | Motion | Values |
|---|---|---|
| Login ↔ Forgot ↔ Reset | The card stays put; the panel content swaps in place, with the same rise + 50 ms stagger as Login (`motion-enter`, `motion-stagger`). No page-level slide, so it doesn't look like you've left the app. | Existing tokens: `--dur-*`, `--ease-out` |
| Send reset link → Login | The snackbar comes in from the top (existing `Toast` presence) and the mascot does a happy bounce on arrival. | Existing Toast |
| Rules checklist | Each rule's icon crossfades and scales 0.8 → 1 when it changes from × to ✓. | 150 ms `--ease-out`; instant under reduced motion |
| Errors | The mascot shakes (existing), and the field error opens its row like Login. | Existing |
| RP-X | No motion beyond the card entrance, to keep the bad news calm. | — |

Every animation respects `prefers-reduced-motion` through the existing `motion-*` utilities.

## 6. Figma (PW1)

New section **"Forgot & reset password"** on page **Login**, below "Login - Possibility error", with one lane header per row:
- **Desktop 1440:** FP1 empty · FP2 filled · FP3 sending · FP-E1 required · FP-E2 format · FP-E3 network · L-S1 Login + "Check your email" snackbar · EM1 email (600 wide) · RP1 empty · RP2 filled (rules met) · RP3 updating · RP-E1 mismatch + rules unmet · RP-X link expired · L-S2 Login + "Password updated" snackbar. Flow arrows and labels use the DS `Flow/*` components.
- **Mobile 390:** FMP1 forgot · FMP2 reset · FMP3 link expired, in "Login · Mobile (390)".
- Everything is built from DS instances (Input field, Button, Alert, Toast, Icon/*) and bound variables. The text styles are Heading/Module, Heading/Panel, Body and Caption.
- Old E7 is marked superseded, not deleted.

## 7. Slices

| Slice | Done when |
|---|---|
| **PW0** Plan | This file. |
| **PW1** Figma | Section built; screenshots checked against Login for alignment, spacing and tokens. |
| **PW2** Code | Screens + actions + route + mock + proxy + template + config.toml. `typecheck`, `lint`, `test`, `g1` green. New e2e `tests/e2e/PW.spec.ts` (mock) covers FP validation, the unknown-email snackbar, network, RP rules/mismatch/success and RP-X. Local Supabase hand check through Inbucket (Mailpit). |
| **PW3** Ship | Branch `password-reset` → PR → merged to main → Vercel deploy. Live config applied through the Management API once the user has a Resend key and verified domain. Live hand check: a real reset end to end. DEPLOY.md updated. PRD §4.3 and INTERACTIONS 6.5 updated. |

## 8. Risks

| Risk | Mitigation |
|---|---|
| The Resend domain isn't verified yet (DNS can take hours) | Code ships first. Until SMTP is set, live resets only reach the Supabase team address, and the DEPLOY.md SQL path stays as the fallback. |
| Email scanners (Outlook Safe Links) "click" the link and use up the token | The link goes to `/auth/confirm`, which verifies with GET. If scanners turn out to break it, switch to a page that verifies on a button press (v1.1). |
| The Site URL or redirect list is wrong, so links point to localhost | PW3 checks the email link on the live project before announcing. |
| Recovery session used to browse the app | Accepted: it's a legitimately signed-in owner of the inbox. The update signs out globally. |

## 9. Open items
- The Resend sending domain and from-address are the user's choice (for example `no-reply@<domain>`).
- PNG re-export of the Login visual baselines after the E7 change.
