import { expect, test } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";
import { openEdit } from "../helpers/editBooking";

// F14 — Cancel booking vs Figma 33, 34, 35 (full frames).
// Masks (reasons):
//  • "Created" value (as F13) and 33 / 34 "Moved from 12 Nov 2026" (a saved booking; the hint shows only while a
//    date change is unsaved — as F13's 38).
//  • 35: KPI "Bookings this month" + 4th Upcoming item (as F6 / F8 / F12), and Figma's toast copy parked at an
//    arbitrary spot over the dashboard — the DS toast is top-centre and appears after the cancel flow (e2e).

test.beforeEach(async ({ page }) => signIn(page));

const CREATED: Rect = { x: 366, y: 1161, w: 278, h: 22 };
const MOVED: Rect = { x: 33, y: 1194, w: 144, h: 20 };

test("33 · edit — Cancel booking section (Warning button hover)", async ({ page }) => {
  await openEdit(page, "screen-33");
  await page.setViewportSize({ width: 1440, height: 1853 });
  await page.getByRole("button", { name: "Cancel booking" }).hover();
  await expectMatchesFigma(page, "bookings-33", undefined, { masks: [CREATED, MOVED], keepPointer: true });
});

test("34 · cancel — reason modal", async ({ page }) => {
  await openEdit(page, "screen-34");
  await page.setViewportSize({ width: 1440, height: 1853 });
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("alertdialog", { name: "Cancel this booking?" })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-34", undefined, { masks: [CREATED, MOVED] });
});

test("35 · detail — Canceled (read-only)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-35&booking=BK-2026-0142");
  await page.setViewportSize({ width: 1440, height: 1392 });
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("Canceled on 10 Nov 2026 by Admin");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const kpi1: Rect = { x: 54, y: 236, w: 180, h: 66 };
  const rail4 = specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/);
  const toast = specRect("F14-bookings-35", /^Toast INSTANCE/);
  await expectMatchesFigma(page, "bookings-35", undefined, { masks: [kpi1, rail4, toast] });
});
