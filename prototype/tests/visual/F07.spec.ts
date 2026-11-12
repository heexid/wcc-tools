import { expect, test } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F7 — Calendar · Month vs Figma 01 (full frame) and 17 ("+N more" popover + empty-date hover).
// Both frames show 12 Nov as Selected (the anchor date) → the pages load with ?date=2026-11-12.
// Masks (reasons):
//  • KPI "Bookings this month" — real data by decision (F6, 2026-11-11).
//  • 4th Upcoming item — rail follows the 14 Nov creation order (F6).
//  • 17 popover footer "+" icon — Figma overrides it to text/primary inside a Ghost button whose label and
//    other icon are text/accent (override slip, as in 36); the DS Ghost icon is text/accent.

test.beforeEach(async ({ page }) => signIn(page));

const KPI1: Rect = { x: 54, y: 236, w: 180, h: 66 };
const RAIL4 = () => specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/);

test("01 · bookings — calendar (month), full frame", async ({ page }) => {
  await page.goto("/bookings?date=2026-11-12");
  await expect(page.getByRole("grid", { name: "Month" })).toBeVisible();
  await expectMatchesFigma(page, "bookings-01", undefined, { masks: [KPI1, RAIL4()] });
});

test("17 · “+N more” popover & empty-date hover", async ({ page }) => {
  await page.goto("/bookings?date=2026-11-12");
  await page.setViewportSize({ width: 1440, height: 1392 });
  await page.getByRole("gridcell", { name: /^Saturday, 14 Nov 2026/ }).getByRole("button", { name: "+1 more" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("gridcell", { name: "Friday, 13 Nov 2026", exact: true }).hover({ position: { x: 70, y: 70 } });
  const plus = specRect("F07-bookings-17", /Icon\/plus INSTANCE 16x16 @688,1258/);
  await expectMatchesFigma(page, "bookings-17", undefined, { masks: [KPI1, RAIL4(), plus], keepPointer: true });
});
