-- 009 · P6 review fixes.
--  (1) The profile RPCs follow the staff rules too: an inactive account (role removed, 008) or a session from
--      before today's 00:00 WIB (006) gets no profile and can't rename itself or stamp a password change.
--  (5) get_crew_schedule builds rows only for what it shows (upcoming from today); the month count is a count.

create or replace function public.my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'displayName', p.display_name,
    'email', u.email,
    'role', p.role,
    'workspace', coalesce((select s.business_name from public.workspace_settings s order by s.updated_at desc limit 1), ''),
    'passwordChangedAt', to_char(coalesce(p.password_changed_at, p.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'))
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = auth.uid() and public.is_staff();
$$;

create or replace function public.update_display_name(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v text := btrim(coalesce(p_name, ''));
begin
  if not public.is_staff() then perform public.raise_code('forbidden', 'Sign in first.'); end if;
  if char_length(v) < 2 or char_length(v) > 50 then perform public.raise_code('length', 'Enter 2–50 characters.'); end if;
  update public.profiles set display_name = v where id = auth.uid();
  return public.my_profile();
end;
$$;

create or replace function public.mark_password_changed()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set password_changed_at = now() where id = auth.uid() and public.is_staff();
$$;

create or replace function public.get_crew_schedule(p_crew_id uuid, p_today date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with month_ids as (
    select o.id from public.ordered_booking_ids(jsonb_build_object(
      'view', 'calendar', 'crewIds', jsonb_build_array(p_crew_id),
      'from', date_trunc('month', p_today)::date, 'to', (date_trunc('month', p_today) + interval '1 month - 1 day')::date)) o
  ),
  upcoming as (
    select x.r, x.n from public.filter_bookings(jsonb_build_object('view', 'calendar', 'crewIds', jsonb_build_array(p_crew_id), 'from', p_today))
      with ordinality as x(r, n)
  )
  select case when c.id is null then null else jsonb_build_object(
    'crew', jsonb_build_object('id', c.id, 'name', c.name, 'role', c.role, 'isActive', c.is_active),
    'monthCount', (select count(*)::int from month_ids),
    'upcoming', coalesce((select jsonb_agg(r order by n) from upcoming), '[]'))
  end
  from (select 1) one left join public.crew c on c.id = p_crew_id;
$$;
