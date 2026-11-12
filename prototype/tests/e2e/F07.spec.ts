import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F7 — Calendar · Month behaviour: INTERACTIONS 1.11, 1.13–1.15, 1.33; PRD US-6, §4.5 keyboard grid;
// flow F1 → F1b (month → "+1 more" day popover → row → detail / Open day view).

test.beforeEach(async ({ page }) => signIn(page));

const grid = (p: Page) => p.getByRole("grid", { name: "Month" });
const cell = (p: Page, label: string) => grid(p).getByRole("gridcell", { name: new RegExp(`^${label}( ·|$)`) });
const title = (p: Page) => p.getByRole("region", { name: "Calendar" }).getByRole("heading", { level: 2 });

async function open(page: Page, q = "") {
  await page.goto(`/bookings${q}`);
  await expect(grid(page)).toBeVisible();
}

test("month grid: 6×7 Mon-first, counts, up to 3 chips + “+N more”, today / selected states", async ({ page }) => {
  await open(page);
  await expect(grid(page).getByRole("gridcell")).toHaveCount(42);
  await expect(grid(page).getByRole("columnheader").first()).toHaveText("Mon");
  await expect(cell(page, "Monday, 26 Oct 2026")).toHaveAttribute("data-state", "outside");
  await expect(cell(page, "Tuesday, 10 Nov 2026")).toHaveAttribute("data-state", "today");
  await expect(cell(page, "Tuesday, 10 Nov 2026")).toHaveAttribute("tabindex", "0"); // anchor defaults to today
  const sat14 = cell(page, "Saturday, 14 Nov 2026");
  await expect(sat14).toHaveAccessibleName("Saturday, 14 Nov 2026 · 4 bookings");
  await expect(sat14.getByRole("button", { name: /, (Draft|Partially paid|Paid)$/ })).toHaveCount(3);
  await expect(sat14.getByRole("button", { name: "+1 more" })).toBeVisible();
  // Figma frames anchor on 12 Nov → Selected.
  await open(page, "?date=2026-11-12");
  await expect(cell(page, "Thursday, 12 Nov 2026")).toHaveAttribute("data-state", "selected");
});

test("‹ › and Today move the month (1.11)", async ({ page }) => {
  await open(page);
  await expect(title(page)).toHaveText("November 2026");
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(title(page)).toHaveText("December 2026");
  await expect(page).toHaveURL(/date=2026-12-10/);
  await page.getByRole("button", { name: "Previous month" }).click();
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(title(page)).toHaveText("October 2026");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(title(page)).toHaveText("November 2026");
  await expect(page).not.toHaveURL(/date=/);
});

test("chip → booking detail param (1.13)", async ({ page }) => {
  await open(page);
  await cell(page, "Thursday, 12 Nov 2026").getByRole("button", { name: "Wedding · Sari & Dimas, Partially paid" }).click();
  await expect(page).toHaveURL(/booking=/);
});

test("flow F1 → F1b: “+1 more” popover lists every booking; row → detail; Esc returns focus (1.14)", async ({ page }) => {
  await open(page, "?date=2026-11-12");
  await cell(page, "Saturday, 14 Nov 2026").getByRole("button", { name: "+1 more" }).click();
  const pop = page.getByRole("dialog", { name: /Sat, 14 Nov 2026/ });
  await expect(pop).toContainText("4 bookings");
  await expect(pop.getByRole("listitem")).toHaveText([/Prewedding · Nadia & Fajar/, /Company Profile · BPR Jaya/, /Maternity · Dewi/, /Family Portrait · Wijaya/]);
  await expect(pop.getByRole("listitem").first()).toContainText("Silver Package · Nadia Safitri");
  await expect(pop.getByRole("button").first()).toBeFocused();
  // G2: Figma 17 — 360×319 at (663, 974)
  await page.setViewportSize({ width: 1440, height: 1392 });
  const box = await pop.boundingBox();
  expect([Math.round(box!.x), Math.round(box!.y), box!.width, box!.height]).toEqual([663, 974, 360, 319]);
  // Selection doesn't move when the popover opens.
  await expect(cell(page, "Thursday, 12 Nov 2026")).toHaveAttribute("data-state", "selected");
  await page.keyboard.press("Escape");
  await expect(pop).toHaveCount(0);
  await expect(cell(page, "Saturday, 14 Nov 2026")).toBeFocused();
  await cell(page, "Saturday, 14 Nov 2026").getByRole("button", { name: "+1 more" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Family Portrait · Wijaya/ }).click();
  await expect(page).toHaveURL(/booking=/);
  await expect(page.getByRole("dialog", { name: /Sat, 14 Nov/ })).toHaveCount(0);
});

test("popover footer: New booking on 14 Nov · Open day view; outside click closes", async ({ page }) => {
  await open(page);
  await cell(page, "Saturday, 14 Nov 2026").getByRole("button", { name: "+1 more" }).click();
  await page.mouse.click(5, 300);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await cell(page, "Saturday, 14 Nov 2026").getByRole("button", { name: "+1 more" }).click();
  await page.getByRole("button", { name: "Open day view" }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(page).toHaveURL(/date=2026-11-14/);
  await open(page);
  await cell(page, "Saturday, 14 Nov 2026").getByRole("button", { name: "+1 more" }).click();
  await page.getByRole("button", { name: "New booking on 14 Nov" }).click();
  await expect(page).toHaveURL(/\/bookings\/new\?date=2026-11-14$/);
});

test("empty date: hover shows “+ New booking”, click → New booking prefilled (1.15)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1392 }); // frame-sized, so page = frame coordinates
  await open(page);
  const fri13 = cell(page, "Friday, 13 Nov 2026");
  const target = fri13.getByRole("button", { name: "New booking on Friday, 13 Nov 2026" });
  await expect(target).toHaveCSS("opacity", "0");
  await fri13.hover();
  await expect(target).toHaveCSS("opacity", "1");
  // G2: Figma 17 "Hover · empty date" 130.29×88 at (609, 880)
  const b = (await target.boundingBox())!;
  expect([Math.round(b.x), Math.round(b.y), b.height]).toEqual([609, 880, 88]);
  expect(b.width).toBeCloseTo(130.29, 1); // 996 / 7 − 12, in 1/64 px layout units
  await target.click();
  await expect(page).toHaveURL(/\/bookings\/new\?date=2026-11-13$/);
});

test("keyboard grid: arrows / Home / End / PageDown move the tab stop, Enter acts (PRD §4.5)", async ({ page }) => {
  await open(page);
  await cell(page, "Tuesday, 10 Nov 2026").focus();
  await page.keyboard.press("ArrowRight");
  await expect(cell(page, "Wednesday, 11 Nov 2026")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(cell(page, "Wednesday, 18 Nov 2026")).toBeFocused();
  await page.keyboard.press("End");
  await expect(cell(page, "Sunday, 22 Nov 2026")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(cell(page, "Monday, 16 Nov 2026")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, "Sunday, 8 Nov 2026")).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(title(page)).toHaveText("December 2026");
  await expect(cell(page, "Tuesday, 8 Dec 2026")).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(title(page)).toHaveText("November 2026");
  // Crossing into another month by arrow follows it.
  await cell(page, "Sunday, 8 Nov 2026").focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
  await expect(title(page)).toHaveText("December 2026");
  // Enter on a day with bookings → popover (no entrance), focus inside.
  await page.goto("/bookings?date=2026-11-14");
  await cell(page, "Saturday, 14 Nov 2026").focus();
  await page.keyboard.press("Enter");
  const pop = page.getByRole("dialog");
  await expect(pop).toHaveAttribute("data-instant", "true");
  await expect(pop.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("Escape");
  // Enter on an empty date → New booking prefilled.
  await page.keyboard.press("ArrowLeft");
  await expect(cell(page, "Friday, 13 Nov 2026")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/bookings\/new\?date=2026-11-13$/);
});

test("Canceled hidden unless the Status filter includes it (1.33)", async ({ page }) => {
  await open(page);
  await expect(cell(page, "Wednesday, 25 Nov 2026")).toHaveAccessibleName("Wednesday, 25 Nov 2026");
  await open(page, "?status=canceled");
  await expect(cell(page, "Wednesday, 25 Nov 2026").getByRole("button", { name: "Prewedding · Yuni & Arif, Canceled" })).toBeVisible();
});

test("G2: day cell 142.29×128, chip 125.29×20, weekdays 36", async ({ page }) => {
  await open(page);
  const c = (await cell(page, "Saturday, 14 Nov 2026").boundingBox())!;
  expect(c.height).toBe(128);
  expect(c.width).toBeCloseTo(142.29, 1); // 996 / 7 (Chrome lays out in 1/64 px)
  const chip = (await cell(page, "Saturday, 14 Nov 2026").getByRole("button").first().boundingBox())!;
  expect(chip.height).toBe(20);
  expect(chip.width).toBeCloseTo(125.29, 1);
  const wd = (await grid(page).getByRole("row").first().boundingBox())!;
  expect(wd.height).toBe(36);
});
