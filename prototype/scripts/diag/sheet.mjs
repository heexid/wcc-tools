import { PNG } from "pngjs"; import { readFileSync, writeFileSync, existsSync } from "node:fs";
const names = process.argv.slice(3); const S = 3; const rows = [];
for (const n of names) {
  const f = PNG.sync.read(readFileSync(`public/__figma__/${n}.png`));
  const a = existsSync(`test-results/visual/f01/${n}-actual.png`) ? PNG.sync.read(readFileSync(`test-results/visual/f01/${n}-actual.png`)) : f;
  const d = existsSync(`test-results/visual/f01/${n}-diff.png`) ? PNG.sync.read(readFileSync(`test-results/visual/f01/${n}-diff.png`)) : f;
  rows.push([f, a, d]);
}
const W = Math.max(...rows.map(r => r.reduce((s, p) => s + p.width * S + 8, 0))), H = rows.reduce((s, r) => s + Math.max(...r.map(p => p.height)) * S + 8, 0);
const out = new PNG({ width: W, height: H }); out.data.fill(200);
let y = 0;
for (const r of rows) { let x = 0; for (const p of r) { for (let j = 0; j < p.height * S; j++) for (let i = 0; i < p.width * S; i++) { const si = ((j / S | 0) * p.width + (i / S | 0)) * 4, di = ((y + j) * W + x + i) * 4; const al = p.data[si + 3] / 255; for (let c = 0; c < 3; c++) out.data[di + c] = p.data[si + c] * al + 255 * (1 - al); out.data[di + 3] = 255; } x += p.width * S + 8; } y += Math.max(...r.map(p => p.height)) * S + 8; }
writeFileSync(process.argv[2], PNG.sync.write(out));
