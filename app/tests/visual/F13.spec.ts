import { expect, test } from "@playwright/test";
import { expectMatchesFigma, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";
import { editAsFigma07, editAsFigma08, openEdit } from "../helpers/editBooking";

// F13 — Edit booking vs Figma 07, 08, 09, 12, 38 (full frames).
// Masks (reasons):
//  • "Created" value: Figma 10 Nov 2026, 09:42 — Sari's record was created 10 Oct (as the detail panel, 06, shows).
//  • 08 package value: Figma draws "Silver Package" in the placeholder colour inside the error field (override slip;
//    the DS keeps a picked value in text/primary).
//  • 38 "Moved from 12 Nov 2026": 38 is a saved, unchanged booking ("All changes saved"); the prototype shows the
//    hint only while a date change is unsaved (07 / 08 / 12) — no previous date is stored after Save.
//  • 38 is compared above y = 1690: its "Cancel booking" section belongs to F14 (frame 33).
// 10 is a states board in the older inline-card layout (as 05b) — its Paid copy is asserted in e2e, not by pixels.

test.beforeEach(async ({ page }) => signIn(page));

const CREATED = (y: number): Rect => ({ x: 366, y, w: 278, h: 22 });

test("07 · edit — recalculated total + diff strip", async ({ page }) => {
  await openEdit(page, "screen-07");
  await editAsFigma07(page);
  await expect(page.getByText("Total updated: Rp 12.500.000 → Rp 18.750.000")).toBeVisible();
  await expectMatchesFigma(page, "bookings-07", undefined, { masks: [CREATED(1161)] });
});

test("08 · edit — total below paid", async ({ page }) => {
  await openEdit(page, "screen-08");
  await editAsFigma08(page);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  const pkgValue: Rect = { x: 46, y: 518, w: 576, h: 22 };
  await expectMatchesFigma(page, "bookings-08", undefined, { masks: [CREATED(1026), pkgValue] });
});

test("09 · Create invoice #3 — Partial Rp 5.000.000", async ({ page }) => {
  await openEdit(page, "screen-09");
  await editAsFigma07(page);
  // Full-frame viewport before opening: the modal's scroll lock keeps whatever scroll the click would cause.
  await page.setViewportSize({ width: 1440, height: 1690 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Create invoice" }).click();
  const dlg = page.getByRole("dialog", { name: "New invoice #3" });
  await dlg.getByLabel("Payment amount").fill("5000000");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "bookings-09", undefined, { masks: [CREATED(1161)] });
});

test("12 · unsaved changes guard", async ({ page }) => {
  await openEdit(page, "screen-12");
  await editAsFigma07(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("alertdialog", { name: "Discard unsaved changes?" })).toBeVisible();
  await page.mouse.move(0, 0);
  await expectMatchesFigma(page, "bookings-12", undefined, { masks: [CREATED(1161)] });
});

test("38 · edit — archived package kept", async ({ page }) => {
  await openEdit(page, "screen-38");
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1881 });
  const moved: Rect = { x: 33, y: 1222, w: 144, h: 20 };
  await expectMatchesFigma(page, "bookings-38", undefined, { clip: { x: 0, y: 0, w: 1440, h: 1690 }, masks: [CREATED(1189), moved] });
});
