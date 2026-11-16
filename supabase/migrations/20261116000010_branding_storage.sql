-- 010 · P8: the business logo lives in Storage, not in the settings row (PRD US-14, §4.3).
-- Private bucket `branding`: PNG / JPEG only, ≤ 1 MB (the browser re-encodes to ≤ 256 px first; the Server
-- Action re-validates the bytes). Staff read through signed URLs; only admins write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', false, 1048576, array['image/png', 'image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The stored logo is only ever the Server Action's content-named path (P10 review note): no other string — no
-- "../", no other bucket's object — can be saved, even by an admin calling update_business directly.
alter table public.workspace_settings add constraint workspace_settings_logo_path
  check (business_logo_path is null or business_logo_path ~ '^logo/[0-9a-f]{64}\.(png|jpg)$');

create policy branding_staff_read on storage.objects for select to authenticated
  using (bucket_id = 'branding' and (select public.is_staff()));
create policy branding_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (select public.is_admin()));
create policy branding_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and (select public.is_admin()))
  with check (bucket_id = 'branding' and (select public.is_admin()));
create policy branding_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and (select public.is_admin()));
