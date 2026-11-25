-- 015 · Workspace & Crew people list (context/SHARED-DATABASE-PLAN.md §9.5): every active crew entry with its account
-- type and its number of upcoming bookings (booking date from p_today, Canceled excluded).
-- SECURITY INVOKER: the caller's RLS applies. No email or user id is returned. The app sorts and filters.
create function public.list_people(p_today date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with upcoming as (
    select bc.crew_id, count(*)::int as n
      from public.booking_crew bc
      join public.bookings b on b.id = bc.booking_id
     where b.booking_date >= p_today and b.status <> 'canceled'
     group by bc.crew_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'crewId', c.id, 'name', c.name, 'jobTitle', c.role,
           'type', coalesce(p.role, 'none'),
           'isYou', coalesce(c.user_id = (select auth.uid()), false),
           'upcomingCount', coalesce(u.n, 0)) order by c.name, c.id), '[]')
    from public.crew c
    left join public.profiles p on p.id = c.user_id
    left join upcoming u on u.crew_id = c.id
   where c.is_active;
$$;

revoke execute on function public.list_people(date) from public, anon;
grant execute on function public.list_people(date) to authenticated;
