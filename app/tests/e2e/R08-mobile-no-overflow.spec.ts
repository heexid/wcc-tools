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
  { name: "crew", url: "/crew", ready: (p) => p.getByText("Raka Pratama").first().waitFor() },
  { name: "workspace settings", url: "/workspace-settings", ready: (p) => p.getByRole("button", { name: "Edit" }).waitFor() },
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

    test("crew schedule sheet: header and footer text stay inside the 16 margins", async ({ page }) => {
      await page.goto("/bookings?tab=table&booking=BK-2026-0142");
      await page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: /Raka Pratama/ }).first().click();
      const sheet = page.getByRole("dialog", { name: "Crew schedule" });
      await expect(sheet.getByRole("button", { name: "See in calendar" })).toBeVisible();
      const out = await sheet.evaluate((el, limit) => {
        const bad: string[] = [];
        for (const n of el.querySelectorAll("span, p, h2, h3, button")) {
          const r = n.getBoundingClientRect();
          if (r.width > 0 && r.right > limit + 0.5) bad.push(`${(n.textContent ?? "").slice(0, 30)} → ${Math.round(r.right)}`);
        }
        return bad;
      }, w - 16);
      expect(out, out.join("\n")).toEqual([]);
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

// ME4 · when the schedule is longer than the sheet (short phone, busy crew), the person header and the See in calendar
// footer stay pinned and only the list scrolls — they must never scroll out of the sheet.
test("crew schedule sheet on a short screen: header + footer pinned, list scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await signIn(page);
  await page.goto("/bookings?tab=table&booking=BK-2026-0142");
  await page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: /Raka Pratama/ }).first().click();
  const sheet = page.getByRole("dialog", { name: "Crew schedule" });
  const footer = sheet.getByRole("button", { name: "See in calendar" });
  await expect(footer).toBeVisible();
  await page.waitForTimeout(600); // sheet settled
  const inView = async (l: import("@playwright/test").Locator) => {
    const b = (await l.boundingBox())!;
    return b.y >= 0 && b.y + b.height <= 667;
  };
  expect(await inView(footer), "See in calendar is below the screen").toBe(true);
  expect(await inView(sheet.getByText("Raka Pratama", { exact: true }).first()), "person header scrolled away").toBe(true);
  const list = sheet.locator("[data-popover-scroll]");
  expect(await list.evaluate((e) => e.scrollHeight > e.clientHeight), "the list should be the scroller").toBe(true);
  // The list clips its items: none may paint over the footer or the header (old bug: items spilled under them).
  expect(await list.evaluate((e) => getComputedStyle(e).overflowY), "list must clip / scroll").not.toBe("visible");
  const fTop = (await footer.boundingBox())!.y;
  const listBox = (await list.boundingBox())!;
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(fTop + 0.5);
  await list.evaluate((e) => e.scrollTo(0, e.scrollHeight));
  expect(await inView(sheet.getByText("Raka Pratama", { exact: true }).first())).toBe(true);
  expect(await inView(footer)).toBe(true);
});
