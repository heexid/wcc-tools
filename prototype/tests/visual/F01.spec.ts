import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import variants from "../../public/__figma__/specs/F01-variants.json";
import { diffComponent, diffPngs, G3, G3C, readFigmaPng, settle } from "../helpers/visual";

// F1 — every CIR component variant vs its Figma component (exported with render bounds, so
// focus rings and shadows are compared too). Box = G2, pixels = G3.
const OUT = join(__dirname, "../../test-results/visual/f01");

test.describe.configure({ mode: "parallel", timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  await page.goto("/dev/components");
  await settle(page);
});

for (const v of variants) {
  test(`${v.set} · ${v.variant}`, async ({ page }) => {
    const host = page.locator(`[data-figma="${v.file}"]`);
    test.skip((await host.count()) === 0, "not rendered in the gallery (out of F1 scope)");
    const el = host.locator(":scope > *").first();
    await el.scrollIntoViewIfNeeded();
    const box = (await el.boundingBox())!;

    // G2 — box. Hug-content nodes may differ by < 1px (Figma rounds text boxes up, F0 finding).
    // Focus variants: Figma drops the 1px inside stroke (node 71 vs 73) — the ring is compared in G3.
    const isFocusRing = v.set === "Button" && /Focus/.test(v.variant);
    const dw = box.width - v.w;
    const dh = box.height - v.h;
    test.info().annotations.push({ type: "G2", description: `${box.width.toFixed(2)}×${box.height.toFixed(2)} vs Figma ${v.w}×${v.h}` });
    if (!isFocusRing) {
      expect(Math.abs(dw), `width ${box.width} vs ${v.w}`).toBeLessThan(1);
      expect(Math.abs(dh), `height ${box.height} vs ${v.h}`).toBeLessThan(1);
    }

    // G3 — pixels. Align the node's top-left (Figma lays text out from the left edge; its box is only
    // wider because it rounds text up), then apply Figma's render-bounds offset. Focus variants: Figma's
    // node excludes the 1px border we keep, so its left edge is 1px inside ours.
    const expected = readFigmaPng(v.file);
    const inset = isFocusRing && !v.variant.includes("Ghost") && !v.variant.includes("Icon only") ? 1 : 0;
    const x = Math.round(box.x + inset + v.render.x);
    const y = Math.round(box.y + v.render.y);
    const buf = await page.screenshot({ clip: { x, y, width: expected.width, height: expected.height }, omitBackground: true });
    const actual = PNG.sync.read(buf);
    // Masks: regions where the Figma sample content is inconsistent (documented in the variants JSON).
    for (const m of (v as { mask?: { x: number; y: number; w: number; h: number }[] }).mask ?? [])
      for (let yy = m.y; yy < m.y + m.h; yy++)
        for (let xx = m.x; xx < m.x + m.w; xx++) {
          const i = (yy * expected.width + xx) * 4;
          expected.data.copy(actual.data, i, i, i + 4);
        }
    const res = diffPngs(actual, expected);
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `${v.file}-actual.png`), buf);
    if (res.diff) writeFileSync(join(OUT, `${v.file}-diff.png`), PNG.sync.write(res.diff));
    expect(res.diffPixels, "capture size must equal the Figma export").not.toBe(-1);
    // Whole-image ratio is reported; the gate for components is G3c (flat = 0, edges ≤ 20%).
    const c = diffComponent(actual, expected)!;
    test.info().annotations.push({
      type: "G3",
      description: `${(res.ratio * 100).toFixed(2)}% (${res.diffPixels} px) · G3c flat ${c.flatDiffs} · edges ${c.edgeDiffs}/${c.edgeTotal} (${(c.edgeRatio * 100).toFixed(1)}%)`,
    });
    if (res.ratio <= G3.maxDiffPixelRatio) return; // already within the screen gate
    const accept = (v as { accept?: { flatDiffs: number } }).accept?.flatDiffs ?? 0; // documented per-variant exception
    expect(c.flatDiffs, `${v.file}: differing pixels on flat areas`).toBeLessThanOrEqual(accept);
    expect(c.edgeRatio, `${v.file}: differing edge pixels`).toBeLessThanOrEqual(G3C.edgeRatio);
  });
}

test("Text area focus ring = Effect/Focus Ring token (G2, computed)", async ({ page }) => {
  await page.goto("/dev/components");
  const box = page.locator('[data-figma="f01-text-area--state-focus"] [data-force="focus"]');
  const shadow = await box.evaluate((e) => getComputedStyle(e).boxShadow);
  const token = await page.evaluate(() => {
    const p = document.createElement("div");
    p.style.boxShadow = "var(--shadow-focus-ring)";
    document.body.appendChild(p);
    return getComputedStyle(p).boxShadow;
  });
  // Tailwind stacks empty ring/shadow layers first; the painted layer is the last one.
  expect(shadow.endsWith(token)).toBe(true);
});

test("G3c self-test: a 1px shift of a component fails the gate", () => {
  for (const f of ["f01-button--variant-secondary-state-default-content-label", "f01-payment-status-badge--status-partially-paid", "f01-menu-item--tone-default-state-default"]) {
    const png = readFigmaPng(f);
    expect(diffComponent(png, png)!.flatDiffs).toBe(0);
    const shifted = new PNG({ width: png.width, height: png.height });
    PNG.bitblt(png, shifted, 1, 0, png.width - 1, png.height, 0, 0);
    const c = diffComponent(shifted, png)!;
    expect(c.flatDiffs > 0 || c.edgeRatio > G3C.edgeRatio, `${f} shifted: flat ${c.flatDiffs}, edges ${(c.edgeRatio * 100).toFixed(1)}%`).toBe(true);
  }
});
