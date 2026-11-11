# PRD — Booking & Invoice Management (bs.moment · Booking module)

| | |
|---|---|
| **Status** | Draft v1 · 2026-11-10 |
| **Owner** | bs.moment internal tools |
| **Design source** | Figma `bs internal tools` → page **CIR · Design System** (tokens, components, layouts) · pages **Bookings** (screens 01–11, interaction states 12–40, hi-fi flow lanes A–H), **Package Lib** (01–08, lanes A–D), **Login** (P1–P3, E1–E7), **Launchpad & Profile** (launcher flow, AC1–AC7, LO1–LO2) |
| **Companions** | `context/PLAN.md` (build plan, DS mapping) · `context/INTERACTIONS.md` (94 interactions) · `context/PROTOTYPE-PLAN.md` (prototype slices F0–F17) · last synced 2026-11-11 |
| **Stack** | Next.js (App Router) · Tailwind (CIR tokens) · Supabase (Postgres, Auth, Storage) · `@react-pdf/renderer` |
| **Currency** | IDR only (`Rp 1.250.000`, `id-ID` locale, no decimals) |

---

## 1. Executive Summary

**Problem statement.** Bookings, package pricing, deposits and follow-up payments are tracked across chats, spreadsheets and ad-hoc invoices. Totals are recalculated by hand, deposits get confused with full payment, and edits to a booking silently change what past invoices "said".

**Proposed solution.** A new **Booking** module inside the existing bs.moment internal-tools shell (CIR design system). It holds one record per booking (client, package from a Package Library, additional items and date), calculates money in real time, and issues immutable invoice snapshots (DP / Full / Partial / Paid) backed by an append-only payment ledger. Bookings appear in a Calendar view and a Table view.

**Success criteria (measured 60 days after launch).**
1. **≥ 95%** of new bookings get created in the system, not in spreadsheets (bookings in the system ÷ bookings confirmed with clients).
2. A new booking with its first invoice takes a **median ≤ 90 s** from "New booking" to PDF download (instrumented).
3. **0** financial mismatches: for every booking, `total_paid == Σ non-void invoice amounts`, and every invoice PDF matches its snapshot (nightly reconciliation job).
4. **100%** of invoice numbers are unique and sequential per year (DB constraint, verified by test).
5. Finding a booking by client name or phone takes **p95 ≤ 300 ms** at 10k bookings.

---

## 2. User Experience & Functionality

### 2.1 Personas

| Persona | Context | Needs |
|---|---|---|
| **Admin / Booking officer** (primary) | Creates bookings while on the phone or WhatsApp with a client. Desktop-first, sometimes mobile. | Creates bookings quickly, sees DP vs. remaining balance at a glance, sends a PDF right away. |
| **Finance** | Reconciles incoming transfers weekly. | Needs an accurate payment history, outstanding balances, and invoices that never change after issue. |
| **Owner** | Checks the schedule and cash position. | Needs a calendar of upcoming bookings and a view of what's unpaid. |

### 2.2 Domain glossary (fixed terminology)

| Term | Definition |
|---|---|
| **Booking total** | `package_price + Σ(item.price × item.qty)` |
| **Invoice type** | What a given invoice requests: **DP**, **Full**, **Partial** or **Paid** (Paid = Lunas). |
| **Booking status** | Derived from the booking's invoices: **Draft** (no invoice yet), **Partially paid** (has invoice(s), balance remaining) or **Paid** (invoices cover the full total). **Canceled** is the one manual status: set by an admin from Draft or Partially paid, final and read-only. |
| **Invoice** | One payment request + record linked to a booking. A booking has **0…n invoices**; each one is listed as a card in the booking detail. |
| **Total paid** | `Σ invoice.amount` for all non-void invoices of the booking |
| **Remaining balance** | `booking_total − total_paid` |

Invoice type and booking status are separate fields. A DP invoice never makes a booking Paid.

**Status lifecycle:** booking created → **Draft** · first invoice is a DP / partial amount → **Partially paid** · invoice(s) reach the full total (Full price or Paid) → **Paid**. Draft or Partially paid → **Canceled** (manual, see US-12). Paid bookings can't be canceled.

> Note: the **first** invoice of a booking offers "DP / Full price"; **later** invoices offer "Partial / Paid". **Full** and **Paid** both settle the balance and produce status **Paid**. They're stored as different invoice types so the history shows which flow produced them.

### 2.3 User stories & acceptance criteria

#### US-0 Package Library
*As an admin, I want to manage a library of packages so that bookings pick from consistent, up-to-date prices.*
- CRUD packages with fields: name (required, unique among active packages), price IDR (≥ 0, integer), description (optional **text area**, max 1000 characters with a live `n/1000` counter; typing stops at the limit and a longer paste is cut with an inline error), and an active toggle.
- Archived packages are hidden from the booking picker. They still show on existing bookings and invoices.
- Changing a package price **does not** change existing bookings, because the booking stores `package_name_snapshot` and `package_price_snapshot` at selection time. Admins can re-select the package on a booking to pick up the new price.
- Empty state (no packages yet): "No packages yet" with a **Create first package** button (Package screen 07). A search with no matches shows "No packages match "…"" with **Clear search** (08).
- Validation, shown inline after **Create package** / **Save package**: a duplicate name among active packages shows "A package named "Gold Package" already exists. Use a different name."; a missing or invalid price shows "Enter a price — whole Rupiah, 0 or more." (05). If saving fails, a danger alert appears in the modal, the entries are kept and the primary button becomes **Try again** (06).
- **Archived packages aren't listed in the booking form's Package dropdown.** The dropdown ends with a note: "1 archived package isn't listed (Gold Package). Restore it in Package Library to use it again." (Bookings screen 39).
- **Past bookings keep an archived package.** Detail, Table, PDF and Edit booking still show it. In Edit booking the package card gets an **Archived** tag and the helper reads "Archived — kept on this booking at its saved price. It isn't listed in the dropdown." (38). Choosing another package replaces it; the archived one can't be re-picked.
- With an empty library, the booking form's Package dropdown shows "No packages yet" and the link "Create a package in Package Library (opens in new tab)" (40). Package lists refresh when the booking tab regains focus.

#### US-1 Create booking
*As an admin, I want to create a booking in one form so that client, package, extras and date are all captured together.*
- Required: client name (2–80 chars), phone (Indonesian format, normalised to `+62…`, 9–15 digits), package (exactly 1), booking date.
- Optional: booking name (defaults to `{client name} · {package}`).
- **Terms & Conditions** (section *Others*): a multi-line text area, **max 255 characters**, with a live counter (`174/255`). It's prefilled from the workspace default terms and can be edited per booking. Typing stops at 255, and pasted text over the limit shows the Error state ("Max 255 characters"). Validated server-side too.
- **Crew** (section *Crew*): a multi-select of the crew handling the booking. A booking can have **0…n crew**. Selected crew show as removable chips (avatar + name). The dropdown lists active crew with avatar, name and role, has a search, and applies instantly (no footer). The source is the workspace crew list (members flagged as crew, with a role).
- Additional items: add or remove rows dynamically. Each row has name (required), price (integer ≥ 0) and qty (integer 1–999). Subtotal = price × qty, shown live.
- The summary card updates on every keystroke (< 50 ms): package price, additional items total, subtotal, **total**.
- `created_at` is stored automatically. The booking date shows in the calendar right after save.
- **Invoices live in the same screen.** The right column of the New booking (and Edit booking) screen has an **Invoices (n)** section. A new booking starts as **Draft** with `Invoices (0)` and an empty state. Admins can save without an invoice (stays Draft) or create the first invoice right there.
- Validation errors appear inline using the DS *Input field / Error* state. A negative price or a qty < 1 can't be entered (input mask) and is also rejected server-side.
- **Leave guard (create mode):** while a New booking has unsaved input, every exit asks first. Exits are ‹ back, **Cancel**, the breadcrumb or module link, the app launcher, and in-app navigation such as the rail or the logo.
  - Dialog: **"Discard this new booking?"**, body "If you close this page, your progress will be discarded. The client details, package, items and crew you entered haven't been saved yet." Buttons: **Keep editing** (default focus; Esc and scrim click do the same) and **Discard booking**.
  - Discard → go where the admin was heading. Nothing is created.
  - Browser back, refresh and closing the tab use the browser's native "Leave site?" prompt (`beforeunload`; the browser sets that text).
  - No prompt if nothing was entered (the form equals its initial values; a date prefilled from the calendar doesn't count).
  - No prompt after **Save booking** or after an invoice is created: the booking then exists, and the edit-mode guard ("Discard unsaved changes?", screen 12) covers later changes.

#### US-2 First invoice: DP or Full
*As an admin, I want to issue the first invoice as a down payment or full payment so that the client knows exactly what to transfer.*
- Started inside the New booking screen: **Create invoice** in the *Invoices (0)* section opens a **New invoice #1 modal** over the New booking screen (no page change). The modal shows the booking balance (total, paid, remaining), the invoice form and a footer with Cancel / Confirm.
- For the first invoice the modal shows two segmented options: **DP** and **Full price**.
- **DP** reveals a method toggle: **Percentage** or **Fixed amount**. This is progressive disclosure, so nothing extra shows until DP is selected.
  - Percentage: 0–100, max 2 decimals. `amount = round(total × pct / 100)`, rounded to the nearest Rupiah (half-up).
  - Fixed: integer IDR, `1 ≤ amount ≤ total`.
  - `amount > total` → inline error "DP can't exceed the booking total (Rp X)", and Confirm is disabled.
  - DP = 0 (0%) is blocked, with the message "Enter a DP above Rp 0".
- **Full** sets `amount = total`. The input is read-only.
- The live panel shows: total booking amount, invoice type, method (DP only), **Total bayar**, and remaining balance (`total − total bayar`).
- **Confirm** (one DB transaction) saves the booking if it's new, then creates the invoice linked to it: number, snapshot and amount. The amount counts as paid immediately, the booking status is recalculated (Draft → Partially paid, or → Paid for Full price), the modal closes and a new **Invoice card** appears in the screen's Invoices section, a toast confirms, and the PDF is available from the card.

#### US-3 Invoices are the payment record
*As finance, I want each invoice to represent money received so that a booking's status is always derived from its invoices.*
- An invoice is created when the client pays; its amount counts toward total paid immediately. There is no separate pending/confirm step.
- A booking can hold any number of invoices (n-invoice). Each is linked by `booking_id` and never edited after creation.
- Mistakes are corrected by **voiding** an invoice with a reason (v1.1). A void invoice is excluded from total paid and the status is recalculated.

#### US-4 Find & update a booking
*As an admin, I want to search and edit an existing booking so that changes are reflected and the totals stay correct.*
- Global search covers booking name, client name and phone (including partial digits). Results update after 250 ms of debounce.
- Editable fields: client name, phone, package (re-pick), additional items (add, remove, change price or qty), booking date, **crew** and Terms & Conditions.
- The new total recalculates live. A **diff strip** shows "Previous total Rp X → New total Rp Y (+/− Rp Z)".
- Saving an edit **never** changes existing invoices or payments.
- Changing the date updates the calendar right away (optimistic UI, then revalidation).

#### US-5 Follow-up invoice: Partial or Paid
*As an admin, I want to issue a follow-up invoice so that I can collect further payments while keeping the history.*
- Started inside the **Edit booking** screen: its right column shows the updated totals and the **Invoices (n)** section (existing cards + **Create invoice**). **Create invoice** opens the same **New invoice #n modal** (Partial / Paid) over the Edit booking screen. Available when the booking has ≥ 1 invoice and `remaining_balance > 0`; hidden when status is Paid.
- Confirming saves pending booking edits first, then creates the invoice against the new total.
- **Partial** reveals an amount input. Rule: `1 ≤ amount < remaining`. If `amount == remaining`, the UI suggests switching to **Paid**.
  - `new_total_paid = previous_total_paid + amount` and `new_remaining = total − new_total_paid`.
- **Paid** sets `amount = total − previous_total_paid` (read-only). Once it's created, remaining = Rp 0 and status = Paid.
- The live panel shows: updated booking total, previous total paid, this payment, new total paid and new remaining balance.
- **Total can't drop below paid:** an edit that would make `total < total_paid` can't be saved. An inline error appears on the total ("Total can't be lower than Rp X already paid"), and Save stays disabled until the package or items are changed back. No negative payment is ever created, and there is no separate review status. *(Figma: Bookings › screen 08, flow branch E3.)*

#### US-6 Booking dashboard: Calendar
*As an owner, I want to see bookings on a calendar so that I know what's coming.*
- Month view is the default. Day and week views can be toggled (DS *Tab*).
- Each date cell shows a booking count, up to 3 booking chips coloured by booking status (Draft / Partially paid / Paid), and "+N more". "+N more" opens a day popover listing every booking that day (row → detail panel), with "New booking on 14 Nov" and "Open day view" in its footer. Week view uses the same popover.
- Today is highlighted (accent ring). Prev/Next month navigation plus a "Today" button.
- **Week view** (Mon–Sun, 7 columns):
  - Each column has a day header (*Calendar/Week day head*: Default / Today / Hover). Under it are the day's bookings as *Calendar/Week card*s, sorted by creation time. A card shows a status bar, name, package, a status badge and crew avatars.
  - The column scrolls when its cards overflow. With more than 5 bookings, the column shows 5 cards plus a full-width "+N more" button. It opens a day popover listing every booking that day (status bar, name, package · client, badge; clicking a row opens the detail panel). The popover footer has "New booking on 14 Nov" and "Open day view".
  - Clicking a day header opens the Day view for that date (tooltip "Open day view · Sat, 14 Nov").
  - Clicking a card opens the Booking detail panel.
  - Hovering an empty day shows a dashed "+ New booking" target. Clicking it opens New booking with that date prefilled.
  - ‹ › moves one week; the title reads "9 – 15 Nov 2026".
- **Day view:**
  - A summary bar ("4 bookings · 2 Draft · 1 Partially paid · 1 Paid"), then one *Calendar/Day row* per booking: status bar, name, package · client, crew avatars, total and remaining, status badge and a chevron.
  - A row click opens the detail panel. ‹ › moves one day.
  - "+ New booking on this date" sits at the end of the list. With no bookings, an empty state reads "No bookings on Sunday, 15 Nov" and the primary button reads "New booking on this date".
- **Crew avatars** in Week cards and Day rows open the **Crew schedule popover** (same as US-9). The booking you clicked from is marked *This booking*.
- Switching Month / Week / Day keeps the anchor date and every search term and filter. The selected view is stored in the URL (`view=week&date=2026-11-12`).
- Clicking a chip opens the **Booking detail** side panel (`Shell/Popover`-style right sheet).
- A right rail lists **Upcoming** bookings (next 7 days), following the existing *Insights rail* pattern.

#### US-7 Booking dashboard: Table
*As finance, I want a sortable table of bookings so that I can work through balances.*
- Columns: Booking name, Client, Phone, Package, Booking date, Total, Total paid, Remaining, Status, and a chevron (›).
- Sortable by booking date (default asc from today), total, remaining and status.
- Paginated at 10 / 25 / 50 rows per page using the DS *Table/Footer* and *Pagination item* components.
- Clicking a row (or its chevron) opens the read-only detail panel. There's no per-row actions menu: editing and creating invoices happen in the booking screen (via **Edit booking** in the detail panel).

#### US-8 Search & filters
*As any user, I want to combine filters so that I can narrow down quickly.*
- Filters: date preset (Today / This week / This month / Next 7 days / Last month / Custom range), status (Draft / Partially paid / Paid / Canceled, multi), **crew (multi-select)**, package (multi), and the type of the latest invoice (DP / Full / Partial / Paid, multi).
- Filters combine with AND, values within one filter combine with OR, and the state lives in the URL query (shareable). The same filters apply to both Calendar and Table.
- Active filters show as removable chips, plus a "Reset all" link.
- **Crew filter:** a dropdown with search, checkbox + avatar + name + role per crew member, a "n selected" count and Clear / Apply. The trigger shows `All crew` or `n crew`. A booking matches if **any** of its crew is selected (OR within the filter, AND with the other filters). The active chip reads e.g. "Crew: Raka Pratama, Dinda Ayu".

#### US-9 Booking detail
*As an admin, I want one place for everything about a booking.*
- Sections: booking info (reference `BK-2026-0001`, client, phone with a `wa.me` link, date, package, **crew** as read-only chips, items), financial summary (total, paid, remaining, progress, status badge), **Invoices (n)** — one **Invoice card** per linked invoice, newest first (number, type tag, issue date, amount, "paid after this invoice", PDF download); when there are none an empty state with no button and the hint "Open Edit booking to create the first invoice" — and Terms & Conditions.
- **Crew schedule:** clicking a crew chip opens a **Crew schedule popover**: avatar, name, role and number of bookings this month, then that person's upcoming bookings from today (date, booking name, package · client, status). The booking being viewed is marked *This booking* and isn't clickable. Clicking another booking switches the same side panel to that booking's detail. **See in calendar** opens the Calendar filtered to that crew member. Esc or clicking outside closes the popover.
- The detail panel is **read-only** for invoices (cards + PDF download). Actions: **Edit booking** (opens the booking screen, where invoices are created) and Download latest PDF (hidden while Draft).

#### US-10 PDF invoice
*As an admin, I want a professional PDF so that I can send it directly to the client.*
- A4 portrait, following the existing *Invoice editor → A4 preview* style.
- Contents: business name, logo and contact (from Settings), invoice number `INV-2026-0001`, invoice date, client name and phone, booking ref, booking date, package line, item breakdown (name, price, qty, subtotal), booking total, invoice type, **this payment**, total paid (including this invoice), remaining balance, payment instructions (bank, account no., account name from Settings), and the booking's Terms & Conditions (≤ 255 chars, copied into the invoice snapshot at issue time).
- Generated from the **invoice snapshot only**, never from the live booking. Regenerating an old invoice always produces identical figures.
- File name: `INV-2026-0001_{client-slug}.pdf`.
- **Generation failure:** if a PDF can't be generated (on invoice confirm or on download), a dialog reads "Couldn't generate the invoice PDF" ("INV-… is saved — only the PDF file couldn't be created…") with **Try again** and **Cancel**. The invoice itself is never rolled back; Cancel leaves the card without a file until the next download attempt (Bookings screen 37).
- **First use:** with no bookings at all, the dashboard shows KPIs at 0 ("No data yet"), "Nothing scheduled in the next 7 days" in the rail, and an empty state "No bookings yet" with **New booking** (36).

#### US-11 Switch modules with the App launcher
*As an admin, I want to jump between Booking and Package Library from anywhere so that I don't have to go back to a home page.*
- The ⋮⋮ **App launcher** in the Global header opens a popover anchored below it, titled "App launcher". It's grouped by section ("Management": **Booking**, **Package Lib**, Bookmark) and uses the DS *Launcher tile*.
- The current module's tile is highlighted (accent fill and border). Hovering a tile shows its Hover state. Locked modules show "Coming soon" and can't be clicked.
- Clicking a tile closes the launcher and opens that module: **Booking** → `/bookings` (the last view, Calendar or Table, and its filters come back from the URL); **Package Lib** → `/packages` (the Active tab).
- Clicking the current module's tile only closes the launcher. Esc, × and clicking outside also close it, and focus returns to the ⋮⋮ button.
- If a New or Edit booking has unsaved changes, the leave guard (US-1 / screen 12) shows before switching. **Discard** continues to the chosen module; **Keep editing** stays.
- Keyboard: Tab / arrow keys move between tiles and Enter opens one. The popover has `role="dialog"` and the label "App launcher".
- The header shows the active module's icon and name: `Asset/bookings` "Booking" or `Asset/package-lib` "Packages".

#### US-12 Cancel a booking
*As an admin, I want to cancel a booking when the client calls it off so that it stops counting as active work but stays on record.*
- **Manual only.** Allowed from **Draft** or **Partially paid**; never from **Paid**. Nothing cancels a booking automatically. There's no delete.
- **Where:** a **Cancel booking** section at the end of the booking form (Edit booking, or New booking once **Save booking** has created it). It has a short explanation and a **Warning button** "Cancel booking" (DS `Warning button`). The section is hidden for unsaved new bookings, for Paid bookings and for viewers.
- **Modal** "Cancel this booking?" (BK ref · name):
  - A Warning alert, "This can't be undone": the booking becomes read-only, no edits, no new invoices. Existing invoices (count and amount paid) stay on record, and refunds are handled outside the app.
  - **Reason (optional):** a text area, max 255 characters, with a counter.
  - Buttons: **Keep booking** (default focus; Esc and scrim click do the same) and **Cancel booking**.
- **After canceling:**
  - Status **Canceled** (badge in danger tone). Toast "Booking canceled · BK-2026-0142".
  - The detail panel shows an alert "Canceled on {date} by {name}" with the reason, if given. **Edit booking** is hidden and "Remaining" becomes "Not collected".
  - Invoice cards and PDF downloads still work. `/bookings/[id]/edit` redirects to the read-only detail.
- **Where canceled bookings show:**
  - **Table:** included, with the Canceled badge.
  - **Calendar and Upcoming rail:** hidden by default. They appear when the Status filter includes Canceled.
  - **KPIs:** excluded from Outstanding balance and Bookings this month. Collected this month still counts their invoices, because money was received.
  - **Status filter:** gains **Canceled**.

#### US-13 Account menu, Account settings and Log out
*As any user, I want to manage my own name and password and log out safely so that my account stays accurate and secure.*
- **Account menu:** clicking the profile (avatar, name and role at the right of the Global header) opens the DS *Account menu* popover, anchored below it and right-aligned. It has two items: **Account Setting** and **Log out** (danger tone). Esc, an outside click or clicking the profile again closes it.
- **Account settings page** (`/account`, breadcrumb "… › Account settings"), with two cards:
  - **Profile:** avatar with name and role, then rows for **Name** (editable via **Edit name**), **Email** (read-only, lock icon: "Used to log in. Ask your workspace admin to change it.") and **Role** (read-only tag, lock icon: "Set by your workspace admin.").
  - **Security:** **Password** (masked, "Last changed {date}") with **Change password**.
- **Change name:** modal with one field, Name, 2–50 characters, trimmed.
  - **Save name** updates the header, the account menu and "Created by" on new bookings, and shows the toast "Name updated". Existing records keep the name they were created with.
  - Invalid input shows the inline error "Enter 2–50 characters." **Cancel**, Esc and × discard the change.
- **Change password:** modal with **Current password**, **New password** and **Confirm new password**, all with show/hide.
  - A live rules checklist under New password: at least 8 characters; contains a letter and a number; different from the current password.
  - Errors appear inline: "Current password is incorrect.", unmet rules stay grey with ×, and "Passwords don't match."
  - On success: you stay logged in on this device, **other sessions are logged out**, the toast "Password updated · other devices were logged out" shows, and the row reads "Last changed today".
- **Log out:** **Log out** in the account menu opens a centred confirmation, "Log out? You'll need to log in again to use Booking and Package Library.", with **Cancel** and **Log out**. Confirming ends the session and opens Login with the toast "You've logged out".
  - If a New or Edit booking has unsaved changes, the leave guard (screen 12 / lane G) shows first.
  - Cancel and Esc close the dialog, and you stay logged in.

### 2.4 Business rules (enforced in the DB and service layer)

1. All money is stored as `bigint` Rupiah. No floats.
2. The booking total is a derived value, recomputed server-side on every write. The client value is only for display.
3. Invoices are **append-only** per booking. Rows can't be deleted; a void (v1.1) is a status change with a reason.
4. `invoices` are immutable after creation (`snapshot jsonb` with a hash). There's no UPDATE except the PDF storage path.
5. Invoice numbers are unique and come from a per-year sequence (`INV-YYYY-NNNN`), assigned inside the confirm transaction.
6. A booking has 0…n invoices; a new booking has none.
7. Status is **Draft** with no invoices, **Paid** only if `remaining == 0` and `total > 0`, otherwise **Partially paid**.
8. DP amount ≤ booking total. Partial amount < remaining. Paid amount = remaining.
9. Item price ≥ 0, qty an integer 1–999, package price ≥ 0.
10. A booking edit is rejected if it would make `total < total_paid` (validated in the UI and in `save_booking`).
11. A date change shows in Calendar and Table right away.
12. **Canceled is terminal.** `cancel_booking` is allowed only from `draft` or `partially_paid`. After it, `save_booking` and `create_invoice` reject the booking, and nothing reverts it.
13. Archived packages can't be selected for a booking (`save_booking` rejects a newly picked archived package). A booking that already has one keeps it.

### 2.5 Booking status derivation

```
if canceled_at is not null           → canceled   (manual, terminal)
else if invoice_count == 0           → draft
else if total_paid < total           → partially_paid
else (total_paid == total, total>0)  → paid
```

### 2.6 Non-goals (MVP)

- Online payment gateway or automatic transfer matching (e.g. Midtrans or Xendit).
- Sending invoices by WhatsApp or email from the app. MVP = download PDF + copy `wa.me` link.
- Multi-currency, tax/VAT lines and discounts *(VAT and discounts are a v1.1 candidate)*.
- Staff scheduling and resource or room availability or conflicts *(MVP allows multiple bookings per date)*.
- Client self-service portal.
- Refund processing *(v1.1)*.
- Deleting bookings (any status). A booking is **canceled** instead (Draft or Partially paid only, see US-12).

---

## 3. AI System Requirements

Not applicable for MVP. The existing shell's *Insights rail* is used for **rule-based** notices only, such as "3 bookings this week still on DP" or "balance due today". No LLM is involved.

---

## 4. Technical Specifications

### 4.1 Architecture overview

```
Next.js App Router (RSC + Server Actions)
 ├─ /bookings            Calendar | Table (shared filter state in URL)
 ├─ /bookings/new        Editor: form (left) + live summary + Invoices section (right); invoice form opens as a modal
 ├─ /bookings/[id]       Read-only detail (also a side panel via parallel route @panel) + invoice cards
 ├─ /bookings/[id]/edit  Same editor as /new: updated totals + Invoices (n) + New invoice #n modal
 ├─ /packages            Package Library (List layout)
 ├─ /login               Login (no self-service reset, see §4.3)
 ├─ /account             Account settings (name, password) — US-13
 └─ /api/invoices/[id]/pdf  → renders @react-pdf from snapshot, caches in Supabase Storage
        │
        ▼
Service layer (lib/booking/*) — pure calc functions shared by client & server
        │
        ▼
Supabase Postgres (RLS on, auth = existing internal-tools login)
  + RPC `create_invoice(...)` — single transaction: lock booking row,
    recompute total, validate amount vs remaining, allocate number, insert invoice
    (linked to booking_id), recompute total_paid + status
```

### 4.2 Data model

```sql
packages(id uuid pk, name text, price bigint check (price>=0), description text check (char_length(description) <= 1000),
         is_active bool default true, created_at, updated_at)

bookings(id uuid pk, ref text unique,               -- BK-2026-0001
         booking_name text, client_name text not null, client_phone text not null,
         package_id uuid fk, package_name_snapshot text, package_price_snapshot bigint,
         booking_date date not null,
         terms text check (char_length(terms) <= 255),   -- Terms & Conditions, default from Settings
         total bigint not null,                      -- derived, maintained by trigger
         total_paid bigint not null default 0,       -- Σ amount of non-void invoices
         status text not null default 'draft',       -- draft|partially_paid|paid (derived) | canceled (manual)
         canceled_at timestamptz null, canceled_by uuid null,
         cancel_reason text null check (char_length(cancel_reason) <= 255),
         created_by uuid, created_at, updated_at)

profiles(id uuid pk fk → auth.users, display_name text not null check (char_length(display_name) between 2 and 50),
         role text check (role in ('admin','viewer')), password_changed_at timestamptz)

crew(id uuid pk, user_id uuid null fk, name text not null, role text, is_active bool default true)

booking_crew(booking_id uuid fk, crew_id uuid fk, primary key (booking_id, crew_id))   -- 0..n crew per booking

booking_items(id uuid pk, booking_id fk, name text, price bigint check(price>=0),
              qty int check(qty between 1 and 999), position int)

invoices(id uuid pk, booking_id fk, number text unique,  -- INV-2026-0001
         type text check (type in ('dp','full','partial','paid')),
         dp_method text null check (dp_method in ('percentage','fixed')),
         dp_percentage numeric(5,2) null,
         amount bigint not null check (amount>0),
         snapshot jsonb not null,    -- booking + items + totals + paid_before + remaining_after
         snapshot_hash text not null, pdf_path text,
         voided_at timestamptz null, void_reason text,   -- v1.1
         created_by, created_at)
-- a booking has 0..n invoices (FK invoices.booking_id → bookings.id); no separate payments table:
-- an invoice is the record of money received

invoice_counters(year int pk, last_value int)
```

Indexes: `booking_crew(crew_id)` (crew filter), `bookings(booking_date)`, `bookings(status)`, `invoices(booking_id, created_at desc)`, and a trigram GIN on `client_name`, `booking_name` and `client_phone` for search.

### 4.3 Integration points

- **Login → Forgot password:** there's no self-service reset. The **Forgot password?** link under the password field shows an Info alert in the login card: "Forgot your password? Passwords are managed by your workspace admin. Ask them to reset it, then log in with the new password." (Login screen E7).
- **Auth:** existing internal-tools Supabase Auth. Roles: `admin` (everything) and `viewer` (read-only, for the Owner). Enforced by RLS.
- **Settings:** business profile, bank details and default terms are read from the existing workspace settings (the *Payment receiver* block in the Invoice module). This is reused, not duplicated.
- **Storage:** bucket `invoices/` (private) with signed URLs that expire after 10 min.
- **Design tokens:** export CIR variables → `tailwind.config` theme (`surface/*`, `text/*`, `accent/*`, `status/*`, `space/*`, `radius/*`).

### 4.4 Security & privacy

- Client phone numbers count as PII: RLS limits access to authenticated staff, and phone numbers are never included in PDF file names or URLs.
- PDFs are served only via signed URLs.
- An audit trail is created implicitly by the append-only invoices, with `created_by` on every write.
- Any money calculation sent from the client is re-validated server-side. The RPC rejects mismatches with a typed error.

### 4.5 Non-functional

- Live calculation < 50 ms per keystroke (pure functions, no network).
- Calendar month query < 200 ms at 10k bookings, and table page < 300 ms.
- Accessibility: WCAG 2.2 AA, keyboard-operable calendar grid (arrow keys) and status not conveyed by colour alone (badge text plus icon).
- Responsive: desktop-first at 1440 (the only MVP layout; tablet & mobile deferred to v1.1). When built, tablet and mobile use the DS *Pattern · Responsive* layouts, where Table becomes the *Mobile/Invoice list item* pattern and the Calendar becomes an agenda list.

---

## 5. Risks & Roadmap

### 5.1 Phased rollout

| Phase | Scope |
|---|---|
| **MVP** | Login, App launcher, Account settings + Log out, Package Library, Create booking (crew, T&C, leave guard), Cancel booking (manual, with optional reason), DP/Full invoice, Edit booking, Partial/Paid, total-below-paid guard, Calendar (month/week/day), Table, search + filters, Detail panel + Crew schedule, PDF. Built first as a front-end prototype (`context/PROTOTYPE-PLAN.md`). |
| **v1.1** | Refund records, discounts/VAT lines, send via WhatsApp/email, CSV export, **void invoice dialog**, **tablet & mobile layouts** (deferred 2026-11-10, not yet designed) |
| **v2.0** | Payment gateway and auto-reconciliation, client portal, resource/conflict scheduling, reminders for unpaid balances before the booking date |

### 5.2 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Concurrent invoice creation on the same booking | Double payment or wrong remaining | `SELECT … FOR UPDATE` on the booking in the `create_invoice` RPC, plus a re-validated amount |
| Rounding on percentage DP | Off-by-one Rupiah between UI and PDF | One shared `calc.ts`, half-up rounding to an integer, server is authoritative, snapshot stores the final integer |
| Package price changes after booking | Unexpected total changes | Package name and price are snapshotted on the booking and only re-pulled on an explicit re-pick |
| Editing a booking after a DP | Confusion about what the client owes | Diff strip, plus the Detail timeline always shows invoice-time figures next to current figures |
| PDF rendering cost or cold starts | Slow downloads | Render once on confirm, store in Storage, serve via signed URL |
| "Full" vs "Paid" naming confusion | Wrong reporting | The glossary above, and both types map to payment status Paid |

### 5.3 Open questions

1. ~~Pending payments?~~ Resolved 2026-11-10: every created invoice counts as paid; status is derived from invoices (Draft → Partially paid → Paid).
2. Is a per-booking due date needed for remaining balances, for example H-7 before the booking date?
3. Which bank account details and terms text should go on the PDF? (From the workspace Settings, to be confirmed.)
