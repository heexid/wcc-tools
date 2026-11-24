import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// Crew types (context/CREW-TYPE-PLAN.md): an admin assigns themself and filters by themself, desktop and mobile.
test.beforeEach(async ({ page }) => signIn(page));

test("desktop · assign self, save, filter by self", async ({ page }) => {
  await page.goto("/bookings/new");
  const main = page.getByRole("main");
  await fillSari(page, { crew: false });
  await expect(main.getByText("Who is handling this booking — select one or more")).toBeVisible(); // not preselected
  await main.getByRole("button", { name: "Select crew" }).click();
  const dlg = page.getByRole("dialog", { name: "Crew" });
  await expect(dlg.getByRole("option").first()).toContainText("bs.moment (You)");
  await dlg.getByRole("textbox").fill("you");
  await expect(dlg.getByRole("option")).toHaveCount(1);
  await dlg.getByRole("option").getByRole("checkbox").check();
  await page.keyboard.press("Escape");
  await expect(main.getByRole("button", { name: "Remove bs.moment" })).toBeVisible(); // the chip has no "(You)"
  await page.getByRole("button", { name: "Save booking" }).first().click();
  await expect(page).not.toHaveURL(/\/bookings\/new/);

  await page.goto("/bookings?tab=table");
  await page.getByRole("button", { name: "Crew: All crew" }).click();
  const filter = page.getByRole("dialog", { name: "Crew" });
  await expect(filter.getByRole("listitem").first()).toContainText("bs.moment (You)");
  await filter.getByLabel(/bs\.moment/).check();
  await filter.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/crew=crew_me/);
  await expect(page.getByText("Crew: bs.moment", { exact: true })).toBeVisible();
  await expect(page.getByText("Showing 1 of 41 bookings")).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("form and filter list the admin first as (You)", async ({ page }) => {
    await page.goto("/bookings/new");
    await page.getByRole("main").getByRole("button", { name: "Select crew" }).click();
    await expect(page.getByRole("dialog", { name: "Crew" }).getByRole("option").first()).toContainText("bs.moment (You)");
    await page.goto("/bookings?tab=table");
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    await page.getByRole("button", { name: /Crew: all crew/ }).click();
    const picker = page.getByRole("dialog", { name: "Crew" });
    await expect(picker.getByRole("option").first()).toContainText("bs.moment (You)");
    await picker.getByRole("option").first().click();
    await picker.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: /^Show \d+ bookings?$/ }).click();
    await expect(page).toHaveURL(/crew=crew_me/);
  });
});
