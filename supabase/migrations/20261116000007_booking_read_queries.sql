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
