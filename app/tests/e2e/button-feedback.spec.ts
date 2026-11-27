import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { editAsFigma07, openEdit } from "../helpers/editBooking";

// Buttons that wait for a response are disabled with a loading state, and a save confirms itself.

/** Holds the route change (RSC requests) to `path` for a while; the document itself loads normally. */
async function slowRoute(page: Page, path: string, ms = 1500) {
  await page.route(
    (u) => u.pathname === path && u.searchParams.has("_rsc"),
    async (r) => {
      await new Promise((f) => setTimeout(f, ms));
      await r.continue();
    },
  );
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test("New booking is disabled and loading until the form opens, and ready again on return", async ({ page }) => {
  await slowRoute(page, "/bookings/new");
  await page.goto("/bookings");
  const btn = page.getByRole("main").getByRole("button", { name: "New booking", exact: true });
  await btn.click();
  await expect(btn).toBeDisabled();
  await expect(btn).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New booking");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(btn).toBeEnabled();
});

test("Edit booking is disabled and loading until the editor opens", async ({ page }) => {
  await slowRoute(page, "/bookings/BK-2026-0142/edit");
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  const btn = page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Edit booking" });
  await btn.click();
  await expect(btn).toBeDisabled();
  await expect(btn).toHaveAttribute("aria-busy", "true");
  await expect(page).toHaveURL(/\/edit$/);
});

test("Save changes: loading, then Saved + toast, then back to Save changes", async ({ page }) => {
  await openEdit(page, "screen-07&latency=1200");
  await editAsFigma07(page);
  await page.getByRole("button", { name: "Save changes" }).click();
  const saving = page.getByRole("button", { name: "Saving…" });
  await expect(saving).toBeDisabled();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Changes saved$/ })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("saved.png") });
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
});

test("Packages: archive and restore show loading, then a toast", async ({ page }) => {
  await page.goto("/packages?latency=1200");
  await page.getByRole("button", { name: /^Archive / }).first().click();
  await page.getByRole("button", { name: "Archive package" }).click();
  await expect(page.getByRole("button", { name: "Archiving…" })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: "archived" })).toBeVisible();
  await page.getByRole("tab", { name: /Archived/ }).click();
  const restore = page.getByRole("button", { name: /^Restore / }).first();
  await restore.click();
  await expect(restore).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status").filter({ hasText: "restored" })).toBeVisible();
});
