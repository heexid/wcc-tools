# Plan: workspaces (many businesses in one app and database) and the Workspace & Crew module

| | |
|---|---|
| **Status** | Written 2026-11-25. The Workspace & Crew module is live since 2026-11-25 (see §9.0). SD0: one backup is tested, automatic backups are still off. SD1 and SD2 are built locally (see §4.1, §4.2). SD3–SD6 are not started, apart from the SD5 template draft. The Workspace & Crew requirements (§9) were merged in on 2026-11-25. |
| **Goal** | One Vercel app and one Supabase project serve every customer. No customer can see or change another's data. Inside its workspace, a team manages its business information and sees who works on what (§9). |
| **Why** | Removes the server cost per customer, and gives workspace-level data its own module. |
| **Companions** | `PRD.md` §4.2–4.4, US-9, US-11, US-13, US-14 · `CREW-TYPE-PLAN.md` · `PRODUCTION-PLAN.md` P10 (RLS) and D3 (workspace membership) |

A customer's business is called a **workspace**. This is the only name used for it.

## 1. Decisions

**Confirmed by the user (2026-11-25)**

| # | Decision |
|---|---|
| A | The name is **workspace**. |
| B | Admins, crew and data of one workspace can't be created, read, updated or deleted by another workspace. |
| C | The developer creates workspaces, admins and crew with queries. Template: `supabase/templates/workspace-accounts.sql`. |
| D | A workspace is identified by the login. Everyone uses the same web address. |
| E | One account belongs to one workspace. One email = one workspace. |
| F | Each workspace has its own invoice and booking sequences, so each starts at `INV-2026-0001`. |
| G | A customer who stops paying becomes read-only: they can see and download, but not add or edit. Turned on by hand. |
| H | Business information moves from Account settings to a new module, **Workspace & Crew** (§9). |
| I | The module lists every active admin and crew member, including people without a login. The list is view only, in line with C. |
| J | Clicking a person opens a side panel with their bookings. Its main goal is seeing who works on what. |
| K | Crew can open the module and see everyone's bookings in their own workspace. They can't edit business information. |
| L | One page: Business information on top, people table below, no tabs. |
| M | The panel leaves out Canceled bookings. |
| N | Desktop and mobile ship together. |
| O | The launcher tile uses the illustration the user provided (`Asset/Crew`). |
| P | The Figma page is named "Workspace & Crew" (renamed 2026-11-25). |

### Permissions

| Action | Admin, own workspace | Crew, own workspace | Anyone, other workspace |
|---|---|---|---|
| View bookings, invoices, packages, crew, settings | Yes | Yes | **No** |
| Open Workspace & Crew, see people and their bookings | Yes | Yes | **No** |
| Edit business information | Yes | No | **No** |
| Create and edit bookings, packages and other settings; create invoices | Yes | No | **No** |
| Cancel bookings, archive packages | Yes | No | **No** |
| Delete bookings or invoices | No | No | **No** |
| Create or manage workspaces, admins and crew | No (developer query) | No (developer query) | **No** |

**Not confirmed yet**

| # | Question | Recommended |
|---|---|---|
| 1 | Custom form fields | Settings per workspace: text, number, date, choice or checkbox. |
| 2 | Custom invoice | Settings per workspace: colour, footer note, show or hide sections, choice of layouts. No code per customer. |
| 3 | Time zone | WIB for everyone in v1, including the 00:00 session end. |

## 2. What exists now

| Area | Today | Problem with two customers |
|---|---|---|
| Tables | Only `workspace_settings` has `workspace_id` | Bookings, packages, crew, invoices and profiles have no owner |
| Reads (RLS) | Any staff member reads every row (`is_staff()`) | Customer A sees customer B |
| Writes | `SECURITY DEFINER` functions check only `require_admin()`. They bypass RLS. | An admin of A could edit B's booking by its id |
| Settings | 5 functions use the most recently updated settings row: `my_profile`, `get_settings`, `update_business`, `save_booking_tx`, `create_invoice_tx` | Wrong business name or **bank account** on an invoice |
| Uniqueness | `bookings.ref`, `invoices.number`, active package names and year counters are global | Numbers are shared; two customers can't both have "Gold Package" |
| PDF files | Stored at `<invoice number>/<fingerprint>.pdf`, accessed with the service role | Same number = same folder, once sequences are per workspace |
| Logos | `logo/<hash>`, any staff can read, any admin can delete | Shared between customers; same image = same file |
| New accounts | `app_metadata.role` gives access; `crew_id` can link any free crew entry | No workspace check |
| Business information | A card in the personal Account settings (`/account`) | Workspace data sits in a profile |
| People | No screen lists the team; only the crew filter and a schedule popover | The new list must never show another workspace's people |
| Browser cache | Cleared on write, sign-in and sign-out, per tab | Another tab can sign in to a different workspace |
| Tests | RLS matrix and database tests are not in CI | A leak could be deployed unnoticed |

## 3. Design

**Core rule: the database decides the workspace from the signed-in account. The browser never sends it.**

1. **`workspaces` table:** `id`, `slug` (unique), `name`, `status` (`active`, `read_only`, `closed`), `paid_until`. The id is today's `workspace_settings.workspace_id`.
2. **`workspace_id` on every business table:** profiles, crew, packages, bookings, booking_items, booking_crew, invoices and both counters. Not null, and can't change.
3. **Composite foreign keys**, such as `(workspace_id, package_id)`, so a booking can't use another workspace's package, crew or invoice, even if a function has a bug.
4. **`current_workspace_id()`:** reads the active profile of `auth.uid()` with a session from today. No profile, or a closed workspace, returns null, which matches no rows.
5. **RLS on every table:** `workspace_id = (select public.current_workspace_id())`.
6. **Every write function** filters each id it receives by workspace: booking, package, crew, invoice. Another workspace's id returns `not_found`. Function signatures stay the same.
7. **`require_admin()`** also rejects `read_only` and `closed` workspaces. Own name and password changes still work in `read_only`.
8. **Uniqueness per workspace:** `(workspace_id, ref)`, `(workspace_id, number)`, `(workspace_id, lower(name))` for active packages, `(workspace_id, year)` for counters.
9. **Settings** are read by workspace, never "latest row".
10. **Accounts** need `app_metadata.role` **and** a valid `workspace_id`. Without both, no profile and no access. A linked `crew_id` must be in the same workspace. The role trigger must not reactivate an inactive account because only its `workspace_id` changed, and an existing profile's workspace can't change. Accounts that exist today get their `workspace_id` in §6 step 5.
11. **Files:** `<workspace id>/logo/<hash>` and `<workspace id>/<invoice id>/<fingerprint>.pdf`. Storage policies check the first folder. The PDF route still reads the invoice through the caller's session before using the service role.
12. **Browser cache:** keys include the workspace, and the tab clears its data when the signed-in account changes. Server code must never use a shared cache for workspace data.
13. **Workspace & Crew reads** are `SECURITY INVOKER`, so RLS limits them to the signed-in workspace (§9.5).
14. **Two names, one shown.** The app and invoices show `workspace_settings.business_name`. `workspaces.name` is the developer's label; editing business information doesn't change it.

### Custom fields and invoices

- `workspace_settings.booking_fields` holds the field definitions. `bookings.custom_fields` holds the values, checked by the server.
- A field has a permanent key. Removing it hides it on new bookings, and old values stay.
- New invoices copy the fields and labels into their snapshot. **Old snapshots and hashes never change.**
- `workspace_settings.invoice_config` is added to the PDF fingerprint, so a changed layout makes a new file. As with the business block, it also applies to old invoices; amounts don't change.

## 4. Phases

Effort is a rough guess for one developer with Claude, not a measurement.

**Status:** ✅ built or run · 🟡 partly · ⬜ not started. For W2–W5 also means live since 2026-11-25 (pull request #8).

| Status | Phase | Work | Done when | Days |
|---|---|---|---|---|
| ✅ Backup and restore tested; automatic backups postponed (dummy data) | **SD0** Safety | Turn on and test backups. Dump the live database and copy Storage files. Check that live has exactly one settings row. | A restore works on a separate project. **Blocks every later SD phase:** no migration, including W3's, runs on live before this passes | 1 |
| ✅ Built and tested locally (migration 016); not on live | **SD1** Tables | Migrations: workspaces, `workspace_id`, composite keys, uniqueness, counters, and `workspace_id` in existing accounts' `app_metadata` | Existing database tests pass; row counts and invoice hashes are unchanged | 2–3 |
| 🟡 Built and tested locally (migration 017); CI added, not yet required on `main` | **SD2** Isolation | RLS, every read and write function, accounts, settings, read-only status. Add the database tests to CI and make CI required before a production deploy | Two-workspace database tests pass (§5) in CI, and a failing test blocks a deploy | 3–4 |
| ⬜ | **SD3** App and files | Logo and PDF paths, PDF route, browser cache, seeds, mock parity, generated types, `setup-production.sql`, workspace status in `my_profile` so the app can hide write buttons | App and Supabase end-to-end tests pass with two workspaces | 2–3 |
| ⬜ | **SD4** Go live | Rehearse on a copy, migrate live (§6), create a second test workspace | Hand checks pass with both accounts | 1–2 |
| 🟡 Template drafted | **SD5** Customer setup | Finalize `supabase/templates/workspace-accounts.sql` (drafted) against the real migrations; add it to the database tests; add a one-workspace export | A new workspace takes under 15 minutes | 1 |
| ⬜ | **SD6** Customization | Custom fields in form, detail panel, invoice and PDF; invoice settings | Two workspaces have different forms and invoices | 4–6 |
| ✅ Approved | **W1** Figma | Move business information; design the new screens, flow and mobile (§9.4) | Every §9.3 state exists; no business card is left in Account settings | 2–3 |
| ✅ Approved | **W2** Move | Route, launcher tile without illustration, Business information, Account settings cleanup | F18 tests pass at the new location | 1 |
| ✅ Approved; migration 015 live | **W3** People | `listPeople` migration, table, search, filter | WC-3 passes | 1–2 |
| ✅ Built | **W4** Panel | Side panel, links, URL state, mobile | WC-4 and WC-5 pass | 2 |
| 🟡 Released ✅, live hand checks ⬜ | **W5** Docs and release | `PRD.md` US-11, US-13, US-14; INTERACTIONS; `setup-production.sql`; launcher illustration when provided | Live hand checks pass | 1 |

### 4.1 SD1 checklist (2026-11-25)

| | Step |
|---|---|
| ✅ | Migration `20261126000016_workspaces.sql`: `workspaces`, `workspace_id` on every business table, keys and uniqueness per workspace, numbering per workspace, `workspace_id` in existing accounts |
| ✅ | It refuses to run when it can't tell which workspace the data belongs to (several settings rows, or data without one) |
| ✅ | No silent mix-up meanwhile: with a second workspace, a write that doesn't name its workspace fails. SD2 removes this temporary default (`only_workspace()`) |
| ✅ | A new account's crew entry is in the account's workspace, and `crew_id` can only link an entry there (moved forward from SD2) |
| ✅ | Run: all 16 earlier database files, plus `017_workspace_tables` (38 checks with two workspaces) |
| ✅ | Run: upgrade test from data before the migration (29 checks, `npm run test:migrate-016`) |
| ✅ | Run: SQL and mock parity, 308 unit tests, types, lint |
| ✅ | Run: on a restored copy of live: every row, invoice hash and account unchanged |
| ✅ | Run: Supabase browser tests on a copy: 51 of 52; only "calendar loads only the visible range" fails, as before |
| ✅ | `setup-production.sql`, seed and generated types updated |
| ⬜ | Live: with SD2 and SD3, in SD4. **Don't run 016 on live before SD4** |

### 4.2 SD2 checklist (2026-11-26)

| | Step |
|---|---|
| ✅ | Migration `20261126000017_workspace_isolation.sql`: access rules by workspace, every write and settings function limited to it, accounts need a role and a workspace, read-only and closed workspaces, SD1's temporary default removed |
| ✅ | Run: 18 database files, including `018_workspace_isolation` (96 checks, two workspaces with the same package name, booking ref and invoice number) |
| ✅ | Run: the test is itself tested. Each of 35 workspace conditions was removed in turn: 27 are caught, the other 8 are second layers behind an earlier check |
| ✅ | New code can't skip isolation: the test fails on a readable table without the workspace rule, a direct write, or a SECURITY DEFINER function that isn't on the reviewed list |
| ✅ | Run: SQL and mock parity, upgrade tests 014 and 016, 308 unit tests, `setup-production.sql` gives the same functions as the migrations |
| ✅ | Run: 016 and 017 on a restored copy of live: every row, hash and account unchanged |
| ✅ | Run: Supabase browser tests on a copy: 51 of 52; only the known calendar test fails |
| ✅ | Run: 60 invoices at the same moment by three admins in two workspaces: no duplicate, no gap, no error |
| ✅ | Run: 50 workspaces, about 108,000 bookings (in memory): every read under 55 ms |
| ✅ | CI: a "database" job (isolation, parity, upgrades) in `ci.yml` |
| ⬜ | CI: seen passing on GitHub, and both jobs required on `main` (user's setting), so a failing test blocks a deploy |
| ⬜ | Live: with SD3, in SD4 |

A saved booking that lists another workspace's crew drops that person, like any unknown id; another workspace's package is rejected.

**Order (user, 2026-11-25): one phase at a time, design in Figma first, then build.** W1 is the Figma design; nothing is built before it is finished and reviewed. Then W2 → W3 → W4 → W5, each starting only when the one before is done. W1 and W2 need no migration; W3's migration reaches live only after SD0. If W3 ships before SD2, SD2 adds workspace tests for `listPeople`; the function itself stays the same, because RLS does the filtering. The W phases don't block selling.
**Total: about 14–20 days for SD0–SD6, plus 7–9 for W1–W5.** You can sell after SD5 (10–14 days) if you don't promise custom fields or invoices yet.

**Pricing dependency:** the first setup in `agents/marketings/PRICING.md` (Rp 400.000) includes a custom invoice and custom form fields. Don't sell that setup before SD6 is done. Before SD6, sell the subscription and accounts only.

## 5. Tests that must pass

Use workspaces A and B, each with an admin and a crew account.

| Run | # | Test | Expected |
|---|---|---|---|
| ✅ | 1 | A reads every table and calls every read function | No B rows |
| ✅ | 2 | A's admin calls every write function with B's booking, package or crew id | Rejected; B is unchanged |
| ✅ | 3 | A saves its own booking with B's package or crew | Rejected |
| ⬜ SD3 | 4 | A opens B's invoice PDF by id or number | 404 |
| 🟡 numbers ✅, downloads in SD3 | 5 | Both have `INV-2026-0001` | Each downloads its own PDF |
| ⬜ SD3 | 6 | A reads, replaces or deletes B's logo | Rejected |
| ✅ | 7 | Settings, totals, search, filters, crew schedule, people list and upcoming counts | Only own data and own bank account |
| ✅ | 8 | Account without a workspace, inactive account, yesterday's session, closed workspace | No data |
| 🟡 database ✅, PDFs in SD3 | 9 | Read-only workspace | Reads and existing PDFs work; every business write fails |
| ✅ | 10 | Two admins in one workspace create invoices at the same time | No duplicate number |
| ⬜ SD3 | 11 | Two tabs, A signs out and B signs in | No A data on B's screen |
| ✅ on a copy | 12 | Every invoice hash before and after migration | Identical |
| ✅ | 13 | Every public table has a workspace policy, and every `SECURITY DEFINER` function is on a reviewed list | Passes, so new code can't skip isolation |
| ✅ locally | 14 | Performance with 50 workspaces | Within the existing budgets |
| ✅ | 15 | Accounts that existed before the migration: sign in, change role, remove and restore access | Same workspace throughout; inactive accounts stay inactive after the migration |
| 🟡 database ✅, page in SD3 | 16 | A opens `/workspace?person=<B's crew id>` | No panel and no B data; same message as an unknown id |
| 🟡 settings ✅, PDFs in SD3 | 17 | A's admin edits business information | Only A's settings and PDFs change |
| 🟡 database ✅, button in SD3 | 18 | Business information in a read-only workspace | Visible, no Edit button; a direct save is rejected |

**CI (part of SD2, added 2026-11-26):** before SD2, `.github/workflows/ci.yml` ran only typecheck, lint, unit tests and build. Original note: add `npm run db:test`, `npm run test:parity` and `npm run test:rls` as required checks. Vercel builds from GitHub on its own, so also block production deploys until the checks pass. Tests that need real Storage or a browser (4–6, 11) stay in `e2e:supabase`, run before each release on a separate stack because it resets its database.

## 6. Moving the live data

1. Announce a short maintenance time. Stop writes.
2. Take a fresh database dump and a copy of both Storage buckets. Record row counts, totals and invoice hashes.
3. Run each migration file inside `begin` / `commit` with `supabase db query --linked -f`. **Never use `db push`:** live was built from `setup-production.sql` and may have no migration history.
4. Add `workspace_id` with the current workspace's id as a **constant column default**, then drop the default. Don't backfill with `UPDATE`: the invoice append-only trigger would block it, and booking edit times could change.
5. Add the current workspace's id to `raw_app_meta_data` of **every** `auth.users` row that has a profile, active or not. Do this **before** the SD2 trigger functions are installed: today's trigger ignores updates that don't change `role`, so nobody is reactivated. Check that every profile's metadata has the same `workspace_id` as its row, and that `role` and `active` are unchanged.
6. Copy the logo to its new path and update the setting. Accept the old path until the new app is live, then remove that exception. PDFs regenerate by themselves.
7. Deploy the app. Compare counts, totals and hashes. Check login, a booking, an invoice and a PDF by hand.
8. Create test workspace B, run the §5 checks by hand, then open to customers.

**Rollback:** before a second workspace has data, restore the dump and the previous Vercel deployment. After real customers join, fix forward: restoring would erase everyone's newer data.

## 7. Risks

| Risk | What we do |
|---|---|
| One missed filter leaks client data | RLS, composite keys and function checks; §5 tests required |
| Wrong bank account on an invoice | Settings by workspace only; test 7 |
| One outage affects all customers | Tested backups, monitoring |
| Restoring one customer restores everyone | Export and restore per workspace (SD5) |
| One customer's custom request breaks others | Settings only; quote new features separately |
| Existing accounts lose access because they have no `workspace_id` | §6 step 5; test 15 |
| Custom setup is sold before it exists | Not sold before SD6 (§4) |
| Server gets too small | Watch load; a bigger server raises the running cost |
| Admins look for Business information in Account settings | Mention the move in release notes; the tile is in the launcher on every screen |
| "Workspace" suggests switching workspaces | The page shows the signed-in workspace only and has no switcher |
| Account type and job title are confused | Two columns with different names |
| A stale person after a revoke or rename | Read fresh on page open; handle an unknown person as in WC-4 |
| Database backups don't include Storage files | Back up both buckets separately |

## 8. Not in this plan

Self sign-up, online payment, an owner dashboard, custom domains, accounts in several workspaces, other time zones, separate code per customer, and the Workspace & Crew non-goals in §9.3.

## 9. Workspace & Crew module

### 9.0 Progress (2026-11-25)

| | Step | Phase |
|---|---|---|
| ✅ | Figma: screens WC1–WC20, mobile WM1–WM7, Hi-fi flow lanes A and B, components | W1 |
| ✅ | Figma: Business information removed from Account settings; launcher tile added | W1 |
| ✅ | App: `/workspace`, launcher tile, Business information moved, Account settings cleaned up | W2 |
| ✅ | Database: migration 015 `list_people` written, in `setup-production.sql`, run in the in-memory test database | W3 |
| ✅ | App: people list, search, type filter, mobile cards | W3 |
| ✅ | App: person panel, Upcoming / Past, Show more, links into Booking, mobile sheet | W4 |
| ✅ | Run: unit tests (308), database tests (16 files), app-versus-database comparison, build, W2–W4 browser tests | W2–W4 |
| ✅ | Run: `list_people` with 101 people and 10,040 bookings, in memory: 8 ms at p95 (target 300 ms) | W3 |
| ✅ | Docs: PRD, INTERACTIONS, PLAN, PRODUCTION-PLAN, FEATURES, DEPLOY, README | W5 |
| ✅ | Run: Supabase browser tests on a separate copy, since removed: Workspace & Crew 7 of 7, Business information, auth 6 of 6, smoke 5 of 5. Only "calendar loads only the visible range" fails; it is on the README list of failures from before this work | W5 |
| ✅ | Run: accessibility. The page passes as admin and crew; the person panel fails only on the contrast of the "Partially paid" badge (2.27:1), the open design decision on contrast tokens | W5 |
| ✅ | Run: desktop image checks F04, F12, F16, with and without this work: only the launcher (2 checks) is new, and expected | W5 |
| ⬜ | Re-export the Figma images: launcher (desktop and MS1), Account settings | W5 |
| ✅ | Tests for the load errors of the people list, Business information, person panel and Show more (Supabase suite) | W5 |
| ✅ | Run: speed on local Supabase through the API with 100 people and 10,041 bookings: list 20 ms, panel 54 ms at p95 (targets 300 and 500 ms) | W5 |
| ✅ | Launcher illustration and header icon (`Asset/Crew`, from the user), in Figma and the app | W5 |
| ✅ | SD0: live database and Storage files backed up (2026-11-25) and restored into a separate local stack. Row counts, every table hash, invoice hashes, accounts, rules and 18 of 18 files match live. The standard dump leaves out the account triggers, Storage rules and buckets; the backup has an `extra.sql` for them | SD0 |
| ✅ | SD0: live has exactly one settings row | SD0 |
| ✅ | Run: migration 015 on the restored copy of live: every row unchanged, the list returns everyone active | W5 |
| — | SD0: automatic backups: not needed for now, live holds dummy data only (user, 2026-11-25). **Needed before the first real customer** | SD0 |
| ✅ | Commit (branch `workspace-crew`) | W5 |
| ✅ | Fresh backup, then migration 015 on live (2026-11-25): every row unchanged, callable only when signed in | W5 |
| ✅ | Pull request #8 merged and deployed (2026-11-25). Checked without logging in: `/workspace` asks for login and returns, the new illustration is served, live rows unchanged | W5 |
| ✅ | Live hand checks, signed in (user, 2026-11-25): all pass, two changes asked: no lag, and stay in Workspace & Crew | W5 |
| ✅ | Booking detail opens in place, without a page change | W5 |
| ✅ | Booking: its own detail panel also opens without a page request | W5 |
| ⬜ | Deploy these changes | W5 |
| ✅ | `PRICING.md` and `supabase/templates/` are no longer tracked: kept on the owner's machine only | — |

### 9.1 Summary

**Problem.** To see one person's bookings, staff must open a booking or use the crew filter; no screen lists the team. Business information, which belongs to the whole workspace, sits inside one person's Account settings.

**Solution.** A new module, **Workspace & Crew**, opened from the App launcher. It holds the Business information card and a table of all active admins and crew. Clicking a person opens a side panel with the bookings they are assigned to.

**Success criteria**

| # | Measure | Target |
|---|---|---|
| 1 | Clicks from the open App launcher to any visible person's bookings | 2 (module tile, row) |
| 2 | Panel bookings compared with the same crew filter in the Booking table, Canceled excluded | 100% match |
| 3 | Business information fields, validation and PDF result after the move | Existing F18 tests pass with only the location changed |
| 4 | Write controls shown to crew accounts in this module | 0 |
| 5 | Business information cards left in Account settings (Figma and app, desktop and mobile) | 0 |

Decisions H–P in §1 apply. AI requirements: not applicable.

### 9.2 Users

| Persona | Needs | Access |
|---|---|---|
| **Admin** | See who is assigned where; keep business details correct | View all, edit business information |
| **Crew** | See their own and teammates' bookings | View only |

**Terms.** *Account type* is Admin or Crew (`profiles.role`). *Job title* is e.g. Videographer (`crew.role`). Never label both "Role" on this page.

### 9.3 Experience and requirements

#### User flow

```
App launcher → Workspace & Crew
  ├─ Business information → Edit (admin) → modal → Save → toast; next PDF uses it
  └─ Admin & crew table → search / filter → click a person
       → side panel: Upcoming | Past
           ├─ click a booking → booking detail over the panel (same page)
           └─ See in Booking → Booking table filtered by that person
       → browser Back returns to the person panel
```

#### User stories and acceptance criteria

##### ✅ WC-1 Open the module
*As any user, I want Workspace & Crew in the App launcher so that I can reach it from anywhere.*

- The launcher's Management group gains the tile **Workspace & Crew**, after Package Lib and before Coming Soon. Four tiles wrap to a second row.
- The tile and header use the illustration `Asset/Crew`; the label takes two lines.
- The current tile, keyboard behaviour and leave guard follow US-11.
- A signed-out visit goes to Login and returns to `/workspace` after sign-in.

##### ✅ WC-2 Business information moves here
*As an admin, I want business details on the workspace page so that they are separate from my personal profile.*

- The fields, Edit modal, field errors, toast and PDF effect stay exactly as in US-14. On desktop the card becomes one horizontal row, so the people table is visible without scrolling.
- Account settings keeps only Profile and Security. No link or placeholder is left behind.
- Admins of a `read_only` workspace also see no **Edit** button (after SD3 exposes the status).
- Crew see the card without **Edit**; the server rejects a write from a crew account.
- A failed save shows the alert "Couldn't save · Check your connection and try again." at the top of the form (WC16), not under Business name.
- A failed load of one part (card or table) doesn't block the other. Each has its own Try again.

##### ✅ WC-3 See all admins and crew
*As any user, I want one list of the team so that I can find a person.*

| Column | Content |
|---|---|
| Name | Avatar (initials) and name; "(You)" on the signed-in person |
| Account type | Tag: **Admin**, **Crew**, or **No login** for a freelancer without an account |
| Job title | `crew.role`, or "—" when empty |
| Upcoming bookings | Count from today onward, Canceled excluded |
| › | Chevron |

- One row per active crew entry. Admins always have one (migration 014), so nobody appears twice.
- Order: signed-in person, then admins, crew, no login; A–Z inside each group.
- **Search** matches name and job title, ignoring case; "you" finds the signed-in person.
- **Type filter:** All / Admin / Crew / No login. It combines with search. The count reads "n people", or "Showing n of N people" when narrowed.
- No pagination in this version; the full list scrolls.
- No login email or other account data is shown.
- There is no add, edit, invite, role change or remove control.

##### ✅ WC-4 Open a person's bookings
*As any user, I want to click a person and see their assigned bookings so that I know what they work on.*

- A click or Enter on a row opens the DS side sheet. The row stays highlighted.
- Header: avatar, name, account type, job title (hidden when empty) and "n bookings in {Mon}", the same count as the existing crew schedule.
- Tabs **Upcoming (n)** and **Past (n)**. Upcoming opens first, also when it is empty.

| Tab | Includes | Order |
|---|---|---|
| Upcoming | Booking date today or later | Date ascending |
| Past | Booking date before today | Date descending; 20 at a time, **Show more** |

- "Today" uses the app's session day. Draft, Partially paid and Paid are included.
- Each item reuses the DS *Schedule item*: date, booking name, package · client, status. Items are grouped under a month heading with the year.
- **Click a booking:** its detail opens over the panel, in place: the page stays Workspace & Crew (`?person=<id>&booking=<id>`; user, 2026-11-25). ×, Esc, the dimmed area and Back return to the person, with the tab kept. **Edit booking** and *Open full page* leave for Booking. Details start loading on hover or focus.
- **See in Booking:** opens the Table tab with `crew=<id>` as the only filter. That table also includes Canceled bookings, so its total can be higher than the panel's.
- The open panel is in the URL (`/workspace?person=<crew id>`). An unknown, inactive or other-workspace id shows the page without the panel and the toast "This person is no longer in the list."
- Esc, × and an outside click close it; focus returns to the row. The list behind the panel is covered, so a click there closes the panel; click again to open another person.

##### ✅ WC-5 Mobile (390)
- Business information card, then people as cards: avatar, name, type tag, job title, upcoming count.
- The panel and the Edit modal become bottom sheets. Content matches desktop.
- Tap targets are at least 44 px. No horizontal scroll at 390 px with the longest allowed names.

#### States to design

| Part | States |
|---|---|
| Page | Admin · Crew (no Edit; also used for read-only workspace) · Loading |
| Business information | Logo / no logo · Edit modal · Field errors · Save failed · Saved toast |
| Table | Default · Row hover · Row focus · Row open · Search with no result ("No people match your search." + Reset) · Load failed |
| Panel | Upcoming · Past · Empty Upcoming ("Nothing scheduled from today.") · Empty Past ("No past bookings.") · Loading · Load failed |
| Launcher | Tile available · hover · current |

#### Non-goals

- Creating, inviting, editing, deactivating or deleting people
- Editing job titles, or assigning crew from this page
- Listing inactive people
- Availability, conflict detection, workload charts or crew pay
- Payment instruction and default terms settings
- Creating or switching workspaces from the app

### 9.4 Figma work

| From | To |
|---|---|
| Launchpad & Profile: AC8, AC9, AC9b, AC10 | Page **Workspace & Crew**, placed in the new page layout |
| Profile flow, lane E (business information) | New flow section on the same page, starting from the App launcher |
| Mobile MA4, MA5 | New mobile section on the same page |
| Every other Account settings frame showing the card (AC2–AC7, MA1 and their flow copies) | Card removed; stays in place |
| Launcher frames (desktop L2, mobile MS1 and other open-launcher frames) | New tile added |

- Drawn 2026-11-25 on page **Workspace & Crew**: Screens WC1–WC20, Mobile WM1–WM7, Hi-fi flow lanes A (people) and B (business information). Components: *Account type tag*, *People table/Header* and */Row*, *Mobile/Person card* (DS section "Workspace & Crew components"). AC8 was replaced by WC1; AC9, AC9b, AC10, MA4, MA5 and lane E were moved.
- New frames: page, table states, panel states, crew view, mobile, flow. Reuse CIR components and variables.
- The five scratch nodes on the target page belong to the user and stay untouched.

### 9.5 Technical specifications

#### Architecture

Existing stack: Next.js app in `app/`, Supabase in `supabase/`, and a mock repo with the same contract.

| Need | Source |
|---|---|
| Business information | `getBusiness` / `updateBusiness` and `BusinessInformation.tsx`, reused |
| People list and upcoming counts | **New** read `listPeople`, backed by one new read-only database function |
| Panel: Upcoming and month count | Existing `getCrewSchedule` |
| Panel: Past | Existing booking list read with crew, `to` = yesterday and Canceled excluded; newest first |
| Open in Booking | Existing URL state: `tab`, `crew`, `booking` |

`listPeople` returns `{ crewId, name, jobTitle, type: "admin" | "crew" | "none", isYou, upcomingCount }`. It joins active `crew` to `profiles` through `crew.user_id`. Counts come from one query, not one per person.

#### Integration points

- **Database:** one migration adding the read function (`SECURITY INVOKER`), mirrored in `setup-production.sql`. No new tables or columns. Live rollout runs the single file inside `begin` / `commit`; never `db push`. It waits for SD0.
- **Auth:** the existing session check, extended to `/workspace`.
- **App:** `ModuleId` and `TILES` in `AppLauncher.tsx`, header, mobile launcher, Account settings.
- **Asset:** `Asset/Crew` → `tile-crew` (56) and `module-crew` (18), @1x and @2x.

#### Security and privacy

- Reads go through current row-level security: any active staff member sees all rows today; after SD2, only their workspace's rows.
- Business writes stay admin-only in the database, not only in the UI.
- The function returns no email, user id, password data or inactive people.
- `listPeople` is covered by §5 tests 1, 7 and 16; the business edit by 17 and 18.

#### Non-functional targets

Proposed. Measured locally in §9.0; not on the live database.

| Area | Target |
|---|---|
| People list | p95 ≤ 300 ms in the database with 100 people and 10,000 bookings |
| Panel first content | p95 ≤ 500 ms on the same data |
| Accessibility | WCAG 2.2 AA; table and panel fully usable by keyboard |

#### Tests

- **Unit:** order, "(You)", search, type mapping, today boundary, Canceled excluded, mock and SQL parity.
- **pgTAP:** admin and crew can read; inactive account reads nothing; inactive people are left out; counts match `filter_bookings`.
- **e2e at 1440 and 390:** launcher → page → panel → booking → Back; See in Booking; crew has no Edit; Account settings has no business card; updated business appears in the PDF.
