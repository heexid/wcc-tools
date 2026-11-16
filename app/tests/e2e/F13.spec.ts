import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { editAsFigma07, editAsFigma08, openEdit } from "../helpers/editBooking";

// F13 — Edit booking + follow-up invoice: PRD US-4, US-5, US-0 (archived); INTERACTIONS 2.1, 2.3, 2.13, 2.18, 3.4;
// lane B (B1 → B6, E3).

test.beforeEach(async ({ page }) => signIn(page));

const rail = (p: Page) => p.getByRole("complementary", { name: "Summary and invoices" });
const invoices = (p: Page) => p.getByRole("region", { name: "Invoices" });
const modal = (p: Page, n: number) => p.getByRole("dialog", { name: `New invoice #${n}` });
const toast = (p: Page, text: string | RegExp) => p.getByRole("status").filter({ hasText: text });

test("lane B · B1 → B3: detail → Edit booking → recalculated total + diff strip → Save changes (2.3, US-4)", async ({ page }) => {
  await page.goto("/bookings?tab=table");
  await page.getByRole("button", { name: /Wedding · Sari & Dimas/ }).first().click();
  await page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Edit booking" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(rail(page).getByRole("region", { name: "Updated totals" })).toContainText(/Remaining after save\s*Rp 7\.500\.000/);
  await expect(page.getByText("All changes saved")).toBeVisible();
  await editAsFigma07(page);
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  const strip = rail(page).getByRole("status").filter({ hasText: "Total updated" });
  await expect(strip).toContainText("Total updated: Rp 12.500.000 → Rp 18.750.000");
  await expect(strip).toContainText("+Rp 6.250.000 since last invoice · package → Platinum, items updated, date moved to 21 Nov 2026.");
  await expect(page.getByText("Moved from 12 Nov 2026")).toBeVisible();
  await expect(rail(page).getByRole("region", { name: "Updated totals" })).toContainText(/Remaining after save\s*Rp 13\.750\.000/);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  await expect(page.getByText("Saved just now")).toBeVisible();
  await expect(strip).toHaveCount(0);
  // Saving an edit never touches existing invoices (US-4).
  await expect(invoices(page).getByRole("article")).toHaveCount(2);
  await expect(invoices(page).getByRole("article", { name: "Invoice INV-2026-0201" })).toContainText("Paid after this invoice: Rp 5.000.000 of Rp 12.500.000");
  await page.goto("/bookings?date=2026-11-21");
  await expect(page.getByRole("gridcell", { name: /^Saturday, 21 Nov 2026/ }).getByRole("button", { name: /Wedding · Sari & Dimas/ })).toBeVisible();
});

test("lane B · B4 → B5: Partial #3 — limit, suggestion, Confirm saves pending edits first (3.4, US-5)", async ({ page }) => {
  await openEdit(page, "screen-09");
  await editAsFigma07(page);
  await invoices(page).getByRole("button", { name: "Create invoice" }).click();
  const m = modal(page, 3);
  await expect(m).toContainText("For BK-2026-0142 · Wedding · Sari & Dimas");
  await expect(m.getByLabel("Booking balance")).toContainText(/Total booking\s*Rp 18\.750\.000/);
  await expect(m.getByLabel("Booking balance")).toContainText(/Paid \(2 invoices\)\s*Rp 5\.000\.000/);
  const amount = m.getByLabel("Payment amount");
  await amount.fill("13750000"); // = remaining → must use Paid
  await expect(amount).toHaveAttribute("aria-invalid", "true");
  await expect(m.getByText("Must be less than remaining Rp 13.750.000 — use Paid to settle in full")).toBeVisible();
  await expect(m.getByRole("button", { name: "Confirm & generate invoice" })).toBeDisabled();
  await amount.fill("0");
  await expect(m.getByText("Enter an amount above Rp 0")).toBeVisible();
  await amount.fill("5000000");
  const sum = m.getByRole("region", { name: "Payment summary" });
  await expect(sum).toContainText(/This payment\s*Rp 5\.000\.000/);
  await expect(sum).toContainText(/New total paid\s*Rp 10\.000\.000/);
  await expect(sum).toContainText(/New remaining balance\s*Rp 8\.750\.000/);
  await m.getByRole("button", { name: "Confirm & generate invoice" }).click();
  await expect(m).toHaveCount(0);
  await expect(toast(page, /^Changes saved · INV-2026-\d{4} added · Partially paid$/)).toBeVisible();
  await expect(invoices(page).getByRole("heading", { name: "Invoices (3)" })).toBeVisible();
  await expect(invoices(page).getByRole("article").first()).toContainText("Paid after this invoice: Rp 10.000.000 of Rp 18.750.000");
  await expect(page.getByText("Unsaved changes")).toHaveCount(0);
  await page.reload();
  await expect(rail(page).getByRole("region", { name: "Updated totals" })).toContainText(/New total\s*Rp 18\.750\.000/);
});

test("lane B · B6 → End: Paid (Lunas) locks the amount to the remaining balance → Paid, no more invoices (3.4)", async ({ page }) => {
  await openEdit(page, "screen-10");
  await invoices(page).getByRole("button", { name: "Create invoice" }).click();
  const m = modal(page, 3);
  await m.getByRole("radio", { name: "Paid (Lunas)" }).click();
  await expect(m.getByLabel("Payment amount")).toBeDisabled();
  await expect(m.getByLabel("Payment amount")).toHaveValue("Rp 13.750.000");
  await expect(m.getByText("Auto-calculated: updated total − previously paid")).toBeVisible();
  await expect(m.getByRole("region", { name: "Payment summary" })).toContainText(/New remaining balance\s*Rp 0/);
  await m.getByRole("button", { name: "Confirm full payment" }).click();
  await expect(toast(page, "INV-2026-0233 added · Paid")).toBeVisible();
  await expect(invoices(page)).toContainText("Paid");
  await expect(invoices(page).getByRole("button", { name: "Create invoice" })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Paid");
});

test("E3 · total below paid: inline errors, Save disabled, invoices hidden; fixing it restores both (2.13, rule 10)", async ({ page }) => {
  await openEdit(page, "screen-08");
  await editAsFigma08(page);
  await expect(page.getByText("Total Rp 4.000.000 can’t be lower than Rp 5.000.000 already paid")).toBeVisible();
  const card = rail(page).getByRole("region", { name: "Booking total" });
  await expect(card).toContainText(/Previous total\s*Rp 12\.500\.000/);
  await expect(card.getByRole("alert")).toContainText("Total can’t be lower than Rp 5.000.000 already paid.");
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await expect(invoices(page)).toHaveCount(0);
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await page.getByRole("option", { name: /Gold Package/ }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();
  await expect(invoices(page)).toBeVisible();
});

test("12 · leave guard names the changes; Keep editing stays; Discard leaves without saving; clean edit doesn't ask (2.1)", async ({ page }) => {
  await openEdit(page, "screen-12");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/); // nothing changed → no prompt
  await openEdit(page, "screen-12");
  await editAsFigma07(page);
  await page.getByRole("button", { name: "Back to bookings" }).click();
  const g = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await expect(g).toContainText("You changed the package, items and booking date. If you leave now, these changes won’t be saved. Existing invoices are not affected.");
  await g.getByRole("button", { name: "Keep editing" }).click();
  await expect(g).toHaveCount(0);
  await expect(page).toHaveURL(/\/edit/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await openEdit(page, "screen-12");
  await expect(page.getByRole("main").getByRole("button", { name: "Package" })).toContainText("Gold Package");
});

test("38 · archived package kept at its saved price, not listed; saving keeps it (2.18, US-0)", async ({ page }) => {
  await openEdit(page, "screen-38");
  await expect(page.getByText("Archived — kept on this booking at its saved price. It isn’t listed in the dropdown.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Archived", { exact: true })).toBeVisible();
  await expect(rail(page).getByRole("region", { name: "Updated totals" })).toContainText(/Gold Package \(archived\)\s*Rp 10\.000\.000/);
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await expect(page.getByRole("option", { name: /Gold Package/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("main").getByLabel("Item 1 quantity").fill("3");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  await expect(rail(page).getByRole("region", { name: "Updated totals" })).toContainText(/New total\s*Rp 15\.250\.000/);
});

test("edit A → leave → edit B → edit A again, all in-app: each shows its own booking (no kept state)", async ({ page }) => {
  const editFromPanel = async (name: RegExp) => {
    await page.getByRole("button", { name }).first().click();
    await page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Edit booking" }).click();
    await expect(page).toHaveURL(/\/edit$/);
  };
  await page.goto("/bookings?tab=table");
  await editFromPanel(/Wedding · Sari & Dimas/);
  await expect(page.getByRole("main").getByLabel("Client name")).toHaveValue("Sari Wulandari");
  await page.getByRole("main").getByLabel("Client name").fill("Sari W.");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click();
  await page.getByRole("tab", { name: "Table" }).click();
  await editFromPanel(/Graduation · Aulia/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Graduation · Aulia");
  await expect(page.getByRole("main").getByLabel("Client name")).toHaveValue("Aulia Rahma");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("tab", { name: "Table" }).click();
  await editFromPanel(/Wedding · Sari & Dimas/);
  await expect(page.getByRole("main").getByLabel("Client name")).toHaveValue("Sari Wulandari"); // discarded edit gone
});
