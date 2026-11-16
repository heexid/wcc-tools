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
