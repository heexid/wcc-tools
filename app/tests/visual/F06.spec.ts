import { expect, test } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F6 — Bookings dashboard frame vs Figma 01 (regions — the calendar body is F7) and 36 (full frame).
// Masks (reasons):
//  • KPI "Bookings this month": real data by decision (2026-11-11) — 18 / −2, Figma shows 24 / +4.
//  • 4th Upcoming item: Figma shows Maternity · Dewi although Prewedding · Nadia & Fajar comes first on
//    14 Nov in every other Figma view (17 / 19 / 20) — the rail follows that order.
//  • 36 empty-state button: Figma's + icon is text/primary on a primary button (override slip) — DS on-accent.

test.beforeEach(async ({ page }) => signIn(page));

const KPI1: Rect = { x: 54, y: 236, w: 180, h: 66 };
const ABOVE_CALENDAR: Rect = { x: 0, y: 0, w: 1440, h: 476 };
const RAIL_BELOW: Rect = { x: 1055, y: 476, w: 385, h: 520 };

test("01 · dashboard frame (above the calendar + rail)", async ({ page }) => {
  await page.goto("/bookings");
  await expect(page.getByRole("heading", { name: "Bookings", exact: true })).toBeVisible();
  const masks = [KPI1, specRect("F06-bookings-01", /Upcoming item FRAME 303x98 @1080,473/)];
  await expectMatchesFigma(page, "bookings-01", undefined, { clip: ABOVE_CALENDAR, masks, label: "top" });
  await expectMatchesFigma(page, "bookings-01", undefined, { clip: RAIL_BELOW, masks, label: "rail" });
});

test("36 · first use (Table view)", async ({ page }) => {
  await page.goto("/bookings?tab=table&fixture=screen-36");
  await expect(page.getByText("No bookings yet")).toBeVisible();
  const icon = specRect("F06-bookings-36", /Icon\/plus INSTANCE .*iconColor=text\/primary/);
  await expectMatchesFigma(page, "bookings-36", undefined, { masks: [icon] });
});

test("KPI values from data (decision: real data)", async ({ page }) => {
  await page.goto("/bookings");
  const cards = page.locator("section:has(h3)");
  await expect(cards.nth(0)).toContainText("18");
  await expect(cards.nth(0)).toContainText("−2");
  await expect(cards.nth(1)).toContainText("Rp 48.750.000");
  await expect(cards.nth(1)).toContainText("14 bookings");
  await expect(cards.nth(2)).toContainText("Rp 61.200.000");
  await expect(cards.nth(2)).toContainText("12,4%");
});

test("ⓘ tooltip uses the Figma Tooltips popover (62:115173) and the INTERACTIONS 1.23 copy", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: "About Outstanding balance" }).focus();
  const tip = page.getByRole("tooltip");
  await expect(tip).toHaveText("Remaining across Partially paid bookings");
  await expect(tip).toBeInViewport();
  const s = await tip.evaluate((e) => {
    const probe = (v: string) => {
      const p = document.createElement("div");
      p.style.color = v;
      document.body.appendChild(p);
      const c = getComputedStyle(p).color;
      p.remove();
      return c;
    };
    const shell = getComputedStyle(e);
    const panel = getComputedStyle(e.firstElementChild as Element);
    return {
      shell: { bg: shell.backgroundColor, radius: shell.borderRadius, pad: shell.paddingTop, border: `${shell.borderTopWidth} ${shell.borderTopColor}`, shadow: shell.boxShadow },
      panel: { bg: panel.backgroundColor, radius: panel.borderRadius, pad: panel.paddingTop, border: `${panel.borderTopWidth} ${panel.borderTopColor}`, color: panel.color, font: `${panel.fontSize}/${panel.lineHeight}` },
      want: { header: probe("var(--color-surface-header)"), surface: probe("var(--color-surface-default)"), border: probe("var(--color-border-default)"), text: probe("var(--color-text-primary)") },
    };
  });
  expect(s.shell).toMatchObject({ bg: s.want.header, radius: "12px", pad: "6px", border: `1px ${s.want.border}` });
  expect(s.shell.shadow).toContain("0px 4px 12px 0px");
  expect(s.panel).toEqual({ bg: s.want.surface, radius: "8px", pad: "8px", border: `1px ${s.want.border}`, color: s.want.text, font: "14px/22px" });
});
