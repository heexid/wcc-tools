import { execFileSync } from "node:child_process";
import { join } from "node:path";

/** Fresh seed (migrations from zero + seed.sql + seed.local-users.sql). Each spec file calls it in beforeAll so
 *  files never depend on each other's writes. Playwright runs from app/. */
export function resetDb() {
  const app = process.cwd();
  const cli = join(app, "node_modules", ".bin", "supabase");
  // `db reset` restarts the Auth / REST containers; it occasionally fails while they are still coming up from a
  // previous reset, so retry once.
  for (let attempt = 1; ; attempt++) {
    try {
      execFileSync(cli, ["db", "reset"], { cwd: join(app, ".."), stdio: "pipe" });
      break;
    } catch (e) {
      if (attempt >= 2) throw e;
      sleep(5000);
    }
  }
  waitForApi();
}

/** Block until Auth and REST answer again after the restart (a sign-in right after a reset otherwise fails). */
function waitForApi(timeoutMs = 60_000) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const ok = (path: string) => {
    try {
      execFileSync("curl", ["-sf", "-o", "/dev/null", "-H", `apikey: ${key}`, `${base}${path}`], { stdio: "ignore", timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  };
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (ok("/auth/v1/health") && ok("/rest/v1/")) return;
    sleep(1000);
  }
  throw new Error("Supabase API did not come back after db reset");
}

const sleep = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** One SQL value from the local stack (read-only checks the UI can't show, e.g. a booking's stored total). */
export function sql(query: string): string {
  return execFileSync("docker", ["exec", "supabase_db_wcc-tools-booking", "psql", "-U", "postgres", "-tAc", query], { encoding: "utf8" }).trim();
}
