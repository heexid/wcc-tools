import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { resetDb } from "./db";
import { isAuthCookie } from "../../src/lib/supabase/cookie";

test.beforeAll(() => resetDb());

// P4 on local Supabase: server route guard (proxy), safe ?next=, expired session (E4), logout ends the session,
// Account (name, password → other sessions signed out). Same selectors and copy as the mock suites (F03, F04, F16).
// Account changes use their own seeded account (see ACCOUNT), so the other tests' logins are never affected.
const ADMIN = { email: "bs-moment@email.com", password: "bsmoment26" };
// A dedicated account (seed.local-users.sql): this file changes its name and password, so nothing else uses it.
const ACCOUNT = { email: "account-test@bs-moment.test", password: "accounttest26", name: "Account Test" };

async function fillLogin(page: Page, who: { email: string; password: string }) {
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Login" }).click();
}
async function signIn(page: Page, who: { email: string; password: string } = ADMIN) {
  await page.goto("/login");
  await fillLogin(page, who);
  await expect(page).toHaveURL(/\/bookings$/);
}
const authCookies = async (ctx: BrowserContext) => (await ctx.cookies()).filter((c) => isAuthCookie(c.name, process.env.NEXT_PUBLIC_SUPABASE_URL!));

test("route guard runs on the server: no session → /login?next=…, then back after login", async ({ page }) => {
  const res = await page.goto("/packages");
  expect(res?.request().redirectedFrom()?.url()).toMatch(/\/packages$/); // a server redirect, not client-side
  await expect(page).toHaveURL(/\/login\?next=%2Fpackages$/);
  await fillLogin(page, ADMIN);
  await expect(page).toHaveURL(/\/packages$/);
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
});

test("?next= only goes to this site (no open redirect)", async ({ page }) => {
  for (const next of ["https://evil.example/x", "//evil.example", "/\\evil.example"]) {
    await page.context().clearCookies();
    await page.goto(`/login?next=${encodeURIComponent(next)}`);
    await fillLogin(page, ADMIN);
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/bookings$/);
  }
});

test("expired / unusable session → E4 with the email prefilled", async ({ page, context }) => {
  await signIn(page);
  const cookies = await authCookies(context);
  expect(cookies.length).toBeGreaterThan(0);
  await context.addCookies(cookies.map((c) => ({ ...c, value: "base64-eyJicm9rZW4iOnRydWV9" }))); // not a session any more
  await page.goto("/packages");
  await expect(page).toHaveURL(/\/login\?next=%2Fpackages&expired=1$/);
  await expect(page.locator("form").getByRole("status").or(page.locator("form").getByRole("alert"))).toContainText("Your session expired");
  await expect(page.getByLabel("Email")).toHaveValue(ADMIN.email);
});

test("log out ends the session on the server too", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /^bs\.moment, Admin/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByRole("alertdialog", { name: "Log out?" }).getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login\?loggedOut=1$/);
  await page.goto("/bookings");
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);
});

test("Account: change name, then change password — this device stays in, the other is signed out", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pa = await a.newPage();
  const pb = await b.newPage();
  await signIn(pa, ACCOUNT);
  await signIn(pb, ACCOUNT);

  await pa.goto("/account");
  await pa.getByRole("button", { name: "Edit name" }).click();
  const nameDlg = pa.getByRole("dialog", { name: "Change name" });
  await nameDlg.getByLabel("Name").fill("B");
  await nameDlg.getByRole("button", { name: "Save name" }).click();
  await expect(nameDlg).toContainText("Enter 2–50 characters.");
  await nameDlg.getByLabel("Name").fill("  Owner Test  ");
  await nameDlg.getByRole("button", { name: "Save name" }).click();
  await expect(pa.getByRole("status").filter({ hasText: "Name updated" })).toBeVisible();
  await expect(pa.getByRole("button", { name: /^Owner Test, Crew/ })).toBeVisible(); // header follows (6.8)
  await pa.reload();
  await expect(pa.getByRole("region", { name: "Profile" })).toContainText("Owner Test"); // stored, not just local state

  await pa.getByRole("button", { name: "Change password" }).click();
  const pw = pa.getByRole("dialog", { name: "Change password" });
  await pw.getByLabel("Current password").fill("wrongpw1");
  await pw.getByLabel("New password", { exact: true }).fill("newpass2026x");
  await pw.getByLabel("Confirm new password").fill("newpass2026x");
  await pw.getByRole("button", { name: "Update password" }).click();
  await expect(pw).toContainText("Current password is incorrect.");
  await pw.getByLabel("Current password").fill(ACCOUNT.password);
  await pw.getByRole("button", { name: "Update password" }).click();
  await expect(pa.getByRole("status").filter({ hasText: "Password updated · other devices were logged out" })).toBeVisible();
  await expect(pa.getByText("Last changed today")).toBeVisible();

  await pa.goto("/bookings"); // this device: still signed in
  await expect(pa).toHaveURL(/\/bookings$/);
  await pb.goto("/packages"); // the other device: signed out at once (its session was revoked) → E4
  await expect(pb).toHaveURL(/\/login\?next=%2Fpackages&expired=1$/);

  await a.close();
  await b.close();
});

test("sessions end at 00:00 WIB: a tab left open signs out at midnight (E4)", async ({ page }) => {
  await page.clock.install({ time: new Date() });
  await signIn(page);
  // Move the browser to 23:59:30 WIB tonight, then past midnight.
  const wibNow = new Date(Date.now() + 7 * 3600_000);
  const tonight = Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate(), 23, 59, 30) - 7 * 3600_000;
  await page.clock.pauseAt(tonight);
  await page.clock.runFor(60_000);
  await page.clock.resume();
  await expect(page).toHaveURL(/\/login\?expired=1&next=%2Fbookings/);
  await page.goto("/bookings"); // the session really ended, not just the tab
  await expect(page).toHaveURL(/\/login\?next=%2Fbookings/);
});
