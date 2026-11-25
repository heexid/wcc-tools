-- One workspace's data as a single JSON document (SHARED-DATABASE-PLAN SD5). Read only. Contains client data: keep private.
-- Run: replace my-studio below, then
--   app/node_modules/.bin/supabase db query --linked -f supabase/scripts/export-workspace.sql -o json > studio.json
-- No passwords. Files are listed, not included: copy them with `supabase storage cp -r`.
with w as (select * from public.workspaces where slug = 'my-studio' /* EDIT */)
select jsonb_build_object(
  'exportedAt', now(),
  'workspace', to_jsonb(w),
  'settings', (select to_jsonb(s) from public.workspace_settings s where s.workspace_id = w.id),
  'accounts', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object('email', u.email) order by p.created_at), '[]') from public.profiles p join auth.users u on u.id = p.id where p.workspace_id = w.id),
  'crew', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at, x.id), '[]') from public.crew x where x.workspace_id = w.id),
  'packages', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at, x.id), '[]') from public.packages x where x.workspace_id = w.id),
  'bookings', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at, x.id), '[]') from public.bookings x where x.workspace_id = w.id),
  'bookingItems', (select coalesce(jsonb_agg(to_jsonb(x) order by x.booking_id, x.position, x.id), '[]') from public.booking_items x where x.workspace_id = w.id),
  'bookingCrew', (select coalesce(jsonb_agg(to_jsonb(x) order by x.booking_id, x.position, x.crew_id), '[]') from public.booking_crew x where x.workspace_id = w.id),
  'invoices', (select coalesce(jsonb_agg(to_jsonb(x) order by x.issued_at, x.id), '[]') from public.invoices x where x.workspace_id = w.id),
  'bookingCounters', (select coalesce(jsonb_agg(to_jsonb(x) order by x.year), '[]') from public.booking_counters x where x.workspace_id = w.id),
  'invoiceCounters', (select coalesce(jsonb_agg(to_jsonb(x) order by x.year), '[]') from public.invoice_counters x where x.workspace_id = w.id),
  'files', (select coalesce(jsonb_agg(jsonb_build_object('bucket', o.bucket_id, 'name', o.name) order by o.bucket_id, o.name), '[]') from storage.objects o where split_part(o.name, '/', 1) = w.id::text)
) as export
from w;
