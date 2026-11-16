-- 012 · P9: generated invoice PDFs (PRD §4.3 Storage, US-10). Private bucket `invoices`, PDF only, ≤ 5 MB.
-- No API policies on purpose: only the server route (service role) reads or writes it, after it has read the
-- invoice through the caller's own session — so RLS (staff only, sessions end at 00:00 WIB) decides who may
-- download. Viewers and admins get a 10-minute signed URL; anon gets nothing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- The route stores the generated file's path. service_role gets no table access by default on current Supabase:
-- grant exactly what it needs — read invoices, and update ONLY pdf_path (the append-only trigger allows nothing else).
grant select on public.invoices to service_role;
grant update (pdf_path) on public.invoices to service_role;
