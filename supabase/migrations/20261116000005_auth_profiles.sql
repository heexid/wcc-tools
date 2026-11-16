-- 005 · P4: who is staff, and a profile for every staff account (PRD §4.3, US-13).
-- A profile — and with it any read access — exists only for an account an admin gave a role:
-- `app_metadata.role` ('admin' | 'viewer') is set through the admin API (P14) and cannot be set by the user.
-- So even if sign-up were left on in a hosted project, a self-registered account gets no profile and reads
-- nothing. D3 (workspace membership as the role source) may replace app_metadata later.

-- Staff = a profile row for the JWT subject. SECURITY DEFINER so policies on profiles don't recurse.
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid());
$$;
revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Replace 003's "any signed-in user" read policies with staff-only ones.
do $$
declare t text;
begin
  foreach t in array array['packages', 'crew', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'profiles'] loop
    execute format('drop policy staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select to authenticated using (public.is_staff())', t);
  end loop;
end $$;

-- Workspace settings (bank details, terms, business) are staff-only too: 003's get_settings() only checked
-- "signed in" (security review, P4).
create or replace function public.get_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'defaultTerms', s.default_terms,
    'defaultPayment', s.default_payment,
    'business', jsonb_build_object('name', s.business_name, 'address', s.business_address, 'phone', s.business_phone,
                                   'email', s.business_email, 'logo', s.business_logo_path))
  from public.workspace_settings s
  where public.is_staff()
  order by s.updated_at desc
  limit 1;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
  v_name text := left(btrim(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1))), 50);
begin
  if v_role is null or v_role not in ('admin', 'viewer') then
    return new; -- not provisioned by an admin: no profile, no access
  end if;
  if char_length(v_name) < 2 then v_name := 'User'; end if;
  insert into public.profiles (id, display_name, role, password_changed_at)
  values (new.id, v_name, v_role, now())
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
