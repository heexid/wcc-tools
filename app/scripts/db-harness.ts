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

// Test only, never part of a migration: rows in single-workspace tests land in the seeded workspace, and
// test_only.meta() adds it to an account's metadata. With a second workspace the default is null, so a function that
// forgets its workspace still fails (018_workspace_isolation drops the defaults altogether).
const TEST_HELPERS = `
  create schema test_only;
  create function test_only.ws() returns uuid language sql stable security definer set search_path = '' as $$
    select case when count(*) = 1 then (array_agg(w.id))[1] end from public.workspaces w $$;
  create function test_only.meta(m jsonb) returns jsonb language sql stable security definer set search_path = '' as $$
    select m || jsonb_build_object('workspace_id', test_only.ws()) $$;
  do $$ declare t text; begin
    foreach t in array array['profiles','crew','packages','bookings','booking_items','booking_crew','invoices','booking_counters','invoice_counters'] loop
      execute format('alter table public.%I alter column workspace_id set default test_only.ws()', t);
    end loop;
  end $$;
`;

export const sqlFiles = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

export async function bootDb(opts: { quiet?: boolean; seed?: boolean; beforeMigration?: (pg: PGlite, file: string) => Promise<void> } = {}): Promise<PGlite> {
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
  await pg.exec(TEST_HELPERS);
  if (opts.seed === false) return pg;
  await pg.exec(readFileSync(join(SUPABASE_DIR, "seed.sql"), "utf8"));
  log("seed     seed.sql");
  return pg;
}

/** seed.sql as it was before migration 016 (no workspaces table), for the upgrade tests. */
export const seedBefore016 = () => {
  const s = readFileSync(join(SUPABASE_DIR, "seed.sql"), "utf8");
  const ws = /insert into public\.workspaces [^(]*\([^)]*\) values \('([0-9a-f-]{36})'/.exec(s)?.[1];
  if (!ws) throw new Error("seed.sql: workspaces insert not found");
  // Statement by statement: drop the workspaces insert, and the workspace column from every other table.
  const out = s
    .split(/(?=^insert into )/m)
    .filter((x) => !x.startsWith("insert into public.workspaces "))
    .map((x) => (x.startsWith("insert into public.workspace_settings ") || !x.startsWith("insert into ") ? x : x.replace("(workspace_id, ", "(").replaceAll(`('${ws}', `, "(")))
    .join("");
  return out;
};
