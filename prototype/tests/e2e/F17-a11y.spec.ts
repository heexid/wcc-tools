import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F17 — a11y sweep (WCAG 2.2 AA via axe-core): every screen, admin and viewer.
const AXE = require.resolve("axe-core/axe.min.js");

async function audit(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await (window as any).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return r.violations.map((v: any) => `${v.id}[${v.impact}]×${v.nodes.length} e.g. ${v.nodes[0].target.join(" ").slice(0, 90)}`);
  });
}

const SCREENS: [string, string][] = [
  ["Bookings · calendar", "/bookings"],
  ["Bookings · table", "/bookings?tab=table"],
  ["Bookings · detail sheet", "/bookings?booking=BK-2026-0142"],
  ["New booking", "/bookings/new"],
  ["Edit booking", "/bookings/BK-2026-0142/edit"],
  ["Package library", "/packages"],
  ["Account", "/account"],
];

for (const viewer of [false, true]) {
  for (const [name, url] of SCREENS) {
    test(`a11y · ${viewer ? "viewer" : "admin"} · ${name}`, async ({ page }) => {
      await signIn(page);
      if (viewer) {
        await page.goto("/dev/role");
        await page.getByRole("button", { name: "Viewer" }).click();
      }
      await page.goto(url);
      await page.waitForTimeout(1200); // entrance cascade settles
      const v = await audit(page);
      expect(v, v.join(" | ")).toEqual([]);
    });
  }
}

test("a11y · Login", async ({ page }) => {
  await page.goto("/login");
  await page.waitForTimeout(1200);
  const v = await audit(page);
  expect(v, v.join(" | ")).toEqual([]);
});
