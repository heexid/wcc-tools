import { expect, test } from "@playwright/test";
import { expectMatchesFigma, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// F10 — New booking vs Figma 03, 03b, 13, 14, 15, 32, 39, 40.
// Masks (reasons):
//  • "Created" value: Figma shows 09:42; the prototype's frozen clock reads 09:00 (NEXT_PUBLIC_TODAY).
//  • 13 / 39 package option second lines: Figma abbreviates each package's summary ("… · album"); the
//    dropdown shows the library's own summary (the same text as the package card in 03).
//  • 15 phone value and 39 / 40 "Select a package": Figma draws typed text / the placeholder in the other
//    colour (override slip) — the DS field colours are kept.
//  • 15 tooltip: Figma places it 8 below Create invoice; every other DS tooltip (28, KPI ⓘ) sits 6 below.

test.beforeEach(async ({ page }) => signIn(page));

const CREATED = (y: number): Rect => ({ x: 353, y, w: 304, h: 36 });

test("03 · details & live summary", async ({ page }) => {
  await page.goto("/bookings/new");
  await fillSari(page);
  await page.setViewportSize({ width: 1440, height: 1637 });
  await expectMatchesFigma(page, "bookings-03", undefined, { masks: [CREATED(1101)] });
});

async function open(page: import("@playwright/test").Page, fixture?: string) {
  await page.goto(`/bookings/new${fixture ? `?fixture=${fixture}` : ""}`);
  await expect(page.getByRole("heading", { name: "New booking" })).toBeVisible();
}
const OPTION_SUBS = (n: number): Rect[] => Array.from({ length: n }, (_, i) => ({ x: 50, y: 630 + 54 * i, w: 470, h: 14 }));
const PKG_VALUE: Rect = { x: 46, y: 518, w: 300, h: 22 };

test("03b · crew dropdown open", async ({ page }) => {
  await open(page, "screen-03b");
  await fillSari(page);
  await page.setViewportSize({ width: 1440, height: 1637 });
  await page.getByRole("main").getByRole("button", { name: /Change crew/ }).click();
  await expect(page.getByRole("dialog", { name: "Crew" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-03b", undefined, { masks: [CREATED(1101)] });
});

test("13 · package dropdown open", async ({ page }) => {
  await open(page, "screen-13");
  await fillSari(page);
  await page.setViewportSize({ width: 1440, height: 1637 });
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await expect(page.getByRole("dialog", { name: "Package" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-13", undefined, { masks: [CREATED(1101), ...OPTION_SUBS(6)] });
});

test("14 · booking date picker", async ({ page }) => {
  await open(page);
  await fillSari(page);
  await page.setViewportSize({ width: 1440, height: 1637 });
  await page.getByRole("main").getByRole("button", { name: "Booking date" }).click();
  await expect(page.getByRole("dialog", { name: "Choose booking date" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-14", undefined, { masks: [CREATED(1101)] });
});

test("15 · required fields missing (Save) + Create invoice tooltip", async ({ page }) => {
  await open(page, "screen-15");
  await fillSari(page);
  const main = page.getByRole("main");
  await main.getByLabel("Client name").fill("");
  await main.getByLabel("Phone number").fill("0812 345");
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page.getByText("2 fields need attention")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1661 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByLabel(/^Create invoice \(unavailable/).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Complete client name and phone first");
  const phone: Rect = { x: 366, y: 257, w: 278, h: 22 };
  const tip: Rect = { x: 946, y: 839, w: 237, h: 38 };
  await expectMatchesFigma(page, "bookings-15", undefined, { masks: [CREATED(1125), phone, tip], keepPointer: true });
});

test("32 · leave guard — discard this new booking?", async ({ page }) => {
  await open(page);
  await fillSari(page);
  await page.setViewportSize({ width: 1440, height: 1637 });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Discard this new booking?" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-32", undefined, { masks: [CREATED(1101)] });
});

test("39 · package dropdown — archived hidden + note", async ({ page }) => {
  await open(page, "screen-39");
  await fillSari(page, { pkg: false });
  await page.setViewportSize({ width: 1440, height: 1637 });
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await expect(page.getByText("1 archived package isn’t listed (Gold Package).", { exact: false })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-39", undefined, { masks: [CREATED(1101), PKG_VALUE, ...OPTION_SUBS(5)] });
});

test("40 · package dropdown — library empty", async ({ page }) => {
  await open(page, "screen-40");
  await fillSari(page, { pkg: false });
  await page.setViewportSize({ width: 1440, height: 1637 });
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await expect(page.getByText("No packages yet")).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-40", undefined, { masks: [CREATED(1101), PKG_VALUE] });
});
