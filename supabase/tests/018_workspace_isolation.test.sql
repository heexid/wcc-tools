-- 017 · SD2: one workspace can't read or change another (SHARED-DATABASE-PLAN §5 tests 1–3, 5, 7–9, 13, 15–18).
-- A = the seed. B = a second studio with the same package name, booking ref and invoice number as A.
begin;
select no_plan();

do $$ declare t text; begin -- no help from the test harness here
  foreach t in array array['profiles','crew','packages','bookings','booking_items','booking_crew','invoices','booking_counters','invoice_counters'] loop
    execute format('alter table public.%I alter column workspace_id drop default', t);
  end loop;
end $$;

create temp table w as select (select id from public.workspaces where slug = 'main') as a, '00000000-0000-4000-8000-0000000018b0'::uuid as b;
insert into public.workspaces (id, slug, name) select b, 'studio-b', 'Studio B' from w;
insert into public.workspace_settings (workspace_id, business_name, business_address, business_email, business_phone, default_terms, default_payment)
select b, 'Studio B', 'Jl. B 2', 'b@studio.test', '+62 21-555-0200', 'B terms', '{"receiptName":"Bank B","accountNumber":"9999999999","accountName":"Studio B"}' from w;
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
select x.id::uuid, x.email, jsonb_build_object('display_name', x.name), jsonb_build_object('role', x.role, 'workspace_id', case x.ws when 'a' then w.a else w.b end)
  from w, (values ('00000000-0000-4000-8000-0000000018a1', 'aa18@t.test', 'A Admin', 'admin', 'a'), ('00000000-0000-4000-8000-0000000018a2', 'ac18@t.test', 'A Crew', 'crew', 'a'),
                  ('00000000-0000-4000-8000-0000000018b1', 'ba18@t.test', 'B Admin', 'admin', 'b'), ('00000000-0000-4000-8000-0000000018b2', 'bc18@t.test', 'B Crew', 'crew', 'b')) x(id, email, name, role, ws);

create function pg_temp.be(p_user text, p_extra jsonb default '{}') returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', (jsonb_build_object('sub', p_user) || p_extra)::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.owner() returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); end $$;
-- SQLSTATE/message of a statement, 'ok' when it runs; always undone.
create function pg_temp.try(p_sql text) returns text language plpgsql as $$
declare r text;
begin
  begin
    execute p_sql; r := 'ok';
    raise exception using errcode = 'P9999';
  exception when sqlstate 'P9999' then null; when others then r := sqlerrm;
  end;
  return r;
end $$;
-- Everything in a workspace, as one hash.
create function pg_temp.hash(p_ws uuid) returns text language plpgsql security definer as $$
declare t text; h text; o text := '';
begin
  foreach t in array array['profiles','crew','packages','bookings','booking_items','booking_crew','invoices','booking_counters','invoice_counters','workspace_settings'] loop
    execute format('select md5(coalesce(string_agg(x::text, ''|'' order by x::text), '''')) from public.%I x where workspace_id = $1', t) into h using p_ws;
    o := o || h;
  end loop;
  return md5(o);
end $$;
grant select on w to authenticated;

-- B's data, through B's own admin.
select pg_temp.be('00000000-0000-4000-8000-0000000018b1');
create temp table bx as select (public.save_package('{"name":"Gold Package","price":7000,"summary":"B gold","description":""}') ->> 'id')::uuid as pkg;
alter table bx add column crew uuid, add column bk uuid, add column bk2 uuid, add column inv uuid, add column pkg2 uuid;
update bx set crew = (select id from public.crew where name = 'B Crew');
update bx set bk = (public.save_booking(jsonb_build_object('clientName', 'B Client', 'clientPhone', '081234567890', 'packageId', pkg, 'bookingDate', '2026-11-20',
  'items', '[{"name":"B item","price":100,"qty":1}]'::jsonb, 'crewIds', jsonb_build_array(crew), 'terms', '')) ->> 'id')::uuid;
update bx set inv = (public.create_invoice(bk, 'full') #>> '{invoice,id}')::uuid;
update bx set bk2 = (public.save_booking(jsonb_build_object('clientName', 'B Draft', 'clientPhone', '081234567891', 'packageId', pkg, 'bookingDate', '2026-11-21', 'items', '[]'::jsonb, 'crewIds', '[]'::jsonb, 'terms', '')) ->> 'id')::uuid;
update bx set pkg2 = (public.save_package('{"name":"B Old","price":1,"summary":"","description":""}') ->> 'id')::uuid;
select public.archive_package(pkg2) from bx;
select is((select payment_instruction ->> 'accountName' from public.bookings where id = bk), 'Studio B', 'B''s booking gets B''s bank account') from bx;
select is((select number from public.invoices where id = inv), 'INV-' || extract(year from now() at time zone 'Asia/Jakarta') || '-0001', 'B''s first invoice is 0001') from bx;
select is((select snapshot #>> '{business,name}' from public.invoices where id = inv), 'Studio B', 'B''s invoice carries B''s business') from bx;
select pg_temp.owner();
grant select on bx to authenticated;
-- The same ref and number in both.
alter table public.bookings disable trigger bookings_derive;
update public.bookings set ref = 'BK-2026-0144' where id = (select bk2 from bx);
alter table public.bookings enable trigger bookings_derive;
alter table public.invoices disable trigger invoices_append_only;
update public.invoices set number = 'INV-2026-0187' where id = (select inv from bx);
alter table public.invoices enable trigger invoices_append_only;
create temp table ax as select (select id from public.packages where workspace_id = w.a and name = 'Gold Package') pkg, (select id from public.crew where workspace_id = w.a and name = 'Raka Pratama') crew,
  (select id from public.bookings where workspace_id = w.a and ref = 'BK-2026-0144') bk, (select id from public.bookings where workspace_id = w.a and status = 'partially_paid' order by ref limit 1) open_bk from w;
grant select on ax to authenticated;
create temp table h0 as select pg_temp.hash(a) a, pg_temp.hash(b) b from w;
grant select on h0 to authenticated;

-- ─── 1 · Reads ──────────────────────────────────────────────────────────────────────────────────
create function pg_temp.others(p_ws uuid) returns text language plpgsql as $$ -- tables where the caller sees rows outside p_ws, or nothing at all
declare t text; n int; m int; o text := '';
begin
  foreach t in array array['crew','packages','bookings','booking_items','booking_crew','invoices'] loop
    execute format('select count(*) filter (where workspace_id <> $1), count(*) from public.%I', t) into n, m using p_ws;
    if n > 0 or m = 0 then o := o || t || ' '; end if;
  end loop;
  return o;
end $$;
select pg_temp.be(u) , is(pg_temp.others(a), '', 'A ' || u || ': only A''s rows in every table') from w, (values ('00000000-0000-4000-8000-0000000018a1')) x(u);
select pg_temp.be('00000000-0000-4000-8000-0000000018a2');
select is(pg_temp.others(a), '', 'A crew: only A''s rows') from w;
select pg_temp.be('00000000-0000-4000-8000-0000000018b2');
select is(pg_temp.others(b), '', 'B crew: only B''s rows') from w;
select pg_temp.be('00000000-0000-4000-8000-0000000018b1');
select is(pg_temp.others(b), '', 'B admin: only B''s rows') from w;
select is((select array_agg(display_name order by display_name) from public.profiles), array['B Admin', 'B Crew'], 'B sees only B''s accounts');
select is(public.count_bookings(), 2, 'count_bookings');
select is((public.list_bookings('{}') ->> 'total')::int, 2, 'list_bookings');
select is(jsonb_array_length(public.list_all_bookings('{}')), 2, 'list_all_bookings');
select is((public.list_bookings('{"search":"sari"}') ->> 'total')::int, 0, 'search finds nothing of A');
select is((public.list_bookings(jsonb_build_object('crewIds', jsonb_build_array(crew))) ->> 'total')::int, 0, 'A''s crew as a filter finds nothing') from ax;
select is((public.list_bookings(jsonb_build_object('packageIds', jsonb_build_array(pkg))) ->> 'total')::int, 0, 'A''s package as a filter finds nothing') from ax;
select is(public.get_booking(bk::text), null, 'get_booking: A''s id') from ax;
select is(public.get_booking('BK-2026-0144') ->> 'clientName', 'B Draft', 'get_booking by a ref both have: B''s');
select is(public.get_booking('BK-2026-0142'), null, 'get_booking by A''s ref');
select is(public.get_invoice_snapshot('INV-2026-0187') #>> '{business,name}', 'Studio B', 'get_invoice_snapshot by a number both have: B''s');
select is(public.get_invoice_snapshot('INV-2026-0120'), null, 'get_invoice_snapshot by A''s number');
select is((public.get_kpis('2026-11') ->> 'bookingsThisMonth')::int, 2, 'KPIs: B only');
select is((public.get_kpis('2026-11') ->> 'outstanding')::bigint, 0::bigint, 'KPIs: no A balance');
select is((select array_agg(x ->> 'name' order by x ->> 'name') from jsonb_array_elements(public.list_packages(null, null)) x), array['B Old', 'Gold Package'], 'list_packages');
select is((select array_agg(x ->> 'name' order by x ->> 'name') from jsonb_array_elements(public.list_people('2026-11-10')) x), array['B Admin', 'B Crew'], 'list_people');
select is(public.get_crew_schedule(crew, '2026-11-10'), null, 'get_crew_schedule: A''s person (a /workspace?person= link)') from ax;
select is(public.get_settings() #>> '{defaultPayment,accountNumber}', '9999999999', 'get_settings: B''s bank account');
select is(public.my_profile() ->> 'workspace', 'Studio B', 'my_profile: B''s name');
select pg_temp.be('00000000-0000-4000-8000-0000000018a1');
select is(public.get_booking('BK-2026-0144') ->> 'id', bk::text, 'A still gets its own BK-2026-0144') from ax;
select is(public.get_invoice_snapshot('INV-2026-0187') #>> '{booking,ref}', 'BK-2026-0142', 'A still gets its own INV-2026-0187');
select is(public.get_settings() #>> '{business,name}', 'bs.moment', 'A''s settings');
select ok(not exists (select 1 from jsonb_array_elements(public.list_packages(null, null)) x where x ->> 'summary' = 'B gold'), 'A''s package list has no B package');

-- ─── 2–3 · Writes with the other workspace's ids ────────────────────────────────────────────────
create function pg_temp.payload(p_id uuid, p_pkg uuid, p_crew uuid) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('id', p_id, 'clientName', 'Intruder', 'clientPhone', '081234567890', 'packageId', p_pkg, 'bookingDate', '2026-12-01',
    'items', '[]'::jsonb, 'crewIds', case when p_crew is null then '[]'::jsonb else jsonb_build_array(p_crew) end, 'terms', '')) $$;
select is(pg_temp.try(format('select public.save_booking(%L)', pg_temp.payload(bx.bk, ax.pkg, null))), 'not_found', 'save_booking: B''s booking') from ax, bx;
select is(pg_temp.try(format('select public.save_booking(%L)', pg_temp.payload(null, bx.pkg, null))), 'booking_invalid', 'save_booking: B''s package') from bx;
select is(pg_temp.try(format('select public.save_booking(%L)', pg_temp.payload(ax.open_bk, bx.pkg, null))), 'booking_invalid', 'save_booking: own booking, B''s package') from ax, bx;
select is(public.save_booking(pg_temp.payload(null, ax.pkg, bx.crew)) -> 'crewIds', '[]'::jsonb, 'save_booking: B''s crew is ignored, as an unknown id') from ax, bx;
select is(pg_temp.try(format('select public.cancel_booking(%L)', bk2)), 'not_found', 'cancel_booking') from bx;
select is(pg_temp.try(format('select public.create_invoice(%L, ''full'')', bk2)), 'not_found', 'create_invoice') from bx;
select is(pg_temp.try(format('select public.save_booking_and_create_invoice(%L, ''{"type":"full"}'')', pg_temp.payload(bx.bk2, ax.pkg, null))), 'not_found', 'save_booking_and_create_invoice: B''s booking') from ax, bx;
select is(pg_temp.try(format('select public.save_booking_and_create_invoice(null, %L)', jsonb_build_object('bookingId', bk2, 'type', 'full'))), 'not_found', 'save_booking_and_create_invoice: invoice only') from bx;
select is(pg_temp.try(format('select public.save_booking_and_create_invoice(null, %L)', jsonb_build_object('bookingId', bk2, 'type', 'full', 'expectedUpdatedAt', '2000-01-01T00:00:00.000Z'))), 'not_found', 'and it doesn''t tell whether B''s booking changed') from bx;
select is(pg_temp.try(format('select public.save_package(%L)', jsonb_build_object('id', pkg, 'name', 'Taken', 'price', 1, 'description', ''))), 'not_found', 'save_package') from bx;
select is(pg_temp.try(format('select public.archive_package(%L)', pkg)), 'not_found', 'archive_package') from bx;
select is(pg_temp.try(format('select public.restore_package(%L)', pkg2)), 'not_found', 'restore_package') from bx;
select is(pg_temp.try('select public.save_package(''{"name":"B Old","price":1,"description":""}'')'), 'ok', 'a name only B uses is free in A');
select is(pg_temp.try('select public.save_package(''{"name":"gold package","price":1,"description":""}'')'), 'package_invalid', 'a name A uses is not');
select lives_ok($$ select public.update_business('{"name":"A Renamed","address":"Jl. A","email":"a@a.test","phone":"+62 21-555-0100"}') $$, 'A edits its business');
select is(public.get_settings() #>> '{business,name}', 'A Renamed', 'A''s changed');
select lives_ok($$ select public.update_display_name('A Admin Two') $$, 'A renames itself');
select is(pg_temp.hash(w.b), h0.b, 'B is unchanged after every attempt') from w, h0;
select is(pg_temp.try(format('update public.bookings set client_name = ''x'' where id = %L', bk)), 'permission denied for table bookings', 'no direct writes') from bx;

-- Names and numbers of one workspace never block the other.
select pg_temp.owner();
insert into public.packages (id, workspace_id, name, price, is_active, archived_at) select '00000000-0000-4000-8000-0000000018d1', w.a, 'Only B Active', 1, false, now() from w;
insert into public.packages (workspace_id, name, price) select w.b, 'Only B Active', 1 from w;
insert into public.invoice_counters (workspace_id, year, last_value) select w.a, public.studio_year(), 900 from w on conflict (workspace_id, year) do update set last_value = 900;
alter table public.invoices disable trigger invoices_append_only;
update public.invoices set number = 'INV-' || public.studio_year() || '-0901' where id = (select inv from bx);
alter table public.invoices enable trigger invoices_append_only;
select pg_temp.be('00000000-0000-4000-8000-0000000018a1');
select lives_ok($$ select public.restore_package('00000000-0000-4000-8000-0000000018d1') $$, 'restore_package: a name active only in B');
select is(public.create_invoice(open_bk, 'partial', null, null, 1000) #>> '{invoice,number}', 'INV-' || extract(year from now() at time zone 'Asia/Jakarta') || '-0901', 'create_invoice: B''s number is not "taken" in A') from ax;

-- The internal functions hold on their own, without the checks in front of them (called as the owner, as A's admin).
select pg_temp.owner();
create temp table hb as select pg_temp.hash(b) b from w;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000018a1"}', true);
select is(pg_temp.try(format('select public.save_booking_tx(%L)', pg_temp.payload(bx.bk2, ax.pkg, null))), 'not_found', 'save_booking_tx: B''s booking') from ax, bx;
select isnt(pg_temp.try(format('select public.save_booking_tx(%L)', pg_temp.payload(null, bx.pkg, null))), 'ok', 'save_booking_tx: B''s package') from bx;
select is(public.booking_errors(pg_temp.payload(bx.bk2, ax.pkg, null) || '{"expectedUpdatedAt":"2000-01-01T00:00:00.000Z"}'), '{}'::jsonb, 'booking_errors: says nothing about B''s booking') from ax, bx;
select is(pg_temp.try(format('select public.create_invoice_tx(%L, ''full'', null, null, null)', bk2)), 'not_found', 'create_invoice_tx') from bx;
select is(public.invoice_result(inv), null, 'invoice_result: B''s invoice') from bx;
create function pg_temp.detail(p_sql text) returns text language plpgsql as $$ declare d text; begin execute p_sql; return 'ok'; exception when others then get stacked diagnostics d = pg_exception_detail; return d; end $$;
select is(pg_temp.detail(format('select public.below_paid_error(%L)', bk))::jsonb -> 'minimumTotal', 'null'::jsonb, 'below_paid_error: not B''s paid amount') from bx;
select pg_temp.owner();
select is(pg_temp.hash(w.b), hb.b, 'B is still unchanged') from w, hb;

-- ─── 9, 18 · Read-only workspace ────────────────────────────────────────────────────────────────
select pg_temp.owner();
update public.workspaces set status = 'read_only' where id = (select b from w);
create temp table h1 as select pg_temp.hash(b) b from w;
select pg_temp.be('00000000-0000-4000-8000-0000000018b1');
select is(public.count_bookings(), 2, 'read_only: reads work');
select ok(public.get_invoice_snapshot(inv::text) is not null, 'read_only: invoices can be read') from bx;
select is(public.get_settings() #>> '{business,name}', 'Studio B', 'read_only: business information is visible');
select is(pg_temp.try(s), 'forbidden', 'read_only: ' || n) from (
  select 'save_booking' n, format('select public.save_booking(%L)', pg_temp.payload(null, pkg, null)) s from bx
  union all select 'cancel_booking', format('select public.cancel_booking(%L)', bk2) from bx
  union all select 'create_invoice', format('select public.create_invoice(%L, ''full'')', bk2) from bx
  union all select 'save_booking_and_create_invoice', format('select public.save_booking_and_create_invoice(null, %L)', jsonb_build_object('bookingId', bk2, 'type', 'full')) from bx
  union all select 'save_package', 'select public.save_package(''{"name":"N","price":1,"description":""}'')'
  union all select 'archive_package', format('select public.archive_package(%L)', pkg) from bx
  union all select 'restore_package', format('select public.restore_package(%L)', pkg2) from bx
  union all select 'update_business', 'select public.update_business(''{"name":"NN","address":"J","email":"a@a.test","phone":"+62 21-555-0100"}'')') q;
select is(public.is_admin(), false, 'read_only: no logo upload (Storage policies use is_admin)');
select is(pg_temp.try('select public.update_display_name(''Still Me'')'), 'ok', 'read_only: own name still works');
select is(pg_temp.try('select public.mark_password_changed()'), 'ok', 'read_only: own password still works');
select pg_temp.owner();
select is(pg_temp.hash(w.b), h1.b, 'read_only: nothing changed') from w, h1;

-- ─── 8 · No data ────────────────────────────────────────────────────────────────────────────────
create function pg_temp.sees() returns text language sql as $$
  select concat_ws(' ', public.count_bookings(), (select count(*) from public.packages), (select count(*) from public.crew), (select count(*) from public.profiles),
    (select count(*) from public.invoices), coalesce(public.get_settings()::text, '-'), coalesce(public.my_profile()::text, '-'), public.is_staff(), public.is_admin(), jsonb_array_length(public.list_people('2026-11-10'))) $$;
update public.workspaces set status = 'closed' where id = (select b from w);
select pg_temp.be('00000000-0000-4000-8000-0000000018b1');
select is(pg_temp.sees(), '0 0 0 0 0 - - f f 0', 'closed workspace');
select is(pg_temp.try('select public.update_display_name(''Nope'')'), 'forbidden', 'closed workspace: not even the own name');
select pg_temp.owner();
update public.workspaces set status = 'active' where id = (select b from w);
select pg_temp.be('00000000-0000-4000-8000-0000000018b1', jsonb_build_object('amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now() - interval '2 days')::bigint))));
select is(pg_temp.sees(), '0 0 0 0 0 - - f f 0', 'yesterday''s session');
select pg_temp.be('00000000-0000-4000-8000-0000000018ff');
select is(pg_temp.sees(), '0 0 0 0 0 - - f f 0', 'an account without a profile');
select pg_temp.owner();
update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where id = '00000000-0000-4000-8000-0000000018b2';
select pg_temp.be('00000000-0000-4000-8000-0000000018b2');
select is(pg_temp.sees(), '0 0 0 0 0 - - f f 0', 'an inactive account');
select pg_temp.owner();

-- ─── 10, 15 · Accounts ──────────────────────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_app_meta_data) select x.id::uuid, x.email, x.meta from w, lateral (values
  ('00000000-0000-4000-8000-0000000018c1', 'c1@t.test', '{"role":"admin"}'::jsonb),
  ('00000000-0000-4000-8000-0000000018c2', 'c2@t.test', jsonb_build_object('workspace_id', w.b)),
  ('00000000-0000-4000-8000-0000000018c3', 'c3@t.test', '{"role":"admin","workspace_id":"not-a-uuid"}'::jsonb),
  ('00000000-0000-4000-8000-0000000018c4', 'c4@t.test', jsonb_build_object('role', 'admin', 'workspace_id', gen_random_uuid()))) x(id, email, meta);
select is((select count(*)::int from public.profiles where id::text like '%18c_'), 0, 'a role without a workspace, or the other way round, or a bad workspace: no account');
update public.workspaces set status = 'closed' where id = (select b from w);
select lives_ok($$ insert into auth.users (id, email, raw_app_meta_data) select '00000000-0000-4000-8000-0000000018c5', 'c5@t.test', jsonb_build_object('role', 'admin', 'workspace_id', b) from w $$, 'adding a login to a closed workspace');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000018c5'), 0, 'gives no account');
update public.workspaces set status = 'active' where id = (select b from w);
select lives_ok($$ update auth.users set raw_app_meta_data = '{"role":"crew"}' where id = '00000000-0000-4000-8000-0000000018c2' $$, 'a role set on a login without a workspace');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000018c2'), 0, 'gives no account either');
update auth.users set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('workspace_id', (select b from w)) where id = '00000000-0000-4000-8000-0000000018c1';
select is((select workspace_id from public.profiles where id = '00000000-0000-4000-8000-0000000018c1'), b, 'the workspace added later completes it') from w;
select throws_ok(format('update auth.users set raw_app_meta_data = raw_app_meta_data || %L where id = %L', jsonb_build_object('workspace_id', a), '00000000-0000-4000-8000-0000000018c1'), 'P0001', 'immutable', 'an account can''t be moved') from w;
update auth.users set raw_app_meta_data = raw_app_meta_data - 'workspace_id' where id = '00000000-0000-4000-8000-0000000018c1';
select is((select active from public.profiles where id = '00000000-0000-4000-8000-0000000018c1'), false, 'workspace removed → no access');
update auth.users set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('workspace_id', (select b from w)) where id = '00000000-0000-4000-8000-0000000018c1';
select is((select active from public.profiles where id = '00000000-0000-4000-8000-0000000018c1'), false, 'the workspace alone never reactivates');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"crew"}' where id = '00000000-0000-4000-8000-0000000018c1';
select is((select role || active from public.profiles where id = '00000000-0000-4000-8000-0000000018c1'), 'crewtrue', 'a new role does');
select is((select workspace_id from public.crew where user_id = '00000000-0000-4000-8000-0000000018c1'), b, 'its crew entry is in its workspace') from w;

-- ─── 13 · New code can't skip isolation ─────────────────────────────────────────────────────────
select is((select coalesce(string_agg(c.relname, ', ' order by 1), '') from pg_class c
            where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
              and (has_any_column_privilege('authenticated', c.oid, 'select') or has_any_column_privilege('anon', c.oid, 'select'))
              and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.cmd = 'SELECT' and p.qual like '%workspace_id = ( SELECT current_workspace_id()%')),
  '', 'every readable table is limited to the workspace');
select is((select coalesce(string_agg(p.tablename || '.' || p.policyname, ', '), '') from pg_policies p where p.schemaname = 'public' and p.qual not like '%current_workspace_id()%'), '', 'no other policy opens a table');
select is((select coalesce(string_agg(c.relname, ', '), '') from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
            and (has_table_privilege('authenticated', c.oid, 'insert') or has_table_privilege('authenticated', c.oid, 'update') or has_table_privilege('authenticated', c.oid, 'delete') or has_table_privilege('anon', c.oid, 'insert') or has_table_privilege('anon', c.oid, 'update') or has_table_privilege('anon', c.oid, 'delete'))),
  '', 'no direct writes on any table');
select is((select coalesce(string_agg(c.relname, ', '), '') from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname <> 'workspaces'
            and not exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'workspace_id' and a.attnotnull)), '', 'every table has a required workspace_id');
-- Reviewed 2026-11-25. A SECURITY DEFINER function bypasses row level security: add one here only after checking that
-- every id it receives is limited to current_workspace_id().
select is((select array_agg(p.oid::regprocedure::text order by 1) from (select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef order by p.oid::regprocedure::text) p),
  (select array_agg(x order by x) from unnest(array[
    'account_workspace(jsonb)', 'archive_package(uuid)', 'cancel_booking(uuid,text)', 'create_invoice(uuid,text,text,numeric,numeric)', 'current_workspace_id()',
    'ensure_crew_entry(uuid)', 'get_settings()', 'handle_new_user()', 'handle_user_role_change()', 'is_admin()', 'is_staff()', 'mark_password_changed()', 'my_profile()',
    'profiles_sync_crew()', 'restore_package(uuid)', 'save_booking(jsonb)', 'save_booking_and_create_invoice(jsonb,jsonb)', 'save_package(jsonb)',
    'update_business(jsonb)', 'update_display_name(text)']) x), 'every SECURITY DEFINER function is on the reviewed list');
select is((select coalesce(string_agg(p.oid::regprocedure::text, ', '), '') from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')), '', 'none of them is callable signed out');
select is((select coalesce(string_agg(p.oid::regprocedure::text, ', '), '') from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosrc ~* 'order by (s\.)?updated_at desc\s+limit 1'), '', 'nothing reads "the latest settings row"');
select * from finish();
rollback;
