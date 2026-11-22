import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// R06 — booking detail below 768 (Figma M04 · M07 · ME3 · ME4): full screen with a Child top bar, title in the body,
// Latest PDF / Edit booking in a sticky action bar, invoice cards → Share sheet, crew chips → schedule sheet.

const PHONE = { width: 390, height: 844 };
const detail = (p: Page) => p.getByRole("dialog", { name: "Booking detail" });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE);
  await signIn(page);
});

test("M04 · full screen: Child bar (ref · status), title, summary 2 + 1, 112 key column, sticky actions", async ({ page }) => {
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  const d = detail(page);
  await expect(d).toBeVisible();
  expect(await d.boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  await expect(d.getByRole("button", { name: "Close booking detail" })).toBeVisible();
  await expect(d.locator("header").getByText("BK-2026-0142")).toBeVisible();
  await expect(d.getByRole("heading", { name: "Wedding · Sari & Dimas", level: 2 })).toBeVisible();
  // Summary: Total booking + Total paid on row 1, Remaining wraps to row 2.
  const total = (await d.getByText("Total booking", { exact: true }).boundingBox())!;
  const remaining = (await d.getByText("Remaining", { exact: true }).boundingBox())!;
  expect(remaining.y).toBeGreaterThan(total.y + 20);
  // Key column 112: values start at 16 + 112 + 8.
  expect(Math.round((await d.getByText("Sari Wulandari", { exact: true }).boundingBox())!.x)).toBe(136);
  const edit = d.getByRole("button", { name: "Edit booking" });
  const box = (await edit.boundingBox())!;
  expect(box.height).toBe(44);
  expect(Math.round(box.y + box.height)).toBe(844 - 34);
  await expect(d.getByRole("button", { name: "Latest PDF" })).toBeVisible();
  await edit.click();
  await expect(page).toHaveURL(/\/edit$/);
});

test("back closes the detail and keeps the list", async ({ page }) => {
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  await detail(page).getByRole("button", { name: "Close booking detail" }).click();
  await expect(detail(page)).toBeHidden();
  await expect(page).toHaveURL(/\/bookings\?tab=table$/);
});

test("M07 · invoice card → Share sheet: Share PDF… / Download PDF (downloads the file)", async ({ page }) => {
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  const card = detail(page).getByRole("article").first();
  await card.getByRole("button", { name: /^Share PDF \(INV-/ }).click();
  const sheet = page.getByRole("dialog", { name: /^Share INV-/ });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("menuitem", { name: /Share PDF…/ })).toBeVisible();
  await expect(sheet).toContainText(/Rp [\d.]+ · (DP|Partial|Full price|Paid) · issued/);
  const download = page.waitForEvent("download");
  await sheet.getByRole("menuitem", { name: "Download PDF" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await expect(sheet).toBeHidden();
});

test("ME4 · crew chip → Crew schedule sheet, this booking highlighted, See in calendar", async ({ page }) => {
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  await detail(page).getByRole("button", { name: /Raka Pratama/ }).first().click();
  const sheet = page.getByRole("dialog", { name: "Crew schedule" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Upcoming schedule");
  await expect(sheet).toContainText("This booking");
  await sheet.getByRole("button", { name: "See in calendar" }).click();
  await expect(page).toHaveURL(/crew=/);
});

test("ME3 · canceled: red notice, Not collected, only Download latest PDF", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-35&tab=table&booking=BK-2026-0142");
  const d = detail(page);
  await expect(d.getByText(/^Canceled on .* by Admin$/)).toBeVisible();
  await expect(d.getByText("Not collected", { exact: true })).toBeVisible();
  await expect(d.getByRole("button", { name: "Download latest PDF" })).toBeVisible();
  await expect(d.getByRole("button", { name: "Edit booking" })).toHaveCount(0);
});

test("1440 keeps the 560 side sheet with its own header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  const box = (await detail(page).boundingBox())!;
  expect(box.width).toBe(560);
  await expect(detail(page).getByRole("button", { name: "Download PDF (INV-2026-0201)" })).toBeVisible();
});
