import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F6 — dashboard frame behaviour (INTERACTIONS 1.1–1.3, 1.16–1.18, 1.23, 1.32; PRD US-12 rail rule).
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto("/bookings");
  await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
});
const rail = (p: Page) => p.getByRole("complementary", { name: "Upcoming and insights" });

test("New booking navigates; no Package library button in the header (1.1, 1.2 removed)", async ({ page }) => {
  await expect(page.getByRole("main").getByRole("button", { name: "Package library" })).toHaveCount(0);
  await page.getByRole("main").getByRole("button", { name: "New booking", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings\/new$/);
});

test("Calendar / Table tabs switch the view and live in the URL (1.3)", async ({ page }) => {
  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page).toHaveURL(/tab=table/);
  await expect(page.getByRole("button", { name: /^Booking date:/ })).toBeVisible(); // table-only date filter
  await page.reload();
  await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Calendar" }).click();
  await expect(page).not.toHaveURL(/tab=/);
});

test("KPI ⓘ tooltips: hover after a delay, focus at once, Esc hides (1.23)", async ({ page }) => {
  await page.getByRole("button", { name: "About Bookings this month" }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Bookings with a booking date this month");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("button", { name: "About Collected this month" }).focus();
  await expect(page.getByRole("tooltip")).toHaveText("Sum of invoices created this month");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("Upcoming rail: max 4, today first, item → detail panel param (1.16)", async ({ page }) => {
  const items = rail(page).getByRole("listitem");
  await expect(items).toHaveCount(4);
  await expect(items.first()).toContainText("TODAY");
  await expect(items.first()).toContainText("Graduation · Aulia");
  await expect(items.nth(3)).toContainText("Prewedding · Nadia & Fajar");
  await items.first().getByRole("button").click();
  await expect(page).toHaveURL(/booking=bk_0139/);
});

test("See all in table → Table with Next 7 days (1.17)", async ({ page }) => {
  await rail(page).getByRole("button", { name: "See all in table" }).click();
  await expect(page).toHaveURL(/tab=table&range=next-7-days/);
  await expect(page.getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");
});

test("Insight actions (1.18)", async ({ page }) => {
  await rail(page).getByRole("button", { name: "View booking", exact: true }).click();
  await expect(page).toHaveURL(/booking=bk_0139/);
  await page.goto("/bookings");
  await rail(page).getByRole("button", { name: "View bookings", exact: true }).click();
  await expect(page).toHaveURL(/tab=table&range=this-week&status=partially_paid$/); // no invoice-type filter (removed)
});

test("Canceled bookings stay out of the rail (US-12)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-35");
  await expect(rail(page)).not.toContainText("Wedding · Sari & Dimas");
});

test("first use: zero KPIs, empty rail, New booking from the empty state (1.32)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-36");
  await expect(page.getByText("No data yet")).toHaveCount(3);
  await expect(rail(page)).toContainText("Nothing scheduled in the next 7 days.");
  await expect(rail(page).getByText("Needs attention")).toHaveCount(0);
  await page.locator("section[aria-label=Bookings]").getByRole("button", { name: "New booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/new$/);
});

test.describe("tooltip motion (full motion)", () => {
  test.use({ reducedMotion: "no-preference" });
  test("first tooltip animates; moving to the next KPI shows it instantly (warm)", async ({ page }) => {
    await page.getByRole("button", { name: "About Bookings this month" }).hover();
    const first = page.getByRole("tooltip");
    await expect(first).toBeVisible();
    expect(await first.getAttribute("data-instant")).toBeNull();
    await page.getByRole("button", { name: "About Outstanding balance" }).hover();
    await expect(page.getByRole("tooltip").filter({ hasText: "Remaining across" })).toHaveAttribute("data-instant", "true");
  });
});
