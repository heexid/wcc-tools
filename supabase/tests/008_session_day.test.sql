-- P4 · sessions end at 00:00 WIB (migration 006).
begin;
select plan(7);

insert into auth.users (id, email, raw_app_meta_data) values ('00000000-0000-4000-8000-0000000000c1', 'day@bs-moment.test', '{"role":"admin"}');

create function pg_temp.claims(p_signed_in timestamptz) returns text language sql as $$
  select set_config('request.jwt.claims',
    jsonb_build_object('sub', '00000000-0000-4000-8000-0000000000c1',
                       'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from p_signed_in)::bigint)))::text, true)
$$;
create function pg_temp.midnight() returns timestamptz language sql as $$
  select date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta'
$$;

set local role authenticated;

select pg_temp.claims(pg_temp.midnight() + interval '1 minute');
select ok(public.session_fresh(), 'signed in after 00:00 WIB today → fresh');
select ok(public.is_admin(), 'today''s session: admin');
select ok((select count(*) from public.bookings) > 0, 'today''s session: reads bookings');

select pg_temp.claims(pg_temp.midnight() - interval '1 minute');
select ok(not public.session_fresh(), 'signed in at 23:59 yesterday → ended at midnight');
select ok(not public.is_admin(), 'yesterday''s session: no admin');
select is((select count(*)::int from public.bookings), 0, 'yesterday''s session: reads nothing');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1"}', true);
select ok(public.session_fresh(), 'no amr claim → treated as fresh (not a user token)');

reset role;
select * from finish();
rollback;
