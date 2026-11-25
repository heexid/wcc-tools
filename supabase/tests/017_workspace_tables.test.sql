-- 016 · SD1: keys keep two workspaces apart, whatever a function does. (Reads and functions: SD2.)
begin;
select plan(38);

-- Workspace A = the seed. B is empty.
insert into public.workspaces (id, slug, name) values ('00000000-0000-4000-8000-0000000000b0', 'studio-b', 'Studio B');
insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000017b1', 'b17@t.test');
insert into public.profiles (id, display_name, role, workspace_id) values ('00000000-0000-4000-8000-0000000017b1', 'B Admin', 'admin', '00000000-0000-4000-8000-0000000000b0');
insert into public.packages (id, workspace_id, name, price) values ('00000000-0000-4000-8000-0000000017b2', '00000000-0000-4000-8000-0000000000b0', 'Gold Package', 5000);
insert into public.crew (id, workspace_id, name) values ('00000000-0000-4000-8000-0000000017b3', '00000000-0000-4000-8000-0000000000b0', 'B Crew');

create function pg_temp.a() returns uuid language sql as $$ select id from public.workspaces where slug = 'main' $$;
create function pg_temp.b() returns uuid language sql as $$ select '00000000-0000-4000-8000-0000000000b0'::uuid $$;
create function pg_temp.booking(ws uuid, pkg uuid, p_ref text default null) returns uuid language sql as $$
  insert into public.bookings (workspace_id, ref, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
  values (ws, p_ref, 'Client', '+6281234567890', pkg, 'P', 5000, '2026-12-01', '{"receiptName":"B","accountNumber":"12345","accountName":"B"}') returning id $$;
create function pg_temp.invoice(ws uuid, bk uuid, num text) returns uuid language sql as $$
  insert into public.invoices (workspace_id, booking_id, number, type, amount, snapshot, snapshot_hash)
  values (ws, bk, num, 'partial', 100, '{}', repeat('a', 64)) returning id $$;
create temp table ids as
  select pg_temp.booking(pg_temp.b(), '00000000-0000-4000-8000-0000000017b2') as bk,
         (select id from public.packages where name = 'Gold Package' and workspace_id = pg_temp.a()) as a_pkg,
         (select id from public.crew where name = 'Raka Pratama') as a_crew,
         (select id from public.bookings where ref = 'BK-2026-0144' and workspace_id = pg_temp.a()) as a_bk;

-- Workspaces
select throws_ok($$ insert into public.workspaces (slug, name) values ('studio-b', 'Again') $$, '23505', null, 'slug is unique');
select throws_ok($$ insert into public.workspaces (slug, name) values ('Bad Slug', 'X Y') $$, '23514', null, 'slug format');
select throws_ok($$ insert into public.workspaces (slug, name, status) values ('odd', 'X Y', 'paused') $$, '23514', null, 'status values');
select ok(not has_table_privilege('authenticated', 'public.workspaces', 'select'), 'workspaces are not readable through the API');

-- No silent default once there are two
select is(public.only_workspace(), null, 'two workspaces → no default');
select throws_ok($$ insert into public.crew (name) values ('Lost') $$, '23502', null, 'crew must name its workspace');
select throws_ok($$ insert into public.packages (name, price) values ('Lost', 1) $$, '23502', null, 'package must name its workspace');
select throws_ok($$ select public.next_invoice_number(2026) $$, '23502', null, 'numbering must name its workspace');
select throws_ok($$ insert into public.crew (workspace_id, name) values (gen_random_uuid(), 'Nowhere') $$, '23503', null, 'the workspace must exist');

select is((select workspace_id from public.crew where user_id = '00000000-0000-4000-8000-0000000017b1'), pg_temp.b(), 'an account''s crew entry is in its workspace');
insert into auth.users (id, email, raw_app_meta_data) select '00000000-0000-4000-8000-0000000017b4', 'steal@t.test', jsonb_build_object('crew_id', a_crew) from ids;
insert into public.profiles (id, display_name, role, workspace_id) values ('00000000-0000-4000-8000-0000000017b4', 'Link Try', 'crew', pg_temp.b());
select is((select user_id from public.crew where id = (select a_crew from ids)), null, 'crew_id can''t link another workspace''s entry');

-- Another workspace's rows can't be used
select throws_ok(format($$ select pg_temp.booking(pg_temp.b(), %L) $$, a_pkg), '23503', null, 'booking with another workspace''s package') from ids;
select throws_ok(format($$ update public.bookings set package_id = %L where id = %L $$, a_pkg, bk), '23503', null, 'booking moved to another workspace''s package') from ids;
select throws_ok(format($$ insert into public.booking_crew (workspace_id, booking_id, crew_id) values (pg_temp.b(), %L, %L) $$, bk, a_crew), '23503', null, 'another workspace''s crew') from ids;
select throws_ok(format($$ insert into public.booking_crew (workspace_id, booking_id, crew_id) values (pg_temp.a(), %L, %L) $$, bk, a_crew), '23503', null, 'another workspace''s booking (crew)') from ids;
select throws_ok(format($$ insert into public.booking_items (workspace_id, booking_id, name, price, qty) values (pg_temp.a(), %L, 'x', 1, 1) $$, bk), '23503', null, 'another workspace''s booking (item)') from ids;
select throws_ok(format($$ select pg_temp.invoice(pg_temp.a(), %L, 'INV-2099-0001') $$, bk), '23503', null, 'another workspace''s booking (invoice)') from ids;
update public.crew set user_id = null where user_id = '00000000-0000-4000-8000-0000000017b1';
select throws_ok($$ insert into public.crew (workspace_id, name, user_id) values (pg_temp.a(), 'Cross', '00000000-0000-4000-8000-0000000017b1') $$, '23503', null, 'crew linked to another workspace''s account');
select throws_ok(format($$ update public.bookings set created_by = '00000000-0000-4000-8000-0000000017b1' where id = %L $$, a_bk), '23503', null, 'created by another workspace''s account') from ids;
select throws_ok(format($$ update public.bookings set canceled_by = '00000000-0000-4000-8000-0000000017b1' where id = %L $$, a_bk), '23503', null, 'canceled by another workspace''s account') from ids;
select throws_ok($$ update public.workspace_settings set updated_by = '00000000-0000-4000-8000-0000000017b1' $$, '23503', null, 'settings updated by another workspace''s account');
select lives_ok(format($$ insert into public.booking_crew (workspace_id, booking_id, crew_id) values (pg_temp.b(), %L, '00000000-0000-4000-8000-0000000017b3') $$, bk), 'its own crew works') from ids;

update public.crew set user_id = '00000000-0000-4000-8000-0000000017b1' where name = 'B Admin';

-- Never moves
select throws_ok($$ update public.crew set workspace_id = pg_temp.a() where id = '00000000-0000-4000-8000-0000000017b3' $$, 'P0001', 'immutable', 'crew stays');
select throws_ok($$ update public.packages set workspace_id = pg_temp.a() where id = '00000000-0000-4000-8000-0000000017b2' $$, 'P0001', 'immutable', 'package stays');
select throws_ok($$ update public.profiles set workspace_id = pg_temp.a() where id = '00000000-0000-4000-8000-0000000017b1' $$, 'P0001', 'immutable', 'account stays');
select throws_ok($$ update public.workspace_settings set workspace_id = pg_temp.b() $$, 'P0001', 'immutable', 'settings stay');
select throws_ok($$ update public.booking_counters set workspace_id = pg_temp.b() where workspace_id = pg_temp.a() $$, 'P0001', 'immutable', 'counter stays');

-- Unique per workspace, and only per workspace
select is((select ref from public.bookings where id = bk), 'BK-' || public.studio_year() || '-0001', 'B''s bookings start at 0001') from ids;
select is(public.next_invoice_number(pg_temp.b(), 2026), 'INV-2026-0001', 'B''s invoices start at 0001');
select is(public.next_invoice_number(pg_temp.b(), 2026), 'INV-2026-0002', 'and continue');
select isnt(public.next_invoice_number(pg_temp.a(), 2026), 'INV-2026-0003', 'A keeps its own numbering');
select lives_ok($$ select pg_temp.booking(pg_temp.b(), '00000000-0000-4000-8000-0000000017b2', 'BK-2026-0144') $$, 'the same booking ref in two workspaces');
select throws_ok($$ select pg_temp.booking(pg_temp.b(), '00000000-0000-4000-8000-0000000017b2', 'BK-2026-0144') $$, '23505', null, 'but once per workspace');
select lives_ok(format($$ select pg_temp.invoice(pg_temp.b(), %L, 'INV-2026-0187') $$, bk), 'the same invoice number in two workspaces') from ids;
select throws_ok(format($$ select pg_temp.invoice(pg_temp.b(), %L, 'INV-2026-0187') $$, bk), '23505', null, 'but once per workspace') from ids;
select throws_ok($$ insert into public.packages (workspace_id, name, price) values (pg_temp.b(), 'gold package', 1) $$, '23505', null, 'active package names: once per workspace');

-- Deleting an account clears the links, not the workspace
delete from auth.users where id = '00000000-0000-4000-8000-0000000017b1';
select is((select count(*)::int from public.crew where name = 'B Admin' and workspace_id = pg_temp.b() and user_id is null), 1, 'a deleted account unlinks its crew entry');
select throws_ok($$ delete from public.workspaces where slug = 'studio-b' $$, '23503', null, 'a workspace with data can''t be deleted');
select * from finish();
rollback;
