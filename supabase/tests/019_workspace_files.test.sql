-- 018 · SD3: logos belong to one workspace (SHARED-DATABASE-PLAN §5 test 6); my_profile carries the status.
begin;
select plan(23);
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

insert into public.workspaces (id, slug, name) values ('00000000-0000-4000-8000-0000000019b0', 'files-b', 'Files B');
insert into public.workspace_settings (workspace_id, business_name, business_address, business_email, business_phone) values ('00000000-0000-4000-8000-0000000019b0', 'Files B', 'J', 'b@b.test', '+62 21-555-0100');
create temp table w as select (select id from public.workspaces where slug = 'main')::text as a, '00000000-0000-4000-8000-0000000019b0'::text as b;
grant select on w to authenticated;
insert into auth.users (id, email, raw_app_meta_data) select x.i::uuid, x.i || '@t', jsonb_build_object('role', x.r, 'workspace_id', case x.ws when 'a' then w.a else w.b end) from w,
  (values ('00000000-0000-4000-8000-0000000019a1', 'admin', 'a'), ('00000000-0000-4000-8000-0000000019a2', 'crew', 'a'), ('00000000-0000-4000-8000-0000000019b1', 'admin', 'b')) x(i, r, ws);
insert into storage.objects (bucket_id, name) select 'branding', a || '/logo/one.png' from w union all select 'branding', b || '/logo/two.png' from w union all select 'branding', 'logo/old.png' union all select 'invoices', a || '/x/y.pdf' from w;

create function pg_temp.be(u text) returns void language plpgsql as $$ begin execute 'reset role'; perform set_config('request.jwt.claims', jsonb_build_object('sub', u)::text, true); execute 'set local role authenticated'; end $$;
create function pg_temp.n(p_sql text) returns int language plpgsql as $$ declare k int; begin execute p_sql; get diagnostics k = row_count; return k; end $$;

select pg_temp.be('00000000-0000-4000-8000-0000000019a1');
select is((select array_agg(name) from storage.objects), array[a || '/logo/one.png'], 'A reads only its own logo: not B''s, not an old path, no PDFs') from w;
select lives_ok(format('insert into storage.objects (bucket_id, name) values (''branding'', %L)', a || '/logo/new.png'), 'A''s admin uploads to its folder') from w;
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''branding'', %L)', b || '/logo/evil.png'), '42501', null, 'not to B''s folder') from w;
select throws_ok('insert into storage.objects (bucket_id, name) values (''branding'', ''logo/evil.png'')', '42501', null, 'not to the old shared folder');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''invoices'', %L)', a || '/evil.pdf'), '42501', null, 'not to the PDF bucket') from w;
select is(pg_temp.n(format('update storage.objects set metadata = ''{}'' where name = %L', b || '/logo/two.png')), 0, 'can''t replace B''s logo') from w;
select is(pg_temp.n(format('delete from storage.objects where name = %L', b || '/logo/two.png')), 0, 'can''t delete B''s logo') from w;
select throws_ok(format('update storage.objects set name = %L where name = %L', b || '/logo/moved.png', a || '/logo/new.png'), '42501', null, 'can''t move a file into B''s folder') from w;
select is(pg_temp.n(format('delete from storage.objects where name = %L', a || '/logo/new.png')), 1, 'deletes its own') from w;
select is(public.my_profile() ->> 'workspaceId', a, 'my_profile: the workspace') from w;
select is(public.my_profile() ->> 'workspaceStatus', 'active', 'my_profile: its status');
select throws_ok(format('select public.update_business(%L)', jsonb_build_object('name', 'AA', 'address', 'J', 'email', 'a@a.test', 'phone', '+62 21-555-0100', 'logo', b || '/logo/' || repeat('a', 64) || '.png')), '23514', null, 'settings can''t point at B''s logo') from w;
select throws_ok(format('select public.update_business(%L)', jsonb_build_object('name', 'AA', 'address', 'J', 'email', 'a@a.test', 'phone', '+62 21-555-0100', 'logo', 'logo/' || repeat('a', 64) || '.png')), '23514', null, 'nor at an old path') from w;
select lives_ok(format('select public.update_business(%L)', jsonb_build_object('name', 'AA', 'address', 'J', 'email', 'a@a.test', 'phone', '+62 21-555-0100', 'logo', a || '/logo/' || repeat('a', 64) || '.png')), 'its own path works') from w;

select pg_temp.be('00000000-0000-4000-8000-0000000019a2');
select is((select count(*)::int from storage.objects), 1, 'crew reads its workspace''s logo');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''branding'', %L)', a || '/logo/crew.png'), '42501', null, 'crew can''t upload') from w;
select pg_temp.be('00000000-0000-4000-8000-0000000019b1');
select is((select array_agg(name) from storage.objects), array[b || '/logo/two.png'], 'B reads only its own logo') from w;

reset role;
update public.workspaces set status = 'read_only' where slug = 'files-b';
select pg_temp.be('00000000-0000-4000-8000-0000000019b1');
select is((select count(*)::int from storage.objects), 1, 'read_only: the logo is still readable');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''branding'', %L)', b || '/logo/new.png'), '42501', null, 'read_only: no upload') from w;
select is(pg_temp.n(format('delete from storage.objects where name = %L', b || '/logo/two.png')), 0, 'read_only: no delete') from w;
select is(public.my_profile() ->> 'workspaceStatus', 'read_only', 'read_only: my_profile says so');
reset role;
update public.workspaces set status = 'closed' where slug = 'files-b';
select pg_temp.be('00000000-0000-4000-8000-0000000019b1');
select is((select count(*)::int from storage.objects), 0, 'closed: no files');
select is(public.my_profile(), null, 'closed: no profile');
select * from finish();
rollback;
