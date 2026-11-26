-- 014 · crew types: provisioning, the linked crew entry, revoke / restore / delete.
begin;
select plan(24);

insert into public.crew (id, name, role) values ('00000000-0000-4000-8000-00000000c001', 'Raka P.', 'Lead photographer');
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-4000-8000-0000000000e1', 'admin15@bs-moment.test', '{"display_name":"Admin One"}', test_only.meta('{"role":"admin"}')),
  ('00000000-0000-4000-8000-0000000000e2', 'raka15@bs-moment.test', '{"display_name":"Raka Login"}', test_only.meta('{"role":"crew","crew_id":"00000000-0000-4000-8000-00000000c001"}')),
  ('00000000-0000-4000-8000-0000000000e3', 'taken15@bs-moment.test', '{"display_name":"Second Claim"}', test_only.meta('{"role":"crew","crew_id":"00000000-0000-4000-8000-00000000c001"}')),
  ('00000000-0000-4000-8000-0000000000e4', 'old15@bs-moment.test', '{}', test_only.meta('{"role":"viewer"}')),
  ('00000000-0000-4000-8000-0000000000e5', 'bad15@bs-moment.test', '{"display_name":"Bad Link"}', test_only.meta('{"role":"crew","crew_id":"not-a-uuid"}'));

select is((select name from public.crew where user_id = '00000000-0000-4000-8000-0000000000e1'), 'Admin One', 'admin gets a crew entry');
select is((select role from public.crew where user_id = '00000000-0000-4000-8000-0000000000e1'), '', 'its job title starts empty');
select is((select id::text from public.crew where user_id = '00000000-0000-4000-8000-0000000000e2'), '00000000-0000-4000-8000-00000000c001', 'crew_id links the existing entry');
select is((select name || ' · ' || role from public.crew where user_id = '00000000-0000-4000-8000-0000000000e2'), 'Raka P. · Lead photographer', 'a linked entry keeps its name and job title');
select is((select name from public.crew where user_id = '00000000-0000-4000-8000-0000000000e3'), 'Second Claim', 'a taken crew_id is not stolen: a new entry is added');
select is((select name from public.crew where user_id = '00000000-0000-4000-8000-0000000000e5'), 'Bad Link', 'an invalid crew_id never blocks account creation');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000000e4'), 0, 'viewer is no longer a role: no profile');
select is((select count(*)::int from public.crew where user_id = '00000000-0000-4000-8000-0000000000e4'), 0, 'no access → no crew entry');
select throws_ok($$ insert into public.crew (user_id, name) values ('00000000-0000-4000-8000-0000000000e1', 'Twice') $$, '23505', null, 'one crew entry per account');
select throws_ok($$ update public.profiles set role = 'viewer' where id = '00000000-0000-4000-8000-0000000000e1' $$, '23514', null, 'viewer is rejected');
select is((select column_default from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role'), '''crew''::text', 'the default type is crew');
select ok(not has_function_privilege('authenticated', 'public.ensure_crew_entry(uuid)', 'execute'), 'ensure_crew_entry is not callable from the API');
select ok(not has_function_privilege('authenticated', 'public.profiles_sync_crew()', 'execute'), 'profiles_sync_crew is not callable from the API');

-- Name and type changes
update public.profiles set display_name = 'Raka New' where id = '00000000-0000-4000-8000-0000000000e2';
select is((select name from public.crew where user_id = '00000000-0000-4000-8000-0000000000e2'), 'Raka New', 'the crew name follows a rename');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}' where id = '00000000-0000-4000-8000-0000000000e2';
select is((select role from public.profiles where id = '00000000-0000-4000-8000-0000000000e2'), 'admin', 'promoted');
select is((select role from public.crew where user_id = '00000000-0000-4000-8000-0000000000e2'), 'Lead photographer', 'the job title survives a type change');

-- Self-assign, then filter by self
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1"}', true);
select lives_ok($$ select public.save_booking(jsonb_build_object('clientName', 'Self Assign', 'clientPhone', '081234567890',
  'packageId', (select id from public.packages where is_active limit 1), 'bookingDate', '2026-12-20', 'items', '[]'::jsonb,
  'crewIds', jsonb_build_array((select id from public.crew where user_id = auth.uid())), 'terms', '')) $$, 'an admin assigns themself');
select is(jsonb_array_length(public.list_bookings(jsonb_build_object('crewIds', jsonb_build_array((select id from public.crew where user_id = auth.uid())))) -> 'rows'), 1, 'the crew filter finds it');
select throws_ok($$ update public.crew set name = 'x' where user_id = auth.uid() $$, '42501', null, 'crew entries are not writable from the API');
reset role;

-- Revoke, restore, delete
update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select is_active from public.crew where user_id = '00000000-0000-4000-8000-0000000000e1'), false, 'revoked → not assignable');
select is((select count(*)::int from public.booking_crew bc join public.crew c on c.id = bc.crew_id where c.user_id = '00000000-0000-4000-8000-0000000000e1'), 1, 'past bookings keep the person');
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"crew"}' where id = '00000000-0000-4000-8000-0000000000e1';
select is((select is_active from public.crew where user_id = '00000000-0000-4000-8000-0000000000e1'), true, 'restored → assignable again');
select is((select count(*)::int from public.crew where user_id = '00000000-0000-4000-8000-0000000000e1'), 1, 'restoring adds no second entry');
delete from auth.users where id = '00000000-0000-4000-8000-0000000000e2';
select is((select user_id is null and not is_active from public.crew where id = '00000000-0000-4000-8000-00000000c001'), true, 'deleted account → entry kept, unlinked, inactive');

select * from finish();
rollback;
