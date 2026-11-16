import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// F10 — New booking: PRD US-1; INTERACTIONS 2.1b, 2.2, 2.4–2.10, 2.12, 2.17; lane A (A1 → A2 → Save as Draft),
// lane G (every exit; pristine = no prompt).

test.beforeEach(async ({ page }) => signIn(page));

const main = (p: Page) => p.getByRole("main");
const guard = (p: Page) => p.getByRole("alertdialog", { name: "Discard this new booking?" });

async function open(page: Page, q = "") {
  await page.goto(`/bookings/new${q}`);
  await expect(page.getByRole("heading", { name: "New booking" })).toBeVisible();
}

test("lane A: dashboard → New booking → fill → Save booking → Draft, edit mode, on the calendar (2.2)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-03&date=2026-11-12");
  await expect(page.getByRole("grid", { name: "Month" }).getByRole("button", { name: /Sari & Dimas/ })).toHaveCount(0);
  await page.getByRole("main").getByRole("button", { name: "New booking", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings\/new$/);
  await fillSari(page);
  await expect(page.getByText("Draft · not saved")).toBeVisible();
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Booking saved as Draft" })).toBeVisible();
  await expect(page).toHaveURL(/\/bookings\/bk_[a-z0-9]+\/edit$/);
  // Edit mode (Figma 05 / 07): booking name as title, ref in the breadcrumb.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText(/BK-2026-\d{4}/);
  await expect(page.getByText("Saved just now")).toBeVisible();
  // Saved: leaving doesn't prompt; the booking shows on 12 Nov as Draft.
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  await page.goto("/bookings?date=2026-11-12");
  await expect(page.getByRole("gridcell", { name: /^Thursday, 12 Nov 2026/ }).getByRole("button", { name: "Wedding · Sari & Dimas, Draft" })).toBeVisible();
  // A refresh of the edit URL loads the saved booking.
});

test("save → close → New booking again opens a blank New booking, not the saved one's editor", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-03");
  const newBooking = page.getByRole("main").getByRole("button", { name: "New booking", exact: true });
  await newBooking.click();
  await fillSari(page);
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/bk_[a-z0-9]+\/edit$/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click(); // close
  await expect(page).toHaveURL(/\/bookings$/);
  await newBooking.click();
  await expect(page).toHaveURL(/\/bookings\/new$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("New booking");
  await expect(page.getByText("Draft · not saved")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save booking" })).toBeVisible();
  await expect(page.getByRole("main").getByLabel("Client name")).toHaveValue("");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("New booking");
});

test("edit URL reloads the saved booking into the form", async ({ page }) => {
  await open(page, "?fixture=screen-03");
  await fillSari(page);
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
  await expect(page.getByText("Draft · saved")).toBeVisible();
  await expect(main(page).getByLabel("Client name")).toHaveValue("Sari Wulandari");
  await expect(main(page).getByLabel("Phone number")).toHaveValue("+62 812-3456-7890");
  await expect(main(page).getByLabel("Item 1 price")).toHaveValue("500.000");
  await expect(page.getByRole("region", { name: "Booking summary" })).toContainText("Rp 12.500.000");
});

test("lane G: pristine leaves without a prompt; a calendar-prefilled date doesn't count (2.1b)", async ({ page }) => {
  await open(page, "?date=2026-11-13");
  await expect(main(page).getByRole("button", { name: "Booking date" })).toContainText("13 Nov 2026");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings$/);
});

test("lane G: every exit asks; Keep editing (button / Esc / scrim) stays; Discard leaves, nothing created (2.1b)", async ({ page }) => {
  await open(page);
  await main(page).getByLabel("Client name").fill("Budi");
  // ‹ back
  await page.getByRole("button", { name: "Back to bookings" }).click();
  await expect(guard(page)).toBeVisible();
  await expect(guard(page).getByRole("button", { name: "Keep editing" })).toBeFocused();
  await guard(page).getByRole("button", { name: "Keep editing" }).click();
  await expect(guard(page)).toHaveCount(0);
  // breadcrumb module link
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Booking" }).click();
  await expect(guard(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(guard(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/bookings\/new$/);
  // app launcher tile
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("dialog", { name: "App launcher" }).getByRole("button", { name: "Package Lib" }).click();
  await expect(guard(page)).toBeVisible();
  await page.mouse.click(10, 700); // scrim
  await expect(guard(page)).toHaveCount(0);
  // Cancel → Discard booking → destination
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("proto:db") ?? "{}").bookings?.length ?? null);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await guard(page).getByRole("button", { name: "Discard booking" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("proto:db") ?? "{}").bookings?.length ?? null);
  expect(after).toBe(before);
});

test("lane G: browser refresh / close uses the native beforeunload prompt while dirty", async ({ page }) => {
  await open(page);
  await main(page).getByLabel("Client name").fill("Budi");
  let asked = false;
  page.on("dialog", async (d) => {
    asked = d.type() === "beforeunload";
    await d.dismiss();
  });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => asked).toBe(true);
});

test("validation: Save with missing fields → inline errors, “n fields need attention”, focus on the first (2.4)", async ({ page }) => {
  await open(page);
  await main(page).getByLabel("Phone number").fill("0812 345");
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page.getByText("4 fields need attention")).toBeVisible(); // name, phone, package, date
  await expect(main(page).getByText("Client name is required")).toBeVisible();
  await expect(main(page).getByText("Enter a valid Indonesian number, e.g. +62 812-3456-7890")).toBeVisible();
  await expect(main(page).getByText("Select a package", { exact: true }).last()).toBeVisible();
  await expect(main(page).getByText("Pick a booking date")).toBeVisible();
  await expect(main(page).getByLabel("Client name")).toBeFocused();
  await main(page).getByLabel("Client name").fill("Sari Wulandari");
  await expect(page.getByText("3 fields need attention")).toBeVisible();
});

test("items: add, live subtotal + summary, Rp mask, qty 1–999, remove without confirm (2.8)", async ({ page }) => {
  await open(page);
  const summary = page.getByRole("region", { name: "Booking summary" });
  await main(page).getByRole("button", { name: "Add item" }).click();
  await expect(main(page).getByLabel("Item 1 name")).toBeFocused();
  await main(page).getByLabel("Item 1 name").fill("Drone");
  await main(page).getByLabel("Item 1 price").fill("1500000x");
  await expect(main(page).getByLabel("Item 1 price")).toHaveValue("1.500.000");
  await main(page).getByLabel("Item 1 quantity").fill("-02");
  await expect(main(page).getByLabel("Item 1 quantity")).toHaveValue("2");
  await expect(page.getByRole("table", { name: "Additional items" })).toContainText("Rp 3.000.000");
  await expect(summary).toContainText("Additional items (1)");
  await expect(summary).toContainText("Rp 3.000.000");
  await main(page).getByLabel("Item 1 quantity").fill("12345");
  await expect(main(page).getByLabel("Item 1 quantity")).toHaveValue("123");
  await main(page).getByRole("button", { name: "Remove item 1" }).click();
  await expect(main(page).getByLabel("Item 1 name")).toHaveCount(0);
  await expect(summary).toContainText("Additional items (0)");
});

test("package: search, pick → card + summary; Manage library opens a new tab (2.5, 2.6)", async ({ page }) => {
  await open(page, "?fixture=screen-13");
  await main(page).getByRole("button", { name: "Package" }).click();
  const dlg = page.getByRole("dialog", { name: "Package" });
  await dlg.getByRole("textbox", { name: "Search package" }).fill("plat");
  await expect(dlg.getByRole("option")).toHaveCount(1);
  await dlg.getByRole("option", { name: /Platinum Package/ }).click();
  await expect(main(page).getByRole("button", { name: "Package", exact: true })).toContainText("Platinum Package");
  await expect(page.getByRole("region", { name: "Booking summary" })).toContainText("Rp 14.000.000");
  await main(page).getByRole("button", { name: "Package", exact: true }).click();
  await expect(dlg.getByRole("option", { name: /Platinum Package/ })).toHaveAttribute("aria-selected", "true");
  await expect(dlg.getByRole("link", { name: "Manage package library (opens in new tab)" })).toHaveAttribute("target", "_blank");
});

test("archived packages hidden + note (39); empty library (40) (2.17)", async ({ page }) => {
  await open(page, "?fixture=screen-39");
  await main(page).getByRole("button", { name: "Package" }).click();
  await expect(page.getByRole("dialog", { name: "Package" }).getByRole("option", { name: /Gold Package/ })).toHaveCount(0);
  await expect(page.getByText("1 archived package isn’t listed (Gold Package). Restore it in Package Library to use it again.")).toBeVisible();
  await open(page, "?fixture=screen-40");
  await main(page).getByRole("button", { name: "Package" }).click();
  await expect(page.getByText("No packages yet")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a package in Package Library (opens in new tab)" })).toHaveAttribute("href", "/packages");
});

test("booking date: picker, past date warning, Today shortcut (2.7)", async ({ page }) => {
  await open(page);
  await main(page).getByRole("button", { name: "Booking date" }).click();
  const dlg = page.getByRole("dialog", { name: "Choose booking date" });
  await expect(dlg.getByRole("gridcell", { name: "10 Nov 2026" })).toHaveAttribute("aria-current", "date");
  await dlg.getByRole("button", { name: "Previous month" }).click();
  await expect(dlg).toContainText("October 2026");
  await dlg.getByRole("gridcell", { name: "20 Oct 2026" }).click();
  await expect(main(page).getByText("This date is in the past")).toBeVisible();
  await main(page).getByRole("button", { name: "Booking date" }).click();
  await dlg.getByRole("button", { name: "Today" }).click();
  await expect(main(page).getByRole("button", { name: "Booking date" })).toContainText("10 Nov 2026");
  await expect(main(page).getByText("This date is in the past")).toHaveCount(0);
});

test("crew: search, instant apply, chips × (2.9)", async ({ page }) => {
  await open(page);
  await main(page).getByRole("button", { name: "Select crew" }).click();
  const dlg = page.getByRole("dialog", { name: "Crew" });
  await dlg.getByRole("textbox", { name: "Search crew by name or role" }).fill("video");
  await dlg.getByRole("option", { name: /Dinda Ayu/ }).getByRole("checkbox").check();
  await expect(main(page).getByText("1 crew assigned")).toBeVisible(); // applied at once, no footer
  await page.keyboard.press("Escape");
  await main(page).getByRole("button", { name: "Remove Dinda Ayu" }).click();
  await expect(main(page).getByText("Who is handling this booking — select one or more")).toBeVisible();
});

test("terms: prefilled default with counter; paste over 255 → error (2.10)", async ({ page }) => {
  await open(page);
  const box = main(page).getByLabel("Terms & Conditions");
  await expect(main(page).getByText("174/255")).toBeVisible();
  await box.fill("");
  await box.dispatchEvent("paste", {});
  await box.fill("x".repeat(270)); // fill = paste-like insert after the paste flag (as F1)
  await expect(main(page).getByText("270/255")).toBeVisible();
  await expect(main(page).getByText("Max 255 characters")).toBeVisible();
});

test("Create invoice: disabled + tooltip until client name and phone are valid (2.12)", async ({ page }) => {
  await open(page);
  const btn = page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Create invoice", exact: true });
  await expect(btn).toBeDisabled();
  await page.getByLabel(/^Create invoice \(unavailable/).focus();
  await expect(page.getByRole("tooltip")).toHaveText("Complete client name and phone first");
  await main(page).getByLabel("Client name").fill("Sari Wulandari");
  await main(page).getByLabel("Phone number").fill("081234567890");
  await expect(btn).toBeEnabled();
});
