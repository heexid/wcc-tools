-- P1 · schema shape: tables, the columns the prototype added beyond the PRD, indexes, RLS on.
begin;
select plan(26);

select has_table('public', t, 'table ' || t) from unnest(array[
  'packages', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'invoice_counters',
  'booking_counters', 'profiles', 'crew', 'workspace_settings'
]) t;

-- Columns the prototype closed beyond PRD §4.2 (PRODUCTION-PLAN P1).
select has_column('public', 'packages', 'summary', 'packages.summary');
select has_column('public', 'packages', 'archived_at', 'packages.archived_at');
select has_column('public', 'bookings', 'payment_instruction', 'bookings.payment_instruction');
select has_column('public', 'invoices', 'issued_at', 'invoices.issued_at');
select hasnt_column('public', 'packages', 'legacy_bookings', 'packages.legacy_bookings is prototype-only');

-- Money is bigint (rule 1).
select col_type_is('public', 'packages', 'price', 'bigint', 'packages.price bigint');
select col_type_is('public', 'bookings', 'total', 'bigint', 'bookings.total bigint');
select col_type_is('public', 'invoices', 'amount', 'bigint', 'invoices.amount bigint');

-- Indexes (PRD §4.2).
select has_index('public', 'booking_crew', 'booking_crew_crew_id_idx', 'index booking_crew(crew_id)');
select has_index('public', 'bookings', 'bookings_booking_date_idx', 'index bookings(booking_date)');
select has_index('public', 'bookings', 'bookings_status_idx', 'index bookings(status)');
select has_index('public', 'invoices', 'invoices_booking_id_issued_idx', 'index invoices(booking_id, issued_at desc)');
select has_index('public', 'bookings', 'bookings_client_name_trgm', 'trigram index client_name');
select has_index('public', 'bookings', 'bookings_booking_name_trgm', 'trigram index booking_name');
select has_index('public', 'bookings', 'bookings_client_phone_trgm', 'trigram index client_phone');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'RLS is enabled on every public table'
);

select * from finish();
rollback;
