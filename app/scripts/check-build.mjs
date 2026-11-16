// PG1 production-build guard (PRODUCTION-PLAN P0): run after `next build` with APP_ENV=staging|production.
// Fails if any dev surface survived into .next/:
//   - a /dev route in the app-paths manifest
//   - fixture / fail / latency hooks or fixture names in client JS
//   - a service-role key reference in client JS
// `proto:` localStorage keys belong to the mock data source, which is only removed from the client
// bundle in P3. They are reported as a warning until then; pass --strict-proto (CI from P3) to fail.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const next = join(root, ".next");
const strictProto = process.argv.includes("--strict-proto");
if (!existsSync(next)) {
  console.error("check-build: .next/ not found — run `next build` first.");
  process.exit(2);
}

const failures = [];
const warnings = [];

// 1. Routes
const manifest = join(next, "server", "app-paths-manifest.json");
if (existsSync(manifest)) {
  const routes = Object.keys(JSON.parse(readFileSync(manifest, "utf8")));
  for (const r of routes) if (r === "/dev" || r.startsWith("/dev/")) failures.push(`dev route in build: ${r}`);
  console.log(`check-build: ${routes.length} app routes inspected`);
} else failures.push("server/app-paths-manifest.json missing — cannot verify routes");

// 2. Client bundle
const js = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".js")) js.push(p);
  }
})(join(next, "static"));

const rules = [
  { re: /screen-\d{2}[a-z]?["'`]/, why: "Figma fixture name (fixtures.ts) in client JS" },
  { re: /URLSearchParams[^;]{0,80}["'](fixture|latency)["']|\.get\(["'](fixture|latency)["']\)|getAll\(["']fail["']\)/, why: "?fixture= / ?latency= / ?fail= hook in client JS" },
  { re: /NEXT_PUBLIC_(TODAY|LATENCY)/, why: "test-only env switch in client JS" },
  { re: /SUPABASE_SERVICE|service_role/i, why: "service-role key reference in client JS" },
];
// The actual service-role key value (CI sets a placeholder; a real key in any env must never reach the browser).
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let proto = 0;
for (const file of js) {
  const src = readFileSync(file, "utf8");
  if (serviceKey && serviceKey.length >= 12 && src.includes(serviceKey)) failures.push(`service-role key VALUE in client JS: ${file.slice(root.length + 1)}`);
  const rel = file.slice(root.length + 1);
  for (const { re, why } of rules) if (re.test(src)) failures.push(`${why}: ${rel}`);
  if (/["'`]proto:/.test(src)) proto++;
}
console.log(`check-build: ${js.length} client chunks inspected`);
if (proto) (strictProto ? failures : warnings).push(`"proto:" storage keys in ${proto} client chunk(s) — mock data source still bundled (removed in P3)`);

for (const w of warnings) console.warn(`warn: ${w}`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL: ${f}`);
  process.exit(1);
}
console.log("check-build: OK");
