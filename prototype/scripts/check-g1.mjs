// G1 gate — no raw colours or pixel values outside the generated token files.
// Flags: hex colours, rgb()/hsl() literals, px literals in TS/TSX/CSS, and Tailwind
// arbitrary values with raw numbers (e.g. w-[352px], text-[#fff]). var(--…) is allowed.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const ALLOW = new Set(["src/styles/tokens.css", "src/styles/tokens.manifest.json"]);
const rules = [
  { re: /#[0-9a-fA-F]{3,8}\b/g, why: "hex colour" },
  { re: /\b(rgba?|hsla?|oklch)\(/g, why: "colour literal" },
  { re: /(?<![\w-])-?\d*\.?\d+px\b/g, why: "px literal" },
  // Tailwind arbitrary values: allowed only when every number lives inside var(--token)
  // (e.g. pl-[calc(var(--spacing-16)-var(--spacing-2))]). Checked in the loop below.
];
const arbitrary = /[\w-]+-\[([^\]]+)\]/g;
const rawInArbitrary = (v) =>
  /\d/.test(v.replace(/var\(--[\w-]+\)/g, "").replace(/^(length|color|image):/, "").replace(/[*/]\s*\d+(\.\d+)?(?![\w%])/g, "").replace(/\d+(\.\d+)?(%|fr)/g, "")); // unitless ×/÷, % and grid fr allowed

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(f)) files.push(p);
  }
})(join(root, "src"));

const hits = [];
for (const file of files) {
  const rel = relative(root, file);
  if (ALLOW.has(rel)) continue;
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (/g1-ignore/.test(line) || /^\s*\*/.test(line)) return; // JSDoc continuation lines are comments
    const code = line.replace(/\/\/.*$|\/\*.*?\*\//g, ""); // ignore comments
    for (const { re, why } of rules) for (const m of code.matchAll(re)) hits.push(`${rel}:${i + 1}  ${why}: ${m[0]}`);
    for (const m of code.matchAll(arbitrary)) if (rawInArbitrary(m[1])) hits.push(`${rel}:${i + 1}  Tailwind arbitrary value: ${m[0]}`);
  });
}
if (hits.length) {
  console.error(`G1 failed — ${hits.length} raw value(s):\n` + hits.join("\n"));
  process.exit(1);
}
console.log(`G1 passed — ${files.length} files, no raw colours or px.`);
