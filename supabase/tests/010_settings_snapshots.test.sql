-- P8 · changing workspace settings never changes an existing invoice; new bookings / invoices use the new values.
begin;
select plan(6);

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-4000-8000-0000000000e9', 'p8@bs-moment.test', '{"role":"admin"}');
create temp table before as select id, snapshot, snapshot_hash from public.invoices;

update public.workspace_settings set
  default_payment = '{"receiptName":"Bank Mandiri","accountNumber":"9988776655","accountName":"bs.moment New"}',
  default_terms = 'New terms from P8.',
  business_name = 'Studio Baru';

select is((select count(*)::int from public.invoices i join before b using (id) where i.snapshot = b.snapshot and i.snapshot_hash = b.snapshot_hash),
          (select count(*)::int from before), 'every existing invoice keeps its snapshot and hash');
select is((select count(*)::int from public.invoices where snapshot_hash <> public.snapshot_hash(snapshot)), 0, 'stored hashes still verify');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e9"}', true);
create temp table nb as select (public.save_booking(jsonb_build_object(
  'clientName', 'P8 Client', 'clientPhone', '081234567890', 'bookingDate', '2026-12-30', 'items', '[]'::jsonb, 'crewIds', '[]'::jsonb, 'terms', '',
  'packageId', (select id from public.packages where name = 'Silver Package'))) ->> 'id')::uuid as id;
grant select on nb to authenticated;
select is((select payment_instruction ->> 'receiptName' from public.bookings where id = (select id from nb)), 'Bank Mandiri', 'a new booking gets the new default payment instruction');
create temp table ni as select public.create_invoice((select id from nb), 'full') as r;
reset role;
select is((select r #>> '{invoice,snapshot,booking,paymentInstruction,accountNumber}' from ni), '9988776655', 'its invoice snapshot freezes the new bank details');
select is((select r #>> '{invoice,snapshot,business,name}' from ni), 'Studio Baru', 'and the business at issue time');
select is((select snapshot #>> '{booking,paymentInstruction,receiptName}' from public.invoices where number = 'INV-2026-0187'), 'Bank BCA', 'an old invoice still shows the bank it was issued with');

select * from finish();
rollback;
