import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F5 — Package Library behaviour (PRD US-0, INTERACTIONS 5.1–5.11).
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
});
const dialog = (p: Page, name: string) => p.getByRole("dialog", { name });
const activeTab = (p: Page) => p.getByRole("tab", { name: /^Active/ });
const archivedTab = (p: Page) => p.getByRole("tab", { name: /^Archived/ });
const rows = (p: Page) => p.getByRole("row").filter({ has: p.getByRole("cell") });

test("create a package → toast, listed, count updated (5.1, 5.3)", async ({ page }) => {
  await page.getByRole("button", { name: "New package" }).click();
  const d = dialog(page, "New package");
  await expect(d.getByLabel("Package name")).toBeFocused();
  await d.getByLabel("Package name").fill("Diamond Package");
  await d.getByLabel("Price").fill("17500000");
  await expect(d.getByLabel("Price")).toHaveValue("Rp 17.500.000");
  await d.getByLabel("Description").fill("Two-day coverage · 4 crew");
  await expect(d.getByText("25/1000")).toBeVisible();
  await d.getByRole("button", { name: "Create package" }).click();
  await expect(d).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Package created" })).toBeVisible();
  await expect(activeTab(page)).toHaveText("Active (7)");
  await expect(rows(page).filter({ hasText: "Diamond Package" })).toContainText("Rp 17.500.000");
});

test("edit price: existing bookings keep their snapshot (US-0)", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Gold Package" }).click();
  const d = dialog(page, "Edit package");
  await expect(d.getByText("Used in 23 bookings")).toBeVisible();
  await d.getByLabel("Price").fill("11000000");
  await d.getByRole("button", { name: "Save package" }).click();
  await expect(rows(page).filter({ hasText: "Gold Package" })).toContainText("Rp 11.000.000");
  const sariTotal = await page.evaluate(() => JSON.parse(localStorage.getItem("proto:db")!).bookings.find((b: { ref: string }) => b.ref === "BK-2026-0142").total);
  expect(sariTotal).toBe(12_500_000);
});

test("validation: duplicate name + missing price, focus first error, errors clear while typing (5.9)", async ({ page }) => {
  await page.getByRole("button", { name: "New package" }).click();
  const d = dialog(page, "New package");
  await d.getByLabel("Package name").fill("gold package");
  await d.getByRole("button", { name: "Create package" }).click();
  await expect(d.getByText("A package named “gold package” already exists. Use a different name.")).toBeVisible();
  await expect(d.getByText("Enter a price — whole Rupiah, 0 or more.")).toBeVisible();
  await expect(d.getByLabel("Package name")).toBeFocused();
  await d.getByLabel("Price").fill("0");
  await expect(d.getByText("Enter a price — whole Rupiah, 0 or more.")).toHaveCount(0);
  await expect(d.getByLabel("Price")).toHaveValue("Rp 0");
});

test("description: 1000 max, a longer paste is cut with an inline error (5.7)", async ({ page }) => {
  await page.getByRole("button", { name: "New package" }).click();
  const box = dialog(page, "New package").getByLabel("Description");
  await box.focus();
  await box.dispatchEvent("paste", {});
  await box.fill("x".repeat(1200));
  await expect(box).toHaveValue("x".repeat(1000));
  await expect(dialog(page, "New package").getByText("Max 1000 characters")).toBeVisible();
  await expect(dialog(page, "New package").getByText("1000/1000")).toBeVisible();
});

test("archive from the row: confirm → Archived tab; Cancel / Esc keep it (5.4, 5.5)", async ({ page }) => {
  await page.getByRole("button", { name: "Archive Gold Package" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Archive “Gold Package”?" });
  await expect(confirm).toContainText("The 23 bookings that use it keep their package and price.");
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirm).toHaveCount(0);
  await page.getByRole("button", { name: "Archive Gold Package" }).click();
  await page.getByRole("button", { name: "Archive package" }).click();
  await expect(page.getByRole("status").filter({ hasText: "“Gold Package” archived" })).toBeVisible();
  await expect(activeTab(page)).toHaveText("Active (5)");
  await archivedTab(page).click();
  await expect(rows(page).filter({ hasText: "Gold Package" })).toContainText("Archived 10 Nov 2026");
});

test("archive from the edit modal closes both dialogs", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Event Package" }).click();
  await dialog(page, "Edit package").getByRole("button", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Archive package" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(activeTab(page)).toHaveText("Active (5)");
});

test("restore an archived package; restoring a name that's active again is blocked", async ({ page }) => {
  await archivedTab(page).click();
  await page.getByRole("button", { name: "Restore Studio Mini Package" }).click();
  await expect(archivedTab(page)).toHaveText("Archived (1)");
  await activeTab(page).click();
  await page.getByRole("button", { name: "New package" }).click();
  await dialog(page, "New package").getByLabel("Package name").fill("Wedding Classic Package");
  await dialog(page, "New package").getByLabel("Price").fill("1");
  await dialog(page, "New package").getByRole("button", { name: "Create package" }).click();
  await archivedTab(page).click();
  await page.getByRole("button", { name: "Restore Wedding Classic Package" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "rename it first" })).toBeVisible(); // Error toast
  await expect(archivedTab(page)).toHaveText("Archived (1)");
});

test("search filters, no-results state, Clear search (5.6)", async ({ page }) => {
  const q = page.getByRole("searchbox", { name: "Search package" });
  await q.fill("plat");
  await expect(rows(page)).toHaveCount(1);
  await q.fill("Wedding");
  await expect(page.getByText("No packages match “Wedding”")).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(q).toHaveValue("");
  await expect(rows(page)).toHaveCount(6);
});

test("save fails → danger alert, entries kept, Try again succeeds (5.10)", async ({ page }) => {
  await page.goto("/packages?fail=savePackage");
  await page.getByRole("button", { name: "Edit Silver Package" }).click();
  const d = dialog(page, "Edit package");
  await d.getByLabel("Price").fill("3500000");
  await d.getByRole("button", { name: "Save package" }).click();
  await expect(d.getByText("Couldn’t save the package")).toBeVisible();
  await expect(d.getByLabel("Price")).toHaveValue("Rp 3.500.000");
  await d.getByRole("button", { name: "Try again" }).click();
  await expect(d).toHaveCount(0);
  await expect(rows(page).filter({ hasText: "Silver Package" })).toContainText("Rp 3.500.000");
});

test("modal closes on ×, Cancel, Esc and scrim; focus returns; Tab stays inside", async ({ page }) => {
  const opener = page.getByRole("button", { name: "New package" });
  await opener.click();
  await dialog(page, "New package").getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await opener.click();
  await page.mouse.click(40, 600); // scrim
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await opener.click();
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  expect(await page.evaluate(() => !!document.activeElement?.closest("[role=dialog]"))).toBe(true);
  await dialog(page, "New package").getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("empty library → Create first package opens New package (5.8)", async ({ page }) => {
  await page.goto("/packages?fixture=package-07");
  await page.getByRole("button", { name: "Create first package" }).click();
  await expect(dialog(page, "New package")).toBeVisible();
});

test("stacked dialogs: Esc closes only the archive confirm, then the edit modal", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Gold Package" }).click();
  await dialog(page, "Edit package").getByRole("button", { name: "Archive" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(dialog(page, "Edit package")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("after archiving from the edit modal, focus lands on the page heading (opener row is gone)", async ({ page }) => {
  await page.getByRole("button", { name: "Edit Event Package" }).click();
  await dialog(page, "Edit package").getByRole("button", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Archive package" }).click();
  await expect(page.getByRole("heading", { name: "Package library" })).toBeFocused();
});
