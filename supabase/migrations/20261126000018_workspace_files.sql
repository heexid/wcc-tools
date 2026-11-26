-- 018 · Workspaces, phase SD3: files and status (context/SHARED-DATABASE-PLAN.md §3 items 7, 11).
-- Logos: branding/<workspace id>/logo/<hash>.<ext>. Only that workspace reads them; only its admins write them, and only
-- while it is active. PDFs: invoices/<workspace id>/<invoice id>/<fingerprint>.pdf, server only, as before.

do $$ begin
  if exists (select 1 from public.workspace_settings where business_logo_path is not null) then
    raise exception 'A logo is stored under its old path. Copy it to <workspace id>/logo/ and update business_logo_path first.';
  end if;
end $$;

alter table public.workspace_settings drop constraint workspace_settings_logo_path;
alter table public.workspace_settings add constraint workspace_settings_logo_path
  check (business_logo_path is null or business_logo_path ~ ('^' || workspace_id::text || '/logo/[0-9a-f]{64}\.(png|jpg)$'));

drop policy branding_staff_read on storage.objects;
drop policy branding_admin_insert on storage.objects;
drop policy branding_admin_update on storage.objects;
drop policy branding_admin_delete on storage.objects;
create policy branding_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'branding' and split_part(name, '/', 1) = (select public.current_workspace_id())::text);
create policy branding_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (select public.is_admin()) and split_part(name, '/', 1) = (select public.current_workspace_id())::text);
create policy branding_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and (select public.is_admin()) and split_part(name, '/', 1) = (select public.current_workspace_id())::text)
  with check (bucket_id = 'branding' and (select public.is_admin()) and split_part(name, '/', 1) = (select public.current_workspace_id())::text);
create policy branding_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and (select public.is_admin()) and split_part(name, '/', 1) = (select public.current_workspace_id())::text);

-- my_profile as after 017, plus the workspace's id and status: the app hides write controls when it isn't active.
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
    'workspaceStatus', w.status,
    'passwordChangedAt', to_char(coalesce(p.password_changed_at, p.created_at) at time zone 'Asia/Jakarta', 'YYYY-MM-DD'))
  from public.profiles p join auth.users u on u.id = p.id join public.workspaces w on w.id = p.workspace_id
  where p.id = auth.uid() and public.is_staff();
$$;
