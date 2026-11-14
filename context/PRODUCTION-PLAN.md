# Production Plan — Booking module

| | |
|---|---|
| **Status** | v1 · 2026-11-14 · nothing started |
| **Goal** | Take the finished front-end prototype (F0–F17) to a **live, secure, tested Booking + Package Library + Account module** on Supabase, with **no visual or behavioural change** to what the prototype already does. Built one slice at a time: **build → test → done → next**. |
| **Companions** | `context/PRD.md` (what + rules) · `context/PLAN.md` (architecture, SQL, RPCs) · `context/INTERACTIONS.md` (96 interaction rows) · `context/PROTOTYPE-PLAN.md` (how the UI was built and gated) |
| **Starting point** | `prototype/` — Next.js 16 App Router, 59 client components, mock data layer `src/lib/data/*` (`repo.ts`, `store.ts`, `ledger.ts`, `seed.ts`, `fixtures.ts`), pure domain logic `src/lib/booking/calc.ts`, PDF `src/components/pdf/InvoiceDocument.tsx`, 136 unit tests, 19 Playwright specs, gates G1–G4. |

IDs are the same ones the other docs use: **US-n**, **#x.y** (INTERACTIONS rows), **lanes** (hi-fi flows), **F-n** (prototype slices). Production slices are **P0…P14**. If a doc changes, update the matching slice here.

---

## 0. Ground rules

### 0.1 Scope of production v1
- **Same product as the prototype MVP** (PRD §5.1 *MVP* row): Login, App launcher, Account, Package Library, Booking create / edit / cancel, DP / Full / Partial / Paid invoices, Calendar (month / week / day), Table + search + filters, Detail + Crew schedule, PDF, viewer role.
- **Out of scope** (unchanged, PRD §5.1 v1.1+): tablet & mobile layouts, void invoice, refunds, VAT / discounts, WhatsApp / email sending, payment gateway, client portal.
- **The UI does not get redesigned.** Every Figma-matching component, route, URL contract (`view`, `date`, `tab`, `?booking=`, `crew=`…) and motion rule from the prototype stays. Production work happens **below** the components: data, auth, storage, security, ops.
- **Single swap point.** The prototype was built so that Supabase can replace `lib/data/*` without touching the UI (PROTOTYPE-PLAN §0.1). Production keeps that contract: the Supabase-backed repo implements the **same function names and result shapes** as `repo.ts`. Where the prototype cheats (below), P3 fixes the contract first.

### 0.2 What the prototype cheats on (must change, listed once)
| Prototype shortcut | Where | Production replacement | Slice |
|---|---|---|---|
| Whole DB lives in the browser (`getDb()`, `localStorage` key `proto:db`) | `lib/data/store.ts` | Postgres; the browser never holds the full dataset | P3 |
| Components call **synchronous** helpers on the whole `Db` (`computeKpis(d)`, `filterBookings(d, q)`, `listCrew`) | `app/bookings/page.tsx`, `BookingTable`, calendars, `UpcomingRail` | Server queries: range-bounded calendar, server-side sort + pagination, KPI + rail queries | P3, P6 |
| Mock auth: `proto:session` flag, one hard-coded admin, password in the `Db` | `repo.ts` `login`, `changePassword` | Supabase Auth, `profiles` + roles, RLS | P4 |
| Viewer role is flipped by `/dev/role` | `lib/role.ts` | Role from `profiles.role`, enforced by RLS **and** hidden in the UI | P4, P10 |
| Totals, status and numbering computed in TypeScript | `lib/data/ledger.ts` | DB triggers + RPCs (TS stays for live UI preview only) | P1, P2 |
| Frozen clock `NEXT_PUBLIC_TODAY=2026-11-10` | `lib/clock.ts` | Real clock in prod; frozen only in test builds | P0 |
| PDF built in the browser on download | `lib/pdf/download.ts` | Server render from the snapshot, stored in Storage, signed URL | P9 |
| Business details, bank account, default terms hard-coded in the seed; business editable in the mock db (`updateBusiness`, logo as a data URL) | `seed.ts` `settings`, `repo.ts`, `lib/booking/business.ts` | Business → `workspace_settings` + Storage logo; bank / terms from the workspace Settings (PRD §4.3) | P8 |
| `/dev/*` routes, `?fixture=`, `?fail=`, `?latency=` hooks | `app/dev/*`, `store.ts`, `repo.ts` | Compiled out of production builds | P0 |
| `playwright-report/` and `test-results/` are tracked in git | repo root | Git-ignored, removed from history going forward | P0 |

### 0.3 Stack additions
`@supabase/supabase-js` + `@supabase/ssr` (cookie sessions in App Router) · Supabase CLI (migrations, local stack, type generation, pgTAP) · Next.js Server Actions / Route Handlers for writes · `@react-pdf/renderer` on the server (Node runtime) · Sentry (errors) · GitHub Actions (CI) · Vercel (hosting, preview per PR). **Confirm hosting and plan in §0.6 before P0.** Docs for Next.js 16 and `@supabase/ssr` change fast: every slice prompt tells the agent to read `prototype/node_modules/next/dist/docs/` (see `prototype/AGENTS.md`) and to fetch current Supabase docs with Context7 first.

Environments: **local** (Supabase CLI docker) · **staging** (own Supabase project, preview deploys) · **production** (own Supabase project). Migrations are SQL files in `supabase/migrations/` applied by CI, never by hand.

### 0.4 Production gates (replace G1–G4 as the "done" check)
G1–G4 proved the UI is pixel-exact and are **kept as a regression guard** (run on the mock data source, see PG6). Production slices must pass the gates that apply to them:

| Gate | Check | Pass |
|---|---|---|
| **PG1 Static** | `tsc --noEmit`, `eslint`, `npm run g1`, `next build` with production env | 0 errors; no `/dev/*` route, `proto:` key or fixture hook in the production build output |
| **PG2 Database** | `supabase db reset` from zero applies every migration; pgTAP suite (constraints, triggers, RPCs, RLS) | all green; migration is idempotent in CI; `supabase gen types` diff is empty |
| **PG3 Parity** | One shared table of test vectors (the PLAN §3 matrix + PRD §2.4 rules 1–13) run against **three** implementations: `calc.ts`, the mock repo, the Supabase RPCs | identical results, identical error codes |
| **PG4 Security** | RLS matrix: anon / viewer / admin × every table × select / insert / update / delete, plus RPC calls from each role | every cell matches the expected allow / deny table in P10; no service-role key in the browser bundle |
| **PG5 E2E real** | The existing Playwright lanes (Bookings A–H, Package A–D, Launchpad A–B, Profile A–E) run against **staging** with the real Supabase, real auth, real clock | all lanes green with a fresh seed; no `fixture` / `fail` / `latency` hooks used |
| **PG6 Visual regression** | `npm run visual` on the **mock data source** with the frozen clock (unchanged harness) | no new diffs versus the last green run; the 53 inherited failures from F17 are tracked separately (§4.1) |
| **PG7 Performance** | PRD §4.5 budgets measured on staging with the 10k-booking seed | calendar month < 200 ms, table page < 300 ms, live calc < 50 ms/keystroke; LCP and INP budgets in P11 |

Rule for the data source: `DATA_SOURCE=mock|supabase` (default `supabase`). `mock` is kept for visual tests, Storybook-style `/dev` pages in non-prod builds and UI work; it must never be selectable in a production build.

### 0.5 Doc sync rules
- A slice is "done" only when its gates pass **and** the tracker (§4) and its slice log (`production/docs/slices/Pxx.md`) are updated.
- If production forces a rule change (e.g. a typed error code, a status transition, a copy string), update PRD / PLAN / INTERACTIONS in the same step, then this file, and add the matching Figma note if a screen is affected.
- Anything that cannot be matched 1:1 to the prototype is written in the slice log with the reason and who decided it — same as the prototype's "Decided …" lines.
- **Testing instruction carried over (user, 2026-11-14):** when asked to **test**, do not re-export Figma PNGs and do not re-run the visual tests (PG6) unless the user explicitly asks. Run unit, DB and e2e only; report visual gates as unconfirmed if a change could affect them.

### 0.6 Decisions to confirm before P0 (defaults are what this plan assumes)
| # | Decision | Default assumed | If different |
|---|---|---|---|
| D1 | Backend | Supabase (PRD §4.1, §4.3) | P1–P4 and P9 rewrite |
| D2 | Hosting | Vercel + 2 Supabase projects (staging, prod) | P0, P13 change |
| D3 | Auth source | The **existing internal-tools Supabase project/auth** (PRD §4.3). Same project = shared users + workspace membership; separate project = users must be migrated | P4 gets a user-migration step |
| D4 | Workspace Settings (business profile, bank details, default terms) | Read from the existing Invoice module's *Payment receiver* settings (PRD §4.3, open question 3) | If not reachable: a `workspace_settings` table owned by this module (P8) |
| D5 | Existing data | Greenfield: production starts empty (no import) | Adds P14b data import |
| D6 | Repo layout | Keep `prototype/` as the app and rename it to `app/` in P0; add `supabase/` beside it at the repo root | P0 only |
| D7 | Languages / locales | English UI, `id-ID` number + date formats (as prototype) | — |
| D8 | PDF location | Generated on invoice confirm, stored in Storage, regenerated from the snapshot on demand (PLAN §8) | — |
| D9 | Due date for remaining balance (PRD open question 2) | Not in v1 | Adds a field + reminders → v1.1 |

---

## 1. The per-slice workflow

Every slice P0…P14 follows the same loop. Do **not** start the next slice until step 9 is ticked.

```
 ┌─ 1. Read ──────── PRD rules + PLAN section + the prototype code the slice replaces
 │  2. Docs ───────── Context7 for Supabase / @supabase/ssr / Next.js 16 APIs used; node_modules/next/dist/docs
 │  3. Plan ───────── slice log header: files touched, migrations, env vars, test list, rollback
 │  4. Build ──────── smallest change that moves one cut-over seam; keep the prototype contract
 │  5. Test ───────── unit · pgTAP · parity · RLS matrix · e2e (per the gates the slice names)
 │  6. Review ─────── skill: code-review (+ security-review for P4, P7–P10); fix findings
 │  7. Fix loop ───── fix → re-run 5 (max 3 rounds, then flag to the user)
 │  8. Verify ─────── run on local, then staging; manual smoke of the slice's lane(s)
 └─ 9. Done ───────── tracker (§4) + slice log + doc sync → deploy to staging → next slice
```

**Step details**

1. **Read.** Open only what the slice lists. Copy the acceptance criteria into the slice log as test cases.
2. **Docs.** Do not code Next.js 16 or Supabase APIs from memory. Use Context7 (`resolve-library-id` → `query-docs`, one concept per query) for `@supabase/ssr`, Supabase Auth, Storage signed URLs, RLS and pgTAP; read the Next.js docs bundled in `node_modules` for Server Actions, route handlers, `cacheComponents`, `proxy`/middleware.
3. **Plan.** `production/docs/slices/Pxx.md`: scope, touched files, new env vars, migration names, test list, how to roll back.
4. **Build.** Cut over one seam at a time; the app must stay runnable after every slice (mock source still selectable in non-prod builds).
5. **Test.** `npm run g1` · `npm test` · `supabase test db` (pgTAP) · `npm run test:parity` · `npm run test:rls` · `npm run e2e:staging -- -g Pxx`. PG6 only when asked (§0.5).
6. **Review.** `code-review` on the diff; `security-review` on slices that touch auth, RLS, storage or secrets.
7. **Fix loop.** After 3 failed rounds, stop and report the failing output.
8. **Verify.** Local Supabase first, then the staging deploy of the PR; walk the lanes the slice owns.
9. **Done.** Tick §4, write results (gate numbers, open issues, rollback tested yes/no), sync docs.

---

## 2. Slice order (overview)

| # | Slice | Replaces / adds | PRD / PLAN | Gates |
|---|---|---|---|---|
| P0 | Foundations: repo, CI, environments, prod build hygiene | clock, `/dev/*`, hooks, tracked reports | PLAN §1, §9 | PG1 |
| P1 | Database: schema, triggers, indexes, seed, types | `store.ts`, `ledger.ts` totals / status | PRD §4.2, §2.4–2.5 · PLAN §2.1–2.2, 2.6–2.7 | PG1 PG2 |
| P2 | RPCs: `save_booking`, `create_invoice`, `cancel_booking`, numbering | `repo.ts` write rules | PLAN §2.3–2.5 · PRD §2.4 | PG2 PG3 |
| P3 | Data access layer: Supabase repo behind the prototype contract | `repo.ts`, sync `Db` reads | PLAN §6 | PG1 PG3 PG6 |
| P4 | Auth, session, roles, Account | mock login, `/dev/role`, password | PRD §4.3, US-13 · PLAN §8b | PG1 PG4 PG5 |
| P5 | Package Library live | F5 | US-0 | PG3 PG5 |
| P6 | Bookings read path: dashboard, calendar, table, filters, detail | F6–F9, F12 reads | US-6–US-9 · PLAN §6, §7 | PG3 PG5 PG7 |
| P7 | Booking write path: new, edit, cancel | F10, F13, F14 | US-1, US-4, US-5, US-12 | PG3 PG5 |
| P8 | Workspace Settings integration | hard-coded business / bank / terms | PRD §4.3 | PG5 |
| P9 | Invoices + PDF: create, snapshot, Storage, signed URLs | F11, F15 | US-2, US-3, US-10 · PLAN §8 | PG3 PG4 PG5 |
| P10 | Security hardening: RLS audit, viewer enforcement, PII, headers | — | PRD §4.4 | PG4 |
| P11 | Performance: 10k seed, indexes, caching, budgets | — | PRD §4.5 | PG7 |
| P12 | Full regression: all lanes on staging, a11y, visual guard | F17 | PLAN §9 | PG5 PG6 |
| P13 | Operations: monitoring, backups, reconciliation cron, runbook | — | PLAN §9 | — |
| P14 | UAT, cut-over and launch | — | — | all |

Why this order: the app must stay shippable after every slice. Data model and rules first (P1–P2), then one contract-compatible repo (P3) so the UI never changes, then auth (P4) because every later table is behind RLS. After that, features follow the same dependency order as the prototype: packages → reads → writes → settings → invoices/PDF. Hardening, performance and regression come after the features exist; operations and launch last.

---

## 3. Slices

Each slice has: **Feature** (scope + done criteria), **Prompt** (paste into Claude Code to run the slice) and **Workflow** (slice-specific steps on top of §1).

---

### P0 — Foundations: repo, CI, environments, production build hygiene

**Feature**
- Decide and record D1–D9 (§0.6) in `production/docs/slices/P00.md`.
- Repo layout (D6): `prototype/` → `app/` (or keep name; pick once), `supabase/` at the root (`config.toml`, `migrations/`, `seed.sql`, `tests/`). Update every path in the docs in the same commit.
- Hygiene: add `playwright-report/`, `test-results/`, `*.tsbuildinfo` to `.gitignore` and `git rm --cached` them (they are tracked today and bloat the repo).
- Environments + secrets: `.env.example` documenting `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only), `DATA_SOURCE`, `SENTRY_DSN`; validated at boot with zod (`src/env.ts`) so a missing variable fails the build, not a request.
- Production build guard: `/dev/*` routes, `?fixture=`, `?fail=`, `?latency=`, `/dev/reset` and `NEXT_PUBLIC_TODAY` are compiled out or return 404 when `NODE_ENV=production` or `APP_ENV=production`; `lib/clock.ts` returns the real date unless `APP_ENV=test`. A build-time script fails if a `proto:` key or dev route is found in `.next/`.
- CI (GitHub Actions): typecheck, lint, G1, unit, `next build`; Supabase local stack + pgTAP job; preview deploy per PR.
- **Done when:** `main` is protected, CI is green, a PR creates a preview deploy, and the production build contains no dev surface.

**Prompt**
```
Slice P0 of context/PRODUCTION-PLAN.md. Read §0 and §1 of that file, prototype/AGENTS.md and
prototype/README.md.
First write the decisions D1–D9 as they stand (defaults in §0.6) into production/docs/slices/P00.md and
stop to ask me only for the ones marked as different from default.
Then: rename/organise the repo per D6, git-ignore and untrack playwright-report/ and test-results/,
add .env.example + a zod-validated src/env.ts, make lib/clock.ts real-time outside APP_ENV=test,
compile out /dev/* routes and the fixture/fail/latency hooks in production builds, and add a build
check that fails if any of them survive in .next/.
Set up GitHub Actions: typecheck, eslint, npm run g1, npm test, next build, plus a job that starts the
Supabase CLI local stack (empty for now). Read node_modules/next/dist/docs before touching next.config.ts
or proxy/middleware. Finish with §1 step 9.
```

**Workflow**
Standard loop; step 5 = CI green on a throwaway PR; step 8 = production build artefact inspection.

---

### P1 — Database: schema, triggers, indexes, seed, types

**Feature**
- Migration `001_booking.sql` from PRD §4.2: `packages`, `bookings`, `profiles`, `crew`, `booking_crew`, `booking_items`, `invoices`, `invoice_counters`; every check constraint (price ≥ 0, qty 1–999, `terms ≤ 255`, `cancel_reason ≤ 255`, `description ≤ 1000`, `display_name 2–50`, invoice `amount > 0`); `pg_trgm` + GIN on `client_name`, `booking_name`, `client_phone`; the four indexes from PRD §4.2.
- **Gaps the prototype closed that the PRD schema does not yet list** (add to PRD §4.2 and the migration): `packages.summary`, `packages.archived_at`; `bookings.payment_instruction` (receipt name, account number, account name — Figma lane I, `types.ts` `PaymentInstruction`); `invoices.issued_at`; `bookings.created_by` as a display-name-safe reference (name resolves at read, snapshots keep the old name, PLAN §8b); `packages.legacy_bookings` is **prototype-only** — do not migrate it.
- Triggers (PLAN §2.2): item changes → `bookings.total`; invoice insert → `total_paid`; both → `status` per PRD §2.5. Invoices are append-only: a trigger raises on `DELETE`, and on `UPDATE` of anything except `pdf_path`.
- `ref` generator `BK-YYYY-NNNN` (per-year counter, same pattern as `invoice_counters`).
- Seed for local + staging only (`supabase/seed.sql`, PLAN §2.7: 8 packages (6 active + 2 archived), 6 crew, 40 bookings Oct–Dec 2026 covering every status). Generated from `lib/data/seed.ts` so staging looks like the prototype.
- `supabase gen types typescript` → `src/lib/db/database.types.ts`, committed and checked in CI.
- **Done when:** PG2 green — migration applies from zero, pgTAP covers every constraint, trigger and the append-only rule, and the generated types are current.

**Prompt**
```
Slice P1 of context/PRODUCTION-PLAN.md. Read PRD §2.4, §2.5, §4.2 and PLAN §2.1, §2.2, §2.6, §2.7, plus
prototype src/lib/data/types.ts, ledger.ts and seed.ts.
Write supabase/migrations/001_booking.sql: all tables with their check constraints, the pg_trgm GIN
indexes, the triggers that maintain bookings.total / total_paid / status, the append-only guard on
invoices, and BK-/INV- counters. Add the columns the prototype added beyond the PRD (payment_instruction,
packages.summary, archived_at, invoices.issued_at) and update PRD §4.2 in the same step.
Generate supabase/seed.sql from the prototype seed (do not hand-type amounts). Write pgTAP tests for every
constraint, every trigger path (status derivation incl. canceled) and the append-only rule. Generate and
commit database types. Use Context7 for Supabase CLI / pgTAP syntax. Finish with §1 step 9.
```

**Workflow**
Standard loop; step 5 = `supabase db reset && supabase test db`; step 8 = compare seed totals with the prototype's `/dev/data`.

---

### P2 — RPCs: `save_booking`, `create_invoice`, `cancel_booking`

**Feature**
- `next_invoice_number(year)` (row-locked counter → `INV-YYYY-NNNN`) and `next_booking_ref(year)`.
- `save_booking(payload)`: one transaction — upsert booking, replace items, replace `booking_crew`; new bookings start `draft`; recomputes total server-side (rule 2); rejects `total < total_paid` (rule 10), canceled bookings (rule 12), a **newly picked** archived package (rule 13); snapshots package name + price on pick.
- `create_invoice(booking_id, type, dp_method, dp_value, amount)`: `SELECT … FOR UPDATE` on the booking, server recompute, `validateInvoice` rules (rule 8: DP ≤ total, Partial < remaining, Paid = remaining; first invoice DP/Full only, follow-ups Partial/Paid only), number allocation, snapshot JSON + sha256 hash, insert, recompute status; returns invoice + new booking status.
- `cancel_booking(booking_id, reason?)`: only `draft` / `partially_paid`, sets `canceled_at/by/reason` (≤ 255), terminal.
- **Typed errors:** every rejection raises a SQLSTATE + message code that maps 1:1 to the prototype's `BookingErrorCode` / `InvoiceError` (`required`, `length`, `invalid`, `archived`, `too_long`, `below_paid`, `canceled`, …) so the UI error mapping does not change.
- Rounding: half-up integer DP in SQL must equal `calc.ts` `dpAmount` for every PLAN §3 case (0 %, 100 %, 33.33 %…).
- **Done when:** PG2 + PG3 green, and a concurrency test (two parallel `create_invoice` on one booking) lets exactly one succeed.

**Prompt**
```
Slice P2 of context/PRODUCTION-PLAN.md. Read PRD §2.4 (rules 1–13), PLAN §2.3–§2.5, §3 and PRD §5.2
(concurrency risk), plus prototype src/lib/booking/calc.ts and src/lib/data/repo.ts (saveBooking,
createInvoice, cancelBooking, validateBookingInput).
Write supabase/migrations/002_rpcs.sql with next_invoice_number, next_booking_ref, save_booking,
create_invoice and cancel_booking exactly as PLAN §2 describes. Error codes must equal the prototype's
BookingErrorCode / InvoiceError values. Extract the PLAN §3 test matrix and every PRD §2.4 rule into one
shared vectors file (tests/vectors/*.json) and run it against calc.ts, the mock repo and the RPCs
(npm run test:parity). Add a concurrency test with two parallel create_invoice calls and a rounding test
for percentage DP. Finish with §1 step 9.
```

**Workflow**
Standard loop; step 5 = pgTAP + parity; run `security-review` on the SQL (SECURITY DEFINER vs INVOKER decisions are written in the slice log).

---

### P3 — Data access layer: Supabase repo behind the prototype contract

**Feature**
- `src/lib/data/` gets a second implementation: `supabase/*` with the **same exported function names and result shapes** as `repo.ts` (`listBookings`, `getBooking`, `saveBooking`, `createInvoice`, `saveBookingAndCreateInvoice`, `cancelBooking`, `listPackages`, `savePackage`, `archivePackage`, `restorePackage`, `listCrew`, `getKpis`, `getUpcoming`, `getCrewSchedule`, `getInvoiceSnapshot`, `getSettings`, profile + auth). `DATA_SOURCE` selects the implementation (§0.4).
- Where the prototype passes the whole `Db` into helpers (`computeKpis(d)`, `filterBookings(d, q)`), introduce query-shaped functions (`getKpis(ym)`, `listBookings({ range, filters, sort, page })`) and update the call sites in `app/bookings/page.tsx`, `BookingCalendar`, `MonthCalendar`, `WeekCalendar`, `DayCalendar`, `BookingTable`, `UpcomingRail`, `DayPopover`, `CrewSchedule`. **Rendering and URL contracts stay identical.**
- Server/client split: reads in Server Components or cached server functions (respect `cacheComponents`), writes as Server Actions that call the RPCs and return typed results; loading states reuse the F17 `Skeleton` / `Loader`; network failures map to the existing `NetworkError` UI (Package 06, Bookings 23 / 37).
- Row mapping lives in one place (`mappers.ts`): snake_case ↔ camelCase, `bigint` ↔ `number` (money is `bigint`; guard `Number.MAX_SAFE_INTEGER`), `date`/`timestamptz` ↔ `ISODate`.
- The mock implementation stays and remains the default for `npm run visual`.
- **Done when:** PG1 + PG3 green, PG6 unchanged, and `/bookings`, `/packages`, `/bookings/new` run end-to-end against local Supabase with the seed (read + write) with the UI untouched.

**Prompt**
```
Slice P3 of context/PRODUCTION-PLAN.md. Read §0.1–§0.4, PLAN §6 and the whole of prototype
src/lib/data/repo.ts, store.ts and every file that imports it (grep "lib/data/repo" and "getDb").
Create the Supabase-backed implementation next to the mock one behind DATA_SOURCE, with identical
function names and return shapes, using @supabase/ssr (fetch current docs via Context7) and Next.js 16
Server Components / Server Actions (read node_modules/next/dist/docs first).
Replace every place that hands the whole Db to a helper with query-shaped functions
(range-bounded calendar, server-side sort + pagination, KPIs, upcoming rail, crew schedule) and update
the call sites without changing markup, classes, URLs or copy. Keep the mock source selectable and make
npm run visual still use it. Run npm run test:parity, npm test and a Playwright smoke on local Supabase.
Finish with §1 step 9.
```

**Workflow**
Standard loop; biggest refactor in the plan — land it in small PRs by seam: (a) packages, (b) reads, (c) writes, (d) profile. Step 5 includes PG6 only if asked (§0.5).

---

### P4 — Auth, session, roles, Account

**Feature**
- Supabase Auth with `@supabase/ssr`: cookie session, `proxy`/middleware refresh, route guard (everything except `/login` redirects with `?next=`, INTERACTIONS 6.5), `redirect to ?next= or /bookings` after login.
- Login errors E1–E6 from **real** auth errors (wrong credentials, locked, network, expired session E4 with prefilled email); **Forgot password?** keeps the Info alert E7 (no self-service reset, PRD §4.3).
- `profiles` row created on first sign-in (trigger on `auth.users`); `role` ∈ `admin | viewer` from the workspace membership (D3); `useIsViewer()` reads the real role; `/dev/role` is removed from production.
- Account (US-13, PLAN §8b): change name (zod 2–50 trimmed + DB check; header and menu update), change password (re-verify current password, rules checklist client + server, **sign out other sessions** with scope `others`, `password_changed_at`), log out → `/login?loggedOut=1` after the leave guard.
- Login hardening: rate limit / lockout via Supabase Auth settings, generic error text (no account enumeration).
- **Done when:** PG4 (auth part) + PG5 green for Launchpad A–B and Profile A–D, an unauthenticated request to any app route or API returns a redirect / 401, and a viewer cannot reach a write path.

**Prompt**
```
Slice P4 of context/PRODUCTION-PLAN.md. Read PRD §4.3, §4.4, US-13, PLAN §8b, INTERACTIONS 6.5–6.10
and prototype src/lib/data/repo.ts (login, logout, hasSession, getProfile, updateDisplayName,
changePassword), src/lib/role.ts and src/app/login.
Fetch current Supabase Auth + @supabase/ssr docs with Context7 and read the Next.js 16 proxy/middleware
docs in node_modules before coding. Implement Supabase Auth with cookie sessions, the route guard with
?next=, the real login error mapping (E1–E6), profiles + role, change name, change password (re-verify,
sign out other sessions), and log out through the leave guard. Remove /dev/role and the mock session from
production builds. Test every login/profile lane with Playwright against local Supabase and run
security-review on the diff. Finish with §1 step 9.
```

**Workflow**
Standard loop; add `security-review` at step 6. E2E: Launchpad A–B, Profile A–D, plus "viewer cannot write" and "expired session".

---

### P5 — Package Library live

**Feature**
- `/packages` reads and writes through the Supabase repo: list by Active / Archived tab, search, pagination, create / edit with validation (duplicate **active** name → unique partial index + typed error, price ≥ 0, description ≤ 1000), archive / restore (`is_active`, `archived_at`), save-failed + Try again.
- `listPackages({ tab: "active" })` is the same function the booking picker uses (archived hidden, empty library state).
- Viewer: New / Edit / Archive hidden in UI **and** rejected by RLS (P10 verifies).
- "n bookings" column = real count of bookings per package (view or aggregate), replacing `legacyBookings`.
- **Done when:** INTERACTIONS 5.1–5.11 and Package lanes A–D pass on staging (PG5); PG3 for the package rules.

**Prompt**
```
Slice P5 of context/PRODUCTION-PLAN.md. Read PRD US-0, PLAN §4, INTERACTIONS 5.1–5.11 and prototype
src/app/packages, src/components/**/Package*, and savePackage / archivePackage / restorePackage /
listPackages in repo.ts.
Wire /packages to the Supabase repo (DATA_SOURCE=supabase) with a partial unique index on active package
names, real booking counts, archive/restore, and typed errors mapped to the existing field errors.
Do not change markup or copy. Run the Package lanes A–D with Playwright against local Supabase,
then against staging. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: Package A (edit + fail), B (create + validation loop), C (archive / restore), D (empty states) — the fail branch uses a real forced error (e.g. a test-only RPC fault flag in staging), not `?fail=`.

---

### P6 — Bookings read path: dashboard, calendar, table, filters, detail

**Feature**
- KPI row (US-12 rules: Canceled excluded; month = current real month), Upcoming rail (next 7 days, Canceled hidden), insight rules (`lib/booking/insights.ts` unchanged, fed by queries).
- Calendar: month / week / day load **only the visible range** (+ outside-month days shown in the grid); "+N more", day popover, crew avatars → `getCrewSchedule(crewId)`. Canceled hidden unless the status filter includes it.
- Table: server-side sort (default booking date asc) and pagination 10 / 25 / 50; row → detail; no actions menu (1.22).
- Search with the 250 ms debounce hitting the trigram indexes (`client_name`, `booking_name`, `client_phone`, `ref`); filters Status (incl. Canceled), Crew (multi, OR), Package, Date range / presets, chips, Reset — all in the URL as today (`useBookingFilters`).
- Detail: side sheet via `?booking=<id>` and full page `/bookings/[id]` (PLAN §7 note), invoices newest first, crew schedule popover.
- Queries return the minimum columns (no `snapshot` JSON in list views).
- **Done when:** INTERACTIONS 1.x, 4.x (read parts) and lanes C, D, E, F pass on staging; PG3 for KPI / status derivation; PG7 for month and table queries on the 10k seed (measured in P11).

**Prompt**
```
Slice P6 of context/PRODUCTION-PLAN.md. Read PRD US-6–US-9, US-12 (KPI rules), PLAN §6 and §7,
INTERACTIONS 1.x and 4.1–4.10, plus prototype src/lib/booking/filters.ts, insights.ts and
src/components/bookings/*.
Implement the production queries behind the P3 contract: month/week/day by date range, table sort +
pagination, trigram search, multi-crew filter, KPIs, upcoming rail, crew schedule, detail. Select only
the columns each view needs. Keep useBookingFilters and every URL param unchanged. Write parity tests that
run the same filter/sort/KPI cases against the mock repo and the Supabase repo, then run lanes C, D, E, F
on local Supabase. Finish with §1 step 9.
```

**Workflow**
Standard loop. Parity: the 40-booking seed gives identical KPI / table / calendar output from both sources.

---

### P7 — Booking write path: new, edit, cancel

**Feature**
- `/bookings/new` → Save booking calls `save_booking` (status Draft, toast, switch to edit mode); validation summary "n fields need attention" fed by server error codes as well as zod (zod stays for instant feedback; server is authoritative).
- `/bookings/[id]/edit`: diff strip, updated totals, total-below-paid guard (rule 10) shown inline from the server code `below_paid`; archived package kept on edit (rule 13); crew replace; T&C ≤ 255.
- Cancel booking: section visible only for saved Draft / Partially paid, hidden for Paid / unsaved / viewer; modal with optional reason ≤ 255; after: status Canceled, edit redirects to detail, KPIs and calendar respect US-12.
- Optimistic concurrency: `updated_at` (or a `version` column) is sent with the save; a stale save returns `conflict` and the UI shows a reload notice (new copy → add to INTERACTIONS and Figma note before building).
- Leave guard, `beforeunload` and live summary (< 50 ms) are unchanged: calculation stays client-side for preview, server re-validates (PRD §4.4).
- **Done when:** INTERACTIONS 2.x and 4.11, lanes A1 → A2 → Save (Draft), B3, G, H pass on staging; PG3 green on rules 2, 9, 10, 12, 13.

**Prompt**
```
Slice P7 of context/PRODUCTION-PLAN.md. Read PRD US-1, US-4, US-5, US-12, §2.4, PLAN §5, §7,
INTERACTIONS 2.1–2.18 and 4.11, plus prototype src/components/booking-form/* and src/lib/booking/form.ts.
Wire save, edit and cancel to save_booking / cancel_booking through Server Actions. Map every server error
code to the existing field/summary errors. Add optimistic concurrency (updated_at/version) and the single
new "changed by someone else" notice — first write the copy into INTERACTIONS.md and ask me to approve it.
Keep the live summary client-side. Test lanes A (Draft only), B3, G and H on local Supabase, plus two
browser contexts editing the same booking. Run security-review. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: A1 → A2 → Save, B1 → B3, G (all exits, pristine = no prompt), H1 → H4 and the "no section" cases, stale-save.

---

### P8 — Workspace Settings integration

**Feature**
- Bank / payment receiver details and default Terms & Conditions come from the existing workspace Settings (D4) via one adapter `getSettings()` (the prototype already has this function; production implements it). New bookings prefill `terms` and `payment_instruction` from it.
- **Business information** (name, address, email, phone, logo — PRD US-14) is edited in this module on Account settings and stored in `workspace_settings` (PRD §4.2), whatever D4 decides for the bank / terms: `getBusiness()` / `updateBusiness()` (admin-only write by RLS), the logo in a Storage `branding/` bucket (PNG/JPEG ≤ 1 MB, validated server-side, signed URL). Add Profile lane E to PG5.
- If D4 = own table: `workspace_settings` (single row per workspace), admin-only edit page is **not** in scope — seed it, and document how to change it until the Settings module owns it.
- Bank details, terms and the booking figures are read at invoice creation and **frozen in the snapshot**. The **business block** (Brand row + From block) is the one exception (decided 2026-11-14, PRD US-10 / US-14): the PDF route reads the *current* business information every time it renders. Stored PDFs in Storage are therefore re-rendered when the business changes (or rendered on demand and not cached) — pick one in P9 and test it.
- Resolves PRD open question 3 (which bank / terms text): write the decision in PRD §5.3.
- **Done when:** a booking created in staging shows the real business and bank details in its PDF, and changing a bank / terms setting does not change an existing invoice, while changing the business information updates the Brand row of the next download.

**Prompt**
```
Slice P8 of context/PRODUCTION-PLAN.md. Read PRD §4.3 (Settings), US-10, §5.3 question 3, and prototype
getSettings() in repo.ts and seed.ts settings.
Using decision D4 from production/docs/slices/P00.md, implement getSettings() against the real workspace
Settings (or the workspace_settings table if D4 says so), prefill terms and payment instruction on new
bookings, and make createInvoice read the settings once and store them in the snapshot. Add a test that
changes a setting after an invoice exists and asserts the old snapshot and hash are unchanged.
Update PRD §5.3. Finish with §1 step 9.
```

**Workflow**
Standard loop; ask for the Settings access details (D3/D4) at step 1 if they are not in P00.md.

---

### P9 — Invoices + PDF: create, snapshot, Storage, signed URLs

**Feature**
- `createInvoice` / `saveBookingAndCreateInvoice` call `create_invoice` (P2): modal states (DP / Full, Partial / Paid), inline errors, loading (22), failure + Try again (23), card appears at top, status updates (Partially paid / Paid), toast.
- PDF: `InvoiceDocument` rendered **on the server** (Node runtime route `/api/invoices/[id]/pdf`) from `invoice.snapshot` only; Inter font files bundled, token colours from `lib/pdf/tokens.ts`; file name `INV-YYYY-NNNN_{client-slug}.pdf` (no phone number, PRD §4.4).
- Generate once on confirm, upload to private bucket `invoices/`, store `pdf_path`, serve through a **10-minute signed URL** (PRD §4.3); if the file is missing, regenerate from the snapshot and verify the figures equal the stored hash.
- Generation failure → dialog 37 with Try again / Cancel; the invoice is never rolled back (US-10).
- Download from card (2.14, 4.6) and Download latest PDF (4.2).
- **Done when:** lane A (DP, Full, E1), B4 → B6 and A5 / A5b pass on staging; PG4 for the bucket (a viewer can download, anon cannot; an expired URL fails); regenerating an old invoice gives identical figures; two parallel invoice creations yield one invoice.

**Prompt**
```
Slice P9 of context/PRODUCTION-PLAN.md. Read PRD US-2, US-3, US-10, §4.3 (Storage), §4.4, PLAN §8,
INTERACTIONS 2.11, 2.14, 3.1–3.8, 4.2, 4.6, 4.12, and prototype src/components/pdf/InvoiceDocument.tsx,
src/lib/pdf/*, src/lib/data/ledger.ts.
Wire the invoice modal to create_invoice. Move PDF generation to a Node-runtime route handler that renders
@react-pdf from the snapshot only, uploads to the private invoices/ bucket (Storage policies in a
migration), saves pdf_path and returns 10-minute signed URLs; regenerate when the file is missing.
Keep dialog 37 for failures and never roll the invoice back. Register Inter from files bundled with the
app. Test: PDF → PNG compare against the prototype render for 11 / 11b / 11c, snapshot immutability after a
booking edit, expired URL, parallel create_invoice, lanes A and B. Run security-review. Finish with §1 step 9.
```

**Workflow**
Standard loop. G3-style compare for the PDF reuses the F15 `pdfjs-dist` + `pixelmatch` helper.

---

### P10 — Security hardening: RLS audit, viewer enforcement, PII, headers

**Feature**
- RLS on every table, default deny. Expected matrix (anon / viewer / admin):

| Table | anon | viewer | admin |
|---|---|---|---|
| `packages`, `crew`, `bookings`, `booking_items`, `booking_crew`, `invoices`, `profiles` (own row) | none | select | select |
| writes to `packages`, `bookings`, `booking_items`, `booking_crew` | none | none | via RPC / policy only |
| `invoices` insert | none | none | via `create_invoice` only; no update except `pdf_path`; no delete |
| `invoice_counters`, `workspace_settings` | none | none | none direct (RPC / service role only) |
| Storage `invoices/` | none | signed URL read | signed URL read + server write |

- Viewer role enforced **server-side in every RPC and Server Action** (not only hidden buttons, INTERACTIONS 6.4).
- PII (PRD §4.4): phone numbers only for authenticated staff; never in file names, URLs, logs or Sentry breadcrumbs (scrubber); `wa.me` link built client-side from the phone already on screen.
- Money re-validation: any client-sent amount is recomputed; mismatches return a typed error (PRD §4.4).
- Headers: CSP (self + Supabase + Sentry), `frame-ancestors`, `Referrer-Policy`, `X-Content-Type-Options`; cookies `Secure`, `HttpOnly`, `SameSite=Lax`; Server Actions origin check; service-role key only in server env, grep-checked out of the client bundle.
- Dependency audit (`npm audit --omit=dev`), secret scan in CI, `security-review` on the whole branch.
- **Done when:** PG4 green with the matrix above encoded as `npm run test:rls`, no finding above "low" open.

**Prompt**
```
Slice P10 of context/PRODUCTION-PLAN.md. Read PRD §4.4 and the RLS matrix in §3 P10 of this file.
Audit every migration and Server Action. Write npm run test:rls: for anon, viewer and admin JWTs, try
select/insert/update/delete on every table and call every RPC, and assert allow/deny per the matrix.
Add server-side role checks to every write path, scrub phone numbers from logs and Sentry, set CSP and
security headers (read the Next.js 16 headers docs in node_modules), add a CI step that fails if the
service-role key or any SUPABASE_SERVICE_* string appears in .next/static. Run security-review on the
branch and fix everything above low. Finish with §1 step 9.
```

**Workflow**
Standard loop; step 6 = `security-review` is mandatory, findings logged with severity.

---

### P11 — Performance: 10k seed, indexes, caching, budgets

**Feature**
- Load generator: 10 000 bookings, 25 000 invoices, 6 crew, 50 packages on staging (`supabase/perf-seed.sql`, never run in prod).
- Budgets (PRD §4.5): month query < 200 ms, table page < 300 ms, live calc < 50 ms/keystroke; plus app budgets proposed here: LCP < 2.5 s and INP < 200 ms on `/bookings` at 1440 on staging; PDF route < 2 s p95.
- `EXPLAIN (ANALYZE)` for the five hot queries (month range, week range, table page with filters, trigram search, KPIs) recorded in the slice log; add or fix indexes (`bookings(booking_date, status)`, `booking_crew(crew_id)`, `invoices(booking_id, created_at desc)`, GIN trgm); KPI aggregation as a SQL view or RPC, not row transfer.
- Caching: `cacheComponents` / tags for read-heavy server functions with tag invalidation on every write action; no stale KPI after a save.
- Bundle: client components that pulled `lib/data/seed.ts` / fixtures into the browser are code-split out; production JS size recorded.
- **Done when:** PG7 numbers in the slice log meet every budget on the 10k seed.

**Prompt**
```
Slice P11 of context/PRODUCTION-PLAN.md. Read PRD §4.5 and PLAN §6.
Create supabase/perf-seed.sql (10k bookings, 25k invoices) for staging only. Measure with EXPLAIN ANALYZE:
month range, week range, table page with 3 filters + sort, trigram search, KPIs. Fix indexes and queries
until month < 200 ms and table < 300 ms. Add cache tags and invalidate them from every write action.
Check that seed/fixture code is not in the client bundle (next build analysis). Measure LCP/INP on
/bookings with Lighthouse CI against staging. Write the numbers in production/docs/slices/P11.md.
Finish with §1 step 9.
```

**Workflow**
Standard loop; step 5 = measured numbers, not "feels fast".

---

### P12 — Full regression: all lanes on staging, a11y, visual guard

**Feature**
- Every hi-fi lane (Bookings A–H, Package A–D, Launchpad A–B, Profile A–E) as one Playwright suite against staging with a clean seed per run (reset RPC available on staging only).
- Fix the open F17 items before launch: the 53 inherited G3 failures (dialog centring + login background are fixed in Figma, PNGs need re-export — PROTOTYPE-PLAN §4.1), the open a11y items (contrast tokens, 2 ARIA fixes); the contrast-token change needs a Figma/design decision first — ask for it, do not pick colours.
- PG6 visual guard on the mock source: no regression introduced by P3–P11.
- Keyboard-only walk of the calendar grid and every dialog; reduced-motion pass; WCAG 2.2 AA contrast (`better-accessibility` / `antislop-human` skills).
- Cross-browser smoke (Chromium, WebKit, Firefox) for login, create booking, invoice, PDF download.
- **Done when:** all suites green, INTERACTIONS 96/96 verified against the live backend, PG5 + PG6 green, a11y items closed or explicitly accepted by the user.

**Prompt**
```
Slice P12 of context/PRODUCTION-PLAN.md. Read PROTOTYPE-PLAN §4 (F17 row) and §4.1, INTERACTIONS summary,
PLAN §9.
Run every hi-fi lane (Bookings A–H, Package A–D, Launchpad A–B, Profile A–E) against staging as one
Playwright suite with a clean seed per run. List the open F17 items (inherited G3 failures, contrast tokens,
2 ARIA fixes), fix the ones that need no design decision, and stop to ask me for the contrast-token
decision. Run the visual suite on the mock source only if I confirm the Figma PNGs were re-exported.
Add keyboard-only and reduced-motion passes and a WebKit/Firefox smoke. Write the final report in
production/docs/slices/P12.md. Finish with §1 step 9.
```

**Workflow**
Standard loop; any failure reopens the slice that owns the broken behaviour.

---

### P13 — Operations: monitoring, backups, reconciliation, runbook

**Feature**
- Error monitoring (Sentry) for client + server with release tags and the PII scrubber from P10; structured server logs with request ids; uptime check on `/login` and a signed-in health route.
- Database: PITR / daily backups enabled on production, **one restore rehearsal** on staging recorded; migration rollback notes per migration; connection pooling settings.
- **Reconciliation** (PRD success criterion #3): nightly job that checks, per booking, `bookings.total` = package + Σ items, `total_paid` = Σ non-void invoices, `status` matches PRD §2.5, invoice snapshot hash matches a recomputed hash, no gaps in `INV-YYYY-NNNN` per year. Failures notify a channel and fail loudly.
- Alerts: error-rate spike, failed PDF generation, failed reconciliation, auth error spike.
- Runbook `production/docs/RUNBOOK.md`: deploy, roll back, restore, rotate keys, reset a user's password (admin path, since there's no self-service reset), investigate a wrong total.
- **Done when:** a deliberately corrupted row on staging is caught by the nightly check, an alert fires, and the restore rehearsal is written up.

**Prompt**
```
Slice P13 of context/PRODUCTION-PLAN.md. Read PLAN §9 and PRD §5.2, §4.4.
Add Sentry (client + server, with the phone-number scrubber), structured logs, an uptime check, and the
nightly reconciliation job (SQL function + scheduled run) that verifies total, total_paid, status, snapshot
hash and invoice-number continuity for every booking and alerts on any mismatch. Enable and document
backups/PITR, do a restore rehearsal on staging, and write production/docs/RUNBOOK.md. Prove the check by
corrupting one row on staging. Finish with §1 step 9.
```

**Workflow**
Standard loop; step 8 = break something on staging on purpose and watch the alert.

---

### P14 — UAT, cut-over and launch

**Feature**
- UAT on staging with the real users (admin + the Owner as viewer): a script of the hi-fi lanes in plain language, a defects list with owner and severity, sign-off recorded in the slice log.
- Production environment: secrets set, domain + TLS, auth redirect URLs, first admin and viewer accounts created by an admin path (no self-signup), seed **not** applied (D5) — or import done (P14b if D5 changed).
- Launch checklist: PG1–PG7 all green on the release commit; migrations applied in order; smoke on production (login → create booking → DP invoice → PDF → cancel a test booking, then clean up through an admin path that is logged); feature entry point enabled in the App launcher (Booking and Package Lib tiles).
- Rollback plan rehearsed: previous deploy re-promoted; database changes are forward-only, so each migration has a documented compensating step.
- Hypercare (first 2 weeks): daily check of errors and the reconciliation result; defects triaged; v1.1 backlog started from PRD §5.1 (void invoice, tablet / mobile, refunds, discounts / VAT, send by WhatsApp / email, CSV export).
- **Done when:** sign-off recorded, production live, first real booking + invoice created and reconciled.

**Prompt**
```
Slice P14 of context/PRODUCTION-PLAN.md. Read §0.6, §4 and the RUNBOOK.
Prepare the UAT script from the hi-fi lanes (plain language, one page per lane) and a defects table in
production/docs/slices/P14.md. Then produce the release checklist: confirm PG1–PG7 results from the tracker,
production env + secrets list (names only, no values), auth redirect URLs, first accounts, migration order,
smoke test steps and the rollback steps. Do not deploy to production, run production migrations or create
production users yourself — list each as a step for me to confirm. Update the tracker and PRD §5.1 when I
confirm launch. Finish with §1 step 9.
```

**Workflow**
Standard loop; production-touching steps are done by the user (or confirmed one by one).

---

## 4. Progress tracker

Gates per row: **Build** · **Review** (code-review / security-review) · **Unit** · **DB** (pgTAP + parity) · **E2E** (staging) · **Sec** (PG4) · **Perf** (PG7) · **Done**. `☐` = not started, `—` = not applicable. **Prompt** links to the slice's paste-ready prompt in §3.

| Slice | Prompt | Build | Review | Unit | DB | E2E | Sec | Perf | Done |
|---|---|---|---|---|---|---|---|---|---|
| P0 Foundations & build hygiene | [P0](#p0--foundations-repo-ci-environments-production-build-hygiene) | ☐ | ☐ | ☐ | — | — | — | — | ☐ |
| P1 Database schema | [P1](#p1--database-schema-triggers-indexes-seed-types) | ☐ | ☐ | — | ☐ | — | — | — | ☐ |
| P2 RPCs | [P2](#p2--rpcs-save_booking-create_invoice-cancel_booking) | ☐ | ☐ (+security) | ☐ | ☐ | — | — | — | ☐ |
| P3 Data access layer | [P3](#p3--data-access-layer-supabase-repo-behind-the-prototype-contract) | ☐ | ☐ | ☐ | ☐ | ☐ (smoke) | — | — | ☐ |
| P4 Auth, roles, Account | [P4](#p4--auth-session-roles-account) | ☐ | ☐ (+security) | ☐ | ☐ | ☐ | ☐ | — | ☐ |
| P5 Package Library live | [P5](#p5--package-library-live) | ☐ | ☐ | ☐ | ☐ | ☐ | — | — | ☐ |
| P6 Bookings read path | [P6](#p6--bookings-read-path-dashboard-calendar-table-filters-detail) | ☐ | ☐ | ☐ | ☐ | ☐ | — | ☐ | ☐ |
| P7 Booking write path | [P7](#p7--booking-write-path-new-edit-cancel) | ☐ | ☐ (+security) | ☐ | ☐ | ☐ | — | — | ☐ |
| P8 Workspace Settings | [P8](#p8--workspace-settings-integration) | ☐ | ☐ | ☐ | ☐ | ☐ | — | — | ☐ |
| P9 Invoices + PDF | [P9](#p9--invoices--pdf-create-snapshot-storage-signed-urls) | ☐ | ☐ (+security) | ☐ | ☐ | ☐ | ☐ | — | ☐ |
| P10 Security hardening | [P10](#p10--security-hardening-rls-audit-viewer-enforcement-pii-headers) | ☐ | ☐ (+security) | — | ☐ | — | ☐ | — | ☐ |
| P11 Performance | [P11](#p11--performance-10k-seed-indexes-caching-budgets) | ☐ | ☐ | — | ☐ | — | — | ☐ | ☐ |
| P12 Full regression | [P12](#p12--full-regression-all-lanes-on-staging-a11y-visual-guard) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| P13 Operations | [P13](#p13--operations-monitoring-backups-reconciliation-runbook) | ☐ | ☐ | — | ☐ | — | — | — | ☐ |
| P14 UAT + launch | [P14](#p14--uat-cut-over-and-launch) | ☐ | ☐ | — | — | ☐ (prod smoke) | — | — | ☐ |

**Release readiness** (all must be ✅ before P14 sign-off):

| Gate | Status | Evidence (link to slice log / CI run) |
|---|---|---|
| PG1 Static | ☐ | |
| PG2 Database | ☐ | |
| PG3 Parity | ☐ | |
| PG4 Security | ☐ | |
| PG5 E2E real | ☐ | |
| PG6 Visual regression | ☐ | |
| PG7 Performance | ☐ | |
| Backups restored once | ☐ | |
| Reconciliation caught a planted error | ☐ | |
| UAT signed off | ☐ | |

### 4.1 Carried over from the prototype (not production work, but gates launch)

| Item | Source | Owner slice |
|---|---|---|
| F15 marked ⚠: `motion.css` G1 issue "other session" | PROTOTYPE-PLAN §4 F15 | P0 (clean up) |
| F17: 53 inherited G3 failures; Figma PNGs need re-export after the 2026-11-14 design sync | PROTOTYPE-PLAN §4, §4.1 | P12 |
| F17: contrast tokens + 2 ARIA fixes open; contrast needs a design decision | PROTOTYPE-PLAN §4 F17 | P12 |
| F17: G2 column unchecked (`☐`) | PROTOTYPE-PLAN §4 F17 | P12 |
| Tablet / mobile layouts and void-invoice dialog not designed | PRD §5.1 v1.1 | out of scope |

## 5. Coverage check (sync with the other docs)

- **PRD business rules 1–13:** rule 1 (bigint) → P1 · 2 (derived total) → P1, P2 · 3, 4 (append-only, immutable) → P1 · 5 (numbering) → P2 · 6, 7 (invoice count, status) → P1, P2 · 8 (invoice amounts) → P2, P9 · 9 (item limits) → P1, P2 · 10 (below paid) → P2, P7 · 11 (date change visible) → P6, P7 · 12 (canceled terminal) → P2, P7 · 13 (archived packages) → P2, P5.
- **PRD stories:** US-0 → P5 · US-1 → P7 · US-2, US-3 → P9 · US-4, US-5 → P7, P9 · US-6, US-7, US-8, US-9 → P6 · US-10 → P8, P9 · US-11 → P4 (launcher entries enabled in P14) · US-12 → P2, P6, P7 · US-13 → P4 · §4.3 Login → P4.
- **PRD §4.4 security** → P10 · **§4.5 non-functional** → P11 (perf), P12 (a11y).
- **PLAN sections:** §1 → P0 · §2 → P1, P2 · §3 → P2 (parity) · §4 → P5 · §5 → P7, P9 · §6 → P6 · §7 → P6, P7 · §8 → P9 · §8b → P4 · §9 → P12, P13.
- **Hi-fi lanes:** Bookings A (P7 Draft, P9) · B (P7, P9) · C, D, E, F (P6) · G, H (P7) · Package A–D (P5) · Launchpad A–B, Profile A–D (P4), Profile E (P8) — all re-run together in P12.
- **Risks (PRD §5.2):** concurrent invoices → P2 test · rounding → P2 parity · package price drift → P1/P2 snapshot · PDF cost / cold start → P9, P11 · naming confusion → unchanged glossary.
- **Out of scope (as in PRD §5.1 / PLAN "Deferred"):** tablet & mobile, void invoice, refunds, VAT / discounts, WhatsApp / email sending, payment gateway, client portal, per-booking due date (D9).
