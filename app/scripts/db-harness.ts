// Shared PGlite bootstrap for db-test.ts (pgTAP) and parity-db.ts (PG3): Postgres 17 in WASM, the Supabase
// pieces a migration expects (auth schema + auth.uid(), API roles, extensions schema), every migration from
// zero, then the seed. The shim is local-only: on Supabase all of it already exists.
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { pgtap } from "@electric-sql/pglite-pgtap";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SUPABASE_DIR = join(import.meta.dirname, "..", "..", "supabase");

const SUPABASE_SHIM = `
  create schema if not exists auth;
  create schema if not exists extensions;
  create table if not exists auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb not null default '{}', raw_app_meta_data jsonb not null default '{}');
  -- Same lookup as Supabase's auth.uid(): the JWT "sub" claim of the current request.
  create or replace function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )::uuid
  $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end $$;
  grant usage on schema public, auth, extensions to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  -- Like current Supabase: no default table grants to the API roles (each migration grants what it exposes).
  -- Functions do get EXECUTE via PUBLIC, as in plain Postgres, so migrations must revoke what they hide.
  -- Storage (just the tables migrations reference; the Storage API itself is Supabase's).
  create schema if not exists storage;
  create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id),
    name text, owner uuid, metadata jsonb);
  alter table storage.objects enable row level security;
  create extension if not exists pgtap with schema extensions;
  alter database template1 set search_path = "$user", public, extensions;
  set search_path = "$user", public, extensions;
`;

export const sqlFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

export async function bootDb(opts: { quiet?: boolean; beforeMigration?: (pg: PGlite, file: string) => Promise<void> } = {}): Promise<PGlite> {
  const log = (m: string) => !opts.quiet && console.log(m);
  const pg = await PGlite.create({ extensions: { pg_trgm, pgtap } });
  await pg.exec(SUPABASE_SHIM);
  for (const m of sqlFiles(join(SUPABASE_DIR, "migrations"))) {
    await opts.beforeMigration?.(pg, m);
    try {
      await pg.exec(readFileSync(join(SUPABASE_DIR, "migrations", m), "utf8"));
      log(`migrate  ${m}`);
    } catch (e) {
      throw new Error(`migrate  ${m} FAILED\n${(e as Error).message}`);
    }
  }
  await pg.exec(readFileSync(join(SUPABASE_DIR, "seed.sql"), "utf8"));
  log("seed     seed.sql");
  return pg;
}
