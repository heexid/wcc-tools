import { expect, test, type Page } from "@playwright/test";
import { resetDb, sql } from "./db";

// P5 · Package Library live on local Supabase: lanes A–D (INTERACTIONS 5.1–5.11, PRD US-0) through the unchanged UI.
// Differences from the mock suite (tests/e2e/F05.spec.ts), by design:
//   - "n bookings" is the REAL count (P5), not Figma's legacy numbers.
//   - Save failure (5.10) is a real network failure (the Server Action request is aborted), not ?fail=.
//   - Empty library (5.8) is not run here: the seed's bookings reference packages and packages are never deleted.
//     It is a pure UI state over listPackages() = [] — covered by the mock suite and the read parity.

test.beforeAll(() => resetDb());
test.beforeEach(async ({ page }) => {
  await page.goto("/login?next=/packages");
  await page.getByLabel("Email").fill("bs-moment@email.com");
  await page.getByLabel("Password", { exact: true }).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
});

const dialog = (p: Page, name: string) => p.getByRole("dialog", { name });
const activeTab = (p: Page) => p.getByRole("tab", { name: /^Active/ });
const archivedTab = (p: Page) => p.getByRole("tab", { name: /^Archived/ });
const rows = (p: Page) => p.getByRole("row").filter({ has: p.getByRole("cell") });
const realCount = (name: string) => Number(sql(`select count(*) from bookings b join packages p on p.id = b.package_id where p.name = '${name}'`));

test("lane B · create: toast, listed, stored; validation (duplicate active name, missing price) (5.1, 5.3, 5.9)", async ({ page }) => {
  await page.getByRole("button", { name: "New package" }).click();
  const d = dialog(page, "New package");
  await d.getByLabel("Package name").fill("gold package");
  await d.getByRole("button", { name: "Create package" }).click();
  await expect(d.getByText("A package named “gold package” already exists. Use a different name.")).toBeVisible();
  await expect(d.getByText("Enter a price — whole Rupiah, 0 or more.")).toBeVisible();
  await d.getByLabel("Package name").fill("Diamond Package");
  await d.getByLabel("Price").fill("17500000");
  await d.getByLabel("Description").fill("Two-day coverage · 4 crew");
  await d.getByRole("button", { name: "Create package" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Package created" })).toBeVisible();
  await expect(activeTab(page)).toHaveText("Active (7)");
  expect(sql("select price || '|' || description from packages where name = 'Diamond Package'")).toBe("17500000|Two-day coverage · 4 crew");
});

test("edit price: the real booking count shows, and existing bookings keep their snapshot (US-0)", async ({ page }) => {
  const used = realCount("Gold Package");
  expect(used).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Edit Gold Package" }).click();
  const d = dialog(page, "Edit package");
  await expect(d.getByText(`Used in ${used} bookings`)).toBeVisible();
  await d.getByLabel("Price").fill("11000000");
  await d.getByRole("button", { name: "Save package" }).click();
  await expect(rows(page).filter({ hasText: "Gold Package" })).toContainText("Rp 11.000.000");
  expect(sql("select total || '|' || package_price_snapshot from bookings where ref = 'BK-2026-0142'")).toBe("12500000|10000000");
});

test("description: 1000 max, a longer paste is cut with an inline error (5.7)", async ({ page }) => {
  await page.getByRole("button", { name: "New package" }).click();
  const box = dialog(page, "New package").getByLabel("Description");
  await box.focus();
  await box.dispatchEvent("paste", {});
  await box.fill("x".repeat(1200));
  await expect(box).toHaveValue("x".repeat(1000));
  await expect(dialog(page, "New package").getByText("1000/1000")).toBeVisible();
});

test("lane C · archive → Archived tab; hidden from the booking picker; restore; restore blocked by an active duplicate (5.4, 5.5)", async ({ page }) => {
  await page.getByRole("button", { name: "Archive Event Package" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Archive “Event Package”?" });
  await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: "Archive package" }).click();
  await expect(page.getByRole("status").filter({ hasText: "“Event Package” archived" })).toBeVisible();
  await archivedTab(page).click();
  await expect(rows(page).filter({ hasText: "Event Package" })).toContainText(/Archived \d{1,2} \w{3} \d{4}/);
  expect(sql("select is_active::text from packages where name = 'Event Package'")).toBe("false");

  // The booking form's Package dropdown no longer lists it (US-0, Bookings 39).
  await page.goto("/bookings/new");
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await expect(page.getByRole("option", { name: /Gold Package/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Event Package/ })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.goto("/packages");
  await archivedTab(page).click();
  await page.getByRole("button", { name: "Restore Event Package" }).click();
  await activeTab(page).click();
  await expect(rows(page).filter({ hasText: "Event Package" })).toBeVisible();

  // An archived name that's active again can't be restored.
  await page.getByRole("button", { name: "New package" }).click();
  await dialog(page, "New package").getByLabel("Package name").fill("Wedding Classic Package");
  await dialog(page, "New package").getByLabel("Price").fill("1");
  await dialog(page, "New package").getByRole("button", { name: "Create package" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Package created" })).toBeVisible();
  await archivedTab(page).click();
  await page.getByRole("button", { name: "Restore Wedding Classic Package" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "rename it first" })).toBeVisible();
  expect(sql("select count(*) from packages where name = 'Wedding Classic Package' and is_active")).toBe("1");
});

test("lane D · search filters, no-results state, Clear search (5.6)", async ({ page }) => {
  const q = page.getByRole("searchbox", { name: "Search package" });
  await q.fill("plat");
  await expect(rows(page)).toHaveCount(1);
  await q.fill("zzz-none");
  await expect(page.getByText("No packages match “zzz-none”")).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(q).toHaveValue("");
});

test("lane A · save fails (network) → danger alert, entries kept, Try again succeeds (5.10)", async ({ page }) => {
  // Abort exactly one Server Action POST: a real failed request, the same thing a dropped connection produces.
  let aborted = false;
  await page.route("**/packages", async (route) => {
    if (!aborted && route.request().method() === "POST" && route.request().headers()["next-action"]) {
      aborted = true;
      return route.abort("internetdisconnected");
    }
    return route.continue();
  });
  await page.getByRole("button", { name: "Edit Silver Package" }).click();
  const d = dialog(page, "Edit package");
  await d.getByLabel("Price").fill("3500000");
  await d.getByRole("button", { name: "Save package" }).click();
  await expect(d.getByText("Couldn’t save the package")).toBeVisible();
  await expect(d.getByLabel("Price")).toHaveValue("Rp 3.500.000");
  expect(sql("select price from packages where name = 'Silver Package'")).toBe("3000000"); // nothing was saved
  await d.getByRole("button", { name: "Try again" }).click();
  await expect(d).toHaveCount(0);
  await expect(rows(page).filter({ hasText: "Silver Package" })).toContainText("Rp 3.500.000");
  expect(sql("select price from packages where name = 'Silver Package'")).toBe("3500000");
});
