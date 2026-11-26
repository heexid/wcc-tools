import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// Event details (2026-11-21, Figma Bookings 03): the first section is "Client & schedule" — booking date, Event start
// (optional: type a time or pick any hour/minute), Created, then Location and Notes text areas. The old Schedule section is gone.

test.beforeEach(async ({ page }) => signIn(page));

test("new booking: event start, location and notes are saved and come back in edit mode", async ({ page }) => {
  await page.goto("/bookings/new");
  const main = page.getByRole("main");
  const client = main.getByRole("region", { name: "Client & schedule" });
  await expect(client.getByRole("button", { name: "Booking date" })).toBeVisible();
  await expect(main.getByRole("region", { name: "Schedule", exact: true })).toHaveCount(0);

  await fillSari(page, { crew: false });
  await client.getByRole("button", { name: "Choose event start time" }).click();
  await page.getByRole("listbox", { name: "Hour" }).getByRole("option", { name: "08" }).click();
  await page.getByRole("listbox", { name: "Minute" }).getByRole("option", { name: "00" }).click();
  await expect(client.getByRole("textbox", { name: "Event start" })).toHaveValue("08:00");
  await client.getByLabel("Location").fill("Hotel Mulia Senayan, Jl. Asia Afrika No. 8, Jakarta");
  await client.getByLabel("Notes").fill("Akad 08:00, reception 11:00.");

  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/]+\/edit$/);
  await page.reload();
  const reloaded = page.getByRole("main").getByRole("region", { name: "Client & schedule" });
  await expect(reloaded.getByRole("textbox", { name: "Event start" })).toHaveValue("08:00");
  await expect(reloaded.getByLabel("Location")).toHaveValue("Hotel Mulia Senayan, Jl. Asia Afrika No. 8, Jakarta");
  await expect(reloaded.getByLabel("Notes")).toHaveValue("Akad 08:00, reception 11:00.");
});

test("event start is optional and can be cleared", async ({ page }) => {
  await page.goto("/bookings/new");
  const client = page.getByRole("main").getByRole("region", { name: "Client & schedule" });
  const field = client.getByRole("textbox", { name: "Event start" });
  await expect(field).toHaveValue("");
  await field.fill("7.45pm");
  await field.blur();
  await expect(field).toHaveValue("19:45");
  await client.getByRole("button", { name: "Choose event start time" }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(field).toHaveValue("");
});

test("event start: any minute can be picked, typed times are tidied, unreadable text errors on save", async ({ page }) => {
  await page.goto("/bookings/new");
  const client = page.getByRole("main").getByRole("region", { name: "Client & schedule" });
  const field = client.getByRole("textbox", { name: "Event start" });
  await client.getByRole("button", { name: "Choose event start time" }).click();
  await page.getByRole("listbox", { name: "Hour" }).getByRole("option", { name: "14" }).click();
  await page.getByRole("listbox", { name: "Minute" }).getByRole("option", { name: "17" }).click();
  await expect(field).toHaveValue("14:17");
  await field.fill("930");
  await field.press("Tab");
  await expect(field).toHaveValue("09:30");
  await field.fill("25:00");
  await field.blur();
  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(client.getByText("Enter a time like 19:30")).toBeVisible();
});

test("detail drawer: Booking information follows the form order; empty event rows are left out", async ({ page }) => {
  await page.goto("/bookings?booking=bk_0142");
  const info = page.getByRole("dialog", { name: "Booking detail" }).getByRole("region", { name: "Booking information" });
  await expect(info).toContainText("Thu, 12 Nov 2026 · 08:00");
  await expect(info).toContainText("Hotel Mulia Senayan, Jl. Asia Afrika No. 8, Jakarta");
  await expect(info).toContainText("Akad 08:00, reception 11:00. Bride prep at room 1204.");
  const text = (await info.innerText()).replace(/\s+/g, " ");
  const order = ["Client", "Phone", "Booking date", "Location", "Notes", "Package", "Crew", "Payment", "Created"].map((k) => text.indexOf(k));
  expect(order).toEqual([...order].sort((a, b) => a - b));

  // A booking without event details (seed: every booking except BK-2026-0142).
  await page.goto("/bookings?booking=bk_0144");
  const other = page.getByRole("dialog", { name: "Booking detail" }).getByRole("region", { name: "Booking information" });
  await expect(other).toContainText("Booking date");
  await expect(other).not.toContainText("Location");
  await expect(other).not.toContainText("Notes");
});
