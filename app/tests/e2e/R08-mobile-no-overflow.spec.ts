import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// R08 — nothing may stick out sideways on a phone. Every mobile screen, at the common narrow widths, must be exactly as
// wide as the viewport (no horizontal scroll), and the line-item cards must keep every cell inside the card.
// Regression: Edit booking with saved items was 468 px wide — the item grid's 1fr column grew to the inputs' intrinsic
// width, and two summary captions were single-line.

const WIDTHS = [320, 360, 375, 390];
const SCREENS: { name: string; url: string; ready: (p: Page) => Promise<unknown> }[] = [
  { name: "login", url: "/login", ready: (p) => p.getByRole("button", { name: "Login" }).waitFor() },
  { name: "bookings list", url: "/bookings?tab=table", ready: (p) => p.getByText("BK-2026-0139").first().waitFor() },
  { name: "bookings agenda", url: "/bookings", ready: (p) => p.getByText(/bookings? this month/).waitFor() },
  { name: "new booking", url: "/bookings/new", ready: (p) => p.getByLabel("Client name", { exact: true }).waitFor() },
  { name: "edit booking (saved items)", url: "/bookings/BK-2026-0142/edit", ready: (p) => p.getByLabel("Item 1 name").waitFor() },
  { name: "booking detail", url: "/bookings?tab=table&booking=BK-2026-0142", ready: (p) => p.getByRole("button", { name: "Edit booking" }).waitFor() },
  { name: "account settings", url: "/account", ready: (p) => p.getByRole("button", { name: "Edit name" }).waitFor() },
  { name: "package library", url: "/packages", ready: (p) => p.getByRole("button", { name: "New package" }).waitFor() },
];

for (const w of WIDTHS)
  test.describe(`${w} px`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await signIn(page);
    });

    for (const s of SCREENS)
      test(`${s.name}: no horizontal overflow`, async ({ page }) => {
        await page.goto(s.url);
        await s.ready(page);
        const wide = await page.evaluate(() => {
          const sheet = document.querySelector<HTMLElement>("[role=dialog]");
          return Math.max(document.documentElement.scrollWidth, sheet?.scrollWidth ?? 0);
        });
        expect(wide, `${s.name} is wider than the ${w} px screen`).toBe(w);
      });

    test("line-item cards keep every cell inside the card", async ({ page }) => {
      await page.goto("/bookings/BK-2026-0142/edit");
      await page.getByLabel("Item 1 name").waitFor();
      const rows = page.getByRole("table", { name: "Additional items" }).getByRole("row");
      const n = await rows.count();
      for (let i = 0; i < n; i++) {
        const row = rows.nth(i);
        if (!(await row.isVisible())) continue; // the desktop header row is hidden on mobile
        const box = (await row.boundingBox())!;
        for (const cell of await row.getByRole("cell").all()) {
          const c = (await cell.boundingBox())!;
          expect(c.x).toBeGreaterThanOrEqual(box.x);
          expect(c.x + c.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
        }
      }
      // Delete sits at the card's right edge, beside the item name (row 1); price · qty · subtotal on row 2.
      const remove = (await page.getByRole("button", { name: "Remove item 1" }).boundingBox())!;
      const name = (await page.getByLabel("Item 1 name").locator("..").boundingBox())!;
      expect(Math.abs(remove.y + remove.height / 2 - (name.y + name.height / 2))).toBeLessThan(1);
    });
  });
