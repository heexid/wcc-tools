-- 016 · Workspaces, phase SD1: tables and keys (context/SHARED-DATABASE-PLAN.md §3 items 1–3, 8).
-- Every business row belongs to one workspace, and the keys make it impossible to point at another workspace's row.
-- The rows that exist today go to one workspace: the one of the only workspace_settings row.
--
-- NOT ENOUGH FOR A SECOND CUSTOMER: reads and functions are not limited to a workspace until SD2 (migration 017+).
-- Until then rows get the only workspace through only_workspace(); with a second workspace that default is null and
-- every write that doesn't name its workspace fails, instead of landing in the wrong one.

-- ─── Workspaces ─────────────────────────────────────────────────────────────────────────────────
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 40),
  name text not null check (char_length(name) between 2 and 60 and name = btrim(name)),   -- the developer's label
  status text not null default 'active' check (status in ('active', 'read_only', 'closed')),
  paid_until date,
  created_at timestamptz not null default now()
);
alter table public.workspaces enable row level security; -- no policies and no grants: not readable through the API

do $$
declare v_n int;
begin
  select count(*) into v_n from public.workspace_settings;
  if v_n > 1 then
    raise exception 'Expected one workspace_settings row, found %. Decide which rows belong to which workspace first.', v_n;
  elsif v_n = 1 then
    insert into public.workspaces (id, slug, name) select workspace_id, 'main', business_name from public.workspace_settings;
  elsif exists (select 1 from public.profiles) or exists (select 1 from public.crew)
     or exists (select 1 from public.packages) or exists (select 1 from public.bookings)
     or exists (select 1 from public.booking_counters) or exists (select 1 from public.invoice_counters) then
    raise exception 'There is data but no workspace_settings row. Add it first.';
  end if; -- an empty database: the setup or seed script adds the workspace
end $$;

alter table public.workspace_settings
  add constraint workspace_settings_workspace_fk foreign key (workspace_id) references public.workspaces (id);

-- The only workspace, or null when there are none or several. Temporary: SD2 removes it.
create function public.only_workspace()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when count(*) = 1 then (array_agg(w.id))[1] end from public.workspaces w;
$$;
revoke execute on function public.only_workspace() from public, anon, authenticated;

-- ─── workspace_id on every business table ───────────────────────────────────────────────────────
-- Added as a constant default, never by UPDATE: the invoice append-only trigger would block it and bookings would
-- get a new updated_at (their edit version).
do $$
declare
  t text;
  v_ws uuid := public.only_workspace();
begin
  foreach t in array array['profiles', 'crew', 'packages', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'booking_counters', 'invoice_counters'] loop
    execute format('alter table public.%I add column workspace_id uuid not null %s', t, case when v_ws is null then '' else format('default %L::uuid', v_ws) end);
    execute format('alter table public.%I alter column workspace_id set default public.only_workspace()', t);
    execute format('alter table public.%I add constraint %I foreign key (workspace_id) references public.workspaces (id)', t, t || '_workspace_fk');
  end loop;
end $$;

-- It never changes.
create function public.workspace_id_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from old.workspace_id then
    perform public.raise_code('immutable', 'A row never moves to another workspace.');
  end if;
  return new;
end;
$$;
revoke execute on function public.workspace_id_immutable() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'crew', 'packages', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'booking_counters', 'invoice_counters', 'workspace_settings'] loop
    execute format('create trigger %I before update of workspace_id on public.%I for each row execute function public.workspace_id_immutable()', t || '_workspace_immutable', t);
  end loop;
end $$;

-- ─── Unique per workspace (the names stay: save_package knows its duplicate error by name) ──────
alter table public.bookings drop constraint bookings_ref_key, add constraint bookings_ref_key unique (workspace_id, ref);
alter table public.invoices drop constraint invoices_number_key, add constraint invoices_number_key unique (workspace_id, number);
drop index public.packages_active_name_key;
create unique index packages_active_name_key on public.packages (workspace_id, lower(name)) where is_active;
alter table public.booking_counters drop constraint booking_counters_pkey, add constraint booking_counters_pkey primary key (workspace_id, year);
alter table public.invoice_counters drop constraint invoice_counters_pkey, add constraint invoice_counters_pkey primary key (workspace_id, year);

-- ─── Keys between tables carry the workspace ────────────────────────────────────────────────────
alter table public.profiles add constraint profiles_workspace_id_key unique (workspace_id, id);
alter table public.crew add constraint crew_workspace_id_key unique (workspace_id, id);
alter table public.packages add constraint packages_workspace_id_key unique (workspace_id, id);
alter table public.bookings add constraint bookings_workspace_id_key unique (workspace_id, id);

alter table public.crew
  drop constraint crew_user_id_fkey,
  add constraint crew_user_id_fkey foreign key (workspace_id, user_id) references public.profiles (workspace_id, id) on delete set null (user_id);
alter table public.bookings
  drop constraint bookings_package_id_fkey,
  drop constraint bookings_created_by_fkey,
  drop constraint bookings_canceled_by_fkey,
  add constraint bookings_package_id_fkey foreign key (workspace_id, package_id) references public.packages (workspace_id, id),
  add constraint bookings_created_by_fkey foreign key (workspace_id, created_by) references public.profiles (workspace_id, id) on delete set null (created_by),
  add constraint bookings_canceled_by_fkey foreign key (workspace_id, canceled_by) references public.profiles (workspace_id, id) on delete set null (canceled_by);
alter table public.booking_items
  drop constraint booking_items_booking_id_fkey,
  add constraint booking_items_booking_id_fkey foreign key (workspace_id, booking_id) references public.bookings (workspace_id, id) on delete cascade;
alter table public.booking_crew
  drop constraint booking_crew_booking_id_fkey,
  drop constraint booking_crew_crew_id_fkey,
  add constraint booking_crew_booking_id_fkey foreign key (workspace_id, booking_id) references public.bookings (workspace_id, id) on delete cascade,
  add constraint booking_crew_crew_id_fkey foreign key (workspace_id, crew_id) references public.crew (workspace_id, id);
alter table public.invoices
  drop constraint invoices_booking_id_fkey,
  drop constraint invoices_created_by_fkey,
  add constraint invoices_booking_id_fkey foreign key (workspace_id, booking_id) references public.bookings (workspace_id, id) on delete restrict,
  add constraint invoices_created_by_fkey foreign key (workspace_id, created_by) references public.profiles (workspace_id, id) on delete set null (created_by);
alter table public.workspace_settings
  drop constraint workspace_settings_updated_by_fkey,
  add constraint workspace_settings_updated_by_fkey foreign key (workspace_id, updated_by) references public.profiles (workspace_id, id) on delete set null (updated_by);

-- ─── Numbering per workspace ────────────────────────────────────────────────────────────────────
create function public.next_booking_ref(p_workspace uuid, p_year int)
returns text
language sql
set search_path = ''
as $$
  insert into public.booking_counters as c (workspace_id, year, last_value) values (p_workspace, p_year, 1)
  on conflict (workspace_id, year) do update set last_value = c.last_value + 1
  returning 'BK-' || p_year || '-' || lpad(last_value::text, 4, '0');
$$;

create function public.next_invoice_number(p_workspace uuid, p_year int)
returns text
language sql
set search_path = ''
as $$
  insert into public.invoice_counters as c (workspace_id, year, last_value) values (p_workspace, p_year, 1)
  on conflict (workspace_id, year) do update set last_value = c.last_value + 1
  returning 'INV-' || p_year || '-' || lpad(last_value::text, 4, '0');
$$;

-- Same signatures as before, for the callers SD2 rewrites.
create or replace function public.next_booking_ref(p_year int)
returns text language sql set search_path = ''
as $$ select public.next_booking_ref(public.only_workspace(), p_year); $$;
create or replace function public.next_invoice_number(p_year int)
returns text language sql set search_path = ''
as $$ select public.next_invoice_number(public.only_workspace(), p_year); $$;

revoke execute on function public.next_booking_ref(uuid, int), public.next_invoice_number(uuid, int),
  public.next_booking_ref(int), public.next_invoice_number(int) from public, anon, authenticated;

-- bookings_derive as in 001; only the ref now comes from the booking's own workspace.
create or replace function public.bookings_derive()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_items bigint;
  v_paid bigint;
  v_count int;
begin
  if tg_op = 'INSERT' and new.ref is null then
    new.ref := public.next_booking_ref(new.workspace_id, extract(year from coalesce(new.created_at, now()) at time zone 'Asia/Jakarta')::int);
  end if;

  if tg_op = 'UPDATE' then
    if new.ref is distinct from old.ref then
      perform public.raise_code('immutable', 'A booking ref never changes.');
    end if;
    if old.canceled_at is not null and new.canceled_at is distinct from old.canceled_at then
      perform public.raise_code('canceled', 'Canceled is terminal (rule 12).');
    end if;
  end if;

  select coalesce(sum(i.price * i.qty), 0) into v_items from public.booking_items i where i.booking_id = new.id;
  select coalesce(sum(v.amount), 0), count(*) into v_paid, v_count
    from public.invoices v where v.booking_id = new.id and v.voided_at is null;

  new.total := new.package_price_snapshot + v_items;
  new.total_paid := v_paid;
  new.status := case
    when new.canceled_at is not null then 'canceled'
    when v_count = 0 then 'draft'
    when v_paid < new.total then 'partially_paid'
    else 'paid'
  end;

  -- updated_at moves only when a stored (non-derived) field changes: a recompute alone is not an edit.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - array['total', 'total_paid', 'status', 'updated_at'])
         is distinct from (to_jsonb(old) - array['total', 'total_paid', 'status', 'updated_at']) then
    -- The optimistic-concurrency version (P7): real time (not the transaction start), and strictly after the
    -- previous version at the millisecond precision it is compared at (iso_utc).
    new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 millisecond');
  end if;
  return new;
end;
$$;

-- ensure_crew_entry as in 014; the entry is in the account's workspace, and only an entry there can be linked.
create or replace function public.ensure_crew_entry(p_user uuid)
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
     and c.workspace_id = v_profile.workspace_id
     and c.id::text = lower((select u.raw_app_meta_data ->> 'crew_id' from auth.users u where u.id = p_user));
  if not found then
    insert into public.crew (workspace_id, user_id, name, is_active) values (v_profile.workspace_id, p_user, v_profile.display_name, v_profile.active);
  end if;
end;
$$;

-- Workspace-first lookups.
create index bookings_workspace_date_idx on public.bookings (workspace_id, booking_date);
create index booking_crew_workspace_crew_idx on public.booking_crew (workspace_id, crew_id);

-- ─── Accounts ───────────────────────────────────────────────────────────────────────────────────
-- Every account with a profile, active or not. Its role doesn't change, so today's role trigger ignores it and
-- nobody is reactivated (plan §6 step 5).
update auth.users u
   set raw_app_meta_data = u.raw_app_meta_data || jsonb_build_object('workspace_id', p.workspace_id)
  from public.profiles p
 where p.id = u.id;
