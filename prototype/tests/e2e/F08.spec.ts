import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F8 — Calendar · Week + Day: INTERACTIONS 1.12, 1.24–1.31; PRD US-6 week / day; flow lane F
// (F1 month → F2 week → F3 day → F4 detail; F2 → F2b overflow popover; empty day → A2 new booking).

test.beforeEach(async ({ page }) => signIn(page));

const cal = (p: Page) => p.getByRole("region", { name: "Calendar" });
const title = (p: Page) => cal(p).getByRole("heading", { level: 2 });
const col = (p: Page, label: string) => p.getByRole("group", { name: "Week" }).getByRole("region", { name: new RegExp(`^${label}( ·|$)`) });

async function open(page: Page, q = "") {
  await page.goto(`/bookings${q}`);
  await expect(cal(page)).toBeVisible();
}

test("flow lane F: Month → Week → day head → Day → row → detail (1.12, 1.24, 1.28)", async ({ page }) => {
  await open(page, "?date=2026-11-12");
  await cal(page).getByRole("tab", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await expect(page).toHaveURL(/date=2026-11-12/); // anchor kept
  await expect(title(page)).toHaveText("9 – 15 Nov 2026");
  await expect(col(page, "Tuesday, 10 Nov 2026")).toHaveAttribute("data-today", "true");
  await col(page, "Thursday, 12 Nov 2026").getByRole("button", { name: "Open day view · Thursday, 12 Nov 2026" }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(title(page)).toHaveText("Thursday, 12 Nov 2026");
  await cal(page).getByRole("button", { name: "Wedding · Sari & Dimas, Partially paid" }).click();
  await expect(page).toHaveURL(/booking=/);
  // F4: the detail side sheet (F12) opens over the calendar; closing it returns to the Day view.
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("BK-2026-0142");
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/booking=/);
  await cal(page).getByRole("tab", { name: "Month" }).click();
  await expect(page).not.toHaveURL(/view=/);
  await expect(title(page)).toHaveText("November 2026");
});

test("range switch keeps filters in the URL (1.12)", async ({ page }) => {
  await open(page, "?status=canceled,draft");
  await cal(page).getByRole("tab", { name: "Week" }).click();
  await expect(page).toHaveURL(/status=canceled%2Cdraft|status=canceled,draft/);
  await cal(page).getByRole("tab", { name: "Day" }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(page).toHaveURL(/status=/);
});

test("week: ‹ › move a week, Today returns; cards in creation order; card → detail (1.11, 1.25)", async ({ page }) => {
  await open(page, "?view=week");
  await page.getByRole("button", { name: "Next week" }).click();
  await expect(title(page)).toHaveText("16 – 22 Nov 2026");
  await page.getByRole("button", { name: "Previous week" }).click();
  await page.getByRole("button", { name: "Previous week" }).click();
  await expect(title(page)).toHaveText("2 – 8 Nov 2026");
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(title(page)).toHaveText("9 – 15 Nov 2026");
  const sat = col(page, "Saturday, 14 Nov 2026");
  await expect(sat.getByRole("button", { name: /, (Draft|Partially paid|Paid)$/ })).toHaveText(["Prewedding · Nadia & Fajar", "Company Profile · BPR Jaya", "Maternity · Dewi", "Family Portrait · Wijaya"]);
  await sat.getByRole("button", { name: "Maternity · Dewi, Paid" }).click();
  await expect(page).toHaveURL(/booking=/);
});

test("week: day head hover shows the tooltip (1.24)", async ({ page }) => {
  await open(page, "?view=week");
  await page.getByRole("button", { name: "Open day view · Saturday, 14 Nov 2026" }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Open day view · Sat, 14 Nov");
});

test("week: empty day hover → “+ New booking”, click → New booking prefilled (1.26)", async ({ page }) => {
  await open(page, "?view=week");
  const wed = col(page, "Wednesday, 11 Nov 2026");
  const add = wed.getByRole("button", { name: "New booking on Wednesday, 11 Nov 2026" });
  await expect(add).toHaveCSS("opacity", "0");
  await wed.hover({ position: { x: 70, y: 300 } });
  await expect(add).toHaveCSS("opacity", "1");
  await expect(wed.getByText("No bookings")).toHaveCSS("opacity", "0");
  await add.click();
  await expect(page).toHaveURL(/\/bookings\/new\?date=2026-11-11$/);
});

test("flow F2 → F2b: busy day shows 5 cards + “+2 more” → day popover (1.27)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1766 });
  await open(page, "?view=week&fixture=screen-31");
  const sat = col(page, "Saturday, 14 Nov 2026");
  await expect(sat.getByRole("button", { name: /, (Draft|Partially paid|Paid)$/ })).toHaveCount(5);
  const more = sat.getByRole("button", { name: "+2 more" });
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(more).toHaveAttribute("data-force", "pressed");
  const pop = page.getByRole("dialog", { name: /Sat, 14 Nov 2026/ });
  await expect(pop).toContainText("7 bookings");
  await expect(pop.getByRole("listitem")).toHaveCount(7);
  await expect(pop.getByRole("listitem").last()).toContainText("Birthday · Kenzo");
  const box = (await pop.boundingBox())!;
  expect([Math.round(box.x), Math.round(box.y), box.width, box.height]).toEqual([637, 1239, 360, 487]); // Figma 31
  await page.keyboard.press("Escape");
  await expect(pop).toHaveCount(0);
  await expect(more).toBeFocused();
  await expect(more).not.toHaveAttribute("data-force", "pressed");
  await more.click();
  await page.getByRole("dialog").getByRole("button", { name: "Open day view" }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(title(page)).toHaveText("Saturday, 14 Nov 2026");
});

test("day: summary bar, rows, ‹ › one day, New booking on this date (1.28, 1.31)", async ({ page }) => {
  await open(page, "?view=day&date=2026-11-14");
  await expect(cal(page).getByRole("status")).toHaveText("4 bookings2 Draft · 1 Partially paid · 1 Paid");
  const rows = cal(page).getByRole("list", { name: "Bookings on this date" }).getByRole("listitem");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText("Silver Package · Nadia Safitri");
  await expect(rows.first()).toContainText("Rp 4.500.000");
  await expect(rows.first()).toContainText("Remaining Rp 3.150.000");
  await page.getByRole("button", { name: "Next day" }).click();
  await expect(title(page)).toHaveText("Sunday, 15 Nov 2026");
  await page.getByRole("button", { name: "Previous day" }).click();
  await cal(page).getByRole("button", { name: "New booking on this date" }).click();
  await expect(page).toHaveURL(/\/bookings\/new\?date=2026-11-14$/);
});

test("day: no bookings → empty state + primary New booking on this date (1.30)", async ({ page }) => {
  await open(page, "?view=day&date=2026-11-15");
  await expect(cal(page).getByRole("heading", { name: "No bookings on Sunday, 15 Nov" })).toBeVisible();
  await expect(cal(page)).toContainText("Nothing is scheduled for this date with the current filters.");
  await cal(page).getByRole("button", { name: "New booking on this date" }).click();
  await expect(page).toHaveURL(/\/bookings\/new\?date=2026-11-15$/);
});

test("G2: week column 142.43 (Sun 141.43 visible), day head 31, day row 73, summary 45", async ({ page }) => {
  await open(page, "?view=week");
  const mon = (await col(page, "Monday, 9 Nov 2026").boundingBox())!;
  expect(mon.width).toBeCloseTo(142.43, 1);
  const head = (await page.getByRole("button", { name: "Open day view · Monday, 9 Nov 2026" }).boundingBox())!;
  expect(head.height).toBe(31);
  await open(page, "?view=day&date=2026-11-14");
  expect((await cal(page).getByRole("status").boundingBox())!.height).toBe(45);
  expect((await cal(page).getByRole("listitem").first().boundingBox())!.height).toBe(73);
});
