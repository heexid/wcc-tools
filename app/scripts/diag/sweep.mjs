import { chromium } from "playwright"; import { PNG } from "pngjs"; import pixelmatch from "pixelmatch"; import { readFileSync } from "node:fs";
import variants from "../../public/__figma__/specs/F01-variants.json" with { type: "json" };
const flat = p => { const o = Buffer.alloc(p.data.length); for (let i=0;i<o.length;i+=4){const a=p.data[i+3]/255; for(let c=0;c<3;c++) o[i+c]=Math.round(p.data[i+c]*a+255*(1-a)); o[i+3]=255;} return o; };
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: "reduce" });
await page.goto("http://localhost:3100/dev/components"); await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
for (const f of process.argv.slice(2)) {
  const v = variants.find(x => x.file === f); const exp = PNG.sync.read(readFileSync(`public/__figma__/${f}.png`));
  const el = page.locator(`[data-figma="${f}"] > *`).first(); await el.scrollIntoViewIfNeeded();
  const out = [];
  for (const off of [-1, -0.75, -0.5, -0.375, -0.25, -0.125, 0, 0.25, 0.5]) {
    await el.evaluate((e, off) => { const t = e.querySelector("span.inline-block") ?? e; t.style.transform = `translateX(${off}px)`; }, off);
    const box = await el.boundingBox();
    const buf = await page.screenshot({ clip: { x: Math.round(box.x + v.render.x), y: Math.round(box.y + v.render.y), width: exp.width, height: exp.height }, omitBackground: true });
    const act = PNG.sync.read(buf);
    out.push(`${off}:${pixelmatch(flat(act), flat(exp), null, exp.width, exp.height, { threshold: 0.1, includeAA: false })}`);
  }
  console.log(f.replace("f01-", "").padEnd(58), out.join("  "));
}
await b.close();
