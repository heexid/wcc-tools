-- P1 · invoices are append-only (rules 3, 4); bookings are never deleted (US-12).
begin;
select plan(9);

insert into public.packages (id, name, price) values ('00000000-0000-0000-0000-00000000a001', 'Append Package', 1000000);
insert into public.bookings (id, ref, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
values ('00000000-0000-0000-0000-00000000b001', 'BK-2031-0500', 'Append Client', '+6281234567890', '00000000-0000-0000-0000-00000000a001', 'Append Package', 1000000, '2031-04-01',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}');
insert into public.invoices (id, booking_id, number, type, dp_method, dp_percentage, amount, snapshot, snapshot_hash)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000b001', 'INV-2031-0500', 'dp', 'percentage', 40, 400000,
        '{"total":1000000}', repeat('a', 64));

select lives_ok($$ update public.invoices set pdf_path = 'invoices/INV-2031-0500.pdf' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'pdf_path may be set');
select is((select pdf_path from public.invoices where id = '00000000-0000-0000-0000-0000000000d1'), 'invoices/INV-2031-0500.pdf', 'pdf_path stored');
select throws_ok($$ update public.invoices set amount = 1 where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', 'append_only', 'amount cannot change');
select throws_ok($$ update public.invoices set snapshot = '{"total":1}' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', 'append_only', 'snapshot cannot change (rule 4)');
select throws_ok($$ update public.invoices set pdf_path = 'x', number = 'INV-2031-0501' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', 'append_only', 'pdf_path plus another column is rejected');
select throws_ok($$ delete from public.invoices where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', 'append_only', 'invoices cannot be deleted (rule 3)');
select throws_ok($$ truncate public.invoices cascade $$, 'P0001', 'append_only', 'invoices cannot be truncated');
select throws_ok($$ delete from public.bookings where id = '00000000-0000-0000-0000-00000000b001' $$, 'P0001', 'no_delete', 'bookings cannot be deleted');
select is((select count(*)::int from public.invoices where id = '00000000-0000-0000-0000-0000000000d1'), 1, 'the invoice is still there');

select * from finish();
rollback;
