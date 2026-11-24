# Plan: crew types (admin and crew)

| | |
|---|---|
| **Status** | Draft, 2026-11-24. Not started. |
| **Goal** | Two account types: **admin** (full access, assignable to bookings) and **crew** (read-only). |
| **Companions** | `PRD.md` US-1, US-7, §4.2–4.4 · `INTERACTIONS.md` 1.7, 2.9, 6.4 · `PRODUCTION-PLAN.md` P4, P10 |

## 1. Decisions (2026-11-24)

| # | Decision |
|---|---|
| 1 | The only types are `admin` and `crew`. `viewer` is removed. |
| 2 | Existing viewer accounts, including the Owner, become **admin**. |
| 3 | Crew see everything, read-only: bookings, money, invoices, PDFs, packages. Same access as the old viewer. |
| 4 | The developer creates, edits and deletes accounts with SQL. No crew or account screen. |
| 5 | Every admin is automatically in the crew list, so they can pick themself in the booking form and be found in the crew filter. |

**Assumptions (change these before C1 if wrong)**
- A new **crew** login also gets a crew entry automatically, or links to an existing one.
- People in the crew list without a login stay supported (freelancers).
- Crew can still change their own name and password, as viewers can now.

### Permissions

| Action | admin | crew |
|---|---|---|
| View bookings, calendar, KPIs, invoices, packages, business info; download PDFs | yes | yes |
| Use the crew filter and crew schedule | yes | yes |
| Create / edit / cancel bookings, assign crew (including self), create invoices | yes | no |
| Create / edit / archive packages, edit business info | yes | no |
| Change own name and password | yes | yes |
| Be assigned to a booking | yes | yes |
| Manage accounts | SQL only | SQL only |

"CRUD" follows today's rules: bookings are canceled, packages are archived, and invoices are never edited or deleted.

## 2. What exists now

- `profiles.role` is `admin | viewer`. Writes are admin-only in the UI (`useIsViewer`) and the database (`require_admin`, RLS).
- `crew` is a separate list of people. `crew.role` is a **job title** ("Videographer"), not the account type. Keep it that way.
- `crew.user_id → profiles.id` exists, but no code reads or writes it, and it isn't unique.
- The crew picker (desktop and mobile), filter and schedule work from `crew`, so linked admins appear without new screens.

## 3. Database: migration 014

File: `supabase/migrations/<date>000014_crew_types.sql`. Mirror it in `setup-production.sql`.

**Order inside the migration**
1. Drop the `profiles.role` check.
2. Add a unique index: `crew(user_id) where user_id is not null`.
3. Replace `handle_new_user` and `handle_user_role_change`: accept `admin` and `crew` only. Any other value gives no access.
4. Convert viewers:
   - Active viewers become `admin`, in both `auth.users.raw_app_meta_data` and `profiles`.
   - Inactive viewers become `crew` and **stay inactive**.
5. Set the column default to `crew` and the check to `('admin', 'crew')`.
6. Add trigger `profiles_sync_crew` (security definer, `search_path = ''`, execute revoked from API roles):

| Profile event | Crew entry |
|---|---|
| New profile | Link the row in `app_metadata.crew_id` if it exists and is unlinked (keep its name). Otherwise insert one: name = display name, job title empty, `user_id` set. |
| `display_name` changes | Update the linked crew name. |
| `active` changes | `crew.is_active` follows. Past bookings keep the person. |
| Profile deleted | Set `is_active = false`; the existing FK clears `user_id`. |

7. Backfill a linked entry for each active profile, using the same `crew_id` rule. Never match on name.

**No change:** RLS policies, write RPCs, `booking_crew`, the crew filter query. `is_admin()` reads the profile on every call, so a demotion takes effect immediately.

## 4. App

| Area | Change |
|---|---|
| `lib/data/types.ts` | `Role = "admin" \| "crew"`. `Crew` gains `userId: string \| null`. |
| `lib/data/supabase/{reads,repo}.ts` | Add `user_id` to all three crew selects; map to `userId`. |
| `lib/data/{seed,repo,store}.ts` | Mock admin gets a linked crew entry. Bump the stored Db version. |
| `lib/role.ts` | Rename `useIsViewer` to `useIsReadOnly`: true for any known role other than `admin`. First paint is unchanged, for hydration. Update all callers. |
| `FormPopovers.tsx` `CrewSelect` | Signed-in admin first, labelled `Name (You)`. Searching "you" finds them. They are **not** preselected on a new booking. |
| `BookingFilters.tsx`, `MobileFilters.tsx` | Same "(You)" label and order. URL stays `crew=<id>`. |
| Chips, avatars, schedule, PDF | Plain name, no "(You)". |
| Empty job title | Picker and schedule hide the second line instead of showing a blank. |
| `AppShell`, `AccountSettings` | Label "Crew" instead of "Viewer". Note: "Can view bookings and download invoices. Set by your workspace admin." |
| `/dev/role` | Admin / Crew switch. |
| Landing (`Faq`, `LandingPage`) | "Viewer" becomes "Crew". |

Put the ordering and label in one helper (`lib/booking/crew.ts`) shared by the form and both filters.

## 5. Developer queries (add to `agents/DEPLOY.md`)

**Create.** Add the user in Supabase → Authentication → Users (Auto Confirm), then:

```sql
-- Optional: for someone already in the crew list, add "crew_id" to link them and avoid a duplicate.
-- select id, name, role from public.crew where user_id is null;
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || '{"display_name":"Raka Pratama"}',
    raw_app_meta_data  = raw_app_meta_data || '{"role":"crew"}'   -- or "admin"; optionally ,"crew_id":"<uuid>"
where email = 'raka@example.com';
```

**Edit**

```sql
-- Type
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = 'raka@example.com';
-- Job title
update public.crew set role = 'Videographer'
where user_id = (select id from auth.users where email = 'raka@example.com');
-- Name (the crew entry follows)
update public.profiles set display_name = 'Raka P.'
where id = (select id from auth.users where email = 'raka@example.com');
```

**Delete = revoke access**

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where email = 'raka@example.com';
```

Don't delete the auth user as routine. Deleting an admin who issued an invoice **fails**: the FK tries to clear `invoices.created_by`, and the append-only trigger rejects it. Deleting other users loses their name on past bookings. Reserve a hard delete for accounts created by mistake with no history.

**Check there is always an admin**

```sql
select count(*) from public.profiles where active and role = 'admin';   -- must be ≥ 1
```

## 6. Slices

| Slice | Work | Done when |
|---|---|---|
| **C1 Database** | Migration 014, setup file, local users seed, regenerated types, pgTAP | pgTAP and the RLS matrix pass with `crew` in place of `viewer` |
| **C2 App role** | Types, `useIsReadOnly`, labels, `/dev/role`, landing | No write control is visible to crew; no `viewer` role left in `app/src` |
| **C3 Admin as crew** | `userId` mapping, helper, form picker, filters (desktop and mobile), mock seed | An admin assigns themself, saves, filters by themself and sees the booking |
| **C4 Docs** | PRD, INTERACTIONS (1.7, 2.9, 6.4), FEATURES, DEPLOY, README, marketing copy, a Figma note for 02b / 03b | Docs match the app |
| **C5 Release** | §8 | Live checks pass |

C1 and C2 can run in parallel. C3 needs both.

## 7. Tests

- **pgTAP (new `015_crew_types`)**: role check; active viewer → admin; inactive viewer stays inactive; link by `crew_id`; no duplicate entry; name sync; revoke and restore; unknown role gives no access; job title survives a type change.
- **Existing pgTAP**: replace `viewer` in 002, 006, 007, 009 and 013. In 005, count crew with `user_id is null` (still 6). 005 is generated, so change `gen-seed-sql.ts`, which must also skip linked entries because the trigger creates them.
- **Local users**: Owner becomes admin, `account-test` becomes crew, and add a crew login for the specs that sign in as the Owner to test read-only access (smoke, auth, business, PDF, bookings-write).
- **Unit**: the "You" helper; seed (6 crew plus the linked admin); mock ⇄ SQL parity with linked entries excluded or mapped.
- **e2e mock**: rename the F17 viewer suite; add self-assign and self-filter at 1440 and 390 px.
- **e2e Supabase**: an admin self-assigns and it persists; crew cannot open `/bookings/new` or `/edit`, and a direct RPC call returns `forbidden`.
- **Not run unless asked**: visual gates. Frames 02b and 03b gain a row, so their PNGs will need a re-export.

## 8. Release

1. **Back up**, then list who will gain full access, and confirm the list:
   ```sql
   select u.email, p.display_name, p.active from public.profiles p join auth.users u on u.id = p.id where p.role = 'viewer';
   ```
   Revoke any account that should not become admin **before** continuing.
2. Match accounts to existing crew rows and set `crew_id` in their `raw_app_meta_data`.
3. **Deploy the app first.** The new app treats an old `viewer` as read-only. The old app would show edit buttons to a `crew` account (the database would still refuse).
4. Run migration 014.
5. Create crew logins (§5).
6. Check live: admin self-assign and filter; crew login is read-only; crew PDF download works.

**Rollback:** after migration 014, fix forward. Reverting the app would show edit buttons to crew, and promoted viewers cannot be told apart from other admins without the list saved in step 1.

## 9. Risks

| Risk | Mitigation |
|---|---|
| An old viewer unintentionally gets write access | Step 1 list and confirmation |
| The same person appears twice in the crew list | `crew_id` link, unique index, step 2 |
| Office-only admins clutter the crew list | Accepted (decision 5) |
| `crew.role` (job title) confused with `profiles.role` (account type) | UI text uses "type" for accounts; no schema rename |
| Crew can see client phones and money | Accepted (decision 3) |
