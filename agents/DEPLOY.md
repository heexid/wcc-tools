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
   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where email = 'you@example.com';
   ```
   Your crew entry is added automatically, so you can assign yourself to bookings. For a read-only crew account, add the user the same way and use `'{"role":"crew"}'`.
6. **Add crew who won't log in** (accounts get their crew entry automatically), one line per person:
   ```sql
   insert into public.crew (name, role) values ('Raka Pratama', 'Lead photographer'), ('Dinda Ayu', 'Videographer');
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

## 4 · Check it works (10 minutes, on the live site)

1. Log in with your admin account.
2. *Package Library* → create a package.
3. *Bookings* → *New booking* → fill it in → *Save booking*.
4. *Create invoice* → DP 50 % → confirm.
5. Download the invoice PDF and check your business name and bank details.
6. *Cancel booking* on that test booking (it stays as a record, marked Canceled).

All six work → you're live.

**Before real client data:** make sure your Supabase plan includes backups (the free plan has none; Pro has daily backups) under *Project Settings → Add-ons / Backups*.

## Accounts (admin and crew)

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

## Upgrade to crew types (databases set up before 2026-11-24)

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

## After launch

- **Business name, logo, address:** in the app, *Account settings → Business information*.
- **Bank details and default terms** printed on invoices (*SQL Editor*):
  ```sql
  update public.workspace_settings set
    default_payment = '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"Your Studio"}',
    default_terms   = 'Your terms, max 255 characters.';
  ```
- **Sessions end at 00:00 WIB** every day; everyone logs in again the next morning. This is deliberate.
- **Packages** are created in the app (*Package Library*).
