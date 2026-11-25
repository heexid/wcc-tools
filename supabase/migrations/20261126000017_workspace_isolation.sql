-- 017 · Workspaces, phase SD2: isolation (context/SHARED-DATABASE-PLAN.md §3 items 4–7, 9, 10).
-- The database decides the workspace from the signed-in account; the browser never sends it. Reads: row level security.
-- Writes: every function limits each id it receives to the caller's workspace; another workspace's id is 'not_found'.
-- Function bodies are the ones after 016 with only those conditions added.
-- Needs 016. Storage files (logo, PDFs) are separated in SD3: no second customer before that.

-- ─── Who am I ───────────────────────────────────────────────────────────────────────────────────
-- The workspace of the signed-in, active account with a session from today; null (matches no row) otherwise.
create function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.workspace_id
    from public.profiles p join public.workspaces w on w.id = p.workspace_id
   where p.id = auth.uid() and p.active and w.status <> 'closed' and public.session_fresh();
$$;
revoke execute on function public.current_workspace_id() from public, anon;
grant execute on function public.current_workspace_id() to authenticated;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select public.current_workspace_id() is not null; $$;

-- An admin who may write: the workspace is active. A read_only workspace keeps its reads (is_staff) and loses every
-- write, including logo uploads (the Storage policies use is_admin). Own name and password still work.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p join public.workspaces w on w.id = p.workspace_id
     where p.id = auth.uid() and p.role = 'admin' and p.workspace_id = public.current_workspace_id() and w.status = 'active');
$$;

create or replace function public.require_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if not public.is_admin() then
    perform public.raise_code('forbidden', 'Only an admin of an active workspace can make changes.');
  end if;
end;
$$;

-- ─── Reads ──────────────────────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles', 'crew', 'packages', 'bookings', 'booking_items', 'booking_crew', 'invoices'] loop
    execute format('drop policy staff_read on public.%I', t);
    execute format('create policy workspace_read on public.%I for select to authenticated using (workspace_id = (select public.current_workspace_id()))', t);
  end loop;
end $$;
-- workspaces, workspace_settings and both counters: no policy and no grant, as before.

-- ─── Settings and profile: by workspace, never "latest row" ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'defaultTerms', s.default_terms,
    'defaultPayment', s.default_payment,
    'business', jsonb_build_object('name', s.business_name, 'address', s.business_address, 'phone', s.business_phone,
                                   'email', s.business_email, 'logo', s.business_logo_path))
  from public.workspace_settings s
  where s.workspace_id = public.current_workspace_id();
$function$;

CREATE OR REPLACE FUNCTION public.my_profile()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'email', u.email,
    'role', p.role,
    'workspace', coalesce((select s.business_name from public.workspace_settings s where s.workspace_id = p.workspace_id), ''),
    'passwordChangedAt', to_char(coalesce(p.password_changed_at, p.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'))
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = auth.uid() and public.is_staff();
$function$;

CREATE OR REPLACE FUNCTION public.update_business(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.require_admin();
  update public.workspace_settings set
    business_name = btrim(p ->> 'name'),
    business_address = btrim(p ->> 'address'),
    business_email = btrim(p ->> 'email'),
    business_phone = btrim(p ->> 'phone'),
    business_logo_path = case when p ? 'logo' then nullif(p ->> 'logo', '') else business_logo_path end,
    updated_by = auth.uid()
  where workspace_id = public.current_workspace_id();
  return public.get_settings() -> 'business';
end;
$function$;

-- ─── Packages ───────────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_package(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform public.require_admin();
  update public.packages set is_active = false, archived_at = now() where id = p_id and workspace_id = public.current_workspace_id();
  if not found then perform public.raise_code('not_found', 'Package not found.'); end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.restore_package(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
  v_name text;
begin
  perform public.require_admin();
  select name into v_name from public.packages where id = p_id and workspace_id = v_ws;
  if v_name is null then perform public.raise_code('not_found', 'Package not found.'); end if;
  if exists (select 1 from public.packages o where o.workspace_id = v_ws and o.is_active and lower(o.name) = lower(v_name)) then
    perform public.raise_code('duplicate', 'An active package already has this name.');
  end if;
  update public.packages set is_active = true, archived_at = null where id = p_id and workspace_id = v_ws;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_package(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
  e jsonb := '{}';
  v_id uuid := public.try_uuid(p ->> 'id');
  v_name text := btrim(coalesce(p ->> 'name', ''));
  v_price bigint := public.json_money(p -> 'price');
  v_desc text := coalesce(p ->> 'description', '');
  v_row public.packages;
begin
  perform public.require_admin();
  if p ->> 'id' is not null and not exists (select 1 from public.packages where id = v_id and workspace_id = v_ws) then
    perform public.raise_code('not_found', 'Package not found.');
  end if;
  if v_name = '' then e := e || '{"name":"required"}';
  elsif exists (select 1 from public.packages o where o.workspace_id = v_ws and o.is_active and o.id is distinct from v_id and lower(o.name) = lower(v_name)) then
    e := e || '{"name":"duplicate"}';
  end if;
  if v_price is null then e := e || '{"price":"invalid"}'; end if;
  if char_length(v_desc) > 1000 then e := e || '{"description":"too_long"}'; end if;
  if e <> '{}' then perform public.raise_code('package_invalid', e::text); end if;

  if v_id is null then
    insert into public.packages (workspace_id, name, price, summary, description)
    values (v_ws, v_name, v_price, coalesce(p ->> 'summary', ''), v_desc)
    returning * into v_row;
  else
    -- Price changes never touch existing bookings: they keep their snapshot (US-0).
    update public.packages
       set name = v_name, price = v_price, summary = coalesce(p ->> 'summary', summary), description = v_desc
     where id = v_id and workspace_id = v_ws
    returning * into v_row;
  end if;
  return public.package_row(v_row);
end;
$function$;

-- ─── Bookings and invoices ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.booking_errors(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
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
    select * into v_existing from public.bookings where id = public.try_uuid(p ->> 'id') and workspace_id = v_ws;
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
    select * into v_pkg from public.packages where id = public.try_uuid(p ->> 'packageId') and workspace_id = v_ws;
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
$function$;

CREATE OR REPLACE FUNCTION public.below_paid_error(p_booking_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  perform public.raise_code('booking_invalid',
    jsonb_build_object('total', 'below_paid', 'minimumTotal', (select total_paid from public.bookings where id = p_booking_id and workspace_id = public.current_workspace_id()))::text);
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_booking_tx(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
  v_id uuid := public.try_uuid(p ->> 'id');
  v_existing public.bookings;
  v_pkg public.packages;
  v_name text := btrim(p ->> 'clientName');
  v_pay jsonb := p -> 'paymentInstruction';
  v_repick boolean;
  v_old_items uuid[];
begin
  select * into v_pkg from public.packages where id = public.try_uuid(p ->> 'packageId') and workspace_id = v_ws;
  if v_id is not null then
    select * into v_existing from public.bookings where id = v_id and workspace_id = v_ws for update;
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
    insert into public.bookings (workspace_id, client_name, client_phone, booking_name, package_id, package_name_snapshot, package_price_snapshot,
                                 booking_date, event_start, location, notes, terms, payment_instruction, created_by)
    values (v_ws, v_name, public.normalize_phone(p ->> 'clientPhone'),
            coalesce(nullif(btrim(coalesce(p ->> 'bookingName', '')), ''), v_name || ' · ' || v_pkg.name),
            v_pkg.id, v_pkg.name, v_pkg.price, (p ->> 'bookingDate')::date,
            nullif(p ->> 'eventStart', '')::time, btrim(coalesce(p ->> 'location', '')), btrim(coalesce(p ->> 'notes', '')),
            coalesce(p ->> 'terms', ''),
            coalesce(v_pay, (select s.default_payment from public.workspace_settings s where s.workspace_id = v_ws)),
            auth.uid())
    returning id into v_id;

    insert into public.booking_items (workspace_id, booking_id, name, price, qty, position)
    select v_ws, v_id, btrim(it ->> 'name'), (it ->> 'price')::bigint, (it ->> 'qty')::int, (ord - 1)::int
      from jsonb_array_elements(coalesce(p -> 'items', '[]')) with ordinality as x(it, ord);
  else
    -- Order matters: bookings_total_covers_paid is checked after every statement, so the total may never dip
    -- below what's paid on the way. New items first (total only rises), then the booking row (a cheaper
    -- package lowers it), then the old items (down to the final total, which booking_errors() checked).
    select coalesce(array_agg(id), '{}') into v_old_items from public.booking_items where booking_id = v_id;
    insert into public.booking_items (workspace_id, booking_id, name, price, qty, position)
    select v_ws, v_id, btrim(it ->> 'name'), (it ->> 'price')::bigint, (it ->> 'qty')::int, (ord - 1)::int
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
    where id = v_id and workspace_id = v_ws;

    delete from public.booking_items where id = any (v_old_items);
  end if;


  -- Replace crew.
  delete from public.booking_crew where booking_id = v_id;
  insert into public.booking_crew (workspace_id, booking_id, crew_id, position)
  select v_ws, v_id, c.id, (min(x.ord) - 1)::int
    from jsonb_array_elements_text(coalesce(p -> 'crewIds', '[]')) with ordinality as x(cid, ord)
    join public.crew c on c.id::text = x.cid and c.workspace_id = v_ws   -- unknown crew ids are dropped, duplicates collapse (prototype)
   group by c.id;

  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_booking(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
  v_errors jsonb;
  v_id uuid;
  v_constraint text;
begin
  perform public.require_admin();
  if payload ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(payload ->> 'id') and workspace_id = v_ws) then
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
  return (select public.booking_row(b) from public.bookings b where b.id = v_id and b.workspace_id = v_ws);
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_booking(booking_id uuid, reason text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
  b public.bookings;
begin
  perform public.require_admin();
  select * into b from public.bookings where id = cancel_booking.booking_id and workspace_id = v_ws for update;
  if b.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
  if b.status not in ('draft', 'partially_paid') then perform public.raise_code('not_allowed', 'Only Draft or Partially paid bookings can be canceled.'); end if;
  if char_length(coalesce(reason, '')) > 255 then perform public.raise_code('reason_too_long', 'Max 255 characters.'); end if;
  update public.bookings
     set canceled_at = now(), canceled_by = auth.uid(), cancel_reason = nullif(btrim(coalesce(reason, '')), '')
   where id = b.id and workspace_id = v_ws
  returning * into b;
  return public.booking_row(b);
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_invoice_tx(p_booking_id uuid, p_type text, p_dp_method text, p_dp_value numeric, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
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
  select * into b from public.bookings where id = p_booking_id and workspace_id = v_ws for update;
  if b.id is null then perform public.raise_code('not_found', 'Booking not found.'); end if;
  select count(*) into v_count from public.invoices where booking_id = b.id and voided_at is null;

  v_amount := public.invoice_amount(b.total, b.total_paid, v_count, b.canceled_at is not null,
                                    p_type, p_dp_method, p_dp_value, p_amount);

  -- Never reuse a taken number (a seed / import may hold one above the counter).
  loop
    v_number := public.next_invoice_number(v_ws, v_year);
    exit when not exists (select 1 from public.invoices where workspace_id = v_ws and number = v_number);
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
    from (select 1) one left join lateral (select * from public.workspace_settings where workspace_id = v_ws) s on true;

  insert into public.invoices (workspace_id, booking_id, number, type, dp_method, dp_percentage, amount, snapshot, snapshot_hash, issued_at, created_by)
  values (v_ws, b.id, v_number, p_type,
          case when p_type = 'dp' then p_dp_method end,
          case when p_type = 'dp' and p_dp_method = 'percentage' then p_dp_value end,
          v_amount, v_snapshot, public.snapshot_hash(v_snapshot), v_now, auth.uid())
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_booking_and_create_invoice(booking jsonb, invoice jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ws uuid := public.current_workspace_id();
  v_errors jsonb;
  v_id uuid;
  v_seen text := nullif(invoice ->> 'expectedUpdatedAt', '');
  v_now_version text;
  v_constraint text;
begin
  perform public.require_admin();
  if booking is not null and jsonb_typeof(booking) <> 'null' then
    if booking ->> 'id' is not null and not exists (select 1 from public.bookings where id = public.try_uuid(booking ->> 'id') and workspace_id = v_ws) then
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
      select public.iso_utc(updated_at) into v_now_version from public.bookings where id = v_id and workspace_id = v_ws for update;
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
$function$;

CREATE OR REPLACE FUNCTION public.invoice_result(p_invoice_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'invoice', public.invoice_json(i),
    'booking', public.booking_row(b),
    'invoices', coalesce((select jsonb_agg(public.invoice_json(x) order by x.issued_at desc)
                            from public.invoices x where x.booking_id = b.id and x.voided_at is null), '[]'))
  from public.invoices i join public.bookings b on b.id = i.booking_id
  where i.id = p_invoice_id and i.workspace_id = public.current_workspace_id();
$function$;

-- ─── Accounts: app_metadata needs a role AND a valid workspace_id ────────────────────────────────
-- Accounts added after 016 and before this one have no workspace in their metadata yet.
update auth.users u
   set raw_app_meta_data = u.raw_app_meta_data || jsonb_build_object('workspace_id', p.workspace_id)
  from public.profiles p
 where p.id = u.id and u.raw_app_meta_data ->> 'workspace_id' is distinct from p.workspace_id::text;

-- The workspace named in the metadata, or null when it is missing, malformed, unknown or closed.
create function public.account_workspace(p_meta jsonb)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id from public.workspaces w where w.id = public.try_uuid(p_meta ->> 'workspace_id') and w.status <> 'closed';
$$;
revoke execute on function public.account_workspace(jsonb) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
  v_ws uuid := public.account_workspace(new.raw_app_meta_data);
  v_name text := left(btrim(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1))), 50);
begin
  if v_role is null or v_role not in ('admin', 'crew') or v_ws is null then
    return new; -- not provisioned (a role and a workspace): no profile, no access
  end if;
  if char_length(v_name) < 2 then v_name := 'User'; end if;
  insert into public.profiles (id, workspace_id, display_name, role, password_changed_at)
  values (new.id, v_ws, v_name, v_role, now())
  on conflict (id) do nothing;
  return new;
end;
$function$;

create or replace function public.handle_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_app_meta_data ->> 'role';
  v_name text := left(btrim(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1))), 50);
  v_ws uuid := public.account_workspace(new.raw_app_meta_data);
  v_meta_ws text := new.raw_app_meta_data ->> 'workspace_id';
  v_profile public.profiles;
begin
  if v_role is not distinct from (old.raw_app_meta_data ->> 'role')
     and v_meta_ws is not distinct from (old.raw_app_meta_data ->> 'workspace_id') then
    return new;
  end if;
  select * into v_profile from public.profiles where id = new.id;

  if v_profile.id is null then
    -- No account yet: it starts once it has both.
    if v_role in ('admin', 'crew') and v_ws is not null then
      if char_length(v_name) < 2 then v_name := 'User'; end if;
      insert into public.profiles (id, workspace_id, display_name, role, password_changed_at)
      values (new.id, v_ws, v_name, v_role, now())
      on conflict (id) do nothing;
    end if;
    return new;
  end if;

  -- An account never moves.
  if v_meta_ws is not null and v_meta_ws <> v_profile.workspace_id::text then
    perform public.raise_code('immutable', 'An account never moves to another workspace.');
  end if;
  if v_role is null or v_role not in ('admin', 'crew') or v_meta_ws is null then
    update public.profiles set active = false where id = new.id; -- access revoked; history keeps the name
  elsif v_role is distinct from (old.raw_app_meta_data ->> 'role') then
    update public.profiles set role = v_role, active = true where id = new.id;
  end if; -- only workspace_id changed: never reactivates
  return new;
end;
$$;

-- ─── Remove SD1's temporary default ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles', 'crew', 'packages', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'booking_counters', 'invoice_counters'] loop
    execute format('alter table public.%I alter column workspace_id drop default', t);
  end loop;
end $$;
drop function public.next_booking_ref(int);
drop function public.next_invoice_number(int);
drop function public.only_workspace();
