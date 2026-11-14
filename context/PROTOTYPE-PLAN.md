# Prototype Slicing Plan — Booking module

| | |
|---|---|
| **Status** | v1 · 2026-11-11 |
| **Goal** | A clickable, front-end prototype that matches Figma `bs internal tools` **1:1, pixel perfect, at 1440 px**, built one feature at a time: **develop → test → done → next feature**. |
| **Companions** | `context/PRD.md` (what + rules) · `context/PLAN.md` (architecture, DS mapping, Figma deliverables) · `context/INTERACTIONS.md` (every interaction, numbered 1.1–6.10) |
| **Design source** | Figma `bs internal tools` → **CIR · Design System** (tokens, `Booking components`) · **Bookings** page (*Booking · Screens* 01–11, *Interaction states* 12–40, *Hi-fi flow* lanes A–H) · **Package Lib** page (01–08, lanes A–D) · **Login** page (P1–P3, E1–E7) · **Launchpad & Profile** page (L/M flow, AC1–AC7, LO1–LO2) |

The IDs here are the same ones the other docs use: **US-n** (PRD stories), **screen numbers** (PLAN "Figma deliverables"), **#x.y** (INTERACTIONS rows) and **lanes** (hi-fi flows). If any of those docs change, update the matching slice here.

---

## 0. Ground rules

### 0.1 Scope of the prototype
- **Front end only, real behaviour.** All screens, states and flows from the three docs work in the browser. Data comes from a **mock data layer** (`lib/data/*`), not Supabase. It has the same function signatures as the RPCs in PLAN §2 (`save_booking`, `create_invoice`, `cancel_booking`) and enforces the PRD §2.4 business rules, so Supabase can replace it later without touching the UI.
- Persistence: in memory + `localStorage`, reset via `/dev/reset`. Seed per PLAN §2.7 (built from Figma in F2): 8 packages (6 active + 2 archived), 6 crew and 40 bookings Oct–Dec 2026, covering every status including Canceled. Each Figma screen also gets a **named fixture** (`?fixture=screen-06`, 58 in total) so the page renders exactly the data shown in that frame. Figma's data inconsistencies and who decides them: `prototype/docs/slices/F02.md`.
- **Desktop 1440 only.** Tablet/mobile and the void-invoice dialog are deferred (PRD §5.1 v1.1, PLAN "Deferred").
- **Frozen clock.** "Today" is **Tue 10 Nov 2026** (the Today cell in Figma screen 01). `lib/clock.ts` `now()` reads `NEXT_PUBLIC_TODAY`; visual tests always run on that date.

### 0.2 Stack
Next.js 16 App Router (`cacheComponents` on) · TypeScript · Tailwind 4 (CSS-first `@theme` generated from CIR variables — no `tailwind.config.ts`) · `react-hook-form` + `zod` · `@react-pdf/renderer` · Vitest (unit) · Playwright (interaction + visual) · npm. Font: self-hosted **Inter 3.19** (Figma renders Inter 3.x; Google's Inter 4 measures differently). Motion: CSS transitions/WAAPI by default; the `motion` package only where the `animate` skill picks it.

Folder: `prototype/` at the repo root.

### 0.3 "1:1 pixel perfect" — how it is measured
Every slice must pass all four gates:

| Gate | Check | Pass |
|---|---|---|
| **G1 Tokens** | Every colour, spacing, radius, shadow and text style comes from a CIR variable/style (PLAN §0). | `grep` finds no raw hex / px outside `styles/tokens.css` |
| **G2 Measurements** | For each frame, key nodes' size, position, padding, gap, font, line-height and colour (from `figma_get_component_for_development` / `figma_get_file_data`, or a spec JSON exported via `figma_execute`) equal the browser's computed styles and bounding boxes. | 0 mismatches (± 0 px). Text boxes: `ceil(browser width − trailing letter-spacing)` = Figma width (Figma rounds auto-width text up) |
| **G3 Screenshot diff** | Playwright screenshot of the route at 1440 × frame height, animations off, clock frozen, fixture loaded vs the Figma frame exported at 1× (PNG). | `maxDiffPixelRatio ≤ 0.005`, `threshold 0.1` (the allowance is only for font antialiasing; any diff in layout, colour or icon fails) |
| **G3c Components** | For isolated components (`/dev/components`, one per Figma variant, exported with render bounds): flat areas of the Figma image (fills, interiors, backgrounds) must match exactly; antialiased edge pixels (glyphs, curves) may differ. Figma and Chrome rasterise antialiasing differently, which makes a flat % budget meaningless on small text-dense parts. | 0 flat-area diffs · ≤ 20 % edge diffs · a 1 px shift must fail (self-test). Masks / accepted exceptions only with a written reason in the variants JSON |
| **G4 Overlay** | Figma PNG overlaid at 50 % on the screenshot (`/dev/overlay?frame=…`). | No visible offset. Reviewed by eye, screenshot of the overlay saved in the slice log |

Figma-faithful building blocks (F1): use `<Txt>` for single-line labels in hug/centred layouts (Figma text-box rounding), `cn()` (tailwind-merge with CIR tokens) for class overrides, `usePresence()` for overlays. Findings list: `prototype/docs/slices/F01.md`.

Figma reference PNGs live in `prototype/public/__figma__/<frame>.png` and node specs in `public/__figma__/specs/<slice>.json` (served so `/dev/overlay` can use them). They are exported straight to disk: run `npm run figma:receiver` (port 9232), then in `figma_execute` call `node.exportAsync({format:'PNG', constraint:{type:'SCALE', value:1}})` and `fetch('http://localhost:9232/save?name=<frame>.png', {method:'POST', body})`. Screenshot tests live in `prototype/tests/visual/<slice>.spec.ts`; G3 also fails if the Next.js dev "Issue" toast is on screen.

### 0.4 Motion rules (every slice)
- Every development step runs the skills **`find-animation-opportunities`** (propose) then **`animate`** (implement), in that order, on the slice's UI.
- Inline notices (alerts that appear in place: login errors, save / invoice failures) use `.motion-notice` (F3).
- Accepted motion must respect `prefers-reduced-motion` and must not change the **end state**: gates G2–G3 are taken with animations disabled (`reducedMotion: 'reduce'` + `animation: none` test stylesheet) and must still pass.
- Motion that the skill rejects (e.g. "this shouldn't animate") is written down in the slice log with the reason, so it isn't re-proposed.
- Keep one shared set of durations, curves and movement vars in `styles/motion.css` (created in F0, extended by later slices). Overlays use the F1 recipes (`.motion-toast`, `.motion-modal`, `.motion-popover` + `usePresence`), never new ones. Components use the movement vars (`--press-scale`, `--popover-from-scale`, `--toast-from-y`, …), never literal transforms, so reduced motion turns every entrance into a fade.

### 0.5 Doc sync rules
- A slice is "done" only when its rows in INTERACTIONS.md all behave as written and its screens pass G1–G4.
- If building a slice changes a decision (copy, behaviour, rule), update PRD/PLAN/INTERACTIONS **in the same step**, then this file.
- **Sync status (2026-11-11):** PRD, PLAN, INTERACTIONS and this file were reconciled. Resolved: no table row actions menu (INTERACTIONS 1.22); cancel allowed from Draft or Partially paid (US-12, PRD §2.6 fixed); Figma page names in the PRD header; visual QA at 1440 only; E2E = hi-fi flow lanes; `Timeline item` not built; date presets and Canceled status filter aligned (US-8 = INTERACTIONS 1.6, 1.9); Draft detail has no Create invoice button (US-9 = INTERACTIONS 4.7); viewer also hides the Cancel booking section (6.4); `profiles` table added to PRD §4.2; business rules renumbered 1–13; MVP scope lists Login, launcher and Account.

---

## 1. The per-feature workflow

Every slice F0…F17 follows the same loop. Do **not** start the next slice until step 9 is ticked.

```
 ┌─ 1. Read ──────── PRD stories + INTERACTIONS rows + PLAN section for the slice
 │  2. Pull design ── figma-console: status → navigate → frames → specs + 1× PNG export
 │  3. Plan ───────── list components (reuse / new), routes, fixtures, test cases
 │  4. Build ──────── skill: build-design (tokens + existing components only)
 │  5. Motion scan ── skill: find-animation-opportunities  → accept / reject list
 │  6. Motion build ─ skill: animate  (accepted items only, reduced-motion safe)
 │  7. Test ───────── unit · interaction (INTERACTIONS rows) · G1–G4 visual gates
 │  8. Fix loop ───── fix → re-run 7 (max 3 rounds, then flag to the user)
 └─ 9. Done ───────── update tracker (§4) + slice log + sync docs → next slice
```

**Step details**

1. **Read.** Open only the sections the slice lists. Note every acceptance criterion as a test case.
2. **Pull design.** `figma_get_status` (desktop bridge connected) → `figma_navigate` to the page → `figma_search_components` (node IDs are per session; never reuse old ones) → per frame: `figma_get_component_for_development` / `figma_get_file_data` / `figma_execute` for exact values, `figma_get_variables` for tokens, and the 1× PNG + spec JSON exported to `public/__figma__/` through the receiver (§0.3).
3. **Plan.** Write the slice log header (`prototype/docs/slices/Fxx.md`): frames, components, fixtures, test list.
4. **Build.** Invoke `build-design` with the frame and the project's tokens/components. New DS components are built once in `components/ds/` and shown on `/dev/components` next to their Figma variants.
5. **Motion scan.** Invoke `find-animation-opportunities` on the slice's routes/components. Paste its proposals into the slice log with accept/reject.
6. **Motion build.** Invoke `animate` for each accepted item.
7. **Test.** `npm run g1` · `npm test` (Vitest) · `npm run e2e -- -g Fxx` (Playwright interaction) · `npm run visual -- -g Fxx` (G2 + G3) · G4 overlay check (`/dev/overlay?frame=…&route=…`, difference blend).
8. **Fix loop.** Fix the diff, rerun. After 3 failed rounds, stop and report the remaining diff with screenshots.
9. **Done.** Tick the slice in §4, write the results (gate numbers, motion list, open issues) in the slice log, update any doc that changed.

---

## 2. Slice order (overview)

| # | Slice | Stories | Figma frames | INTERACTIONS |
|---|---|---|---|---|
| F0 | Scaffold, tokens, test harness | — | CIR variables & text styles | — |
| F1 | Base CIR components + motion tokens | — | CIR components | 6.2, 6.3 (patterns) |
| F2 | Domain logic + mock data layer | PRD §2.4, §2.5 | — | — |
| F3 | Login | §4.3 | Login P1–P3, E1–E7 | 6.5 |
| F4 | App shell + App launcher + Account menu | US-11, US-13 (menu) | Launchpad L1–L3, M1–M3, AC1 | 6.1, 6.1a, 6.6 |
| F5 | Package Library | US-0 | Package 01–08 | 1.2, 5.1–5.11 |
| F6 | Bookings dashboard frame (+ DS Tooltip) | US-6 (rail), US-12 (KPIs) | 01 (frame), 36 | 1.1, 1.3, 1.16–1.18, 1.23, 1.32 |
| F7 | Calendar · Month | US-6 | 01, 17 | 1.11–1.15 |
| F8 | Calendar · Week + Day | US-6 | 19, 20, 28–31 | 1.12, 1.24–1.31 |
| F9 | Table + search + filters | US-7, US-8 | 02, 02b, 16, 18, 25, 26 | 1.4–1.10, 1.19–1.22, 1.33 |
| F10 | New booking form + leave guard | US-1, US-0 (picker) | 03, 03b, 13, 14, 15, 32, 39, 40 | 2.1b, 2.2, 2.4–2.10, 2.12, 2.17 |
| F11 | Invoice modal · first invoice | US-2, US-3 | 04, 04c, 05, 05b, 05c, 22, 23 | 2.11, 2.14, 3.1–3.3, 3.5–3.8 |
| F12 | Booking detail panel (+ DS Side sheet) + Crew schedule | US-9 | 06, 21, 24, 27 | 4.1–4.10 |
| F13 | Edit booking + follow-up invoice | US-4, US-5, US-0 (archived) | 07, 08, 09, 10, 12, 38 | 2.1, 2.3, 2.13, 2.18, 3.4 |
| F14 | Cancel booking | US-12 | 33, 34, 35 | 2.15, 2.16, 4.11 |
| F15 | Invoice PDF | US-10 | 11, 11b, 11c, 37 | 4.2, 4.6, 4.12 |
| F16 | Account settings + Log out | US-13 | AC2–AC7, LO1–LO2 | 6.7–6.10 |
| F17 | Viewer role, loading (+ DS Skeleton, Loader), full-flow E2E | all | all hi-fi flow lanes | 6.3, 6.4 |

Why this order: foundations first (F0–F2), then the shell every page sits in (F3–F4), then Package Library because the booking form needs its picker (F5), then read-only views (F6–F9), then the write path in the order a booking lives: create → first invoice → detail → edit + next invoice → cancel → PDF (F10–F15), then account (F16) and a full regression (F17).

---

## 3. Slices

Each slice has: **Feature** (scope + done criteria), **Prompt** (paste into Claude Code to run the slice) and **Workflow** (the slice-specific steps on top of §1).

---

### F0 — Scaffold, tokens, test harness

**Feature**
- `prototype/` Next.js App Router + TS + Tailwind 4 + npm. Inter 3.19 self-hosted.
- CIR variables (Primitives / Semantic / Component / Breakpoint) → `tokens/figma.tokens.json` → `npm run tokens` → `src/styles/tokens.css` (`@theme static`, Tailwind defaults cleared: `bg-surface-accent`, `text-text-secondary`, `rounded-card`, `gap-group`, …). CIR text styles → `text-body`, `text-heading-page`, … Naming table in `prototype/docs/slices/F00.md`.
- Test harness: Vitest; Playwright with frozen clock, 1440 viewport, `reducedMotion: 'reduce'`, fixture query param; visual spec helper (G3); G2 measurement helper (compares a JSON of Figma node specs with `getBoundingClientRect` + `getComputedStyle`); `/dev/overlay` page (G4); `/dev/reset`.
- Lint rule / script for G1 (no raw hex/px outside tokens).
- **Done when:** a token gallery page `/dev/tokens` renders every variable and text style and passes G3 against a Figma export of the variables, and the harness runs green on it.

**Prompt**
```
Slice F0 of context/PROTOTYPE-PLAN.md. Read §0 and §1 of that file and PLAN.md §0–§1.
Create prototype/ (Next.js App Router, TypeScript, Tailwind 4, npm, Inter 3.19 self-hosted).
Use figma-console (figma_get_status, figma_get_variables, figma_get_text_styles, figma_export_tokens)
to export every CIR variable and text style from "bs internal tools" into
src/styles/tokens.css (Tailwind 4 @theme) — no hand-typed values. Read the "today" date from Booking screen 01 and
write it into PROTOTYPE-PLAN.md §4.
Set up Vitest, Playwright (1440 viewport, frozen clock, reducedMotion reduce, fixture param),
the G1 lint script, the G2 measurement helper, the G3 visual helper, /dev/tokens, /dev/overlay, /dev/reset.
Then run find-animation-opportunities on the harness pages and animate only what it accepts
(expected: nothing — record that). Test with the G1–G4 gates and finish with §1 step 9.
```

**Workflow**
1. Read → 2. Pull variables + text styles (no frames) → 3. Plan token naming → 4. Build scaffold with `build-design` for `/dev/tokens` → 5–6. `find-animation-opportunities` + `animate` (expect none on dev pages; log it) → 7. Gates on `/dev/tokens` → 9. Tracker, write frozen date in §4.

---

### F1 — Base CIR components + motion tokens

**Feature**
- Port from CIR: Button (all variants incl. Ghost + icon, Loading, Disabled), Warning button, Input field (Text / Select / Date / Password × Default / Filled / Focus / Error / Disabled), Text area (counter, max), Search field, Tab, Segmented control, Checkbox, Avatar, Payment status badge (Draft / Partially paid / Paid / Canceled), Invoice type tag, Trend badge, Metric card, Alert (Info / Warning / Danger / Success), Toast, Shell/Popover, Modal, Menu item, Pagination item, Table parts (Toolbar / Header / Row / Footer). *(Done — Tooltip → F6, Side sheet → F12, Skeleton + Loader → F17: no DS source until those screens.)*
- `styles/motion.css`: shared durations and curves chosen by `animate` (press, hover, popover in/out, modal in/out, sheet in/out, toast, skeleton shimmer).
- `/dev/components` shows every variant next to the Figma component image.
- **Done when:** every variant passes G2 + G3c against its Figma component, and keyboard focus rings match the DS.

**Prompt**
```
Slice F1 of context/PROTOTYPE-PLAN.md. Read §0, §1 and PLAN.md §0 "New DS components".
With figma-console, figma_search_components on the CIR · Design System page, then for each base
component listed in F1 pull figma_get_component_for_development and figma_get_component_image.
Use the build-design skill to build them in prototype/components/ds/ using only tokens from F0,
with every variant on /dev/components next to its Figma image.
Run find-animation-opportunities on the components (press, hover, focus, popover, modal, sheet,
toast, skeleton), then animate the accepted ones and put shared durations/curves in styles/motion.css.
Test: G2 + G3 per variant, keyboard focus, reduced motion. Finish with §1 step 9.
```

**Workflow**
Standard loop. Step 2 is per component set; step 7 has one visual test per variant. Booking-specific DS components (Calendar/*, Invoice card, Crew *, Schedule item, Line item row, Summary row) wait for the slice that first uses them.

---

### F2 — Domain logic + mock data layer

**Feature**
- `lib/format.ts`: `formatIDR` (`Rp 1.250.000`, id-ID, no decimals), `parseIDR`, `formatDate` (id-ID / Figma formats such as "Sat, 14 Nov", "9 – 15 Nov 2026").
- `lib/booking/calc.ts` per PLAN §3: `itemSubtotal`, `bookingTotal`, `dpAmount` (half-up), `validateInvoice`, `remaining`, `bookingStatus` (PRD §2.5 incl. canceled).
- `lib/data/*` mock repo: `listBookings(filters, sort, page)`, `getBooking`, `saveBooking` (rejects `total < total_paid`, archived new pick, canceled), `createInvoice` (numbering `INV-YYYY-NNNN`, snapshot + hash, recompute status), `cancelBooking`, packages CRUD/archive/restore, crew list, auth/profile. Simulated latency + a fail switch (for screens 06 Package, 23, 37).
- Seed (PLAN §2.7) + one named fixture per Figma screen.
- **Done when:** PLAN §3 test matrix + ≥ 30 calc cases pass, and every PRD §2.4 rule has a repo test.

**Prompt**
```
Slice F2 of context/PROTOTYPE-PLAN.md. Read PRD §2.2–§2.5, §4.2 and PLAN §2–§3.
Build lib/format.ts, lib/booking/calc.ts and the mock data layer lib/data/* with the same
contracts as save_booking / create_invoice / cancel_booking, enforcing every PRD §2.4 rule.
Add the seed from PLAN §2.7 and a named fixture for every Figma screen; read the exact names,
amounts, dates and crew from the frames with figma-console so fixtures reproduce them 1:1.
Write Vitest tests for the PLAN §3 matrix (≥ 30 calc cases) and every business rule.
There is no UI in this slice: run find-animation-opportunities only to confirm that, log it,
and skip animate. Finish with §1 step 9.
```

**Workflow**
Standard loop without the visual gates. Step 2 = read data shown in frames (text nodes) to build fixtures.

---

### F3 — Login

**Feature**
- `/login` per Login P1–P3; errors E1–E6; **Forgot password?** → Info alert E7 ("Passwords are managed by your workspace admin…"). Toast "You've logged out" when `?loggedOut=1` (LO2 is finished in F16).
- Mock auth: session flag in `localStorage` (`proto:session`), redirect to `?next=` or `/bookings` after login; protected routes redirect to `/login` (route guard lands with the shell in F4). Dev hooks: `?latency=` (P3), `?fail=login` (E6), `?expired=1` (E4).
- **Done when:** P1–P3 and E1–E7 pass G1–G4; INTERACTIONS 6.5 passes.

**Prompt**
```
Slice F3 of context/PROTOTYPE-PLAN.md. Read PRD §4.3 and INTERACTIONS 6.5.
figma-console: navigate to the Login page, get specs + 1× PNG for P1–P3 and E1–E7.
Use build-design to build /login with the F1 components and the mock auth from F2.
Run find-animation-opportunities on the login card, errors and the E7 alert, then animate the
accepted items. Test each frame with G1–G4 and each error path with Playwright. Finish with §1 step 9.
```

**Workflow**
Standard loop. Visual tests: one per frame, fixture = that error state.

---

### F4 — App shell, App launcher, Account menu

**Feature**
- `Global header / Module` (module icon + name: `Asset/bookings` "Booking" or `Asset/package-lib` "Packages", 18×18), Breadcrumb, Workspace selector, Language (6.1).
- **App launcher** (US-11, 6.1a): popover "App launcher", section "Management" with Launcher tiles Booking / Package Lib / Bookmark (Coming soon, locked), current tile highlighted, hover state, keyboard (Tab/arrows/Enter), `role="dialog"`, Esc / × / outside closes and returns focus. Current tile only closes. Leave guard hook point (wired in F10).
- **Account menu** (AC1, 6.6): avatar + name + role → popover with Account Setting / Log out (danger); Esc / outside / profile again closes. Targets stubbed until F16.
- `useLeaveGuard` interface created (no-op until F10).
- **Done when:** the shell regions of Launchpad L1–L3 and AC1 pass G1–G4 (page bodies are checked in F5–F7; Figma has no separate M1–M3 frames); Launchpad lanes A–B run in E2E, including the leave-guard branch via `/dev/shell`.

**Prompt**
```
Slice F4 of context/PROTOTYPE-PLAN.md. Read PRD US-11, US-13 (account menu), PLAN §0 "App shell",
INTERACTIONS 6.1, 6.1a, 6.6.
figma-console: Launchpad & Profile page — specs + PNG for L1–L3, M1–M3, AC1, and the Launcher tile /
Global header components.
Use build-design to build the shell layout used by /bookings and /packages, the App launcher and the
Account menu. Add a no-op useLeaveGuard hook that F10 will fill in.
Run find-animation-opportunities on the launcher, tiles and account menu, then animate the accepted
items (popover origin from the trigger, reduced-motion safe). Test G1–G4 per frame, keyboard and
focus return, Launchpad lanes A–B. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: Launchpad flow lanes A and B.

---

### F5 — Package Library

**Feature**
- `/packages` (Layout/List + Data table): Active / Archived tabs, search, pagination, New package (02), Edit (01), Archive confirm (03), Archived tab with Restore (04), validation (05: duplicate active name, price), save failed + Try again (06), empty library (07), no search results + Clear search (08). Description = Text area max 1000 with `n/1000` (5.7). Toasts.
- Reusable `listPackages({ tab: "active" })` for F10's picker (archived hidden + note per US-0). New DS primitives for later slices: `Dialog` / `FormModal` (scrim, focus trap, dialog stack) and `StatusPill`.
- **Done when:** Package 01–08 pass G1–G4; INTERACTIONS 5.1–5.11 pass; Package lanes A–D pass E2E.

**Prompt**
```
Slice F5 of context/PROTOTYPE-PLAN.md. Read PRD US-0, PLAN §4, INTERACTIONS §5 (5.1–5.11).
figma-console: Package Lib page — specs + PNG for screens 01–08 and the hi-fi flow lanes A–D.
Use build-design to build /packages with the F1 components and the F2 package repo
(fixtures per screen, fail switch for 06).
Run find-animation-opportunities on the list, tabs, modal, archive/restore and empty states, then
animate the accepted items. Test G1–G4 per screen, every 5.x row, and lanes A–D. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: Package lanes A (edit + fail), B (create + validation loop), C (archive/restore), D (empty states).

---

### F6 — Bookings dashboard frame

**Feature**
- **Decided 2026-11-11 (user): real data.** The KPI shows the true count (18 · −2); Figma's "24 · +4" is masked in G3 with that reason. See `prototype/docs/slices/F06.md`.
- `/bookings` layout (Layout/Dashboard): Page header with **New booking** (1.1) and **Package library** (1.2), KPI row (Bookings this month / Outstanding balance / Collected this month; Canceled excluded per US-12) with ⓘ tooltips (1.23), Calendar / Table tabs with the divider (1.3), toolbar row placeholder (search + filters arrive in F9), **Upcoming** rail (next 7 days, Canceled hidden) with item → detail (1.16, wired in F12), **See all in table** (1.17), insight card actions (1.18).
- First use (36, 1.32): KPIs 0 "No data yet", "Nothing scheduled in the next 7 days", "No bookings yet" + New booking.
- URL state skeleton: `view`, `date`, `tab`.
- **Done when:** the frame of 01 (everything except the calendar grid) and 36 pass G1–G4.

**Prompt**
```
Slice F6 of context/PROTOTYPE-PLAN.md. Read PRD US-6 (rail), US-12 (KPI rules), PLAN §0 "Bookings
dashboard" + §6 (KPIs, rail), INTERACTIONS 1.1–1.3, 1.16–1.18, 1.23, 1.32.
figma-console: Bookings page — specs + PNG for screen 01 (header, KPI row, tabs, rail) and 36.
Use build-design to build the /bookings layout, KPI row, tabs, rail and first-use state from the
F2 data. Leave a slot for the calendar/table body.
Run find-animation-opportunities on tabs, KPI cards, tooltips and the rail, then animate the
accepted items. Test G1–G4 on 01 (body masked) and 36, plus the 1.x rows. Finish with §1 step 9.
```

**Workflow**
Standard loop. G3 on 01 masks the calendar body until F7.

---

### F7 — Calendar · Month

**Feature**
- New DS: `Calendar/Header`, `Calendar/Day cell` (Default / Today / Outside month / Selected), `Calendar/Booking chip` (by status).
- 6×7 grid, booking count, up to 3 chips + "+N more"; ‹ › and **Today** (1.11); chip → detail panel (1.13, wired in F12); "+N more" popover (17, 1.14) with footer **New booking on 14 Nov** · **Open day view**; empty date hover "+ New booking" → New booking with the date prefilled (1.15). Keyboard grid (arrow keys, PRD §4.5). Canceled hidden unless the status filter includes it.
- **Done when:** 01 (full) and 17 pass G1–G4; Flow F1 → F1b runs.

**Prompt**
```
Slice F7 of context/PROTOTYPE-PLAN.md. Read PRD US-6 (month), PLAN §6 (calendar), INTERACTIONS
1.11, 1.13–1.15.
figma-console: specs + PNG for screen 01 and 17, and the Calendar/* components in "Booking components".
Use build-design to build the DS calendar components and the month view inside the F6 layout.
Run find-animation-opportunities on month navigation, chips, the "+N more" popover and the empty-date
hover, then animate the accepted items. Test G1–G4 on 01 and 17, keyboard navigation, 1.11–1.15,
flow F1 → F1b. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: lane C1 and F1 → F1b.

---

### F8 — Calendar · Week + Day

**Feature**
- New DS: `Calendar/Week day head` (Default / Today / Hover), `Calendar/Week card` (status × Default / Hover), `Calendar/Day row` (status × Default / Hover).
- Day / Week / Month switch keeps anchor date + filters (1.12, `view=week&date=…`).
- Week (19, 28, 31): day header hover + tooltip "Open day view · Sat, 14 Nov" → Day view (1.24); card hover → detail (1.25); empty day "+ New booking" → New booking prefilled (1.26); > 5 → 5 cards + "+N more" → day popover (1.27); title "9 – 15 Nov 2026".
- Day (20, 29, 30): summary bar, rows (1.28), crew avatars → Crew schedule popover (1.29, popover built in F12 — stub here), empty "No bookings on Sunday, 15 Nov" (1.30), "+ New booking on this date" (1.31).
- **Done when:** 19, 20, 28, 29 (popover masked until F12), 30, 31 pass G1–G4; flow lane F runs.

**Prompt**
```
Slice F8 of context/PROTOTYPE-PLAN.md. Read PRD US-6 (week, day), INTERACTIONS 1.12, 1.24–1.31.
figma-console: specs + PNG for 19, 20, 28, 29, 30, 31 and the Week/Day calendar components.
Use build-design to build the week and day views and the view switch, keeping date + filters in the URL.
Run find-animation-opportunities on view switching, week/day navigation, card/row hover, the overflow
popover and the empty-day target, then animate the accepted items. Test G1–G4 per frame, 1.12 and
1.24–1.31, flow lane F. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: lane F (F1 → F2 → F3, F2 → F2b, empty day → A2 stub).

---

### F9 — Table + search + filters

**Feature**
- **Decided 2026-11-11 (user):** Figma 02's filtered rows (Sari 12 → Laras 21 → Citra 27 → Nadia 14) follow no sort rule; the Table sorts by booking date per PRD US-7 and G3 masks rows 2–4 of 02 / 02b / 16.
- Booking table (02): columns per US-7, sort (1.20; default booking date asc), pagination 10/25/50 (1.21), row/chevron → detail (1.19), **no actions menu** (1.22).
- Search (1.4) with 250 ms debounce, × clears; no results (18, 1.5) with Reset filters + New booking.
- Filters shared by Calendar and Table, in the URL: Status (1.6, incl. Canceled 1.33), Crew (02b, 1.7), Package (1.8; Invoice type filter removed 2026-11-11), Date presets + range (16, 1.9); chips × + Reset all (1.10).
- Rail/insight targets: 25 (Next 7 days), 26 (This week + Partially paid + DP).
- **Done when:** 02, 02b, 16, 18, 25, 26 pass G1–G4; lanes C and D run.

**Prompt**
```
Slice F9 of context/PROTOTYPE-PLAN.md. Read PRD US-7, US-8, PLAN §6 (useBookingFilters), INTERACTIONS
1.4–1.10, 1.19–1.22, 1.33. Note: no row actions menu (1.22).
figma-console: specs + PNG for 02, 02b, 16, 18, 25, 26 and the Booking table / Crew dropdown components.
Use build-design to build the table, search, filter dropdowns, date range picker and chips, with
useBookingFilters() synced to the URL and shared with the calendar.
Run find-animation-opportunities on sorting, pagination, dropdowns, chips and the empty state, then
animate the accepted items. Test G1–G4 per frame, every listed row, lanes C and D. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: lane C (C1 → C2), lane D (D3, D4).

---

### F10 — New booking form + leave guard

**Feature**
- `/bookings/new` (Layout/Editor, 03): client name, phone (+62 normalise), booking name default, Package select (13, 2.5; Manage library 2.6; archived hidden + note 39; empty library 40, 2.17), Booking date picker (14, 2.7; prefill from calendar), additional items with live subtotal (2.8, `Line item row`), Crew select + chips (03b, 2.9), Terms & Conditions text area 255 (2.10).
- Right column: sticky Summary card (live, < 50 ms) + Invoices (0) empty state; **Create invoice** disabled with tooltip while invalid (15, 2.12; opens the modal in F11).
- Save booking → Draft, toast, switch to edit mode (2.2). Validation summary "2 fields need attention" + scroll to first error (15, 2.4).
- Leave guard (32, 2.1b, lane G): "Discard this new booking?" from ‹ / Cancel / breadcrumb / module link / app launcher / log out; Keep editing default focus (Esc, scrim); `beforeunload`; no prompt when pristine or after save. Fill the F4 `useLeaveGuard`.
- **Done when:** 03, 03b, 13, 14, 15, 32, 39, 40 pass G1–G4; lane G and "Save without invoice → Draft" run.

**Prompt**
```
Slice F10 of context/PROTOTYPE-PLAN.md. Read PRD US-1 and US-0 (dropdown rules), PLAN §5 (first
bullet), INTERACTIONS 2.1b, 2.2, 2.4–2.10, 2.12, 2.17.
figma-console: specs + PNG for 03, 03b, 13, 14, 15, 32, 39, 40 and Line item row, Summary row,
Text area, Crew select/dropdown/option/chip.
Use build-design to build /bookings/new with react-hook-form + zod, the live summary, the Invoices (0)
empty state and the leave guard (fill the useLeaveGuard hook from F4).
Run find-animation-opportunities on adding/removing item rows, the live total, dropdowns, crew chips,
validation errors and the discard dialog, then animate the accepted items. Test G1–G4 per frame, every
listed row, lane G and save-as-Draft. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: lane A1 → A2 → Save (Draft), lane G (all exits, pristine = no prompt).

---

### F11 — Invoice modal · first invoice

**Feature**
- `NewInvoiceModal` over New booking: balance strip, Segmented **DP / Full price** (3.2), DP method Percentage / Fixed (3.3), inline errors (05b, 3.5: "DP can't exceed the booking total (Rp X)", "Enter a DP above Rp 0"), Full read-only, live panel (total, type, method, Total bayar, remaining).
- Confirm (3.6): save booking if new + `createInvoice` → modal closes, `Invoice card` appears at top of Invoices (1), status Partially paid (05) or Paid (05c), toast. Loading (22, 3.7), failure + Try again (23, 3.8). × / Cancel / scrim / Esc close without prompt (3.1). Card PDF button (2.14, real PDF in F15).
- **Done when:** 04, 04c, 05, 05b, 05c, 22, 23 pass G1–G4; lane A (DP path, full path, E1) runs up to the PDF step.

**Prompt**
```
Slice F11 of context/PROTOTYPE-PLAN.md. Read PRD US-2, US-3, PLAN §5 (second bullet), INTERACTIONS
2.11, 2.14, 3.1–3.3, 3.5–3.8.
figma-console: specs + PNG for 04, 04c, 05, 05b, 05c, 22, 23 and Segmented control, Invoice card,
Invoice type tag.
Use build-design to build NewInvoiceModal + InvoiceConfigurator (first-invoice mode) and InvoiceCard,
using calc.ts and createInvoice from F2.
Run find-animation-opportunities on the modal open/close, segmented switch, progressive disclosure,
amount recalculation, loading/error states and the new card entering the list, then animate the
accepted items. Test G1–G4 per frame, every listed row, lane A (DP, Full, E1). Finish with §1 step 9.
```

**Workflow**
Standard loop. Unit: rounding cases through the modal. E2E: A2 → A3 → A4, A3b → A4b, E1 loop.

---

### F12 — Booking detail panel + Crew schedule

**Feature**
- Parallel route `@panel` → right side sheet over Calendar/Table; full page on direct link `/bookings/[id]` (4.3). × / scrim / Esc keep list scroll + filters (4.4).
- Sections per US-9 (06): ref, client, phone `wa.me` (4.5), date, package, crew chips, items, financial summary + progress + badge, Invoices (n) newest first (4.6), T&C. Actions: Edit booking (4.1), Download latest PDF hidden while Draft (4.2). Draft (21, 4.7). From rail (24).
- Crew schedule popover (27, 4.8–4.10, lane E): crew chip → popover, schedule items, *This booking* not clickable, item → switch panel, See in calendar → Calendar filtered by crew. Also wire F8 crew avatars (1.29) and F6/F7/F9 detail entry points.
- **Done when:** 06, 21, 24, 27 (and 29 unmasked) pass G1–G4; lanes B1 → B2, C3, D2, E run.

**Prompt**
```
Slice F12 of context/PROTOTYPE-PLAN.md. Read PRD US-9, PLAN §7 (detail), INTERACTIONS 4.1–4.10, 1.29.
figma-console: specs + PNG for 06, 21, 24, 27, 29 and Crew chip, Schedule item, Crew schedule popover.
Use build-design to build the detail side sheet (parallel route @panel + full page) and the Crew
schedule popover, and wire every entry point (chip, card, row, rail, table row, avatars).
Run find-animation-opportunities on the sheet enter/exit, switching bookings inside the sheet, the
progress bar and the crew popover, then animate the accepted items. Test G1–G4 per frame, every listed
row, lanes B1 → B2, C3, D2, E. Finish with §1 step 9.
```

**Workflow**
Standard loop. Remove the masks left in F8 (29).

---

### F13 — Edit booking + follow-up invoice

**Feature**
- `/bookings/[id]/edit` (07): same editor, diff strip "Previous total Rp X → New total Rp Y (+/− Rp Z)", Updated totals card, Invoices (n) with Create invoice (hidden once Paid). Save changes + toast (2.3). Unsaved-changes guard "Discard unsaved changes?" (12, 2.1).
- Total below paid (08, 2.13, E3): inline error "Total can't be lower than Rp X already paid", Save disabled.
- Invoice #n modal Partial / Paid (09, 10, 3.4): Partial `1 ≤ amount < remaining`, suggest Paid when equal; Paid locked to remaining; Confirm saves pending edits first.
- Archived package kept (38, 2.18).
- **Done when:** 07, 08, 09, 10, 12, 38 pass G1–G4; lane B (B3 → B5, E3, B6 → End Paid) runs.

**Prompt**
```
Slice F13 of context/PROTOTYPE-PLAN.md. Read PRD US-4, US-5, US-0 (archived on past bookings),
PLAN §7 (edit), INTERACTIONS 2.1, 2.3, 2.13, 2.18, 3.4.
figma-console: specs + PNG for 07, 08, 09, 10, 12, 38.
Use build-design to extend the F10 editor into edit mode (diff strip, updated totals, guard) and the
F11 modal into follow-up mode (Partial / Paid).
Run find-animation-opportunities on the diff strip, total changes, the inline total error, the
follow-up modal and the status change to Paid, then animate the accepted items. Test G1–G4 per frame,
every listed row, lane B incl. E3 and B6. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: B1 → B6 end to end.

---

### F14 — Cancel booking

**Feature**
- Cancel booking section at the end of the form (33, 2.15): only saved Draft / Partially paid, hidden for unsaved new, Paid and viewer. Warning button.
- Modal (34, 2.16): "Cancel this booking?", Warning alert "This can't be undone", Reason text area ≤ 255, **Keep booking** (default focus, Esc, scrim) / **Cancel booking**.
- After (35, 4.11): status Canceled (danger badge), toast "Booking canceled · BK-…", detail alert "Canceled on {date} by {name}" + reason, Edit hidden, "Remaining" → "Not collected", PDFs still work, `/edit` redirects to detail. Calendar/rail hide Canceled unless filtered; KPIs per US-12.
- **Done when:** 33, 34, 35 pass G1–G4; lane H runs.

**Prompt**
```
Slice F14 of context/PROTOTYPE-PLAN.md. Read PRD US-12 (Draft or Partially paid; PRD §2.6 agrees), INTERACTIONS 2.15, 2.16, 4.11, 1.33.
figma-console: specs + PNG for 33, 34, 35 and Warning button.
Use build-design to build the Cancel booking section, modal and the canceled read-only detail, using
cancelBooking from F2, and check the Calendar / rail / KPI / Table rules for Canceled.
Run find-animation-opportunities on the section, the modal and the status change, then animate the
accepted items. Test G1–G4 per frame, the listed rows, lane H incl. Keep booking / Esc and the Paid /
unsaved cases. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: H1 → H4 + both "no section" cases.

---

### F15 — Invoice PDF

**Feature**
- `components/pdf/InvoiceDocument.tsx` (@react-pdf) from `invoice.snapshot` only; Inter registered, token colours; contents per US-10; file name `INV-2026-0001_{client-slug}.pdf`.
- Download from card (2.14, 4.6) and Download latest PDF (4.2). Generation failure dialog (37, 4.12) with Try again / Cancel (invoice never rolled back).
- **Done when:** 11, 11b, 11c (PDF rendered to PNG at 1×) and 37 pass G1–G4; regenerating an old invoice gives identical bytes/figures; lane A5 / A5b runs.

**Prompt**
```
Slice F15 of context/PROTOTYPE-PLAN.md. Read PRD US-10, PLAN §8, INTERACTIONS 4.2, 4.6, 4.12.
figma-console: specs + PNG for 11, 11b, 11c, 37.
Build the @react-pdf InvoiceDocument from the snapshot only, the download route and the failure
dialog (use build-design for the dialog; match the A4 frames for the PDF).
Run find-animation-opportunities on the download button states and the failure dialog (the PDF itself
must not animate), then animate the accepted items. Test: PDF → PNG vs 11/11b/11c (G3), G1–G4 on 37,
snapshot immutability after editing the booking, lanes A5 / A5b. Finish with §1 step 9.
```

**Workflow**
Standard loop. G3 for PDFs uses a PDF → PNG render (e.g. `pdf-to-img`) at the frame size.

---

### F16 — Account settings + Log out

**Feature**
- `/account` (AC2, 6.7): Profile card (name + Edit name, email locked, role tag locked) and Security card (password masked, "Last changed {date}").
- Change name (AC3, AC3b, AC4, 6.8): 2–50 chars trimmed, "Enter 2–50 characters.", toast "Name updated", header + menu update.
- Change password (AC5, AC6, AC7, 6.9): show/hide, live rules checklist, inline errors, toast "Password updated · other devices were logged out", "Last changed today".
- Log out (LO1, LO2, 6.10): confirm dialog → leave guard first if a form is dirty → `/login?loggedOut=1` toast.
- **Done when:** AC2–AC7, LO1, LO2 pass G1–G4; Profile lanes A–D run.

**Prompt**
```
Slice F16 of context/PROTOTYPE-PLAN.md. Read PRD US-13, PLAN §8b, INTERACTIONS 6.7–6.10.
figma-console: Launchpad & Profile page — specs + PNG for AC2–AC7, LO1, LO2.
Use build-design to build /account, the change-name and change-password modals and the log-out
confirm, wired to the F4 account menu and the F10 leave guard.
Run find-animation-opportunities on the modals, the rules checklist, the header name update and the
log-out transition, then animate the accepted items. Test G1–G4 per frame, every listed row, Profile
lanes A–D. Finish with §1 step 9.
```

**Workflow**
Standard loop. E2E: Profile lanes A–D, D with a dirty booking form.

---

### F17 — Viewer role, loading states, full-flow regression

**Feature**
- `viewer` role (6.4): hide New booking, Edit booking, Create invoice, Archive, New package, Cancel booking section.
- Loading (6.3): skeleton rows (table), skeleton date cells (calendar), Loader in the detail panel; filters stay interactive.
- Full regression: every frame in the Figma deliverables list re-run through G1–G4; every hi-fi lane (Bookings A–H, Package A–D, Launchpad A–B, Profile A–D) as one Playwright suite; a11y check (keyboard, focus, `role`s, badge text + icon, WCAG 2.2 AA contrast); reduced-motion pass.
- Motion consistency pass: one more `find-animation-opportunities` over the whole app to catch gaps between slices, then `animate` for accepted items.
- **Done when:** all suites green, INTERACTIONS summary 94/94 verified, tracker fully ticked.

**Prompt**
```
Slice F17 of context/PROTOTYPE-PLAN.md. Read INTERACTIONS 6.3, 6.4 and the whole PLAN "Figma
deliverables" list.
Build the viewer role switch (/dev/role) and the loading skeletons (use build-design, Figma skeleton
patterns via figma-console).
Run find-animation-opportunities over the whole prototype for gaps and inconsistencies between
slices, then animate the accepted items in styles/motion.css.
Run the full regression: G1–G4 on every frame, all hi-fi lanes, keyboard/a11y, reduced motion.
Write the final report in prototype/docs/slices/F17.md and finish with §1 step 9.
```

**Workflow**
Standard loop; step 7 is the full suite. Any failure reopens the slice that owns that frame.

---

## 4. Progress tracker

Frozen "today" for tests: **Tue 10 Nov 2026** (`NEXT_PUBLIC_TODAY=2026-11-10`).

| Slice | Build | Motion scan | Motion build | Unit | E2E | G1 | G2 | G3 | G4 | Done |
|---|---|---|---|---|---|---|---|---|---|---|
| F0 Scaffold & tokens | ✅ | ✅ (0 accepted) | ✅ (tokens only) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F1 Base components | ✅ | ✅ (3 accepted) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (G3c) | ✅ | ✅ 2026-11-11 |
| F2 Domain + mock data | — | ✅ (none) | — | ✅ (122) | ✅ | ✅ | — | — | — | ✅ 2026-11-11 |
| F3 Login | ✅ | ✅ (1 accepted) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F4 Shell + launcher + menu | ✅ | ✅ (1 accepted) | ✅ | — | ✅ | ✅ | ✅ | ✅ (regions) | ✅ | ✅ 2026-11-11 |
| F5 Package Library | ✅ | ✅ (none new) | ✅ (review) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F6 Dashboard frame | ✅ | ✅ (1 accepted) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F7 Calendar · Month | ✅ | ✅ (2 accepted) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F8 Calendar · Week + Day | ✅ | ✅ (1 accepted) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F9 Table + search + filters | ✅ | ✅ (1 accepted) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F10 New booking + leave guard | ✅ | ✅ (2 accepted) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F11 Invoice modal #1 | ✅ | ✅ (2 accepted) | ✅ | ✅ (134, +4) | ✅ | ✅ | ✅ | ✅ (05b by behaviour) | ✅ | ✅ 2026-11-11 |
| F12 Detail + crew schedule | ✅ | ✅ (1 accepted) | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-11 |
| F13 Edit + follow-up invoice | ✅ | ✅ (0 new, 1 fix) | ✅ | ✅ (134) | ✅ | ✅ | ✅ | ✅ (10 by behaviour) | ✅ | ✅ 2026-11-12 |
| F14 Cancel booking | ✅ | ✅ (none) | — | ✅ (134) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-12 |
| F15 Invoice PDF | ✅ | ✅ (none) | — | ✅ (136) | ✅ | ⚠ (motion.css, other session) | ✅ | ✅ 11 / 11b / 11c · ⚠ 37 (dialog centring) | ✅ | ⚠ 2026-11-14 |
| F16 Account + log out | ✅ | ✅ (none) | — | ✅ (134) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 2026-11-12 |
| F17 Viewer, loading, regression | ✅ viewer + loading | ✅ (3 accepted, 4 rejected) | ✅ | ✅ (136) | ✅ 9 new · ⚠ full suite: 53/55 failures pre-date F17 (clean `HEAD` fails the same) | ✅ | ☐ | ⚠ 53 inherited | ☐ (no Skeleton in Figma) | 🟡 a11y: contrast tokens + 2 ARIA fixes open · 2026-11-14 |

## 5. Coverage check (sync with the other docs)

- **PRD stories:** US-0 → F5, F10, F13 · US-1 → F10 · US-2 → F11 · US-3 → F2, F11 · US-4 → F13 · US-5 → F13 · US-6 → F6–F8 · US-7 → F9 · US-8 → F9 · US-9 → F12 · US-10 → F15 · US-11 → F4 · US-12 → F6, F9, F14 · US-13 → F4, F16 · §4.3 Login → F3.
- **Figma screens:** Bookings 01–11 + 02b, 03b, 04c, 05b, 05c, 11b, 11c and 12–40 · Package 01–08 · Login P1–P3, E1–E7 · Launchpad L1–L3, M1–M3 · Profile AC1–AC7, LO1–LO2 — each appears in exactly one slice's frame list (02b/16/… shared frames are owned by the slice listed first).
- **INTERACTIONS:** all 94 rows (§1–§6) are assigned in the §2 table. 1.22 is verified as "no actions menu".
- **Hi-fi lanes:** Bookings A (F10–F11, F15) · B (F12–F13) · C (F7, F9, F12) · D (F6, F9, F12) · E (F12) · F (F7–F8) · G (F10) · H (F14) · Package A–D (F5) · Launchpad A–B (F4) · Profile A–D (F16).
- **Out of scope (as in PRD §5.1 / PLAN "Deferred"):** tablet & mobile layouts, void invoice, refunds, VAT/discounts, WhatsApp/email sending, Supabase backend.
