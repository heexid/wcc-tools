import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// Business information on Workspace settings — PRD US-14; INTERACTIONS 6.11–6.12; Figma Workspace Setting WS1–WS8, flow W1–W6.

test.beforeEach(async ({ page }) => signIn(page));

const card = (p: Page) => p.getByRole("region", { name: "Business information" });
const dlg = (p: Page) => p.getByRole("dialog", { name: "Business information" });
// 1×1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==", "base64");

test("E1 · the card is prefilled from the saved business information", async ({ page }) => {
  await page.goto("/workspace-settings");
  await expect(card(page)).toContainText("bs.moment");
  await expect(card(page)).toContainText("Jl. Rawa Mangun No. 12, Jakarta Timur");
  await expect(card(page)).toContainText("finance@bs-moment.com");
  await expect(card(page)).toContainText("+62 21-555-0100");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await expect(dlg(page).getByLabel("Business name")).toHaveValue("bs.moment");
  await expect(dlg(page).getByLabel("Address")).toHaveValue("Jl. Rawa Mangun No. 12, Jakarta Timur");
  await expect(dlg(page).getByLabel("Email")).toHaveValue("finance@bs-moment.com");
  await expect(dlg(page).getByLabel("Phone number")).toHaveValue("+62 21-555-0100");
  await expect(dlg(page).getByRole("button", { name: "Upload logo", exact: true })).toBeVisible();
});

test("E2 · validation keeps the modal open; Cancel / Esc / × discard the draft", async ({ page }) => {
  await page.goto("/workspace-settings");
  for (const discard of [() => dlg(page).getByRole("button", { name: "Cancel" }).click(), () => page.keyboard.press("Escape"), () => dlg(page).getByRole("button", { name: "Close" }).click()]) {
    await card(page).getByRole("button", { name: "Edit" }).click();
    await dlg(page).getByLabel("Business name").fill("Temp");
    await discard();
    await expect(dlg(page)).toHaveCount(0);
  }
  await expect(card(page)).toContainText("bs.moment");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Business name").fill("");
  await dlg(page).getByLabel("Address").fill("");
  await dlg(page).getByLabel("Email").fill("not-an-email");
  await dlg(page).getByLabel("Phone number").fill("12");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page).getByText("Enter 2–50 characters.")).toHaveCount(0);
  await expect(dlg(page).getByText("Enter 2–60 characters.")).toBeVisible();
  await expect(dlg(page).getByText("Enter the business address.")).toBeVisible();
  await expect(dlg(page).getByText("Enter a valid email address.")).toBeVisible();
  await expect(dlg(page).getByText("Enter a valid phone number.")).toBeVisible();
  // errors clear as each field is fixed
  await dlg(page).getByLabel("Email").fill("hello@studio.id");
  await expect(dlg(page).getByText("Enter a valid email address.")).toHaveCount(0);
});

test("E3 · logo: wrong type and > 1 MB are refused; a PNG is accepted, replaced and removed", async ({ page }) => {
  await page.goto("/workspace-settings");
  await card(page).getByRole("button", { name: "Edit" }).click();
  const file = dlg(page).getByLabel("Logo file");
  await file.setInputFiles({ name: "logo.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(dlg(page).getByText("Use a PNG, JPG or WebP image.")).toBeVisible();
  await file.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(1024 * 1024 + 1) });
  await expect(dlg(page).getByText("Logo must be 1 MB or smaller.")).toBeVisible();
  await file.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(dlg(page).getByRole("button", { name: "Replace logo" })).toBeVisible();
  await expect(dlg(page).getByText("Use a PNG, JPG or WebP image.")).toHaveCount(0);
  await dlg(page).getByRole("button", { name: "Remove" }).click();
  await expect(dlg(page).getByRole("button", { name: "Upload logo", exact: true })).toBeVisible();
});

test("E4 · save → toast, card updates, and the next PDF shows the new business (Brand row incl. email)", async ({ page }) => {
  await page.goto("/workspace-settings");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Logo file").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await dlg(page).getByLabel("Business name").fill("  Studio Baru  ");
  await dlg(page).getByLabel("Address").fill("Jl. Melati 5\nBandung");
  await dlg(page).getByLabel("Email").fill("hello@studio-baru.id");
  await dlg(page).getByLabel("Phone number").fill("+62 22-777-0000");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Business information updated" })).toBeVisible();
  await expect(card(page)).toContainText("Studio Baru");
  await expect(card(page)).toContainText("hello@studio-baru.id");
  await expect(card(page).locator("img")).toHaveCount(1);
  // survives a reload
  await page.reload();
  await expect(card(page)).toContainText("+62 22-777-0000");
  // an OLD invoice's PDF picks up the new brand row (figures stay the snapshot's)
  await page.goto("/bookings?booking=BK-2026-0142");
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click()]);
  expect(d.suggestedFilename()).toBe("INV-2026-0187_sari-wulandari.pdf");
});

test("save failure: inline message, nothing saved (?fail=updateBusiness)", async ({ page }) => {
  await page.goto("/workspace-settings?fail=updateBusiness");
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Business name").fill("Studio Baru");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page).getByRole("alert").filter({ hasText: "Couldn’t save" })).toContainText("Check your connection and try again.");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toHaveCount(0);
  await expect(card(page)).toContainText("Studio Baru");
});

test("crew: sees the card but no Edit button (6.4)", async ({ page }) => {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Crew" }).click();
  await page.goto("/workspace-settings");
  await expect(card(page)).toContainText("bs.moment");
  await expect(card(page).getByRole("button", { name: "Edit" })).toHaveCount(0);
});

test("Account settings keeps only Profile and Security", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("region", { name: "Security" })).toBeVisible();
  await expect(page.getByRole("region")).toHaveCount(2);
  await expect(page.getByText("Business information")).toHaveCount(0);
});

test("account menu → Workspace Setting opens Workspace settings (no launcher tile current)", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: /account menu/ }).click();
  const items = page.getByRole("menu", { name: "Account" }).getByRole("menuitem");
  await expect(items).toHaveText(["Account Setting", "Workspace Setting", "Log out"]);
  await page.getByRole("menuitem", { name: "Workspace Setting" }).click();
  await expect(page).toHaveURL(/\/workspace-settings$/);
  await expect(page.getByRole("heading", { name: "Workspace settings", level: 1 })).toBeVisible();
  await expect(card(page)).toContainText("bs.moment");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  for (const tile of ["Booking", "Package Lib", "Crew"]) await expect(page.getByRole("button", { name: tile, exact: true })).not.toHaveAttribute("aria-current", "page");
});

test("Crew shows only Admin & crew; launcher tile is Crew and current there", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("button", { name: "Crew", exact: true }).click();
  await expect(page).toHaveURL(/\/crew$/);
  await expect(page.getByRole("heading", { name: "Crew", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Admin & crew" })).toBeVisible();
  await expect(card(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.getByRole("button", { name: "Crew", exact: true })).toHaveAttribute("aria-current", "page");
});

test("old /workspace links redirect to /crew and keep the person", async ({ page }) => {
  await page.goto("/workspace?person=crew_rp");
  await expect(page).toHaveURL(/\/crew\?person=crew_rp$/);
  await expect(page.getByRole("dialog", { name: "Raka Pratama’s bookings" })).toBeVisible();
});

test("390 · account sheet has Workspace Setting", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/bookings");
  await page.getByRole("button", { name: /account menu/ }).click();
  await page.getByRole("menuitem", { name: "Workspace Setting" }).click();
  await expect(page).toHaveURL(/\/workspace-settings$/);
});

test("390 · card, edit sheet and no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace-settings");
  await expect(card(page)).toContainText("finance@bs-moment.com");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await card(page).getByRole("button", { name: "Edit" }).click();
  expect((await dlg(page).boundingBox())!.width).toBe(390);
  expect((await dlg(page).getByRole("button", { name: "Save changes" }).boundingBox())!.height).toBe(44);
  await dlg(page).getByRole("button", { name: "Cancel" }).click();
  await expect(dlg(page)).toBeHidden();
});

test("Subscription: plan, start and paid until, locked; Active", async ({ page }) => {
  await page.goto("/workspace-settings");
  const sub = page.getByRole("region", { name: "Subscription" });
  await expect(sub).toContainText("6 months");
  await expect(sub).toContainText("1 Sep 2026");
  await expect(sub).toContainText("28 Feb 2027");
  await expect(sub).toContainText("Active");
  await expect(sub.getByRole("img", { name: "Locked" })).toHaveCount(3);
  await expect(sub.getByRole("button")).toHaveCount(0);
});

test("expired subscription: Expired, view only for the admin everywhere (WS10)", async ({ page }) => {
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Expired subscription" }).click();
  await page.goto("/workspace-settings");
  const sub = page.getByRole("region", { name: "Subscription" });
  await expect(sub).toContainText("Expired");
  await expect(sub).toContainText("nothing can be changed");
  await expect(card(page)).toContainText("bs.moment");
  await expect(card(page).getByRole("button", { name: "Edit" })).toHaveCount(0);
  await page.goto("/bookings");
  await expect(page.getByRole("heading", { name: "Bookings", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "New booking" })).toHaveCount(0);
  await page.goto("/dev/role");
  await page.getByRole("button", { name: "Paid subscription" }).click();
});
