import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// R07 — Account settings (Figma MA1–MA5) and Package Library (MP1–MP8) below 768.

const PHONE = { width: 390, height: 844 };

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE);
  await signIn(page);
});

test.describe("account settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account settings", level: 1 })).toBeVisible();
  });

  test("MA1 · cards full width, rows stack label over value + action, no horizontal overflow", async ({ page }) => {
    expect(await page.getByRole("region", { name: "Profile" }).boundingBox()).toMatchObject({ x: 16, width: 358 });
    const label = (await page.getByRole("region", { name: "Profile" }).getByText("Name", { exact: true }).boundingBox())!;
    const edit = (await page.getByRole("button", { name: "Edit name" }).boundingBox())!;
    expect(edit.y).toBeGreaterThan(label.y + label.height - 1); // the action sits on the value line, below the label
    expect(edit.x + edit.width).toBeLessThanOrEqual(374 + 0.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  });

  test("MA2 · Change name sheet → saves; MA3 · Change password sheet", async ({ page }) => {
    await page.getByRole("button", { name: "Edit name" }).click();
    const sheet = page.getByRole("dialog", { name: "Change name" });
    expect((await sheet.boundingBox())!).toMatchObject({ x: 0, width: 390 });
    await sheet.getByLabel("Name").fill("Bima Santoso");
    await sheet.getByRole("button", { name: "Save name" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("region", { name: "Profile" }).getByText("Bima Santoso").first()).toBeVisible();
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByRole("dialog", { name: "Change password" })).toBeVisible();
  });

  test("MA4 · Business information sheet: fields + Cancel / Save changes", async ({ page }) => {
    await page.getByRole("region", { name: "Business information" }).getByRole("button", { name: "Edit" }).click();
    const sheet = page.getByRole("dialog", { name: "Business information" });
    await expect(sheet).toBeVisible();
    expect((await sheet.boundingBox())!.width).toBe(390);
    await expect(sheet.getByLabel("Business name")).toBeVisible();
    expect((await sheet.getByRole("button", { name: "Save changes" }).boundingBox())!.height).toBe(44);
    await sheet.getByRole("button", { name: "Cancel" }).click();
    await expect(sheet).toBeHidden();
  });
});

test.describe("package library", () => {
  const cards = (p: Page) => p.getByRole("list", { name: "Active packages" }).getByRole("listitem");

  test.beforeEach(async ({ page }) => {
    await page.goto("/packages");
    await expect(cards(page).first()).toBeVisible();
  });

  test("MP1 · cards (no table), tabs fill the width, New package in the action bar", async ({ page }) => {
    await expect(page.getByRole("columnheader")).toBeHidden();
    const first = cards(page).first().getByRole("button");
    expect((await first.boundingBox())!).toMatchObject({ x: 16, width: 358 });
    await expect(first).toContainText("Active");
    const tab = (await page.getByRole("tab", { name: /^Active/ }).boundingBox())!;
    expect(tab.width).toBe(179);
    const btn = page.getByRole("button", { name: "New package" });
    expect((await btn.boundingBox())!.height).toBe(44);
  });

  test("MP5 / MP6 · card → Edit sheet → Archive (own row) → confirm sheet", async ({ page }) => {
    await cards(page).first().getByRole("button").click();
    const sheet = page.getByRole("dialog", { name: "Edit package" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: "Archive" }).click();
    const confirm = page.getByRole("alertdialog", { name: /^Archive “/ });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
    await confirm.getByRole("button", { name: "Archive package" }).click();
    await expect(page.getByText(/archived$/)).toBeVisible();
  });

  test("MP2 · Archived tab: Restore on each card", async ({ page }) => {
    await page.getByRole("tab", { name: /^Archived/ }).click();
    const list = page.getByRole("list", { name: "Archived packages" });
    await expect(list.getByRole("button", { name: /^Restore / }).first()).toBeVisible();
    await expect(page.getByText("Archived packages are hidden from New booking but kept on past bookings.")).toBeVisible();
  });

  test("MP8 · search with no results → Clear search", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Search package" }).fill("Zzz");
    await expect(page.getByRole("heading", { name: "No packages match “Zzz”" })).toBeVisible();
    await page.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(cards(page).first()).toBeVisible();
  });
});
