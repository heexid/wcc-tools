// Checks that every focus ring is fully inside the browser viewport while it is on screen.
//   node scripts/audit-rings.mjs index.html dashboard.html flow.html update.html package.html
// For each ring it samples the middle of its visible window and reports any edge that is clipped.
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html', 'dashboard.html', 'flow.html', 'update.html', 'package.html'];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
let total = 0;
for (const p of pages) {
  await page.goto(pathToFileURL(path.join(root, p)).href);
  await page.evaluate(() => window.ready);
  const bad = await page.evaluate(() => {
    const out = [];
    RINGS.forEach((r, i) => {
      const shot = SHOTS[r.shot];
      // sample after the camera has settled: three-quarters through the ring's window
      const t = r.t0 + (r.t1 - r.t0) * 0.75;
      const [x, y, w, h] = toScreen(shot, t, r.r);
      const pad = 8, m = 4;
      const clip = [];
      if (x - pad < -m) clip.push(`left ${Math.round(x - pad)}`);
      if (y - pad < -m) clip.push(`top ${Math.round(y - pad)}`);
      if (x + w + pad > VW + m) clip.push(`right +${Math.round(x + w + pad - VW)}`);
      if (y + h + pad > VH + m) clip.push(`bottom +${Math.round(y + h + pad - VH)}`);
      if (clip.length) out.push(`ring ${i} (shot ${r.shot} ${shot.img}, r=${JSON.stringify(r.r)}): ${clip.join(', ')}`);
    });
    return out;
  });
  total += bad.length;
  console.log(`${p}: ${bad.length ? bad.length + ' clipped' : 'all rings inside'}`);
  bad.forEach(b => console.log('  ' + b));
}
await browser.close();
process.exit(total ? 1 : 0);
