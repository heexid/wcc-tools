import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";
import { openEdit } from "../helpers/editBooking";

// F17 — Payment instruction: Figma Bookings · Hi-fi flow lane I (I1 → I2 → I2e → I3), the "Payment instruction card"
// in the form's Package section, the detail sheet's Payment row and the canceled full page (read-only card).
// Every booking has one — prefilled with the studio account, editable per booking, never empty.

test.beforeEach(async ({ page }) => signIn(page));

const card = (p: Page) => p.getByRole("main").getByRole("group", { name: "Payment instruction" });
const modal = (p: Page) => p.getByRole("dialog", { name: "Payment instruction" });
const sheet = (p: Page) => p.getByRole("dialog", { name: "Booking detail" });

test("lane I · I1 prefilled with the studio account → Edit → I2 prefilled → Save → I3 card updated", async ({ page }) => {
  await page.goto("/bookings/new");
  // I1: in the Package section, under the package info, prefilled (no empty state).
  await expect(card(page)).toContainText("Bank BCA");
  await expect(card(page)).toContainText("1234567890 · a.n. bs.moment Studio");
  const pkgSection = page.getByRole("main").getByRole("region", { name: "Package" });
  await expect(pkgSection.getByRole("group", { name: "Payment instruction" })).toBeVisible();

  // I2: the DS Modal opens with the saved values.
  await card(page).getByRole("button", { name: /Edit payment instruction/ }).click();
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).getByRole("heading", { name: "Bank account" })).toBeVisible();
  await expect(modal(page).getByLabel("Payment receipt name")).toHaveValue("Bank BCA");
  await expect(modal(page).getByLabel("Account number")).toHaveValue("1234567890");
  await expect(modal(page).getByLabel("Account name")).toHaveValue("bs.moment Studio");

  await modal(page).getByLabel("Payment receipt name").fill("Bank Mandiri");
  await modal(page).getByLabel("Account number").fill("1370-0123-45678"); // non-digits are dropped while typing
  await expect(modal(page).getByLabel("Account number")).toHaveValue("1370012345678");
  await modal(page).getByRole("button", { name: "Save" }).click();

  // I3: modal closes, card shows the new account; the booking now has unsaved changes.
  await expect(modal(page)).toHaveCount(0);
  await expect(card(page)).toContainText("Bank Mandiri");
  await expect(card(page)).toContainText("1370012345678 · a.n. bs.moment Studio");
});

test("lane I · I2e: a cleared field can't be saved — inline errors, modal stays open, errors clear as fixed", async ({ page }) => {
  await page.goto("/bookings/new");
  await card(page).getByRole("button", { name: /Edit payment instruction/ }).click();
  for (const label of ["Payment receipt name", "Account number", "Account name"]) await modal(page).getByLabel(label).fill("");
  await modal(page).getByRole("button", { name: "Save" }).click();

  await expect(modal(page)).toBeVisible();
  await expect(modal(page)).toContainText("Enter the bank or payment name");
  await expect(modal(page)).toContainText("Enter the account number (numbers only)");
  await expect(modal(page)).toContainText("Enter the account name");
  await expect(modal(page).getByLabel("Payment receipt name")).toBeFocused(); // first invalid field

  await modal(page).getByLabel("Payment receipt name").fill("Bank BRI");
  await expect(modal(page)).not.toContainText("Enter the bank or payment name");
  await modal(page).getByLabel("Account number").fill("12"); // too short
  await modal(page).getByLabel("Account name").fill("bs.moment Studio");
  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(modal(page)).toContainText("Enter the account number (numbers only)");

  // Cancel drops the draft — the card keeps the studio account.
  await modal(page).getByRole("button", { name: "Cancel" }).click();
  await expect(modal(page)).toHaveCount(0);
  await expect(card(page)).toContainText("Bank BCA");
});

test("Esc / × close without changes; reopening starts from the card's values", async ({ page }) => {
  await page.goto("/bookings/new");
  await card(page).getByRole("button", { name: /Edit payment instruction/ }).click();
  await modal(page).getByLabel("Payment receipt name").fill("Bank Jago");
  await page.keyboard.press("Escape");
  await expect(modal(page)).toHaveCount(0);
  await expect(card(page)).toContainText("Bank BCA");
  await card(page).getByRole("button", { name: /Edit payment instruction/ }).click();
  await expect(modal(page).getByLabel("Payment receipt name")).toHaveValue("Bank BCA");
  await modal(page).getByRole("button", { name: "Close" }).click();
  await expect(modal(page)).toHaveCount(0);
});

test("saved with the booking: new booking keeps the edited instruction; detail sheet shows the Payment row", async ({ page }) => {
  await page.goto("/bookings/new");
  await fillSari(page);
  await card(page).getByRole("button", { name: /Edit payment instruction/ }).click();
  await modal(page).getByLabel("Payment receipt name").fill("Bank Mandiri");
  await modal(page).getByLabel("Account number").fill("1370012345678");
  await modal(page).getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/]+\/edit$/);
  await page.reload();
  await expect(card(page)).toContainText("Bank Mandiri");

  const id = page.url().match(/\/bookings\/([^/]+)\/edit/)![1];
  await page.goto(`/bookings?booking=${id}`);
  await expect(sheet(page)).toContainText(/Payment\s*Bank Mandiri · 1370012345678 · a\.n\. bs\.moment Studio/);
});

test("edit booking: the instruction is a booking change — leave guard names it; saved bookings show the studio default", async ({ page }) => {
  await openEdit(page, "seed");
  await expect(card(page)).toContainText("Bank BCA");
  await card(page).getByRole("button", { name: /Edit payment instruction/ }).click();
  await modal(page).getByLabel("Account name").fill("Sari Studio");
  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Back to bookings" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("You changed the payment instruction.");
});

test("detail sheet: every booking has a Payment row under Package", async ({ page }) => {
  await page.goto("/bookings?fixture=seed&booking=BK-2026-0142");
  await expect(sheet(page)).toContainText(/Package[\s\S]*Payment\s*Bank BCA · 1234567890 · a\.n\. bs\.moment Studio/);
});

test("canceled full page: the card is read-only (no Edit)", async ({ page }) => {
  await page.goto("/bookings/BK-2026-0142?fixture=screen-35");
  await expect(card(page)).toContainText("Bank BCA");
  await expect(card(page).getByRole("button")).toHaveCount(0);
});
