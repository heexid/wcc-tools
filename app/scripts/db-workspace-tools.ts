// SD5 check: the developer's account template, block by block, and the one-workspace export, on the real migrations.
//   npm run test:workspace-tools
// supabase/templates/ is kept on the owner's machine only: without it (CI) the template part is skipped, the export isn't.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { bootDb, SUPABASE_DIR } from "./db-harness";

const TEMPLATE = join(SUPABASE_DIR, "templates", "workspace-accounts.sql");
let failed = 0;
const check = (label: string, ok: boolean, info?: unknown) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✘"} ${label}${ok ? "" : ` ${JSON.stringify(info)}`}`);
};
const one = async (pg: PGlite, sql: string) => Object.values((await pg.query<Record<string, unknown>>(sql)).rows[0] ?? {})[0];

async function template(pg: PGlite) {
  const src = readFileSync(TEMPLATE, "utf8");
  const blocks = new Map(src.split(/^-- ═══ /m).slice(1).map((b) => [Number(/^\d+/.exec(b)![0]), b.slice(b.indexOf("\n"))]));
  const run = async (n: number, edits: Record<string, string>) => {
    let sql = blocks.get(n)!;
    for (const [k, v] of Object.entries(edits)) {
      const re = new RegExp(`(\\b${k}\\s+\\w+\\s*:=\\s*)('[^']*'|null)`);
      if (!re.test(sql)) throw new Error(`block ${n}: ${k} not found`);
      sql = sql.replace(re, (_m, a: string) => a + (v === "null" ? "null" : `'${v}'`));
    }
    return pg.exec(sql).then(() => "ok", (e: Error) => e.message);
  };
  check("8 blocks", blocks.size === 8, [...blocks.keys()]);
  check("block 1 refuses unedited values", /Edit the values/.test(await run(1, {})));
  const r1 = await run(1, { v_slug: "studio-x", v_name: "Studio X", v_email: "x@x.test" });
  check("block 1 creates a workspace with its settings", r1 === "ok" && (await one(pg, "select business_name from public.workspace_settings s join public.workspaces w on w.id = s.workspace_id where w.slug = 'studio-x'")) === "Studio X", r1);
  check("block 1 refuses a slug that exists", (await run(1, { v_slug: "studio-x", v_name: "Again" })) !== "ok");
  check("block 2 needs the login first", /Dashboard first/.test(await run(2, { v_slug: "studio-x", v_email: "admin@x.test", v_name: "X Admin" })));
  for (const e of ["admin@x.test", "crew@x.test", "second@x.test"]) await pg.query("insert into auth.users (email, raw_app_meta_data) values ($1, '{\"provider\":\"email\"}')", [e]); // what the Dashboard does
  const r2 = await run(2, { v_slug: "studio-x", v_email: "admin@x.test", v_name: "X Admin" });
  check("block 2 adds an admin", r2 === "ok", r2);
  check("block 2 refuses the same person twice", /already has an account/.test(await run(2, { v_slug: "studio-x", v_email: "admin@x.test", v_name: "X Admin" })));
  const r3 = await run(3, { v_slug: "studio-x", v_email: "crew@x.test", v_name: "X Crew", v_job: "Editor" });
  check("block 3 adds crew with a job title", r3 === "ok" && (await one(pg, "select c.role from public.crew c join auth.users u on u.id = c.user_id where u.email = 'crew@x.test'")) === "Editor", r3);
  const aCrew = String(await one(pg, "select c.id from public.crew c join public.workspaces w on w.id = c.workspace_id where w.slug = 'main' and c.user_id is null limit 1"));
  check("block 3 refuses another workspace's crew entry", (await run(3, { v_slug: "studio-x", v_email: "second@x.test", v_name: "Two", v_crew_id: aCrew })) !== "ok");
  check("block 3 refused: no account was made", (await one(pg, "select count(*)::int from public.profiles p join auth.users u on u.id = p.id where u.email = 'second@x.test'")) === 0);
  const r4 = (await pg.query<{ email: string }>(blocks.get(4)!.replace("'my-studio'", "'studio-x'"))).rows.map((r) => r.email);
  check("block 4 lists the workspace's people only", JSON.stringify(r4.sort()) === '["admin@x.test","crew@x.test"]', r4);
  check("block 5 keeps the last admin", /last admin/.test(await run(5, { v_slug: "studio-x", v_email: "admin@x.test", v_role: "crew" })));
  const r5 = await run(5, { v_slug: "studio-x", v_email: "crew@x.test", v_role: "admin" });
  check("block 5 changes a role", r5 === "ok", r5);
  check("block 5 doesn't reach another workspace", (await run(5, { v_slug: "main", v_email: "crew@x.test", v_role: "crew" })) !== "ok");
  const r6 = await run(6, { v_slug: "studio-x", v_email: "crew@x.test" });
  check("block 6 removes access", r6 === "ok" && (await one(pg, "select active from public.profiles p join auth.users u on u.id = p.id where u.email = 'crew@x.test'")) === false, r6);
  check("block 6 keeps the last admin", /last admin/.test(await run(6, { v_slug: "studio-x", v_email: "admin@x.test" })));
  const r7 = await run(7, { v_slug: "studio-x", v_email: "crew@x.test", v_role: "crew" });
  check("block 7 restores access", r7 === "ok" && (await one(pg, "select active from public.profiles p join auth.users u on u.id = p.id where u.email = 'crew@x.test'")) === true, r7);
  const r8 = await run(8, { v_slug: "studio-x", v_status: "read_only" });
  check("block 8 changes the status", r8 === "ok" && (await one(pg, "select status from public.workspaces where slug = 'studio-x'")) === "read_only", r8);
  check("block 8 refuses an unknown status", (await run(8, { v_slug: "studio-x", v_status: "paused" })) !== "ok");
}

async function exportCheck(pg: PGlite) {
  // A second workspace with data of its own, so "only this workspace" means something.
  await pg.exec(`insert into public.workspaces (id, slug, name) values ('00000000-0000-4000-8000-0000000021b0', 'export-b', 'Export B');
    insert into public.workspace_settings (workspace_id, business_name, business_address, business_email, business_phone) values ('00000000-0000-4000-8000-0000000021b0', 'Export B', 'J', 'b@b.test', '+62 21-555-0100');
    insert into public.packages (workspace_id, name, price) values ('00000000-0000-4000-8000-0000000021b0', 'B only', 1);
    insert into storage.buckets (id, name) values ('branding', 'branding') on conflict do nothing;
    insert into storage.objects (bucket_id, name) values ('branding', '00000000-0000-4000-8000-0000000021b0/logo/b.png');`);
  const sql = readFileSync(join(SUPABASE_DIR, "scripts", "export-workspace.sql"), "utf8");
  check("export is read only", !/\b(insert|update|delete|alter|drop|truncate|create)\b/i.test(sql.replace(/--.*$/gm, "")));
  const of = async (slug: string) => (await pg.query<{ export: Record<string, unknown> }>(sql.replace("'my-studio'", `'${slug}'`))).rows[0].export as Record<string, unknown[]> & { workspace: { id: string } };
  const a = await of("main"), b = await of("export-b");
  for (const [k, t] of [["crew", "crew"], ["packages", "packages"], ["bookings", "bookings"], ["bookingItems", "booking_items"], ["bookingCrew", "booking_crew"], ["invoices", "invoices"], ["bookingCounters", "booking_counters"], ["invoiceCounters", "invoice_counters"]] as const)
    check(`export has every row: ${t}`, a[k].length === (await one(pg, `select count(*)::int from public.${t} x join public.workspaces w on w.id = x.workspace_id where w.slug = 'main'`)), a[k].length);
  check("export of A names nothing of B", !JSON.stringify(a).includes(b.workspace.id) && !JSON.stringify(a).includes("B only"));
  check("export of B names nothing of A", !JSON.stringify(b).includes(a.workspace.id) && b.bookings.length === 0 && b.packages.length === 1 && b.files.length === 1, b);
  check("export has no password", !/password_hash|encrypted_password/.test(JSON.stringify(a)));
}

async function main() {
  const pg = await bootDb({ quiet: true });
  if (existsSync(TEMPLATE)) await template(pg);
  else console.log("- template skipped: supabase/templates is not in this checkout");
  await exportCheck(pg);
  await pg.close();
  process.exit(failed ? 1 : 0);
}
main();
