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
