-- 015 · list_people: who is listed, account type, upcoming count, access.
begin;
select plan(16);

insert into public.crew (id, name, role, is_active) values
  ('00000000-0000-4000-8000-00000000c161', 'Free Lance', 'Assistant', true),
  ('00000000-0000-4000-8000-00000000c162', 'Gone Person', '', false);
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-4000-8000-000000000161', 'admin16@bs-moment.test', '{"display_name":"Admin Sixteen"}', '{"role":"admin"}'),
  ('00000000-0000-4000-8000-000000000162', 'crew16@bs-moment.test', '{"display_name":"Crew Sixteen"}', '{"role":"crew"}'),
  ('00000000-0000-4000-8000-000000000163', 'gone16@bs-moment.test', '{"display_name":"Revoked Sixteen"}', '{"role":"crew"}');
update auth.users set raw_app_meta_data = '{}' where id = '00000000-0000-4000-8000-000000000163';

-- Free Lance: yesterday (past), today and later (2 upcoming), one Canceled.
insert into public.booking_crew (booking_id, crew_id)
select id, '00000000-0000-4000-8000-00000000c161' from public.bookings
 where ref in ('BK-2026-0137', 'BK-2026-0139', 'BK-2026-0142', 'BK-2026-0146');

create temp view people as
select x.* from jsonb_to_recordset(public.list_people('2026-11-10')) x("crewId" uuid, name text, "jobTitle" text, type text, "isYou" boolean, "upcomingCount" int);
grant select on people to authenticated;
-- The helper view must run as the caller, like the function.
alter view people set (security_invoker = on);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000161"}', true);
select is((select type from people where name = 'Admin Sixteen'), 'admin', 'an admin account');
select is((select type from people where name = 'Crew Sixteen'), 'crew', 'a crew account');
select is((select type from people where name = 'Free Lance'), 'none', 'no account → none');
select is((select "jobTitle" from people where name = 'Free Lance'), 'Assistant', 'job title');
select is((select array_agg(name) from people where "isYou"), array['Admin Sixteen'], 'only the caller is You');
select is((select count(*)::int from people where name in ('Gone Person', 'Revoked Sixteen')), 0, 'inactive and revoked people are left out');
select is((select count(*)::int from people), (select count(*)::int from public.crew where is_active), 'one row per active entry');
select is((select "upcomingCount" from people where name = 'Free Lance'), 2, 'today counts; the past and Canceled do not');
select is((select "upcomingCount" from people where name = 'Crew Sixteen'), 0, 'nobody assigned → 0');
select is((select count(*)::int from people p where p."upcomingCount" <> (select count(*) from public.filter_bookings(
    jsonb_build_object('view', 'calendar', 'crewIds', jsonb_build_array(p."crewId"), 'from', '2026-11-10')))), 0, 'counts match filter_bookings');
select set_eq($$ select distinct jsonb_object_keys(e) from jsonb_array_elements(public.list_people('2026-11-10')) e $$,
  array['crewId', 'name', 'jobTitle', 'type', 'isYou', 'upcomingCount'], 'no email or user id');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000162"}', true);
select is((select array_agg(name) from people where "isYou"), array['Crew Sixteen'], 'crew can read the list too');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000163"}', true);
select is(public.list_people('2026-11-10'), '[]'::jsonb, 'a revoked account reads nothing');
reset role;

select ok(not has_function_privilege('anon', 'public.list_people(date)', 'execute'), 'not callable signed out');
select ok(has_function_privilege('authenticated', 'public.list_people(date)', 'execute'), 'callable signed in');
select is((select prosecdef from pg_proc where oid = 'public.list_people(date)'::regprocedure), false, 'security invoker');
select * from finish();
rollback;
