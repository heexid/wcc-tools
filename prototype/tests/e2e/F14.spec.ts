import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { openEdit } from "../helpers/editBooking";

// F14 — Cancel booking: PRD US-12, §2.4 rule 12; INTERACTIONS 2.15, 2.16, 4.11, 1.33; lane H (H1 → H4).

test.beforeEach(async ({ page }) => signIn(page));

const dlg = (p: Page) => p.getByRole("alertdialog", { name: "Cancel this booking?" });
const sheet = (p: Page) => p.getByRole("dialog", { name: "Booking detail" });

test("lane H · Keep booking (default focus) / Esc / scrim change nothing (2.16)", async ({ page }) => {
  await openEdit(page, "seed");
  for (const keep of [
    () => dlg(page).getByRole("button", { name: "Keep booking" }).click(),
    () => page.keyboard.press("Escape"),
    () => page.mouse.click(100, 100),
  ]) {
    await page.getByRole("button", { name: "Cancel booking" }).click();
    await expect(dlg(page)).toContainText("BK-2026-0142 · Wedding · Sari & Dimas");
    await expect(dlg(page)).toContainText("The 2 invoices (Rp 5.000.000 paid) stay on record — refunds are handled outside the app.");
    await expect(dlg(page).getByRole("button", { name: "Keep booking" })).toBeFocused();
    await keep();
    await expect(dlg(page)).toHaveCount(0);
  }
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Partially paid");
  await expect(page).toHaveURL(/\/edit/);
});

test("lane H · H1 → H4: detail → Edit → Cancel booking with a reason → Canceled, read-only, toast (2.15, 2.16, 4.11)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  await sheet(page).getByRole("button", { name: "Edit booking" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByRole("button", { name: "Cancel booking" }).click();
  await dlg(page).getByLabel("Reason (optional)").fill("Client postponed the wedding to next year");
  await expect(dlg(page)).toContainText("41/255");
  await dlg(page).getByRole("button", { name: "Cancel booking" }).click();
  await expect(page).toHaveURL(/\/bookings\?booking=/);
  await expect(page.getByRole("status").filter({ hasText: "Booking canceled · BK-2026-0142" })).toBeVisible();
  const s = sheet(page);
  await expect(s).toContainText("Canceled");
  await expect(s.getByRole("status").or(s.getByRole("alert")).filter({ hasText: "Canceled on 10 Nov 2026 by" })).toContainText(
    "Reason: Client postponed the wedding to next year. This booking is read-only — it can’t be edited and no new invoices can be created.",
  );
  await expect(s.getByRole("button", { name: "Edit booking" })).toHaveCount(0);
  await expect(s.getByRole("region", { name: "Financial summary" })).toContainText(/Not collected\s*Rp 7\.500\.000/);
  await expect(s.getByRole("region", { name: "Financial summary" })).toContainText("40% paid before cancellation · no balance due");
  await expect(s.getByRole("button", { name: "Download latest PDF" })).toBeVisible(); // PDFs still work (F15)
  await expect(s.getByRole("article")).toHaveCount(2);
  // ↗ opens the read-only full page (Figma H5); ‹ goes back to Bookings with the sheet closed.
  await s.getByRole("button", { name: "Open full page" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/?]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  await expect(page.getByRole("alert").filter({ hasText: "Canceled on 10 Nov 2026 by" })).toBeVisible();
  await page.getByRole("button", { name: "Back to bookings" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(sheet(page)).toHaveCount(0);
});

test("canceled full page (H5): every field read-only, no edit actions; /edit and Esc (US-12)", async ({ page }) => {
  await page.goto("/bookings/BK-2026-0142/edit?fixture=screen-35");
  await expect(page).toHaveURL(/\/bookings\/[^/?]+$/); // /edit never opens for Canceled
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  const main = page.getByRole("main");
  for (const label of ["Client name", "Phone number", "Booking name", "Created"]) await expect(main.getByLabel(label, { exact: true })).toBeDisabled();
  await expect(main.getByLabel("Terms & Conditions")).toBeDisabled();
  await expect(main.getByLabel("Client name", { exact: true })).toHaveValue("Sari Wulandari");
  await expect(main.getByRole("row")).toHaveCount(4); // header + 3 items
  await expect(main.getByRole("button")).toHaveCount(0); // no trash, Add item, pickers or Cancel booking
  await expect(main.getByRole("link", { name: "Manage library" })).toHaveCount(0);
  for (const name of ["Save changes", "Cancel", "Create invoice", "Edit booking"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
  const totals = page.getByRole("region", { name: "Totals" });
  await expect(totals).toContainText(/Total booking\s*Rp 12\.500\.000/);
  await expect(totals).toContainText(/Not collected\s*Rp 7\.500\.000/);
  await expect(totals).toContainText("40% paid before cancellation · no balance due.");
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Download latest PDF" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/bookings$/);
  await expect(sheet(page)).toHaveCount(0);
});

test("canceled: hidden on Calendar + rail unless the Status filter has Canceled; in the Table; KPIs exclude it (US-12, 1.33)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-35");
  const day12 = page.getByRole("gridcell", { name: /^Thursday, 12 Nov 2026/ });
  await expect(day12.getByRole("button", { name: /Wedding · Sari & Dimas/ })).toHaveCount(0);
  await expect(page.getByRole("complementary").getByRole("button", { name: /Wedding · Sari & Dimas/ })).toHaveCount(0);
  await expect(page.getByText("Rp 41.250.000")).toBeVisible(); // Outstanding: 48.750.000 − 7.500.000
  await page.goto("/bookings?status=canceled");
  await expect(day12.getByRole("button", { name: /Wedding · Sari & Dimas, Canceled/ })).toBeVisible();
  await page.goto("/bookings?tab=table");
  await expect(page.getByRole("row").filter({ hasText: "Wedding · Sari & Dimas" })).toContainText("Canceled");
});

test("no Cancel booking section: Paid booking, unsaved new booking (2.15)", async ({ page }) => {
  await page.goto("/bookings/BK-2026-0131/edit");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Corporate Gathering · PT Arta");
  await expect(page.getByRole("heading", { name: "Cancel booking" })).toHaveCount(0);
  await page.goto("/bookings/new");
  await expect(page.getByRole("heading", { name: "New booking" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cancel booking" })).toHaveCount(0);
});

test("reason over 255 blocks; a failed cancel keeps the modal and the reason (2.16)", async ({ page }) => {
  await page.goto("/bookings/BK-2026-0142/edit?fixture=seed&fail=cancelBooking");
  await page.getByRole("button", { name: "Cancel booking" }).click();
  const reason = dlg(page).getByLabel("Reason (optional)");
  await reason.dispatchEvent("paste", {});
  await reason.fill("x".repeat(260)); // paste-like insert after the paste flag (as F10)
  await expect(dlg(page).getByText("Max 255 characters")).toBeVisible();
  await expect(dlg(page).getByRole("button", { name: "Cancel booking" })).toBeDisabled();
  await reason.fill("Client moved abroad");
  await dlg(page).getByRole("button", { name: "Cancel booking" }).click();
  await expect(dlg(page).getByRole("alert")).toContainText("Couldn’t cancel the booking");
  await expect(reason).toHaveValue("Client moved abroad");
  await dlg(page).getByRole("button", { name: "Cancel booking" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Booking canceled · BK-2026-0142" })).toBeVisible();
});
