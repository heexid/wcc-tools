-- P4 review · role changes after creation (migration 008).
begin;
select plan(7);

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-4000-8000-0000000000d1', 'later@bs-moment.test', '{}');
select is((select count(*)::int from public.profiles where id = '00000000-0000-4000-8000-0000000000d1'), 0, 'no role yet → no profile');

update auth.users set raw_app_meta_data = test_only.meta('{"role":"crew"}') where id = '00000000-0000-4000-8000-0000000000d1';
select is((select role from public.profiles where id = '00000000-0000-4000-8000-0000000000d1'), 'crew', 'role set later → profile created');

update auth.users set raw_app_meta_data = test_only.meta('{"role":"admin"}') where id = '00000000-0000-4000-8000-0000000000d1';
select is((select role from public.profiles where id = '00000000-0000-4000-8000-0000000000d1'), 'admin', 'promoted → admin');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1"}', true);
select ok(public.is_admin(), 'admin while the role is set');
reset role;

update auth.users set raw_app_meta_data = test_only.meta('{"role":"admin"}') || '{"other":1}'::jsonb where id = '00000000-0000-4000-8000-0000000000d1';
select ok((select active from public.profiles where id = '00000000-0000-4000-8000-0000000000d1'), 'unrelated app_metadata change keeps access');

update auth.users set raw_app_meta_data = '{}' where id = '00000000-0000-4000-8000-0000000000d1';
select is((select active from public.profiles where id = '00000000-0000-4000-8000-0000000000d1'), false, 'role removed → profile kept but inactive');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1"}', true);
select is((select count(*)::int from public.bookings), 0, 'revoked account reads nothing');
reset role;

select * from finish();
rollback;
