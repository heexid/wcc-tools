import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F9 — Table + search + filters vs Figma 02, 02b, 16, 18, 25, 26.
// Masks (reasons):
//  • KPI "Bookings this month" — real data by decision (F6). 4th Upcoming item — rail order (F6).
//  • "Showing n of 24 bookings": Figma's denominator is its sample size (24); the prototype counts the real
//    bookings (40) — same real-data decision as the KPI.
//  • 02 / 16 / 02b rows 2–4: Figma lists Sari 12 → Laras 21 → Citra 27 → Nadia 14, which matches no sort
//    rule; the Table sorts by booking date (decision 2026-11-11: PRD US-7).
//  • Pagination pages 2–5 when there is one page: Figma's Table/Footer template always shows 1–5 (as F5).
//  • Primary "+" icons drawn text/primary on the gradient (override slip, as 36 / 17).
//  • Rail below its heading: every Table frame (02–26) carries an older 3-item rail without "See all in table"
//    or insights; the rail is the same component as in 01 (F6), which the prototype follows.
//  • 02 / 16 / 02b below y 846: a second "Without filters · page 1 of 3" board table — an annotation, not a
//    screen state (its order is checked in e2e).

test.beforeEach(async ({ page }) => signIn(page));

const KPI1: Rect = { x: 54, y: 232, w: 180, h: 66 };
const OF_N: Rect = { x: 990, y: 464, w: 41, h: 24 };
const PAGES = (y: number): Rect => ({ x: 812, y, w: 140, h: 30 });
const RAIL: Rect = { x: 1056, y: 140, w: 384, h: 1300 };
const ABOVE_BOARD: Rect = { x: 0, y: 0, w: 1440, h: 846 };
const ROWS_2_4: Rect = { x: 34, y: 607, w: 996, h: 186 };

const FILTERED = "/bookings?tab=table&q=wedding&range=this-month&status=partially_paid&crew=crew_rp,crew_da";

async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole("tab", { name: "Table", exact: true })).toHaveAttribute("aria-selected", "true");
}

test("02 · table + filters (row hover)", async ({ page }) => {
  await open(page, FILTERED);
  await page.setViewportSize({ width: 1440, height: 1413 });
  await page.getByRole("table", { name: "Bookings" }).getByRole("button", { name: "Wedding · Sari & Dimas" }).hover();
  await expectMatchesFigma(page, "bookings-02", undefined, { clip: ABOVE_BOARD, masks: [KPI1, RAIL, OF_N, PAGES(803), ROWS_2_4], keepPointer: true });
});

test("02b · crew filter open", async ({ page }) => {
  await open(page, FILTERED);
  await page.setViewportSize({ width: 1440, height: 1413 });
  await page.getByRole("button", { name: "Crew: 2 crew" }).click();
  await expect(page.getByRole("dialog", { name: "Crew" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-02b", undefined, { clip: ABOVE_BOARD, masks: [KPI1, RAIL, OF_N, PAGES(803), ROWS_2_4] });
});

test("16 · date range popover", async ({ page }) => {
  await open(page, FILTERED);
  await page.setViewportSize({ width: 1440, height: 1413 });
  await page.getByRole("button", { name: "Booking date: This month" }).click();
  await expect(page.getByRole("dialog", { name: "Booking date" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-16", undefined, { clip: ABOVE_BOARD, masks: [KPI1, RAIL, OF_N, PAGES(803), ROWS_2_4] });
});

test("18 · no results", async ({ page }) => {
  await open(page, "/bookings?tab=table&q=kopi+nusa&range=this-month&status=partially_paid&crew=crew_rp,crew_da");
  await expect(page.getByText("No bookings match your search and filters")).toBeVisible();
  const plus = specRect("F09-bookings-18", /Icon\/plus INSTANCE 16x16 @537.5,723/);
  await expectMatchesFigma(page, "bookings-18", undefined, { masks: [KPI1, RAIL, OF_N, plus] });
});

test("25 · next 7 days (See all in table)", async ({ page }) => {
  await open(page, "/bookings?tab=table&range=next-7-days");
  await expectMatchesFigma(page, "bookings-25", undefined, { masks: [KPI1, RAIL, OF_N, PAGES(989)] });
});

test("26 · this week · Partially paid (View bookings)", async ({ page }) => {
  await open(page, "/bookings?tab=table&range=this-week&status=partially_paid");
  await expectMatchesFigma(page, "bookings-26", undefined, { masks: [KPI1, RAIL, OF_N, PAGES(741)] });
});
