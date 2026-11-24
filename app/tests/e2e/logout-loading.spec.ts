import { expect, test } from "@playwright/test";
import { signIn } from "../helpers/session";

// 6.10 · confirming Log out disables the button with a spinner and locks the dialog until Login opens.
test.beforeEach(async ({ page }) => signIn(page));

for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]] as const) {
  test(`${name} · Log out: disabled + loading, locked, then Login`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/account?latency=3000");
    if (name === "desktop") await page.locator("header").getByRole("button", { name: /, Admin/ }).click();
    else await page.getByRole("button", { name: /account menu/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    const dlg = page.getByRole("alertdialog", { name: "Log out?" });
    await dlg.getByRole("button", { name: "Log out", exact: true }).click();
    const busy = dlg.getByRole("button", { name: "Logging out…" });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(dlg.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dlg).toBeVisible();
    await expect(page).toHaveURL(/\/login\?loggedOut=1/, { timeout: 15_000 });
  });
}
