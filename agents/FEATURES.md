# wcc-tools · Feature guide

This document lists every feature in the WCC & ECC **Booking & Invoice Management** app and explains what each one does. It is a plain-language guide for people using or reviewing the app. The detailed requirements are in [`context/PRD.md`](context/PRD.md), and the interaction specs are in [`context/INTERACTIONS.md`](context/INTERACTIONS.md).

The app has two modules, **Booking** and **Package Library**, plus a login page and an account area. All money is in IDR (`Rp 1.250.000`). The UI is in English, and the desktop layout is built for 1440 px.

---

## At a glance

| # | Feature | Where | Who can use it |
|---|---|---|---|
| 1 | [Login and sessions](#1-login-and-sessions) | `/login` | Everyone |
| 2 | [App launcher](#2-app-launcher) | Global header (⋮⋮) | Everyone |
| 3 | [Package Library](#3-package-library) | `/packages` | Admin edits, Crew reads |
| 4 | [Create a booking](#4-create-a-booking) | `/bookings/new` | Admin |
| 5 | [First invoice (DP or Full)](#5-first-invoice-dp-or-full) | New booking screen | Admin |
| 6 | [Follow-up invoice (Partial or Paid)](#6-follow-up-invoice-partial-or-paid) | Edit booking screen | Admin |
| 7 | [Edit a booking](#7-edit-a-booking) | `/bookings/[id]/edit` | Admin |
| 8 | [Cancel a booking](#8-cancel-a-booking) | Booking form (bottom section) | Admin |
| 9 | [Calendar dashboard](#9-calendar-dashboard) | `/bookings` (Calendar tab) | Everyone |
| 10 | [Table dashboard](#10-table-dashboard) | `/bookings` (Table tab) | Everyone |
| 11 | [Search and filters](#11-search-and-filters) | `/bookings` | Everyone |
| 12 | [KPIs, Upcoming rail and Needs attention](#12-kpis-upcoming-rail-and-needs-attention) | `/bookings` | Everyone |
| 13 | [Booking detail panel](#13-booking-detail-panel) | Side panel on `/bookings` | Everyone |
| 14 | [Crew schedule](#14-crew-schedule) | Popover from crew chips | Everyone |
| 15 | [Invoice PDF](#15-invoice-pdf) | Invoice cards and dialogs | Everyone |
| 16 | [Account settings](#16-account-settings) | `/account` | Everyone (own profile) |
| 17 | [Business information](#17-business-information) | `/workspace` | Admin edits, Crew reads |
| 18 | [Roles and permissions](#18-roles-and-permissions) | Whole app | — |
| 19 | [Leave guard (unsaved changes)](#19-leave-guard-unsaved-changes) | New and Edit booking | Admin |
| 20 | [Workspace & Crew](#20-workspace--crew) | `/workspace` | Everyone (Admin edits business information) |

---

## 1. Login and sessions

- **Email and password** sign-in on `/login`.
- **No self-service password reset.** The login page says to ask the workspace admin.
- **Daily cut-off:** every session ends at **00:00 WIB**, so users log in again each day.
- Logging out from anywhere sends the user back to Login with a "You've logged out" toast.

## 2. App launcher

- The **⋮⋮ button** in the Global header opens an "App launcher" popover with three live tiles: **Booking**, **Package Lib** and **Workspace & Crew**. A fourth tile, **Bookmark**, is shown as "Coming soon" and can't be opened.
- The current module's tile is highlighted.
- Keyboard: Tab and arrow keys move between tiles, Enter opens one, and Esc closes the popover and returns focus to the ⋮⋮ button.
- If a New or Edit booking has unsaved changes, the leave guard appears before switching modules (see [19](#19-leave-guard-unsaved-changes)).

## 3. Package Library

Route: `/packages`. Packages are the catalogue that bookings pick from.

- **Create, edit, archive and restore** packages.
- Each package has a **name** (must be unique among active packages), a **price** in whole Rupiah (0 or more), an optional **description** (up to 1000 characters, with an `n/1000` counter), and an **active** toggle.
- **Archive** hides a package from the booking form's Package dropdown. Archived packages stay on past bookings, invoices and PDFs.
- Changing a package price does **not** change existing bookings. Each booking stores the package name and price it was saved with. An admin can re-pick the package on a booking to take the new price.
- **Search** the list. A search with no results offers **Clear search**.
- Empty library: "No packages yet" with **Create first package**.
- Inline validation shows duplicate names and invalid prices. If saving fails, the modal keeps the entries and offers **Try again**.

## 4. Create a booking

Route: `/bookings/new`. One form holds everything about a booking.

- **Required:** client name (2–80 characters), phone (Indonesian format, saved as `+62…`, 9–15 digits), package (exactly one), and booking date.
- **Optional:** booking name. If left blank it becomes `{client name} · {package}`.
- **Crew:** assign zero or more crew members from the workspace crew list. Selected crew appear as removable chips. The dropdown has search and applies instantly. You are listed first as "Name (You)", but not selected for you.
- **Additional items:** add or remove rows. Each row has a name, a price (whole Rupiah, 0 or more), and a quantity (1–999). The subtotal for each row is shown live.
- **Live summary card:** package price, items total, subtotal and total update on every keystroke.
- **Terms & Conditions:** prefilled from the workspace default and editable per booking (up to 255 characters, with a counter). The server also checks this.
- **Save booking** creates the booking as **Draft** with no invoices. You can also create the first invoice from this same screen (see [5](#5-first-invoice-dp-or-full)).
- The date can be prefilled by clicking an empty day in the calendar.

## 5. First invoice (DP or Full)

Started from the **Invoices (0)** section of the New booking screen with **Create invoice**. A modal opens over the screen. It shows the booking total, paid and remaining amounts.

- **DP (down payment)**:
  - **Percentage:** 0–100 with up to two decimals. The amount is rounded to the nearest Rupiah.
  - **Fixed amount:** a whole-Rupiah amount from 1 up to the booking total.
  - A DP larger than the total shows an error and disables **Confirm**. A DP of 0 is blocked.
- **Full price:** the amount is set to the full total and can't be edited.
- The live panel shows the invoice type, method (DP only), the amount being paid now ("Total bayar"), and the remaining balance.
- **Confirm** runs in one database transaction. It saves the booking if it is new, creates the invoice with a number like `INV-2026-0001`, and freezes its figures. The payment counts as paid straight away, and the status updates (Partially paid or Paid).
- A new **Invoice card** appears with a PDF download.

## 6. Follow-up invoice (Partial or Paid)

Started from the **Invoices (n)** section of the **Edit booking** screen. Available when the booking has at least one invoice and a balance remains. Hidden once the booking is Paid.

- **Partial:** enter an amount from 1 up to (but not including) the remaining balance. If the amount equals the balance, the UI suggests **Paid** instead.
- **Paid:** the amount is set to the exact remaining balance and can't be edited. Saving this makes the booking Paid with a remaining balance of Rp 0.
- The live panel shows the updated total, the amount already paid, this payment, the new total paid and the new remaining balance.
- **Confirm** saves any pending booking edits first, then creates the invoice against the new total.

**Invoices are a payment record.** Each invoice is created when money is received and is never edited afterwards. Changing a booking later does not change old invoices or the amounts paid.

## 7. Edit a booking

Route: `/bookings/[id]/edit`. Opened from the **Edit booking** button in the detail panel.

- Editable: client name, phone, package (re-pick), additional items, booking date, crew, and Terms & Conditions.
- The total recalculates as you type. A **diff strip** shows the change in total, the change since the last invoice, and any date move ("Moved from …").
- **Total can't drop below what's already paid.** If an edit would do that, Save is blocked and an inline error shows the amount already paid.
- Saving never changes existing invoices.
- The date change appears on the calendar straight away.

## 8. Cancel a booking

- **Manual only.** Nothing cancels a booking automatically, and there is no delete.
- Allowed from **Draft** or **Partially paid**. Not allowed from **Paid**.
- Found in a **Cancel booking** section at the bottom of the booking form. It is hidden for unsaved bookings, Paid bookings and crew.
- The confirmation dialog warns that the step can't be undone and takes an **optional reason** (up to 255 characters). **Keep booking** is the default choice.
- After cancelling:
  - Status becomes **Canceled**, and a toast shows the booking reference.
  - The booking is read-only: no edits, no new invoices. Existing invoices and PDFs still work.
  - "Remaining" becomes "Not collected".
  - The calendar and Upcoming rail hide canceled bookings unless the Status filter includes **Canceled**.
  - Canceled bookings are excluded from Outstanding balance and Bookings this month, but money already collected still counts.
- Canceling is final. Refunds are handled outside the app.

## 9. Calendar dashboard

Route: `/bookings`, Calendar tab. The three views share the same date and filters.

- **Month view** (default): each day shows up to three booking chips coloured by status, plus "+N more". Clicking "+N more" opens a list of that day's bookings with **New booking on {date}** and **Open day view** buttons.
- **Week view** (Monday to Sunday): each day column shows booking cards with a status bar, name, package, status badge and crew avatars. Columns with more than five bookings show a "+N more" button.
- **Day view:** a summary bar (for example "4 bookings · 2 Draft · 1 Partially paid · 1 Paid") and one row per booking with total and remaining balance. Includes **New booking on this date**.
- **Navigation:** previous and next arrows, a **Today** button, and the selected date (kept in the URL as `date=`). Today is highlighted.
- Hovering an empty day in Week view shows a **+ New booking** target that pre-fills the date.
- Clicking a booking opens the detail panel.

## 10. Table dashboard

Route: `/bookings`, Table tab.

- **Columns:** booking name, client, phone, package, booking date, total, total paid, remaining, status.
- **Sortable** by booking date, total, remaining and status. By default, upcoming bookings appear first (soonest first), followed by past bookings (newest first).
- **Pagination** at 10, 25 or 50 rows per page.
- Clicking a row opens the detail panel. There are no row action menus. Editing and invoicing happen in the booking screens.
- Shows "Showing n of N bookings".

## 11. Search and filters

- **Global search** matches booking name, client name and phone (including partial digits). Results update 250 ms after you stop typing.
- **Filters:**
  - **Date:** Today, This week, This month, Next 7 days, Last month, or a custom range. Applies to the Table.
  - **Status:** Draft, Partially paid, Paid, Canceled (choose several).
  - **Crew:** choose several crew members. A booking matches if any of its crew is selected. You are listed first as "Name (You)".
  - **Package:** choose several packages.
- Filters combine with AND, and choices within one filter combine with OR.
- Active filters appear as removable chips, with **Reset all**.
- The filter state is in the URL, so a filtered view can be shared or bookmarked. Switching between Calendar, Week, Day and Table keeps the same filters.

## 12. KPIs, Upcoming rail and Needs attention

- **KPI row:** totals such as outstanding balance, bookings this month and collected this month. All figures are calculated from the data.
- **Upcoming rail** (right side): the next seven days of bookings, up to four. Canceled bookings are hidden. **See all in table** opens the Table filtered to the next seven days.
- **Needs attention** cards are rule-based:
  - **Balance due today:** a Partially paid booking happening today.
  - **Balance before event:** this week's Partially paid bookings that have a DP invoice, with the amount still outstanding.
- **First use:** with no bookings, KPIs show zero ("No data yet") and the page offers **New booking**.

## 13. Booking detail panel

A read-only side sheet that opens from any booking in the calendar, table or rail.

- **Booking info:** reference (e.g. `BK-2026-0001`), client, phone (with a WhatsApp link), date, package, crew chips and items.
- **Financial summary:** total, paid, remaining, a progress bar and the status badge.
- **Invoices (n):** one card per invoice, newest first. Each card shows the invoice number, date, amount, the total paid after it, and a PDF download. If there are none, the panel says "Open Edit booking to create the first invoice".
- **Terms & Conditions.**
- **Actions:** **Edit booking** (hidden for canceled bookings) and **Download latest PDF** (hidden for Draft bookings).
- Canceled bookings show who cancelled them, when, and the reason if one was given.

## 14. Crew schedule

- Clicking a crew chip or avatar (in the detail panel, calendar cards or day rows) opens a popover.
- It shows the crew member's name, role, how many bookings they have this month, and their upcoming bookings from today.
- The booking you came from is marked **This booking**. Clicking another booking switches the panel to it.
- **See in calendar** opens the calendar filtered to that crew member.
- Close with Esc or by clicking outside.

## 15. Invoice PDF

- **A4 portrait.** Built only from the invoice snapshot, so the same invoice always produces the same figures, even if the booking has changed since.
- **Brand row** (header): the business logo (or initials if there's no logo), name, address and phone · email, and the status tag. These values always come from the **current** Business information, so changes apply to old invoices too.
- **Body:** invoice number, date, client and phone, booking reference and date, package line, item breakdown, booking total, invoice type, this payment, total paid, remaining balance, payment instructions (bank, account number, account name) and the booking's Terms & Conditions.
- **File name:** `INV-2026-0001_{client-slug}.pdf`.
- **If generation fails:** a dialog says the invoice was saved but the PDF couldn't be created, with **Try again** and **Cancel**. The invoice is never rolled back.
- Draft bookings have no PDF yet.

## 16. Account settings

Route: `/account`. Opened from the profile menu (avatar, name and role at the top right) with **Account Setting**.

- **Profile card:** name (editable with **Edit name**, 2–50 characters), email (read-only), role (read-only).
- **Security card:** **Change password** with show/hide on each field and a live checklist: at least 8 characters, contains a letter and a number, and different from the current password.
  - On success you stay logged in on this device, all other sessions are logged out, and the row shows "Last changed today".
- **Log out** is in the same profile menu. It asks for confirmation first. After you confirm, the button is disabled and shows "Logging out…" until the Login page opens.
- Changing your name updates the header and the "Created by" label on new bookings. Existing records keep the name they were created with.

## 17. Business information

Shown as the first card on **Workspace & Crew** (`/workspace`). It holds the details that appear on every invoice PDF.

- **Fields:** logo, business name (2–60 characters), address (up to 150 characters), email, and phone (8–15 digits).
- **Logo:** PNG, JPG or WebP, up to 1 MB. Square works best. The app resizes it to 256 px or smaller. Without a logo, the PDF shows initials.
- **Edit** opens a modal prefilled with the saved values. Save checks every field at once and keeps the modal open if anything is wrong.
- Saving changes only this card and future PDFs. Existing invoice figures stay the same.
- **Crew** see the card but can't edit it.

## 18. Roles and permissions

| Role | What they can do |
|---|---|
| **Admin** (including the Owner) | Everything: packages, bookings, invoices, cancelling, business information. Can assign themself to bookings. |
| **Crew** | Read-only. Can view bookings, calendar, table, detail panels, PDFs and Package Library. Editing controls are hidden. |

Every account, admin or crew, has an entry in the crew list, so it can be assigned to bookings. Crew members without a login can be listed too. Accounts are created, changed and revoked by the developer with SQL (see [`DEPLOY.md`](DEPLOY.md)).

Permissions are enforced in two places: the screens hide the controls, and the database (Row Level Security) blocks the writes.

## 19. Leave guard (unsaved changes)

- While a **New booking** has any input, leaving the page asks first. This covers the back arrow, Cancel, breadcrumbs, the app launcher, the logo and the other in-app links. The dialog offers **Keep editing** (default) and **Discard booking**. Nothing is created unless you save.
- An **Edit booking** with unsaved changes shows "Discard unsaved changes?" before any exit.
- Closing the tab or using the browser's back button or refresh shows the browser's own "Leave site?" prompt.
- No prompt appears if nothing was entered, or right after saving.

---

## Business rules in short

- Money is whole Rupiah, stored as `bigint`. Totals are recalculated on the server.
- **Booking status** is derived from its invoices: **Draft** (no invoices) → **Partially paid** → **Paid** (remaining = 0). **Canceled** is the one manual status and is final.
- Invoices are append-only and never edited. Numbers come from a per-year sequence (`INV-YYYY-NNNN`).
- Archived packages can't be picked for new selections, but stay on existing bookings.
- A booking can't be saved with a total lower than what has already been paid.

## Not in this version

Tablet-specific layouts (phones are supported; tablets use the desktop layout); voiding an invoice; refunds; VAT and discounts; sending invoices by WhatsApp or email; payment gateway; a client portal; due dates for remaining balances. The Bookmark module is a placeholder.

---

*Based on `context/PRD.md`, `context/INTERACTIONS.md` and `README.md`. The app is under active development: the progress table in `README.md` lists which parts are done.*

## 20. Workspace & Crew

Route: `/workspace`, from the app launcher.

- **Business information** is the first card (see [17](#17-business-information)).
- **Admin & crew** lists every active person: name, account type (Admin, Crew or No login), job title and number of upcoming bookings. You come first. Search by name or job title, and filter by type.
- **Click a person** to see their **Upcoming** and **Past** bookings. Canceled bookings are left out. Click a booking to open it in Booking, or **See in Booking** for the table filtered by that person.
- The list is view only. The developer manages accounts (see [`DEPLOY.md`](DEPLOY.md)).
