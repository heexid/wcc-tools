-- P7 review · versions move on every save; invoice-only conflict; reads never throw on URL junk.
begin;
select plan(7);

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-4000-8000-0000000000f7', 'p7@bs-moment.test', '{"role":"admin"}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000f7"}', true);

create temp table v (k text primary key, j jsonb);
grant all on v to authenticated;
create function pg_temp.base() returns jsonb language sql as $$
  select jsonb_build_object('clientName', 'Version Client', 'clientPhone', '081234567890', 'bookingDate', '2026-12-29', 'crewIds', '[]'::jsonb, 'terms', '',
    'packageId', (select id from public.packages where name = 'Silver Package'), 'items', '[{"name":"Album","price":100,"qty":1}]'::jsonb)
$$;

insert into v select 'new', public.save_booking(pg_temp.base());
-- Items-only edit (no booking column changes) must still be a new version (review #1).
insert into v select 'edit', public.save_booking(pg_temp.base() || jsonb_build_object('id', (select j ->> 'id' from v where k = 'new'),
  'expectedUpdatedAt', (select j ->> 'updatedAt' from v where k = 'new'), 'items', '[{"name":"Album","price":100,"qty":2}]'::jsonb));
select isnt((select j ->> 'updatedAt' from v where k = 'edit'), (select j ->> 'updatedAt' from v where k = 'new'), 'an items-only save moves the version');
select is((select (j ->> 'total')::bigint from v where k = 'edit'), 3000200::bigint, 'save_booking returns the finished row (total recomputed)');
select throws_ok(
  format($$ select public.save_booking(pg_temp.base() || '{"id":"%s","expectedUpdatedAt":"%s","items":[]}'::jsonb) $$,
         (select j ->> 'id' from v where k = 'new'), (select j ->> 'updatedAt' from v where k = 'new')),
  'P0001', 'booking_invalid', 'the stale editor is refused (their items would have overwritten the other save)');

-- Create invoice with no unsaved edits, on a version the user didn't see (review #4).
select throws_ok(
  format($$ select public.save_booking_and_create_invoice(null, '{"bookingId":"%s","type":"full","expectedUpdatedAt":"%s"}'::jsonb) $$,
         (select j ->> 'id' from v where k = 'new'), (select j ->> 'updatedAt' from v where k = 'new')),
  'P0001', 'booking_invalid', 'invoice-only: a stale version is a conflict, no invoice priced on an unseen total');
select lives_ok(
  format($$ select public.save_booking_and_create_invoice(null, '{"bookingId":"%s","type":"full","expectedUpdatedAt":"%s"}'::jsonb) $$,
         (select j ->> 'id' from v where k = 'edit'), (select j ->> 'updatedAt' from v where k = 'edit')),
  'invoice-only with the current version goes through');

-- URL junk never throws (review #3): impossible dates compare like strings, huge / zero paging is clamped.
select lives_ok($$ select public.list_bookings('{"view":"table","from":"2026-02-31","to":"2026-03-05","page":1e20,"pageSize":0}') $$, 'impossible date + huge page + pageSize 0: no error');
select is((public.list_bookings('{"page":"abc","pageSize":"x"}') ->> 'pageSize')::int, 10, 'non-numeric paging falls back to the defaults');

reset role;
select * from finish();
rollback;
