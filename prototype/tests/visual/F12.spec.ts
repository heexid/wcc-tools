import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F12 — Booking detail side sheet vs Figma 06, 21, 24, 27 (full frames, dashboard under the scrim).
// Masks (reasons):
//  • KPI "Bookings this month" and the 4th Upcoming item — as F6 / F8 (real data by decision).
// Frame 29 (Day view + crew popover) is gated in tests/visual/F08.spec.ts with its F8 masks lifted.

test.beforeEach(async ({ page }) => signIn(page));

const KPI1: Rect = { x: 54, y: 236, w: 180, h: 66 };
const RAIL4 = () => specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/);

async function openSheet(page: Page, fixture: string, ref: string) {
  await page.goto(`/bookings?fixture=${fixture}&booking=${ref}`);
  await page.setViewportSize({ width: 1440, height: 1392 });
  const sheet = page.getByRole("dialog", { name: "Booking detail" });
  await expect(sheet.getByText(ref)).toBeVisible();
  return sheet;
}

test("06 · detail — Partially paid", async ({ page }) => {
  await openSheet(page, "screen-06", "BK-2026-0142");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-06", undefined, { masks: [KPI1, RAIL4()] });
});

test("21 · detail — Draft (no invoice)", async ({ page }) => {
  await openSheet(page, "screen-21", "BK-2026-0142");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-21", undefined, { masks: [KPI1, RAIL4()] });
});

test("24 · detail — Graduation · Aulia (from rail)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-24");
  await page.setViewportSize({ width: 1440, height: 1392 });
  await page.getByRole("complementary").getByRole("button", { name: /Graduation · Aulia/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Booking detail" }).getByText("BK-2026-0139")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-24", undefined, { masks: [KPI1, RAIL4()] });
});

test("27 · detail — crew schedule popover", async ({ page }) => {
  const sheet = await openSheet(page, "screen-27", "BK-2026-0142");
  await sheet.getByRole("button", { name: "Raka Pratama — show schedule" }).click();
  const pop = page.getByRole("dialog", { name: "Raka Pratama’s schedule" });
  await expect(pop).toContainText("5 bookings in Nov");
  await pop.getByRole("button", { name: /Graduation · Aulia/ }).hover();
  await expectMatchesFigma(page, "bookings-27", undefined, { masks: [KPI1, RAIL4()], keepPointer: true });
});
