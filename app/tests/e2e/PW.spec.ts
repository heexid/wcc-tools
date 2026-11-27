import { expect, test, type Page } from "@playwright/test";

// PW — Forgot & reset password (PASSWORD-RESET-PLAN US-PW1 / US-PW2, Figma Login › Forgot & reset password).
// Mock data source: no email is sent; the email link is /auth/confirm?token_hash=mock&type=recovery.
test.beforeEach(async ({ page }) => {
  await page.goto("/dev/reset");
  await page.getByRole("button", { name: "Reset prototype data" }).click();
});
// Cache Components keeps visited routes in the DOM, hidden (Activity): match the visible screen only.
const email = (p: Page) => p.getByLabel("Email").filter({ visible: true });
const snackbar = (p: Page) => p.getByRole("status").filter({ visible: true });

test.describe("Forgot password (FP)", () => {
  test("Forgot password? opens the screen and carries the typed email", async ({ page }) => {
    await page.goto("/login");
    await email(page).fill("bs-moment@email.com");
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password\?email=bs-moment%40email\.com$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Forgot password");
    await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
    await expect(email(page)).toHaveValue("bs-moment@email.com");
  });

  test("required and format errors stop on the form (FP-E1, FP-E2)", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Enter your email")).toBeVisible();
    await expect(email(page)).toBeFocused();
    await email(page).fill("bs-moment@email");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Enter an email like name@company.com")).toBeVisible();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  for (const address of ["bs-moment@email.com", "nobody@unknown.test"]) {
    test(`any email gets the same answer: Login + snackbar (${address})`, async ({ page }) => {
      await page.goto("/forgot-password");
      await email(page).fill(address);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page).toHaveURL(/\/login\?sent=1/);
      await expect(snackbar(page)).toHaveText("Check your email for a reset link");
      await expect(email(page)).toHaveValue(address);
    });
  }

  test("network failure keeps the user here with Try again (FP-E3)", async ({ page }) => {
    await page.goto("/forgot-password?fail=requestPasswordReset");
    await email(page).fill("bs-moment@email.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("Can't connect to CIR")).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page).toHaveURL(/\/login\?sent=1/);
  });

  test("Back to login returns to Login", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("button", { name: "Back to login" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Login");
  });
});

test.describe("Reset password (RP)", () => {
  const next = (p: Page) => p.getByLabel("New password", { exact: true });
  const confirm = (p: Page) => p.getByLabel("Confirm new password");

  test("the email link opens Create new password", async ({ page }) => {
    await page.goto("/auth/confirm?token_hash=mock&type=recovery");
    await expect(page).toHaveURL(/\/reset-password\?token=mock$/);
    await expect(page.getByRole("heading", { name: "Create a new password" })).toBeVisible();
  });

  test("a bad, used or wrong-type link shows Link expired (RP-X)", async ({ page }) => {
    for (const url of ["/auth/confirm?token_hash=nope&type=recovery", "/auth/confirm?token_hash=mock&type=signup", "/reset-password"]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
    }
    await page.getByRole("button", { name: "Send a new link" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test("live rules, then rule and mismatch errors on Update (RP-E1)", async ({ page }) => {
    await page.goto("/reset-password?token=mock");
    const rules = page.getByRole("list", { name: "Password rules" });
    await expect(rules.getByText("(not met)")).toHaveCount(2);
    await next(page).fill("abc");
    await confirm(page).fill("abcd");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Use a password that meets both rules")).toBeVisible();
    await expect(page.getByText("Passwords don’t match.")).toBeVisible();
    await expect(next(page)).toBeFocused();
    await next(page).fill("newpass2026");
    await expect(rules.getByText("(met)", { exact: true })).toHaveCount(2);
  });

  test("the current password is refused", async ({ page }) => {
    await page.goto("/reset-password?token=mock");
    await next(page).fill("bsmoment26");
    await confirm(page).fill("bsmoment26");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Use a password you haven’t used for CIR before")).toBeVisible();
  });

  test("success → Login with snackbar; only the new password logs in", async ({ page }) => {
    await page.goto("/reset-password?token=mock");
    await next(page).fill("newpass2026");
    await confirm(page).fill("newpass2026");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page).toHaveURL(/\/login\?reset=1$/);
    await expect(snackbar(page)).toHaveText("Password updated. Log in with your new password");

    const password = page.getByLabel("Password", { exact: true }).filter({ visible: true });
    await email(page).fill("bs-moment@email.com");
    await password.fill("bsmoment26");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page.getByText("Email or password is incorrect")).toBeVisible();
    await password.fill("newpass2026");
    await page.getByRole("button", { name: "Login" }).click();
    await expect(page).toHaveURL(/\/bookings$/);
  });

  test("network failure keeps the form with Try again (RP-E2)", async ({ page }) => {
    await page.goto("/reset-password?token=mock&fail=resetPassword");
    await next(page).fill("newpass2026");
    await confirm(page).fill("newpass2026");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Can't connect to CIR")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
