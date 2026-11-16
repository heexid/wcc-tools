-- 008 · P4 review fixes.
--  (a) A role changed AFTER the account exists (admin API updateUserById → app_metadata.role) now reaches the
--      profile. Removing the role revokes access via `active = false` — the profile row stays, so "Created by"
--      on that person's bookings and invoices keeps resolving.
--  (b) RLS policies call is_staff() through a sub-select, so Postgres evaluates it once per query (initPlan),
--      not once per row.

alter table public.profiles add column active boolean not null default true;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_fresh() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.session_fresh() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role = 'admin');
$$;

create function public.handle_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
  v_name text := left(btrim(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1))), 50);
begin
  if (new.raw_app_meta_data ->> 'role') is not distinct from (old.raw_app_meta_data ->> 'role') then
    return new;
  end if;
  if v_role in ('admin', 'viewer') then
    if char_length(v_name) < 2 then v_name := 'User'; end if;
    insert into public.profiles (id, display_name, role, password_changed_at)
    values (new.id, v_name, v_role, now())
    on conflict (id) do update set role = excluded.role, active = true;
  else
    update public.profiles set active = false where id = new.id; -- access revoked; history keeps the name
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_user_role_change() from public, anon, authenticated;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row execute function public.handle_user_role_change();

do $$
declare t text;
begin
  foreach t in array array['packages', 'crew', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'profiles'] loop
    execute format('drop policy staff_read on public.%I', t);
    execute format('create policy staff_read on public.%I for select to authenticated using ((select public.is_staff()))', t);
  end loop;
end $$;
