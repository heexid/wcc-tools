// Upgrade check for migration 014: accounts that exist BEFORE it runs (viewers → admins, inactive stay inactive,
// crew_id linking), plus the append-only block on deleting an account that issued invoices. npm run test:migrate-014
import { bootDb, seedBefore016 } from "./db-harness";

const id = (n: number) => `00000000-0000-4000-8000-0000000007${String(n).padStart(2, "0")}`;
const CREW = "00000000-0000-4000-8000-0000000008aa";

async function main() {
  const pg = await bootDb({
    quiet: true,
    seed: false,
    beforeMigration: async (db, file) => {
      // 016 needs the seeded data (it refuses accounts without a settings row).
      if (file.includes("000016_")) return void (await db.exec(seedBefore016()));
      if (!file.includes("000014_")) return;
      await db.exec(`
        insert into public.crew (id, name, role) values ('${CREW}', 'Existing Crew', 'Videographer');
        insert into auth.users (id, email, raw_app_meta_data) values
          ('${id(1)}', 'owner@t.test', '{"role":"viewer"}'), ('${id(2)}', 'gone@t.test', '{"role":"viewer"}'),
          ('${id(3)}', 'admin@t.test', '{"role":"admin"}'), ('${id(4)}', 'manual@t.test', '{"role":"viewer"}');
        update auth.users set raw_app_meta_data = raw_app_meta_data || '{"crew_id":"${CREW}"}' where id = '${id(3)}';
        update auth.users set raw_app_meta_data = '{}' where id = '${id(2)}';
        update public.profiles set active = false where id = '${id(4)}';`);
    },
  });
  const rows = (await pg.query(`select p.id, p.role, p.active, u.raw_app_meta_data ->> 'role' as meta, c.name, c.role as title
    from public.profiles p join auth.users u on u.id = p.id left join public.crew c on c.user_id = p.id order by p.id`)).rows;
  const want = [
    { id: id(1), role: "admin", active: true, meta: "admin", name: "owner", title: "" },
    { id: id(2), role: "crew", active: false, meta: null, name: null, title: null },
    { id: id(3), role: "admin", active: true, meta: "admin", name: "Existing Crew", title: "Videographer" },
    { id: id(4), role: "crew", active: false, meta: "viewer", name: null, title: null },
  ];
  let failed = 0;
  const check = (label: string, got: unknown, exp: unknown) => {
    const ok = JSON.stringify(got) === JSON.stringify(exp);
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✘"} ${label}${ok ? "" : `\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(exp)}`}`);
  };
  want.forEach((w, i) => check(`account ${i + 1}`, rows[i], w));
  check("accounts", rows.length, want.length);

  await pg.exec(`select set_config('request.jwt.claims', '{"sub":"${id(3)}"}', false);`);
  await pg.query(`select public.create_invoice((select id from public.bookings where ref = 'BK-2026-0144'), 'full')`);
  const err = await pg.query("delete from auth.users where id = $1", [id(3)]).then(() => "deleted", (e: Error) => e.message);
  check("an account that issued an invoice can't be deleted", err, "append_only");
  await pg.close();
  process.exit(failed ? 1 : 0);
}

main();
