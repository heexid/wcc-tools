import { expect, test } from "@playwright/test";
import { PNG } from "pngjs";
import manifest from "../../src/styles/tokens.manifest.json";
import metrics from "../../public/__figma__/specs/F00-text-metrics.json";
import { diffPngs, expectMatchesFigma, expectNoDevIssues, readFigmaPng } from "../helpers/visual";

// F0 — tokens, text styles and the visual harness itself.

const hexToRgb = (h: string) => {
  const n = h.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  const a = n.length === 8 ? parseInt(n.slice(6, 8), 16) / 255 : 1;
  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${+a.toFixed(2)})`;
};

test.describe("F0 · G2 tokens", () => {
  test("every Figma variable resolves to its Figma value in the browser", async ({ page }) => {
    await page.goto("/dev/tokens");
    const resolved = await page.evaluate((vars) => {
      return vars.map((v) => {
        const probe = document.createElement("div"); // fresh probe per variable
        probe.style.position = "absolute";
        document.body.appendChild(probe);
        if (v.type === "color") {
          probe.style.color = `var(${v.css})`;
          return getComputedStyle(probe).color;
        }
        probe.style.width = `var(${v.css})`;
        return getComputedStyle(probe).width;
      });
    }, manifest.variables);
    const misses = manifest.variables
      .map((v, i) => {
        let want = v.type === "color" ? hexToRgb(String(v.value)) : `${v.value}px`;
        if (v.type === "color") want = want.replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`);
        const got = resolved[i].replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${(+a).toFixed(2).replace(/\.?0+$/, "")})`);
        const w = want.replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/, (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${(+a).toFixed(2).replace(/\.?0+$/, "")})`);
        return got === w ? null : `${v.figma} (${v.css}): ${got} ≠ ${w}`;
      })
      .filter(Boolean);
    expect(misses, misses.join("\n")).toEqual([]);
    expect(manifest.variables).toHaveLength(160); // Figma local variables (Primitives 51 · Semantic 53 · Component 23 · Breakpoint 33), re-synced 2026-11-12
  });

  test("every text style computes to the Figma font size, line height, weight and tracking", async ({ page }) => {
    await page.goto("/dev/tokens");
    for (const t of manifest.text) {
      const cs = await page.locator(`[data-token="${t.css}"] > span:last-child`).evaluate((el) => {
        const s = getComputedStyle(el);
        return { fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing };
      });
      expect(cs, t.figma).toEqual({
        fontSize: `${t.fontSize}px`,
        lineHeight: `${t.lineHeight}px`,
        fontWeight: String(t.fontWeight),
        letterSpacing: t.letterSpacing === 0 ? "normal" : `${t.letterSpacing}px`,
      });
    }
  });

  test("Inter renders text at the Figma widths (Bookings 01 samples)", async ({ page }) => {
    await page.goto("/dev/tokens");
    await page.evaluate(() => document.fonts.ready);
    const family = await page.locator("[data-metric='0']").evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/inter/i);
    const rows: string[] = [];
    const misses: string[] = [];
    for (const [i, s] of metrics.specs.entries()) {
      const box = await page.locator(`[data-metric='${i}']`).boundingBox();
      const ls = manifest.text.find((t) => t.figma === s.style)!.letterSpacing;
      // Figma: auto-width text box = ceil(glyph advance), without the trailing letter-spacing
      // CSS adds after the last glyph. This must hold exactly for every sample.
      const figmaBox = Math.ceil(+(box!.width - ls).toFixed(3));
      rows.push(`${s.style.padEnd(20)} "${s.text}" browser ${box!.width.toFixed(2)} → ${figmaBox} / Figma ${s.w}`);
      if (figmaBox !== s.w) misses.push(rows.at(-1)!);
    }
    test.info().annotations.push({ type: "text-metrics", description: rows.join("\n") });
    console.log(rows.join("\n"));
    expect(misses, misses.join("\n")).toEqual([]);
  });
});

test.describe("F0 · G3 harness", () => {
  test("pixel diff is 0 for identical frames and catches a 1 px shift", () => {
    const png = readFigmaPng("bookings-01");
    expect(diffPngs(png, png).diffPixels).toBe(0);
    const shifted = new PNG({ width: png.width, height: png.height });
    PNG.bitblt(png, shifted, 1, 0, png.width - 1, png.height, 0, 0);
    expect(diffPngs(shifted, png).ratio).toBeGreaterThan(0.005);
  });

  test("browser capture at 1440 × frame height is pixel-exact", async ({ page }) => {
    await page.goto("/dev/frame?frame=bookings-01");
    await page.locator("img").evaluate((img: HTMLImageElement) => img.decode());
    await expectMatchesFigma(page, "bookings-01", undefined, { maxDiffPixelRatio: 0 });
  });
});

test.describe("F0 · dev pages", () => {
  for (const route of ["/dev", "/dev/tokens", "/dev/overlay?frame=bookings-01&route=/dev/frame%3Fframe%3Dbookings-01", "/dev/reset", "/dev/frame?frame=asset-bookings"]) {
    test(`${route} renders with no Next.js issues`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await expectNoDevIssues(page);
      expect(errors).toEqual([]);
    });
  }
});
