# Deploy: Supabase + Vercel

About 15 minutes, all in the browser. Do Supabase first, then Vercel.

## 1 · Supabase (database, login, file storage)

1. **Create the project:** [supabase.com](https://supabase.com) → *New project*. Region: **Southeast Asia (Singapore)**. Save the database password somewhere safe.
2. **Create the database:** *SQL Editor* → *New query* → paste the whole of [`supabase/setup-production.sql`](supabase/setup-production.sql) → **Run**. It should finish with "Success. No rows returned".
   **Already deployed before 2026-11-21?** Don't re-run the whole file. Run only [`supabase/migrations/20261121000013_booking_event_details.sql`](supabase/migrations/20261121000013_booking_event_details.sql) (adds event start / location / notes). It is safe on live data: the new columns are optional and existing invoices are untouched.
3. **Turn off public sign-up:** *Authentication → Sign In / Providers* → turn **off** "Allow new users to sign up". Only people you add can log in.
4. **Add yourself:** *Authentication → Users* → *Add user* → *Create new user* → your email and a password → tick **Auto Confirm User**.
5. **Make yourself admin:** *SQL Editor* → run (with your email):
   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data
     || jsonb_build_object('role', 'admin', 'workspace_id', (select id from public.workspaces where slug = 'main'))
   where email = 'you@example.com';
   ```
   Your crew entry is added automatically, so you can assign yourself to bookings. For a read-only crew account, add the user the same way with `'role', 'crew'`. An account needs both a role and a workspace; with only a role, no account is made.
6. **Add crew who won't log in** (accounts get their crew entry automatically), one line per person:
   ```sql
   insert into public.crew (workspace_id, name, role)
   select w.id, v.name, v.role from public.workspaces w,
     (values ('Raka Pratama', 'Lead photographer'), ('Dinda Ayu', 'Videographer')) v(name, role)
   where w.slug = 'main';
   ```
7. **Copy three values** from *Project Settings → API Keys* (and *Data API* for the URL):
   - Project URL (`https://xxxx.supabase.co`)
   - **anon / publishable** key
   - **service_role / secret** key: keep it private; it goes only into Vercel.

## 2 · Vercel (the website)

1. [vercel.com](https://vercel.com) → *Add New… → Project* → import **heexid/wcc-tools**.
2. **Root Directory:** click *Edit* and choose **`app`**. The framework is detected as Next.js; leave everything else.
3. **Environment Variables** (all three, for Production *and* Preview):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | the service_role / secret key |

4. **Deploy.** When it's done, copy your site address (e.g. `https://wcc-tools.vercel.app`).

## 3 · Connect them

Supabase → *Authentication → URL Configuration* → **Site URL** = your Vercel address → *Save*.

Open the site, log in with the account from step 1.4, and you're live. From now on, every push to GitHub redeploys automatically.

### Password reset emails (PASSWORD-RESET-PLAN.md)

**Forgot password?** emails a reset link. Supabase's built-in sender only reaches your own Supabase team and about 2 emails an hour, so real users need your own sender (Resend):

1. [resend.com](https://resend.com) → add and verify your domain (DNS records; can take a few hours) → *API Keys* → create a key with sending access.
2. Supabase → *Authentication → Emails → SMTP Settings* → enable custom SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = the API key, sender `no-reply@<your domain>`, sender name `CIR`.
3. *Authentication → Emails → Templates → Reset password*: subject `Reset your CIR password`, body = the whole of `supabase/email/reset-password.html`.
4. *Authentication → URL Configuration*: **Site URL** = your live address (the email link uses it); add `<live address>/auth/confirm` to **Redirect URLs**.
5. Check: *Forgot password?* with your own email → the email arrives → *Reset password* → set a new password → log in with it.

Until step 1–2 are done, reset a password with SQL (below).

## 4 · Check it works (10 minutes, on the live site)

1. Log in with your admin account.
2. *Package Library* → create a package.
3. *Bookings* → *New booking* → fill it in → *Save booking*.
4. *Create invoice* → DP 50 % → confirm.
5. Download the invoice PDF and check your business name and bank details.
6. *Cancel booking* on that test booking (it stays as a record, marked Canceled).

All six work → you're live.

**Before real client data:** make sure your Supabase plan includes backups (the free plan has none; Pro has daily backups) under *Project Settings → Add-ons / Backups*. **Checked 2026-11-24: the live project lists no backups.** Until that changes, take a dump before every migration and keep it outside the repo (it holds client data):
```bash
umask 077; mkdir -p ~/wcc-tools-backups/YYYY-MM-DD
app/node_modules/.bin/supabase db dump --linked -f ~/wcc-tools-backups/YYYY-MM-DD/schema.sql
app/node_modules/.bin/supabase db dump --linked --data-only --use-copy -s public,auth,storage -f ~/wcc-tools-backups/YYYY-MM-DD/data.sql
```

## Accounts (admin and crew)

Every account belongs to one workspace and never moves. Replace `'main'` with the customer's workspace code (`select slug, name, status from public.workspaces;`).

**Create.** Add the user in Supabase → Authentication → Users (Auto Confirm), then:

```sql
-- Optional: for someone already in the crew list, add "crew_id" to link them and avoid a duplicate.
-- select id, name, role from public.crew where user_id is null and workspace_id = (select id from public.workspaces where slug = 'main');
update auth.users
set raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || '{"display_name":"Raka Pratama"}',
    raw_app_meta_data  = raw_app_meta_data
      || jsonb_build_object('role', 'crew',   -- or 'admin'; optionally , 'crew_id', '<uuid>'
                            'workspace_id', (select id from public.workspaces where slug = 'main'))
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

**Reset someone's password by hand** (fallback — people normally use *Forgot password?*). Check who is asking first. Set a temporary password (8+ characters, a letter and a number), send it privately, and ask them to change it in *Account → Change password*:

```sql
update auth.users set encrypted_password = extensions.crypt('Temp1234x', extensions.gen_salt('bf')), updated_at = now()
where email = 'raka@example.com';                                   -- must say 1 row
update public.profiles set password_changed_at = now()
where id = (select id from auth.users where email = 'raka@example.com');
delete from auth.sessions where user_id = (select id from auth.users where email = 'raka@example.com');  -- signs them out everywhere
```

## Upgrade to crew types (databases set up before 2026-11-24)

**The live database was upgraded on 2026-11-24.** Keep these steps for any other database. Run migration files one at a time inside `begin; … commit;`, not with `supabase db push`: a database created from `setup-production.sql` may have no migration history.

1. **Back up**, then list the viewers. **Every active one becomes an admin.** Keep the list, and revoke any that should not:
   ```sql
   select u.email, p.display_name, p.active from public.profiles p join auth.users u on u.id = p.id where p.role = 'viewer';
   ```
2. For each account that is already in the crew list, set the link so the person doesn't appear twice. After the migration it is too late for this step:
   ```sql
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"crew_id":"<crew uuid>"}' where email = 'raka@example.com';
   ```
3. **Deploy the app and wait until it is live.** The older app would show edit buttons to crew accounts.
4. Run [`supabase/migrations/20261124000014_crew_types.sql`](../supabase/migrations/20261124000014_crew_types.sql).
5. Create the crew logins (see *Accounts* above).
6. Check: an admin assigns themself and filters by themself; a crew login has no edit buttons and can download a PDF.

## Upgrade to Workspace & Crew (databases set up before migration 015)

**Run on the live database on 2026-11-25.** Keep these steps for any other database. New databases get it from `setup-production.sql`.

1. **Back up.** `supabase db dump` leaves out the triggers on `auth.users`, the Storage policies and the buckets, so save those too (tested 2026-11-25, SD0 in [`SHARED-DATABASE-PLAN.md`](../context/SHARED-DATABASE-PLAN.md)).
2. Run [`supabase/migrations/20261125000015_list_people.sql`](../supabase/migrations/20261125000015_list_people.sql) inside `begin; … commit;`. It only adds one read-only function, so the running app is not affected.
3. **Then deploy the app.** Deployed first, the people list would show its load error.
4. Check as admin and as crew: the list, a person's panel, See in Booking; crew have no Edit. Edit the business information, then download an invoice PDF.

**Undo:** redeploy the previous app version. The function can stay, or `drop function public.list_people(date);`.

## After launch

- **Business name, logo, address:** in the app, *Workspace & Crew → Business information*.
- **Bank details and default terms** printed on invoices (*SQL Editor*):
  ```sql
  update public.workspace_settings set
    default_payment = '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"Your Studio"}',
    default_terms   = 'Your terms, max 255 characters.';
  ```
- **Sessions end at 00:00 WIB** every day; everyone logs in again the next morning. This is deliberate.
- **Packages** are created in the app (*Package Library*).
