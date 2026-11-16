import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F12 — Booking detail panel + Crew schedule: PRD US-9; INTERACTIONS 1.13, 1.18, 1.19, 1.29, 4.1–4.10;
// lanes B1 → B2, C3, D2, E (S1 → S2 → S3).

test.beforeEach(async ({ page }) => signIn(page));

const sheet = (p: Page) => p.getByRole("dialog", { name: "Booking detail" });
const crewPop = (p: Page, name = "Raka Pratama") => p.getByRole("dialog", { name: `${name}’s schedule` });

test("B1 → B2 · table row opens the panel; × / Esc / scrim close it and keep filters + scroll (1.19, 4.4)", async ({ page }) => {
  await page.goto("/bookings?tab=table&status=partially_paid");
  await page.getByRole("button", { name: /Wedding · Sari & Dimas/ }).first().click();
  await expect(sheet(page)).toContainText("BK-2026-0142");
  await expect(page).toHaveURL(/status=partially_paid/);
  await expect(page).toHaveURL(/booking=/);
  for (const close of [
    () => sheet(page).getByRole("button", { name: "Close" }).click(),
    () => page.keyboard.press("Escape"),
    () => page.mouse.click(200, 300),
  ]) {
    await expect(sheet(page)).toBeVisible();
    await close();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/booking=/);
    await expect(page).toHaveURL(/status=partially_paid/);
    await page.getByRole("button", { name: /Wedding · Sari & Dimas/ }).first().click();
  }
});

test("C3 / D2 · calendar chip and rail item open the panel (1.13, 1.18)", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("grid", { name: "Month" }).getByRole("button", { name: /Wedding · Sari & Dimas/ }).click();
  await expect(sheet(page)).toContainText("Wedding · Sari & Dimas");
  await page.keyboard.press("Escape");
  await page.getByRole("complementary").getByRole("button", { name: /Graduation · Aulia/ }).first().click();
  await expect(sheet(page)).toContainText("BK-2026-0139");
  await expect(sheet(page)).toContainText("Tue, 10 Nov 2026 · today");
  await expect(sheet(page)).toContainText("50% paid · balance due today (10 Nov 2026)");
});

test("panel content: summary, wa.me phone, items, invoices newest first, actions (US-9, 4.1, 4.5, 4.6)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  const s = sheet(page);
  await expect(s.getByRole("region", { name: "Financial summary" })).toContainText("40% paid · balance due before 12 Nov 2026");
  await expect(s.getByRole("progressbar", { name: "Paid" })).toHaveAttribute("aria-valuenow", "40");
  const phone = s.getByRole("link", { name: /\+62 812-3456-7890/ });
  await expect(phone).toHaveAttribute("href", "https://wa.me/6281234567890");
  await expect(phone).toHaveAttribute("target", "_blank");
  await expect(s).toContainText("2 × Rp 500.000");
  const cards = s.getByRole("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText("INV-2026-0201");
  await expect(cards.nth(1)).toContainText("INV-2026-0187");
  await expect(s.getByRole("button", { name: "Download latest PDF" })).toBeVisible();
  await s.getByRole("button", { name: "Edit booking" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding · Sari & Dimas");
});

test("Draft: no Download latest PDF; empty state hint without a button (4.7)", async ({ page }) => {
  await page.goto("/bookings?fixture=screen-21&booking=BK-2026-0142");
  const s = sheet(page);
  await expect(s).toContainText("Draft · no invoice yet");
  await expect(s.getByRole("button", { name: "Download latest PDF" })).toHaveCount(0);
  await expect(s).toContainText("No invoices yet");
  await expect(s).toContainText("Open Edit booking to create the first invoice");
  await expect(s.getByRole("button", { name: /Create invoice/ })).toHaveCount(0);
});

test("open full page (↗) → the Edit booking screen; a direct /bookings/[id] link lands there too (4.3)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  await sheet(page).getByRole("button", { name: "Open full page" }).click();
  await expect(page).toHaveURL(/\/bookings\/[^/?]+\/edit$/);
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("BK-2026-0142");
  await expect(page.getByRole("heading", { level: 1, name: "Wedding · Sari & Dimas" })).toBeVisible();
  const editUrl = page.url();
  await page.goto(editUrl.replace(/\/edit$/, ""));
  await expect(page).toHaveURL(editUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Wedding · Sari & Dimas" })).toBeVisible();
});

test("lane E · crew chip → schedule; This booking isn't clickable; another item switches the panel (4.8, 4.9)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  await sheet(page).getByRole("button", { name: "Raka Pratama — show schedule" }).click();
  const pop = crewPop(page);
  await expect(pop).toContainText("Lead photographer · 5 bookings in Nov");
  await expect(pop.getByRole("button")).toHaveCount(5); // 4 other bookings + See in calendar
  await expect(pop.locator("[aria-current]")).toContainText("This booking");
  await expect(pop).toContainText("Silver Package · Aulia Rahma · Today");
  await pop.getByRole("button", { name: /Prewedding · Nadia & Fajar/ }).click();
  await expect(pop).toHaveCount(0);
  await expect(sheet(page)).toContainText("Prewedding · Nadia & Fajar");
  await expect(page).toHaveURL(/booking=/);
});

test("crew popover: Esc closes only the popover; outside click closes it; See in calendar filters by crew (4.10)", async ({ page }) => {
  await page.goto("/bookings?booking=BK-2026-0142");
  const chip = sheet(page).getByRole("button", { name: "Dinda Ayu — show schedule" });
  await chip.click();
  await expect(crewPop(page, "Dinda Ayu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(crewPop(page, "Dinda Ayu")).toHaveCount(0);
  await expect(sheet(page)).toBeVisible();
  await expect(chip).toBeFocused();
  await chip.click();
  await sheet(page).getByRole("heading", { name: "Booking information" }).click();
  await expect(crewPop(page, "Dinda Ayu")).toHaveCount(0);
  await chip.click();
  await crewPop(page, "Dinda Ayu").getByRole("button", { name: "See in calendar" }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page).toHaveURL(/\/bookings\?crew=crew_da$/);
  await expect(page.getByRole("region", { name: "Calendar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Remove filter.*Dinda Ayu|Dinda Ayu/ }).first()).toBeVisible();
});

test("F3 → lane E · Day / Week crew avatars open the popover with the source booking marked (1.29)", async ({ page }) => {
  await page.goto("/bookings?view=day&date=2026-11-14");
  await page.getByRole("button", { name: "Raka Pratama — show schedule" }).click();
  const pop = crewPop(page);
  await expect(pop.locator("[aria-current]")).toContainText("Prewedding · Nadia & Fajar");
  await pop.getByRole("button", { name: /Wedding · Laras & Bima/ }).click();
  await expect(sheet(page)).toContainText("Wedding · Laras & Bima");
  await page.keyboard.press("Escape");
  await page.goto("/bookings?view=week&date=2026-11-12");
  await page.getByRole("button", { name: "Nadia Putri — show schedule" }).first().click();
  await expect(crewPop(page, "Nadia Putri")).toContainText("Event organizer");
});
