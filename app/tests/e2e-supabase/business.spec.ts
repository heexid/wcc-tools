import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { resetDb, sql } from "./db";
import { authCookieName } from "../../src/lib/supabase/cookie";

// P8 · Business information on local Supabase (PRD US-14, Workspace Setting flow W1–W6): settings row + logo in Storage
// `branding/`, and the rule that matters — an OLD invoice's PDF shows the CURRENT business, while its figures and
// bank details stay the snapshot's. Same selectors and copy as the mock suite (F18-business).

test.beforeAll(() => resetDb());
test.beforeEach(async ({ page }) => {
  await page.goto("/login?next=/workspace-settings");
  await page.getByLabel("Email").fill("bs-moment@email.com");
  await page.getByLabel("Password", { exact: true }).fill("bsmoment26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/workspace-settings$/);
});

const card = (p: Page) => p.getByRole("region", { name: "Business information" });
const dlg = (p: Page) => p.getByRole("dialog", { name: "Business information" });
// 1×1 transparent PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==", "base64");
const pdfText = (file: string) => execFileSync("node", [join(process.cwd(), "tests/e2e-supabase/pdf-text.mjs"), file], { encoding: "utf8" });

test("E1 · the card is prefilled from workspace_settings", async ({ page }) => {
  await expect(card(page)).toContainText("bs.moment");
  await expect(card(page)).toContainText("finance@bs-moment.com");
});

test("E2 · validation keeps the modal open; nothing is stored", async ({ page }) => {
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Business name").fill("B");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toBeVisible();
  expect(sql("select business_name from workspace_settings")).toBe("bs.moment");
});

test("E4 · save with a logo → stored in Storage, card shows it, and an old invoice's PDF shows the new business with its old figures", async ({ page }) => {
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Logo file").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(dlg(page).getByRole("button", { name: "Replace logo" })).toBeVisible();
  await dlg(page).getByLabel("Business name").fill("  Studio Baru  ");
  await dlg(page).getByLabel("Email").fill("hello@studio-baru.id");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Business information updated" })).toBeVisible();

  // Stored: the path (not a data URL) in the row, the file in the private bucket.
  expect(sql("select business_name || '|' || business_logo_path from workspace_settings")).toMatch(/^Studio Baru\|[0-9a-f-]{36}\/logo\/[0-9a-f]{64}\.png$/);
  expect(sql("select count(*) from storage.objects where bucket_id = 'branding'")).toBe("1");
  // The card loads it through a signed URL.
  await page.reload();
  const img = card(page).locator("img");
  await expect(img).toHaveAttribute("src", /\/storage\/v1\/object\/sign\/branding\/[0-9a-f-]{36}\/logo\//);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);

  // Change the bank details too — the old invoice must keep the ones it was issued with.
  sql(`update workspace_settings set default_payment = '{"receiptName":"Bank Mandiri","accountNumber":"9988776655","accountName":"New"}'`);
  await page.goto("/bookings?booking=BK-2026-0142");
  const [d] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click(),
  ]);
  expect(d.suggestedFilename()).toBe("INV-2026-0187_sari-wulandari.pdf");
  const text = pdfText(await d.path());
  expect(text).toContain("Studio Baru"); // live business (US-10 / US-14)
  expect(text).toContain("hello@studio-baru.id");
  expect(text).toContain("INV-2026-0187");
  expect(text).toContain("Bank BCA"); // frozen bank details from the snapshot
  expect(text).not.toContain("Bank Mandiri");
});

test("save fails (network) → inline message, nothing saved; Try again saves", async ({ page }) => {
  let aborted = false;
  await page.route("**/workspace-settings", async (route) => {
    if (!aborted && route.request().method() === "POST" && route.request().headers()["next-action"]) {
      aborted = true;
      return route.abort("internetdisconnected");
    }
    return route.continue();
  });
  await card(page).getByRole("button", { name: "Edit" }).click();
  await dlg(page).getByLabel("Business name").fill("Studio Lain");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page).getByRole("alert").filter({ hasText: "Couldn’t save" })).toContainText("Check your connection and try again.");
  expect(sql("select business_name from workspace_settings")).not.toBe("Studio Lain");
  await dlg(page).getByRole("button", { name: "Save changes" }).click();
  await expect(dlg(page)).toHaveCount(0);
  expect(sql("select business_name from workspace_settings")).toBe("Studio Lain");
});

test("crew sees the card but no Edit; Storage refuses a crew's upload", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/login?next=/workspace-settings");
  await page.getByLabel("Email").fill("crew@bs-moment.test");
  await page.getByLabel("Password", { exact: true }).fill("crewview26");
  await page.getByRole("button", { name: "Login" }).click();
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByRole("button", { name: "Edit" })).toHaveCount(0);
  const status = await page.evaluate(async ([url, key, cookieName]) => {
    const raw = document.cookie.split("; ").filter((c) => c.startsWith(cookieName)).map((c) => decodeURIComponent(c.split("=").slice(1).join("="))).join("");
    const session = JSON.parse(atob(raw.replace(/^base64-/, "").replace(/-/g, "+").replace(/_/g, "/")));
    const r = await fetch(`${url}/storage/v1/object/branding/logo/crew.png`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${session.access_token}`, "content-type": "image/png" }, body: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) });
    return r.status;
  }, [process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, authCookieName(process.env.NEXT_PUBLIC_SUPABASE_URL!)]);
  expect(status).toBeGreaterThanOrEqual(400);
  expect(sql("select count(*) from storage.objects where name = 'logo/crew.png'")).toBe("0");
});
