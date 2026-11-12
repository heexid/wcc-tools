import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// F11 — New invoice #1 modal vs Figma 04, 04c, 22, 23 and the created state 05, 05c.
// Masks (reasons):
//  • "Created" value: Figma 09:42, frozen clock 09:00 (as F10).
//  • 05 / 05c "Issued … 09:48" on the invoice card: same frozen-clock reason.
//  • 05 / 05c toast: Figma parks it bottom-right at an arbitrary y (05c even 90 from the right); the DS toast is
//    bottom-centre (Launchpad AC4 / AC7, F5, F10). The capture waits for it to leave and masks Figma's copy.
// 05b is a states board in an older inline-card layout (420 wide, "Create invoice" title, no balance strip or
// footer) — its states are checked by behaviour in tests/e2e/F11.spec.ts, not by pixels.

test.beforeEach(async ({ page }) => signIn(page));

const CREATED = (y: number): Rect => ({ x: 353, y, w: 304, h: 36 });
const H = 1637;

export async function openInvoiceModal(page: Page, fixture = "screen-04", query = "") {
  await page.goto(`/bookings/new?fixture=${fixture}${query}`);
  await expect(page.getByRole("heading", { name: "New booking" })).toBeVisible();
  await fillSari(page);
  await page.setViewportSize({ width: 1440, height: H });
  await page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Create invoice" }).click();
  const dlg = page.getByRole("dialog", { name: "New invoice #1" });
  await expect(dlg).toBeVisible();
  return dlg;
}

test("04 · Create invoice #1 — DP 40 %", async ({ page }) => {
  const dlg = await openInvoiceModal(page);
  await dlg.getByLabel("DP percentage").fill("40");
  await expect(dlg.getByRole("region", { name: "Payment summary" })).toContainText("Rp 5.000.000");
  await page.mouse.move(0, 0);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-04", undefined, { masks: [CREATED(1101)] });
});

test("04c · Create invoice #1 — Full price", async ({ page }) => {
  const dlg = await openInvoiceModal(page, "screen-04c");
  await dlg.getByRole("radio", { name: "Full price" }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-04c", undefined, { masks: [CREATED(1101)] });
});

test("22 · confirming (loading)", async ({ page }) => {
  const dlg = await openInvoiceModal(page, "screen-22", "&latency=60000");
  await dlg.getByLabel("DP percentage").fill("40");
  await dlg.getByRole("button", { name: "Confirm & generate invoice" }).click();
  await expect(dlg.getByText("Saving booking and creating invoice…")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-22", undefined, { masks: [CREATED(1101)] });
});

test("23 · creation failed", async ({ page }) => {
  const dlg = await openInvoiceModal(page, "screen-23", "&fail=createInvoice");
  await dlg.getByLabel("DP percentage").fill("40");
  await dlg.getByRole("button", { name: "Confirm & generate invoice" }).click();
  await expect(dlg.getByRole("alert")).toContainText("Couldn’t create the invoice");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-23", undefined, { masks: [CREATED(1101)] });
});

const ISSUED: Rect = { x: 808, y: 609, w: 160, h: 20 }; // title row is 22 tall since the invoice type tag was removed
const FIGMA_TOAST = (w: number): Rect => ({ x: Math.round((1440 - w) / 2), y: 94, w, h: 48 }); // top-centre, under the header

for (const [frame, choose, toastW] of [
  ["05", "dp", 423],
  ["05c", "full", 365],
] as const) {
  test(`${frame} · invoice created`, async ({ page }) => {
    const dlg = await openInvoiceModal(page);
    if (choose === "dp") await dlg.getByLabel("DP percentage").fill("40");
    else await dlg.getByRole("radio", { name: "Full price" }).click();
    await dlg.getByRole("button", { name: "Confirm & generate invoice" }).click();
    await expect(dlg).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "INV-2026-0187 added" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "INV-2026-0187 added" })).toHaveCount(0, { timeout: 8000 });
    await expectMatchesFigma(page, `bookings-${frame}`, undefined, { masks: [CREATED(1101), ISSUED, FIGMA_TOAST(toastW)] });
  });
}
