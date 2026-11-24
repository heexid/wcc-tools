import { expect, test, type Browser, type Page } from "@playwright/test";
import { resetDb, sql } from "./db";

// P7 · Booking write path on local Supabase: edit + diff strip (lane B3), total-below-paid guard (rule 10),
// archived package kept (rule 13), leave guard (lane G), cancel (lane H, rule 12), optimistic concurrency (two
// browsers), crew kept off /edit. Same selectors and copy as the mock suites (F13, F14). New booking → Draft and
// DP invoice are covered by smoke.spec.ts. Each test uses its own seeded booking, so order doesn't matter.

test.beforeAll(() => resetDb());

async function signIn(page: Page, email = "bs-moment@email.com", password = "bsmoment26") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
}
async function openEdit(page: Page, ref: string) {
  await page.goto(`/bookings/${ref}/edit`);
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible(); // the form is loaded (any status)
}
const rail = (p: Page) => p.getByRole("complementary", { name: "Summary and invoices" });
const toast = (p: Page, text: string | RegExp) => p.getByRole("status").filter({ hasText: text });
const main = (p: Page) => p.getByRole("main");

test("lane B3 · edit → diff strip → Save changes; stored total moves, invoices untouched (2.3, US-4)", async ({ page }) => {
  await signIn(page);
  await openEdit(page, "BK-2026-0142");
  await main(page).getByLabel("Item 1 quantity").fill("3");
  await expect(rail(page).getByRole("status").filter({ hasText: "Total updated" })).toContainText("Total updated: Rp 12.500.000 → Rp 13.000.000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  expect(sql("select total || '|' || total_paid || '|' || status from bookings where ref = 'BK-2026-0142'")).toBe("13000000|5000000|partially_paid");
  expect(sql("select count(*) from invoices i join bookings b on b.id = i.booking_id where b.ref = 'BK-2026-0142'")).toBe("2");
});

test("rule 10 · an edit that drops the total below what's paid is blocked before saving (2.13)", async ({ page }) => {
  await signIn(page);
  await openEdit(page, "BK-2026-0101"); // Paid: 11.000.000 of 11.000.000
  await main(page).getByRole("button", { name: "Package" }).click();
  await page.getByRole("option", { name: /Basic Package/ }).click();
  await expect(page.getByText("Total Rp 3.000.000 can’t be lower than Rp 11.000.000 already paid")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();
  expect(sql("select total from bookings where ref = 'BK-2026-0101'")).toBe("11000000");
});

test("rule 13 · an archived package stays on the booking at its saved price, and saving keeps it (2.18)", async ({ page }) => {
  sql("update packages set is_active = false, archived_at = now() where name = 'Gold Package'");
  await signIn(page);
  await openEdit(page, "BK-2026-0142");
  await expect(page.getByText("Archived — kept on this booking at its saved price. It isn’t listed in the dropdown.")).toBeVisible();
  await main(page).getByLabel("Client name", { exact: true }).fill("Sari W.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  expect(sql("select p.name || '|' || b.package_price_snapshot || '|' || b.client_name from bookings b join packages p on p.id = b.package_id where b.ref = 'BK-2026-0142'")).toBe("Gold Package|10000000|Sari W.");
  sql("update packages set is_active = true, archived_at = null where name = 'Gold Package'");
});

test("F19 · event details: start time, location and notes save to Postgres and come back (Client & schedule)", async ({ page }) => {
  await signIn(page);
  await openEdit(page, "BK-2026-0156"); // Draft, seeded without event details
  const client = main(page).getByRole("region", { name: "Client & schedule" });
  await expect(client.getByRole("button", { name: "Event start" })).toHaveText("Select time");
  await client.getByRole("button", { name: "Event start" }).click();
  await page.getByRole("option", { name: "19:30" }).click();
  await client.getByLabel("Location").fill("  Gedung Serbaguna, Jakarta Timur ");
  await client.getByLabel("Notes").fill("Bring the drone.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(page, "Changes saved")).toBeVisible();
  expect(sql("select to_char(event_start, 'HH24:MI') || '|' || location || '|' || notes from bookings where ref = 'BK-2026-0156'")).toBe("19:30|Gedung Serbaguna, Jakarta Timur|Bring the drone.");

  await page.goto("/bookings?booking=BK-2026-0156");
  const info = page.getByRole("dialog", { name: "Booking detail" }).getByRole("region", { name: "Booking information" });
  await expect(info).toContainText("· 19:30");
  await expect(info).toContainText("Gedung Serbaguna, Jakarta Timur");
  await expect(info).toContainText("Bring the drone.");
});

test("lane G · leave guard: Keep editing stays; Discard leaves without saving (2.1)", async ({ page }) => {
  await signIn(page);
  await openEdit(page, "BK-2026-0153");
  await main(page).getByLabel("Client name", { exact: true }).fill("Hendra W.");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const g = page.getByRole("alertdialog", { name: "Discard unsaved changes?" });
  await g.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Discard changes" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  expect(sql("select client_name from bookings where ref = 'BK-2026-0153'")).toBe("Hendra Wijaya");
});

test("lane H · cancel with a reason → Canceled, read-only; /edit redirects (2.15, 2.16, 4.11, rule 12)", async ({ page }) => {
  await signIn(page);
  await openEdit(page, "BK-2026-0144");
  await page.getByRole("button", { name: "Cancel booking" }).click();
  const dlg = page.getByRole("alertdialog", { name: /Cancel this booking/ }).or(page.getByRole("dialog", { name: /Cancel this booking/ }));
  await expect(dlg.getByRole("button", { name: "Keep booking" })).toBeFocused();
  await dlg.getByLabel("Reason (optional)").fill("Client postponed");
  await dlg.getByRole("button", { name: "Cancel booking" }).click();
  await expect(toast(page, "Booking canceled · BK-2026-0144")).toBeVisible();
  expect(sql("select status || '|' || cancel_reason from bookings where ref = 'BK-2026-0144'")).toBe("canceled|Client postponed");
  await page.goto("/bookings/BK-2026-0144/edit");
  await expect(page).toHaveURL(/\/bookings\/[^/?]+$/); // read-only page, never the form
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
});

test("P7 · two people edit one booking: the second save is refused with the reload notice", async ({ browser }) => {
  const [a, b] = await Promise.all([editor(browser), editor(browser)]);
  await main(a).getByLabel("Client name", { exact: true }).fill("Nadia S. (A)");
  await main(b).getByLabel("Booking name").fill("Prewedding · edited by B");
  await a.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(a, "Changes saved")).toBeVisible();

  await b.getByRole("button", { name: "Save changes" }).click();
  const notice = rail(b).getByRole("alert").or(rail(b).getByRole("status")).filter({ hasText: "This booking was changed by someone else" });
  await expect(notice).toContainText("Reload to see their changes. Your edits here haven’t been saved.");
  expect(sql("select client_name || '|' || booking_name from bookings where ref = 'BK-2026-0147'")).toBe("Nadia S. (A)|Prewedding · Nadia & Fajar"); // B's edit not written

  await b.getByRole("button", { name: "Reload booking" }).click();
  await expect(main(b).getByLabel("Client name", { exact: true })).toHaveValue("Nadia S. (A)");
  await expect(b.getByText("All changes saved")).toBeVisible();
  // A saving again after its own save is fine (its version moved with the save).
  await main(a).getByLabel("Client name", { exact: true }).fill("Nadia Safitri");
  await a.getByRole("button", { name: "Save changes" }).click();
  await expect(toast(a, "Changes saved")).toBeVisible();
  await a.context().close();
  await b.context().close();
});

test("crew · /edit opens the read-only page (6.4)", async ({ page }) => {
  await signIn(page, "crew@bs-moment.test", "crewview26");
  await page.goto("/bookings/BK-2026-0142/edit");
  await expect(page).toHaveURL(/\/bookings\/[^/?]+$/);
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
});

async function editor(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await signIn(page);
  await openEdit(page, "BK-2026-0147");
  return page;
}
