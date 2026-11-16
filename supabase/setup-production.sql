-- bs.moment Booking — one-time setup for a NEW hosted Supabase project.
-- Paste the whole file into Supabase → SQL Editor → Run. Generated from supabase/migrations (do not edit by hand).

-- ═══ 20261116000001_booking.sql ═══
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

-- ═══ 20261116000002_rpcs.sql ═══
-- 002 · Write RPCs (PRODUCTION-PLAN P2): save_booking, create_invoice, save_booking_and_create_invoice,
-- cancel_booking. Ports of the prototype's repo.ts (validateBookingInput, saveBookingTx,
-- saveBookingAndCreateInvoice, cancelBooking) and calc.ts (validateInvoice, dpAmount), rule for rule.
--
-- Errors: SQLSTATE P0001, MESSAGE = the prototype's code, unchanged:
--   save_booking        → 'booking_invalid' with DETAIL = BookingErrors JSON ({"clientName":"length", …,
--                         "items":{"0":{"qty":"invalid"}}, "minimumTotal":n}), or 'not_found'
--   create_invoice      → an InvoiceError ('dp_zero', 'booking_paid', …) or 'not_found'
--   cancel_booking      → 'not_found' | 'not_allowed' | 'reason_too_long'
--   every RPC           → 'forbidden' when the caller is not an admin (viewer, anon)
-- PostgREST returns MESSAGE as `message` and DETAIL as `details`; the P3 mapper reads both.
--
-- SECURITY DEFINER: the tables have RLS on with no write policies, so these functions are the only write
-- path. Each one checks the caller's role first and pins search_path to ''.

-- ─── Helpers ────────────────────────────────────────────────────────────────────────────────────

-- Admin = a profile with role 'admin' for the JWT subject (auth.uid()).
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create function public.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    perform public.raise_code('forbidden', 'Only an admin can change bookings or invoices.');
  end if;
end;
$$;

-- "Today" and the numbering year follow the studio's clock (the prototype's today() is local time).
create function public.studio_year()
returns int
language sql
stable
set search_path = ''
as $$
  select extract(year from now() at time zone 'Asia/Jakarta')::int;
$$;

-- JS Date#toISOString() format, so snapshots look exactly like the prototype's.
create function public.iso_utc(t timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- Canonical JSON = the prototype's stableStringify(): object keys sorted, no whitespace. jsonb::text sorts
-- keys by length first and adds spaces, so it cannot be hashed directly. Keys are ASCII, where Postgres "C"
-- order equals JS's UTF-16 order.
create function public.canonical_json(v jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text := jsonb_typeof(v);
  out text;
begin
  if t = 'object' then
    select '{' || coalesce(string_agg(to_jsonb(k)::text || ':' || public.canonical_json(v -> k), ',' order by k collate "C"), '') || '}'
      into out from jsonb_object_keys(v) k;
    return out;
  elsif t = 'array' then
    select '[' || coalesce(string_agg(public.canonical_json(e), ',' order by i), '') || ']'
      into out from jsonb_array_elements(v) with ordinality as a(e, i);
    return out;
  end if;
  return v::text; -- string / number / boolean / null are already canonical
end;
$$;

create function public.snapshot_hash(v jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(public.canonical_json(v), 'UTF8')), 'hex');
$$;

-- normalizePhone() (app/src/lib/format.ts): national number after +62 / 62 / 0, 9–15 digits → +62…
create function public.normalize_phone(p_input text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  d text := regexp_replace(coalesce(p_input, ''), '[^0-9+]', '', 'g');
begin
  if d like '+62%' then d := substr(d, 4);
  elsif d like '62%' then d := substr(d, 3);
  elsif d like '0%' then d := substr(d, 2);
  end if;
  if d !~ '^[1-9][0-9]{8,14}$' then return null; end if;
  return '+62' || d;
end;
$$;

-- Safe casts: bad input is a validation error, never an unhandled 22P02 / 22008.
create function public.try_uuid(v text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return nullif(v, '')::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create function public.try_date(v text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
begin
  if v !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return v::date;
exception when others then
  return null;
end;
$$;

-- A JSON value that is a JS safe integer ≥ 0 (Number.isSafeInteger(n) && n >= 0).
create function public.json_money(v jsonb)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  n numeric;
begin
  if v is null or jsonb_typeof(v) <> 'number' then return null; end if;
  n := (v #>> '{}')::numeric;
  if n <> trunc(n) or n < 0 or n > 9007199254740991 then return null; end if;
  return n::bigint;
end;
$$;

-- ─── save_booking ───────────────────────────────────────────────────────────────────────────────
-- Validation only — returns the BookingErrors object ({} when valid). Mirrors validateBookingInput() order.
create function public.booking_errors(p jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  e jsonb := '{}';
  v_existing public.bookings;
  v_pkg public.packages;
  v_name text := btrim(coalesce(p ->> 'clientName', ''));
  v_phone text := coalesce(p ->> 'clientPhone', '');
  v_item jsonb;
  v_ie jsonb;
  v_i int := 0;
  v_items_err jsonb := '{}';
  v_items_total bigint := 0;
  v_price bigint;
  v_qty bigint;
  v_total bigint;
  v_pay jsonb := p -> 'paymentInstruction';
begin
  if public.try_uuid(p ->> 'id') is not null then
    select * into v_existing from public.bookings where id = public.try_uuid(p ->> 'id');
  end if;
  if v_existing.canceled_at is not null then e := e || '{"booking":"canceled"}';
  -- P7 optimistic concurrency: the form sends the updatedAt it loaded; someone else saved since → conflict.
  elsif v_existing.id is not null and nullif(p ->> 'expectedUpdatedAt', '') is not null
        and public.iso_utc(v_existing.updated_at) <> p ->> 'expectedUpdatedAt' then
    e := e || '{"booking":"conflict"}';
  end if;

  if v_name = '' then e := e || '{"clientName":"required"}';
  elsif char_length(v_name) < 2 or char_length(v_name) > 80 then e := e || '{"clientName":"length"}';
  end if;

  if btrim(v_phone) = '' then e := e || '{"clientPhone":"required"}';
  elsif public.normalize_phone(v_phone) is null then e := e || '{"clientPhone":"invalid"}';
  end if;

  if public.try_uuid(p ->> 'packageId') is not null then
    select * into v_pkg from public.packages where id = public.try_uuid(p ->> 'packageId');
  end if;
  if v_pkg.id is null then e := e || '{"packageId":"required"}';
  elsif not v_pkg.is_active and v_existing.package_id is distinct from v_pkg.id then
    e := e || '{"packageId":"archived"}'; -- rule 13: a newly picked archived package
  end if;

  if p ->> 'bookingDate' is null or p ->> 'bookingDate' = '' then e := e || '{"bookingDate":"required"}';
  elsif public.try_date(p ->> 'bookingDate') is null then
    e := e || '{"bookingDate":"invalid"}';
  end if;

  if char_length(coalesce(p ->> 'terms', '')) > 255 then e := e || '{"terms":"too_long"}'; end if;

  if v_pay is not null and jsonb_typeof(v_pay) <> 'null' and not public.is_payment_instruction(
       jsonb_build_object('receiptName', btrim(coalesce(v_pay ->> 'receiptName', '')),
                          'accountNumber', coalesce(v_pay ->> 'accountNumber', ''),
                          'accountName', btrim(coalesce(v_pay ->> 'accountName', '')))) then
    e := e || '{"paymentInstruction":"invalid"}';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p -> 'items', '[]')) loop
    v_ie := '{}';
    if btrim(coalesce(v_item ->> 'name', '')) = '' then v_ie := v_ie || '{"name":"required"}'; end if;
    if v_item -> 'price' is null or jsonb_typeof(v_item -> 'price') = 'null' then v_ie := v_ie || '{"price":"required"}';
    else
      v_price := public.json_money(v_item -> 'price');
      if v_price is null then v_ie := v_ie || '{"price":"invalid"}'; end if;
    end if;
    if v_item -> 'qty' is null or jsonb_typeof(v_item -> 'qty') = 'null' then v_ie := v_ie || '{"qty":"required"}';
    else
      v_qty := public.json_money(v_item -> 'qty');
      if v_qty is null or v_qty < 1 or v_qty > 999 then v_ie := v_ie || '{"qty":"invalid"}'; end if;
    end if;
    if v_ie <> '{}' then v_items_err := v_items_err || jsonb_build_object(v_i::text, v_ie);
    else v_items_total := v_items_total + v_price * v_qty;
    end if;
    v_i := v_i + 1;
  end loop;
  if v_items_err <> '{}' then e := e || jsonb_build_object('items', v_items_err); end if;

  -- Rule 10: an edit may not drop the total below what's paid (checked only when the items are valid).
  if v_existing.id is not null and v_pkg.id is not null and v_items_err = '{}' then
    v_total := case when v_existing.package_id = v_pkg.id then v_existing.package_price_snapshot else v_pkg.price end + v_items_total;
    if v_total < v_existing.total_paid then
      e := e || jsonb_build_object('total', 'below_paid', 'minimumTotal', v_existing.total_paid);
    end if;
  end if;
  return e;
end;
$$;

-- The write half of save_booking (no role check, no validation) — shared with save_booking_and_create_invoice.
create function public.save_booking_tx(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := public.try_uuid(p ->> 'id');
  v_existing public.bookings;
  v_pkg public.packages;
  v_name text := btrim(p ->> 'clientName');
  v_pay jsonb := p -> 'paymentInstruction';
  v_repick boolean;
  v_old_items uuid[];
begin
  select * into v_pkg from public.packages where id = public.try_uuid(p ->> 'packageId');
  if v_id is not null then
    select * into v_existing from public.bookings where id = v_id for update;
    if v_existing.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
    -- Re-check under the row lock: a cancel or save that committed between booking_errors() and this lock.
    if v_existing.canceled_at is not null then
      perform public.raise_code('booking_invalid', '{"booking":"canceled"}');
    end if;
    if nullif(p ->> 'expectedUpdatedAt', '') is not null and public.iso_utc(v_existing.updated_at) <> p ->> 'expectedUpdatedAt' then
      perform public.raise_code('booking_invalid', '{"booking":"conflict"}');
    end if;
  end if;
  v_repick := v_existing.id is null or v_existing.package_id <> v_pkg.id; -- snapshot only on (re)pick (US-0)
  if v_pay is not null and jsonb_typeof(v_pay) <> 'null' then
    v_pay := jsonb_build_object('receiptName', btrim(v_pay ->> 'receiptName'), 'accountNumber', v_pay ->> 'accountNumber', 'accountName', btrim(v_pay ->> 'accountName'));
  else
    v_pay := null;
  end if;

  if v_existing.id is null then
    insert into public.bookings (client_name, client_phone, booking_name, package_id, package_name_snapshot, package_price_snapshot,
                                 booking_date, terms, payment_instruction, created_by)
    values (v_name, public.normalize_phone(p ->> 'clientPhone'),
            coalesce(nullif(btrim(coalesce(p ->> 'bookingName', '')), ''), v_name || ' · ' || v_pkg.name),
            v_pkg.id, v_pkg.name, v_pkg.price, (p ->> 'bookingDate')::date, coalesce(p ->> 'terms', ''),
            coalesce(v_pay, (select s.default_payment from public.workspace_settings s order by s.updated_at desc limit 1)),
            auth.uid())
    returning id into v_id;

    insert into public.booking_items (booking_id, name, price, qty, position)
    select v_id, btrim(it ->> 'name'), (it ->> 'price')::bigint, (it ->> 'qty')::int, (ord - 1)::int
      from jsonb_array_elements(coalesce(p -> 'items', '[]')) with ordinality as x(it, ord);
  else
    -- Order matters: bookings_total_covers_paid is checked after every statement, so the total may never dip
    -- below what's paid on the way. New items first (total only rises), then the booking row (a cheaper
    -- package lowers it), then the old items (down to the final total, which booking_errors() checked).
    select coalesce(array_agg(id), '{}') into v_old_items from public.booking_items where booking_id = v_id;
    insert into public.booking_items (booking_id, name, price, qty, position)
    select v_id, btrim(it ->> 'name'), (it ->> 'price')::bigint, (it ->> 'qty')::int, (ord - 1)::int
      from jsonb_array_elements(coalesce(p -> 'items', '[]')) with ordinality as x(it, ord);

    update public.bookings set
      client_name = v_name,
      client_phone = public.normalize_phone(p ->> 'clientPhone'),
      booking_name = coalesce(nullif(btrim(coalesce(p ->> 'bookingName', '')), ''), v_name || ' · ' || v_pkg.name),
      package_id = v_pkg.id,
      package_name_snapshot = case when v_repick then v_pkg.name else package_name_snapshot end,
      package_price_snapshot = case when v_repick then v_pkg.price else package_price_snapshot end,
      booking_date = (p ->> 'bookingDate')::date,
      terms = coalesce(p ->> 'terms', ''),
      payment_instruction = coalesce(v_pay, payment_instruction),
      -- Every save is a new version, including items- or crew-only edits that change no booking column
      -- (P7 review #1); always ≥ 1 ms past the previous one, the precision versions are compared at (P8 review #10).
      updated_at = greatest(clock_timestamp(), updated_at + interval '1 millisecond')
    where id = v_id;

    delete from public.booking_items where id = any (v_old_items);
  end if;


  -- Replace crew.
  delete from public.booking_crew where booking_id = v_id;
  insert into public.booking_crew (booking_id, crew_id, position)
  select v_id, c.id, (min(x.ord) - 1)::int
    from jsonb_array_elements_text(coalesce(p -> 'crewIds', '[]')) with ordinality as x(cid, ord)
    join public.crew c on c.id::text = x.cid   -- unknown crew ids are dropped, duplicates collapse (prototype)
   group by c.id;

  return v_id;
end;
$$;

create function public.save_booking(payload jsonb)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb;
  v_id uuid;
  v_row public.bookings;
begin
  perform public.require_admin();
  if payload ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(payload ->> 'id')) then
    perform public.raise_code('not_found', 'Booking not found.');
  end if;
  v_errors := public.booking_errors(payload);
  if v_errors <> '{}' then perform public.raise_code('booking_invalid', v_errors::text); end if;
  v_id := public.save_booking_tx(payload);
  select * into v_row from public.bookings where id = v_id;
  return v_row;
end;
$$;

-- ─── create_invoice ─────────────────────────────────────────────────────────────────────────────
-- validateInvoice() + dpAmount() from calc.ts. Returns the authoritative amount or raises the InvoiceError.
create function public.invoice_amount(
  p_total bigint, p_total_paid bigint, p_invoice_count int, p_canceled boolean,
  p_type text, p_dp_method text, p_dp_value numeric, p_amount numeric)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_rem bigint := p_total - p_total_paid;
  v_amount bigint;
begin
  if p_canceled then perform public.raise_code('booking_canceled', 'This booking is canceled.'); end if;
  if p_invoice_count > 0 and v_rem <= 0 then perform public.raise_code('booking_paid', 'Already paid in full.'); end if;
  if not ((p_invoice_count = 0 and p_type in ('dp', 'full')) or (p_invoice_count > 0 and p_type in ('partial', 'paid'))) then
    perform public.raise_code('type_not_allowed', 'First invoice: DP or Full; follow-ups: Partial or Paid.');
  end if;

  case p_type
    when 'dp' then
      if p_dp_method is null or p_dp_value is null then perform public.raise_code('dp_zero', 'Enter a DP.'); end if;
      if p_dp_method = 'percentage' then
        if p_dp_value < 0 or p_dp_value > 100 or p_dp_value * 100 <> trunc(p_dp_value * 100) then
          perform public.raise_code('pct_invalid', 'Enter 0–100%, up to 2 decimals.');
        end if;
        -- Half-up to the Rupiah in integer maths: floor((total × basis points + 5000) / 10000).
        v_amount := floor((p_total * round(p_dp_value * 100) + 5000) / 10000);
      elsif p_dp_method = 'fixed' then
        if p_dp_value < 0 or p_dp_value <> trunc(p_dp_value) or p_dp_value > 9007199254740991 then
          perform public.raise_code('amount_not_positive', 'Enter an amount above Rp 0.');
        end if;
        v_amount := p_dp_value::bigint;
      else
        perform public.raise_code('dp_zero', 'Unknown DP method.');
      end if;
      if v_amount <= 0 then perform public.raise_code('dp_zero', 'Enter a DP above Rp 0.'); end if;
      if v_amount > p_total then perform public.raise_code('dp_exceeds_total', 'DP can''t exceed the booking total.'); end if;
      return v_amount;
    when 'full' then
      if p_total <= 0 then perform public.raise_code('amount_not_positive', 'Enter an amount above Rp 0.'); end if;
      return p_total;
    when 'partial' then
      if p_amount is null or p_amount < 1 or p_amount <> trunc(p_amount) or p_amount > 9007199254740991 then
        perform public.raise_code('amount_not_positive', 'Enter an amount above Rp 0.');
      end if;
      if p_amount >= v_rem then perform public.raise_code('partial_not_less_than_remaining', 'Must be less than remaining.'); end if;
      return p_amount::bigint;
    when 'paid' then
      if p_amount is not null and p_amount <> v_rem then perform public.raise_code('amount_mismatch', 'Paid must equal the remaining.'); end if;
      return v_rem;
  end case;
  perform public.raise_code('type_not_allowed', 'Unknown invoice type.');
  return null;
end;
$$;

-- The write half of create_invoice: lock, validate, number, snapshot, insert. No role check.
create function public.create_invoice_tx(p_booking_id uuid, p_type text, p_dp_method text, p_dp_value numeric, p_amount numeric)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  b public.bookings;
  v_count int;
  v_amount bigint;
  v_number text;
  v_year int := public.studio_year();
  v_now timestamptz := now();
  v_actor text;
  v_snapshot jsonb;
  v_id uuid;
begin
  -- Row lock: a second create_invoice on the same booking waits here, then sees the first one's invoice.
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
  select count(*) into v_count from public.invoices where booking_id = b.id and voided_at is null;

  v_amount := public.invoice_amount(b.total, b.total_paid, v_count, b.canceled_at is not null,
                                    p_type, p_dp_method, p_dp_value, p_amount);

  -- Never reuse a taken number (a seed / import may hold one above the counter).
  loop
    v_number := public.next_invoice_number(v_year);
    exit when not exists (select 1 from public.invoices where number = v_number);
  end loop;

  select coalesce((select display_name from public.profiles where id = auth.uid()), 'System') into v_actor;

  -- Same shape and key names as the prototype's InvoiceSnapshot (app/src/lib/data/types.ts).
  select jsonb_build_object(
      'invoiceNumber', v_number,
      'issuedAt', public.iso_utc(v_now),
      'business', jsonb_build_object('name', s.business_name, 'address', s.business_address, 'phone', s.business_phone, 'email', s.business_email),
      'booking', jsonb_build_object(
        'ref', b.ref,
        'bookingName', b.booking_name,
        'clientName', b.client_name,
        'clientPhone', b.client_phone,
        'bookingDate', to_char(b.booking_date, 'YYYY-MM-DD'),
        'packageName', b.package_name_snapshot,
        'packagePrice', b.package_price_snapshot,
        'packageSummary', coalesce((select pk.summary from public.packages pk where pk.id = b.package_id), ''),
        'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'price', i.price, 'qty', i.qty, 'subtotal', i.price * i.qty) order by i.position)
                             from public.booking_items i where i.booking_id = b.id), '[]'),
        'terms', b.terms,
        'paymentInstruction', b.payment_instruction),
      'total', b.total,
      'type', p_type,
      'dpMethod', case when p_type = 'dp' then p_dp_method end,
      'dpPercentage', case when p_type = 'dp' and p_dp_method = 'percentage' then p_dp_value end,
      'amount', v_amount,
      'paidBefore', b.total_paid,
      'paidAfter', b.total_paid + v_amount,
      'remainingAfter', b.total - b.total_paid - v_amount,
      'createdBy', v_actor)
    into v_snapshot
    from (select 1) one left join lateral (select * from public.workspace_settings order by updated_at desc limit 1) s on true;

  insert into public.invoices (booking_id, number, type, dp_method, dp_percentage, amount, snapshot, snapshot_hash, issued_at, created_by)
  values (b.id, v_number, p_type,
          case when p_type = 'dp' then p_dp_method end,
          case when p_type = 'dp' and p_dp_method = 'percentage' then p_dp_value end,
          v_amount, v_snapshot, public.snapshot_hash(v_snapshot), v_now, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Result for both invoice RPCs: the invoice and the booking after its status was recomputed.
-- VOLATILE on purpose: a STABLE SQL function reads the calling statement's snapshot and would not see
-- the invoice inserted a moment ago.
create function public.invoice_result(p_invoice_id uuid)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object('invoice', to_jsonb(i), 'booking', to_jsonb(b))
    from public.invoices i join public.bookings b on b.id = i.booking_id
   where i.id = p_invoice_id;
$$;

create function public.create_invoice(booking_id uuid, type text, dp_method text default null, dp_value numeric default null, amount numeric default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return public.invoice_result(public.create_invoice_tx(booking_id, type, dp_method, dp_value, amount));
end;
$$;

-- Confirm in the invoice modal for a new or edited booking (PLAN §5): both writes or neither.
create function public.save_booking_and_create_invoice(booking jsonb, invoice jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb;
  v_id uuid;
begin
  perform public.require_admin();
  if booking is not null and jsonb_typeof(booking) <> 'null' then
    if booking ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(booking ->> 'id')) then
      perform public.raise_code('not_found', 'Booking not found.');
    end if;
    v_errors := public.booking_errors(booking);
    if v_errors <> '{}' then perform public.raise_code('booking_invalid', v_errors::text); end if;
    v_id := public.save_booking_tx(booking);
  else
    v_id := public.try_uuid(invoice ->> 'bookingId');
  end if;
  return public.invoice_result(public.create_invoice_tx(
    v_id,
    invoice ->> 'type',
    invoice #>> '{dp,method}',
    case when jsonb_typeof(invoice #> '{dp,value}') = 'number' then (invoice #>> '{dp,value}')::numeric end,
    case when jsonb_typeof(invoice -> 'amount') = 'number' then (invoice ->> 'amount')::numeric end));
end;
$$;

-- ─── cancel_booking (US-12, rule 12) ────────────────────────────────────────────────────────────
create function public.cancel_booking(booking_id uuid, reason text default '')
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  perform public.require_admin();
  select * into b from public.bookings where id = cancel_booking.booking_id for update;
  if b.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
  if b.status not in ('draft', 'partially_paid') then perform public.raise_code('not_allowed', 'Only Draft or Partially paid bookings can be canceled.'); end if;
  if char_length(coalesce(reason, '')) > 255 then perform public.raise_code('reason_too_long', 'Max 255 characters.'); end if;

  update public.bookings
     set canceled_at = now(), canceled_by = auth.uid(), cancel_reason = nullif(btrim(coalesce(reason, '')), '')
   where id = b.id
  returning * into b;
  return b;
end;
$$;

-- ─── Grants ─────────────────────────────────────────────────────────────────────────────────────
-- Only the four RPCs are callable from the API, and only by signed-in users (the role check is inside).
-- Supabase grants anon / authenticated EXECUTE on new public functions by default, so revoke first.
do $$
declare f text;
begin
  foreach f in array array[
    'public.is_admin()', 'public.require_admin()', 'public.studio_year()', 'public.iso_utc(timestamptz)',
    'public.canonical_json(jsonb)', 'public.snapshot_hash(jsonb)', 'public.normalize_phone(text)', 'public.json_money(jsonb)',
    'public.booking_errors(jsonb)', 'public.save_booking_tx(jsonb)',
    'public.invoice_amount(bigint, bigint, int, boolean, text, text, numeric, numeric)',
    'public.create_invoice_tx(uuid, text, text, numeric, numeric)', 'public.invoice_result(uuid)',
    'public.save_booking(jsonb)', 'public.create_invoice(uuid, text, text, numeric, numeric)',
    'public.try_uuid(text)', 'public.try_date(text)',
    'public.save_booking_and_create_invoice(jsonb, jsonb)', 'public.cancel_booking(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

grant execute on function public.save_booking(jsonb) to authenticated;
grant execute on function public.create_invoice(uuid, text, text, numeric, numeric) to authenticated;
grant execute on function public.save_booking_and_create_invoice(jsonb, jsonb) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.is_admin() to authenticated; -- the UI may ask; it reveals only the caller's own role

-- ═══ 20261116000003_reads_packages_profile.sql ═══
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

-- ═══ 20261116000004_booking_reads.sql ═══
-- 004 · Booking reads (P3 contract, P6 tunes them): rows in the prototype's BookingRow / BookingDetail / KPI shapes.
-- Ports of repo.ts toRow, matchesSearch, filterBookings, listBookings, getBooking, computeKpis, getUpcoming,
-- getCrewSchedule, getInvoiceSnapshot. SECURITY INVOKER: the caller's RLS (staff_read) applies.
-- Dates are Asia/Jakarta calendar days; timestamps are JS toISOString() strings (iso_utc).

create function public.staff_name(p_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select display_name from public.profiles where id = p_id), '');
$$;

-- Invoice (types.ts Invoice), newest first in lists (invoicesOf).
create function public.invoice_json(i public.invoices)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'bookingId', i.booking_id, 'number', i.number, 'type', i.type, 'dpMethod', i.dp_method,
    'dpPercentage', i.dp_percentage, 'amount', i.amount, 'issuedAt', public.iso_utc(i.issued_at),
    'snapshot', i.snapshot, 'snapshotHash', i.snapshot_hash, 'pdfPath', i.pdf_path,
    'voidedAt', case when i.voided_at is null then null else public.iso_utc(i.voided_at) end,
    'createdBy', coalesce(nullif(public.staff_name(i.created_by), ''), i.snapshot ->> 'createdBy', ''));
$$;

-- BookingRow = Booking + remaining, latestInvoiceType, invoiceTypes, invoiceCount (repo.ts toRow).
create function public.booking_row(b public.bookings)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with inv as (
    select i.type, i.issued_at from public.invoices i where i.booking_id = b.id and i.voided_at is null
  )
  select jsonb_build_object(
    'id', b.id, 'ref', b.ref, 'bookingName', b.booking_name, 'clientName', b.client_name, 'clientPhone', b.client_phone,
    'packageId', b.package_id, 'packageNameSnapshot', b.package_name_snapshot, 'packagePriceSnapshot', b.package_price_snapshot,
    'bookingDate', to_char(b.booking_date, 'YYYY-MM-DD'), 'terms', b.terms, 'paymentInstruction', b.payment_instruction,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', it.id, 'name', it.name, 'price', it.price, 'qty', it.qty) order by it.position, it.id)
                         from public.booking_items it where it.booking_id = b.id), '[]'),
    'crewIds', coalesce((select jsonb_agg(bc.crew_id order by bc.position, bc.crew_id) from public.booking_crew bc where bc.booking_id = b.id), '[]'),
    'total', b.total, 'totalPaid', b.total_paid, 'status', b.status,
    'canceledAt', case when b.canceled_at is null then null else public.iso_utc(b.canceled_at) end,
    'canceledBy', case when b.canceled_at is null then null else public.staff_name(b.canceled_by) end,
    'cancelReason', b.cancel_reason,
    'createdBy', public.staff_name(b.created_by),
    'createdAt', public.iso_utc(b.created_at), 'updatedAt', public.iso_utc(b.updated_at),
    'remaining', b.total - b.total_paid,
    'latestInvoiceType', (select type from inv order by issued_at desc limit 1),
    -- Set insertion order over newest-first invoices, like [...new Set(inv.map(type))].
    'invoiceTypes', coalesce((select jsonb_agg(t.type order by t.first_seen desc)
                                from (select type, max(issued_at) as first_seen from inv group by type) t), '[]'),
    'invoiceCount', (select count(*)::int from inv));
$$;

-- matchesSearch(): name / client / ref contain the text; 3+ digits also match the phone (+62… or 0…).
create function public.booking_matches(b public.bookings, p_search text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(btrim(p_search), '') = '' then true
    when strpos(lower(b.booking_name), lower(btrim(p_search))) > 0
      or strpos(lower(b.client_name), lower(btrim(p_search))) > 0
      or strpos(lower(b.ref), lower(btrim(p_search))) > 0 then true
    when char_length(regexp_replace(p_search, '\D', '', 'g')) >= 3 then
      strpos(regexp_replace(b.client_phone, '\D', '', 'g'), regexp_replace(p_search, '\D', '', 'g')) > 0
      or strpos('0' || substr(regexp_replace(b.client_phone, '\D', '', 'g'), 3), regexp_replace(p_search, '\D', '', 'g')) > 0
    else false
  end;
$$;

-- filterBookings(q): BookingQuery JSON → ordered BookingRow JSON array (no paging).
create function public.filter_bookings(q jsonb)
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  with f as (
    select b.*,
           b.total - b.total_paid as remaining,
           case b.status when 'draft' then 0 when 'partially_paid' then 1 when 'paid' then 2 else 3 end as status_rank
      from public.bookings b
     where (q ->> 'view' is distinct from 'calendar' or b.status <> 'canceled' or coalesce(q -> 'status', '[]') ? 'canceled')
       and public.booking_matches(b, q ->> 'search')
       and (jsonb_array_length(coalesce(q -> 'status', '[]')) = 0 or coalesce(q -> 'status', '[]') ? b.status)
       and (jsonb_array_length(coalesce(q -> 'crewIds', '[]')) = 0
            or exists (select 1 from public.booking_crew bc where bc.booking_id = b.id and coalesce(q -> 'crewIds', '[]') ? bc.crew_id::text))
       and (jsonb_array_length(coalesce(q -> 'packageIds', '[]')) = 0 or coalesce(q -> 'packageIds', '[]') ? b.package_id::text)
       and (q ->> 'from' is null or b.booking_date >= (q ->> 'from')::date)
       and (q ->> 'to' is null or b.booking_date <= (q ->> 'to')::date)
  ),
  o as (
    select f.*,
           (q -> 'sort' is null and q ->> 'today' is not null) as by_today,
           coalesce(q #>> '{sort,key}', 'bookingDate') as k,
           case when coalesce(q #>> '{sort,dir}', 'asc') = 'asc' then 1 else -1 end as sgn,
           (q ->> 'today')::date as t
      from f
  )
  select public.booking_row(b)
    from o
    join public.bookings b on b.id = o.id
   order by
     -- Table default (no sort): upcoming from today ascending, then the past newest first (PRD US-7).
     case when o.by_today then (o.booking_date < o.t)::int end,
     case when o.by_today and o.booking_date >= o.t then o.booking_date end asc,
     case when o.by_today and o.booking_date < o.t then o.booking_date end desc,
     -- Explicit sort (default bookingDate asc).
     case when not o.by_today and o.k = 'bookingDate' then (o.booking_date - date '2000-01-01') * o.sgn end,
     case when not o.by_today and o.k = 'status' then o.status_rank * o.sgn end,
     case when not o.by_today and o.k = 'total' then o.total * o.sgn end,
     case when not o.by_today and o.k = 'remaining' then o.remaining * o.sgn end,
     o.created_at, o.id;
$$;

create function public.list_all_bookings(q jsonb default '{}')
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(x.r order by x.n), '[]') from public.filter_bookings(coalesce(q, '{}')) with ordinality as x(r, n);
$$;

-- listBookings(q): one page + total / page / pages / pageSize (page clamped to 1…pages).
create function public.list_bookings(q jsonb default '{}')
returns jsonb
language sql
stable
set search_path = ''
as $$
  with all_rows as (select x.r, x.n from public.filter_bookings(coalesce(q, '{}')) with ordinality as x(r, n)),
  meta as (
    select count(*)::int as total,
           coalesce((q ->> 'pageSize')::int, 10) as size
      from all_rows
  ),
  pg as (
    select total, size,
           greatest(1, ceil(total::numeric / size)::int) as pages
      from meta
  ),
  cur as (select pg.*, least(greatest(1, coalesce((q ->> 'page')::int, 1)), pages) as page from pg)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(a.r order by a.n) from all_rows a, cur where a.n > (cur.page - 1) * cur.size and a.n <= cur.page * cur.size), '[]'),
    'total', cur.total, 'page', cur.page, 'pages', cur.pages, 'pageSize', cur.size)
  from cur;
$$;

create function public.count_bookings()
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int from public.bookings;
$$;

-- getBooking(id or ref): BookingRow + invoices (newest first) + crew + package.
create function public.get_booking(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.booking_row(b) || jsonb_build_object(
    'invoices', coalesce((select jsonb_agg(public.invoice_json(i) order by i.issued_at desc) from public.invoices i where i.booking_id = b.id and i.voided_at is null), '[]'),
    'crew', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'role', c.role, 'isActive', c.is_active) order by c.created_at, c.id)
                        from public.crew c where c.id in (select crew_id from public.booking_crew where booking_id = b.id)), '[]'),
    'package', (select public.package_row(p) - 'bookings' from public.packages p where p.id = b.package_id))
  from public.bookings b
  where b.id = public.try_uuid(p_id) or b.ref = p_id
  limit 1;
$$;

-- computeKpis(ym): Canceled excluded from count + outstanding; collected counts every non-void invoice (US-12).
create function public.get_kpis(p_ym text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with m as (
    select p_ym as cur,
           to_char(to_date(p_ym || '-01', 'YYYY-MM-DD') - interval '1 month', 'YYYY-MM') as prev
  ),
  live as (select * from public.bookings where canceled_at is null),
  inv as (select amount, to_char(issued_at at time zone 'Asia/Jakarta', 'YYYY-MM') as ym from public.invoices where voided_at is null)
  select jsonb_build_object(
    'bookingsThisMonth', (select count(*)::int from live, m where to_char(booking_date, 'YYYY-MM') = m.cur),
    'bookingsPrevMonth', (select count(*)::int from live, m where to_char(booking_date, 'YYYY-MM') = m.prev),
    'outstanding', (select coalesce(sum(total - total_paid), 0) from live where status = 'partially_paid'),
    'outstandingCount', (select count(*)::int from live where status = 'partially_paid'),
    'collectedThisMonth', (select coalesce(sum(amount), 0) from inv, m where inv.ym = m.cur),
    'collectedPrevMonth', (select coalesce(sum(amount), 0) from inv, m where inv.ym = m.prev))
  from m;
$$;

-- getCrewSchedule(crewId, today): calendar-visible bookings of one crew member.
create function public.get_crew_schedule(p_crew_id uuid, p_today date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with mine as (
    select x.r, x.n from public.filter_bookings(jsonb_build_object('view', 'calendar', 'crewIds', jsonb_build_array(p_crew_id))) with ordinality as x(r, n)
  )
  select case when c.id is null then null else jsonb_build_object(
    'crew', jsonb_build_object('id', c.id, 'name', c.name, 'role', c.role, 'isActive', c.is_active),
    'monthCount', (select count(*)::int from mine where left(r ->> 'bookingDate', 7) = to_char(p_today, 'YYYY-MM')),
    'upcoming', coalesce((select jsonb_agg(r order by n) from mine where (r ->> 'bookingDate')::date >= p_today), '[]'))
  end
  from (select 1) one left join public.crew c on c.id = p_crew_id;
$$;

create function public.get_invoice_snapshot(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select snapshot from public.invoices where id = public.try_uuid(p_id) or number = p_id limit 1;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.staff_name(uuid)', 'public.invoice_json(public.invoices)', 'public.booking_row(public.bookings)',
    'public.booking_matches(public.bookings, text)', 'public.filter_bookings(jsonb)', 'public.list_all_bookings(jsonb)',
    'public.list_bookings(jsonb)', 'public.count_bookings()', 'public.get_booking(text)', 'public.get_kpis(text)',
    'public.get_crew_schedule(uuid, date)', 'public.get_invoice_snapshot(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
-- try_uuid is used by the invoker reads above.
grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.iso_utc(timestamptz) to authenticated;
grant execute on function public.package_row(public.packages) to authenticated;

-- ═══ 20261116000005_auth_profiles.sql ═══
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

-- ═══ 20261116000006_session_day.sql ═══
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

-- ═══ 20261116000007_booking_read_queries.sql ═══
-- 007 · P6 production read queries (same results as 004 — the read parity proves it):
--   - search is escaped ILIKE inline in WHERE, so the pg_trgm GIN indexes (client_name, booking_name,
--     client_phone, and now ref) can serve it; a literal % or _ in the search still matches literally,
--     like the prototype's String#includes.
--   - ordering / filtering run over ids; the full BookingRow JSON is built only for rows actually returned
--     (one table page, or the calendar's visible range) — P3 review finding #9.
create index bookings_ref_trgm on public.bookings using gin (ref extensions.gin_trgm_ops);

-- A JSON / URL number that may be junk or huge: numeric or null, never an error.
create function public.try_num(v text)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare n numeric;
begin
  if v is null or btrim(v) = '' then return null; end if;
  n := v::numeric;
  if n = 'NaN'::numeric then return null; end if;
  if n = 'Infinity'::numeric then return 9007199254740991; end if;   -- like JS: huge, then clamped
  if n = '-Infinity'::numeric then return -9007199254740991; end if;
  return n;
exception when others then
  return null;
end;
$$;

create function public.like_escape(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(p, '\', '\\'), '%', '\%'), '_', '\_');
$$;

-- matchesSearch() as a candidate set: one ILIKE per indexed column, each served by its own pg_trgm GIN index.
-- EXECUTE plans with the real pattern (a custom plan), so the planner can use the index; an empty search
-- returns nothing and is handled by the caller (the OR with "no search" used to keep any index out).
create function public.search_booking_ids(p_search text)
returns setof uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  s text := btrim(coalesce(p_search, ''));
  d text := regexp_replace(coalesce(p_search, ''), '\D', '', 'g');
  pat text;
begin
  if s = '' then return; end if;
  pat := '%' || public.like_escape(s) || '%';
  return query execute
    'select id from public.bookings where booking_name ilike $1
     union select id from public.bookings where client_name ilike $1
     union select id from public.bookings where ref ilike $1'
    || case when char_length(d) >= 3 then
     ' union select id from public.bookings where client_phone like $2
       union select id from public.bookings where $3 and client_phone like $4' else '' end
    using pat, '%' || d || '%', left(d, 1) = '0', '+62' || substr(d, 2) || '%';
end;
$$;

-- filterBookings(q) → ordered ids. matchesSearch(): name / client / ref contain the text; 3+ digits also match the
-- phone as +62… or in its local 0… form (local "0N" contains d ⇔ +62N contains d, or starts with +62 + d minus its 0).
create function public.ordered_booking_ids(q jsonb)
returns table (id uuid, n bigint)
language sql
stable
set search_path = ''
as $$
  with p as (
    select coalesce(btrim(q ->> 'search'), '') as s,
           regexp_replace(coalesce(q ->> 'search', ''), '\D', '', 'g') as digits,
           coalesce(q -> 'status', '[]') as st,
           coalesce(q -> 'crewIds', '[]') as crew,
           coalesce(q -> 'packageIds', '[]') as pkg,
           q ->> 'from' as d_from,
           q ->> 'to' as d_to,
           public.try_date(q ->> 'from') as from_date,   -- parsed once per query, not per row (P11)
           public.try_date(q ->> 'to') as to_date,
           q ->> 'view' as v,
           (q -> 'sort' is null and q ->> 'today' is not null) as by_today,
           public.try_date(q ->> 'today') as t,
           coalesce(q #>> '{sort,key}', 'bookingDate') as k,
           case when coalesce(q #>> '{sort,dir}', 'asc') = 'asc' then 1 else -1 end as sgn
  ),
  -- Uncorrelated candidate set, computed once (index-served).
  cand as (select x as id from p, public.search_booking_ids(p.s) as x),
  f as (
    select b.id, b.booking_date, b.total, b.total - b.total_paid as remaining, b.created_at,
           case b.status when 'draft' then 0 when 'partially_paid' then 1 when 'paid' then 2 else 3 end as status_rank
      from public.bookings b, p
     where (p.v is distinct from 'calendar' or b.status <> 'canceled' or p.st ? 'canceled')
       and (p.s = '' or b.id in (select c.id from cand c))
       and (jsonb_array_length(p.st) = 0 or p.st ? b.status)
       and (jsonb_array_length(p.crew) = 0
            or exists (select 1 from public.booking_crew bc where bc.booking_id = b.id and p.crew ? bc.crew_id::text))
       and (jsonb_array_length(p.pkg) = 0 or p.pkg ? b.package_id::text)
       -- Valid ISO dates compare as dates (index-friendly); anything else compares as the prototype's strings do,
       -- so a URL like from=2026-02-31 filters instead of failing (review P7 #3).
       and (p.d_from is null or (p.from_date is not null and b.booking_date >= p.from_date)
                             or (p.from_date is null and to_char(b.booking_date, 'YYYY-MM-DD') >= p.d_from))
       and (p.d_to is null or (p.to_date is not null and b.booking_date <= p.to_date)
                           or (p.to_date is null and to_char(b.booking_date, 'YYYY-MM-DD') <= p.d_to))
  )
  select f.id,
         row_number() over (order by
           -- Table default (no sort): upcoming from today ascending, then the past newest first (PRD US-7).
           case when p.by_today then (f.booking_date < p.t)::int end,
           case when p.by_today and f.booking_date >= p.t then f.booking_date end asc,
           case when p.by_today and f.booking_date < p.t then f.booking_date end desc,
           -- Explicit sort (default bookingDate asc).
           case when not p.by_today and p.k = 'bookingDate' then (f.booking_date - date '2000-01-01') * p.sgn end,
           case when not p.by_today and p.k = 'status' then f.status_rank * p.sgn end,
           case when not p.by_today and p.k = 'total' then f.total * p.sgn end,
           case when not p.by_today and p.k = 'remaining' then f.remaining * p.sgn end,
           f.created_at, f.id) as n
    from f, p;
$$;

-- Same JSON as booking_row() (004), built set-based for many rows (P11: the month calendar was 0.4 ms per row).
-- Read parity proves the two are identical.
create or replace function public.filter_bookings(q jsonb)
returns setof jsonb
language sql
stable
set search_path = ''
as $$
  with o as (select id, n from public.ordered_booking_ids(q)),
  it as (
    select i.booking_id, jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'price', i.price, 'qty', i.qty) order by i.position, i.id) as j
      from public.booking_items i join o on o.id = i.booking_id group by i.booking_id
  ),
  cr as (
    select c.booking_id, jsonb_agg(c.crew_id order by c.position, c.crew_id) as j
      from public.booking_crew c join o on o.id = c.booking_id group by c.booking_id
  ),
  iv as (
    select v.booking_id, v.type, max(v.issued_at) as last_at, count(*) as cnt
      from public.invoices v join o on o.id = v.booking_id where v.voided_at is null group by v.booking_id, v.type
  ),
  ivs as (
    select booking_id, sum(cnt)::int as cnt, (array_agg(type order by last_at desc))[1] as latest,
           jsonb_agg(type order by last_at desc) as types
      from iv group by booking_id
  )
  select jsonb_build_object(
    'id', b.id, 'ref', b.ref, 'bookingName', b.booking_name, 'clientName', b.client_name, 'clientPhone', b.client_phone,
    'packageId', b.package_id, 'packageNameSnapshot', b.package_name_snapshot, 'packagePriceSnapshot', b.package_price_snapshot,
    'bookingDate', to_char(b.booking_date, 'YYYY-MM-DD'), 'terms', b.terms, 'paymentInstruction', b.payment_instruction,
    'items', coalesce(it.j, '[]'),
    'crewIds', coalesce(cr.j, '[]'),
    'total', b.total, 'totalPaid', b.total_paid, 'status', b.status,
    'canceledAt', case when b.canceled_at is null then null else public.iso_utc(b.canceled_at) end,
    'canceledBy', case when b.canceled_at is null then null else coalesce(px.display_name, '') end,
    'cancelReason', b.cancel_reason,
    'createdBy', coalesce(pc.display_name, ''),
    'createdAt', public.iso_utc(b.created_at), 'updatedAt', public.iso_utc(b.updated_at),
    'remaining', b.total - b.total_paid,
    'latestInvoiceType', ivs.latest,
    'invoiceTypes', coalesce(ivs.types, '[]'),
    'invoiceCount', coalesce(ivs.cnt, 0))
  from o
  join public.bookings b on b.id = o.id
  left join it on it.booking_id = b.id
  left join cr on cr.booking_id = b.id
  left join ivs on ivs.booking_id = b.id
  left join public.profiles pc on pc.id = b.created_by
  left join public.profiles px on px.id = b.canceled_by
  order by o.n;
$$;

create or replace function public.list_bookings(q jsonb default '{}')
returns jsonb
language sql
stable
set search_path = ''
as $$
  with ids as (select * from public.ordered_booking_ids(coalesce(q, '{}'))),
  meta as (
    -- 10 / 25 / 50 in the UI; clamp anything else (0 would divide by zero).
    -- Same rule as the mock: junk / NaN → 10; otherwise floor, then clamp to 1–100.
    select count(*)::int as total,
           case when public.try_num(q ->> 'pageSize') is null or public.try_num(q ->> 'pageSize') = 'NaN'::numeric then 10
                else greatest(1, least(100, floor(public.try_num(q ->> 'pageSize')))) end::int as size
      from ids
  ),
  cur as (
    select total, size, greatest(1, ceil(total::numeric / size)::int) as pages from meta
  ),
  pg as (select cur.*, least(greatest(1, case when public.try_num(q ->> 'page') is null or public.try_num(q ->> 'page') = 'NaN'::numeric then 1
                                             else floor(public.try_num(q ->> 'page')) end), cur.pages)::int as page from cur)
  select jsonb_build_object(
    -- BookingRow JSON only for this page.
    'rows', coalesce((select jsonb_agg(public.booking_row(b) order by ids.n)
                        from ids join public.bookings b on b.id = ids.id, pg
                       where ids.n > (pg.page - 1) * pg.size and ids.n <= pg.page * pg.size), '[]'),
    'total', pg.total, 'page', pg.page, 'pages', pg.pages, 'pageSize', pg.size)
  from pg;
$$;

-- 004's matcher is superseded by the inline WHERE above.
drop function public.booking_matches(public.bookings, text);

revoke execute on function public.like_escape(text) from public, anon;
revoke execute on function public.try_num(text) from public, anon;
grant execute on function public.try_num(text) to authenticated;
grant execute on function public.try_date(text) to authenticated;
revoke execute on function public.search_booking_ids(text) from public, anon;
grant execute on function public.search_booking_ids(text) to authenticated;
revoke execute on function public.ordered_booking_ids(jsonb) from public, anon;
grant execute on function public.like_escape(text) to authenticated;
grant execute on function public.ordered_booking_ids(jsonb) to authenticated;

-- ═══ 20261116000008_staff_lifecycle.sql ═══
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

-- ═══ 20261116000009_profile_gates_crew_schedule.sql ═══
-- 009 · P6 review fixes.
--  (1) The profile RPCs follow the staff rules too: an inactive account (role removed, 008) or a session from
--      before today's 00:00 WIB (006) gets no profile and can't rename itself or stamp a password change.
--  (5) get_crew_schedule builds rows only for what it shows (upcoming from today); the month count is a count.

create or replace function public.my_profile()
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
  where p.id = auth.uid() and public.is_staff();
$$;

create or replace function public.update_display_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v text := btrim(coalesce(p_name, ''));
begin
  if not public.is_staff() then perform public.raise_code('forbidden', 'Sign in first.'); end if;
  if char_length(v) < 2 or char_length(v) > 50 then perform public.raise_code('length', 'Enter 2–50 characters.'); end if;
  update public.profiles set display_name = v where id = auth.uid();
  return public.my_profile();
end;
$$;

create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set password_changed_at = now() where id = auth.uid() and public.is_staff();
$$;

create or replace function public.get_crew_schedule(p_crew_id uuid, p_today date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with month_ids as (
    select o.id from public.ordered_booking_ids(jsonb_build_object(
      'view', 'calendar', 'crewIds', jsonb_build_array(p_crew_id),
      'from', date_trunc('month', p_today)::date, 'to', (date_trunc('month', p_today) + interval '1 month - 1 day')::date)) o
  ),
  upcoming as (
    select x.r, x.n from public.filter_bookings(jsonb_build_object('view', 'calendar', 'crewIds', jsonb_build_array(p_crew_id), 'from', p_today))
      with ordinality as x(r, n)
  )
  select case when c.id is null then null else jsonb_build_object(
    'crew', jsonb_build_object('id', c.id, 'name', c.name, 'role', c.role, 'isActive', c.is_active),
    'monthCount', (select count(*)::int from month_ids),
    'upcoming', coalesce((select jsonb_agg(r order by n) from upcoming), '[]'))
  end
  from (select 1) one left join public.crew c on c.id = p_crew_id;
$$;

-- ═══ 20261116000010_branding_storage.sql ═══
-- 010 · P8: the business logo lives in Storage, not in the settings row (PRD US-14, §4.3).
-- Private bucket `branding`: PNG / JPEG only, ≤ 1 MB (the browser re-encodes to ≤ 256 px first; the Server
-- Action re-validates the bytes). Staff read through signed URLs; only admins write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The stored logo is only ever the Server Action's content-named path (P10 review note): no other string — no
-- "../", no other bucket's object — can be saved, even by an admin calling update_business directly.
alter table public.workspace_settings add constraint workspace_settings_logo_path
  check (business_logo_path is null or business_logo_path ~ '^logo/[0-9a-f]{64}\.(png|jpg)$');

create policy branding_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'branding' and (select public.is_staff()));
create policy branding_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (select public.is_admin()));
create policy branding_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and (select public.is_admin()))
  with check (bucket_id = 'branding' and (select public.is_admin()));
create policy branding_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and (select public.is_admin()));

-- ═══ 20261116000011_write_results.sql ═══
-- 011 · P7 review fixes for the write RPCs.
--  (5) Every write returns the finished prototype-shaped row (booking_row / invoice_json from 004), so the client
--      never needs a second read after a commit — a failed follow-up read used to report "couldn't save" for a
--      save that had succeeded, and the retry then conflicted with the user's own change.
--  (4) Create invoice with no unsaved edits sends the version it showed; someone else's newer save → conflict,
--      so an invoice is never priced on a total the user didn't see.
--  (6) A concurrent invoice that pushes total_paid past the edited total surfaces as the below-paid error
--      (booking_invalid), not as a raw check violation the UI reads as a connection problem.

-- Result for both invoice RPCs: the invoice, the booking after recompute, and the booking's invoices newest first.
create or replace function public.invoice_result(p_invoice_id uuid)
returns jsonb
language sql
volatile
set search_path = ''
as $$
  select jsonb_build_object(
    'invoice', public.invoice_json(i),
    'booking', public.booking_row(b),
    'invoices', coalesce((select jsonb_agg(public.invoice_json(x) order by x.issued_at desc)
                            from public.invoices x where x.booking_id = b.id and x.voided_at is null), '[]'))
  from public.invoices i join public.bookings b on b.id = i.booking_id
  where i.id = p_invoice_id;
$$;

-- below_paid detail for a booking whose save tripped bookings_total_covers_paid.
create function public.below_paid_error(p_booking_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform public.raise_code('booking_invalid',
    jsonb_build_object('total', 'below_paid', 'minimumTotal', (select total_paid from public.bookings where id = p_booking_id))::text);
end;
$$;

drop function public.save_booking(jsonb);
create function public.save_booking(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb;
  v_id uuid;
  v_constraint text;
begin
  perform public.require_admin();
  if payload ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(payload ->> 'id')) then
    perform public.raise_code('not_found', 'Booking not found.');
  end if;
  v_errors := public.booking_errors(payload);
  if v_errors <> '{}' then perform public.raise_code('booking_invalid', v_errors::text); end if;
  begin
    v_id := public.save_booking_tx(payload);
  exception when check_violation then
    get stacked diagnostics v_constraint = constraint_name;
    -- Only the total-vs-paid backstop is "below paid"; any other CHECK is a real error and surfaces as one.
    if v_constraint = 'bookings_total_covers_paid' and payload ->> 'id' is not null then
      perform public.below_paid_error(public.try_uuid(payload ->> 'id'));
    end if;
    raise;
  end;
  return (select public.booking_row(b) from public.bookings b where b.id = v_id);
end;
$$;

create or replace function public.save_booking_and_create_invoice(booking jsonb, invoice jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_errors jsonb;
  v_id uuid;
  v_seen text := nullif(invoice ->> 'expectedUpdatedAt', '');
  v_now_version text;
  v_constraint text;
begin
  perform public.require_admin();
  if booking is not null and jsonb_typeof(booking) <> 'null' then
    if booking ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(booking ->> 'id')) then
      perform public.raise_code('not_found', 'Booking not found.');
    end if;
    v_errors := public.booking_errors(booking);
    if v_errors <> '{}' then perform public.raise_code('booking_invalid', v_errors::text); end if;
    begin
      v_id := public.save_booking_tx(booking);
    exception when check_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'bookings_total_covers_paid' and booking ->> 'id' is not null then
        perform public.below_paid_error(public.try_uuid(booking ->> 'id'));
      end if;
      raise;
    end;
  else
    v_id := public.try_uuid(invoice ->> 'bookingId');
    -- No unsaved edits: still refuse if the booking changed since the screen loaded it (review P7 #4).
    if v_seen is not null then
      select public.iso_utc(updated_at) into v_now_version from public.bookings where id = v_id for update;
      if v_now_version is not null and v_now_version <> v_seen then
        perform public.raise_code('booking_invalid', '{"booking":"conflict"}');
      end if;
    end if;
  end if;
  return public.invoice_result(public.create_invoice_tx(
    v_id,
    invoice ->> 'type',
    invoice #>> '{dp,method}',
    case when jsonb_typeof(invoice #> '{dp,value}') = 'number' then (invoice #>> '{dp,value}')::numeric end,
    case when jsonb_typeof(invoice -> 'amount') = 'number' then (invoice ->> 'amount')::numeric end));
end;
$$;

drop function public.cancel_booking(uuid, text);
create function public.cancel_booking(booking_id uuid, reason text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bookings;
begin
  perform public.require_admin();
  select * into b from public.bookings where id = cancel_booking.booking_id for update;
  if b.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
  if b.status not in ('draft', 'partially_paid') then perform public.raise_code('not_allowed', 'Only Draft or Partially paid bookings can be canceled.'); end if;
  if char_length(coalesce(reason, '')) > 255 then perform public.raise_code('reason_too_long', 'Max 255 characters.'); end if;
  update public.bookings
     set canceled_at = now(), canceled_by = auth.uid(), cancel_reason = nullif(btrim(coalesce(reason, '')), '')
   where id = b.id
  returning * into b;
  return public.booking_row(b);
end;
$$;

revoke execute on function public.below_paid_error(uuid) from public, anon, authenticated;
revoke execute on function public.save_booking(jsonb) from public, anon;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
grant execute on function public.save_booking(jsonb) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- ═══ 20261116000012_invoice_pdfs.sql ═══
-- 012 · P9: generated invoice PDFs (PRD §4.3 Storage, US-10). Private bucket `invoices`, PDF only, ≤ 5 MB.
-- No API policies on purpose: only the server route (service role) reads or writes it, after it has read the
-- invoice through the caller's own session — so RLS (staff only, sessions end at 00:00 WIB) decides who may
-- download. Viewers and admins get a 10-minute signed URL; anon gets nothing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The route stores the generated file's path. service_role gets no table access by default on current Supabase:
-- grant exactly what it needs — read invoices, and update ONLY pdf_path (the append-only trigger allows nothing else).
grant select on public.invoices to service_role;
grant update (pdf_path) on public.invoices to service_role;

-- ═══ Workspace defaults (the app needs this one row) ═══
-- Change these later: business info on Account settings in the app; bank details / terms here or in the SQL Editor.
insert into public.workspace_settings (workspace_id, business_name, business_address, business_email, business_phone, default_terms, default_payment)
select gen_random_uuid(), 'bs.moment', 'Jl. Rawa Mangun No. 12, Jakarta Timur', 'finance@bs-moment.com', '+62 21-555-0100',
       'Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked.',
       '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}'
where not exists (select 1 from public.workspace_settings);
