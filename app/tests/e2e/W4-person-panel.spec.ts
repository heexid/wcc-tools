import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// W4 · Person panel (SHARED-DATABASE-PLAN §9, WC-4 / WC-5; Figma WC8–WC13, WC19, WM3–WM4).

const row = (p: Page, name: string) => p.getByRole("region", { name: "Admin & crew" }).getByRole("button", { name, exact: true });
const panel = (p: Page, name = "Raka Pratama") => p.getByRole("dialog", { name: `${name}’s bookings` });
const items = (p: Page) => panel(p).getByRole("tabpanel").getByRole("button");

test.beforeEach(async ({ page }) => signIn(page));

test.describe("1440", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/workspace");
    await expect(row(page, "Raka Pratama")).toBeVisible();
  });

  test("row opens Upcoming; Past is newest first; month headings", async ({ page }) => {
    await page.getByRole("row", { name: /Raka Pratama/ }).click({ position: { x: 1200, y: 31 } }); // anywhere on the row
    await expect(panel(page)).toContainText("Lead photographer · 5 bookings in Nov");
    await expect(page).toHaveURL(/\?person=crew_rp$/);
    await expect(items(page)).toHaveCount(5);
    await expect(panel(page)).toContainText("November 2026");
    await expect(items(page).first()).toContainText("Graduation · Aulia");
    await expect(items(page).first()).toContainText("Today");
    await panel(page).getByRole("tab", { name: "Past (5)" }).click();
    await expect(panel(page)).toContainText("October 2026");
    await expect(items(page).first()).toContainText("Wedding · Rahma & Yusuf");
    await expect(items(page).last()).toContainText("Wedding · Anisa & Rudi");
    expect((await panel(page).boundingBox())!.width).toBe(560);
  });

  test("Esc, × and the scrim close it; focus returns to the row", async ({ page }) => {
    for (const close of [() => page.keyboard.press("Escape"), () => panel(page).getByRole("button", { name: "Close" }).click(), () => page.mouse.click(200, 700)]) {
      await row(page, "Raka Pratama").focus();
      await page.keyboard.press("Enter");
      await expect(items(page)).toHaveCount(5);
      await close();
      await expect(panel(page)).toHaveCount(0);
      await expect(row(page, "Raka Pratama")).toBeFocused();
      await expect(page).toHaveURL(/\/workspace$/);
    }
  });

  test("a booking opens in Booking; Back returns with the panel open", async ({ page }) => {
    await row(page, "Raka Pratama").click();
    await items(page).nth(1).click();
    await expect(page).toHaveURL(/\/bookings\?booking=/);
    await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("BK-2026-0142");
    await page.goBack();
    await expect(page).toHaveURL(/\/workspace\?person=crew_rp$/);
    await expect(items(page)).toHaveCount(5);
    await page.keyboard.press("Escape");
    await expect(row(page, "Raka Pratama")).toBeFocused();
  });

  test("See in Booking → Table with only this person's filter", async ({ page }) => {
    await row(page, "Raka Pratama").click();
    await panel(page).getByRole("button", { name: "See in Booking" }).click();
    await expect(page).toHaveURL(/\/bookings\?tab=table&crew=crew_rp$/);
    await expect(page.getByText("Crew: Raka Pratama")).toBeVisible();
    await expect(page.getByText(/of 10 bookings/)).toBeVisible(); // 5 upcoming + 5 past, none Canceled
  });

  test("Canceled bookings are left out; nobody assigned → both empty states", async ({ page }) => {
    await row(page, "Bima Saputra").click();
    await expect(panel(page, "Bima Saputra").getByRole("tab", { name: "Upcoming (5)" })).toBeVisible();
    await expect(panel(page, "Bima Saputra")).not.toContainText("Yuni & Arif");
    await expect(panel(page, "Bima Saputra")).toContainText("December 2026");
    await page.keyboard.press("Escape");
    await row(page, "bs.moment (You)").click();
    const me = panel(page, "bs.moment");
    await expect(me).toContainText("Nothing scheduled from today.");
    await me.getByRole("tab", { name: "Past (0)" }).click();
    await expect(me).toContainText("No past bookings.");
  });

  test("tabs work by keyboard", async ({ page }) => {
    await row(page, "Raka Pratama").click();
    await panel(page).getByRole("tab", { name: "Upcoming (5)" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(panel(page).getByRole("tab", { name: "Past (5)" })).toBeFocused();
    await expect(items(page).first()).toContainText("Rahma & Yusuf");
  });
});

test("unknown person: no panel, toast, clean URL", async ({ page }) => {
  await page.goto("/workspace?person=nope");
  await expect(page.getByRole("status").filter({ hasText: "This person is no longer in the list." })).toBeVisible();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("crew can open a person", async ({ page }) => {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Crew" }).click();
  await page.goto("/workspace?person=crew_rp");
  await expect(items(page)).toHaveCount(5);
});

test("Past over 20: Show more", async ({ page }) => {
  await page.goto("/workspace");
  await expect(row(page, "Raka Pratama")).toBeVisible();
  // 30 more past bookings for Raka in the mock's stored data.
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) {
      const v = localStorage.getItem(k)!;
      if (!v.includes('"bookings":[')) continue;
      const o = JSON.parse(v);
      const db = o.bookings ? o : Object.values(o).find((x) => !!(x as { bookings?: unknown }).bookings) as typeof o;
      const b = db.bookings.find((x: { ref: string }) => x.ref === "BK-2026-0103");
      for (let i = 0; i < 30; i++) db.bookings.push({ ...b, id: `more_${i}`, ref: `BK-2025-${1000 + i}`, bookingDate: `2025-09-${String(i + 1).padStart(2, "0")}` });
      localStorage.setItem(k, JSON.stringify(o));
    }
  });
  await page.goto("/workspace?person=crew_rp");
  await panel(page).getByRole("tab", { name: "Past (35)" }).click();
  await expect(panel(page).getByRole("tabpanel").getByRole("button", { name: /Graduation|Wedding/ })).toHaveCount(20);
  await panel(page).getByRole("button", { name: "Show more" }).click();
  await expect(panel(page).getByRole("tabpanel").getByRole("button", { name: /Graduation|Wedding/ })).toHaveCount(35);
  await expect(panel(page).getByRole("button", { name: "Show more" })).toHaveCount(0);
  await expect(panel(page)).toContainText("September 2025");
});

test("390 · bottom sheet, 44 px actions, no overflow at 320", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace");
  await row(page, "Raka Pratama").or(page.getByRole("listitem").getByRole("button", { name: /Raka Pratama/ })).click();
  const sheet = page.getByRole("dialog", { name: "Bookings" });
  await expect(sheet).toContainText("Lead photographer · 5 bookings in Nov");
  await expect(sheet.getByRole("tab", { name: "Upcoming (5)" })).toBeVisible();
  expect((await sheet.getByRole("button", { name: "See in Booking" }).boundingBox())!.height).toBe(44);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await sheet.evaluate((e) => Math.max(e.scrollWidth, document.documentElement.scrollWidth))).toBe(320);
  await sheet.getByRole("button", { name: /Sari & Dimas/ }).click();
  await expect(page).toHaveURL(/\/bookings\?booking=/);
});
