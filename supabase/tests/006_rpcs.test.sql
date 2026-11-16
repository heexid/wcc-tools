-- P2 · RPC behaviour the parity vectors don't cover: who may call, atomicity, cancel rules, numbering,
-- snapshot shape and hash. Field-level rule parity lives in tests/vectors/*.json (npm run test:parity).
begin;
select plan(30);

-- Fixtures: an admin and a viewer, one package, as the table owner.
insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000a1'), ('00000000-0000-4000-8000-0000000000a2');
insert into public.profiles (id, display_name, role) values
  ('00000000-0000-4000-8000-0000000000a1', 'Test Admin', 'admin'),
  ('00000000-0000-4000-8000-0000000000a2', 'Test Viewer', 'viewer')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;
insert into public.packages (id, name, price, summary) values ('00000000-0000-4000-8000-00000000a001', 'RPC Package', 4000000, '4-hour test');

create temp table t (k text primary key, v text);
grant all on t to authenticated, anon;
create function pg_temp.payload(p_name text default 'Rpc Client') returns jsonb language sql as $$
  select jsonb_build_object('clientName', p_name, 'clientPhone', '081234567890', 'packageId', '00000000-0000-4000-8000-00000000a001',
                            'bookingDate', '2026-12-20', 'items', '[{"name":"Album","price":1000000,"qty":1}]'::jsonb, 'crewIds', '[]'::jsonb, 'terms', 'T&C')
$$;

-- ── Grants and roles ────────────────────────────────────────────────────────────────────────────
select ok(has_function_privilege('authenticated', 'public.save_booking(jsonb)', 'execute'), 'authenticated may call save_booking');
select ok(has_function_privilege('authenticated', 'public.create_invoice(uuid, text, text, numeric, numeric)', 'execute'), 'authenticated may call create_invoice');
select ok(has_function_privilege('authenticated', 'public.cancel_booking(uuid, text)', 'execute'), 'authenticated may call cancel_booking');
select ok(not has_function_privilege('anon', 'public.save_booking(jsonb)', 'execute'), 'anon may not call save_booking');
select ok(not has_function_privilege('anon', 'public.create_invoice(uuid, text, text, numeric, numeric)', 'execute'), 'anon may not call create_invoice');
select ok(not has_function_privilege('authenticated', 'public.save_booking_tx(jsonb)', 'execute'), 'internal save_booking_tx is not callable');
select ok(not has_function_privilege('authenticated', 'public.create_invoice_tx(uuid, text, text, numeric, numeric)', 'execute'), 'internal create_invoice_tx is not callable');
select ok(not has_function_privilege('authenticated', 'public.invoice_amount(bigint, bigint, int, boolean, text, text, numeric, numeric)', 'execute'), 'internal invoice_amount is not callable');

-- Viewer: every write RPC raises 'forbidden' (INTERACTIONS 6.4 — enforced server-side, not just hidden).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a2"}', true);
select throws_ok($$ select public.save_booking(pg_temp.payload()) $$, 'P0001', 'forbidden', 'viewer: save_booking forbidden');
select throws_ok($$ select public.create_invoice('00000000-0000-4000-8000-00000000b999', 'full') $$, 'P0001', 'forbidden', 'viewer: create_invoice forbidden');
select throws_ok($$ select public.cancel_booking('00000000-0000-4000-8000-00000000b999') $$, 'P0001', 'forbidden', 'viewer: cancel_booking forbidden');
select is(public.is_admin(), false, 'is_admin() is false for a viewer');

-- No JWT at all (an authenticated role without a subject) is not an admin either.
select set_config('request.jwt.claims', '', true);
select throws_ok($$ select public.save_booking(pg_temp.payload()) $$, 'P0001', 'forbidden', 'no subject: forbidden');

-- ── Admin path ──────────────────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1"}', true);
insert into t select 'b1', public.save_booking(pg_temp.payload()) ->> 'id';
select throws_ok($$ select public.save_booking(pg_temp.payload() || '{"id":"00000000-0000-4000-8000-00000000b999"}') $$, 'P0001', 'not_found', 'save_booking on an unknown id → not_found');
select throws_ok($$ select public.save_booking(pg_temp.payload() || '{"id":"not-a-uuid"}') $$, 'P0001', 'not_found', 'save_booking on a malformed id → not_found (no cast error)');
select throws_ok($$ select public.create_invoice('00000000-0000-4000-8000-00000000b999', 'full') $$, 'P0001', 'not_found', 'create_invoice on an unknown booking → not_found');

-- booking_invalid carries the field map in DETAIL.
create function pg_temp.detail_of(p_sql text) returns jsonb language plpgsql as $$
declare d text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics d = pg_exception_detail;
  return d::jsonb;
end $$;
select is(pg_temp.detail_of($$ select public.save_booking(pg_temp.payload('') || '{"bookingDate":null}') $$),
          '{"clientName":"required","bookingDate":"required"}'::jsonb, 'booking_invalid DETAIL = BookingErrors JSON');

-- Atomic save + invoice: a rejected invoice leaves no new booking behind (Bookings 23 "Nothing was saved").
select throws_ok($$ select public.save_booking_and_create_invoice(pg_temp.payload('Atomic Client'), '{"type":"partial","amount":1}') $$,
                 'P0001', 'type_not_allowed', 'save + invoice: invoice rejected');
reset role;
select is((select count(*)::int from public.bookings where client_name = 'Atomic Client'), 0, 'save + invoice: the booking was rolled back too');
set local role authenticated;

insert into t select 'r1', public.save_booking_and_create_invoice(pg_temp.payload('Atomic Two'), '{"type":"dp","dp":{"method":"percentage","value":25}}')::text;
reset role;
select results_eq(
  $$ select (v::jsonb #>> '{invoice,amount}')::bigint, v::jsonb #>> '{booking,status}', v::jsonb #>> '{invoice,type}' from t where k = 'r1' $$,
  $$ values (1250000::bigint, 'partially_paid', 'dp') $$,
  'save + invoice: DP 25 % of 5 000 000 saved together, status partially_paid');

-- ── Snapshot shape and hash ─────────────────────────────────────────────────────────────────────
select is(
  (select array_agg(k order by k) from jsonb_object_keys((select snapshot from public.invoices i join public.bookings b on b.id = i.booking_id where b.client_name = 'Atomic Two')) k),
  array['amount','booking','business','createdBy','dpMethod','dpPercentage','invoiceNumber','issuedAt','paidAfter','paidBefore','remainingAfter','total','type'],
  'snapshot has exactly the prototype InvoiceSnapshot keys');
select is(
  (select snapshot #>> '{booking,packageSummary}' || ' | ' || (snapshot ->> 'createdBy') || ' | ' || (snapshot #>> '{business,name}')
     from public.invoices i join public.bookings b on b.id = i.booking_id where b.client_name = 'Atomic Two'),
  '4-hour test | Test Admin | bs.moment',
  'snapshot carries the package summary, the actor''s display name and the business');
select ok(
  (select snapshot_hash = public.snapshot_hash(snapshot) from public.invoices i join public.bookings b on b.id = i.booking_id where b.client_name = 'Atomic Two'),
  'stored hash = sha256(canonical snapshot)');
-- Cross-implementation: the seeded hashes were computed in TypeScript (stableStringify + sha256).
select is((select count(*)::int from public.invoices where snapshot_hash <> public.snapshot_hash(snapshot) and number like 'INV-2026-%' and booking_id in (select id from public.bookings where client_name not like 'Atomic%')),
          0, 'SQL canonical_json + sha256 reproduces every TypeScript-computed seed hash');

-- ── Numbering ───────────────────────────────────────────────────────────────────────────────────
-- A number already taken above the counter is skipped, never reused (prototype nextNumber).
insert into public.bookings (id, ref, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
values ('00000000-0000-4000-8000-00000000b003', 'BK-2099-0002', 'Taken Client', '+6281234567890', '00000000-0000-4000-8000-00000000a001', 'RPC Package', 4000000, '2026-12-22',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}');
insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash)
select '00000000-0000-4000-8000-00000000b003', 'INV-' || public.studio_year() || '-' || lpad((last_value + 1)::text, 4, '0'), 'full', 4000000, '{}', repeat('a', 64)
  from public.invoice_counters where year = public.studio_year();
insert into public.bookings (id, ref, client_name, client_phone, package_id, package_name_snapshot, package_price_snapshot, booking_date, payment_instruction)
values ('00000000-0000-4000-8000-00000000b002', 'BK-2099-0001', 'Skip Client', '+6281234567890', '00000000-0000-4000-8000-00000000a001', 'RPC Package', 4000000, '2026-12-21',
        '{"receiptName":"Bank BCA","accountNumber":"1234567890","accountName":"bs.moment Studio"}');
set local role authenticated;
insert into t select 'n2', public.create_invoice('00000000-0000-4000-8000-00000000b002', 'full') #>> '{invoice,number}';
reset role;
select is((select v from t where k = 'n2'),
          'INV-' || public.studio_year() || '-' || lpad((select last_value from public.invoice_counters where year = public.studio_year())::text, 4, '0'),
          'create_invoice skips a taken number and uses the next free one');
select is((select count(distinct number)::int from public.invoices), (select count(*)::int from public.invoices), 'invoice numbers stay unique');

-- ── Cancel (US-12, rule 12) ─────────────────────────────────────────────────────────────────────
set local role authenticated;
select throws_ok($$ select public.cancel_booking('00000000-0000-4000-8000-00000000b002') $$, 'P0001', 'not_allowed', 'a Paid booking cannot be canceled');
select throws_ok($$ select public.cancel_booking((select v::uuid from t where k = 'b1'), repeat('r', 256)) $$, 'P0001', 'reason_too_long', 'reason > 255 rejected');
insert into t select 'c1', public.cancel_booking((select v::uuid from t where k = 'b1'), '  Client chose another vendor.  ') ->> 'status';
select throws_ok($$ select public.cancel_booking((select v::uuid from t where k = 'b1')) $$, 'P0001', 'not_allowed', 'canceling twice → not_allowed');
reset role;
select results_eq(
  $$ select status, cancel_reason, canceled_by::text from public.bookings where id = (select v::uuid from t where k = 'b1') $$,
  $$ values ('canceled', 'Client chose another vendor.', '00000000-0000-4000-8000-0000000000a1') $$,
  'cancel: status canceled, reason trimmed, canceled_by = the admin');

select * from finish();
rollback;
