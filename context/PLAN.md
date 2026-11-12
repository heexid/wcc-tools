# Implementation Plan — Booking module

Companion to `context/PRD.md`. Stack: Next.js App Router · Tailwind · Supabase · @react-pdf/renderer.
Companions: `context/PRD.md` · `context/INTERACTIONS.md` · `context/PROTOTYPE-PLAN.md`. Last synced 2026-11-11.
**Build order:** the UI is built first as a front-end prototype, one feature slice at a time (F0–F17, pixel-perfect gates, mock data layer with the same contracts as the RPCs below) — see `PROTOTYPE-PLAN.md`. The day estimates and Supabase sections (§1–§9) apply when the prototype is wired to the real backend.
Design source of truth: Figma `bs internal tools` (CIR · Design System; screens + flow on the **Bookings** page). **Every UI element must map to a CIR component or token. No hard-coded hex or px.**

---

## 0. Design → code mapping

| Product surface | CIR layout / components |
|---|---|
| App shell | `Global header / Module` (module = "Booking", module icon = `Asset/bookings` at 18×18), `Breadcrumb`, `Workspace selector`, `App launcher` (`Launcher tile`s: Booking = `Asset/bookings`, Package Lib = `Asset/package-lib`; current module tile highlighted) |
| Bookings dashboard | `Layout/Dashboard` → `Page header` + `Grid/KPI row` (`Metric card` ×3) + toolbar in two rows: **Calendar / Table tabs** (with a divider under them), then **search (fills the width) + Status · Crew · Package · Invoice type filters** below them, shared by both views + `Insights rail` (Upcoming) |
| Calendar | **New** `Calendar/Day cell`, `Calendar/Booking chip`, `Calendar/Header` (built in DS from tokens) |
| Table | `Data table` = `Table/Toolbar` + `Table/Header` + `Table/Row` + `Table/Footer` + `Pagination item`; `Search field`; `Input field / Select` for filters; **new** `Payment status badge` (booking status: Draft / Partially paid / Paid) |
| New / Edit booking | `Layout/Editor` → left form (`Section header`, `Input field`, items table, `Button / Ghost + icon`), right sticky **Summary card** (accent surface like the Invoice editor's total block) + **Invoices (n)** section: invoice cards and empty state while Draft; **Create invoice** opens the **New invoice modal**. |
| New invoice modal (over New/Edit booking) | `Modal` pattern (header with close + status, booking balance strip, footer Cancel / Confirm) + **New** `Segmented control` (DP / Full for invoice #1, Partial / Paid after); `Input field`; inline validation |
| Booking detail | Right side sheet (`Shell/Popover` styling, `Shadow/Floating`) + **Invoices (n)**: one **new** `Invoice card` per linked invoice (read-only; create invoices from Edit booking) |
| Success | `Modal` + `Asset/invoice` illustration, `Toast / Success` |
| Package Library | `Global header / Module` (module = "Packages", module icon = `Asset/package-lib` at 18×18) + `Layout/List` + `Data table` + `Modal` form |
| PDF | Same visual language as the existing A4 invoice preview |

**New DS components to add** (built from existing variables only, then added to the page *CIR · Design System → Booking*):
`Payment status badge` (Draft / Partially paid / Paid), `Invoice type tag` (DP / Full / Partial / Paid), `Segmented control`, `Calendar/Day cell` (Default / Today / Outside month / Selected), `Calendar/Booking chip` (by status), `Timeline item` (legacy, unused — not built), `Summary row`, `Line item row`, `Text area` (Terms & Conditions, max 255, with counter), `Invoice card` (Default / Latest), `Crew select` (Empty / Filled / Open), `Crew dropdown` (search + options, optional Clear/Apply footer), `Crew option`, `Crew chip` (Default / Read-only / Read-only hover), `Schedule item` (Default / Hover / Current), `Crew schedule popover`, `Calendar/Week card` (Status × Default / Hover), `Calendar/Week day head` (Default / Today / Hover), `Calendar/Day row` (Status × Default / Hover), `Warning button` (Default / Hover / Disabled, label "Cancel booking"), plus a **Canceled** variant on `Payment status badge`.

## 1. Foundations (Day 1–2)

1. Export CIR variables → `tokens/figma.tokens.json` → `src/styles/tokens.css` (Tailwind 4 `@theme`, defaults cleared: `bg-surface-accent`, `text-text-secondary`, `rounded-card`, `gap-group`, …). Font: self-hosted Inter 3.19 to match Figma's Inter 3.x metrics. *(Done in prototype slice F0.)*
2. Port base components: Button, InputField, Select, DateInput, Tab, StatusBadge, MetricCard, DataTable, Pagination, Modal, Alert, Toast, Avatar, SearchField. *(Done in prototype slice F1 — `prototype/src/components/ds/`; Tooltip, Side sheet, Skeleton and Loader follow in F6 / F12 / F17.)*
3. Formatting utilities in `lib/format.ts`: `formatIDR(n) → "Rp 1.250.000"`, `parseIDR("1.250.000") → 1250000`, `formatDate(id-ID)`.

## 2. Database (Day 2–3)

1. Migration `001_booking.sql`: tables per PRD §4.2, check constraints and indexes (`pg_trgm`).
2. Triggers:
   - `booking_items` I/U/D → recompute `bookings.total`.
   - `invoices` I/U → recompute `bookings.total_paid` (Σ non-void amounts).
   - Both → recompute `bookings.status` (PRD §2.5: no invoice → draft, < total → partially_paid, = total → paid).
3. RPC `create_invoice(booking_id, type, dp_method, dp_value, amount)`:
   - `FOR UPDATE` on the booking, recompute the server-side total, validate per type and against remaining, `next_invoice_number(year)`, build the snapshot JSON + sha256, insert the invoice linked to `booking_id`. Returns the invoice + new booking status.
4. RPC `cancel_booking(booking_id, reason?)`: `FOR UPDATE`, allowed only when status ∈ {draft, partially_paid}; sets `canceled_at/by/cancel_reason` (≤ 255) and status `canceled`. `save_booking` and `create_invoice` reject canceled bookings; `save_booking` rejects a newly picked archived package.
5. RPC `save_booking(payload)`: upsert the booking + replace items + replace `booking_crew` rows in one transaction (new bookings start as `draft`, no invoice). Rejects `total < total_paid`. Returns the booking with its derived fields.
6. `profiles` table (PRD §4.2) for display name, role and password-changed date. RLS policies for `admin` and `viewer`.
7. Seed: 8 packages (6 active, 2 archived — as in Figma Package Lib), 6 crew and 40 bookings across Oct–Dec covering every status, including Canceled. *(Built in prototype slice F2 from the Figma data: `prototype/src/lib/data/seed.ts`.)*

## 3. Domain logic (Day 3) — `lib/booking/calc.ts` (pure, 100% unit-tested) *(done in prototype slice F2)*

```ts
itemSubtotal(price, qty)            // price*qty
bookingTotal(packagePrice, items)   // package + Σ subtotal
dpAmount(total, {method, value})    // pct → round half-up; fixed → value
validateInvoice({type, total, totalPaid, amount}) → {ok} | {error: code}
remaining(total, totalPaid)
bookingStatus(invoiceCount, total, totalPaid)   // draft | partially_paid | paid
```
Test matrix: new booking → draft, first DP → partially_paid, first Full → paid, Partial + Paid → paid, terms length 255 ok / 256 rejected, 0%, 100%, 33.33% rounding, DP > total, Partial == remaining, Paid after edit increase, edit decrease below paid → save rejected, empty items, max qty.

## 4. Package Library (Day 4)
`/packages`: list, search, create/edit modal (description = `Text area`, max 1000, zod `.max(1000)` + DB check), archive. Picker component reused in the booking form.

## 5. Create booking + invoices via modal in the same screen (Day 4–6)
- `/bookings/new` with `react-hook-form` + `zod`, and a dynamic `useFieldArray` for items. `useLeaveGuard(isDirty && !bookingId)` intercepts in-app navigation (wraps `router.push` / `<Link>` clicks and the Cancel / back handlers) to show `<DiscardNewBookingDialog>`, and registers `beforeunload` for browser back / refresh / close. Right column: `<BookingSummary>` (live) + `<InvoicesSection>` (empty state while Draft). Save → `save_booking` (status Draft).
- `<InvoicesSection>` → **Create invoice** opens `<NewInvoiceModal>` (wrapping `<InvoiceConfigurator>`) over the same screen; mode from invoice count (0 → DP/Full, ≥ 1 → Partial/Paid). Confirm → `save_booking` (if dirty/new) + `create_invoice` → modal closes, a new `<InvoiceCard>` appears at the top of the section, toast, PDF ready. Same section is reused on `/bookings/[id]/edit`.

## 6. Dashboard: Calendar + Table (Day 6–8)
- Shared `useBookingFilters()` ↔ URL search params, including `crew=id1,id2` (multi-select, OR within crew; query via `booking_crew`).
- Calendar: month grid (6×7), week (7 columns of `<WeekCard>`, day header → day view, empty-day quick add, 5 cards + "+N more"), day (summary bar + `<DayRow>` list, empty state). `view` + `date` in the URL; switching views keeps the anchor date and filters. Query by visible range. Chips coloured by `status`. Crew avatars open `<CrewSchedulePopover>`.
- Table: server-side sort and pagination (`range()`). No row actions menu: a row (or its chevron) opens the detail panel (INTERACTIONS 1.22).
- KPI row: bookings this month, outstanding balance, collected this month.
- Upcoming rail: the next 7 days.

## 7. Booking detail + edit + follow-up invoice (Day 8–10)
- Parallel route `@panel` renders the detail as a right sheet over Calendar or Table, and as a full page on a direct link. *(Prototype F12: the sheet is driven by `?booking=<id>` on `/bookings` — same URL contract, no parallel route — and `/bookings/[id]` is the full page.)*
- Edit: same editor as create, plus a diff strip, an "Updated totals" card and `<InvoicesSection>` (existing cards + New invoice #n modal). An edit that drops the total below the amount paid is rejected with an inline error. Create invoice is hidden once Paid.
- Detail panel is read-only: every linked invoice as an `<InvoiceCard>` (newest first, PDF per card); its primary action is Edit booking.

## 8. PDF (Day 10–11)
- `components/pdf/InvoiceDocument.tsx` (@react-pdf) renders from `invoice.snapshot` only.
- Register the Inter font and use token colours.
- Generate on confirm, upload to Storage, signed URL route.

## 8b. Account (Day 11)
- `/account` page (server component) reading the signed-in user plus their `profiles` row (`display_name`, role from the workspace membership).
- Change name: `profiles.display_name` update (2–50 characters, trimmed), validated with zod and a DB check. Bookings store `created_by` as an id, so the name resolves at read time; snapshots on invoices keep the old name.
- Change password: re-verify the current password, then update the password through Supabase Auth and sign out other sessions (scope "others"). Use the same rules client-side (checklist) and server-side.
- Log out: `<AccountMenu>` → `<ConfirmDialog>` → sign out → redirect to `/login?loggedOut=1` (toast). Goes through `useLeaveGuard` first.

## 9. QA & launch (Day 11–12)
- Unit: calc (≥ 30 cases). Integration: RPC concurrency (2 parallel `create_invoice` calls → one fails). E2E (Playwright): every hi-fi flow lane (Bookings A–H, Package Lib A–D, Launchpad A–B, Profile A–D).
- Visual QA against the Figma frames at 1440 (gates G1–G4 in `PROTOTYPE-PLAN.md` §0.3). 768 / 390 come with the deferred tablet/mobile layouts.
- Reconciliation SQL check (success criterion #3) runs as a nightly cron.

## Figma deliverables (`bs internal tools`, updated 2026-11-10)
- **CIR · Design System** page → section **Booking components**: `Payment status badge` (Draft / Partially paid / Paid), `Invoice type tag`, `Segmented control`, `Calendar/Booking chip`, `Calendar/Day cell`, `Invoice card`, `Timeline item` (legacy, unused), `Summary row`, `Inline input`, `Line item row`, `Text area`, `Booking table/Header`, `Booking table/Row`, `Calendar/Week card`, `Calendar/Week day head`, `Calendar/Day row`. All are bound to CIR variables and styles.
- **Bookings** page → section **Booking · Screens**:
  - 01 Calendar (month) · 02 Table + filters (incl. Crew filter) · 02b Crew filter dropdown open (multi-select)
  - 03 New booking: Invoices (0) empty state, status Draft, Crew section (3 crew) · 03b Crew picker open
  - 04 New booking: invoice #1 modal (DP) · 04c invoice #1 modal (Full price) · 05c invoice created, Paid
  - 05 New booking: invoice created, card shown, Partially paid
  - 05b Invoice modal states: DP error, Full price
  - 06 Booking detail (read-only): Partially paid, 2 invoice cards, primary action Edit booking
  - 07 Edit booking: updated totals + Invoices (2) · 08 Edit booking: total below paid (inline error)
  - 09 Edit booking: invoice #3 modal (Partial) · 10 Invoice modal Paid (Lunas) + invoices after settling
  - 11 Invoice PDF (A4 snapshot, Partial) · 11b PDF DP · 11c PDF Full price
- **Bookings** page → section **Booking · Interaction states** (see `INTERACTIONS.md`):
  - 12 Unsaved-changes guard · 13 Package dropdown · 14 Booking date picker · 15 Required-field errors + Create invoice disabled
  - 16 Date-range filter · 17 "+N more" popover (footer: New booking on date · Open day view) & empty-date hover · 18 No results · 19 Week view · 20 Day view
  - 21 Draft detail · 22 Invoice confirm loading · 23 Invoice creation failed
  - 24 Detail from rail (Graduation · Aulia) · 25 Table · Next 7 days · 26 Table · This week + Partially paid + DP
  - 27 Booking detail with the crew schedule popover open
  - 28 Week view: day-header hover + tooltip, card hover, empty-day quick add · 29 Day view: row hover + crew schedule popover from an avatar · 30 Day view: no bookings · 31 Week view: busy day (7 bookings) → 5 cards + "+2 more" with the day popover open
  - 32 New booking: leave guard "Discard this new booking?" (Keep editing / Discard booking)
  - 33 Edit booking: Cancel booking section · 34 Cancel booking modal (alert + optional reason) · 35 Detail: Canceled, read-only
  - 36 Bookings: first use, empty · 37 Invoice PDF generation failed (Try again / Cancel)
  - 38 Edit booking: archived package kept · 39 Package dropdown: archived hidden · 40 Package dropdown: library empty
- **Bookings** page → section **Booking · Hi-fi flow** (Flow kit, real screens, dashed hotspots):
  - A: Create booking + first invoice: A1 Calendar → A2 New booking, Invoices (0) → *Client pays DP or full?*
    - DP path: A3 DP modal → *DP ≤ total?* → A4 invoice card (DP), Partially paid → A5 DP PDF → End Partially paid. Branch E1 amount too high (back to A3).
    - Full payment path: A3b Full price modal → A4b invoice card (Full), Paid → A5b full-payment PDF → End Paid.
    - Also: Save booking without invoice → Draft.
  - B: Update booking + next invoice (same screen): B1 Table → B2 Detail (read-only) → B3 Edit booking, Invoices (2) → *Pay full remaining?* → B4 invoice #3 modal (Partial) → B5 same screen, 3 invoices. Branches: E3 total below paid (inline error, back to B3); B6 modal Paid (Lunas) → End Paid.
  - C: Monitor: C1 Calendar → C2 Table + filters → C3 Detail → continues in B2.
  - D: Dashboard rail shortcuts: D1 dashboard → Upcoming item / “View booking” → D2 detail · “See all in table” → D3 Table (Next 7 days) · “View bookings” → D4 Table (This week · Partially paid · DP). A1 has the same hotspots plus a reference to lane D.
  - E: Crew schedule: S1 detail → clicks crew chip → S2 Crew schedule popover → clicks a booking → S3 that booking's detail. Alt: “See in calendar” → Calendar filtered by that crew member.
  - F: Calendar Day / Week views: F1 Month → clicks “Week” → F2 Week → clicks day header “Thu 12” → F3 Day → clicks a row → F4 Booking detail → lane B. Branches: empty day → New booking with date prefilled (A2); crew avatar → Crew schedule popover (lane E); busy day in Month → clicks “+1 more” → F1b Month day popover; busy day in Week → clicks “+2 more” → F2b Week overflow with the day popover open. From either popover: a booking row → detail (as F4), or “Open day view” → Day view (as F3).
  - G: Leave New booking without saving: G1 New booking (unsaved; hotspots on ‹, Cancel, module link, app launcher) → *Anything entered?* → Yes → G2 leave guard → “Discard booking” → G3 Bookings, End “Nothing saved”; “Keep editing” / Esc → back to G1 with entries kept. No → leaves without a prompt. Browser back / refresh / close tab → native “Leave site?” prompt.
  - H: Cancel a booking: H1 Detail → Edit booking → H2 Edit booking (Cancel booking section) → H3 reason modal → H4 Detail Canceled (read-only) → End. Keep booking / Esc → back to H2. Paid → no section; New booking → section only after Save booking.
- **Package Lib** page (separate feature): screens 01 Edit package · 02 New package · 03 Archive confirmation · 04 Archived tab (Restore) · 05 Validation errors (duplicate name, price) · 06 Save failed (Try again) · 07 Empty library · 08 Search no results. Hi-fi flow lanes: A Edit (P1 → P2, save-fails branch) · B Create (C1 → C2 → *Valid & unique?* → End / C3 errors loop) · C Archive & restore (A1 → A2 → A3 → Restore) · D Empty states (D1 empty library, D2 no results).
- **Login** page: P1–P3 + errors E1–E6, plus **E7 Forgot password → contact your admin** (all login cards have a "Forgot password?" link).
- **Launchpad** page → section **Launchpad · Hi-fi flow** (module switching with the App launcher):
  - A: Booking → Package Library: L1 Bookings → clicks ⋮⋮ → L2 launcher open (Booking current, hover Package Lib) → *Unsaved New / Edit booking?* → No → L3 Package Library → End. Yes → leave guard (Bookings lane G). Esc / × / outside click → closes and stays.
  - B: Package Library → Booking: M1 Package Library → ⋮⋮ → M2 launcher (Package Lib current, hover Booking) → M3 Bookings (last view + filters restored) → End. Clicking the current tile only closes the launcher.
- **Launchpad & Profile** page → *Profile · Screens*: AC1 Account menu open · AC2 Account settings · AC3 Change name · AC3b Name error · AC4 Name updated · AC5 Change password · AC6 Password errors · AC7 Password updated · LO1 Log out confirm · LO2 Login after logout. *Profile · Hi-fi flow* lanes:
  - A: profile → account menu → Account settings.
  - B: change name (*2–50 characters?* loop).
  - C: change password (*current correct, rules met, match?* loop).
  - D: log out (*unsaved booking form?* → leave guard; confirm → Login).
- **Deferred (noted 2026-11-10, design later):** tablet/mobile layouts, void-invoice dialog (v1.1).
