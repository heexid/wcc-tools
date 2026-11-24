import { expect, test } from "@playwright/test";
import { resetDb, sql } from "./db";

// Crew types on the real stack: an admin sees themself first as "(You)", self-filters, and a crew login is refused.
test.beforeAll(() => resetDb());

async function signIn(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/bookings/);
}

test("admin: first in the form picker; saved on the booking; found by the filter", async ({ page }) => {
  await signIn(page, "bs-moment@email.com", "bsmoment26");
  const id = sql("select id from public.bookings where ref = 'BK-2026-0144'");
  await page.goto(`/bookings/${id}/edit`);
  const main = page.getByRole("main");
  await main.getByRole("button", { name: /Change crew|Select crew/ }).click();
  const first = page.getByRole("dialog", { name: "Crew" }).getByRole("option").first();
  await expect(first).toContainText("bs.moment (You)");
  await first.getByRole("checkbox").check();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect.poll(() => sql(`select count(*) from public.booking_crew bc join public.crew c on c.id = bc.crew_id where bc.booking_id = '${id}' and c.user_id is not null`)).toBe("1");
  const me = sql("select c.id from public.crew c join auth.users u on u.id = c.user_id where u.email = 'bs-moment@email.com'");
  await page.goto(`/bookings?tab=table&crew=${me}`);
  await expect(page.getByText("Showing 1 of 40 bookings")).toBeVisible();
});

test("crew login: labelled Crew, no write controls, /bookings/new refused", async ({ page }) => {
  await signIn(page, "crew@bs-moment.test", "crewview26");
  await expect(page.getByRole("button", { name: /^Crew Test, Crew/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /New booking/ })).toHaveCount(0);
  await page.goto("/bookings/new");
  await expect(page).toHaveURL(/\/bookings$/);
});
