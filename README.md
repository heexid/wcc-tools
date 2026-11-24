# wcc-tools · WCC & ECC Booking module

A **Booking & Invoice Management** module for the WCC & ECC (Wedding Content Creator and Event Content Creator) internal-tools shell. One record per booking (client, package, extra items, date and event details, crew), live money calculation, and invoices that never change once issued (DP / Full / Partial / Paid). Bookings show in a Calendar (month / week / day) and a Table. A Package Library and Account settings come with it.

**Why:** bookings, prices, deposits and follow-up payments were tracked across chats, spreadsheets and one-off invoices. Totals were added up by hand, deposits got mixed up with full payment, and editing a booking quietly changed what old invoices said.

**Built in two phases:**
1. **Prototype (F0–F18):** front end only, pixel-matched to Figma at 1440 px, running on a mock data layer in the browser.
2. **Production (P0–P14):** the same UI on Supabase (Postgres, Auth, Storage), with no visual or behaviour change.

---

## Repo layout

| Path | What it is |
|---|---|
| `app/` | The Next.js app (it was `prototype/` until 2026-11-16). UI, domain logic, mock and Supabase data layers, PDF, tests. |
| `app/docs/slices/Fxx.md` | Prototype slice logs: decisions, gate results, motion lists. |
| `supabase/` | Migrations, seeds (`seed.sql`, `perf-seed.sql`, `seed.local-users.sql`), pgTAP tests, and `setup-production.sql` (one-shot setup). |
| `production/docs/slices/Pxx.md` | Production slice logs (P00–P11 so far). |
| `context/` | The source-of-truth docs. See [Documentation](#documentation). |
| `agents/` | Working docs: `DEPLOY.md` (deploy guide), `FEATURES.md` (plain-language feature guide), `dummy.md` (SQL to insert sample bookings), `marketings/` (marketing and pricing), `promotions/` (promo video scenes). |
| `agents/CREDENTIALS.md` | Local only and gitignored. Never commit it. |
| `mascot/` | Standalone preview of the CIR login mascot (three.js): every state, reactions, sizes and a mock login. It loads the app's own `app/src/components/login/mascotScene.js`. See [`mascot/README.md`](mascot/README.md). |
| `references/` | Reference images. |
| `.github/workflows/ci.yml` | CI: typecheck, lint, G1, unit tests, build, Supabase stack and pgTAP. |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 (tokens generated from the CIR design system) · react-hook-form + zod · `@react-pdf/renderer` · three.js (login mascot) · Supabase (`@supabase/ssr`, Postgres, Auth, Storage) · Vitest · Playwright · Vercel.

Money is always IDR, stored as whole Rupiah (`bigint`) and shown as `Rp 1.250.000`. The UI is in English with `id-ID` number and date formats. Layouts: desktop at 1440 px, and mobile below 768 px with its own type scale (see [Mobile layouts](#mobile-layouts)). Tablet (768–1279 px) uses the desktop layouts with tablet-sized controls.

## Run it locally

```bash
cd app
npm install
npm run dev            # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Playwright interaction tests, on mock data |
| `npm run e2e:supabase` | Playwright against the local Supabase stack |
| `npm run visual` | Pixel gates (G2 / G3) against the Figma PNGs. Only run when asked (see below). |
| `npm run g1` | Token check: no raw hex or px outside `tokens.css` |
| `npm run typecheck` · `npm run lint` · `npm run build` | Static checks |
| `npm run db:test` · `npm run test:rls` · `npm run test:parity` · `npm run perf` | Database tests (pgTAP), the RLS matrix, mock ⇄ SQL parity, and performance budgets |

- **Data source:** `DATA_SOURCE=mock|supabase`. The mock source keeps the prototype runnable and backs the visual tests. A production build can't select it.
- **Frozen clock:** test builds treat "today" as **Tue 10 Nov 2026** (`NEXT_PUBLIC_TODAY`).
- **Testing rule (2026-11-14):** when asked to test, run unit, DB and e2e tests only. Don't re-export the Figma PNGs or re-run the visual tests unless explicitly asked.

To deploy, follow [`agents/DEPLOY.md`](agents/DEPLOY.md). For local env values, copy `app/.env.example` to `app/.env.local`.

## Product at a glance

| Area | What it does | PRD |
|---|---|---|
| Login | Email and password. No self-service reset ("ask your workspace admin"). Sessions end at 00:00 WIB every day. A live mascot reacts to the form: its eyes follow the cursor, it watches the caret while you type the email, closes its eyes for the password (peeks when you show it), and looks worried on errors. | §4.3 |
| App launcher | ⋮⋮ popover to switch between Booking and Package Lib (Bookmark is "Coming soon"). | US-11 |
| Package Library | Create, edit, archive and restore packages. Duplicate active names are blocked. Description up to 1000 characters. | US-0 |
| New / Edit booking | One form. **Client & schedule** first: client, phone (`+62…`), booking name, booking date, optional **event start** (30-minute time select), **location** and **notes** (up to 255 characters each). Then package, items, crew, and **Others**: payment instruction and T&C (up to 255 characters). Live summary. Asks before you leave with unsaved changes. | US-1, US-4 |
| Invoices | The first invoice is **DP** (% or fixed) or **Full**. Later ones are **Partial** or **Paid**. Each invoice is a frozen snapshot, counts as paid straight away, and is numbered `INV-YYYY-NNNN`. | US-2, US-3, US-5 |
| Status | Derived from the invoices: **Draft** → **Partially paid** → **Paid**. **Canceled** is the one manual status: final, and allowed only from Draft or Partially paid. | §2.5, US-12 |
| Dashboard | KPIs, Calendar (month / week / day), Table (sort, pagination), search, filters (status, crew, package, date), Upcoming rail, "Needs attention" cards. | US-6–US-8 |
| Booking detail | Read-only side sheet. Booking information follows the form's order (client, phone, date · start time, location, notes, package, crew, payment, created); empty event rows are hidden. Invoice cards, PDF downloads, and a crew schedule popover. | US-9 |
| Invoice PDF | A4, built from the snapshot only. Header: **Bill to** (client, phone) and **Event** (booking name, date · start time, location and notes, each cut to 2 lines so the invoice stays on one page). The brand row (business name, logo, address, contact) always uses the current business information. | US-10 |
| Account | Change name, change password (signs out your other sessions), log out, and edit business information (admin only). | US-13, US-14 |
| Roles | `admin` can do everything. `crew` sees everything but is read-only, enforced in the UI and by RLS. Every account has a crew entry, so admins can assign themself and filter by themself. Accounts are managed with SQL. | §4.3 |

**Out of scope for v1:** tablet-specific layouts, voiding an invoice, refunds, VAT and discounts, sending by WhatsApp or email, payment gateway, client portal, due dates for remaining balances.

---

## Progress tracker

*Last updated on 2026-11-23 from `context/`, the slice logs and git (`main` at `9a0214c`).*

### Overall

| Phase | Status |
|---|---|
| Design (Figma `bs internal tools`) | ✅ All screens, interaction states and hi-fi flows done. 96 of 96 interactions defined. |
| Prototype F0–F19 | ✅ All built. ⚠ Open: Figma PNG re-export, a11y contrast tokens, 2 ARIA fixes. |
| Mobile layouts R01–R09 | ✅ Designed in Figma, built and live on `main` (PR #6, then fixes and the mobile type scale). |
| Production P0–P11 | ✅ Built and tested on **local** Supabase. CI on GitHub (branch `production/p0-p10`). |
| Production P12–P14 | ☐ Not started: full regression on staging, operations, UAT and launch. |
| Release gates PG1–PG7 | ☐ Not yet signed off. They need a staging environment. |

### Prototype slices (F0–F19)

✅ done · ⚠ done with open items · 🟡 partly done

| Slice | Scope | Status |
|---|---|---|
| F0 | Scaffold, tokens, test harness | ✅ 2026-11-11 |
| F1 | Base CIR components and motion tokens | ✅ 2026-11-11 |
| F2 | Domain logic and mock data layer (122 tests) | ✅ 2026-11-11 |
| F3 | Login (P1–P3, E1–E7) | ✅ 2026-11-11 |
| F4 | App shell, App launcher, Account menu | ✅ 2026-11-11 |
| F5 | Package Library | ✅ 2026-11-11 |
| F6 | Bookings dashboard frame (KPIs, rail, tabs) | ✅ 2026-11-11 |
| F7 | Calendar · Month | ✅ 2026-11-11 |
| F8 | Calendar · Week and Day | ✅ 2026-11-11 |
| F9 | Table, search, filters | ✅ 2026-11-11 |
| F10 | New booking form and leave guard | ✅ 2026-11-11 |
| F11 | Invoice modal · first invoice | ✅ 2026-11-11 |
| F12 | Booking detail panel and crew schedule | ✅ 2026-11-11 |
| F13 | Edit booking and follow-up invoice | ✅ 2026-11-12 |
| F14 | Cancel booking | ✅ 2026-11-12 |
| F15 | Invoice PDF | ⚠ 2026-11-14: one PNG still needs re-exporting (dialog 37) |
| F16 | Account settings and log out | ✅ 2026-11-12 |
| F17 | Viewer role, loading states, full regression | 🟡 2026-11-14: 53 inherited visual failures waiting on a PNG re-export; a11y open |
| F18 | Business information → PDF brand row | ⚠ 2026-11-14: PNG re-export pending |
| F19 | Booking event details (event start, location, notes): form, detail sheet, invoice PDF, plus Supabase migration 013 | ⚠ 2026-11-21: PNG re-export pending ([log](app/docs/slices/F19.md)) |

### Mobile layouts

Started 2026-11-22 (it was deferred to v1.1). The admin often books from a phone while talking to a client on WhatsApp. Merged into `main` (PR #6) and deployed. Desktop (768 px and up) doesn't change: every mobile change sits behind `max-tablet:` / `tablet:` classes or `useIsMobile()`.

| Slice | Scope | Status |
|---|---|---|
| R01 | Breakpoint tokens (tablet 768, desktop 1280), larger 44 px controls and 16 px input text on mobile | ✅ on main |
| R02 | Figma mobile frames at 390 px: Bookings M01–M07 and ME1–ME4, Login ML1–ML3, shell MS1–MS3, Account MA1–MA5, Package Lib MP1–MP8 | ✅ in Figma |
| R03 | Mobile shell: top bar, launcher / account / log-out bottom sheets, login | ✅ on main |
| R04 | Bookings: list with search, filters and infinite scroll; agenda calendar that shows every day | ✅ on main |
| R05 | Booking form: one column, item cards, sticky Cancel / Save, invoice modal as a bottom sheet | ✅ on main |
| R06 | Booking detail full screen, invoice PDF via the phone's share sheet | ✅ on main |
| R07 | Account settings and Package Library | ✅ on main |
| R08 | No sideways overflow at 320–390 px: item cards, summary captions, crew schedule sheet (pinned header and footer), account sheet update | ✅ on main |
| R09 | Mobile type scale (`Mobile/…` text styles: body 16, caption 14, badges 13, smallest 12), 16 px card padding, layouts re-checked at 320 | ✅ on main |

Logs: `app/docs/slices/R01.md`, `R02.md`, `R03-R07.md`, `R08-R09.md`. Tests: `tests/e2e/R0*.spec.ts` (390 × 844, plus overflow checks at 320 / 360 / 375 / 390). **Still open:** tablet layouts and a mobile pass on the read-only booking page (`/bookings/[id]`).

### Login mascot

Added 2026-11-23. The CIR mascot (Figma `Asset/mascot-large`) is now a live three.js bubble on the login page: glowing, with colour that flows and glossy light that moves around its edge, and pill eyes with no mouth. States: idle (follows the cursor, falls asleep after 20 s), typing (watches the caret), password (eyes closed, sneaks a peek), peek (password shown), loading, error, success, plus happy and sleepy. It loads after first paint, shows the PNG until it's ready or if WebGL is missing, and holds still under reduced motion.

Code: `app/src/components/login/mascotScene.js` (the scene), `Mascot.tsx` (React wrapper), `app/src/app/login/page.tsx` (state wiring), `InputField` `onRevealChange`. Test: `tests/e2e/F03.spec.ts` "mascot reacts to the form". Preview: `python3 -m http.server 8765` from the repo root, then open `/mascot/`. **Still open:** re-check the login visual gate (F03, G3) against Figma, which still shows the static PNG.

### Production slices (P0–P14)

Every test result below is from a **local** Supabase. Staging hasn't been set up yet.

| Slice | Scope | Build | Review | Tests | Done |
|---|---|---|---|---|---|
| P0 | Foundations: repo, CI, environments, build hygiene | ✅ | ✅ | Unit 150 · e2e ⚠ 157/173 (see log) | ☐ |
| P1 | Database: schema, triggers, indexes, seed, types | ✅ | ✅ | DB ✅ (PGlite and Supabase) | ☐ |
| P2 | RPCs: `save_booking`, `create_invoice`, `cancel_booking` | ✅ | Security ✅ · code ☐ | pgTAP 130 · parity · concurrency ✅ | ☐ |
| P3 | Data access layer behind the prototype contract | ✅ | ✅ | Parity ✅ · smoke 5/5 | ☐ |
| P4 | Auth, sessions, roles, Account | ✅ | ✅ | pgTAP 142 · auth e2e 6/6 (including the midnight cut-off) | ☐ |
| P5 | Package Library live | ✅ | ✅ | Lanes A–D 6/6 | ☐ |
| P6 | Bookings read path (dashboard, calendar, table, detail) | ✅ | ✅ | Read parity 68 · lanes C–F 7/7 | ☐ |
| P7 | Booking write path (new, edit, cancel, stale-save notice) | ✅ | ✅ | pgTAP 156 · write lanes 7/7 | ☐ |
| P8 | Workspace settings and business information | ✅ | ✅ | Business lane 5/5 | ☐ |
| P9 | Invoices and PDF (server render, Storage, signed URLs) | ✅ | ✅ | pgTAP 174 · PDF lane 5/5 · private bucket ✅ | ☐ |
| P10 | Security hardening (RLS audit, crew, PII, headers) | ✅ | ✅ | RLS matrix 129 cells ✅ | ☐ |
| P11 | Performance (10k seed, indexes, budgets) | ✅ | ☐ | DB budgets 8/8 ✅ · LCP/INP on staging ☐ | ☐ |
| P12 | Full regression on staging, a11y, visual guard | ☐ | ☐ | ☐ | ☐ |
| P13 | Operations: monitoring, backups, reconciliation, runbook | ☐ | ☐ | ☐ | ☐ |
| P14 | UAT, cut-over, launch | ☐ | ☐ | ☐ | ☐ |

**Release readiness:** PG1–PG7, a backup restore, a reconciliation check that catches a planted error, and UAT sign-off are all ☐. Each one must be ✅ before launch.

### Open items and blockers

| Item | Owner | Needs |
|---|---|---|
| Staging environment (a Supabase project and a Vercel preview) | P12 | Setting up. Every "Done" tick and PG5 / PG7 wait on it. |
| D3: does the module use the existing internal-tools Supabase auth project? | P0 / P4 | Your decision |
| Figma note for the stale-save notice (INTERACTIONS 2.19) | P7 | Figma update |
| Re-export the Figma PNGs after the 2026-11-14 design sync and the 2026-11-21 form / detail / invoice changes (clears the 53 inherited visual failures) | P12 | `npm run figma:receiver` |
| Apply migration 013 (event details) to any database deployed before 2026-11-21 | Deploy | Run `supabase/migrations/20261121000013_booking_event_details.sql` (see `agents/DEPLOY.md`) |
| Crew types: release (app first, then migration 014). **Every active viewer becomes an admin**: check the list first | Deploy | `agents/DEPLOY.md` → "Upgrade to crew types" |
| Supabase e2e for crew types (needs a local database reset) | Crew types | Reset, then `npm run e2e:supabase` |
| Figma 02b / 03b: add the "Name (You)" row | Crew types | Figma update and PNG re-export |
| Contrast tokens and 2 ARIA fixes | P12 | A design decision on the contrast tokens |
| P2 and P11 code review | P2, P11 | Running `code-review` |

### Decisions on record

- **Crew types (2026-11-24):** accounts are `admin` or `crew`; `viewer` is removed and existing viewers, including the Owner, become admins. Crew see everything, read-only. No account screen: the developer uses SQL. Built on branch `crew-types`, not released yet.
- **Bank details and default terms:** stored in this module's own `workspace_settings` table and changed in SQL for now. There's no edit screen in v1 (decided 2026-11-16).
- **Sessions:** end at 00:00 WIB every day (decided 2026-11-16).
- **Hosting:** Vercel, plus separate Supabase projects for staging and production.
- **Starting data:** production starts empty, with no data import.
- **Where the design moved past Figma:** the prototype wins and Figma was updated to match (2026-11-14). That covers centred dialogs, the login background, Skeleton and Loader.
- **Event details (2026-11-21):** event start, location and notes are optional. Notes are printed on invoices. Invoices issued before then keep their snapshot and show only the booking name and date.
- **KPIs:** always computed from real data. Figma's "24 · +4" is sample content (decided 2026-11-11).

---

## Documentation

| Doc | Read it for |
|---|---|
| [`context/PRD.md`](context/PRD.md) | What and why: user stories US-0 to US-14, business rules 1–14, data model, security and performance requirements, roadmap |
| [`context/PLAN.md`](context/PLAN.md) | How: mapping from design to code, database and RPC design, domain logic, the list of Figma deliverables |
| [`context/INTERACTIONS.md`](context/INTERACTIONS.md) | Every interaction (96 rows, 1.1–6.12) with its Figma frame |
| [`context/PROTOTYPE-PLAN.md`](context/PROTOTYPE-PLAN.md) | Prototype slices F0–F19, pixel gates G1–G4, motion rules, the prototype tracker |
| [`context/PRODUCTION-PLAN.md`](context/PRODUCTION-PLAN.md) | Production slices P0–P14, gates PG1–PG7, the RLS matrix, the production tracker, a paste-ready prompt for each slice |
| [`context/CREW-TYPE-PLAN.md`](context/CREW-TYPE-PLAN.md) | Crew types (admin, crew): decisions, migration 014, slices C1–C5, release steps |
| [`agents/DEPLOY.md`](agents/DEPLOY.md) | Going live on Supabase and Vercel |
| [`agents/FEATURES.md`](agents/FEATURES.md) | Plain-language guide to every feature |
| `app/docs/slices/`, `production/docs/slices/` | Per-slice logs: what changed, decisions, test results |

**Keeping it current:** the trackers in `PROTOTYPE-PLAN.md` §4 and `PRODUCTION-PLAN.md` §4 are the source of truth. Update this README's tracker when either of them changes.
