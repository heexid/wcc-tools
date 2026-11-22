import { expect, test } from "@playwright/test";

// R01 · breakpoint tokens. Component sizes resolve per CIR Breakpoint set
// (Figma › Pattern · Responsive): desktop ≥ 1280 · tablet 768–1279 · mobile < 768.
const sets = [
  { width: 1440, control: "32px", input: "36px", header: "78px", gutter: "32px", font: "13px", columns: "12" },
  { width: 1280, control: "32px", input: "36px", header: "78px", gutter: "32px", font: "13px", columns: "12" },
  { width: 1279, control: "36px", input: "40px", header: "64px", gutter: "24px", font: "14px", columns: "8" },
  { width: 768, control: "36px", input: "40px", header: "64px", gutter: "24px", font: "14px", columns: "8" },
  { width: 767, control: "44px", input: "44px", header: "56px", gutter: "16px", font: "16px", columns: "4" },
  { width: 390, control: "44px", input: "44px", header: "56px", gutter: "16px", font: "16px", columns: "4" },
];

for (const s of sets) {
  test(`R01 · tokens at ${s.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: s.width, height: 900 });
    await page.goto("/login");
    const v = await page.evaluate(() => {
      const cs = getComputedStyle(document.documentElement);
      const get = (n: string) => cs.getPropertyValue(n).trim();
      return {
        control: get("--spacing-control-height"),
        input: get("--spacing-input-height"),
        header: get("--spacing-layout-header-height"),
        gutter: get("--spacing-layout-gutter"),
        font: get("--input-font-size"),
        columns: get("--grid-columns"),
      };
    });
    expect(v).toEqual({ control: s.control, input: s.input, header: s.header, gutter: s.gutter, font: s.font, columns: s.columns });
  });
}

test("R01 · viewport meta allows safe-area insets", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
});
