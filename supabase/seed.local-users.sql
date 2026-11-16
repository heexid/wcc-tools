-- LOCAL / CI ONLY — never run on staging or production (known passwords). Loaded after seed.sql by
-- supabase/config.toml [db.seed]. Hosted environments create users through the admin path (PRODUCTION-PLAN P14).
-- Admin = the prototype's demo account (app/src/lib/data/seed.ts); viewer = the Owner role (INTERACTIONS 6.4).
do $$
declare
  u record;
begin
  for u in select * from (values
    ('00000000-0000-4000-8000-00000000aa01'::uuid, 'bs-moment@email.com', 'bsmoment26', 'bs.moment', 'admin', '2026-09-12 10:00+07'::timestamptz),
    ('00000000-0000-4000-8000-00000000aa02'::uuid, 'owner@bs-moment.test', 'ownerview26', 'Owner', 'viewer', '2026-09-12 10:00+07'::timestamptz),
    -- Used only by tests/e2e-supabase/auth.spec.ts, which changes its name and password.
    ('00000000-0000-4000-8000-00000000aa03'::uuid, 'account-test@bs-moment.test', 'accounttest26', 'Account Test', 'viewer', '2026-09-12 10:00+07'::timestamptz)
  ) as t(id, email, password, display_name, role, changed_at)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            extensions.crypt(u.password, extensions.gen_salt('bf')), now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', u.role), '{}', now(), now(), '', '', '', '')
    on conflict (id) do nothing;
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), 'email', now(), now(), now())
    on conflict do nothing;
    -- The auth.users trigger (migration 005) already made a viewer profile: set the seeded name and role.
    insert into public.profiles (id, display_name, role, password_changed_at)
    values (u.id, u.display_name, u.role, u.changed_at)
    on conflict (id) do update set display_name = excluded.display_name, role = excluded.role, password_changed_at = excluded.password_changed_at;
  end loop;
end $$;

-- Seeded bookings were "created by Admin" in the prototype: attribute them to the local admin. The derive trigger
-- is paused so updated_at keeps the seed value (created_by is not a derived field, so nothing else changes).
alter table public.bookings disable trigger bookings_derive;
update public.bookings set created_by = '00000000-0000-4000-8000-00000000aa01' where created_by is null;
alter table public.bookings enable trigger bookings_derive;
