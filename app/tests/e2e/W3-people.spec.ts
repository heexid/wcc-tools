import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// W3 · Workspace & Crew → Admin & crew (SHARED-DATABASE-PLAN §9, WC-3; Figma WC1, WC2, WC4, WC6, WM1, WM2).

const people = (p: Page) => p.getByRole("region", { name: "Admin & crew" });
const rows = (p: Page) => people(p).getByRole("row").filter({ has: p.getByRole("cell") });
const search = (p: Page) => people(p).getByRole("searchbox");

test.beforeEach(async ({ page }) => signIn(page));

test.describe("1440", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/workspace");
    await expect(rows(page)).toHaveCount(7);
  });

  test("order, types, job titles and counts", async ({ page }) => {
    await expect(people(page)).toContainText("7 people");
    for (const [i, t] of [["bs.moment (You)", "Admin", "—", "0"], ["Bima Saputra", "Crew", "Photographer", "5"], ["Dinda Ayu", "Crew", "Videographer", "6"], ["Nadia Putri", "Crew", "Event organizer", "4"], ["Raka Pratama", "Crew", "Lead photographer", "5"], ["Fajar Nugroho", "No login", "Assistant", "3"], ["Sinta Dewi", "No login", "Make-up artist", "2"]].entries())
      for (const x of t) await expect(rows(page).nth(i)).toContainText(x);
    await expect(people(page).getByRole("button", { name: /add|invite|delete|remove|edit/i })).toHaveCount(0);
    expect((await rows(page).first().boundingBox())!.height).toBe(62);
  });

  test("search + type filter combine; Reset clears both", async ({ page }) => {
    await search(page).fill("photographer");
    await expect(rows(page)).toHaveCount(2);
    await people(page).getByRole("button", { name: "Account type: All types" }).click();
    await page.getByRole("option", { name: "No login" }).click();
    await expect(people(page)).toContainText("No people match your search.");
    await expect(people(page)).toContainText("Showing 0 of 7 people");
    await people(page).getByRole("button", { name: "Reset" }).click();
    await expect(rows(page)).toHaveCount(7);
    await expect(search(page)).toHaveValue("");
    await search(page).fill("you");
    await expect(rows(page)).toHaveCount(1);
  });

  test("type filter by keyboard; Esc closes and returns focus", async ({ page }) => {
    const trigger = people(page).getByRole("button", { name: /^Account type:/ });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("option", { name: "All types" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(rows(page)).toHaveCount(4);
    await expect(people(page)).toContainText("Showing 4 of 7 people");
    await expect(trigger).toBeFocused();
  });
});

test("crew sees the same list", async ({ page }) => {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Crew" }).click();
  await page.goto("/workspace");
  await expect(rows(page)).toHaveCount(7);
  await expect(rows(page).first()).toContainText("bs.moment (You)");
  await expect(rows(page).first()).toContainText("Crew");
});

test("a canceled booking leaves the count", async ({ page }) => {
  await page.goto("/workspace");
  await expect(rows(page).filter({ hasText: "Bima Saputra" })).toContainText("5"); // BK-2026-0146 (25 Nov) is Canceled
});

test("390 · cards, chips, no results, no overflow at 320", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  const cards = people(page).getByRole("listitem");
  await expect(cards).toHaveCount(7);
  await expect(cards.nth(4)).toContainText("Lead photographer · 5 upcoming");
  await people(page).getByRole("button", { name: "Crew", exact: true }).click();
  await expect(cards).toHaveCount(4);
  expect((await people(page).getByRole("button", { name: "Crew", exact: true }).boundingBox())!.height).toBe(44);
  await search(page).fill("zzz");
  await expect(people(page)).toContainText("No people match your search.");
  await people(page).getByRole("button", { name: "Reset" }).click();
  await expect(cards).toHaveCount(7);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test("shrinking the window from 1440 to 800 never overflows", async ({ page }) => {
  await page.goto("/workspace");
  await expect(rows(page)).toHaveCount(7);
  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(800);
});
