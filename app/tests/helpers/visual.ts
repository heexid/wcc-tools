import { expect, type Locator, type Page, test } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// G3 — screenshot diff against the Figma frame exported at 1× (public/__figma__/<frame>.png).
// Pass: maxDiffPixelRatio ≤ 0.005 at threshold 0.1 (allowance is for font antialiasing only).
export const G3 = { threshold: 0.1, maxDiffPixelRatio: 0.005 };

const FIGMA_DIR = join(__dirname, "../../public/__figma__");
const OUT_DIR = join(__dirname, "../../test-results/visual");

/** Freeze the page for capture: no motion, no caret, fonts loaded, no Next.js dev issues. */
export async function settle(page: Page, opts: { keepPointer?: boolean } = {}) {
  if (!opts.keepPointer) await page.mouse.move(0, 0); // no lingering :hover from the last click
  await page.addStyleTag({
    content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}`,
  });
  await page.evaluate(() => document.fonts.ready);
  await expectNoDevIssues(page);
}

/** Next.js dev overlay ("1 Issue" toast) means a runtime/compile error — fail before capturing. */
export async function expectNoDevIssues(page: Page) {
  const issues = await page.evaluate(() => {
    // Rendered text only (the portal's <style> blocks are part of textContent).
    const root = document.querySelector("nextjs-portal")?.shadowRoot;
    if (!root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text = "";
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.parentElement?.tagName !== "STYLE") text += ` ${n.textContent}`;
    return /\d+\s+Issues?/.test(text) ? text.replace(/\s+/g, " ").trim().slice(0, 300) : null;
  });
  expect(issues, `Next.js dev issue on ${page.url()}`).toBeNull();
}

export function readFigmaPng(frame: string) {
  return PNG.sync.read(readFileSync(join(FIGMA_DIR, `${frame}.png`)));
}

/** Composite onto opaque white so transparent Figma exports and browser captures compare by what is seen. */
function flatten(png: PNG): Buffer {
  const out = Buffer.alloc(png.data.length);
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3] / 255;
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(png.data[i + c] * a + 255 * (1 - a));
    out[i + 3] = 255;
  }
  return out;
}

export function diffPngs(actual: PNG, expected: PNG, threshold = G3.threshold) {
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return { ratio: 1, diffPixels: -1, size: `${actual.width}×${actual.height} vs Figma ${expected.width}×${expected.height}`, diff: null };
  }
  const diff = new PNG({ width: expected.width, height: expected.height });
  const diffPixels = pixelmatch(flatten(actual), flatten(expected), diff.data, expected.width, expected.height, { threshold, includeAA: false });
  return { ratio: diffPixels / (expected.width * expected.height), diffPixels, size: `${expected.width}×${expected.height}`, diff };
}

/**
 * G3c — component gate (PROTOTYPE-PLAN §0.3). Figma and Chrome antialias glyphs and curved edges
 * differently, so on small, text-dense components a flat pixel budget measures the rasteriser, not
 * the build. Instead: every pixel on a flat area of the Figma image (fills, interiors, backgrounds)
 * must match (0 diffs), and at most `edgeRatio` of the edge pixels (antialiased glyph/shape edges,
 * where neighbours differ by > 24 levels or alpha is partial) may differ. A 1px shift fails this
 * (self-test in F01.spec.ts) because it moves edges onto flat areas.
 */
export const G3C = { threshold: 0.1, edgeRatio: 0.2, edgeDelta: 24 };

export function diffComponent(actual: PNG, expected: PNG) {
  if (actual.width !== expected.width || actual.height !== expected.height) return null;
  const W = expected.width, H = expected.height;
  const E = flatten(expected), A = flatten(actual);
  const mask = Buffer.alloc(W * H * 4);
  pixelmatch(A, E, mask, W, H, { threshold: G3C.threshold, includeAA: true, diffMask: true });
  const lum = (b: Buffer, i: number) => (b[i] * 299 + b[i + 1] * 587 + b[i + 2] * 114) / 1000;
  let flatDiffs = 0, edgeDiffs = 0, edgeTotal = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = expected.data[i + 3];
      let edge = a > 0 && a < 255;
      for (let dy = -1; dy <= 1 && !edge; dy++)
        for (let dx = -1; dx <= 1 && !edge; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          if (Math.abs(lum(E, i) - lum(E, (ny * W + nx) * 4)) > G3C.edgeDelta) edge = true;
        }
      const differs = mask[i + 3] > 0;
      if (edge) {
        edgeTotal++;
        if (differs) edgeDiffs++;
      } else if (differs) flatDiffs++;
    }
  return { flatDiffs, edgeDiffs, edgeTotal, edgeRatio: edgeTotal ? edgeDiffs / edgeTotal : 0 };
}

export type Rect = { x: number; y: number; w: number; h: number };

/** Find a node's rect in a frame spec (public/__figma__/specs/<spec>.json) by a substring of its line. */
export function specRect(spec: string, match: string | RegExp): Rect {
  const lines: string[] = JSON.parse(readFileSync(join(FIGMA_DIR, "specs", `${spec}.json`), "utf8"));
  const line = lines.find((l) => (typeof match === "string" ? l.includes(match) : match.test(l)));
  const m = line?.match(/ ([\d.]+)x([\d.]+) @([\d.]+),([\d.]+)/);
  if (!m) throw new Error(`specRect: "${match}" not found in ${spec}`);
  return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] };
}

/**
 * Compare a page region (or the full 1440 × frame-height page) with a Figma frame.
 * `masks` (frame coordinates) cover Figma sample-content quirks — each must carry a written reason in the spec.
 */
export async function expectMatchesFigma(
  page: Page,
  frame: string,
  target?: Locator,
  opts: Partial<typeof G3> & { masks?: Rect[]; clip?: Rect; keepPointer?: boolean; label?: string } = {},
) {
  const { threshold, maxDiffPixelRatio } = { ...G3, ...opts };
  let expected: PNG = readFigmaPng(frame);
  await settle(page, { keepPointer: opts.keepPointer });
  let buf: Buffer;
  if (opts.clip) {
    // Region of a Figma frame (e.g. the shell header of a page whose body belongs to a later slice).
    const c = opts.clip;
    const full = expected;
    await page.setViewportSize({ width: full.width, height: Math.max(900, Math.min(full.height, c.y + c.h + 200)) });
    expected = new PNG({ width: c.w, height: c.h });
    PNG.bitblt(full, expected, c.x, c.y, c.w, c.h, 0, 0);
    buf = await page.screenshot({ clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
    opts = { ...opts, masks: (opts.masks ?? []).map((m) => ({ ...m, x: m.x - c.x, y: m.y - c.y })) };
  } else if (target) {
    buf = await target.screenshot();
  } else {
    await page.setViewportSize({ width: expected.width, height: expected.height });
    buf = await page.screenshot({ clip: { x: 0, y: 0, width: expected.width, height: expected.height } });
  }
  const actual = PNG.sync.read(buf);
  for (const m of opts.masks ?? [])
    for (let y = Math.floor(m.y); y < Math.ceil(m.y + m.h); y++)
      for (let x = Math.floor(m.x); x < Math.ceil(m.x + m.w); x++) {
        const i = (y * expected.width + x) * 4;
        if (i >= 0 && i < expected.data.length) expected.data.copy(actual.data, i, i, i + 4);
      }
  const res = diffPngs(actual, expected, threshold);
  mkdirSync(OUT_DIR, { recursive: true });
  const tag = opts.label ? `${frame}-${opts.label}` : frame;
  writeFileSync(join(OUT_DIR, `${tag}-actual.png`), buf);
  writeFileSync(join(OUT_DIR, `${tag}-figma.png`), PNG.sync.write(expected));
  if (res.diff) writeFileSync(join(OUT_DIR, `${tag}-diff.png`), PNG.sync.write(res.diff));
  test.info().annotations.push({ type: "G3", description: `${tag}: ${(res.ratio * 100).toFixed(3)}% (${res.diffPixels} px, ${res.size})` });
  expect(res.diffPixels, `size ${res.size}`).not.toBe(-1);
  expect(res.ratio, `${frame} diff ratio`).toBeLessThanOrEqual(maxDiffPixelRatio);
}
