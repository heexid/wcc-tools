import { expect, test } from "@playwright/test";

// F3 — Login behaviour (PRD §4.3, INTERACTIONS 6.5).
test.beforeEach(async ({ page }) => {
  await page.goto("/dev/reset");
  await page.getByRole("button", { name: "Reset prototype data" }).click();
  await page.goto("/login");
});
const email = (p: import("@playwright/test").Page) => p.getByLabel("Email");
const password = (p: import("@playwright/test").Page) => p.getByLabel("Password", { exact: true });

test("valid credentials + Enter → session and /bookings", async ({ page }) => {
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await password(page).press("Enter");
  await expect(page).toHaveURL(/\/bookings$/);
  expect(await page.evaluate(() => localStorage.getItem("proto:session"))).toBe("1");
});

test("?next= returns to the requested page after login", async ({ page }) => {
  await page.goto("/login?next=/dev");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/dev$/);
});

test("required errors focus the first empty field and clear while typing", async ({ page }) => {
  await page.getByRole("button", { name: "Login" }).click();
  await expect(email(page)).toBeFocused();
  await expect(email(page)).toHaveAttribute("aria-invalid", "true");
  await email(page).fill("b");
  await expect(page.getByText("Enter your email")).toHaveCount(0);
  await expect(page.getByText("Enter your password")).toBeVisible();
});

test("email format is checked before calling the server", async ({ page }) => {
  await email(page).fill("bs-moment@email");
  await password(page).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Enter an email like name@company.com")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong credentials: danger alert, password cleared and focused, email kept", async ({ page }) => {
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("nope12345");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Email or password is incorrect"); // (Next.js has its own role=alert route announcer)
  await expect(password(page)).toBeFocused();
  await expect(email(page)).toHaveValue("bs-moment@email.com");
});

test("server unreachable → Try again succeeds", async ({ page }) => {
  await page.goto("/login?fail=login");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Can't connect to CIR")).toBeVisible();
  await expect(password(page)).toHaveValue("bsmoment26");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
});

test("while logging in, fields and button are disabled", async ({ page }) => {
  await page.goto("/login?latency=60000");
  await email(page).fill("bs-moment@email.com");
  await password(page).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(email(page)).toBeDisabled();
  await expect(password(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Logging in…" })).toHaveAttribute("aria-busy", "true");
});

test("Forgot password? shows the contact-your-admin notice (no reset flow)", async ({ page }) => {
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.locator("form").getByRole("status")).toContainText("Passwords are managed by your workspace admin");
});

test("session expired prefills the last email", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("proto:lastEmail", "bs-moment@email.com"));
  await page.goto("/login?expired=1");
  await expect(page.getByText("Your session expired")).toBeVisible();
  await expect(email(page)).toHaveValue("bs-moment@email.com");
});

test("Caps Lock hint appears while typing with Caps Lock and hides on blur", async ({ page }) => {
  await password(page).focus();
  await page.evaluate(() => document.querySelector("input[name=password]")!.dispatchEvent(new KeyboardEvent("keyup", { key: "A", bubbles: true, modifierCapsLock: true } as KeyboardEventInit)));
  await expect(page.getByText("Caps Lock is on")).toBeVisible();
  await email(page).focus();
  await expect(page.getByText("Caps Lock is on")).toHaveCount(0);
});

test("show / hide password", async ({ page }) => {
  await password(page).fill("bsmoment26");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password(page)).toHaveAttribute("type", "text");
});
