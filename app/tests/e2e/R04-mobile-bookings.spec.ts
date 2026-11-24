import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { expectMatchesFigma } from "../helpers/visual";

// R04 — Bookings below 768 (Figma Booking · Mobile (390): M01 List · M02 Filters sheet · M03 Calendar agenda).
// Fixture "today" = 10 Nov 2026 (40 bookings in the seed).

const PHONE = { width: 390, height: 844 };
const cards = (p: Page) => p.getByRole("main").getByRole("listitem");

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE);
  await signIn(page);
});

test.describe("M01 · list", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bookings?tab=table");
    await expect(cards(page).first()).toBeVisible();
  });

  test("cards: 358 × 114 at the 16 margin (mobile type scale + 16 padding), ref + status / name + remaining / date · client", async ({ page }) => {
    const first = cards(page).first().getByRole("button");
    expect(await first.boundingBox()).toMatchObject({ x: 16, width: 358, height: 114 });
    await expect(first).toContainText("BK-2026-0139");
    await expect(first).toContainText("Graduation · Aulia");
    await expect(first).toContainText("Rp 1.750.000");
    await expect(first).toContainText("10 Nov 2026 · Aulia Rahma");
    await expect(page.getByText("40 bookings")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming" })).toHaveCount(0); // no rail on mobile
  });

  test("infinite scroll replaces pagination (25 + 15)", async ({ page }) => {
    await expect(cards(page)).toHaveCount(25);
    await cards(page).last().scrollIntoViewIfNeeded();
    await expect(cards(page)).toHaveCount(40);
  });

  test("status chips: single select, All resets; search narrows", async ({ page }) => {
    await page.getByRole("button", { name: "Draft", exact: true }).click();
    await expect(page).toHaveURL(/status=draft/);
    await expect(page.getByRole("button", { name: "Draft", exact: true })).toHaveAttribute("aria-pressed", "true");
    for (const c of await cards(page).all()) await expect(c).toContainText("Draft");
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page).not.toHaveURL(/status=/);
    await page.getByRole("searchbox", { name: "Search bookings" }).fill("Sari");
    await expect(page).toHaveURL(/q=Sari/);
    await expect(cards(page).first()).toContainText("Sari");
  });

  test("tap a card → booking detail", async ({ page }) => {
    await cards(page).first().getByRole("button").click();
    await expect(page).toHaveURL(/booking=/);
    await expect(page.getByRole("dialog", { name: "Booking detail" })).toBeVisible();
  });

  test("New booking sits in the sticky action bar", async ({ page }) => {
    const btn = page.getByRole("button", { name: "New booking" });
    const box = (await btn.boundingBox())!;
    expect(box.height).toBe(44);
    expect(Math.round(box.y + box.height)).toBe(844 - 34); // safe area under the bar
    await btn.click();
    await expect(page).toHaveURL(/\/bookings\/new$/);
  });

  // G3 on the frame's top (top bar → chips). Masked: the first KPI's sample value + trend, and the search value (code
  // renders field text at 16px (iOS zoom rule, R01) where the CIR Search field in Figma is 13px).
  test("M01 header region matches Figma", async ({ page }) => {
    await expectMatchesFigma(page, "mobile-m01", undefined, { clip: { x: 0, y: 0, w: 390, h: 460 }, frameViewport: true, masks: [{ x: 30, y: 188, w: 238, h: 74 }, { x: 50, y: 356, w: 300, h: 40 }] });
  });
});

test.describe("M02 · filters sheet", () => {
  test("crew picker → apply: URL, Filters · 1, result meta", async ({ page }) => {
    await page.goto("/bookings?tab=table");
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: /Crew: all crew/ }).click();
    const picker = page.getByRole("dialog", { name: "Crew" });
    await picker.getByRole("option", { name: /Raka Pratama/ }).click();
    await expect(picker.getByRole("option", { name: /Raka Pratama/ })).toHaveAttribute("aria-selected", "true");
    await picker.getByRole("button", { name: "Done" }).click();
    await expect(sheet.getByText("1 crew assigned")).toBeVisible();
    await sheet.getByRole("button", { name: /^Show \d+ bookings?$/ }).click();
    await expect(page).toHaveURL(/crew=/);
    await expect(page.getByRole("button", { name: "Filters · 1" })).toBeVisible();
    await expect(page.getByText(/Raka Pratama · \d+ bookings?/)).toBeVisible();
  });

  test("booking date preset reads like Figma (This month · Nov 2026); Reset all clears the draft", async ({ page }) => {
    await page.goto("/bookings?tab=table");
    await page.getByRole("button", { name: "Filters", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await sheet.getByRole("button", { name: "Booking date" }).click();
    await page.getByRole("dialog", { name: "Booking date" }).getByRole("option", { name: "This month" }).click();
    await expect(sheet.getByRole("button", { name: "Booking date" })).toContainText("This month · Nov 2026");
    await sheet.getByRole("button", { name: "Reset all" }).click();
    await expect(sheet.getByRole("button", { name: "Booking date" })).toContainText("All dates");
  });
});

test.describe("M03 · calendar agenda", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bookings");
    await expect(page.getByText(/bookings? this month/)).toBeVisible();
  });

  test("one section per day (30 in Nov), empty days say No bookings, Today in accent", async ({ page }) => {
    const days = page.locator("section[id^=day-]");
    await expect(days).toHaveCount(30);
    await expect(page.getByRole("region", { name: "TUE 10 NOV, today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "TUE 10 NOV · TODAY" })).toBeVisible();
    await expect(page.getByRole("region", { name: "SUN 1 NOV" })).toContainText("No bookings");
    const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-text-accent"));
    expect(accent).toBeTruthy();
  });

  test("opens scrolled to Today (under the sticky top bar + tabs)", async ({ page }) => {
    const top = (await page.locator("#day-2026-11-10").boundingBox())!.y;
    expect(top).toBeGreaterThanOrEqual(56 + 52);
    expect(top).toBeLessThan(56 + 52 + 40);
  });

  test("month nav: ‹ October 2026, Today returns", async ({ page }) => {
    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
    await expect(page.locator("section[id^=day-]")).toHaveCount(31);
    await page.getByRole("button", { name: "Today" }).click();
    await expect(page.getByRole("heading", { name: "November 2026" })).toBeVisible();
  });

  test("agenda item: status bar + title + badge / package · client / total + remaining", async ({ page }) => {
    const item = page.locator("#day-2026-11-10").getByRole("button").first();
    await expect(item).toContainText("Graduation · Aulia");
    await expect(item).toContainText("Silver Package · Aulia Rahma");
    await expect(item).toContainText("Remaining Rp 1.750.000");
    expect((await item.boundingBox())!.width).toBe(356); // inside the 1px card border
  });

  // G3 on the frame's top (top bar → chips); the first KPI's sample value + trend is masked.
  test("M03 header region matches Figma", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await expectMatchesFigma(page, "mobile-m03", undefined, { clip: { x: 0, y: 0, w: 390, h: 474 }, frameViewport: true, masks: [{ x: 30, y: 192, w: 238, h: 74 }] });
  });
});

test.describe("KPIs + sticky tabs", () => {
  test("the three desktop KPI cards sit between the title and the tabs and swipe sideways", async ({ page }) => {
    await page.goto("/bookings?tab=table");
    const row = page.getByRole("group", { name: "Key metrics" });
    for (const name of ["Bookings this month", "Outstanding balance", "Collected this month"]) await expect(row.getByRole("heading", { name })).toBeAttached();
    await expect(row).toContainText("Rp ");
    const box = (await row.boundingBox())!;
    expect(box).toMatchObject({ x: 0, width: 390 });
    expect(box.y + box.height).toBeLessThanOrEqual((await page.getByRole("tablist", { name: "View" }).boundingBox())!.y);
    expect(await row.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  });

  for (const tab of ["", "?tab=table"])
    test(`tabs stay under the top bar while scrolling (${tab || "calendar"})`, async ({ page }) => {
      await page.goto(`/bookings${tab}`);
      const tabs = page.getByRole("tablist", { name: "View" });
      await expect(page.getByText(/\d+ bookings/).last()).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 900));
      await expect.poll(async () => (await tabs.boundingBox())!.y).toBe(56);
    });

  test("switching to List while stuck starts at the top of the list", async ({ page }) => {
    await page.goto("/bookings");
    await expect(page.getByText(/bookings? this month/)).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.getByRole("tab", { name: "List" }).click();
    await expect(cards(page).first()).toBeInViewport();
    await expect(page.getByRole("searchbox", { name: "Search bookings" })).toBeInViewport();
    expect((await page.getByRole("tablist", { name: "View" }).boundingBox())!.y).toBe(56);
  });
});
