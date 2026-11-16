import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// F16 — Account settings + Log out: PRD US-13; INTERACTIONS 6.7–6.10; Profile lanes A–D (D with a dirty booking form).

test.beforeEach(async ({ page }) => signIn(page));

const pill = (p: Page, name = "bs.moment") => p.getByRole("button", { name: new RegExp(`^${name.replace(".", "\\.")}, Admin`) });
const nameDlg = (p: Page) => p.getByRole("dialog", { name: "Change name" });
const pwDlg = (p: Page) => p.getByRole("dialog", { name: "Change password" });

test("lane A · menu → Account Setting → Profile + Security (6.6, 6.7)", async ({ page }) => {
  await page.goto("/bookings");
  await pill(page).click();
  await page.getByRole("menuitem", { name: "Account Setting" }).click();
  await expect(page).toHaveURL(/\/account$/);
  const profile = page.getByRole("region", { name: "Profile" });
  await expect(profile).toContainText("Admin · bs.moment workspace");
  await expect(profile).toContainText("bs-moment@email.com");
  await expect(profile).toContainText("Used to log in. Ask your workspace admin to change it.");
  await expect(profile.getByRole("img", { name: "Locked" })).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Security" })).toContainText("Last changed 12 Sep 2026");
});

test("lane B · change name: 2–50 chars, trimmed; Cancel / Esc / × discard; header, menu and new bookings follow (6.8)", async ({ page }) => {
  await page.goto("/account");
  for (const discard of [() => nameDlg(page).getByRole("button", { name: "Cancel" }).click(), () => page.keyboard.press("Escape"), () => nameDlg(page).getByRole("button", { name: "Close" }).click()]) {
    await page.getByRole("button", { name: "Edit name" }).click();
    await expect(nameDlg(page).getByLabel("Name")).toHaveValue("bs.moment");
    await nameDlg(page).getByLabel("Name").fill("Temp");
    await discard();
    await expect(nameDlg(page)).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Edit name" }).click();
  await nameDlg(page).getByLabel("Name").fill("B");
  await nameDlg(page).getByRole("button", { name: "Save name" }).click();
  await expect(nameDlg(page).getByText("Enter 2–50 characters.")).toBeVisible();
  await nameDlg(page).getByLabel("Name").fill("x".repeat(51));
  await nameDlg(page).getByRole("button", { name: "Save name" }).click();
  await expect(nameDlg(page).getByText("Enter 2–50 characters.")).toBeVisible();
  await nameDlg(page).getByLabel("Name").fill("  Bima Santoso  ");
  await nameDlg(page).getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Name updated" })).toBeVisible();
  await expect(pill(page, "Bima Santoso")).toBeVisible();
  await expect(page.getByRole("region", { name: "Profile" })).toContainText("Bima Santoso");
  // New records carry the new name; existing ones keep theirs.
  await page.goto("/bookings/new"); // no ?fixture= — loading a fixture resets the store (and the name)
  await fillSari(page);
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  const id = page.url().split("/").slice(-2)[0];
  await page.goto(`/bookings?booking=${id}`);
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("by Bima Santoso");
  await page.goto("/bookings?booking=BK-2026-0139");
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("by Admin");
});

test("lane C · change password: live rules, inline errors, success → toast, Last changed today, new password logs in (6.9)", async ({ page }) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Change password" }).click();
  const d = pwDlg(page);
  const rules = d.getByRole("list", { name: "Password rules" });
  await expect(rules.getByText("(not met)")).toHaveCount(3);
  await d.getByLabel("Current password").fill("wrongpw1");
  await d.getByLabel("New password", { exact: true }).fill("abc123");
  await expect(rules.getByRole("listitem").filter({ hasText: "At least 8 characters" })).toContainText("(not met)");
  await expect(rules.getByRole("listitem").filter({ hasText: "Contains a letter and a number" })).toContainText("(met)");
  await d.getByLabel("Confirm new password").fill("abc1234");
  await d.getByRole("button", { name: "Update password" }).click();
  await expect(d.getByText("Current password is incorrect.")).toBeVisible();
  await expect(d.getByText("Passwords don’t match.")).toBeVisible();
  // Show / hide.
  await d.getByRole("button", { name: "Show password" }).first().click();
  await expect(d.getByLabel("Current password")).toHaveAttribute("type", "text");
  await d.getByLabel("Current password").fill("bsmoment26");
  await d.getByLabel("New password", { exact: true }).fill("bsmoment26");
  await expect(rules.getByRole("listitem").filter({ hasText: "Different from your current password" })).toContainText("(not met)");
  await d.getByLabel("New password", { exact: true }).fill("newpass2026x");
  await d.getByLabel("Confirm new password").fill("newpass2026x");
  await d.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Password updated · other devices were logged out" })).toBeVisible();
  await expect(page.getByText("Last changed today")).toBeVisible();
  // Stays logged in here; the next login needs the new password.
  await pill(page).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByRole("alertdialog", { name: "Log out?" }).getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email").fill("bs-moment@email.com");
  await page.getByLabel("Password", { exact: true }).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Email or password is incorrect")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("newpass2026x");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/bookings/);
});

test("lane D · Log out: Cancel / Esc stay; confirm → Login with toast; session ended (6.10)", async ({ page }) => {
  await page.goto("/bookings");
  for (const stay of [() => page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click(), () => page.keyboard.press("Escape")]) {
    await pill(page).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page.getByRole("alertdialog", { name: "Log out?" })).toContainText("You’ll need to log in again to use Booking and Package Library.");
    await stay();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/bookings$/);
  }
  await pill(page).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByRole("alertdialog", { name: "Log out?" }).getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?loggedOut=1/);
  await expect(page.getByRole("status").filter({ hasText: "You’ve logged out" })).toBeVisible();
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=/);
});

// "Log out with an unsaved booking → leave guard first" (6.10) can't be reached: New / Edit booking use the Editor
// header (Figma 03), which has no account menu. Log out still goes through the leave guard (`confirmLeave`), so it
// applies as soon as a guarded page offers the menu. Logged in docs/slices/F16.md.
