import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { resetDb, sql } from "./db";
import { authCookieName } from "../../src/lib/supabase/cookie";

// SD3 · two workspaces in one app (SHARED-DATABASE-PLAN §5 tests 4, 5, 6, 9, 11, 16, 17, 18). A = the seed; B has a
// booking and an invoice with the same ref and number as A's.
const A = { email: "bs-moment@email.com", password: "bsmoment26" };
const B = { email: "b-admin@studio-b.test", password: "studiob26" };
const WS_B = "00000000-0000-4000-8000-0000000020b0";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==", "base64");
const pdfText = (file: string) => execFileSync("node", [join(process.cwd(), "tests/e2e-supabase/pdf-text.mjs"), file], { encoding: "utf8" });

test.beforeAll(() => {
  resetDb();
  sql(`insert into workspaces (id, slug, name) values ('${WS_B}', 'studio-b', 'Studio B')`);
  sql(`insert into workspace_settings (workspace_id, business_name, business_address, business_email, business_phone, default_payment) values ('${WS_B}', 'Studio B', 'Jl. B 2', 'b@studio-b.test', '+62 21-555-0200', '{"receiptName":"Bank B","accountNumber":"9999999999","accountName":"Studio B"}')`);
  sql(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-0000000020b1', 'authenticated', 'authenticated', '${B.email}', extensions.crypt('${B.password}', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"role":"admin","workspace_id":"${WS_B}"}', '{"display_name":"Bee Admin"}', now(), now(), '', '', '', '')`);
  sql(`insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values ('00000000-0000-4000-8000-0000000020b1', '00000000-0000-4000-8000-0000000020b1', '{"sub":"00000000-0000-4000-8000-0000000020b1","email":"${B.email}","email_verified":true}', 'email', now(), now(), now())`);
  sql(`insert into packages (workspace_id, name, price) values ('${WS_B}', 'Gold Package', 7000000)`);
  const as = `select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000020b1"}', true)`;
  sql(`begin; ${as}; select save_booking(jsonb_build_object('clientName','Bee Client','clientPhone','081234567890','packageId',(select id from packages where workspace_id = '${WS_B}'),'bookingDate','2026-11-20','items','[]'::jsonb,'crewIds',(select jsonb_agg(id) from crew where workspace_id = '${WS_B}'),'terms','')); commit`);
  sql(`begin; ${as}; select create_invoice((select id from bookings where workspace_id = '${WS_B}'), 'full'); commit`);
  sql(`alter table bookings disable trigger bookings_derive; update bookings set ref = 'BK-2026-0142' where workspace_id = '${WS_B}'; alter table bookings enable trigger bookings_derive`);
  sql(`alter table invoices disable trigger invoices_append_only; update invoices set number = 'INV-2026-0187', snapshot = jsonb_set(snapshot, '{invoiceNumber}', '"INV-2026-0187"') where workspace_id = '${WS_B}'; update invoices set snapshot_hash = snapshot_hash(snapshot) where workspace_id = '${WS_B}'; alter table invoices enable trigger invoices_append_only`);
});

async function signIn(page: Page, who: { email: string; password: string }, next = "/bookings") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
/** Raw Storage / API call with this page's own token. */
async function storage(page: Page, method: string, path: string, body?: Buffer) {
  return page.evaluate(
    async ([url, key, cookieName, method, path, body]) => {
      const raw = document.cookie.split("; ").filter((c) => c.startsWith(cookieName!)).map((c) => decodeURIComponent(c.split("=").slice(1).join("="))).join("");
      const session = JSON.parse(atob(raw.replace(/^base64-/, "").replace(/-/g, "+").replace(/_/g, "/")));
      const r = await fetch(`${url}/storage/v1/object/${path}`, {
        method: method!,
        headers: { apikey: key!, authorization: `Bearer ${session.access_token}`, ...(body ? { "content-type": "image/png", "x-upsert": "true" } : {}) },
        body: body ? Uint8Array.from(atob(body), (c) => c.charCodeAt(0)) : undefined,
      });
      return r.status;
    },
    [process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, authCookieName(process.env.NEXT_PUBLIC_SUPABASE_URL!), method, path, body?.toString("base64")] as const,
  );
}
const bInvoice = () => sql(`select id from invoices where workspace_id = '${WS_B}'`);

test("4, 5 · the same invoice number downloads each workspace's own PDF; the other's id is 404", async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signIn(a, A);
  await signIn(b, B);
  for (const [p, mine, notMine] of [[a, "Sari Wulandari", "Bee Client"], [b, "Bee Client", "Sari Wulandari"]] as const) {
    await p.goto("/bookings?booking=BK-2026-0142");
    const [d] = await Promise.all([p.waitForEvent("download", { timeout: 60_000 }), p.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click()]);
    const text = pdfText(await d.path());
    expect(text).toContain(mine);
    expect(text).not.toContain(notMine);
    expect(text).toContain(p === a ? "bs.moment" : "Studio B");
    expect(text).toContain(p === a ? "1234567890" : "9999999999");
  }
  expect(await a.evaluate(async (id) => (await fetch(`/api/invoices/${id}/pdf`)).status, bInvoice())).toBe(404);
  expect(sql("select count(distinct split_part(name, '/', 1)) from storage.objects where bucket_id = 'invoices'")).toBe("2");
  expect(sql("select bool_and(name = i.pdf_path and split_part(name, '/', 1) = i.workspace_id::text) from storage.objects o join invoices i on i.pdf_path = o.name where o.bucket_id = 'invoices'")).toBe("t");
});

test("6, 17 · B's logo can't be read, replaced or deleted by A; business edits stay in one workspace", async ({ browser }) => {
  const b = await (await browser.newContext()).newPage();
  await signIn(b, B, "/workspace");
  const card = b.getByRole("region", { name: "Business information" });
  await card.getByRole("button", { name: "Edit" }).click();
  const dlg = b.getByRole("dialog", { name: "Business information" });
  await dlg.getByLabel("Logo file").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await dlg.getByLabel("Business name").fill("Studio Bee");
  await dlg.getByRole("button", { name: "Save changes" }).click();
  await expect(dlg).toHaveCount(0);
  const path = sql(`select business_logo_path from workspace_settings where workspace_id = '${WS_B}'`);
  expect(path.startsWith(`${WS_B}/logo/`)).toBe(true);
  expect(sql(`select business_name from workspace_settings where workspace_id <> '${WS_B}'`)).toBe("bs.moment");
  expect(await storage(b, "GET", `authenticated/branding/${path}`)).toBe(200);

  const a = await (await browser.newContext()).newPage();
  await signIn(a, A, "/workspace");
  await expect(a.getByRole("region", { name: "Business information" })).toContainText("bs.moment");
  const before = sql(`select updated_at from storage.objects where name = '${path}'`);
  expect(await storage(a, "GET", `authenticated/branding/${path}`)).toBeGreaterThanOrEqual(400);
  expect(await storage(a, "POST", `branding/${path}`, PNG)).toBeGreaterThanOrEqual(400);
  expect(await storage(a, "PUT", `branding/${path}`, PNG)).toBeGreaterThanOrEqual(400);
  await storage(a, "DELETE", `branding/${path}`);
  expect(sql(`select updated_at from storage.objects where name = '${path}'`)).toBe(before);
});

test("16 · a link to B's person shows nothing of B", async ({ page }) => {
  const id = sql(`select id from crew where workspace_id = '${WS_B}'`);
  await signIn(page, A, `/workspace?person=${id}`);
  await expect(page.getByRole("status").filter({ hasText: "This person is no longer in the list." })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Bee Admin")).toHaveCount(0);
});

test("11 · two tabs: A signs out and B signs in on one, nothing of A stays on the other", async ({ page, context }) => {
  await signIn(page, A, "/bookings?booking=BK-2026-0142");
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("Sari Wulandari");
  const other = await context.newPage();
  await other.goto("/workspace");
  await other.getByRole("button", { name: /bs\.moment/ }).first().click();
  await other.getByRole("menuitem", { name: "Log out" }).click();
  await other.getByRole("alertdialog").getByRole("button", { name: "Log out" }).click();
  await expect(other).toHaveURL(/\/login/);
  await expect(page).toHaveURL(/\/login/, { timeout: 20_000 }); // the first tab follows
  await signIn(other, B);
  await page.goto("/bookings?booking=BK-2026-0142");
  await expect(page.getByRole("dialog", { name: "Booking detail" })).toContainText("Bee Client");
  await expect(page.getByText("Sari Wulandari")).toHaveCount(0);
  await expect(page.getByRole("banner").first()).toContainText("Bee Admin");
});

test("11 · B signs in over A without a sign-out: A's open tab reloads as B", async ({ page, context }) => {
  await signIn(page, A);
  await expect(page.getByRole("banner").first()).toContainText("bs.moment");
  const other = await context.newPage();
  await signIn(other, B);
  await expect(page.getByRole("banner").first()).toContainText("Bee Admin", { timeout: 30_000 });
  await expect(page.getByText("Sari")).toHaveCount(0);
});

test("9, 18 · a read-only workspace: everything readable, no write buttons, existing PDFs download", async ({ page }) => {
  sql(`update workspaces set status = 'read_only' where id = '${WS_B}'`);
  await signIn(page, B);
  await expect(page.getByRole("button", { name: "New booking" })).toHaveCount(0);
  await page.goto("/bookings?booking=BK-2026-0142");
  const d = page.getByRole("dialog", { name: "Booking detail" });
  await expect(d).toContainText("Bee Client");
  await expect(d.getByRole("button", { name: "Edit booking" })).toHaveCount(0);
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), d.getByRole("button", { name: "Download PDF (INV-2026-0187)" }).click()]);
  expect(pdfText(await dl.path())).toContain("Bee Client");
  await page.goto("/workspace");
  await expect(page.getByRole("region", { name: "Business information" })).toContainText("Studio Bee");
  await expect(page.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  sql(`update workspaces set status = 'active' where id = '${WS_B}'`);
});

test("8 · a closed workspace: signed in, but no data", async ({ page }) => {
  sql(`update workspaces set status = 'closed' where id = '${WS_B}'`);
  await page.goto("/login?next=/bookings?booking=BK-2026-0142");
  await page.getByLabel("Email").fill(B.email);
  await page.getByLabel("Password", { exact: true }).fill(B.password);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForTimeout(6000);
  await expect(page.getByText("Bee Client")).toHaveCount(0);
  await expect(page.getByText("Sari Wulandari")).toHaveCount(0);
  sql(`update workspaces set status = 'active' where id = '${WS_B}'`);
});
