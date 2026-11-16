import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F17 — INTERACTIONS 6.4 (viewer role) and 6.3 (loading). /dev/role flips the mock profile.

test.beforeEach(async ({ page }) => signIn(page));

async function asViewer(page: Page) {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Viewer" }).click();
  await expect(page.getByRole("status")).toContainText("Viewer");
}

test("6.4 · viewer: no New booking anywhere on the dashboard, Everything else stays", async ({ page }) => {
  await asViewer(page);
  await page.goto("/bookings");
  await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /New booking/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
  await page.goto("/bookings?tab=table");
  await expect(page.getByRole("table", { name: "Bookings" })).toBeVisible();
  await expect(page.getByRole("button", { name: /New booking/ })).toHaveCount(0);
});

test("6.4 · viewer: detail sheet has no Edit booking; ↗ opens the read-only page", async ({ page }) => {
  await asViewer(page);
  await page.goto("/bookings?tab=table");
  await page.getByRole("table", { name: "Bookings" }).getByRole("row").nth(1).click();
  const sheet = page.getByRole("dialog", { name: "Booking detail" });
  await expect(sheet.getByRole("heading").first()).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Edit booking" })).toHaveCount(0);
  await sheet.getByRole("button", { name: "Open full page" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/]+$/);
  await expect(page.getByRole("button", { name: /Create invoice|Cancel booking|Add item/ })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Cancel booking" })).toHaveCount(0);
});

test("6.4 · viewer: direct links to New / Edit booking are redirected", async ({ page }) => {
  await asViewer(page);
  await page.goto("/bookings/new");
  await expect(page).toHaveURL(/\/bookings$/);
  await page.goto("/bookings?tab=table");
  await page.getByRole("table", { name: "Bookings" }).getByRole("row").nth(1).click();
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("booking")!;
  await page.goto(`/bookings/${id}/edit`);
  await expect(page).toHaveURL(new RegExp(`/bookings/${id}$`));
});

test("6.4 · viewer: Package library has no New package / Edit / Archive / Restore", async ({ page }) => {
  await asViewer(page);
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
  await expect(page.getByRole("button", { name: /New package|^Edit |^Archive |^Restore /i })).toHaveCount(0);
  await expect(page.getByRole("row").nth(1)).toBeVisible();
});

test("6.4 · admin is unchanged", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page.getByRole("button", { name: "New booking", exact: true })).toBeVisible();
});

test("6.3 · loading: table skeleton rows, filters stay interactive", async ({ page }) => {
  await page.goto("/bookings?tab=table&latency=60000");
  const table = page.getByRole("table", { name: "Bookings" });
  await expect(table.locator('[role="row"][aria-hidden="true"]')).toHaveCount(8);
  await expect(page.getByRole("searchbox").first()).toBeEnabled();
  await page.getByRole("searchbox").first().fill("sari");
  await expect(page.getByRole("searchbox").first()).toHaveValue("sari");
});

test("6.3 · loading: calendar date cells show skeletons", async ({ page }) => {
  await page.goto("/bookings?latency=60000");
  const cal = page.getByRole("region", { name: "Calendar" });
  await expect(cal.getByRole("gridcell").first()).toBeVisible();
  await expect(cal.locator(".motion-skeleton").first()).toBeVisible();
});

test("6.3 · loading: detail panel shows the Loader", async ({ page }) => {
  await page.goto("/bookings?tab=table");
  await page.getByRole("table", { name: "Bookings" }).getByRole("row").nth(1).click();
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toBeVisible();
  await page.goto("/bookings?latency=60000&booking=anything");
  await expect(page.getByRole("status", { name: /Loading/ }).or(page.getByText("Loading booking…"))).toBeVisible();
});

test("6.3 · reduced motion: skeleton and loader stop animating", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/bookings?tab=table&latency=60000");
  const sk = page.locator(".motion-skeleton").first();
  await expect(sk).toBeVisible();
  expect(await sk.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});
