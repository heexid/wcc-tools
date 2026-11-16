-- 003 · P3 foundation: staff read access, profile + settings RPCs, Package Library RPCs.
-- Reads go through the browser client under RLS (P3 slice log, "read path"); writes through SECURITY DEFINER RPCs.
-- The policies below are exactly the read column of the P10 matrix (PRODUCTION-PLAN §3 P10). P10 audits them.

-- ─── Read policies (authenticated staff: admin + viewer) ────────────────────────────────────────
create policy staff_read on public.packages for select to authenticated using (true);
create policy staff_read on public.crew for select to authenticated using (true);
create policy staff_read on public.bookings for select to authenticated using (true);
create policy staff_read on public.booking_items for select to authenticated using (true);
create policy staff_read on public.booking_crew for select to authenticated using (true);
create policy staff_read on public.invoices for select to authenticated using (true);

-- Explicit grants: current Supabase does not give the API roles table access by default, and a policy only
-- filters rows a role can already reach.
grant select on public.packages, public.crew, public.bookings, public.booking_items, public.booking_crew, public.invoices to authenticated;

-- Profiles: every signed-in user may read names and roles (bookings show "Created by"), nothing else.
-- The own row's private fields come from my_profile().
create policy staff_read on public.profiles for select to authenticated using (true);
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name, role) on public.profiles to authenticated;

-- Supabase's default grants give the API roles INSERT/UPDATE/DELETE on new tables. RLS already denies them
-- (no write policies), but revoke so the intent is explicit and a future permissive policy can't open them.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.invoice_counters, public.booking_counters, public.workspace_settings from anon, authenticated;

-- ─── Profile (US-13) ────────────────────────────────────────────────────────────────────────────
create function public.my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'email', u.email,
    'role', p.role,
    'workspace', coalesce((select s.business_name from public.workspace_settings s order by s.updated_at desc limit 1), ''),
    'passwordChangedAt', to_char(coalesce(p.password_changed_at, p.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'))
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = auth.uid();
$$;

create function public.update_display_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid()) then
    perform public.raise_code('forbidden', 'Sign in first.');
  end if;
  if char_length(v) < 2 or char_length(v) > 50 then perform public.raise_code('length', 'Enter 2–50 characters.'); end if;
  update public.profiles set display_name = v where id = auth.uid();
  return public.my_profile();
end;
$$;

-- Stamped by the Server Action after Supabase Auth accepted the new password (US-13 "Last changed").
create function public.mark_password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set password_changed_at = now() where id = auth.uid();
$$;

-- ─── Workspace settings (read for staff; business edit for admins) ──────────────────────────────
create function public.get_settings()
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
  where auth.uid() is not null
  order by s.updated_at desc
  limit 1;
$$;

-- Field validation runs in the Server Action with the shared validateBusiness(); the table CHECKs back it up.
-- The logo (Storage `branding/`) is P8; this keeps the stored path unless one is passed.
create function public.update_business(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.workspace_settings set
    business_name = btrim(p ->> 'name'),
    business_address = btrim(p ->> 'address'),
    business_email = btrim(p ->> 'email'),
    business_phone = btrim(p ->> 'phone'),
    business_logo_path = case when p ? 'logo' then nullif(p ->> 'logo', '') else business_logo_path end,
    updated_by = auth.uid()
  where workspace_id = (select workspace_id from public.workspace_settings order by updated_at desc limit 1);
  return public.get_settings() -> 'business';
end;
$$;

-- ─── Package Library (US-0) ─────────────────────────────────────────────────────────────────────
-- PackageRow shape (app/src/lib/data/repo.ts): Package + "bookings" (real count; legacyBookings is prototype-only).
create function public.package_row(p public.packages)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'price', p.price, 'summary', p.summary, 'description', p.description,
    'isActive', p.is_active,
    'archivedAt', to_char(p.archived_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD'),
    'updatedAt', to_char(p.updated_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD'),
    'legacyBookings', 0,
    'bookings', (select count(*)::int from public.bookings b where b.package_id = p.id));
$$;

-- Security invoker: runs under the caller's RLS (staff_read).
create function public.list_packages(p_tab text default null, p_search text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.package_row(p) order by p.created_at, p.id), '[]')
    from public.packages p
   where (p_tab is distinct from 'archived' or not p.is_active)
     and (p_tab is distinct from 'active' or p.is_active)
     and (coalesce(btrim(p_search), '') = ''
          or strpos(lower(p.name), lower(btrim(p_search))) > 0
          or strpos(lower(p.summary), lower(btrim(p_search))) > 0);
$$;

-- packageErrors() + savePackage() (repo.ts). DETAIL = PackageErrors JSON on 'package_invalid'.
create function public.save_package(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e jsonb := '{}';
  v_id uuid := public.try_uuid(p ->> 'id');
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_price bigint := public.json_money(p -> 'price');
  v_desc text := coalesce(p ->> 'description', '');
  v_row public.packages;
begin
  perform public.require_admin();
  if p ->> 'id' is not null and not exists (select 1 from public.packages where id = v_id) then
    perform public.raise_code('not_found', 'Package not found.');
  end if;
  if v_name = '' then e := e || '{"name":"required"}';
  elsif exists (select 1 from public.packages o where o.is_active and o.id is distinct from v_id and lower(o.name) = lower(v_name)) then
    e := e || '{"name":"duplicate"}';
  end if;
  if v_price is null then e := e || '{"price":"invalid"}'; end if;
  if char_length(v_desc) > 1000 then e := e || '{"description":"too_long"}'; end if;
  if e <> '{}' then perform public.raise_code('package_invalid', e::text); end if;

  if v_id is null then
    insert into public.packages (name, price, summary, description)
    values (v_name, v_price, coalesce(p ->> 'summary', ''), v_desc)
    returning * into v_row;
  else
    -- Price changes never touch existing bookings: they keep their snapshot (US-0).
    update public.packages
       set name = v_name, price = v_price, summary = coalesce(p ->> 'summary', summary), description = v_desc
     where id = v_id
    returning * into v_row;
  end if;
  return public.package_row(v_row);
end;
$$;

create function public.archive_package(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  update public.packages set is_active = false, archived_at = now() where id = p_id;
  if not found then perform public.raise_code('not_found', 'Package not found.'); end if;
end;
$$;

create function public.restore_package(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_name text;
begin
  perform public.require_admin();
  select name into v_name from public.packages where id = p_id;
  if v_name is null then perform public.raise_code('not_found', 'Package not found.'); end if;
  if exists (select 1 from public.packages o where o.is_active and lower(o.name) = lower(v_name)) then
    perform public.raise_code('duplicate', 'An active package already has this name.');
  end if;
  update public.packages set is_active = true, archived_at = null where id = p_id;
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.my_profile()', 'public.update_display_name(text)', 'public.mark_password_changed()',
    'public.get_settings()', 'public.update_business(jsonb)', 'public.package_row(public.packages)',
    'public.list_packages(text, text)', 'public.save_package(jsonb)', 'public.archive_package(uuid)', 'public.restore_package(uuid)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

grant execute on function public.my_profile() to authenticated;
grant execute on function public.update_display_name(text) to authenticated;
grant execute on function public.mark_password_changed() to authenticated;
grant execute on function public.get_settings() to authenticated;
grant execute on function public.update_business(jsonb) to authenticated;
grant execute on function public.package_row(public.packages) to authenticated;
grant execute on function public.list_packages(text, text) to authenticated;
grant execute on function public.save_package(jsonb) to authenticated;
grant execute on function public.archive_package(uuid) to authenticated;
grant execute on function public.restore_package(uuid) to authenticated;
