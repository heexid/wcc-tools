import { expect, test } from "@playwright/test";
import { expectMatchesFigma, specRect, type Rect } from "../helpers/visual";
import { signIn } from "../helpers/session";

// F4 — app shell vs Figma Launchpad L1 / L2 / L3 and Profile AC1. The page bodies under the shell belong
// to F5–F7, so G3 compares the shell regions: the 1440×78 header, the workspace's top corners, and the
// open popovers (App launcher, Account menu) at their exact Figma bounds.


const HEADER: Rect = { x: 0, y: 0, w: 1440, h: 78 };
const CORNER_L: Rect = { x: 0, y: 78, w: 40, h: 24 };
const CORNER_R: Rect = { x: 1400, y: 78, w: 40, h: 24 };

test.beforeEach(async ({ page }) => signIn(page));

test("launch-l3 · full Package Library page (shell + F5 body)", async ({ page }) => {
  await page.goto("/packages");
  await expect(page.getByRole("heading", { name: "Package library" })).toBeVisible();
  // Mask: Figma's footer shows pages 1–5 although all 6 packages fit on page 1 (see F5).
  await expectMatchesFigma(page, "launch-l3", undefined, { masks: [specRect("F04-launch-l3", "Pagination FRAME")] });
});

for (const [frame, route] of [["launch-l1", "/bookings"]] as const) {
  test(`${frame} · header + workspace corners (${route})`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectMatchesFigma(page, frame, undefined, { clip: HEADER, label: "header" });
    await expectMatchesFigma(page, frame, undefined, { clip: CORNER_L, label: "corner-l" });
    await expectMatchesFigma(page, frame, undefined, { clip: CORNER_R, label: "corner-r" });
  });
}

test("launch-l2 · App launcher open (hover on Package Lib)", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "App launcher" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Package Lib", exact: true }).hover();
  const box = specRect("F04-launch-l2", "App launcher (open) INSTANCE");
  await expectMatchesFigma(page, "launch-l2", undefined, { clip: box, keepPointer: true, label: "launcher" });
  await expectMatchesFigma(page, "launch-l2", undefined, { clip: HEADER, keepPointer: true, label: "header" });
});

test("profile-ac1 · Account menu open", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: /account menu/ }).click();
  await expect(page.getByRole("menu", { name: "Account" })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur()); // Figma shows no focused item
  const box = specRect("F04-profile-ac1", "Account menu INSTANCE");
  await expectMatchesFigma(page, "profile-ac1", undefined, { clip: box, label: "menu" });
  await expectMatchesFigma(page, "profile-ac1", undefined, { clip: HEADER, label: "header" });
});

test("G2 · shell boxes equal Figma", async ({ page }) => {
  await page.goto("/bookings");
  const spec = "F04-launch-l1";
  const checks: [string, string][] = [
    ["header nav[aria-label=Breadcrumb]", "Breadcrumb INSTANCE"],
    ["header > div:last-child", "Actions FRAME"],
    ["header button[aria-haspopup=menu]", "Workspace selector INSTANCE"],
    ["header button[aria-haspopup=dialog]", "App launcher FRAME"],
  ];
  const misses: string[] = [];
  const measure = async (sel: string, node: string, s = spec) => {
    const want = specRect(s, node);
    const b = (await page.locator(sel).first().boundingBox())!;
    for (const [k, a, w] of [["x", b.x, want.x], ["y", b.y, want.y], ["w", b.width, want.w], ["h", b.height, want.h]] as const)
      if (Math.abs(a - w) > 0.5) misses.push(`${node}.${k}: ${a} ≠ Figma ${w}`);
  };
  for (const [sel, node] of checks) await measure(sel, node);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await measure("[role=dialog][aria-label='App launcher'] > div", "App launcher (open) INSTANCE", "F04-launch-l2");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /account menu/ }).click();
  await measure("[role=menu]", "Account menu INSTANCE", "F04-profile-ac1");
  expect(misses, misses.join("\n")).toEqual([]);
});

test("popovers use Shadow/Floating", async ({ page }) => {
  await page.goto("/bookings");
  const token = await page.evaluate(() => {
    const p = document.createElement("div");
    p.style.boxShadow = "var(--shadow-floating)";
    document.body.appendChild(p);
    return getComputedStyle(p).boxShadow;
  });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  expect((await page.locator("[role=dialog][aria-label='App launcher'] > div").evaluate((e) => getComputedStyle(e).boxShadow)).endsWith(token)).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /account menu/ }).click();
  expect((await page.locator("[role=menu]").evaluate((e) => getComputedStyle(e).boxShadow)).endsWith(token)).toBe(true);
});
