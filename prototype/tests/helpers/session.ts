import type { Page } from "@playwright/test";

/** Fresh prototype data + an active session (the shell's route guard lets the page render). */
export async function signIn(page: Page) {
  await page.goto("/dev");
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("proto:")) localStorage.removeItem(k);
    localStorage.setItem("proto:session", "1");
  });
}
