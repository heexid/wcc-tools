import { expect, test } from "@playwright/test";

// F2 — the mock data layer in the browser: seed, fixtures via ?fixture=, persistence, reset.
test("seed loads with Figma KPIs; writes persist across reloads; /dev/reset clears", async ({ page }) => {
  await page.goto("/dev/reset");
  await page.getByRole("button", { name: "Reset prototype data" }).click();
  await page.goto("/dev/data");
  await expect(page.getByTestId("fixture")).toHaveText("seed");
  await expect(page.getByTestId("bookings")).toHaveText("40");
  await expect(page.getByTestId("outstanding")).toHaveText("Rp 48.750.000");
  await expect(page.getByTestId("collected")).toHaveText("Rp 61.200.000");
  await page.getByRole("button", { name: "Add test booking" }).click();
  await expect(page.getByTestId("bookings")).toHaveText("41");
  await page.reload();
  await expect(page.getByTestId("bookings")).toHaveText("41");
  await page.goto("/dev/reset");
  await page.getByRole("button", { name: "Reset prototype data" }).click();
  await expect(page.getByRole("status")).toContainText("keys cleared");
  await page.goto("/dev/data");
  await expect(page.getByTestId("bookings")).toHaveText("40");
});

test("?fixture= switches to a Figma screen's data", async ({ page }) => {
  await page.goto("/dev/data?fixture=screen-35");
  await expect(page.getByTestId("fixture")).toHaveText("screen-35");
  await expect(page.getByTestId("sari")).toHaveText("Sari Wulandari · canceled");
  await page.goto("/dev/data?fixture=screen-36");
  await expect(page.getByTestId("bookings")).toHaveText("0");
  await page.goto("/dev/data?fixture=screen-31");
  await expect(page.getByTestId("bookings")).toHaveText("41");
});
