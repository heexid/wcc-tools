import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// Business information — PRD US-14; INTERACTIONS 6.11–6.12; Profile lane E (edit → Brand row of the invoice PDF).

test.beforeEach(async ({ page }) => signIn(page));

const card = (p: Page) => p.getByRole("region", { name: "Business information" });
const dlg = (p: Page) => p.getByRole("dialog", { name: "Business information" });
// 1×1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==", "base64");

test("E1 · the card is prefilled from the saved business information", async ({ page }) => {
  await page.goto("/account");
  await expect(card(page)).toContainText("bs.moment");
  await expect(card(page)).toContainText("Jl. Rawa Mangun No. 12, Jakarta Timur");
  await expect(card(page)).toContainText("finance@bs-moment.com");
  await expect(card(page)).toContainText("+62 21-555-0100");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await expect(dlg(page).getByLabel("Business name")).toHaveValue("bs.moment");
  await expect(dlg(page).getByLabel("Address")).toHaveValue("Jl. Rawa Mangun No. 12, Jakarta Timur");
  await expect(dlg(page).getByLabel("Email")).toHaveValue("finance@bs-moment.com");
  await expect(dlg(page).getByLabel("Phone number")).toHaveValue("+62 21-555-0100");
  await expect(dlg(page).getByRole("button", { name: "Upload logo", exact: true })).toBeVisible();
});

test("E2 · validation keeps the modal open; Cancel / Esc / × discard the draft", async ({ page }) => {
  await page.goto("/account");
  for (const discard of [() => dlg(page).getByRole("button", { name: "Cancel" }).click(), () => page.keyboard.press("Escape"), () => dlg(page).getByRole("button", { name: "Close" }).click()]) {
    await card(page).getByRole("button", { name: "Edit" }).click();
    await dlg(page).getByLabel("Business name").fill("Temp");
    await discard();
    await expect(dlg(page)).toHaveCount(0);
  }
  await expect(card(page)).toContainText("bs.moment");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Business name").fill("");
  await dlg(page).getByLabel("Address").fill("");
  await dlg(page).getByLabel("Email").fill("not-an-email");
  await dlg(page).getByLabel("Phone number").fill("12");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page).getByText("Enter 2–50 characters.")).toHaveCount(0);
  await expect(dlg(page).getByText("Enter 2–60 characters.")).toBeVisible();
  await expect(dlg(page).getByText("Enter the business address.")).toBeVisible();
  await expect(dlg(page).getByText("Enter a valid email address.")).toBeVisible();
  await expect(dlg(page).getByText("Enter a valid phone number.")).toBeVisible();
  // errors clear as each field is fixed
  await dlg(page).getByLabel("Email").fill("hello@studio.id");
  await expect(dlg(page).getByText("Enter a valid email address.")).toHaveCount(0);
});

test("E3 · logo: wrong type and > 1 MB are refused; a PNG is accepted, replaced and removed", async ({ page }) => {
  await page.goto("/account");
  await card(page).getByRole("button", { name: "Edit" }).click();
  const file = dlg(page).getByLabel("Logo file");
  await file.setInputFiles({ name: "logo.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(dlg(page).getByText("Use a PNG, JPG or WebP image.")).toBeVisible();
  await file.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(1024 * 1024 + 1) });
  await expect(dlg(page).getByText("Logo must be 1 MB or smaller.")).toBeVisible();
  await file.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(dlg(page).getByRole("button", { name: "Replace logo" })).toBeVisible();
  await expect(dlg(page).getByText("Use a PNG, JPG or WebP image.")).toHaveCount(0);
  await dlg(page).getByRole("button", { name: "Remove" }).click();
  await expect(dlg(page).getByRole("button", { name: "Upload logo", exact: true })).toBeVisible();
});

test("E4 · save → toast, card updates, and the next PDF shows the new business (Brand row incl. email)", async ({ page }) => {
  await page.goto("/account");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Logo file").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await dlg(page).getByLabel("Business name").fill("  Studio Baru  ");
  await dlg(page).getByLabel("Address").fill("Jl. Melati 5\nBandung");
  await dlg(page).getByLabel("Email").fill("hello@studio-baru.id");
  await dlg(page).getByLabel("Phone number").fill("+62 22-777-0000");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Business information updated" })).toBeVisible();
  await expect(card(page)).toContainText("Studio Baru");
  await expect(card(page)).toContainText("hello@studio-baru.id");
  await expect(card(page).locator("img")).toHaveCount(1);
  // survives a reload
  await page.reload();
  await expect(card(page)).toContainText("+62 22-777-0000");
  // an OLD invoice's PDF picks up the new brand row (figures stay the snapshot's)
  await page.goto("/bookings?booking=BK-2026-0142");
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click()]);
  expect(d.suggestedFilename()).toBe("INV-2026-0187_sari-wulandari.pdf");
});

test("save failure: inline message, nothing saved (?fail=updateBusiness)", async ({ page }) => {
  await page.goto("/account?fail=updateBusiness");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Business name").fill("Studio Baru");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page).getByText("Couldn’t save. Check your connection and try again.")).toBeVisible();
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toHaveCount(0);
  await expect(card(page)).toContainText("Studio Baru");
});

test("viewer: sees the card but no Edit button (6.4)", async ({ page }) => {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Viewer" }).click();
  await page.goto("/account");
  await expect(card(page)).toContainText("bs.moment");
  await expect(card(page).getByRole("button", { name: "Edit" })).toHaveCount(0);
});
