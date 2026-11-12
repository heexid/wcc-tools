import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// F11 — Invoice modal · first invoice: PRD US-2, US-3; INTERACTIONS 2.11, 2.14, 3.1–3.3, 3.5–3.8;
// lane A (A2 → A3 → A4 DP, A3b → A4b Full, E1 over-limit loop) up to the PDF step (F15).

test.beforeEach(async ({ page }) => signIn(page));

const modal = (p: Page) => p.getByRole("dialog", { name: "New invoice #1" });
const invoices = (p: Page) => p.getByRole("region", { name: "Invoices" });
const summary = (p: Page) => modal(p).getByRole("region", { name: "Payment summary" });
const confirmBtn = (p: Page) => modal(p).getByRole("button", { name: /Confirm & generate invoice|Try again/ });

async function open(page: Page, q = "") {
  await page.goto(`/bookings/new?fixture=screen-04${q}`);
  await expect(page.getByRole("heading", { name: "New booking" })).toBeVisible();
  await fillSari(page);
  await invoices(page).getByRole("button", { name: "Create invoice" }).click();
  await expect(modal(page)).toBeVisible();
}

test("lane A · DP 40 % → Confirm saves the booking + INV-2026-0187, Partially paid, edit mode (2.11, 3.2, 3.6)", async ({ page }) => {
  await open(page);
  const m = modal(page);
  await expect(m).toContainText("For this new booking · Wedding · Sari & Dimas");
  await expect(m.getByLabel("Booking balance")).toContainText(/Total booking\s*Rp 12\.500\.000/);
  // DP is the default; the method + percentage field are only there for DP (progressive disclosure).
  await expect(m.getByRole("radio", { name: "DP (down payment)" })).toHaveAttribute("aria-checked", "true");
  await expect(confirmBtn(page)).toBeDisabled();
  await expect(summary(page)).toContainText(/Total bayar\s*—/);
  await m.getByLabel("DP percentage").fill("40");
  await expect(m.getByLabel("DP percentage")).toHaveValue("40 %");
  await expect(summary(page)).toContainText("Percentage · 40%");
  await expect(summary(page)).toContainText(/Total bayar\s*Rp 5\.000\.000/);
  await expect(summary(page)).toContainText(/Remaining balance\s*Rp 7\.500\.000/);
  await confirmBtn(page).click();

  await expect(m).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Booking saved · INV-2026-0187 added · Partially paid" })).toBeVisible();
  const card = invoices(page).getByRole("article", { name: "Invoice INV-2026-0187" });
  await expect(card).not.toContainText("DP"); // no invoice type tag on the card (removed 2026-11-11)
  await expect(card).toContainText("Rp 5.000.000");
  await expect(card).toContainText("Paid after this invoice: Rp 5.000.000 of Rp 12.500.000");
  await expect(invoices(page).getByRole("heading", { name: "Invoices (1)" })).toBeVisible();
  await expect(invoices(page)).toContainText("Partially paid");
  await expect(invoices(page).getByRole("button", { name: "Create invoice" })).toBeVisible(); // follow-up (F13)
  // Edit mode (Figma 05): ref in the breadcrumb, booking name as title, saved status, no leave prompt.
  await expect(page).toHaveURL(/\/bookings\/bk_[a-z0-9]+\/edit$/);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("BK-2026-0142");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  await expect(page.getByText("Saved just now")).toBeVisible();
  await card.getByRole("button", { name: /PDF/ }).click(); // 2.14 — real PDF in F15
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/);
});

test("lane A · Full price → amount locked to the total, Paid, no further Create invoice (3.2, A3b → A4b)", async ({ page }) => {
  await open(page);
  const m = modal(page);
  await m.getByRole("radio", { name: "Full price" }).click();
  await expect(m.getByText("Calculate DP by")).toHaveCount(0);
  await expect(m.getByLabel("Payment amount")).toBeDisabled();
  await expect(m.getByLabel("Payment amount")).toHaveValue("Rp 12.500.000");
  await expect(summary(page)).toContainText(/Remaining balance\s*Rp 0/);
  await expect(summary(page)).not.toContainText("Payment method");
  await confirmBtn(page).click();
  await expect(page.getByRole("status").filter({ hasText: "Booking saved · INV-2026-0187 added · Paid" })).toBeVisible();
  await expect(invoices(page).getByRole("article", { name: "Invoice INV-2026-0187" })).not.toContainText("Full"); // no invoice type tag on the card
  await expect(invoices(page).getByRole("button", { name: "Create invoice" })).toHaveCount(0);
  // Reload: the invoice is the payment record of the saved booking (US-3).
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  await expect(invoices(page).getByRole("article", { name: "Invoice INV-2026-0187" })).toBeVisible();
  await expect(page.getByText("All changes saved")).toBeVisible();
});

test("E1 · over the limit and zero are blocked inline; fixing re-enables Confirm (3.3, 3.5)", async ({ page }) => {
  await open(page);
  const m = modal(page);
  await m.getByRole("radio", { name: "Fixed amount (Rp)" }).click();
  await m.getByLabel("DP amount").fill("15000000");
  await expect(m.getByLabel("DP amount")).toHaveValue("Rp 15.000.000");
  await expect(m.getByText("DP can’t exceed the booking total (Rp 12.500.000)")).toBeVisible();
  await expect(m.getByLabel("DP amount")).toHaveAttribute("aria-invalid", "true");
  await expect(confirmBtn(page)).toBeDisabled();
  await expect(summary(page)).toContainText(/Payment method\s*Fixed amount/);
  await expect(summary(page)).toContainText(/Total bayar\s*—/);
  await m.getByLabel("DP amount").fill("2500000");
  await expect(summary(page)).toContainText(/Remaining balance\s*Rp 10\.000\.000/);
  await expect(confirmBtn(page)).toBeEnabled();
  await m.getByLabel("DP amount").fill("0");
  await expect(m.getByText("Enter a DP above Rp 0")).toBeVisible();
  // Percentage: 0 blocked, > 100 rejected, ≤ 2 decimals, half-up rounding to the Rupiah.
  await m.getByRole("radio", { name: "Percentage (%)" }).click();
  await m.getByLabel("DP percentage").fill("0");
  await expect(m.getByText("Enter a DP above Rp 0")).toBeVisible();
  await m.getByLabel("DP percentage").fill("101");
  await expect(m.getByText("Enter 0–100%, up to 2 decimals")).toBeVisible();
  await m.getByLabel("DP percentage").fill("33.333");
  await expect(m.getByLabel("DP percentage")).toHaveValue("33,33 %");
  await expect(summary(page)).toContainText(/Total bayar\s*Rp 4\.166\.250/);
  await expect(confirmBtn(page)).toBeEnabled();
});

test("× / Cancel / Esc / scrim close without creating anything (3.1)", async ({ page }) => {
  await open(page);
  await modal(page).getByLabel("DP percentage").fill("40");
  await modal(page).getByRole("button", { name: "Close" }).click();
  await expect(modal(page)).toHaveCount(0);
  for (const close of [
    () => modal(page).getByRole("button", { name: "Cancel" }).click(),
    () => page.keyboard.press("Escape"),
    () => page.mouse.click(1300, 500), // scrim, beside the modal
  ]) {
    await invoices(page).getByRole("button", { name: "Create invoice" }).click();
    await expect(modal(page)).toBeVisible();
    await expect(modal(page).getByLabel("DP percentage")).toHaveValue(""); // each opening starts fresh
    await close();
    await expect(modal(page)).toHaveCount(0);
  }
  await expect(invoices(page).getByRole("heading", { name: "Invoices (0)" })).toBeVisible();
  await expect(page.getByText("Draft · not saved")).toBeVisible();
  await expect(page).toHaveURL(/\/bookings\/new/);
});

test("22 · in progress: Confirm loading, Cancel / Esc disabled, footer says so (3.7)", async ({ page }) => {
  await open(page, "&latency=1500");
  const m = modal(page);
  await m.getByLabel("DP percentage").fill("40");
  await confirmBtn(page).click();
  await expect(m.getByText("Saving booking and creating invoice…")).toBeVisible();
  await expect(m.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await expect(m.getByRole("button", { name: /Confirm & generate invoice/ })).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Escape");
  await expect(m).toBeVisible();
  await expect(m).toHaveCount(0, { timeout: 5000 });
  await expect(invoices(page).getByRole("article", { name: "Invoice INV-2026-0187" })).toBeVisible();
});

test("23 · failure: alert, entries kept, nothing saved; Try again succeeds (3.8)", async ({ page }) => {
  await open(page, "&fail=createInvoice");
  const m = modal(page);
  await m.getByLabel("DP percentage").fill("40");
  await confirmBtn(page).click();
  await expect(m.getByRole("alert")).toContainText("Couldn’t create the invoice");
  await expect(m.getByRole("alert")).toContainText("Nothing was saved — your entries are kept. Try again.");
  await expect(m.getByLabel("DP percentage")).toHaveValue("40 %");
  await expect(page.getByText("Draft · not saved")).toBeVisible(); // the booking wasn't saved either (one transaction)
  await m.getByRole("button", { name: "Try again" }).click();
  await expect(m).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Booking saved · INV-2026-0187 added · Partially paid" })).toBeVisible();
});

test("first invoice on a saved Draft: subtitle names the ref; toast doesn't repeat 'Booking saved' (3.6)", async ({ page }) => {
  await page.goto("/bookings/new?fixture=screen-04");
  await fillSari(page);
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("BK-2026-0142");
  await invoices(page).getByRole("button", { name: "Create invoice" }).click();
  await expect(modal(page)).toContainText("For BK-2026-0142 · Wedding · Sari & Dimas");
  await modal(page).getByRole("radio", { name: "Full price" }).click();
  await confirmBtn(page).click();
  await expect(page.getByRole("status").filter({ hasText: /^INV-2026-0187 added · Paid$/ })).toBeVisible();
});

test("Create invoice with an incomplete form shows the form errors instead of the modal (2.4, 2.11)", async ({ page }) => {
  await page.goto("/bookings/new?fixture=screen-04");
  await page.getByRole("main").getByLabel("Client name").fill("Sari Wulandari");
  await page.getByRole("main").getByLabel("Phone number").fill("081234567890");
  await invoices(page).getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByText(/fields? need attention/)).toBeVisible();
  await expect(modal(page)).toHaveCount(0);
});

test("segmented controls work from the keyboard", async ({ page }) => {
  await open(page);
  const m = modal(page);
  await m.getByRole("radio", { name: "DP (down payment)" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(m.getByRole("radio", { name: "Full price" })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(m.getByLabel("DP percentage")).toBeVisible();
});
