import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { expectMatchesFigma } from "../helpers/visual";

// R03 — mobile shell (Figma Pattern · Responsive › Mobile/Top bar, Mobile/Bottom sheet; R02b MS1–MS3, ML1–ML3).
// 390 × 844 (Figma reference frame). Desktop (1440) keeps the global header.

const PHONE = { width: 390, height: 844 };
const menu = (p: Page) => p.getByRole("button", { name: "Menu", exact: true });
const avatar = (p: Page) => p.getByRole("button", { name: /account menu/ });

test.describe("390 · signed in", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
    await signIn(page);
    await page.goto("/bookings");
  });

  test("top bar replaces the global header: 56 high, 44 launcher, module title, 32 avatar 16 from the edge", async ({ page }) => {
    await expect(menu(page)).toHaveCount(1); // the desktop header's trigger is display:none
    const bar = page.locator("header").filter({ has: menu(page) });
    expect((await bar.boundingBox())!.height).toBe(56);
    expect((await menu(page).boundingBox())!).toMatchObject({ x: 16, width: 44, height: 44 });
    await expect(bar.getByText("Booking", { exact: true })).toBeVisible();
    const av = (await avatar(page).locator("span").first().boundingBox())!;
    expect(av.width).toBe(32);
    expect(390 - (av.x + av.width)).toBe(16);
    await expect(page.getByText("English")).toBeHidden(); // no language on mobile (English-only release)
  });

  test("launcher sheet: current tile focused, Package Lib navigates, title follows the module", async ({ page }) => {
    await menu(page).click();
    const sheet = page.getByRole("dialog", { name: "App launcher" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Booking", exact: true })).toBeFocused();
    await expect(sheet.getByRole("button", { name: "Bookmark — coming soon" })).toBeDisabled();
    // three tiles share the row: (358 − 2 × 8) / 3
    expect(Math.round((await sheet.getByRole("button", { name: "Package Lib" }).boundingBox())!.width)).toBe(114);
    await sheet.getByRole("button", { name: "Package Lib" }).click();
    await expect(page).toHaveURL(/\/packages$/);
    await expect(page.locator("header").filter({ has: menu(page) }).getByText("Packages", { exact: true })).toBeVisible();
  });

  test("sheets close on Esc (focus back to the trigger), × and scrim", async ({ page }) => {
    await menu(page).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "App launcher" })).toBeHidden();
    await expect(menu(page)).toBeFocused();
    await avatar(page).click();
    await page.getByRole("dialog", { name: "Account" }).getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Account" })).toBeHidden();
    await menu(page).click();
    await page.mouse.click(195, 100); // scrim above the sheet
    await expect(page.getByRole("dialog", { name: "App launcher" })).toBeHidden();
  });

  test("account sheet → Account Setting; standalone title in the top bar", async ({ page }) => {
    await avatar(page).click();
    const sheet = page.getByRole("dialog", { name: "Account" });
    await expect(sheet.getByText("Admin")).toBeVisible();
    expect((await sheet.getByRole("menuitem", { name: "Account Setting" }).boundingBox())!.height).toBe(44);
    await sheet.getByRole("menuitem", { name: "Account Setting" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator("header").filter({ has: menu(page) }).getByText("Account settings", { exact: true })).toBeVisible();
  });

  test("log out: sheet confirm (Cancel focused) → Login", async ({ page }) => {
    await avatar(page).click();
    await page.getByRole("dialog", { name: "Account" }).getByRole("menuitem", { name: "Log out" }).click();
    const confirm = page.getByRole("alertdialog", { name: "Log out?" });
    await expect(confirm).toBeVisible();
    await expect(confirm.getByRole("button", { name: "Cancel" })).toBeFocused();
    expect((await confirm.getByRole("button", { name: "Log out" }).boundingBox())!.height).toBe(44);
    await confirm.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login\?loggedOut=1$/);
  });

  // G3 on the shell regions only: the list behind the sheets is R04. The sheet is measured from the bottom of
  // the 844 frame (its height comes from Figma).
  for (const [frame, open, sheetH] of [
    ["mobile-ms1", (p: Page) => menu(p).click(), 290],
    ["mobile-ms2", (p: Page) => avatar(p).click(), 294],
    [
      "mobile-ms3",
      async (p: Page) => {
        await avatar(p).click();
        await p.getByRole("menuitem", { name: "Log out" }).click();
      },
      242,
    ],
  ] as const) {
    test(`${frame} · top bar (under the scrim) + sheet match Figma`, async ({ page }) => {
      await open(page);
      await expect(page.getByRole("dialog").or(page.getByRole("alertdialog")).last()).toBeVisible();
      await page.waitForTimeout(600); // previous sheet (MS3 opens from MS2) fully gone
      await expectMatchesFigma(page, frame, undefined, { clip: { x: 0, y: 0, w: 390, h: 56 }, label: "topbar", frameViewport: true });
      await expectMatchesFigma(page, frame, undefined, { clip: { x: 0, y: 844 - sheetH, w: 390, h: sheetH }, label: "sheet", frameViewport: true });
    });
  }
});

test.describe("390 · login", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/login");
  });

  test("card fills the width minus 16, fields 44 with 16px text, Login 44", async ({ page }) => {
    const card = (await page.getByRole("region", { name: "Login" }).boundingBox())!;
    expect(card).toMatchObject({ x: 16, width: 358 });
    const email = page.getByLabel("Email");
    expect((await email.locator("..").boundingBox())!.height).toBe(44);
    expect(await email.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
    expect((await page.getByRole("button", { name: "Login" }).boundingBox())!.height).toBe(44);
  });
});

test("1440 keeps the desktop header (no mobile top bar)", async ({ page }) => {
  await signIn(page);
  await page.goto("/bookings");
  await expect(menu(page)).toHaveCount(1);
  await expect(page.getByText("English")).toBeVisible();
  expect((await page.locator("header").filter({ has: menu(page) }).boundingBox())!.height).toBe(78);
});
