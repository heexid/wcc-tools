-- 013 · Booking event details (2026-11-21): event start / location / notes are stored, validated, returned by the
-- booking reads and copied into new invoice snapshots. Field-level parity with the mock lives in tests/vectors.
begin;
select plan(13);

insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000e1');
insert into public.profiles (id, display_name, role) values ('00000000-0000-4000-8000-0000000000e1', 'Event Admin', 'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;
insert into public.packages (id, name, price, summary) values ('00000000-0000-4000-8000-00000000e001', 'Event Details Test Package', 3000000, 'test');

create temp table t (k text primary key, v text);
grant all on t to authenticated;
create function pg_temp.payload(extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('clientName', 'Event Client', 'clientPhone', '081234567890', 'packageId', '00000000-0000-4000-8000-00000000e001',
                            'bookingDate', '2026-12-20', 'items', '[]'::jsonb, 'crewIds', '[]'::jsonb, 'terms', '') || extra
$$;
create function pg_temp.detail_of(p_sql text) returns jsonb language plpgsql as $$
declare d text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics d = pg_exception_detail;
  return d::jsonb;
end $$;

select has_column('public', 'bookings', 'event_start', 'bookings.event_start');
select col_type_is('public', 'bookings', 'event_start', 'time without time zone', 'event_start is a time of day');
select col_is_null('public', 'bookings', 'event_start', 'event_start is optional');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1"}', true);

-- Saved and read back (trimmed, "HH:MM").
insert into t select 'b1', public.save_booking(pg_temp.payload('{"eventStart":"08:00","location":"  Hotel Mulia, Jakarta ","notes":"Akad 08:00"}')) ->> 'id';
select is(public.get_booking((select v from t where k = 'b1')) ->> 'eventStart', '08:00', 'eventStart round-trips as HH:MM');
select is(public.get_booking((select v from t where k = 'b1')) ->> 'location', 'Hotel Mulia, Jakarta', 'location is trimmed');
select is(public.get_booking((select v from t where k = 'b1')) ->> 'notes', 'Akad 08:00', 'notes stored');

-- Optional: left out → null / ''.
insert into t select 'b2', public.save_booking(pg_temp.payload()) ->> 'id';
select is(public.get_booking((select v from t where k = 'b2')) -> 'eventStart', 'null'::jsonb, 'no eventStart → null');
select is(public.get_booking((select v from t where k = 'b2')) ->> 'location', '', 'no location → empty');

-- Validation (same codes as the mock repo).
select is(pg_temp.detail_of($$ select public.save_booking(pg_temp.payload('{"eventStart":"25:00"}')) $$), '{"eventStart":"invalid"}'::jsonb, 'eventStart 25:00 → invalid');
select is(pg_temp.detail_of(format($$ select public.save_booking(pg_temp.payload(%L)) $$, jsonb_build_object('location', repeat('x', 256), 'notes', repeat('y', 256)))),
          '{"location":"too_long","notes":"too_long"}'::jsonb, 'location / notes over 255 → too_long');

-- Edit clears the start time.
select lives_ok(format($$ select public.save_booking(pg_temp.payload(%L)) $$, jsonb_build_object('id', (select v from t where k = 'b1'), 'eventStart', '', 'location', 'Hotel Mulia, Jakarta', 'notes', 'Akad 08:00')), 'edit with an empty start time');
select is(public.get_booking((select v from t where k = 'b1')) -> 'eventStart', 'null'::jsonb, 'empty eventStart clears it');

-- New invoice snapshots carry the event details.
select is((public.create_invoice((select v from t where k = 'b1')::uuid, 'full') -> 'invoice' -> 'snapshot' -> 'booking') - array['ref','bookingName','clientName','clientPhone','bookingDate','packageName','packagePrice','packageSummary','items','terms','paymentInstruction'],
          '{"eventStart":null,"location":"Hotel Mulia, Jakarta","notes":"Akad 08:00"}'::jsonb, 'snapshot.booking carries eventStart / location / notes');

select * from finish();
rollback;
