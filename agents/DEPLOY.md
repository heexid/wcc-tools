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
   For a read-only crew account, add the user the same way and use `'{"role":"crew"}'`.
6. **Add your crew** (there is no crew screen yet), one line per person:
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
