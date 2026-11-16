// P11 · PG7 query budgets (PRD §4.5) on the LOCAL stack with supabase/perf-seed.sql loaded.
//   npm run perf            → median of 7 runs per query, as a signed-in admin under RLS, vs the budgets
// Budgets: calendar month < 200 ms, table page < 300 ms (PRD §4.5). Week, search and KPIs are held to the same
// 300 ms. Measured with EXPLAIN (ANALYZE) "Execution Time" on the database; network and rendering are not included
// (those are LCP / INP, measured in the browser).
import { execFileSync } from "node:child_process";

const ADMIN = "00000000-0000-4000-8000-00000000aa01"; // seed.local-users.sql
const RUNS = 7;
const crew = sql("select id from public.crew where name = 'Raka Pratama'");
const gold = sql("select id from public.packages where name = 'Gold Package'");

const cases: { name: string; budget: number; call: string }[] = [
  { name: "calendar month (Nov 2026 grid)", budget: 200, call: `public.list_all_bookings('{"view":"calendar","from":"2026-10-26","to":"2026-12-06"}')` },
  { name: "calendar week", budget: 200, call: `public.list_all_bookings('{"view":"calendar","from":"2026-11-09","to":"2026-11-15"}')` },
  { name: "table page 1, default order (all bookings)", budget: 300, call: `public.list_bookings('{"view":"table","today":"2026-11-10","page":1,"pageSize":10}')` },
  {
    name: "table page 2, 3 filters + sort",
    budget: 300,
    call: `public.list_bookings('{"view":"table","today":"2026-11-10","status":["partially_paid","paid"],"crewIds":["${crew}"],"from":"2026-01-01","to":"2026-12-31","sort":{"key":"total","dir":"desc"},"page":2,"pageSize":25}')`,
  },
  { name: "search 'sari' (trigram)", budget: 300, call: `public.list_bookings('{"view":"table","today":"2026-11-10","search":"sari"}')` },
  { name: "search local phone '08123'", budget: 300, call: `public.list_bookings('{"view":"table","today":"2026-11-10","search":"08123"}')` },
  { name: "package filter (Gold)", budget: 300, call: `public.list_bookings('{"view":"table","today":"2026-11-10","packageIds":["${gold}"]}')` },
  { name: "KPIs (Nov 2026)", budget: 300, call: `public.get_kpis('2026-11')` },
];

function sql(q: string): string {
  return execFileSync("docker", ["exec", "-i", "supabase_db_wcc-tools-booking", "psql", "-U", "postgres", "-tAc", q], { encoding: "utf8" }).trim();
}

function timeAsAdmin(call: string): number {
  const script = `begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"${ADMIN}"}', true);
explain (analyze, format json) select ${call};
rollback;`;
  const out = execFileSync("docker", ["exec", "-i", "supabase_db_wcc-tools-booking", "psql", "-U", "postgres", "-tA"], { input: script, encoding: "utf8" });
  const json = out.slice(out.indexOf("["), out.lastIndexOf("]") + 1);
  return JSON.parse(json)[0]["Execution Time"] as number;
}

const counts = sql("select (select count(*) from public.bookings) || ' bookings · ' || (select count(*) from public.invoices) || ' invoices · ' || (select count(*) from public.packages) || ' packages'");
console.log(`data: ${counts}\n`);
if (Number(counts.split(" ")[0]) < 10000) {
  console.error("Load supabase/perf-seed.sql first (10k bookings).");
  process.exit(2);
}

let failed = 0;
for (const c of cases) {
  timeAsAdmin(c.call); // warm-up
  const ms = Array.from({ length: RUNS }, () => timeAsAdmin(c.call)).sort((a, b) => a - b);
  const median = ms[Math.floor(RUNS / 2)];
  const ok = median < c.budget;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✘"} ${c.name.padEnd(46)} median ${median.toFixed(1).padStart(7)} ms  (p max ${ms.at(-1)!.toFixed(1)} ms)  budget ${c.budget} ms`);
}
console.log(`\n${cases.length - failed} / ${cases.length} within budget`);
process.exit(failed ? 1 : 0);
