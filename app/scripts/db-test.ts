// Local PG2 runner without Docker: PGlite (Postgres 17 in WASM) + pg_trgm + pgTAP.
//   npm run db:test               → migrations from zero, seed, every supabase/tests/**/*.test.sql
//   npm run db:test -- 003        → only test files whose name contains "003"
// CI runs the real thing (`supabase start` + `supabase test db`); this is the fast local loop.
// The Supabase shim (auth.users, auth.uid(), API roles) lives in db-harness.ts — it is
// never part of a migration.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bootDb, sqlFiles, SUPABASE_DIR } from "./db-harness";

const root = SUPABASE_DIR;
const filter = process.argv[2];
const files = sqlFiles;

async function main() {
  let pg;
  try {
    pg = await bootDb();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }

  let failed = 0;
  let passed = 0;
  const tests = files(join(root, "tests")).filter((f) => !filter || f.includes(filter));
  for (const t of tests) {
    let tap: string[] = [];
    try {
      const results = await pg.exec(readFileSync(join(root, "tests", t), "utf8"));
      tap = results.flatMap((r) => r.rows.flatMap((row) => Object.values(row).filter((v): v is string => typeof v === "string")));
    } catch (e) {
      console.error(`\n✘ ${t}: aborted\n  ${(e as Error).message}`);
      failed++;
      await pg.exec("rollback").catch(() => {});
      continue;
    }
    const lines = tap.flatMap((l) => l.split("\n"));
    const bad = lines.filter((l) => l.startsWith("not ok"));
    const ok = lines.filter((l) => /^ok \d+/.test(l)).length;
    const planned = Number(lines.find((l) => /^1\.\.\d+/.test(l))?.slice(3) ?? NaN);
    // No plan line means no TAP output at all (e.g. a file without plan()/finish()): count it as a failure.
    const planMismatch = !Number.isFinite(planned) || planned !== ok + bad.length;
    if (bad.length || planMismatch) {
      failed++;
      console.error(`\n✘ ${t}: ${bad.length} failed of ${ok + bad.length}${planMismatch ? ` (planned ${planned})` : ""}`);
      // Print each failure with the diagnostic lines that follow it.
      for (let i = 0; i < lines.length; i++) {
        if (!lines[i].startsWith("not ok")) continue;
        console.error(`  ${lines[i]}`);
        for (let j = i + 1; j < lines.length && lines[j].startsWith("#"); j++) console.error(`  ${lines[j]}`);
      }
    } else {
      passed++;
      console.log(`✓ ${t}: ${ok} assertions`);
    }
  }
  await pg.close();
  console.log(`\n${passed} file(s) passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main();
