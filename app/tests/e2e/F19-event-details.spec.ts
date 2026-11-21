import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/session";
import { fillSari } from "../helpers/bookingForm";

// Event details (2026-11-21, Figma Bookings 03): the first section is "Client & schedule" — booking date, Event start
// (optional time select), Created, then Location and Notes text areas. The old Schedule section is gone.

test.beforeEach(async ({ page }) => signIn(page));

test("new booking: event start, location and notes are saved and come back in edit mode", async ({ page }) => {
  await page.goto("/bookings/new");
  const main = page.getByRole("main");
  const client = main.getByRole("region", { name: "Client & schedule" });
  await expect(client.getByRole("button", { name: "Booking date" })).toBeVisible();
  await expect(main.getByRole("region", { name: "Schedule", exact: true })).toHaveCount(0);

  await fillSari(page, { crew: false });
  await client.getByRole("button", { name: "Event start" }).click();
  await page.getByRole("listbox", { name: "Start times" }).getByRole("option", { name: "08:00" }).click();
  await expect(client.getByRole("button", { name: "Event start" })).toHaveText("08:00");
  await client.getByLabel("Location").fill("Hotel Mulia Senayan, Jl. Asia Afrika No. 8, Jakarta");
  await client.getByLabel("Notes").fill("Akad 08:00, reception 11:00.");

  await page.getByRole("button", { name: "Save booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/]+\/edit$/);
  await page.reload();
  const reloaded = page.getByRole("main").getByRole("region", { name: "Client & schedule" });
  await expect(reloaded.getByRole("button", { name: "Event start" })).toHaveText("08:00");
  await expect(reloaded.getByLabel("Location")).toHaveValue("Hotel Mulia Senayan, Jl. Asia Afrika No. 8, Jakarta");
  await expect(reloaded.getByLabel("Notes")).toHaveValue("Akad 08:00, reception 11:00.");
});

test("event start is optional and can be cleared", async ({ page }) => {
  await page.goto("/bookings/new");
  const client = page.getByRole("main").getByRole("region", { name: "Client & schedule" });
  await expect(client.getByRole("button", { name: "Event start" })).toHaveText("Select time");
  await client.getByRole("button", { name: "Event start" }).click();
  await page.getByRole("option", { name: "19:30" }).click();
  await client.getByRole("button", { name: "Event start" }).click();
  await page.getByRole("option", { name: "No start time" }).click();
  await expect(client.getByRole("button", { name: "Event start" })).toHaveText("Select time");
});
