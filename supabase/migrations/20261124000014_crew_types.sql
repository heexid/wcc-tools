-- 014 · Crew types (context/CREW-TYPE-PLAN.md). Account types are `admin` (full access) and `crew` (read-only);
-- `viewer` is gone. Every account has one linked crew entry, so admins can be assigned to bookings and filtered.
-- crew.role stays a JOB TITLE ("Videographer"); profiles.role is the account type.
--
-- BEFORE RUNNING ON A LIVE DATABASE: every ACTIVE viewer becomes an ADMIN. List them first and revoke any that
-- should not:
--   select u.email, p.display_name from public.profiles p join auth.users u on u.id = p.id
--    where p.role = 'viewer' and p.active;

alter table public.profiles drop constraint profiles_role_check;
create unique index crew_user_id_key on public.crew (user_id) where user_id is not null;

-- ─── Provisioning: app_metadata.role is 'admin' | 'crew'; anything else is no access ────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
  v_name text := left(btrim(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1))), 50);
begin
  if v_role is null or v_role not in ('admin', 'crew') then
    return new; -- not provisioned by an admin: no profile, no access
  end if;
  if char_length(v_name) < 2 then v_name := 'User'; end if;
  insert into public.profiles (id, display_name, role, password_changed_at)
  values (new.id, v_name, v_role, now())
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_user_role_change()
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
  if v_role in ('admin', 'crew') then
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

-- ─── Convert viewers ────────────────────────────────────────────────────────────────────────────
-- Inactive accounts keep their metadata, so the role trigger can't reactivate them.
update auth.users u
   set raw_app_meta_data = u.raw_app_meta_data || '{"role":"admin"}'
  from public.profiles p
 where p.id = u.id and p.role = 'viewer' and p.active and u.raw_app_meta_data ->> 'role' = 'viewer';
update public.profiles set role = case when active then 'admin' else 'crew' end where role = 'viewer';

alter table public.profiles alter column role set default 'crew';
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'crew'));

-- ─── One crew entry per account ─────────────────────────────────────────────────────────────────
-- Link the entry named by app_metadata.crew_id when it is free (it keeps its name and job title), else add one.
-- Never matched by name: two people can share one.
create function public.ensure_crew_entry(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if exists (select 1 from public.crew c where c.user_id = p_user) then return; end if;
  select * into v_profile from public.profiles p where p.id = p_user;
  if v_profile.id is null then return; end if;

  update public.crew c set user_id = p_user, is_active = v_profile.active
   where c.user_id is null
     and c.id::text = lower((select u.raw_app_meta_data ->> 'crew_id' from auth.users u where u.id = p_user));
  if not found then
    insert into public.crew (user_id, name, is_active) values (p_user, v_profile.display_name, v_profile.active);
  end if;
end;
$$;

create function public.profiles_sync_crew()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- The FK clears user_id next; past bookings keep the person, new ones can't pick them.
    update public.crew set is_active = false where user_id = old.id;
    return old;
  end if;
  if tg_op = 'INSERT' then
    perform public.ensure_crew_entry(new.id);
    return null;
  end if;
  if new.active and not old.active then
    perform public.ensure_crew_entry(new.id); -- restored account whose entry never existed
  end if;
  if new.display_name is distinct from old.display_name then
    update public.crew set name = new.display_name where user_id = new.id;
  end if;
  if new.active is distinct from old.active then
    update public.crew set is_active = new.active where user_id = new.id;
  end if;
  return null;
end;
$$;

revoke execute on function public.ensure_crew_entry(uuid), public.profiles_sync_crew() from public, anon, authenticated;

create trigger profiles_sync_crew after insert or update of display_name, active on public.profiles
  for each row execute function public.profiles_sync_crew();
create trigger profiles_sync_crew_delete before delete on public.profiles
  for each row execute function public.profiles_sync_crew();

-- Backfill: active accounts only.
do $$
declare r record;
begin
  for r in select p.id from public.profiles p where p.active order by p.created_at, p.id loop
    perform public.ensure_crew_entry(r.id);
  end loop;
end $$;
