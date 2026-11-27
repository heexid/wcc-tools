-- 019 · Subscription on Workspace settings (Figma Workspace Setting → WS1, WS10).
-- The developer sets the subscription by query (supabase/templates/WORKSPACE-SETUP.md); the app only shows it.
-- When paid_until has passed (WIB), the workspace is read-only for everyone, exactly like status 'read_only':
-- reads stay, every write and logo upload is refused, own name and password still work.
-- Needs 018.

alter table public.workspaces
  add column subscription_months smallint check (subscription_months in (1, 3, 6, 12)), -- null = none
  add column subscription_start date,
  add constraint workspaces_subscription_start_needs_months check (subscription_months is not null or subscription_start is null);

-- paid_until is the last day with full access; from the next day (Asia/Jakarta) the workspace is read-only.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p join public.workspaces w on w.id = p.workspace_id
     where p.id = auth.uid() and p.role = 'admin' and p.workspace_id = public.current_workspace_id() and w.status = 'active'
       and (w.paid_until is null or w.paid_until >= (now() at time zone 'Asia/Jakarta')::date));
$$;

-- my_profile as after 018, plus the subscription; an expired one reports 'read_only' so the app hides write controls.
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
    'workspace', coalesce((select s.business_name from public.workspace_settings s where s.workspace_id = p.workspace_id), ''),
    'workspaceId', w.id,
    'workspaceStatus', case when w.status = 'active' and w.paid_until < (now() at time zone 'Asia/Jakarta')::date then 'read_only' else w.status end,
    'subscription', jsonb_build_object('months', w.subscription_months, 'start', w.subscription_start, 'paidUntil', w.paid_until),
    'passwordChangedAt', to_char(coalesce(p.password_changed_at, p.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'))
  from public.profiles p join auth.users u on u.id = p.id join public.workspaces w on w.id = p.workspace_id
  where p.id = auth.uid() and public.is_staff();
$$;
