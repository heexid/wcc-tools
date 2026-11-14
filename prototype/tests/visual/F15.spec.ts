import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { diffPngs, G3, readFigmaPng, settle, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F15 — Invoice PDF vs Figma 11 / 11b / 11c: the PDF the app downloads, rasterised by pdf.js at 96 dpi on /dev/pdf,
// against the frame's A4 page (794 × 1123 at 64, 64). Masks (reasons):
//  • Page corners (8 × 8): the Figma page is a rounded card on the board (radius control); a PDF page is square.
//  • Item 1 description: Figma abbreviates the package summary ("· album"); the PDF prints the snapshot's summary.
//  • Payment instructions text: Figma's sample bank ("BCA 123 456 7890 a.n. bs.moment"); the PDF prints the booking's
//    own payment instruction from the snapshot (Bank BCA · 1234567890 · bs.moment Studio).

test.beforeEach(async ({ page }) => signIn(page));

const OUT = join(__dirname, "../../test-results/visual");
const CORNERS: Rect[] = [
  { x: 0, y: 0, w: 8, h: 8 },
  { x: 786, y: 0, w: 8, h: 8 },
  { x: 0, y: 1115, w: 8, h: 8 },
  { x: 786, y: 1115, w: 8, h: 8 },
];

const ITEM1: Rect = { x: 88, y: 441, w: 318, h: 44 };
const PAYMENT: Rect = { x: 65, y: 914, w: 320, h: 40 };

async function expectPdfMatches(page: Page, fixture: string, invoice: string, frame: string, masks: Rect[] = [ITEM1, PAYMENT]) {
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.goto(`/dev/pdf?fixture=${fixture}&invoice=${invoice}`);
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-state", "ready 1", { timeout: 30_000 });
  await settle(page);
  const actual = PNG.sync.read(await canvas.screenshot());
  const board = readFigmaPng(frame);
  const expected = new PNG({ width: actual.width, height: actual.height });
  PNG.bitblt(board, expected, 64, 64, actual.width, actual.height, 0, 0);
  for (const m of [...CORNERS, ...masks])
    for (let y = m.y; y < m.y + m.h; y++)
      for (let x = m.x; x < m.x + m.w; x++) {
        const i = (y * actual.width + x) * 4;
        if (x < actual.width && y < actual.height) expected.data.copy(actual.data, i, i, i + 4);
      }
  const res = diffPngs(actual, expected);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${frame}-actual.png`), PNG.sync.write(actual));
  writeFileSync(join(OUT, `${frame}-figma.png`), PNG.sync.write(expected));
  if (res.diff) writeFileSync(join(OUT, `${frame}-diff.png`), PNG.sync.write(res.diff));
  test.info().annotations.push({ type: "G3", description: `${frame}: ${(res.ratio * 100).toFixed(3)}% (${res.diffPixels} px, ${res.size})` });
  expect(res.ratio, `${frame} diff ratio`).toBeLessThanOrEqual(G3.maxDiffPixelRatio);
}

test("11b · invoice PDF — DP 40 % (INV-2026-0187)", async ({ page }) => {
  await expectPdfMatches(page, "screen-11b", "INV-2026-0187", "bookings-11b");
});

test("11 · invoice PDF — Partial (INV-2026-0201)", async ({ page }) => {
  await expectPdfMatches(page, "seed", "INV-2026-0201", "bookings-11");
});

test("11c · invoice PDF — Full price (INV-2026-0187)", async ({ page }) => {
  await expectPdfMatches(page, "screen-11c", "INV-2026-0187", "bookings-11c");
});

test("37 · PDF generation failed", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-37&booking=BK-2026-0142&fail=generatePdf");
  await page.setViewportSize({ width: 1440, height: 1392 });
  const sheet = page.getByRole("dialog", { name: "Booking detail" });
  await sheet.getByRole("button", { name: "Download PDF (INV-2026-0201)" }).click();
  await expect(page.getByRole("alertdialog", { name: "Couldn’t generate the invoice PDF" })).toContainText("INV-2026-0201 is saved");
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const { specRect, expectMatchesFigma } = await import("../helpers/visual");
  const kpi1: Rect = { x: 54, y: 236, w: 180, h: 66 };
  const rail4 = specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/);
  await expectMatchesFigma(page, "bookings-37", undefined, { masks: [kpi1, rail4] });
});
