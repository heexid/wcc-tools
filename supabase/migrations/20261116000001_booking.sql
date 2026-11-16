-- 001 · Booking module schema (PRODUCTION-PLAN P1).
-- Source of truth for rules: context/PRD.md §2.4 (rules 1–14), §2.5 (status), §4.2 (data model).
-- Derived columns (bookings.total / total_paid / status) are maintained here and never trusted from a client.
--
-- Length limits are only the ones the prototype / PRD enforce; caps on free text are a P10 decision.
--
-- Error convention: every guard raises SQLSTATE P0001 with MESSAGE = a stable code (e.g. 'append_only') and
-- DETAIL = human text. P2's RPCs reuse the same codes, mapped 1:1 to the prototype's error unions.

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

-- ─── Counters (rule 5) ──────────────────────────────────────────────────────────────────────────
-- One row per year; the UPDATE takes a row lock, so concurrent callers serialise and never share a number.
create table public.invoice_counters (
  year int primary key check (year between 2000 and 9999),
  last_value int not null default 0 check (last_value >= 0)
);

create table public.booking_counters (
  year int primary key check (year between 2000 and 9999),
  last_value int not null default 0 check (last_value >= 0)
);

create function public.next_booking_ref(p_year int)
returns text
language sql
set search_path = ''
as $$
  insert into public.booking_counters as c (year, last_value) values (p_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning 'BK-' || p_year || '-' || lpad(last_value::text, 4, '0');
$$;

create function public.next_invoice_number(p_year int)
returns text
language sql
set search_path = ''
as $$
  insert into public.invoice_counters as c (year, last_value) values (p_year, 1)
  on conflict (year) do update set last_value = c.last_value + 1
  returning 'INV-' || p_year || '-' || lpad(last_value::text, 4, '0');
$$;

-- ─── People ─────────────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 50 and display_name = btrim(display_name)),
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  password_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.crew (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null check (btrim(name) <> ''),
  role text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── Packages (US-0) ────────────────────────────────────────────────────────────────────────────
create table public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> '' and name = btrim(name)),
  price bigint not null check (price >= 0),                                   -- rule 1, rule 9
  summary text not null default '',                                           -- list row / picker line
  description text not null default '' check (char_length(description) <= 1000),
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint packages_archived_consistent check (is_active = (archived_at is null))
);
-- Duplicate check is case-insensitive and only among active packages (prototype packageErrors → "duplicate").
create unique index packages_active_name_key on public.packages (lower(name)) where is_active;

-- ─── Workspace settings (US-14 business information; bank / terms defaults per D4) ───────────────
-- One row per workspace. Not part of any frozen invoice figure: the PDF reads the business block live.
create table public.workspace_settings (
  workspace_id uuid primary key,
  business_name text not null check (char_length(business_name) between 2 and 60 and business_name = btrim(business_name)),
  business_address text not null check (char_length(btrim(business_address)) between 1 and 150),
  business_email text not null check (business_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
  business_phone text not null check (
    business_phone ~ '^\+?[0-9 ()-]+$'
    and char_length(regexp_replace(business_phone, '\D', '', 'g')) between 8 and 15
  ),
  business_logo_path text,
  default_terms text not null default '' check (char_length(default_terms) <= 255),
  default_payment jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ─── Bookings ───────────────────────────────────────────────────────────────────────────────────
-- Shape of a payment instruction (Figma lane I, app/src/lib/booking/payment.ts PAYMENT_LIMITS).
create function public.is_payment_instruction(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- coalesce: a missing key makes the expression NULL, and a CHECK treats NULL as a pass.
  select coalesce(
         jsonb_typeof(p) = 'object'
     and jsonb_typeof(p -> 'receiptName') = 'string'
     and jsonb_typeof(p -> 'accountNumber') = 'string'
     and jsonb_typeof(p -> 'accountName') = 'string'
     and char_length(btrim(p ->> 'receiptName')) between 1 and 60
     and (p ->> 'accountNumber') ~ '^[0-9]{5,20}$'
     and char_length(btrim(p ->> 'accountName')) between 1 and 80,
         false)
$$;

alter table public.workspace_settings
  add constraint workspace_settings_default_payment_shape
  check (default_payment is null or public.is_payment_instruction(default_payment));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (ref ~ '^BK-[0-9]{4}-[0-9]{4,}$'),           -- assigned by trigger when omitted
  booking_name text not null default '',
  client_name text not null check (char_length(client_name) between 2 and 80 and client_name = btrim(client_name)),
  client_phone text not null check (client_phone ~ '^\+62[1-9][0-9]{8,14}$'), -- normalizePhone() output
  package_id uuid not null references public.packages (id),
  package_name_snapshot text not null,
  package_price_snapshot bigint not null check (package_price_snapshot >= 0),
  booking_date date not null,
  terms text not null default '' check (char_length(terms) <= 255),
  payment_instruction jsonb not null check (public.is_payment_instruction(payment_instruction)),
  -- Derived (rule 2, §2.5) — written only by bookings_derive().
  total bigint not null default 0 check (total >= 0),
  total_paid bigint not null default 0 check (total_paid >= 0),
  status text not null default 'draft' check (status in ('draft', 'partially_paid', 'paid', 'canceled')),
  -- Cancel (US-12, rule 12)
  canceled_at timestamptz,
  canceled_by uuid references public.profiles (id) on delete set null,
  cancel_reason text check (char_length(cancel_reason) <= 255),
  -- Who: an id, so the display name resolves at read time (PLAN §8b). Null for seed rows until P4 adds users.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_total_covers_paid check (total_paid <= total),         -- rule 10 backstop
  constraint bookings_canceled_consistent check ((status = 'canceled') = (canceled_at is not null))
);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  price bigint not null check (price >= 0),                                   -- rule 9
  qty int not null check (qty between 1 and 999),                             -- rule 9
  position int not null default 0 check (position >= 0)
);

create table public.booking_crew (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  crew_id uuid not null references public.crew (id),
  position int not null default 0 check (position >= 0),   -- the order crew were picked (prototype crewIds)
  primary key (booking_id, crew_id)
);

-- ─── Invoices (rules 3–8) ───────────────────────────────────────────────────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  number text not null unique check (number ~ '^INV-[0-9]{4}-[0-9]{4,}$'),
  type text not null check (type in ('dp', 'full', 'partial', 'paid')),
  dp_method text check (dp_method in ('percentage', 'fixed')),
  dp_percentage numeric(5, 2) check (dp_percentage > 0 and dp_percentage <= 100),
  amount bigint not null check (amount > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  snapshot_hash text not null check (snapshot_hash ~ '^[0-9a-f]{64}$'),       -- sha256 hex of the canonical snapshot
  pdf_path text,
  voided_at timestamptz,                                                      -- v1.1; nothing sets it in v1
  void_reason text check (char_length(void_reason) <= 255),
  issued_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invoices_dp_method_only_on_dp check ((type = 'dp') = (dp_method is not null)),
  constraint invoices_dp_percentage_only_on_pct check (
    case when dp_method = 'percentage' then dp_percentage is not null else dp_percentage is null end
  )
);

-- ─── Indexes (PRD §4.2) ─────────────────────────────────────────────────────────────────────────
create index bookings_booking_date_idx on public.bookings (booking_date);
create index bookings_status_idx on public.bookings (status);
create index bookings_package_id_idx on public.bookings (package_id);
create index booking_items_booking_id_idx on public.booking_items (booking_id, position);
create index booking_crew_crew_id_idx on public.booking_crew (crew_id);
create index invoices_booking_id_issued_idx on public.invoices (booking_id, issued_at desc);
create index bookings_client_name_trgm on public.bookings using gin (client_name extensions.gin_trgm_ops);
create index bookings_booking_name_trgm on public.bookings using gin (booking_name extensions.gin_trgm_ops);
create index bookings_client_phone_trgm on public.bookings using gin (client_phone extensions.gin_trgm_ops);

-- ─── Triggers ───────────────────────────────────────────────────────────────────────────────────
create function public.raise_code(p_code text, p_detail text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_code, detail = p_detail;
end;
$$;

-- updated_at for plain tables.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger packages_touch before update on public.packages for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger workspace_settings_touch before update on public.workspace_settings for each row execute function public.touch_updated_at();

-- Bookings: assign ref, recompute every derived column from the child rows, guard the cancel state.
-- Runs on every insert and update, so a client-supplied total / total_paid / status is always overwritten.
create function public.bookings_derive()
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
    new.ref := public.next_booking_ref(extract(year from coalesce(new.created_at, now()) at time zone 'Asia/Jakarta')::int);
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

create trigger bookings_derive before insert or update on public.bookings
  for each row execute function public.bookings_derive();

-- Child rows → re-run bookings_derive() on the parent(s). A no-op SET fires the BEFORE UPDATE trigger.
create function public.bookings_recompute_from_child()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    update public.bookings set total = total where id = new.booking_id;
  end if;
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.booking_id is distinct from new.booking_id) then
    update public.bookings set total = total where id = old.booking_id;
  end if;
  return null;
end;
$$;

create trigger booking_items_recompute after insert or update or delete on public.booking_items
  for each row execute function public.bookings_recompute_from_child();

-- Only what changes a booking's derived fields: a PDF path (the one updatable column) recomputes nothing.
create trigger invoices_recompute after insert or update of amount, voided_at, booking_id on public.invoices
  for each row execute function public.bookings_recompute_from_child();

-- No booking is ever deleted (US-12: "There's no delete").
create function public.bookings_no_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.raise_code('no_delete', 'Bookings are never deleted; cancel instead.');
  return null;
end;
$$;

create trigger bookings_no_delete before delete on public.bookings
  for each row execute function public.bookings_no_delete();

-- Invoices are append-only (rules 3, 4): no delete, no truncate, and the only updatable column is pdf_path.
create function public.invoices_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'pdf_path') = (to_jsonb(old) - 'pdf_path') then
    return new;
  end if;
  perform public.raise_code('append_only', 'Invoices are append-only; only pdf_path may change.');
  return null;
end;
$$;

create trigger invoices_append_only before update or delete on public.invoices
  for each row execute function public.invoices_append_only();

create trigger invoices_no_truncate before truncate on public.invoices
  for each statement execute function public.invoices_append_only();

-- No new invoice on a canceled booking (rule 12). The amount rules (rule 8) live in create_invoice (P2);
-- overpayment is also caught by bookings_total_covers_paid.
create function public.invoices_booking_open()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- FOR UPDATE: wait for a concurrent cancel to commit and read its result, instead of racing it.
  if exists (select 1 from public.bookings b where b.id = new.booking_id and b.canceled_at is not null for update) then
    perform public.raise_code('canceled', 'A canceled booking takes no new invoices (rule 12).');
  end if;
  return new;
end;
$$;

create trigger invoices_booking_open before insert on public.invoices
  for each row execute function public.invoices_booking_open();

-- ─── Row level security ─────────────────────────────────────────────────────────────────────────
-- On for every table with no policies: anon and authenticated get nothing until P4 / P10 add the
-- role matrix. The service role (server only) bypasses RLS. Nothing is exposed through the API meanwhile.
alter table public.invoice_counters enable row level security;
alter table public.booking_counters enable row level security;
alter table public.profiles enable row level security;
alter table public.crew enable row level security;
alter table public.packages enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_crew enable row level security;
alter table public.invoices enable row level security;

-- Counter functions are for the RPCs (P2), not for API callers.
-- Supabase grants anon / authenticated EXECUTE on public functions by default, so revoke from them explicitly.
revoke execute on function public.next_booking_ref(int) from public, anon, authenticated;
revoke execute on function public.next_invoice_number(int) from public, anon, authenticated;
