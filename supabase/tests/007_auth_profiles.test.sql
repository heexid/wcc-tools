-- P4 · staff accounts and staff-only reads (migration 005).
begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-4000-8000-0000000000b1', 'rina.kartika@bs-moment.test', '{}', '{"role":"crew"}'),
  ('00000000-0000-4000-8000-0000000000b2', 'x@bs-moment.test', '{"display_name":"  Dimas Pratama  "}', '{"role":"admin"}'),
  ('00000000-0000-4000-8000-0000000000b3', 'q@bs-moment.test', '{}', '{"role":"crew"}'),
  -- self-registered: a role in *user* metadata (user-editable) must not count
  ('00000000-0000-4000-8000-0000000000b4', 'stranger@evil.test', '{"role":"admin"}', '{"provider":"email"}');

select is((select display_name from public.profiles where id = '00000000-0000-4000-8000-0000000000b1'), 'rina.kartika', 'name from the email local part');
select is((select display_name from public.profiles where id = '00000000-0000-4000-8000-0000000000b2'), 'Dimas Pratama', 'name from user metadata, trimmed');
select is((select display_name from public.profiles where id = '00000000-0000-4000-8000-0000000000b3'), 'User', 'a 1-character name falls back to "User" (2–50 rule)');
select is((select role from public.profiles where id = '00000000-0000-4000-8000-0000000000b2'), 'admin', 'role comes from app_metadata (set by an admin)');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000000b4'), 0, 'an account without an admin-set role gets no profile');
select ok(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'the trigger function is not callable from the API');

-- Staff-only reads: the stranger is authenticated but sees nothing; a crew sees the seed.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b4"}', true);
select is((select count(*)::int from public.bookings), 0, 'non-staff account: no bookings');
select is((select count(*)::int from public.profiles), 0, 'non-staff account: no profiles');
select is(public.get_settings(), null, 'non-staff account: no workspace settings (bank details, business)');
select is(public.my_profile(), null, 'non-staff account: no profile');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1"}', true);
select ok((select count(*) from public.bookings) > 0, 'crew: reads bookings');
select is((select count(*)::int from public.invoices where snapshot is not null) > 0, true, 'crew: reads invoices');
reset role;

select * from finish();
rollback;
