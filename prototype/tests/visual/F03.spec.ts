import { expect, test, type Page } from "@playwright/test";
import { expectMatchesFigma, specRect } from "../helpers/visual";

// F3 — Login P1–P3, E1–E7 vs Figma (full 1440×900 frames, G3 ≤ 0.5 %). States are reached the way a
// user reaches them (typing, clicking), not by props.
test.beforeEach(async ({ page }) => {
  await page.goto("/dev/reset");
  await page.getByRole("button", { name: "Reset prototype data" }).click();
});

const email = (p: Page) => p.getByLabel("Email");
const password = (p: Page) => p.getByLabel("Password", { exact: true });
const submit = (p: Page) => p.getByRole("button", { name: /^(Login|Try again)$/ });

test("P1 · empty", async ({ page }) => {
  await page.goto("/login");
  await expectMatchesFigma(page, "login-p1");
});

test("P2 · filled", async ({ page }) => {
  await page.goto("/login");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await page.locator("body").click({ position: { x: 5, y: 5 } }); // no focus ring, like Figma
  await expectMatchesFigma(page, "login-p2");
});

test("P3 · logging in", async ({ page }) => {
  await page.goto("/login?latency=60000");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await submit(page).click();
  await expect(page.getByRole("button", { name: "Logging in…" })).toBeDisabled();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "login-p3");
});

test("E1 · required fields missing", async ({ page }) => {
  await page.goto("/login");
  await submit(page).click();
  await expect(page.getByText("Enter your email")).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "login-e1");
});

test("E2 · email format invalid", async ({ page }) => {
  await page.goto("/login");
  await email(page).fill("bs-moment@email");
  await password(page).fill("bsmoment26");
  await submit(page).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  // Mask: Figma draws the invalid value in placeholder grey (Error variant default) — we keep typed text primary.
  await expectMatchesFigma(page, "login-e2", undefined, { masks: [specRect("F03-login-e2", '"bs-moment@email"')] });
});

test("E3 · wrong email or password", async ({ page }) => {
  await page.goto("/login");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("wrong-password1");
  await submit(page).click();
  await expect(page.getByText("Email or password is incorrect")).toBeVisible();
  await expect(password(page)).toBeFocused();
  await expect(password(page)).toHaveValue("");
  // Mask: Figma's Password Focus variant shows eye-off although the value is hidden (DS variant quirk).
  await expectMatchesFigma(page, "login-e3", undefined, { masks: [specRect("F03-login-e3", "Visibility toggle")] });
});

test("E4 · session expired", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => localStorage.setItem("proto:lastEmail", "bs-moment@email.com"));
  await page.goto("/login?expired=1");
  await expect(email(page)).toHaveValue("bs-moment@email.com");
  await expectMatchesFigma(page, "login-e4");
});

test("E5 · Caps Lock is on", async ({ page }) => {
  await page.goto("/login");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("abcdef");
  await password(page).focus();
  await password(page).dispatchEvent("keyup", { key: "A", modifierCapsLock: true });
  await page.evaluate(() => {
    const el = document.querySelector<HTMLInputElement>("input[name=password]")!;
    const ev = new KeyboardEvent("keyup", { key: "A", bubbles: true, modifierCapsLock: true } as KeyboardEventInit);
    el.dispatchEvent(ev);
  });
  await expect(page.getByText("Caps Lock is on")).toBeVisible();
  await expectMatchesFigma(page, "login-e5", undefined, { masks: [specRect("F03-login-e5", "Visibility toggle")] });
});

test("E6 · can't reach the server", async ({ page }) => {
  await page.goto("/login?fail=login");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await submit(page).click();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "login-e6");
});

test("E7 · forgot password — contact your admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expectMatchesFigma(page, "login-e7");
});

// G2 — boxes of the key nodes equal Figma (0 px), in P1 (base) and E3 (alert inserted, card grows).
for (const [frame, prepare] of [
  ["login-p1", async () => {}],
  ["login-e3", async (p: Page) => {
    await email(p).fill("bs-moment@email.com");
    await password(p).fill("wrong-password1");
    await submit(p).click();
    await expect(p.getByText("Email or password is incorrect")).toBeVisible();
  }],
] as const) {
  test(`G2 · ${frame} boxes`, async ({ page }) => {
    await page.goto("/login");
    await prepare(page);
    const spec = `F03-${frame}`;
    const checks: [string, string][] = [
      ["section[aria-labelledby=login-title]", "Login card FRAME"],
      ["form", "Panel FRAME"],
      ["form > img", "Asset/mascot-large INSTANCE"],
      ["form > div:nth-of-type(1)", "Greeting FRAME"],
      ["form button[type=submit]", "Login button INSTANCE"],
      ["form > div:has(> button:text('Forgot password?'))", "Forgot password FRAME"],
    ];
    if (frame === "login-e3") checks.push(["form [role=alert]", "Alert INSTANCE"]);
    const misses: string[] = [];
    for (const [sel, node] of checks) {
      const want = specRect(spec, node);
      const box = (await page.locator(sel).first().boundingBox())!;
      for (const [k, a, b] of [["x", box.x, want.x], ["y", box.y, want.y], ["w", box.width, want.w], ["h", box.height, want.h]] as const)
        if (Math.abs(a - b) > 0.5) misses.push(`${node}.${k}: ${a} ≠ Figma ${b}`);
    }
    expect(misses, misses.join("\n")).toEqual([]);
  });
}
