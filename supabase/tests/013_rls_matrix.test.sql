-- P10 · PG4 RLS matrix (PRODUCTION-PLAN §3 P10): anon / crew / admin × every table × select / insert / update /
-- delete, plus every API function. Each cell runs in its own subtransaction and records 'ok', the SQLSTATE, or
-- 'rows=N' for selects; the whole matrix is compared to the expected table at once, so a failure shows every
-- wrong cell. Roles: anon = no JWT; crew / admin = provisioned staff signed in today.
begin;
select plan(3);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-4000-8000-0000000000a5', 'rls-admin@bs-moment.test', '{"role":"admin"}'),
  ('00000000-0000-4000-8000-0000000000a6', 'rls-crew@bs-moment.test', '{"role":"crew"}');

create temp table got (who text, obj text, op text, result text);
grant all on got to anon, authenticated;

-- Run one statement as a role; record the outcome. SECURITY INVOKER: the statement sees the caller's privileges.
create function pg_temp.try(p_who text, p_obj text, p_op text, p_sql text) returns void language plpgsql as $$
declare n bigint; r text;
begin
  begin
    if p_op like 'select%' then
      execute format('select count(*) from (%s) x', p_sql) into n;
      r := case when n > 0 then 'rows' else 'none' end;
    else
      execute p_sql;
      r := 'ok';
    end if;
    raise exception using errcode = 'P9999'; -- undo whatever the statement did
  exception
    when sqlstate 'P9999' then null;
    when others then r := sqlstate;
  end;
  insert into got values (p_who, p_obj, p_op, r); -- after the undo, so the record survives
end $$;
grant execute on function pg_temp.try(text, text, text, text) to anon, authenticated;

create function pg_temp.as_role(p_who text) returns void language plpgsql as $$
begin
  if p_who = 'anon' then
    execute 'set local role anon';
    perform set_config('request.jwt.claims', '', true);
  else
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', jsonb_build_object('sub', case p_who when 'admin' then '00000000-0000-4000-8000-0000000000a5' else '00000000-0000-4000-8000-0000000000a6' end)::text, true);
  end if;
end $$;

do $$
declare
  who text;
  t text;
  tables text[] := array['packages', 'crew', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'profiles', 'invoice_counters', 'booking_counters', 'workspace_settings'];
  bk text := (select id::text from public.bookings where ref = 'BK-2026-0144');
  pk text := (select package_id::text from public.bookings where ref = 'BK-2026-0144'); -- read as the owner, up front
begin
  foreach who in array array['anon', 'crew', 'admin'] loop
    perform pg_temp.as_role(who);
    foreach t in array tables loop
      -- profiles: only (id, display_name, role) are granted (column-level), so read exactly those.
      perform pg_temp.try(who, t, 'select', case when t = 'profiles' then 'select id, display_name, role from public.profiles' else format('select * from public.%I', t) end);
      perform pg_temp.try(who, t, 'update', format('update public.%I set %s', t, case t when 'booking_crew' then 'position = position' when 'invoice_counters' then 'last_value = last_value' when 'booking_counters' then 'last_value = last_value' when 'workspace_settings' then 'default_terms = default_terms' when 'profiles' then 'display_name = display_name' when 'invoices' then 'pdf_path = pdf_path' when 'booking_items' then 'qty = qty' when 'crew' then 'name = name' when 'bookings' then 'terms = terms' else 'name = name' end));
      perform pg_temp.try(who, t, 'delete', format('delete from public.%I', t));
    end loop;
    perform pg_temp.try(who, 'profiles', 'select_private', 'select password_changed_at from public.profiles');
    perform pg_temp.try(who, 'packages', 'insert', $q$insert into public.packages (name, price) values ('RLS', 1)$q$);
    perform pg_temp.try(who, 'invoices', 'insert', format($q$insert into public.invoices (booking_id, number, type, amount, snapshot, snapshot_hash) values ('%s', 'INV-2099-9999', 'full', 1, '{}', repeat('a', 64))$q$, bk));
    -- API functions
    perform pg_temp.try(who, 'save_booking', 'rpc', format($q$select public.save_booking('{"id":"%s","clientName":"RLS","clientPhone":"081234567890","packageId":"%s","bookingDate":"2026-11-10","items":[],"crewIds":[],"terms":""}')$q$, bk, pk));
    perform pg_temp.try(who, 'create_invoice', 'rpc', format($q$select public.create_invoice('%s', 'full')$q$, bk));
    perform pg_temp.try(who, 'cancel_booking', 'rpc', format($q$select public.cancel_booking('%s')$q$, bk));
    perform pg_temp.try(who, 'save_package', 'rpc', $q$select public.save_package('{"name":"RLS pkg","price":1,"description":""}')$q$);
    perform pg_temp.try(who, 'update_business', 'rpc', $q$select public.update_business('{"name":"bs.moment","address":"Jl. Rawa Mangun No. 12, Jakarta Timur","email":"finance@bs-moment.com","phone":"+62 21-555-0100"}')$q$);
    perform pg_temp.try(who, 'list_bookings', 'select', $q$select jsonb_array_elements(public.list_bookings('{}') -> 'rows')$q$);
    perform pg_temp.try(who, 'get_settings', 'select', $q$select 1 where public.get_settings() is not null$q$);
    perform pg_temp.try(who, 'my_profile', 'select', $q$select 1 where public.my_profile() is not null$q$);
    perform pg_temp.try(who, 'next_invoice_number', 'rpc', $q$select public.next_invoice_number(2099)$q$);
    perform pg_temp.try(who, 'save_booking_tx', 'rpc', $q$select public.save_booking_tx('{}')$q$);
    execute 'reset role';
  end loop;
end $$;

-- Expected matrix. 42501 = permission denied; P0001 = the RPC's own refusal ('forbidden' for non-admins);
-- 'rows' = sees data, 'none' = sees nothing.
create temp table want (who text, obj text, op text, result text);
insert into want
select w.who, t.t, o.op,
  case
    when o.op = 'select' and t.t in ('invoice_counters', 'booking_counters', 'workspace_settings') then '42501'
    when o.op = 'select' and w.who = 'anon' then '42501'
    when o.op = 'select' then 'rows'
    else '42501' -- no direct writes for anyone through the API
  end
from (values ('anon'), ('crew'), ('admin')) w(who),
     unnest(array['packages', 'crew', 'bookings', 'booking_items', 'booking_crew', 'invoices', 'profiles', 'invoice_counters', 'booking_counters', 'workspace_settings']) t(t),
     (values ('select'), ('update'), ('delete')) o(op)
union all
select w.who, 'profiles', 'select_private', '42501' from (values ('anon'), ('crew'), ('admin')) w(who) -- private column: only via my_profile()
union all
select w.who, x.obj, 'insert', '42501' from (values ('anon'), ('crew'), ('admin')) w(who), (values ('packages'), ('invoices')) x(obj)
union all
select w.who, r.obj, r.op,
  case
    when w.who = 'anon' then '42501'                                          -- not granted to anon at all
    when r.obj in ('next_invoice_number', 'save_booking_tx') then '42501'      -- internal, never callable
    when r.op = 'select' then 'rows'                                          -- staff reads
    when w.who = 'crew' then 'P0001'                                        -- 'forbidden' from require_admin()
    else 'ok'                                                                 -- admin writes through RPCs
  end
from (values ('anon'), ('crew'), ('admin')) w(who),
     (values ('save_booking', 'rpc'), ('create_invoice', 'rpc'), ('cancel_booking', 'rpc'), ('save_package', 'rpc'), ('update_business', 'rpc'),
             ('list_bookings', 'select'), ('get_settings', 'select'), ('my_profile', 'select'), ('next_invoice_number', 'rpc'), ('save_booking_tx', 'rpc')) r(obj, op);

select is((select count(*)::int from got), (select count(*)::int from want), 'every matrix cell was exercised');
select set_eq($$ select who, obj, op, result from got $$, $$ select who, obj, op, result from want $$, 'RLS / grant matrix matches the P10 table exactly');
select is_empty($$ select g.who || ' ' || g.obj || ' ' || g.op || ': got ' || g.result || ', want ' || w.result
                    from got g join want w using (who, obj, op) where g.result <> w.result $$, 'no cell differs (lists any that do)');

select * from finish();
rollback;
