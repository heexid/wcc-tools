import { expect, type Page } from "@playwright/test";

/** Fills the New booking form as Figma 03 shows it (Sari & Dimas, Gold, 3 items, 12 Nov, 3 crew). */
export async function fillSari(page: Page, opts: { crew?: boolean; date?: boolean; pkg?: boolean } = {}) {
  const main = page.getByRole("main");
  await main.getByLabel("Client name").fill("Sari Wulandari");
  await main.getByLabel("Phone number").fill("081234567890");
  await main.getByLabel("Phone number").blur();
  await main.getByLabel("Booking name").fill("Wedding · Sari & Dimas");
  if (opts.pkg !== false) {
    await main.getByRole("button", { name: "Package" }).click();
    await page.getByRole("option", { name: /Gold Package/ }).click();
  }
  const items: [string, string, string][] = [
    ["Extra hour", "500000", "2"],
    ["Printed album 20×30", "750000", "1"],
    ["Guest photobooth", "750000", "1"],
  ];
  for (const [i, [name, price, qty]] of items.entries()) {
    await main.getByRole("button", { name: "Add item" }).click();
    await main.getByLabel(`Item ${i + 1} name`).fill(name);
    await main.getByLabel(`Item ${i + 1} price`).fill(price);
    await main.getByLabel(`Item ${i + 1} quantity`).fill(qty);
  }
  if (opts.date !== false) {
    await main.getByRole("button", { name: "Booking date" }).click();
    await page.getByRole("dialog", { name: "Choose booking date" }).getByRole("gridcell", { name: "12 Nov 2026" }).click();
  }
  if (opts.crew !== false) {
    await main.getByRole("button", { name: /Select crew|Change crew/ }).click();
    const dlg = page.getByRole("dialog", { name: "Crew" });
    for (const n of ["Raka Pratama", "Dinda Ayu", "Nadia Putri"]) await dlg.getByRole("option", { name: new RegExp(n) }).getByRole("checkbox").check();
    await page.keyboard.press("Escape");
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
}
