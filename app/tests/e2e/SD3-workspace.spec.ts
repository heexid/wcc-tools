import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/session";

// SD3 · read-only workspace (an admin sees no write control) and two tabs (SHARED-DATABASE-PLAN §3 items 7, 12).

test.beforeEach(async ({ page }) => signIn(page));

test("read-only workspace: an admin reads everything and changes nothing", async ({ page }) => {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Read-only workspace" }).click();
  await page.goto("/bookings");
  await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "New booking" })).toHaveCount(0);
  await page.goto("/bookings?booking=BK-2026-0142");
  const d = page.getByRole("dialog", { name: "Booking detail" });
  await expect(d).toContainText("Wedding · Sari & Dimas");
  await expect(d.getByRole("button", { name: "Edit booking" })).toHaveCount(0);
  await expect(d.getByRole("button", { name: "Download latest PDF" })).toBeVisible();
  await page.goto("/bookings/new");
  await expect(page).toHaveURL(/\/bookings$/);
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
  await expect(page.getByRole("button", { name: /New package|^Edit|Archive/ })).toHaveCount(0);
  await page.goto("/workspace");
  await expect(page.getByRole("region", { name: "Business information" })).toContainText("finance@bs-moment.com");
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  await page.goto("/account");
  await expect(page.getByRole("button", { name: "Edit name" })).toBeVisible(); // own name and password still work
  await expect(page.getByRole("button", { name: "Change password" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Profile" })).toContainText("Admin");
});

test("signing out on one tab clears the other, even with an unsaved form", async ({ page, context }) => {
  await page.goto("/bookings/new");
  await page.getByRole("textbox", { name: /^Client name/ }).first().fill("Unsaved client");
  const other = await context.newPage();
  await other.goto("/bookings");
  await other.getByRole("button", { name: /^bs\.moment, Admin|bs\.moment Admin/ }).first().click();
  await other.getByRole("menuitem", { name: "Log out" }).click();
  await other.getByRole("alertdialog").getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 });
  await expect(page.getByText("Unsaved client")).toHaveCount(0);
});
