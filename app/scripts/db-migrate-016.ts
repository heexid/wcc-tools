// Upgrade check for migration 016 (workspaces, SD1): a database with data before it runs keeps every row, edit time and
// invoice hash, lands in one workspace, and nobody's access changes. npm run test:migrate-016
import type { PGlite } from "@electric-sql/pglite";
import { bootDb, seedBefore016 } from "./db-harness";

const id = (n: number) => `00000000-0000-4000-8000-0000000016${String(n).padStart(2, "0")}`;
const TABLES = ["profiles", "crew", "packages", "bookings", "booking_items", "booking_crew", "invoices", "booking_counters", "invoice_counters", "workspace_settings"];

async function fingerprint(pg: PGlite) {
  const out: Record<string, unknown> = {};
  for (const t of TABLES)
    out[t] = (await pg.query(`select count(*)::int n, md5(coalesce(string_agg((to_jsonb(x) - 'workspace_id')::text, '|' order by (to_jsonb(x) - 'workspace_id')::text), '')) h from public.${t} x`)).rows[0];
  out.accounts = (await pg.query("select id, email, raw_app_meta_data - 'workspace_id' as meta from auth.users order by id")).rows;
  out.hashes = (await pg.query("select string_agg(snapshot_hash, ',' order by id) h from public.invoices")).rows[0];
  return out;
}

async function main() {
  let failed = 0;
  const check = (label: string, ok: boolean, info?: unknown) => {
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✘"} ${label}${ok ? "" : ` ${JSON.stringify(info)}`}`);
  };

  let before: Record<string, unknown> = {};
  const pg = await bootDb({
    quiet: true,
    seed: false,
    beforeMigration: async (db, file) => {
      if (!file.includes("000016_")) return;
      await db.exec(seedBefore016());
      await db.exec(`insert into auth.users (id, email, raw_app_meta_data) values
          ('${id(1)}', 'admin@t.test', '{"role":"admin"}'), ('${id(2)}', 'crew@t.test', '{"role":"crew"}'), ('${id(3)}', 'gone@t.test', '{"role":"crew"}'), ('${id(4)}', 'nobody@t.test', '{}');
        update auth.users set raw_app_meta_data = '{}' where id = '${id(3)}';
        update public.bookings set created_by = '${id(1)}' where ref = 'BK-2026-0144';`);
      before = await fingerprint(db);
    },
  });
  const after = await fingerprint(pg);
  for (const k of Object.keys(before)) check(`unchanged: ${k}`, JSON.stringify(before[k]) === JSON.stringify(after[k]), [before[k], after[k]]);

  const ws = (await pg.query<{ id: string; slug: string; s: string }>("select w.id, w.slug, (select workspace_id from public.workspace_settings) s from public.workspaces w")).rows;
  check("one workspace, with the settings row's id", ws.length === 1 && ws[0].id === ws[0].s && ws[0].slug === "main", ws);
  for (const t of TABLES) {
    const n = (await pg.query<{ n: number }>(`select count(*)::int n from public.${t} where workspace_id <> '${ws[0].id}'`)).rows[0].n;
    check(`in that workspace: ${t}`, n === 0, n);
  }
  const acc = (await pg.query<{ id: string; w: string | null; active: boolean | null }>("select u.id, u.raw_app_meta_data ->> 'workspace_id' w, p.active from auth.users u left join public.profiles p on p.id = u.id order by u.id")).rows;
  const by = Object.fromEntries(acc.map((a) => [a.id, a]));
  check("accounts with a profile carry the workspace", [1, 2, 3].every((n) => by[id(n)].w === ws[0].id), acc);
  check("an account without a profile does not", by[id(4)].w === null && by[id(4)].active === null, by[id(4)]);
  check("the inactive account stays inactive", by[id(3)].active === false && by[id(1)].active === true, acc);

  // Today's functions still work, and number on from the existing counters.
  await pg.exec(`select set_config('request.jwt.claims', '{"sub":"${id(1)}"}', false)`);
  const next = (await pg.query<{ n: number }>("select last_value n from public.invoice_counters where year = public.studio_year()")).rows[0]?.n ?? 0;
  const r = (await pg.query<{ r: { invoice: { number: string } } }>("select public.create_invoice((select id from public.bookings where ref = 'BK-2026-0144'), 'full') r")).rows[0].r;
  check("create_invoice continues the numbering", r.invoice.number.endsWith(String(next + 1).padStart(4, "0")), r.invoice.number);
  await pg.close();

  // It stops rather than guess.
  for (const [label, sql] of [
    ["two settings rows", seedBefore016() + "insert into public.workspace_settings (workspace_id, business_name, business_address, business_email, business_phone) select gen_random_uuid(), business_name, business_address, business_email, business_phone from public.workspace_settings;"],
    ["data without a settings row", "insert into public.crew (name) values ('Alone');"],
  ] as const) {
    const err = await bootDb({ quiet: true, seed: false, beforeMigration: async (db, f) => void (f.includes("000016_") && (await db.exec(sql))) }).then(() => "", (e: Error) => e.message);
    check(`refuses: ${label}`, /settings row/.test(err), err.slice(0, 160));
  }
  process.exit(failed ? 1 : 0);
}

main();
