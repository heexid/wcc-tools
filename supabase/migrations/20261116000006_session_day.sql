-- 006 · Sessions end at 00:00 WIB every day (decided 2026-11-16, user). The proxy signs such a session out on
-- the next page load; this makes the database refuse it too, so an access token issued before midnight can't
-- keep reading or writing through the API until it expires.
-- "When the session signed in" = the earliest `amr` timestamp in the JWT (kept across token refreshes).
-- No `amr` (not a Supabase Auth user token, e.g. tests setting claims directly) → treated as fresh.
create function public.session_fresh()
returns boolean
language sql
stable
set search_path = ''
as $$
  with c as (select nullif(current_setting('request.jwt.claims', true), '')::jsonb as claims),
  amr as (
    select min((e ->> 'timestamp')::bigint) as signed_in
      from c, jsonb_array_elements(case when jsonb_typeof(c.claims -> 'amr') = 'array' then c.claims -> 'amr' else '[]' end) e
     where jsonb_typeof(e -> 'timestamp') = 'number'
  )
  select coalesce(
    (select to_timestamp(signed_in) >= (date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta') from amr),
    true);
$$;
revoke execute on function public.session_fresh() from public, anon;
grant execute on function public.session_fresh() to authenticated;

-- Staff and admin checks now also require a session from today.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_fresh() and exists (select 1 from public.profiles p where p.id = auth.uid());
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_fresh() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
