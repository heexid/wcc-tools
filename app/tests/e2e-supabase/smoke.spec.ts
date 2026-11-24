import { expect, test, type Page } from "@playwright/test";
import { resetDb } from "./db";
import { fillSari } from "../helpers/bookingForm";

test.beforeAll(() => resetDb());

// P3 done-check (PRODUCTION-PLAN §3 P3): /bookings, /packages, /bookings/new end-to-end on local Supabase with
// the seed — read and write — with the UI unchanged (same selectors and copy as the mock-source suites).
const ADMIN = { email: "bs-moment@email.com", password: "bsmoment26" };
const CREW = { email: "crew@bs-moment.test", password: "crewview26" };

// The seed is built around Figma's "today" (Tue 10 Nov 2026). The app computes today in the browser, so freeze
// the browser clock (Playwright) — the server and database keep the real clock, as in staging.
test.beforeEach(async ({ page }) => page.clock.setFixedTime(new Date("2026-11-10T09:00:00+07:00")));

async function signIn(page: Page, who = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
}

test("login with a real Supabase account; wrong password is refused", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password1");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Email or password is incorrect"); // E3 (Next has its own role=alert announcer)
  await expect(page).toHaveURL(/\/login/);
  await signIn(page);
  await expect(page.getByRole("banner")).toContainText("bs.moment");
});

test("dashboard reads: KPIs from the seed, calendar chips, table paging, detail sheet", async ({ page }) => {
  await signIn(page);
  const kpis = page.getByRole("main");
  await expect(kpis).toContainText("Rp 48.750.000"); // outstanding across 14 Partially paid (Figma 01)
  await expect(kpis).toContainText("14 bookings");
  await expect(kpis).toContainText("Rp 61.200.000"); // collected in Nov
  await expect(page.getByRole("grid", { name: "Month" }).getByRole("button", { name: /Wedding · Sari & Dimas/ })).toBeVisible();
  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page.getByRole("row").filter({ has: page.getByRole("cell") })).toHaveCount(10);
  await page.goto("/bookings?booking=BK-2026-0142");
  const sheet = page.getByRole("dialog", { name: "Booking detail" });
  await expect(sheet).toContainText("Wedding · Sari & Dimas");
  await expect(sheet.getByRole("article")).toHaveCount(2); // DP + Partial invoices
});

test("packages: list, create (persists), duplicate name refused, archive", async ({ page }) => {
  await signIn(page);
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
  const rows = page.getByRole("row").filter({ has: page.getByRole("cell") });
  await expect(rows).toHaveCount(6);
  await page.getByRole("button", { name: "New package" }).click();
  const d = page.getByRole("dialog", { name: "New package" });
  await d.getByLabel("Package name").fill("Gold Package");
  await d.getByLabel("Price").fill("100");
  await d.getByRole("button", { name: "Create package" }).click();
  await expect(d).toBeVisible(); // duplicate active name → field error from save_package
  await d.getByLabel("Package name").fill("Diamond Package");
  await d.getByLabel("Price").fill("17500000");
  await d.getByLabel("Description").fill("Two-day coverage · 4 crew");
  await d.getByRole("button", { name: "Create package" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Package created" })).toBeVisible();
  await page.reload();
  await expect(rows).toHaveCount(7);
  await expect(page.getByRole("main")).toContainText("Diamond Package");
});

test("booking write path: save Draft → DP 40 % invoice → persists → cancel", async ({ page }) => {
  await signIn(page);
  await page.goto("/bookings/new");
  await expect(page.getByRole("heading", { name: "New booking" })).toBeVisible();
  await fillSari(page);
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Booking saved as Draft" })).toBeVisible();
  await expect(page).toHaveURL(/\/bookings\/[0-9a-f-]{36}\/edit$/);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(/BK-\d{4}-\d{4}/);

  await page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Create invoice" }).click();
  const m = page.getByRole("dialog", { name: "New invoice #1" });
  await m.getByLabel("DP percentage").fill("40");
  await m.getByRole("button", { name: /Confirm & generate invoice/ }).click();
  await expect(page.getByRole("region", { name: "Invoices" }).getByRole("article")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Invoices" })).toContainText(/INV-\d{4}-\d{4}/); // numbered by the DB (studio year)
  await page.reload();
  await expect(page.getByRole("region", { name: "Invoices" }).getByRole("article")).toHaveCount(1);

  await page.getByRole("button", { name: "Cancel booking" }).click();
  const c = page.getByRole("alertdialog", { name: /Cancel this booking/ }).or(page.getByRole("dialog", { name: /Cancel this booking/ }));
  await c.getByLabel("Reason (optional)").fill("Smoke test");
  await c.getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Booking canceled · BK-\d{4}-\d{4}/ })).toBeVisible();
});

test("crew: reads everything, no write controls", async ({ page }) => {
  await signIn(page, CREW);
  await expect(page.getByRole("main")).toContainText("Rp 48.750.000");
  await expect(page.getByRole("main").getByRole("button", { name: "New booking", exact: true })).toHaveCount(0);
  await page.goto("/packages");
  await expect(page.getByRole("button", { name: "New package" })).toHaveCount(0);
});
