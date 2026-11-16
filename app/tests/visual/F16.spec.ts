import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// F16 — Account settings + Log out vs Figma AC2–AC7, LO1, LO2 (full frames).
// Masks (reasons):
//  • Password field values: Figma draws "•" text glyphs; browsers render their own password bullets.
//  • AC3b "B" and AC6's errored fields: Figma colours the typed value as placeholder text (override slip; the DS
//    keeps typed text in text/primary) — covered by the password-value mask on AC6.
//  • LO1: KPI "Bookings this month" + 4th Upcoming item (as F6 / F8 / F12).

test.beforeEach(async ({ page }) => signIn(page));

const H = { width: 1440, height: 864 };
/** The three password values (Value TEXT 410x22 lines in the frame spec). */
const pwValues = (frame: string): Rect[] => {
  const lines: string[] = JSON.parse(readFileSync(join(__dirname, "../../public/__figma__/specs", `F16-profile-${frame}.json`), "utf8"));
  return lines
    .filter((l) => /Value TEXT 410x22/.test(l))
    .map((l) => {
      const m = l.match(/ ([\d.]+)x([\d.]+) @([\d.]+),([\d.]+)/)!;
      return { w: +m[1], h: +m[2], x: +m[3], y: +m[4] };
    });
};

async function openAccount(page: Page) {
  await page.goto("/account");
  await page.setViewportSize(H);
  await expect(page.getByRole("heading", { name: "Account settings" })).toBeVisible();
}

test("AC2 · account settings", async ({ page }) => {
  await openAccount(page);
  await expectMatchesFigma(page, "profile-ac2");
});

test("AC3 · change name modal", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("button", { name: "Edit name" }).click();
  await page.getByRole("dialog", { name: "Change name" }).getByLabel("Name").fill("Bima Santoso");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "profile-ac3");
});

test("AC3b · change name — error", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("button", { name: "Edit name" }).click();
  const dlg = page.getByRole("dialog", { name: "Change name" });
  await dlg.getByLabel("Name").fill("B");
  await dlg.getByRole("button", { name: "Save name" }).click();
  await expect(dlg.getByText("Enter 2–50 characters.")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const value = specRect("F16-profile-ac3b", /Value TEXT 392x22/);
  await expectMatchesFigma(page, "profile-ac3b", undefined, { masks: [value] });
});

test("AC4 · name updated (toast + header)", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("button", { name: "Edit name" }).click();
  const dlg = page.getByRole("dialog", { name: "Change name" });
  await dlg.getByLabel("Name").fill("Bima Santoso");
  await dlg.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Name updated" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bima Santoso, Admin/ })).toBeVisible(); // header account pill
  await expectMatchesFigma(page, "profile-ac4");
});

test("AC5 · change password modal", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("button", { name: "Change password" }).click();
  const dlg = page.getByRole("dialog", { name: "Change password" });
  await dlg.getByLabel("Current password").fill("bsmoment26");
  await dlg.getByLabel("New password", { exact: true }).fill("newpass2026x");
  await dlg.getByLabel("Confirm new password").fill("newpass2026x");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "profile-ac5", undefined, { masks: pwValues("ac5") });
});

test("AC6 · change password — errors", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("button", { name: "Change password" }).click();
  const dlg = page.getByRole("dialog", { name: "Change password" });
  await dlg.getByLabel("Current password").fill("wrongpw1");
  await dlg.getByLabel("New password", { exact: true }).fill("abc123");
  await dlg.getByLabel("Confirm new password").fill("abc1234");
  await dlg.getByRole("button", { name: "Update password" }).click();
  await expect(dlg.getByText("Current password is incorrect.")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "profile-ac6", undefined, { masks: pwValues("ac6") });
});

test("AC7 · password updated (toast + Last changed today)", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("button", { name: "Change password" }).click();
  const dlg = page.getByRole("dialog", { name: "Change password" });
  await dlg.getByLabel("Current password").fill("bsmoment26");
  await dlg.getByLabel("New password", { exact: true }).fill("newpass2026x");
  await dlg.getByLabel("Confirm new password").fill("newpass2026x");
  await dlg.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Last changed today")).toBeVisible();
  await expectMatchesFigma(page, "profile-ac7");
});

test("LO1 · log out — confirm", async ({ page }) => {
  await page.goto("/bookings");
  await page.setViewportSize({ width: 1440, height: 1392 });
  await page.getByRole("button", { name: /bs\.moment/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page.getByRole("alertdialog", { name: "Log out?" })).toBeVisible();
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const kpi1: Rect = { x: 54, y: 236, w: 180, h: 66 };
  const rail4 = specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/);
  await expectMatchesFigma(page, "profile-lo1", undefined, { masks: [kpi1, rail4] });
});

test("LO2 · logged out — Login with toast", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: /bs\.moment/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByRole("alertdialog", { name: "Log out?" }).getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?loggedOut=1/);
  await expect(page.getByRole("status").filter({ hasText: "You’ve logged out" })).toBeVisible();
  await expectMatchesFigma(page, "profile-lo2");
});
