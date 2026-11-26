#!/usr/bin/env bash
# P2 concurrency test (PRD §5.2 risk "concurrent invoices"): two create_invoice calls on one booking at the same
# time must yield exactly one invoice. Needs two real sessions, so it runs against the CI Supabase stack, not PGlite.
#   DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres supabase/scripts/concurrency.sh
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
ADMIN=00000000-0000-4000-8000-00000000cc01
PKG=00000000-0000-4000-8000-00000000cc02
psql_q() { psql "$DB_URL" -v ON_ERROR_STOP=1 -qAt "$@"; }
as_admin="set local role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"$ADMIN\",\"role\":\"authenticated\"}', true);"

psql_q <<SQL
insert into auth.users (id, email, aud, role, raw_app_meta_data) values ('$ADMIN', 'concurrency@example.test', 'authenticated', 'authenticated', jsonb_build_object('role', 'admin', 'workspace_id', (select id from public.workspaces where slug = 'main'))) on conflict do nothing;
insert into public.profiles (id, workspace_id, display_name, role) values ('$ADMIN', (select id from public.workspaces where slug = 'main'), 'Concurrency Admin', 'admin') on conflict (id) do update set role = 'admin';
insert into public.packages (id, workspace_id, name, price) values ('$PKG', (select id from public.workspaces where slug = 'main'), 'Concurrency Package', 1000000) on conflict do nothing;
SQL

BOOKING=$(psql_q -c "begin; $as_admin select (public.save_booking('{\"clientName\":\"Race Client\",\"clientPhone\":\"081234567890\",\"packageId\":\"$PKG\",\"bookingDate\":\"2026-12-31\",\"items\":[],\"crewIds\":[],\"terms\":\"\"}') ->> 'id'); commit;" | grep -E '^[0-9a-f-]{36}$')
echo "booking $BOOKING"

# A takes the row lock and holds it for 2 s before committing; B starts 0.5 s later and must wait for A.
( psql "$DB_URL" -qAt -c "begin; $as_admin select public.create_invoice('$BOOKING', 'full') #>> '{invoice,number}'; select pg_sleep(2); commit;" > /tmp/race_a.out 2>&1; echo "exit $?" >> /tmp/race_a.out ) &
sleep 0.5
( psql "$DB_URL" -qAt -c "begin; $as_admin select public.create_invoice('$BOOKING', 'full') #>> '{invoice,number}'; commit;" > /tmp/race_b.out 2>&1; echo "exit $?" >> /tmp/race_b.out ) &
wait

echo "--- A"; cat /tmp/race_a.out; echo "--- B"; cat /tmp/race_b.out
COUNT=$(psql_q -c "select count(*) from public.invoices where booking_id = '$BOOKING'")
STATUS=$(psql_q -c "select status from public.bookings where id = '$BOOKING'")
echo "invoices=$COUNT status=$STATUS"

fail=0
[ "$COUNT" = "1" ] || { echo "FAIL: expected exactly 1 invoice, got $COUNT"; fail=1; }
[ "$STATUS" = "paid" ] || { echo "FAIL: expected status paid, got $STATUS"; fail=1; }
grep -q "INV-" /tmp/race_a.out || { echo "FAIL: A did not get an invoice number"; fail=1; }
grep -q "booking_paid" /tmp/race_b.out || { echo "FAIL: B was not rejected with booking_paid after waiting (validateInvoice order)"; fail=1; }
[ $fail = 0 ] && echo "concurrency: OK — one invoice, the second call waited and was rejected"
exit $fail
