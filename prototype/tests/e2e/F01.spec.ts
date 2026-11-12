import { expect, test } from "@playwright/test";

// F1 — behaviour of the base primitives (/dev/interactions).
test.beforeEach(async ({ page }) => {
  await page.goto("/dev/interactions");
});

test("Tabs: click and ← → move selection with roving focus", async ({ page }) => {
  await page.getByRole("tab", { name: "Table" }).click();
  await expect(page.getByTestId("tab")).toHaveText("table");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("tab")).toHaveText("calendar");
  await expect(page.getByRole("tab", { name: "Calendar" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Calendar" })).toHaveAttribute("aria-selected", "true");
});

test("Segmented control: click and arrow keys switch option", async ({ page }) => {
  await page.getByRole("radio", { name: "Full price" }).click();
  await expect(page.getByTestId("seg")).toHaveText("full");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("seg")).toHaveText("dp");
});

test("Checkbox toggles", async ({ page }) => {
  const cb = page.getByRole("checkbox", { name: "Raka Pratama" });
  await cb.check();
  await expect(cb).toBeChecked();
});

test("Password: show / hide toggles the input type", async ({ page }) => {
  const input = page.getByLabel("Password", { exact: true });
  await expect(input).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(input).toHaveAttribute("type", "password");
});

test("Search: clear button appears when filled and clears", async ({ page }) => {
  const q = page.getByPlaceholder("Search bookings");
  await expect(page.getByRole("button", { name: "Clear search text" })).toHaveCount(0);
  await q.fill("Aulia");
  await page.getByRole("button", { name: "Clear search text" }).click();
  await expect(q).toHaveValue("");
});

test("Text area: typing stops at the limit; paste over it is kept and flagged (Terms)", async ({ page }) => {
  const terms = page.getByTestId("terms");
  const box = terms.getByRole("textbox");
  await box.pressSequentially("x".repeat(25));
  await expect(box).toHaveValue("x".repeat(20));
  await expect(terms.getByText("20/20")).toBeVisible();
  await box.fill("");
  await page.evaluate(() => navigator.clipboard?.writeText?.("y".repeat(26)).catch(() => {}));
  await box.focus();
  await box.dispatchEvent("paste", {});
  await box.fill("y".repeat(26)); // fill = paste-like insert after the paste flag
  await expect(terms.getByText("Max 20 characters")).toBeVisible();
  await expect(terms.getByText("26/20")).toBeVisible();
});

test("Text area: pasteOverflow=cut trims to the limit and shows the error (Package description)", async ({ page }) => {
  const desc = page.getByTestId("desc");
  const box = desc.getByRole("textbox");
  await box.focus();
  await box.dispatchEvent("paste", {});
  await box.fill("z".repeat(30));
  await expect(box).toHaveValue("z".repeat(20));
  await expect(desc.getByText("Max 20 characters")).toBeVisible();
});

test("Button loading: busy + disabled", async ({ page }) => {
  const b = page.getByRole("button", { name: "Saving" });
  await expect(b).toHaveAttribute("aria-busy", "true");
  await expect(b).toBeDisabled();
});

test("Overlays: data-state open → closed, then unmount after the exit", async ({ page }) => {
  await page.getByRole("button", { name: "Open modal" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-state", "open");
  await expect(dialog).toHaveClass(/motion-modal/);
  await page.getByRole("button", { name: "Keep booking" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Toggle popover" }).click();
  await expect(page.getByText("Popover content")).toBeVisible();
  await page.getByRole("button", { name: "Toggle popover" }).click();
  await expect(page.getByText("Popover content")).toHaveCount(0);
});

test("Overlays: reduced motion keeps the fade but drops movement", async ({ page }) => {
  // playwright.config sets reducedMotion: reduce
  const vars = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return [s.getPropertyValue("--modal-from-scale").trim(), s.getPropertyValue("--toast-from-y").trim(), s.getPropertyValue("--popover-from-scale").trim()];
  });
  expect(vars.map(parseFloat)).toEqual([1, 0, 1]);
});

test.describe("full motion", () => {
  test.use({ reducedMotion: "no-preference" });
  test("Overlays: full motion uses the token distances", async ({ page }) => {
    const vars = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      return [s.getPropertyValue("--modal-from-scale").trim(), s.getPropertyValue("--toast-from-y").trim(), s.getPropertyValue("--dur-modal").trim()];
    });
    // CSS output is minified (.96, .25s) — compare values, not spelling.
    expect(parseFloat(vars[0])).toBe(0.96);
    expect(vars[1]).toBe("-100%"); // toast sits top-centre and drops in from above
    expect(parseFloat(vars[2]) * (vars[2].endsWith("ms") ? 1 : 1000)).toBe(250);
  });
});
