# Interaction spec — Booking & Package Library

Companion to `context/PRD.md` (stories + rules), `context/PLAN.md` (architecture, DS mapping, Figma deliverables) and `context/PROTOTYPE-PLAN.md` (build slices F0–F17; every row below is assigned to a slice there). Last synced 2026-11-11.

Audited and completed 2026-11-10 against Figma `bs internal tools`:
- **Bookings page**: *Booking · Screens* (01–11), *Booking · Interaction states* (12–40) and *Booking · Hi-fi flow* (lanes A–H).
- **Package Lib page**: screens 01–08 and the hi-fi flow (lanes A–D).
- **Login page**: P1–P3 and errors E1–E7.
- **Launchpad & Profile page**: *Launchpad · Hi-fi flow* (module switching), *Profile · Screens* (AC1–AC7, LO1–LO2) and *Profile · Hi-fi flow* (lanes A–D: account menu, change name, change password, log out).

**Status legend**
- ✅ **Designed**: a screen, state or flow step exists in Figma.
- 📝 **Spec**: the behaviour is defined here or in the PRD. It reuses existing visuals, so no new state is needed.

All 94 interactions are now defined. There are no ❌ items left.

---

## 1. Bookings dashboard (01 Calendar · 02 Table)

| # | Element | Trigger → result | Status | Figma / note |
|---|---|---|---|---|
| 1.1 | **New booking** | → New booking screen (Draft) | ✅ | Flow A1 → A2 |
| 1.2 | ~~**Package library**~~ | Removed from the Bookings header (decision 2026-11-11). Packages is reached from the app launcher | — | — |
| 1.3 | Tabs **Calendar / Table** | Switch view; search + filters persist across views | ✅ | Flow C1 → C2 |
| 1.4 | **Search** | Filters by booking / client / ref / phone (≥ 3 digits) after 250 ms debounce (`q=` in the URL). × clears at once. Applies to Calendar and Table | ✅ | 02, Flow B1 |
| 1.5 | **No results** | Empty state "No bookings match your search and filters", with **Reset filters** and **New booking** | ✅ | **18** |
| 1.6 | Filter **Status** (multi) | Same dropdown pattern as Crew: checkbox list Draft / Partially paid / Paid / Canceled, with "n selected", Clear (empties the draft) / Apply. Trigger: "All status" · the one status · "n status". `status=` | ✅ | Reuses `Crew dropdown` (02b) |
| 1.7 | Filter **Crew** (multi) | Search (name or role), check, Clear / Apply → trigger "n crew", chip "Crew: …". Esc / outside click discard the draft and return focus to the trigger. `crew=` | ✅ | 02b |
| 1.8 | Filter **Package** (multi) | Same pattern as Status (Package has search). `package=`. *(The Invoice type filter was removed 2026-11-11 — it didn't help; an old `type=` link is ignored.)* | ✅ | Reuses `Crew dropdown` |
| 1.9 | Filter **Date** (Table only) | Presets (Today, This week, This month, Next 7 days, Last month, Custom range) + two-month range calendar (two clicks pick a custom range), Clear / Apply. `range=` (`custom&from=&to=`); chip "Nov 2026" for month presets | ✅ | **16** |
| 1.10 | Filter chip **×** / **Reset all** | Removes one filter / all filters (search too). Row: "n filters ·" + chips (date · status · package · invoice · crew) + Reset all + "Showing n of N bookings" (Table). New chips fade in (125 ms) | ✅ | 02 |
| 1.11 | Calendar **‹ ›** / **Today** | Previous / next period (month, week or day) · jump to today. The anchor date lives in the URL (`date=YYYY-MM-DD`, omitted for today); ‹ › keep the day of month (clamped) | ✅ | PRD US-6 · 01 |
| 1.12 | **Day / Week / Month** | Switch view; the anchor date, search and filters are kept (`view=week&date=…`; Month has no `view` param). ‹ › step one month / week / day; titles "November 2026" · "9 – 15 Nov 2026" · "Saturday, 14 Nov 2026". Week = 7 columns of `Calendar/Week card`. Day = summary bar + `Calendar/Day row` list | ✅ | **19**, **20**, 01 · Flow F1 → F2 |
| 1.13 | Click a **booking chip / card** | → Booking detail panel | ✅ | Flow C1 alt → C3 |
| 1.14 | **"+N more"** (Month) | Popover listing all bookings for that date (status, package, client; row → detail) + footer **New booking on 14 Nov** · **Open day view** (→ `view=day&date=…`). Opens below the day, left-aligned with it and kept 8 px inside the card (from the 4th week it opens above); grows from the day; focus moves to the first row; Esc / outside click close and return focus to the day. Opening it doesn't change the selected date | ✅ | **17** · Flow F1 → F1b |
| 1.15 | **Empty date** hover / click | Hover shows "+ New booking" (dashed target, fades in 160 ms, hides at once); click → New booking with that date prefilled (`/bookings/new?date=…`). Keyboard: Enter on the date | ✅ | **17** |
| 1.15a | Month **keyboard grid** | One tab stop (the anchor date = *Selected* cell; Today keeps its Today style). ← → ±1 day · ↑ ↓ ±1 week · Home / End week start / end · PageUp / PageDown ±1 month; moving past the month switches it. Enter / Space: day popover (instantly, no entrance) or New booking on an empty date. Clicking a day (not a chip / “+N more”) → **New booking** on that date, also when it already has bookings (decision 2026-11-11). Hover fills the cell surface/accent (in-month, not today) | ✅ | PRD §4.5 · 01 (12 Nov Selected) |
| 1.16 | **Upcoming** item | → Booking detail panel for that booking (rail shows up to 4 bookings of the next 7 days, Canceled hidden) | ✅ | Flow D1 → D2 · **24** |
| 1.17 | **See all in table** | → Table tab, date filter "Next 7 days" (`range=next-7-days`), sorted by date | ✅ | Flow D1 → D3 · **25** |
| 1.18 | Insight card action | "View booking" → that booking's detail panel · "View bookings" → Table filtered to This week + Partially paid + DP | ✅ | Flow D1 → D2 / D4 · **24**, **26** |
| 1.19 | Table **row** / chevron | → Booking detail panel | ✅ | Flow B1 → B2 |
| 1.20 | Table **sort** headers | Booking date / Total / Remaining / Status: first click asc, then asc ⇄ desc; one column at a time (`sort=` · `dir=desc`). Default (no sort): upcoming bookings from today ascending, then past bookings newest first | ✅ | PRD US-7 |
| 1.21 | **Pagination** + page size | Page change keeps filters, sort and search; any filter / sort change returns to page 1. `page=` · `size=10|25|50` (*no page-size control in Figma yet — URL only*) | ✅ | PRD US-7 |
| 1.22 | Row **Actions** menu | Removed: the row opens the detail panel (decided 2026-11-10) | ✅ | PRD US-7 updated |
| 1.23 | Metric card **ⓘ** | Tooltip (Figma "Tooltips" popover 62:115173 — shell + white panel, Text/Body) on hover (short delay) or keyboard focus; Esc hides; moving between ⓘ icons shows the next one at once. *Bookings this month*: "Bookings with a booking date this month". *Outstanding balance*: "Remaining across Partially paid bookings". *Collected this month*: "Sum of invoices created this month" | 📝 | Tooltips popover (62:115173) |
| 1.24 | Week **day header** | Hover: day name accent + underline, date pill surface/accent (colours ease 160 ms) + tooltip "Open day view · Sat, 14 Nov" (DS Tooltip, centred below). Click → Day view for that date. Today's column is filled surface/accent | ✅ | **28** · Flow F2 → F3 |
| 1.25 | Week **card** | Hover: subtle fill, shadow, underlined title. Click → Booking detail panel | ✅ | **28** · same as 1.13 |
| 1.26 | Week **empty day** | Hover: column surface/subtle and a dashed "+ New booking" target replaces "No bookings" (fades in 160 ms). Click → New booking with that date prefilled. The target is also a keyboard stop | ✅ | **28** · Flow F2 → A2 |
| 1.27 | Week column **overflow** | More than 5 bookings → 5 cards + full-width ghost "+N more" (pressed while open; a second click closes). Click → day popover centred below it, 8 px gap (lists up to 7 rows before scrolling): "Sat, 14 Nov 2026 · 7 bookings", every booking (status bar, name, package · client, badge; row → detail), footer **New booking on 14 Nov** + **Open day view**. Esc / outside click closes | ✅ | **31** · Flow F2 → F2b |
| 1.28 | Day **row** | Hover: subtle fill, underlined title. Click (row or chevron) → Booking detail panel | ✅ | **29** · Flow F3 → F4 |
| 1.29 | **Crew avatar** (Week card / Day row) | Opens the Crew schedule popover; the source booking is marked *This booking* | ✅ | **29** · Flow F3 → lane E |
| 1.30 | Day **no bookings** | Empty state "No bookings on Sunday, 15 Nov" + primary **New booking on this date** | ✅ | **30** |
| 1.31 | Day **New booking on this date** | → New booking with that date prefilled (`/bookings/new?date=…`) | ✅ | Same as 1.15 |
| 1.32 | **First use** (no bookings) | KPIs 0 · "No bookings yet" + New booking · empty rail | ✅ | **36** |
| 1.33 | Status filter **Canceled** | Canceled bookings hidden in Calendar / rail unless selected; always in Table with badge | ✅ | PRD US-12 |

## 2. New / Edit booking (03–09)

| # | Element | Trigger → result | Status | Figma / note |
|---|---|---|---|---|
| 2.1 | Edit mode: Back **‹** / **Cancel** / breadcrumb with unsaved changes | "Discard unsaved changes?" naming what changed ("You changed the package, items and booking date…") with **Keep editing** / **Discard changes**. No prompt when nothing changed | ✅ | **12** |
| 2.1b | Create mode: ‹ / **Cancel** / breadcrumb / module link / app launcher with anything entered | "Discard this new booking?" ("If you close this page, your progress will be discarded…") with **Keep editing** (Esc / scrim) / **Discard booking** → destination, nothing created. Nothing entered → leaves without a prompt. Browser back / refresh / close tab → native `beforeunload` prompt | ✅ | **32** · Flow lane G |
| 2.2 | **Save booking** (new) | Saves as Draft, toast "Booking saved as Draft", stays on the screen in edit mode (breadcrumb = booking ref, title = booking name + status badge as Figma 05 / 07, URL `/bookings/<id>/edit`, header "Saved just now" — "Draft · saved" on a later visit — button Save changes); leaving no longer prompts | ✅ | Flow A2 → "Saved · Draft" |
| 2.3 | **Save changes** (edit) | Saves, recalculates, toast "Changes saved"; the diff strip clears; existing invoices unchanged | ✅ | Flow B3 |
| 2.4 | Save with missing / invalid fields | Inline field errors + summary alert "n fields need attention" (counts every invalid field, item cells included; updates as fields are fixed); scroll to and focus the first error | ✅ | **15** |
| 2.5 | **Package** select | Dropdown with search; rows show name · description · price; ✓ on the selected one | ✅ | **13** |
| 2.6 | **Manage library** | Opens Package Library in a new tab (the form is kept) | ✅ | **13** (dropdown footer) |
| 2.7 | **Booking date** | Month picker: today ringed, selected filled, Today shortcut. Past dates allowed with a warning | ✅ | **14** |
| 2.8 | **Add item** / fields / **remove** | Adds a row (focus in its name; the row fades in); price takes digits only with a thousands mask (Rp 1.500.000); qty 1–999; subtotal and summary live; trash removes it (no confirm) | ✅ | PRD US-1 · 03 |
| 2.9 | **Crew** select / chip × | Dropdown (opens above the box) with search by name or role, instant apply; chip × removes; helper "3 crew assigned" | ✅ | 03b |
| 2.10 | **Terms & Conditions** | Prefilled with the workspace default (174/255); counter, typing stops at 255, a longer paste is kept and shows "Max 255 characters" at once | ✅ | DS `Text area` |
| 2.11 | **Create invoice** | Opens the invoice modal (form incomplete → field errors + "n fields need attention", no modal) | ✅ | Flow A2 → A3 / A3b, B3 → B4 |
| 2.12 | Create invoice while the form is invalid | Disabled + tooltip "Complete client name and phone first" | ✅ | **15** |
| 2.13 | Edit lowers total below paid | Package field error "Total Rp X can’t be lower than Rp Y already paid", rail "Booking total" danger block, Save disabled, Invoices hidden until fixed | ✅ | 08 · Flow E3 |
| 2.14 | Invoice card **PDF** | Downloads that invoice's PDF (button in F11, PDF itself F15) | ✅ | Flow A4 → A5 |
| 2.15 | **Cancel booking** section (saved Draft / Partially paid only) | Warning button → reason modal | ✅ | **33** · Flow H2 → H3 |
| 2.16 | Cancel modal **Cancel booking** / **Keep booking** / Esc | Confirm → status Canceled, the Bookings page opens the read-only detail panel + toast "Booking canceled · BK-…"; Keep (default focus) / Esc / scrim → back, nothing changes; a failure keeps the modal and the reason ("Couldn’t cancel the booking") | ✅ | **34**, **35** · Flow H3 → H4 |
| 2.17 | Package dropdown (archived / empty library) | Archived packages hidden + note; empty library → "No packages yet" + link to Package Library | ✅ | **39**, **40** |
| 2.18 | Edit booking with an archived package | Package card "Archived" tag + helper; kept at its saved price | ✅ | **38** |

## 3. Invoice modal (04 · 04c · 05b · 09 · 10 · 22 · 23)

| # | Element | Trigger → result | Status | Figma / note |
|---|---|---|---|---|
| 3.1 | **×** / **Cancel** / scrim / Esc | Closes without creating anything (no discard prompt); the next opening starts fresh. Disabled while Confirm is in progress (3.7) | ✅ | — |
| 3.2 | **DP / Full price** (invoice #1) | Progressive disclosure | ✅ | 04 / 04c |
| 3.3 | **Percentage / Fixed amount** | Swaps the input + recalculates | ✅ | 04, 05b |
| 3.4 | **Partial / Paid** (invoice #n) | Partial: `1 ≤ amount < remaining` (equal → "use Paid to settle in full"); Paid (Lunas) locks the amount to the remaining balance, button "Confirm full payment". Confirm saves pending edits first ("Changes saved · INV-… added · …") | ✅ | 09 / 10 |
| 3.5 | Amount over the limit | Inline error, Confirm disabled | ✅ | 05b · Flow E1 |
| 3.6 | **Confirm** | Saves the booking (if new or edited) + creates the invoice in one transaction → modal closes, card (Latest, accent border) at the top + toast "Booking saved · INV-… added · Partially paid / Paid" ("INV-… added · …" when the booking was already saved) | ✅ | Flow A4 / A4b / B5 |
| 3.7 | Confirm **in progress** | Confirm shows Loading, Cancel disabled, footer says "Saving booking and creating invoice…" | ✅ | **22** |
| 3.8 | Confirm **fails** | Danger alert in the modal ("Couldn't create the invoice"); entries kept; button becomes **Try again** | ✅ | **23** |

## 4. Booking detail panel (06 · 21)

| # | Element | Trigger → result | Status | Figma / note |
|---|---|---|---|---|
| 4.1 | **Edit booking** | → Edit booking screen | ✅ | Flow B2 → B3 |
| 4.2 | **Download latest PDF** | Downloads the newest invoice's PDF; hidden while Draft | ✅ | 06 / 21 |
| 4.3 | **Open full page** (↗) | → the full booking screen = **Edit booking** `/bookings/[id]/edit` (decision 2026-11-11 — no separate full-page copy of the sheet). A direct `/bookings/[id]` link redirects there | ✅ | PRD §4.1 |
| 4.4 | **×** / scrim / Esc | Closes the panel; the list keeps its scroll + filters (only `?booking=` is dropped) | ✅ | — |
| 4.5 | **Phone** link | Opens `wa.me/62…` in a new tab | ✅ | PRD US-9 |
| 4.6 | Invoice card **PDF** | Downloads that invoice | ✅ | 06 |
| 4.7 | **Draft** booking | Invoices (0) empty state with no button; hint "Open Edit booking to create the first invoice" | ✅ | **21** |
| 4.8 | **Crew chip** (Crew row) | Opens the **Crew schedule popover** with that person's upcoming bookings; hover shows an underline + accent border | ✅ | **27** · Flow S1 → S2 |
| 4.9 | Popover **schedule item** | Switches the side panel to that booking's detail. *This booking* isn't clickable | ✅ | Flow S2 → S3 (**24**) |
| 4.10 | Popover **See in calendar** / Esc / outside click | Calendar with Crew filter = that person (panel closes) / closes the popover only (the panel stays; focus back on the chip) | ✅ | Filter pattern 02b |
| 4.11 | **Canceled** booking | Canceled badge + alert (date, by, reason); Edit booking hidden; "Remaining" → "Not collected"; PDFs still downloadable; `/bookings/[id]/edit` redirects to the panel | ✅ | **35** |
| 4.12 | PDF generation fails | Dialog "Couldn't generate the invoice PDF" with **Try again** / **Cancel** | ✅ | **37** |

## 5. Package Library

| # | Element | Trigger → result | Status | Figma / note |
|---|---|---|---|---|
| 5.1 | **New package** | Empty dialog "New package", **Create package**; no Archive | ✅ | Package **02** |
| 5.2 | **Edit** | Prefilled dialog | ✅ | Package 01 · flow P1 → P2 |
| 5.3 | **Save / Create package** | Saves, closes, toast | ✅ | Flow P2 → End |
| 5.4 | **Archive** (row icon / dialog) | Confirm "Archive 'Gold Package'?", explaining that existing bookings keep it; Cancel focused, Esc closes only the confirm; after archiving, focus moves to the page heading | ✅ | Package **03** |
| 5.5 | **Archived** tab | Archived packages with archive date and **Restore**; restore is blocked (toast) while an active package has the same name | ✅ | Package **04** |
| 5.6 | Search / pagination | Filters the list / pages; no match → "No packages match …" + **Clear search** | ✅ | Package **08** · flow lane D |
| 5.7 | **Description** text area | Multi-line, max 1000 characters, live `n/1000` counter; paste over the limit is cut with an inline error (same pattern as Terms & Conditions) | ✅ | Package **01**, **02** · DS `Text area` |
| 5.8 | **Empty library** | "No packages yet" + **Create first package** → New package | ✅ | Package **07** · flow D1 |
| 5.9 | Create / save **validation** | Duplicate active name, missing price → inline errors | ✅ | Package **05** · flow C2 → C3 |
| 5.10 | Save **fails** | Danger alert in modal, entries kept, **Try again** | ✅ | Package **06** · flow lane A |
| 5.11 | Create / Archive / Restore flows | Lanes B (create) and C (archive & restore) | ✅ | Package Lib hi-fi flow |

## 6. Global

| # | Element | Status | Note |
|---|---|---|---|
| 6.1 | Language, workspace selector | ✅ | Existing CIR shell |
| 6.1a | **App launcher** ⋮⋮ → popover; current module tile highlighted; tile → switch module (Booking ⇄ Package Lib); current tile / Esc / × / outside click → close; unsaved booking → leave guard first | ✅ | Launchpad page · flow lanes A (L1 → L3) and B (M1 → M3) · PRD US-11 |
| 6.2 | Success toasts | ✅ | 05, 05c, B5 |
| 6.3 | Loading | ✅ | Skeleton rows (table, 8 + footer), skeleton date cells (calendar; week / day 3–4 blocks), KPI value + rail skeletons, DS `Loader` (5×5 orchid dots) in the detail panel — appears only after 250 ms so fast loads never flash it. Filters, search and view switch stay interactive. Figma: CIR · Design System → Pattern · Data & content (`Skeleton`, `Loader`). Package library has no skeleton yet |
| 6.4 | `viewer` role (read-only) | ✅ | Hide New booking (header, empty states, quick-add targets), Edit booking, Create invoice, the Cancel booking section, Archive / Restore, New package and Edit package. `/bookings/new` → `/bookings`; `/bookings/[id]/edit` → read-only view. Everything else stays visible. Prototype switch: `/dev/role` |
| 6.5 | Login **Forgot password?** | ✅ | Info alert "contact your workspace admin" — Login **E7**. Other login states: required (E1), email format (E2), wrong credentials (E3, password cleared + focused), session expired (E4, `?expired=1`, email prefilled), Caps Lock (E5), server unreachable (E6, "Try again") |
| 6.6 | **Profile** (header) → Account menu | Popover: Account Setting · Log out; ↑ ↓ move between items; Esc / outside / profile again closes (focus back to the profile) | ✅ | Launchpad & Profile **AC1** · Profile flow A |
| 6.7 | **Account Setting** → Account settings page | Profile (name, email, role) + Security (password) | ✅ | **AC2** · flow A |
| 6.8 | **Edit name** → modal → Save | 2–50 chars; error "Enter 2–50 characters."; toast "Name updated", header updates | ✅ | **AC3**, **AC3b**, **AC4** · flow B |
| 6.9 | **Change password** → modal → Update | Current / new / confirm, live rules; errors inline; others logged out; toast | ✅ | **AC5**, **AC6**, **AC7** · flow C |
| 6.10 | **Log out** → centred confirm → Login | Cancel / Esc stays; unsaved booking → leave guard first (wired; not reachable today — New / Edit booking use the Editor header without the account menu); toast "You’ve logged out" (top-centre, 32 from the top on Login) | ✅ | **LO1**, **LO2** · flow D |

---

## Summary

| Status | Count |
|---|---|
| ✅ Designed | 78 |
| 📝 Spec (behaviour defined, reuses existing visuals) | 16 |
| ❌ Undefined | 0 |
