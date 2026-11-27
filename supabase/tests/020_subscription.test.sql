-- 019 · Subscription: my_profile shows it; once paid_until has passed (WIB) the workspace is read-only for everyone.
begin;
select plan(14);
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

insert into public.workspaces (id, slug, name, subscription_months, subscription_start, paid_until)
  values ('00000000-0000-4000-8000-0000000020b0', 'sub-b', 'Sub B', 3, '2026-09-01', (now() at time zone 'Asia/Jakarta')::date);
insert into public.workspace_settings (workspace_id, business_name, business_address, business_email, business_phone)
  values ('00000000-0000-4000-8000-0000000020b0', 'Sub B', 'J', 'b@b.test', '+62 21-555-0100');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-4000-8000-0000000020a1', 'sa@t', '{"role":"admin","workspace_id":"00000000-0000-4000-8000-0000000020b0"}'),
  ('00000000-0000-4000-8000-0000000020a2', 'sc@t', '{"role":"crew","workspace_id":"00000000-0000-4000-8000-0000000020b0"}');

create function pg_temp.be(u text) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claims', jsonb_build_object('sub', u)::text, true); execute 'set local role authenticated'; end $$;
create function pg_temp.biz() returns jsonb language sql as $$ select jsonb_build_object('name', 'Sub Bee', 'address', 'J', 'email', 'b@b.test', 'phone', '+62 21-555-0100', 'logo', null) $$;

select throws_ok('update public.workspaces set subscription_months = 2 where slug = ''sub-b''', '23514', null, 'only 1, 3, 6 or 12 months');
select throws_ok('update public.workspaces set subscription_months = null where slug = ''sub-b''', '23514', null, 'a start needs a subscription');

-- paid until today: still writable
select pg_temp.be('00000000-0000-4000-8000-0000000020a1');
select is(public.my_profile() -> 'subscription', '{"months": 3, "start": "2026-09-01", "paidUntil": null}'::jsonb || jsonb_build_object('paidUntil', (now() at time zone 'Asia/Jakarta')::date), 'my_profile: months, start, paid until');
select is(public.my_profile() ->> 'workspaceStatus', 'active', 'paid until today: active');
select ok(public.is_admin(), 'paid until today: the admin may write');
select lives_ok('select public.update_business(pg_temp.biz())', 'paid until today: business can be saved');

-- paid until yesterday: read-only
reset role;
update public.workspaces set paid_until = (now() at time zone 'Asia/Jakarta')::date - 1 where slug = 'sub-b';
select pg_temp.be('00000000-0000-4000-8000-0000000020a1');
select is(public.my_profile() ->> 'workspaceStatus', 'read_only', 'expired: my_profile says read_only');
select ok(not public.is_admin(), 'expired: the admin may not write');
select throws_ok('select public.update_business(pg_temp.biz())', 'P0001', 'forbidden', 'expired: business can''t be saved');
select throws_ok('insert into storage.objects (bucket_id, name) values (''branding'', ''00000000-0000-4000-8000-0000000020b0/logo/x.png'')', '42501', null, 'expired: no logo upload');
select is(public.get_settings() -> 'business' ->> 'name', 'Sub Bee', 'expired: reads still work');
select pg_temp.be('00000000-0000-4000-8000-0000000020a2');
select is(public.my_profile() ->> 'workspaceStatus', 'read_only', 'expired: crew sees read_only too');

-- no end date: writable; none shows nulls
reset role;
update public.workspaces set subscription_months = null, subscription_start = null, paid_until = null where slug = 'sub-b';
select pg_temp.be('00000000-0000-4000-8000-0000000020a1');
select is(public.my_profile() -> 'subscription', '{"months": null, "start": null, "paidUntil": null}'::jsonb, 'no subscription: all null');
select ok(public.is_admin(), 'no end date: the admin may write');
select * from finish();
rollback;
