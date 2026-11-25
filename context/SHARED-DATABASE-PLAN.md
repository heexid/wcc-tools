# Plan: workspaces (many businesses in one app and database)

| | |
|---|---|
| **Status** | Plan only, written 2026-11-25. Nothing is built. |
| **Goal** | One Vercel app and one Supabase project serve every customer. No customer can see or change another's data. |
| **Why** | Removes the server cost per customer. |
| **Companions** | `PRD.md` §4.2–4.4 · `CREW-TYPE-PLAN.md` · `PRODUCTION-PLAN.md` P10 (RLS) and D3 (workspace membership) |

A customer's business is called a **workspace**. This is the only name used for it.

## 1. Decisions

**Confirmed by the user (2026-11-25)**

| # | Decision |
|---|---|
| A | The name is **workspace**. |
| B | Admins, crew and data of one workspace can't be created, read, updated or deleted by another workspace. |
| C | The developer creates workspaces, admins and crew with queries. Template: `supabase/templates/workspace-accounts.sql`. |

### Permissions

| Action | Admin, own workspace | Crew, own workspace | Anyone, other workspace |
|---|---|---|---|
| View bookings, invoices, packages, crew, settings | Yes | Yes | **No** |
| Create and edit bookings, packages and settings; create invoices | Yes | No | **No** |
| Cancel bookings, archive packages | Yes | No | **No** |
| Delete bookings or invoices | No | No | **No** |
| Create or manage workspaces, admins and crew | No (developer query) | No (developer query) | **No** |

**Not confirmed yet**

| # | Question | Recommended |
|---|---|---|
| 1 | How is a workspace identified? | By the login. Everyone uses the same web address. |
| 2 | Can one account be in two workspaces? | No. One email = one workspace. |
| 3 | Invoice and booking numbers | Each workspace has its own sequence, so each starts at `INV-2026-0001`. |
| 4 | Customer stops paying | Read-only: they can see and download, but not add or edit. Turned on by hand. |
| 5 | Custom form fields | Settings per workspace: text, number, date, choice or checkbox. |
| 6 | Custom invoice | Settings per workspace: colour, footer note, show or hide sections, choice of layouts. No code per customer. |
| 7 | Time zone | WIB for everyone in v1, including the 00:00 session end. |

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
10. **Accounts** need `app_metadata.role` **and** a valid `workspace_id`. Without both, no profile and no access. A linked `crew_id` must be in the same workspace.
11. **Files:** `<workspace id>/logo/<hash>` and `<workspace id>/<invoice id>/<fingerprint>.pdf`. Storage policies check the first folder. The PDF route still reads the invoice through the caller's session before using the service role.
12. **Browser cache:** keys include the workspace, and the tab clears its data when the signed-in account changes. Server code must never use a shared cache for workspace data.

### Custom fields and invoices

- `workspace_settings.booking_fields` holds the field definitions. `bookings.custom_fields` holds the values, checked by the server.
- A field has a permanent key. Removing it hides it on new bookings, and old values stay.
- New invoices copy the fields and labels into their snapshot. **Old snapshots and hashes never change.**
- `workspace_settings.invoice_config` is added to the PDF fingerprint, so a changed layout makes a new file. As with the business block, it also applies to old invoices; amounts don't change.

## 4. Phases

Effort is a rough guess for one developer with Claude, not a measurement.

| Phase | Work | Done when | Days |
|---|---|---|---|
| **SD0** Safety | Turn on and test backups. Dump the live database and copy Storage files. Check that live has exactly one settings row. | A restore works on a separate project | 1 |
| **SD1** Tables | Migrations: workspaces, `workspace_id`, composite keys, uniqueness, counters | Existing database tests pass; row counts and invoice hashes are unchanged | 2–3 |
| **SD2** Isolation | RLS, every read and write function, accounts, settings, read-only status | Two-workspace tests pass (§5) | 3–4 |
| **SD3** App and files | Logo and PDF paths, PDF route, browser cache, seeds, mock parity, generated types, `setup-production.sql` | App and Supabase end-to-end tests pass with two workspaces | 2–3 |
| **SD4** Go live | Rehearse on a copy, migrate live (§6), create a second test workspace | Hand checks pass with both accounts | 1–2 |
| **SD5** Customer setup | Finalize `supabase/templates/workspace-accounts.sql` (drafted) against the real migrations; add it to the database tests; add a one-workspace export | A new workspace takes under 15 minutes | 1 |
| **SD6** Customization | Custom fields in form, detail panel, invoice and PDF; invoice settings | Two workspaces have different forms and invoices | 4–6 |

**Total: about 14–20 days.** You can sell after SD5 (10–14 days) if you don't promise custom fields or invoices yet. Custom setup needs SD6.

## 5. Tests that must pass

Use workspaces A and B, each with an admin and a crew account.

| # | Test | Expected |
|---|---|---|
| 1 | A reads every table and calls every read function | No B rows |
| 2 | A's admin calls every write function with B's booking, package or crew id | Rejected; B is unchanged |
| 3 | A saves its own booking with B's package or crew | Rejected |
| 4 | A opens B's invoice PDF by id or number | 404 |
| 5 | Both have `INV-2026-0001` | Each downloads its own PDF |
| 6 | A reads, replaces or deletes B's logo | Rejected |
| 7 | Settings, totals, search, filters, crew schedule | Only own data and own bank account |
| 8 | Account without a workspace, inactive account, yesterday's session, closed workspace | No data |
| 9 | Read-only workspace | Reads and existing PDFs work; every business write fails |
| 10 | Two admins in one workspace create invoices at the same time | No duplicate number |
| 11 | Two tabs, A signs out and B signs in | No A data on B's screen |
| 12 | Every invoice hash before and after migration | Identical |
| 13 | Every public table has a workspace policy, and every `SECURITY DEFINER` function is on a reviewed list | Passes, so new code can't skip isolation |
| 14 | Performance with 50 workspaces | Within the existing budgets |

Add these database tests to CI. CI doesn't block Vercel deploys today, so **make it required before deploying**.

## 6. Moving the live data

1. Announce a short maintenance time. Stop writes.
2. Take a fresh database dump and a copy of both Storage buckets. Record row counts, totals and invoice hashes.
3. Run each migration file inside `begin` / `commit` with `supabase db query --linked -f`. **Never use `db push`:** live was built from `setup-production.sql` and may have no migration history.
4. Add `workspace_id` with the current workspace's id as a **constant column default**, then drop the default. Don't backfill with `UPDATE`: the invoice append-only trigger would block it, and booking edit times could change.
5. Copy the logo to its new path and update the setting. Accept the old path until the new app is live, then remove that exception. PDFs regenerate by themselves.
6. Deploy the app. Compare counts, totals and hashes. Check login, a booking, an invoice and a PDF by hand.
7. Create test workspace B, run the §5 checks by hand, then open to customers.

**Rollback:** before a second workspace has data, restore the dump and the previous Vercel deployment. After real customers join, fix forward: restoring would erase everyone's newer data.

## 7. Risks

| Risk | What we do |
|---|---|
| One missed filter leaks client data | RLS, composite keys and function checks; §5 tests required |
| Wrong bank account on an invoice | Settings by workspace only; test 7 |
| One outage affects all customers | Tested backups, monitoring |
| Restoring one customer restores everyone | Export and restore per workspace (SD5) |
| One customer's custom request breaks others | Settings only; quote new features separately |
| Server gets too small | Watch load; a bigger server raises the running cost |
| Database backups don't include Storage files | Back up both buckets separately |

## 8. Not in this plan

Self sign-up, online payment, an owner dashboard, custom domains, accounts in several workspaces, other time zones, and separate code per customer.
