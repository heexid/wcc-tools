import { expect, test, type Download, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signIn } from "../helpers/session";

// F15 — Invoice PDF: PRD US-10; INTERACTIONS 2.14, 4.2, 4.6, 4.12; lanes A5 / A5b (card and detail downloads).

test.beforeEach(async ({ page }) => signIn(page));

const sheet = (p: Page) => p.getByRole("dialog", { name: "Booking detail" });
const bytes = async (d: Download) => readFileSync((await d.path())!);

async function download(page: Page, click: () => Promise<void>) {
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), click()]);
  return d;
}

test("A5 · invoice card → INV-…_{client}.pdf; Download latest PDF → the newest invoice (2.14, 4.2, 4.6)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  const card = await download(page, () => sheet(page).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click());
  expect(card.suggestedFilename()).toBe("INV-2026-0187_sari-wulandari.pdf");
  const pdf = await bytes(card);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const latest = await download(page, () => sheet(page).getByRole("button", { name: "Download latest PDF" }).click());
  expect(latest.suggestedFilename()).toBe("INV-2026-0201_sari-wulandari.pdf");
});

test("A5b · Edit booking invoice card downloads too (new booking → first invoice → PDF)", async ({ page }) => {
  await page.goto("/bookings/BK-2026-0142/edit");
  const d = await download(page, () => page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Download PDF (INV-2026-0201)" }).click());
  expect(d.suggestedFilename()).toBe("INV-2026-0201_sari-wulandari.pdf");
});

test("snapshot only: editing the booking never changes an old invoice's PDF (US-10)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  const before = await bytes(await download(page, () => sheet(page).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click()));
  // Edit the live booking: client name, an item price and the date.
  await page.goto("/bookings/BK-2026-0142/edit");
  const main = page.getByRole("main");
  await main.getByLabel("Client name").fill("Sari W. Pratama");
  await main.getByLabel("Item 1 price").fill("600000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: /^Changes saved$/ })).toBeVisible(); // the toast, not "All changes saved"
  await page.goto("/bookings?booking=BK-2026-0142");
  await expect(sheet(page)).toContainText("Sari W. Pratama");
  const after = await bytes(await download(page, () => sheet(page).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click()));
  expect(after.equals(before), "regenerated PDF is byte-identical").toBe(true);
});

test("37 · generation failure: dialog, Cancel keeps the invoice, Try again downloads (4.12)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142&fail=generatePdf");
  await sheet(page).getByRole("button", { name: "Download PDF (INV-2026-0201)" }).click();
  const dlg = page.getByRole("alertdialog", { name: "Couldn’t generate the invoice PDF" });
  await expect(dlg).toContainText("INV-2026-0201 is saved — only the PDF file couldn’t be created.");
  await expect(dlg.getByRole("button", { name: "Try again" })).toBeFocused();
  await dlg.getByRole("button", { name: "Cancel" }).click();
  await expect(dlg).toHaveCount(0);
  await expect(sheet(page).getByRole("article", { name: "Invoice INV-2026-0201" })).toBeVisible(); // never rolled back
  // Next attempt fails again only if forced; this one succeeds through the dialog's Try again.
  await page.goto("/bookings?booking=BK-2026-0142&fail=generatePdf");
  await sheet(page).getByRole("button", { name: "Download PDF (INV-2026-0201)" }).click();
  const d = await download(page, () => page.getByRole("alertdialog").getByRole("button", { name: "Try again" }).click());
  expect(d.suggestedFilename()).toBe("INV-2026-0201_sari-wulandari.pdf");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("canceled booking: PDFs still download from the read-only view (US-12, 4.11)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-35&booking=BK-2026-0142");
  const d = await download(page, () => sheet(page).getByRole("button", { name: "Download latest PDF" }).click());
  expect(d.suggestedFilename()).toBe("INV-2026-0201_sari-wulandari.pdf");
});
