import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// R05 — New / Edit booking below 768 (Figma M05 · M06 · ME1 · ME2): Child top bar, one column, line-item cards,
// sticky Cancel / Save, invoice + cancel as bottom sheets.

const PHONE = { width: 390, height: 844 };
const bar = (p: Page) => p.locator("header").filter({ has: p.getByRole("button", { name: "Back to bookings" }) });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(PHONE);
  await signIn(page);
});

test.describe("M05 · new booking", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/bookings/new?fixture=screen-04");
    await expect(page.getByLabel("Client name", { exact: true })).toBeVisible();
  });

  test("Child top bar: back · New booking · Draft · autosave status; no module bar, no desktop header", async ({ page }) => {
    await expect(bar(page)).toBeVisible();
    expect((await bar(page).boundingBox())!.height).toBe(56);
    await expect(bar(page).getByRole("heading", { name: "New booking" })).toBeVisible();
    await expect(bar(page).getByRole("status", { name: "Draft · not saved" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Menu", exact: true })).toBeHidden();
    await expect(page.getByRole("button", { name: "Save booking" })).toHaveCount(1); // only the mobile action bar
  });

  test("one column: fields 44 / 16px, date + start side by side, Created full width", async ({ page }) => {
    const client = page.getByLabel("Client name", { exact: true });
    expect((await client.locator("..").boundingBox())!).toMatchObject({ x: 16, width: 358, height: 44 });
    expect(await client.evaluate((e) => getComputedStyle(e).fontSize)).toBe("16px");
    const date = (await page.getByRole("button", { name: "Booking date" }).boundingBox())!;
    const start = (await page.getByRole("textbox", { name: "Event start" }).boundingBox())!;
    expect(Math.abs(date.y - start.y)).toBeLessThan(1);
    expect(start.x).toBeGreaterThan(date.x + date.width);
    expect((await page.getByLabel("Created").locator("..").boundingBox())!.width).toBe(358);
  });

  test("additional items are cards: item + 44 remove / price · qty · subtotal", async ({ page }) => {
    await page.getByRole("main").getByRole("button", { name: "Add item" }).click();
    const name = (await page.getByLabel("Item 1 name").locator("..").boundingBox())!;
    const remove = (await page.getByRole("button", { name: "Remove item 1" }).boundingBox())!;
    const price = (await page.getByLabel("Item 1 price").locator("..").boundingBox())!;
    const qty = (await page.getByLabel("Item 1 quantity").locator("..").boundingBox())!;
    expect(remove).toMatchObject({ width: 44, height: 44 });
    expect(Math.abs(remove.y + remove.height / 2 - (name.y + name.height / 2))).toBeLessThan(1); // same row
    expect(price.y).toBeGreaterThan(name.y + name.height); // second row
    expect(Math.abs(qty.y - price.y)).toBeLessThan(1);
    expect(qty.width).toBe(64);
    expect(name.height).toBe(44);
  });

  test("fill → invoice sheet (Full price) → Confirm & generate saves; edit mode", async ({ page }) => {
    await fillSari(page);
    await page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Create invoice" }).click();
    const sheet = page.getByRole("dialog", { name: "New invoice #1" });
    await expect(sheet).toBeVisible();
    // Bottom sheet: full width, on the bottom edge, at most 48 from the top.
    const box = (await sheet.boundingBox())!;
    expect(box.x).toBe(0);
    expect(box.width).toBe(390);
    expect(box.y).toBeGreaterThanOrEqual(48);
    await expect(sheet).toContainText("For this new booking · Wedding · Sari & Dimas");
    await sheet.getByRole("radio", { name: "Full price" }).click();
    const confirm = sheet.getByRole("button", { name: "Confirm & generate" });
    expect((await confirm.boundingBox())!.height).toBe(44);
    await confirm.click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/bookings\/[^/]+\/edit$/);
    await expect(bar(page).getByRole("heading", { name: "Wedding · Sari & Dimas" })).toBeVisible();
    await expect(bar(page).getByText("Paid")).toBeVisible();
  });
});

test.describe("ME1 / ME2 · edit + cancel", () => {
  test("edit: title + status in the bar, Save changes; Cancel booking → sheet (Keep focused) → canceled", async ({ page }) => {
    await page.goto("/bookings/BK-2026-0142/edit");
    await expect(bar(page).getByRole("heading", { name: "Wedding · Sari & Dimas" })).toBeVisible();
    await expect(bar(page).getByText("Partially paid")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    // Title truncates instead of pushing the status / autosave off-screen.
    const autosave = (await bar(page).getByRole("status").boundingBox())!;
    expect(autosave.x + autosave.width).toBeLessThanOrEqual(390 - 16 + 0.5);
    await page.getByRole("region", { name: "Cancel booking" }).or(page.locator("section[aria-labelledby=sec-cancel]")).getByRole("button", { name: "Cancel booking" }).click();
    const sheet = page.getByRole("alertdialog", { name: "Cancel this booking?" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Keep booking" })).toBeFocused();
    await expect(sheet).toContainText("BK-2026-0142 · Wedding · Sari & Dimas");
    await sheet.getByLabel("Reason (optional)").fill("Client postponed the wedding to next year");
    await sheet.getByRole("button", { name: "Cancel booking" }).click();
    await expect(page).toHaveURL(/\/bookings\?booking=/);
  });
});

test("1440 keeps the desktop editor header (no Child bar, no action bar)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/bookings/new");
  await expect(page.getByRole("button", { name: "Back to bookings" })).toHaveCount(1); // the desktop page header's back
  await expect(page.getByRole("button", { name: "Save booking" })).toHaveCount(1); // header only
});
