-- Workspace and account templates (context/SHARED-DATABASE-PLAN.md, phase SD5).
-- DRAFT: needs SD1 + SD2 (public.workspaces, profiles.workspace_id, workspace-aware account triggers).
-- On today's database every block fails; it changes nothing.
--
-- Who: the developer only, in Supabase → SQL Editor. Run ONE block at a time, never the whole file.
-- Edit only the values between "EDIT" and "END EDIT". Never save real client values or passwords in this file.
-- Every change block is all-or-nothing: on an error, nothing is saved.
--
-- New customer: block 1, then for each person: Dashboard → Authentication → Users → Add user (email, password,
-- Auto Confirm User), then block 2 (admin) or block 3 (crew). Finish with block 4.
-- Password resets: in the Dashboard.


-- ═══ 1 · CREATE A WORKSPACE ═════════════════════════════════════════════════════════════════════
do $$
declare
  -- EDIT
  v_slug     text := 'my-studio';                    -- short unique code: a-z, 0-9, dash
  v_name     text := 'My Studio';                    -- 2-60 characters, shown on invoices
  v_address  text := 'Jl. Contoh No. 1, Jakarta';
  v_email    text := 'finance@example.com';
  v_phone    text := '+62 21-555-0100';
  v_terms    text := 'DP is non-refundable.';        -- up to 255 characters
  v_bank     text := 'Bank BCA';
  v_account  text := '1234567890';                   -- 5-20 digits
  v_holder   text := 'My Studio';
  v_paid_until date := null;                         -- e.g. '2027-02-28'
  -- END EDIT
  v_ws uuid;
begin
  if v_slug = 'my-studio' then raise exception 'Edit the values first.'; end if;
  insert into public.workspaces (slug, name, status, paid_until)
  values (v_slug, btrim(v_name), 'active', v_paid_until)
  returning id into v_ws;                            -- a slug that exists already stops here

  insert into public.workspace_settings (workspace_id, business_name, business_address, business_email,
                                         business_phone, default_terms, default_payment)
  values (v_ws, btrim(v_name), btrim(v_address), btrim(v_email), btrim(v_phone), v_terms,
          jsonb_build_object('receiptName', v_bank, 'accountNumber', v_account, 'accountName', v_holder));
  raise notice 'Workspace % created: %', v_slug, v_ws;
end $$;


-- ═══ 2 · ADD AN ADMIN (create the login in the Dashboard first) ═════════════════════════════════
do $$
declare
  -- EDIT
  v_slug     text := 'my-studio';
  v_email    text := 'admin@example.com';
  v_name     text := 'Admin Name';                   -- 2-50 characters
  v_crew_id  uuid := null;                           -- only to link a person already in this crew list
  -- END EDIT
  v_role constant text := 'admin';
  v_ws uuid;
  v_user uuid;
begin
  if v_slug = 'my-studio' then raise exception 'Edit the values first.'; end if;
  select id into v_ws from public.workspaces where slug = v_slug and status = 'active';
  if v_ws is null then raise exception 'No active workspace "%".', v_slug; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(v_email)) for update;
  if v_user is null then raise exception 'No login for %. Add it in the Dashboard first.', v_email; end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception '% already has an account. Use block 5, 6 or 7.', v_email;
  end if;
  if v_crew_id is not null and not exists (
       select 1 from public.crew where id = v_crew_id and workspace_id = v_ws and user_id is null) then
    raise exception 'That crew entry is not in "%", or already has a login.', v_slug;
  end if;

  update auth.users set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || jsonb_build_object('display_name', btrim(v_name)),
    raw_app_meta_data  = (coalesce(raw_app_meta_data, '{}') - 'crew_id')
      || jsonb_build_object('role', v_role, 'workspace_id', v_ws)
      || case when v_crew_id is null then '{}'::jsonb else jsonb_build_object('crew_id', v_crew_id) end
  where id = v_user;

  if not exists (select 1 from public.profiles where id = v_user and workspace_id = v_ws and role = v_role and active)
     or not exists (select 1 from public.crew where user_id = v_user and workspace_id = v_ws) then
    raise exception 'The account was not created correctly. Nothing was saved.';
  end if;
  raise notice '% added to % as %', v_email, v_slug, v_role;
end $$;


-- ═══ 3 · ADD A CREW MEMBER, READ ONLY (create the login in the Dashboard first) ══════════════════
do $$
declare
  -- EDIT
  v_slug     text := 'my-studio';
  v_email    text := 'crew@example.com';
  v_name     text := 'Crew Name';                    -- 2-50 characters
  v_job      text := 'Photographer';                 -- job title; '' keeps the current one
  v_crew_id  uuid := null;                           -- only to link a person already in this crew list
  -- END EDIT
  v_role constant text := 'crew';
  v_ws uuid;
  v_user uuid;
begin
  if v_slug = 'my-studio' then raise exception 'Edit the values first.'; end if;
  select id into v_ws from public.workspaces where slug = v_slug and status = 'active';
  if v_ws is null then raise exception 'No active workspace "%".', v_slug; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(v_email)) for update;
  if v_user is null then raise exception 'No login for %. Add it in the Dashboard first.', v_email; end if;
  if exists (select 1 from public.profiles where id = v_user) then
    raise exception '% already has an account. Use block 5, 6 or 7.', v_email;
  end if;
  if v_crew_id is not null and not exists (
       select 1 from public.crew where id = v_crew_id and workspace_id = v_ws and user_id is null) then
    raise exception 'That crew entry is not in "%", or already has a login.', v_slug;
  end if;

  update auth.users set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}') || jsonb_build_object('display_name', btrim(v_name)),
    raw_app_meta_data  = (coalesce(raw_app_meta_data, '{}') - 'crew_id')
      || jsonb_build_object('role', v_role, 'workspace_id', v_ws)
      || case when v_crew_id is null then '{}'::jsonb else jsonb_build_object('crew_id', v_crew_id) end
  where id = v_user;

  if not exists (select 1 from public.profiles where id = v_user and workspace_id = v_ws and role = v_role and active)
     or not exists (select 1 from public.crew where user_id = v_user and workspace_id = v_ws) then
    raise exception 'The account was not created correctly. Nothing was saved.';
  end if;
  if btrim(v_job) <> '' then
    update public.crew set role = btrim(v_job) where user_id = v_user and workspace_id = v_ws;
  end if;
  raise notice '% added to % as %', v_email, v_slug, v_role;
end $$;


-- ═══ 4 · CHECK ONE WORKSPACE (read only) ════════════════════════════════════════════════════════
select w.slug, w.name, w.status, w.paid_until, u.email, p.display_name, p.role, p.active, c.role as job_title
  from public.workspaces w
  left join public.profiles p on p.workspace_id = w.id
  left join auth.users u on u.id = p.id
  left join public.crew c on c.user_id = p.id and c.workspace_id = w.id
 where w.slug = 'my-studio'                          -- EDIT
 order by p.role, p.display_name;


-- ═══ 5 · CHANGE ROLE: admin <-> crew ════════════════════════════════════════════════════════════
do $$
declare
  -- EDIT
  v_slug  text := 'my-studio';
  v_email text := 'person@example.com';
  v_role  text := 'crew';                            -- 'admin' or 'crew'
  -- END EDIT
  v_ws uuid;
  v_user uuid;
begin
  if v_role not in ('admin', 'crew') then raise exception 'Role must be admin or crew.'; end if;
  select id into v_ws from public.workspaces where slug = v_slug for update;
  select p.id into v_user from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(btrim(v_email)) and p.workspace_id = v_ws and p.active;
  if v_user is null then raise exception 'No active account % in "%".', v_email, v_slug; end if;
  if v_role = 'crew' and not exists (
       select 1 from public.profiles where workspace_id = v_ws and role = 'admin' and active and id <> v_user) then
    raise exception 'This is the last admin of "%".', v_slug;
  end if;
  update auth.users set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', v_role) where id = v_user;
  if not exists (select 1 from public.profiles where id = v_user and workspace_id = v_ws and role = v_role and active) then
    raise exception 'The role was not changed. Nothing was saved.';
  end if;
end $$;


-- ═══ 6 · REMOVE ACCESS (keeps the person's name on old records) ═════════════════════════════════
do $$
declare
  -- EDIT
  v_slug  text := 'my-studio';
  v_email text := 'person@example.com';
  -- END EDIT
  v_ws uuid;
  v_user uuid;
begin
  select id into v_ws from public.workspaces where slug = v_slug for update;
  select p.id into v_user from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(btrim(v_email)) and p.workspace_id = v_ws and p.active;
  if v_user is null then raise exception 'No active account % in "%".', v_email, v_slug; end if;
  if not exists (
       select 1 from public.profiles where workspace_id = v_ws and role = 'admin' and active and id <> v_user) then
    raise exception 'This is the last admin of "%".', v_slug;
  end if;
  update auth.users set raw_app_meta_data = raw_app_meta_data - 'role' where id = v_user;
  if exists (select 1 from public.profiles where id = v_user and active) then
    raise exception 'Access was not removed. Nothing was saved.';
  end if;
end $$;


-- ═══ 7 · RESTORE ACCESS (same workspace only) ═══════════════════════════════════════════════════
do $$
declare
  -- EDIT
  v_slug  text := 'my-studio';
  v_email text := 'person@example.com';
  v_role  text := 'crew';                            -- 'admin' or 'crew'
  -- END EDIT
  v_ws uuid;
  v_user uuid;
begin
  if v_role not in ('admin', 'crew') then raise exception 'Role must be admin or crew.'; end if;
  select id into v_ws from public.workspaces where slug = v_slug and status = 'active';
  select p.id into v_user from public.profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(btrim(v_email)) and p.workspace_id = v_ws and not p.active;
  if v_user is null then raise exception 'No removed account % in "%".', v_email, v_slug; end if;
  update auth.users set
    raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', v_role, 'workspace_id', v_ws)
  where id = v_user;
  if not exists (select 1 from public.profiles where id = v_user and workspace_id = v_ws and role = v_role and active) then
    raise exception 'Access was not restored. Nothing was saved.';
  end if;
end $$;


-- ═══ 8 · CHANGE WORKSPACE STATUS (there is no delete) ═══════════════════════════════════════════
do $$
declare
  -- EDIT
  v_slug       text := 'my-studio';
  v_status     text := 'read_only';                  -- 'active', 'read_only' or 'closed'
  v_paid_until date := null;                         -- null keeps the current date
  -- END EDIT
begin
  if v_status not in ('active', 'read_only', 'closed') then raise exception 'Unknown status.'; end if;
  update public.workspaces set status = v_status, paid_until = coalesce(v_paid_until, paid_until) where slug = v_slug;
  if not found then raise exception 'No workspace "%".', v_slug; end if;
end $$;
