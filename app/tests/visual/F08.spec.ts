import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F8 — Calendar · Week + Day vs Figma 19, 20, 28, 29, 30, 31 (full frames).
// Masks (reasons):
//  • KPI "Bookings this month" — real data by decision (F6, 2026-11-11).
//  • 4th Upcoming item — rail follows the 14 Nov creation order (F6).
//  • Ghost "+ New booking on this date" / popover "+" icons — Figma overrides them to text/primary inside a
//    text/accent Ghost button (slip, as in 17 / 36); DS Ghost icons are text/accent.
//  • Week card Sari & Dimas: Figma 19 / 28 show 2 avatars (RP, DA); every detail screen (06, 07, 21, 27, S1)
//    lists 3 crew (RP, DA, NP) — the seed follows the detail screens. Masked in 28's card region (unmasked
//    in 19, inside the budget).
//  • 28 hovered card title: the frame shows it without the underline that the DS Week card Hover variant and
//    INTERACTIONS 1.25 specify — DS wins.
//  • 31 KPI values (Outstanding / Collected) and the "Balance before event" insight — the screen-31 fixture
//    stages the busy Saturday (a paid Kenzo, a DP on Putri & Adi), which moves those numbers; Figma's 31
//    dashboard chrome is a copy of 01.

test.beforeEach(async ({ page }) => signIn(page));

const KPI1: Rect = { x: 54, y: 236, w: 180, h: 66 };
const RAIL4 = () => specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/);
const COMMON = () => [KPI1, RAIL4()];

async function open(page: Page, q: string) {
  await page.goto(`/bookings${q}`);
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
}

test("19 · week view", async ({ page }) => {
  await open(page, "?view=week");
  await expect(page.getByRole("group", { name: "Week" })).toBeVisible();
  await expectMatchesFigma(page, "bookings-19", undefined, { masks: COMMON() });
});

test("20 · day view", async ({ page }) => {
  await open(page, "?view=day&date=2026-11-14");
  const plus = specRect("F08-bookings-20", /Icon\/plus INSTANCE 16x16 @64,911/);
  await expectMatchesFigma(page, "bookings-20", undefined, { masks: [...COMMON(), plus] });
});

test("30 · day view — no bookings", async ({ page }) => {
  await open(page, "?view=day&date=2026-11-15");
  await expect(page.getByText("No bookings on Sunday, 15 Nov")).toBeVisible();
  await expectMatchesFigma(page, "bookings-30", undefined, { masks: COMMON() });
});

test("31 · week — busy day “+2 more” popover", async ({ page }) => {
  await open(page, "?view=week&fixture=screen-31");
  await page.setViewportSize({ width: 1440, height: 1766 });
  await page.getByRole("button", { name: "+2 more" }).click();
  await expect(page.getByRole("dialog", { name: /Sat, 14 Nov 2026/ })).toBeVisible();
  const plus = specRect("F08-bookings-31", /Icon\/plus INSTANCE 16x16 @662,1691/);
  const kpis: Rect = { x: 392, y: 236, w: 640, h: 66 };
  const insight: Rect = { x: 1080, y: 880, w: 303, h: 50 };
  await expectMatchesFigma(page, "bookings-31", undefined, { masks: [...COMMON(), plus, kpis, insight] });
});

const COL11: Rect = { x: 318, y: 554, w: 144, h: 640 };
const COL12: Rect = { x: 461, y: 554, w: 143, h: 640 };

test("28 · week — day-head hover + tooltip (frame), empty-day quick add, card hover (regions)", async ({ page }) => {
  await open(page, "?view=week");
  await page.setViewportSize({ width: 1440, height: 1228 });
  await page.getByRole("button", { name: "Open day view · Saturday, 14 Nov 2026" }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Open day view · Sat, 14 Nov");
  await expectMatchesFigma(page, "bookings-28", undefined, { masks: [...COMMON(), COL11, COL12], keepPointer: true, label: "head" });

  await page.getByRole("region", { name: /^Wednesday, 11 Nov 2026/ }).hover({ position: { x: 70, y: 300 } });
  await expectMatchesFigma(page, "bookings-28", undefined, { clip: COL11, keepPointer: true, label: "quick-add" });

  await page.getByRole("button", { name: "Wedding · Sari & Dimas, Partially paid" }).hover();
  const np: Rect = { x: 534.29, y: 703, w: 24, h: 24 };
  const title: Rect = { x: 478.29, y: 607, w: 110.43, h: 40 };
  await expectMatchesFigma(page, "bookings-28", undefined, { clip: COL12, masks: [np, title], keepPointer: true, label: "card-hover" });
});

test("29 · day — row hover + crew schedule popover (F12)", async ({ page }) => {
  await open(page, "?view=day&date=2026-11-14");
  await page.setViewportSize({ width: 1440, height: 1251 });
  await page.getByRole("button", { name: "Raka Pratama — show schedule" }).click(); // Raka is only on Prewedding this day
  await expect(page.getByRole("dialog", { name: "Raka Pratama’s schedule" })).toContainText("This booking");
  await page.getByRole("button", { name: "Company Profile · BPR Jaya, Draft" }).hover({ position: { x: 20, y: 10 } });
  const plus = specRect("F08-bookings-29", /Icon\/plus INSTANCE 16x16 @64,911/);
  await expectMatchesFigma(page, "bookings-29", undefined, { masks: [...COMMON(), plus], keepPointer: true });
});
