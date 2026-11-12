import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, specRect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F5 — Package Library vs Figma Package Lib 01–08 (full frames, G3 ≤ 0.5 %).
// Masks (reasons): Figma's list footer shows pages 1–5 although everything fits on page 1 — we show the real
// page count; Figma draws an invalid field's value in placeholder grey (Input Error variant default, as in
// Login E2) — we keep typed text primary, and an empty price shows the "Rp 0" placeholder rather than "Rp".

test.beforeEach(async ({ page }) => signIn(page));

const paginationMask = (frame: string) => [specRect(`F05-${frame}`, "Pagination FRAME")];
const blur = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
const openList = async (page: Page, query = "") => {
  await page.goto(`/packages${query}`);
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
};

test("04 · archived tab", async ({ page }) => {
  await openList(page);
  await page.getByRole("tab", { name: /Archived/ }).click();
  await expect(page.getByText("Showing 2 archived packages")).toBeVisible();
  await blur(page);
  await expectMatchesFigma(page, "pkg-04", undefined, { masks: paginationMask("pkg-04") });
});

test("01 · edit package", async ({ page }) => {
  await openList(page);
  await page.getByRole("button", { name: "Edit Gold Package" }).click();
  await expect(page.getByRole("dialog", { name: "Edit package" })).toBeVisible();
  await blur(page);
  await expectMatchesFigma(page, "pkg-01", undefined, { masks: paginationMask("pkg-01") });
});

test("02 · new package", async ({ page }) => {
  await openList(page);
  await page.getByRole("button", { name: "New package" }).click();
  await expect(page.getByRole("dialog", { name: "New package" })).toBeVisible();
  await blur(page);
  await expectMatchesFigma(page, "pkg-02", undefined, { masks: paginationMask("pkg-02") });
});

test("03 · archive confirmation", async ({ page }) => {
  await openList(page);
  await page.getByRole("button", { name: "Archive Gold Package" }).click();
  await expect(page.getByRole("alertdialog", { name: "Archive “Gold Package”?" })).toBeVisible();
  await blur(page);
  await expectMatchesFigma(page, "pkg-03", undefined, { masks: paginationMask("pkg-03") });
});

test("05 · validation errors", async ({ page }) => {
  await openList(page);
  await page.getByRole("button", { name: "New package" }).click();
  await page.getByLabel("Package name").fill("Gold Package");
  await page.getByRole("button", { name: "Create package" }).click();
  await expect(page.getByText("A package named “Gold Package” already exists. Use a different name.")).toBeVisible();
  await blur(page);
  const masks = [...paginationMask("pkg-05"), specRect("F05-pkg-05", '"Gold Package" ts=UI/Input'), specRect("F05-pkg-05", '"Rp" ts=UI/Input')];
  await expectMatchesFigma(page, "pkg-05", undefined, { masks });
});

test("06 · save failed", async ({ page }) => {
  await openList(page, "?fail=savePackage");
  await page.getByRole("button", { name: "Edit Gold Package" }).click();
  await page.getByRole("button", { name: "Save package" }).click();
  await expect(page.getByText("Couldn’t save the package")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await blur(page);
  await expectMatchesFigma(page, "pkg-06", undefined, { masks: paginationMask("pkg-06") });
});

test("07 · empty (first use)", async ({ page }) => {
  await openList(page, "?fixture=package-07");
  await expect(page.getByText("No packages yet")).toBeVisible();
  await expectMatchesFigma(page, "pkg-07");
});

test("08 · search no results", async ({ page }) => {
  await openList(page);
  await page.getByRole("searchbox", { name: "Search package" }).fill("Wedding");
  await expect(page.getByText("No packages match “Wedding”")).toBeVisible();
  await blur(page);
  await expectMatchesFigma(page, "pkg-08");
});
