-- P1 · check constraints (PRD §2.4 rules 1, 9, 10; §4.2 limits) and the shape guards.
begin;
select plan(30);

insert into public.packages (id, name, price) values ('00000000-0000-0000-0000-00000000a001', 'Test Package', 1000000);
insert into public.bookings (id, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
values ('00000000-0000-0000-0000-00000000b001', 'Test Client', '+6281234567890', '00000000-0000-0000-0000-00000000a001', 'Test Package', 1000000, '2026-12-01',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}');

prepare pkg(bigint, text, text) as insert into public.packages (name, price, description) values ($2, $1, $3);
select throws_ok($$ execute pkg(-1, 'Neg', '') $$, '23514', null, 'package price < 0 rejected (rule 9)');
select lives_ok($$ execute pkg(0, 'Free', '') $$, 'package price 0 ok');
select lives_ok($$ execute pkg(1, 'Long ok', repeat('x', 1000)) $$, 'description 1000 ok');
select throws_ok($$ execute pkg(1, 'Long bad', repeat('x', 1001)) $$, '23514', null, 'description 1001 rejected');
select throws_ok($$ execute pkg(1, '  Padded', '') $$, '23514', null, 'package name must be trimmed');
select throws_ok($$ execute pkg(1, 'test package', '') $$, '23505', null, 'duplicate active name, case-insensitive');
update public.packages set is_active = false, archived_at = now() where name = 'Free';
select lives_ok($$ execute pkg(5, 'Free', '') $$, 'an archived name can be reused');
select throws_ok($$ update public.packages set is_active = false where name = 'Long ok' $$, '23514', null, 'archived needs archived_at');

prepare item(bigint, int) as insert into public.booking_items (booking_id, name, price, qty) values ('00000000-0000-0000-0000-00000000b001', 'x', $1, $2);
select throws_ok($$ execute item(-1, 1) $$, '23514', null, 'item price < 0 rejected (rule 9)');
select throws_ok($$ execute item(1, 0) $$, '23514', null, 'qty 0 rejected');
select throws_ok($$ execute item(1, 1000) $$, '23514', null, 'qty 1000 rejected');
select lives_ok($$ execute item(0, 999) $$, 'qty 999, price 0 ok');
select throws_ok($$ insert into public.booking_items (booking_id, name, price, qty) values ('00000000-0000-0000-0000-00000000b001', '  ', 1, 1) $$, '23514', null, 'blank item name rejected');

prepare upd_b(text, text) as update public.bookings set terms = coalesce($1, terms), cancel_reason = $2 where id = '00000000-0000-0000-0000-00000000b001';
select lives_ok($$ execute upd_b(repeat('t', 255), null) $$, 'terms 255 ok');
select throws_ok($$ execute upd_b(repeat('t', 256), null) $$, '23514', null, 'terms 256 rejected');
select throws_ok($$ execute upd_b(null, repeat('r', 256)) $$, '23514', null, 'cancel_reason 256 rejected');

select throws_ok($$ update public.bookings set client_phone = '081234567890' where id = '00000000-0000-0000-0000-00000000b001' $$, '23514', null, 'phone must be normalised +62…');
select throws_ok($$ update public.bookings set client_name = 'A' where id = '00000000-0000-0000-0000-00000000b001' $$, '23514', null, 'client name < 2 rejected');
select throws_ok($$ update public.bookings set client_name = repeat('a', 81) where id = '00000000-0000-0000-0000-00000000b001' $$, '23514', null, 'client name > 80 rejected');
select throws_ok($$ update public.bookings set payment_instruction = '{"receiptName":"BCA","accountNumber":"12ab","accountName":"X"}' where id = '00000000-0000-0000-0000-00000000b001' $$, '23514', null, 'account number digits only');
select throws_ok($$ update public.bookings set payment_instruction = '{"receiptName":"BCA"}' where id = '00000000-0000-0000-0000-00000000b001' $$, '23514', null, 'payment instruction needs every field');

select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b001', 'INV-2099-0001', 'full', 0, '{}', repeat('a', 64)) $$,
  '23514', null, 'invoice amount 0 rejected');
select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b001', 'INV-2099-0002', 'dp', 100, '{}', repeat('a', 64)) $$,
  '23514', null, 'a DP invoice needs a dp_method');
select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, dp_method, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b001', 'INV-2099-0003', 'dp', 'percentage', 100, '{}', repeat('a', 64)) $$,
  '23514', null, 'a percentage DP needs dp_percentage');
select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, dp_method, dp_percentage, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b001', 'INV-2099-0004', 'dp', 'fixed', 10, 100, '{}', repeat('a', 64)) $$,
  '23514', null, 'a fixed DP carries no percentage');
select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b001', 'INV-26-1', 'full', 100, '{}', repeat('a', 64)) $$,
  '23514', null, 'invoice number format INV-YYYY-NNNN');
select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b001', 'INV-2099-0005', 'full', 1000001, '{}', repeat('a', 64)) $$,
  '23514', null, 'paying more than the total is rejected (total_paid <= total)');

insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000f1'); -- no app role → no trigger profile (005)
select throws_ok($$ insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-0000000000f1', 'A') $$, '23514', null, 'display name < 2 rejected');
select throws_ok($$ insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-0000000000f1', repeat('a', 51)) $$, '23514', null, 'display name > 50 rejected');
select throws_ok($$ insert into public.profiles (id, display_name, role) values ('00000000-0000-0000-0000-0000000000f1', 'Owner', 'owner') $$, '23514', null, 'role must be admin | crew');

select * from finish();
rollback;
