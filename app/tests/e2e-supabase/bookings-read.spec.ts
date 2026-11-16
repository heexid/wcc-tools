import { expect, test, type Page } from "@playwright/test";
import { resetDb, sql } from "./db";

// P6 · Bookings read path on local Supabase: lanes C, D, E, F (INTERACTIONS 1.x, 4.x read parts) through the
// unchanged UI, plus proof that the calendar loads only its visible range. Same selectors and expectations as
// the mock suites (F07, F08, F09, F12). The seed is built around Figma's "today" (Tue 10 Nov 2026): the app takes
// "today" from the browser, so the browser clock is fixed; the server and database keep the real clock.

test.beforeAll(() => resetDb());
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-10T09:00:00+07:00"));
  await page.goto("/login");
  await page.getByLabel("Email").fill("bs-moment@email.com");
  await page.getByLabel("Password", { exact: true }).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
});

const cal = (p: Page) => p.getByRole("region", { name: "Calendar" });
const title = (p: Page) => cal(p).getByRole("heading", { level: 2 });
const grid = (p: Page) => p.getByRole("grid", { name: "Month" });
const cell = (p: Page, label: string) => grid(p).getByRole("gridcell", { name: new RegExp(`^${label}( ·|$)`) });
const col = (p: Page, label: string) => p.getByRole("group", { name: "Week" }).getByRole("region", { name: new RegExp(`^${label}( ·|$)`) });
const table = (p: Page) => p.getByRole("table", { name: "Bookings" });
const names = (p: Page) => table(p).getByRole("row").locator("button").filter({ hasNotText: /^(Booking date|Total|Remaining|Status)$/ });
const chips = (p: Page) => p.getByRole("list", { name: "Active filters" }).getByRole("listitem");
const sheet = (p: Page) => p.getByRole("dialog", { name: "Booking detail" });

test("calendar loads only the visible range; ‹ › fetch the next window (P6)", async ({ page }) => {
  const windows: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/rpc/list_all_bookings")) {
      const q = JSON.parse(r.postData() ?? "{}").q ?? {};
      if (q.view === "calendar") windows.push(`${q.from}..${q.to}`);
    }
  });
  await page.goto("/bookings");
  await expect(grid(page)).toBeVisible();
  await expect(cell(page, "Thursday, 12 Nov 2026").getByRole("button", { name: /Wedding · Sari & Dimas/ })).toBeVisible();
  expect(windows).toContain("2026-10-26..2026-12-06"); // Nov grid: Mon 26 Oct … Sun 6 Dec
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(title(page)).toHaveText("October 2026");
  await expect(cell(page, "Saturday, 3 Oct 2026").getByRole("button", { name: /Wedding · Anisa & Rudi/ })).toBeVisible();
  await expect.poll(() => windows).toContain("2026-09-28..2026-11-08");
  expect(windows.every((w) => /^\d{4}-\d{2}-\d{2}\.\.\d{4}-\d{2}-\d{2}$/.test(w))).toBe(true); // never unbounded
});

test("Canceled hidden on the calendar unless the Status filter includes it (1.33)", async ({ page }) => {
  await expect(cell(page, "Wednesday, 25 Nov 2026")).toHaveAccessibleName("Wednesday, 25 Nov 2026");
  await page.goto("/bookings?status=canceled");
  await expect(cell(page, "Wednesday, 25 Nov 2026").getByRole("button", { name: "Prewedding · Yuni & Arif, Canceled" })).toBeVisible();
});

test("lane F · Month → Week → day head → Day → row → detail (1.12, 1.24, 1.28)", async ({ page }) => {
  await page.goto("/bookings?date=2026-11-12");
  await cal(page).getByRole("tab", { name: "Week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await expect(title(page)).toHaveText("9 – 15 Nov 2026");
  await col(page, "Thursday, 12 Nov 2026").getByRole("button", { name: "Open day view · Thursday, 12 Nov 2026" }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(title(page)).toHaveText("Thursday, 12 Nov 2026");
  await cal(page).getByRole("button", { name: "Wedding · Sari & Dimas, Partially paid" }).click();
  await expect(sheet(page)).toContainText("BK-2026-0142");
  await page.keyboard.press("Escape");
  await expect(page).not.toHaveURL(/booking=/);
});

test("lane C · Table: upcoming first then past, server-side paging (1.20, US-7)", async ({ page }) => {
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(names(page).first()).toHaveText("Graduation · Aulia");
  await expect(names(page).nth(3)).toHaveText("Prewedding · Nadia & Fajar");
  await expect(page.getByText("Showing 1–10 of 40 bookings")).toBeVisible();
  await page.getByRole("button", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(names(page).nth(5)).toHaveText("Wedding · Maya & Teguh");
  await expect(names(page).nth(6)).toHaveText("Birthday · Kenzo");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=3/);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=4/);
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await expect(names(page).last()).toHaveText("Wedding · Anisa & Rudi");
});

test("search (trigram path): name, local phone, ref; filters combine; Reset (1.4, US-8)", async ({ page }) => {
  await page.goto("/bookings?tab=table");
  const box = page.getByRole("searchbox", { name: "Search bookings" });
  await box.fill("kenzo");
  await expect(names(page)).toHaveText(["Birthday · Kenzo"]);
  await box.fill("0812345");
  await expect(names(page)).toHaveText(["Wedding · Sari & Dimas"]);
  await box.fill("BK-2026-015");
  await expect(names(page)).toHaveCount(9); // 0150–0159 (the seed has no 0152)
  await box.fill("");
  // Status AND crew (ids are database uuids in this source), same count the database gives.
  const raka = sql("select id from crew where name = 'Raka Pratama'");
  const want = Number(sql(`select count(*) from bookings b where status = 'partially_paid' and exists (select 1 from booking_crew c where c.booking_id = b.id and c.crew_id = '${raka}')`));
  await page.goto(`/bookings?tab=table&status=partially_paid&crew=${raka}`);
  await expect(page.getByText(`Showing ${want} of 40 bookings`)).toBeVisible();
  await expect(chips(page)).toHaveCount(2);
  await page.getByRole("button", { name: "Reset all" }).click();
  await expect(page.getByText(/Showing \d+ of 40 bookings/)).toHaveCount(0);
});

test("lane D · See all in table → next 7 days; View bookings → this week, Partially paid (1.17, 1.18)", async ({ page }) => {
  await page.getByRole("button", { name: "See all in table" }).click();
  await expect(page).toHaveURL(/tab=table&range=next-7-days/);
  await expect(chips(page)).toHaveText(["Next 7 days"]);
  await expect(names(page)).toHaveCount(7);
  await page.goto("/bookings");
  await page.getByRole("button", { name: "View bookings", exact: true }).click();
  await expect(page).toHaveURL(/range=this-week&status=partially_paid$/);
  await expect(names(page)).toHaveText(["Graduation · Aulia", "Wedding · Sari & Dimas", "Prewedding · Nadia & Fajar"]);
});

test("lane E · detail → crew schedule; This booking isn't clickable; another item switches the panel (4.8, 4.9)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  await expect(sheet(page).getByRole("article")).toHaveCount(2); // invoices, newest first
  await sheet(page).getByRole("button", { name: "Raka Pratama — show schedule" }).click();
  const pop = page.getByRole("dialog", { name: "Raka Pratama’s schedule" });
  await expect(pop).toContainText("Lead photographer · 5 bookings in Nov");
  await expect(pop.locator("[aria-current]")).toContainText("This booking");
  await pop.getByRole("button", { name: /Prewedding · Nadia & Fajar/ }).click();
  await expect(pop).toHaveCount(0);
  await expect(sheet(page)).toContainText("Prewedding · Nadia & Fajar");
});
