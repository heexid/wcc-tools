-- 013 · Booking event details (2026-11-21, Figma Bookings 03 "Client & schedule" + invoice 11 "Event" column).
-- A booking gains three optional fields: event start (time of day, Asia/Jakarta wall clock), location and notes
-- (≤ 255 each, printed on invoices — the PDF clamps each to 2 lines). New invoice snapshots carry them; snapshots
-- issued before this migration don't (the PDF falls back to date only), and are never rewritten (rule 4).
--
-- Functions below are the current definitions (002 / 004 / 007) re-created with the new keys only.

alter table public.bookings
  add column event_start time,
  add column location text not null default '' check (char_length(location) <= 255),
  add column notes text not null default '' check (char_length(notes) <= 255);

create or replace function public.booking_errors(p jsonb)
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

  -- Event details (2026-11-21): all optional. eventStart "HH:MM" (24 h) or empty / null.
  if nullif(p ->> 'eventStart', '') is not null and (p ->> 'eventStart') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    e := e || '{"eventStart":"invalid"}';
  end if;
  if char_length(coalesce(p ->> 'location', '')) > 255 then e := e || '{"location":"too_long"}'; end if;
  if char_length(coalesce(p ->> 'notes', '')) > 255 then e := e || '{"notes":"too_long"}'; end if;

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

create or replace function public.save_booking_tx(p jsonb)
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
                                 booking_date, event_start, location, notes, terms, payment_instruction, created_by)
    values (v_name, public.normalize_phone(p ->> 'clientPhone'),
            coalesce(nullif(btrim(coalesce(p ->> 'bookingName', '')), ''), v_name || ' · ' || v_pkg.name),
            v_pkg.id, v_pkg.name, v_pkg.price, (p ->> 'bookingDate')::date,
            nullif(p ->> 'eventStart', '')::time, btrim(coalesce(p ->> 'location', '')), btrim(coalesce(p ->> 'notes', '')),
            coalesce(p ->> 'terms', ''),
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
      event_start = nullif(p ->> 'eventStart', '')::time,
      location = btrim(coalesce(p ->> 'location', '')),
      notes = btrim(coalesce(p ->> 'notes', '')),
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

create or replace function public.create_invoice_tx(p_booking_id uuid, p_type text, p_dp_method text, p_dp_value numeric, p_amount numeric)
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
        'eventStart', to_char(b.event_start, 'HH24:MI'),
        'location', b.location,
        'notes', b.notes,
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

create or replace function public.booking_row(b public.bookings)
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
    'bookingDate', to_char(b.booking_date, 'YYYY-MM-DD'), 'eventStart', to_char(b.event_start, 'HH24:MI'), 'location', b.location, 'notes', b.notes,
    'terms', b.terms, 'paymentInstruction', b.payment_instruction,
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
    'bookingDate', to_char(b.booking_date, 'YYYY-MM-DD'), 'eventStart', to_char(b.event_start, 'HH24:MI'), 'location', b.location, 'notes', b.notes,
    'terms', b.terms, 'paymentInstruction', b.payment_instruction,
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
