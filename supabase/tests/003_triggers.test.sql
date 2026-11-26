-- P1 · derived fields (rule 2, §2.5 status), ref numbering, cancel guards (rule 12).
begin;
select plan(27);

insert into public.packages (id, name, price) values ('00000000-0000-0000-0000-00000000a001', 'Trigger Package', 2000000);

-- A client-sent total / paid / status is overwritten; ref is assigned from the counter.
insert into public.booking_counters (year, last_value) values (2031, 41);
insert into public.bookings (id, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction, total, total_paid, status, created_at)
values ('00000000-0000-0000-0000-00000000b001', 'Trigger Client', '+6281234567890', '00000000-0000-0000-0000-00000000a001', 'Trigger Package', 2000000, '2031-03-01',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}', 1, 0, 'paid', '2031-01-05 10:00+07');

select is((select ref from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 'BK-2031-0042', 'ref = next BK-YYYY-NNNN for the creation year');
select is((select last_value from public.booking_counters where year = 2031), 42, 'booking counter advanced');
select is((select total from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 2000000::bigint, 'client total ignored: total = package price');
select is((select status from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 'draft', 'new booking with no invoice → draft');

-- Items drive the total.
insert into public.booking_items (id, booking_id, name, price, qty) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000b001', 'Extra hour', 500000, 2),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000b001', 'Album', 750000, 1);
select is((select total from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 3750000::bigint, 'items added → total = package + Σ price × qty');
update public.booking_items set qty = 3 where id = '00000000-0000-0000-0000-0000000000c1';
select is((select total from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 4250000::bigint, 'item qty changed → total follows');
delete from public.booking_items where id = '00000000-0000-0000-0000-0000000000c2';
select is((select total from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 3500000::bigint, 'item removed → total follows');
update public.bookings set package_price_snapshot = 2500000 where id = '00000000-0000-0000-0000-00000000b001';
select is((select total from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 4000000::bigint, 'package price snapshot changed → total follows');
update public.bookings set total = 1, total_paid = 999, status = 'paid' where id = '00000000-0000-0000-0000-00000000b001';
select results_eq(
  $$ select total, total_paid, status from public.bookings where id = '00000000-0000-0000-0000-00000000b001' $$,
  $$ values (4000000::bigint, 0::bigint, 'draft') $$,
  'direct writes to derived columns are recomputed away');

-- Status path: DP → partially_paid → Paid → paid.
prepare inv(text, text, bigint) as insert into public.invoices (booking_id, number, type, dp_method, dp_percentage, amount, snapshot, snapshot_hash)
  values ('00000000-0000-0000-0000-00000000b001', $1, $2, case when $2 = 'dp' then 'fixed' end, null, $3, '{}', repeat('a', 64));
execute inv('INV-2031-0001', 'dp', 1000000);
select results_eq(
  $$ select total_paid, status from public.bookings where id = '00000000-0000-0000-0000-00000000b001' $$,
  $$ values (1000000::bigint, 'partially_paid') $$, 'first DP → partially_paid, total_paid = DP');
execute inv('INV-2031-0002', 'partial', 500000);
select is((select total_paid from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 1500000::bigint, 'partial adds to total_paid');

execute inv('INV-2031-0003', 'paid', 2500000);
select results_eq(
  $$ select total_paid, status from public.bookings where id = '00000000-0000-0000-0000-00000000b001' $$,
  $$ values (4000000::bigint, 'paid') $$, 'Paid for the remaining → paid');

-- Rule 10 backstop: once paid in full, removing an item would drop the total below what's paid.
select throws_ok($$ delete from public.booking_items where id = '00000000-0000-0000-0000-0000000000c1' $$, '23514', null, 'edit making total < total_paid rejected (rule 10)');
select lives_ok($$ update public.bookings set booking_name = 'Still editable' where id = '00000000-0000-0000-0000-00000000b001' $$, 'an edit that keeps total >= paid is fine');

-- Raising the total of a paid booking re-opens it (PLAN §3 "Paid after edit increase").
insert into public.booking_items (booking_id, name, price, qty) values ('00000000-0000-0000-0000-00000000b001', 'Drone', 1500000, 1);
select is((select status from public.bookings where id = '00000000-0000-0000-0000-00000000b001'), 'partially_paid', 'paid booking + new item → partially_paid');

-- A voided invoice (v1.1) does not count — checked via a second booking with a Full invoice.
insert into public.bookings (id, ref, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
values ('00000000-0000-0000-0000-00000000b002', 'BK-2031-0900', 'Full Client', '+6281234567891', '00000000-0000-0000-0000-00000000a001', 'Trigger Package', 2000000, '2031-03-02',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}');
insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
  values ('00000000-0000-0000-0000-00000000b002', 'INV-2031-0010', 'full', 2000000, '{}', repeat('a', 64));
select is((select status from public.bookings where id = '00000000-0000-0000-0000-00000000b002'), 'paid', 'first Full → paid');
select is((select ref from public.bookings where id = '00000000-0000-0000-0000-00000000b002'), 'BK-2031-0900', 'an explicit ref is kept');
select throws_ok($$ update public.bookings set ref = 'BK-2031-0901' where id = '00000000-0000-0000-0000-00000000b002' $$, 'P0001', 'immutable', 'ref never changes');

-- updated_at moves on a real edit, not on a recompute. (now() is fixed inside a transaction, so start from a past value.)
update public.bookings set updated_at = '2031-01-01 00:00+07' where id = '00000000-0000-0000-0000-00000000b002';
update public.bookings set total = total where id = '00000000-0000-0000-0000-00000000b002';
select is((select updated_at from public.bookings where id = '00000000-0000-0000-0000-00000000b002'), '2031-01-01 00:00+07'::timestamptz, 'recompute alone keeps updated_at');
update public.bookings set booking_name = 'Renamed' where id = '00000000-0000-0000-0000-00000000b002';
select ok((select updated_at from public.bookings where id = '00000000-0000-0000-0000-00000000b002') > '2031-01-01 00:00+07'::timestamptz, 'a real edit moves updated_at (real time, ≥ 1 ms later)');

-- Cancel: status canceled, terminal, no new invoices.
insert into public.bookings (id, ref, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
values ('00000000-0000-0000-0000-00000000b003', 'BK-2031-0901', 'Cancel Client', '+6281234567892', '00000000-0000-0000-0000-00000000a001', 'Trigger Package', 2000000, '2031-03-03',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}');
update public.bookings set canceled_at = now(), cancel_reason = 'Client chose another vendor.' where id = '00000000-0000-0000-0000-00000000b003';
select is((select status from public.bookings where id = '00000000-0000-0000-0000-00000000b003'), 'canceled', 'canceled_at set → canceled');
select throws_ok($$ update public.bookings set canceled_at = null where id = '00000000-0000-0000-0000-00000000b003' $$, 'P0001', 'canceled', 'cancel cannot be reverted (rule 12)');
select throws_ok(
  $$ insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
     values ('00000000-0000-0000-0000-00000000b003', 'INV-2031-0020', 'full', 2000000, '{}', repeat('a', 64)) $$,
  'P0001', 'canceled', 'no invoice on a canceled booking (rule 12)');
select is((select status from public.bookings where id = '00000000-0000-0000-0000-00000000b003'), 'canceled', 'status stays canceled');

-- next_invoice_number is atomic per year and not callable by API roles.
select is(next_invoice_number(test_only.ws(), 2032), 'INV-2032-0001', 'first number of a new year');
select is(next_invoice_number(test_only.ws(), 2032), 'INV-2032-0002', 'second number follows');
select ok(not has_function_privilege('authenticated', 'public.next_invoice_number(uuid, int)', 'execute'), 'authenticated cannot call next_invoice_number');

select * from finish();
rollback;
