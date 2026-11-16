import { expect, type Page } from "@playwright/test";

/** Opens Sari & Dimas (BK-2026-0142) in Edit booking. */
export async function openEdit(page: Page, fixture = "screen-07") {
  await page.goto(`/bookings/BK-2026-0142/edit?fixture=${fixture}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
}

async function pickPackage(page: Page, name: RegExp) {
  await page.getByRole("main").getByRole("button", { name: "Package" }).click();
  await page.getByRole("option", { name }).click();
}

async function moveDate(page: Page, label: string) {
  await page.getByRole("main").getByRole("button", { name: "Booking date" }).click();
  await page.getByRole("dialog", { name: "Choose booking date" }).getByRole("gridcell", { name: label }).click();
}

/** Figma 07: Platinum, Guest photobooth out, Drone footage + Same-day edit video in, 21 Nov (Rp 12.5 M → 18.75 M). */
export async function editAsFigma07(page: Page) {
  const main = page.getByRole("main");
  await pickPackage(page, /Platinum Package/);
  await main.getByRole("button", { name: "Remove item 3" }).click();
  for (const [i, name, price] of [
    [3, "Drone footage", "1500000"],
    [4, "Same-day edit video", "1500000"],
  ] as const) {
    await main.getByRole("button", { name: "Add item" }).click();
    await main.getByLabel(`Item ${i} name`).fill(name);
    await main.getByLabel(`Item ${i} price`).fill(price);
  }
  await moveDate(page, "21 Nov 2026");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
}

/** Figma 08: Silver + Extra hour only, 21 Nov → Rp 4.000.000 < Rp 5.000.000 paid. */
export async function editAsFigma08(page: Page) {
  const main = page.getByRole("main");
  await pickPackage(page, /Silver Package/);
  await main.getByRole("button", { name: "Remove item 3" }).click();
  await main.getByRole("button", { name: "Remove item 2" }).click();
  await moveDate(page, "21 Nov 2026");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("body").click({ position: { x: 5, y: 5 } });
}
