import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/session";

// F4 — shell behaviour (PRD US-11, US-13 menu; INTERACTIONS 6.1a, 6.6).
const launcher = (p: import("@playwright/test").Page) => p.getByRole("button", { name: "Menu", exact: true });
const dialog = (p: import("@playwright/test").Page) => p.getByRole("dialog", { name: "App launcher" });
const profile = (p: import("@playwright/test").Page) => p.getByRole("button", { name: /account menu/ });

test("route guard: no session → /login?next=…, then back after login", async ({ page }) => {
  await page.goto("/dev");
  await page.evaluate(() => localStorage.removeItem("proto:session"));
  await page.goto("/packages");
  await expect(page).toHaveURL(/\/login\?next=%2Fpackages$/);
  await page.getByLabel("Email").fill("bs-moment@email.com");
  await page.getByLabel("Password", { exact: true }).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/packages$/);
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
});

test.describe("signed in", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto("/bookings");
  });

  test("launcher: opens as a labelled dialog, focuses the current tile, arrows skip the locked tile", async ({ page }) => {
    await launcher(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Booking", exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Booking", exact: true })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Package Lib", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Booking", exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Bookmark — coming soon" })).toBeDisabled();
  });

  test("launcher closes on Esc (focus back to ⋮⋮), ×, outside click and the current tile", async ({ page }) => {
    await launcher(page).click();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await expect(launcher(page)).toBeFocused();
    await launcher(page).click();
    await dialog(page).getByRole("button", { name: "Close" }).click();
    await expect(dialog(page)).toHaveCount(0);
    await launcher(page).click();
    await page.mouse.click(600, 120); // empty page-header space (not a calendar day — that opens New booking)
    await expect(dialog(page)).toHaveCount(0);
    await launcher(page).click();
    await page.getByRole("button", { name: "Booking", exact: true }).click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/bookings$/);
  });

  test("launcher: Package Lib → /packages, header switches to Packages, Enter works from keyboard", async ({ page }) => {
    await launcher(page).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/packages$/);
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Packages");
    await launcher(page).click();
    await expect(page.getByRole("button", { name: "Package Lib", exact: true })).toHaveAttribute("aria-current", "page");
  });

  test("module link and breadcrumb", async ({ page }) => {
    // Module pages link back to the module root; the module root itself shows no page label (Figma L1).
    await page.goto("/bookings/new");
    const crumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumb).toContainText("New booking");
    await crumb.getByRole("link", { name: "Booking" }).click();
    await expect(page).toHaveURL(/\/bookings$/);
    await expect(crumb.getByRole("link", { name: "Booking" })).toHaveAttribute("aria-current", "page");
    // Account settings is a standalone screen: only its own name, no module link.
    await page.goto("/account");
    await expect(crumb).toContainText("Account settings");
    await expect(crumb.getByRole("link", { name: "Booking" })).toHaveCount(0);
  });

  test("account menu: arrows, Esc returns focus, Account Setting → /account", async ({ page }) => {
    await profile(page).click();
    const menu = page.getByRole("menu", { name: "Account" });
    await expect(menu.getByRole("menuitem", { name: "Account Setting" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "Log out" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(menu.getByRole("menuitem", { name: "Account Setting" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(profile(page)).toBeFocused();
    await profile(page).click();
    await page.getByRole("menuitem", { name: "Account Setting" }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("account menu: clicking the profile again closes it", async ({ page }) => {
    await profile(page).click();
    await profile(page).click();
    await expect(page.getByRole("menu", { name: "Account" })).toHaveCount(0);
  });

  test("Log out ends the session and opens Login", async ({ page }) => {
    await profile(page).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.getByRole("alertdialog", { name: "Log out?" }).getByRole("button", { name: "Log out" }).click(); // LO1 (F16)
    await expect(page).toHaveURL(/\/login\?loggedOut=1$/);
    expect(await page.evaluate(() => localStorage.getItem("proto:session"))).toBeNull();
  });

  test("leave guard: unsaved page asks before the launcher switches module; Stay / Leave", async ({ page }) => {
    await page.goto("/dev/shell");
    await page.getByLabel("Simulate unsaved changes").check();
    await launcher(page).click();
    await page.getByRole("button", { name: "Package Lib", exact: true }).click();
    const ask = page.getByRole("alertdialog", { name: "Leave this page?" });
    await expect(ask).toContainText("/packages");
    await ask.getByRole("button", { name: "Stay" }).click();
    await expect(page).toHaveURL(/\/dev\/shell$/);
    await launcher(page).click();
    await page.getByRole("button", { name: "Package Lib", exact: true }).click();
    await page.getByRole("button", { name: "Leave" }).click();
    await expect(page).toHaveURL(/\/packages$/);
  });
});
