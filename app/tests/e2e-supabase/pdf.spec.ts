import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { openSync } from "fontkit";
import { resetDb, sql } from "./db";

// P9 · server-rendered invoice PDFs on local Supabase (PRD US-10, §4.3; PLAN §8).
test.beforeAll(() => resetDb());

const ADMIN = { email: "bs-moment@email.com", password: "bsmoment26" };
async function signIn(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/bookings$/);
}
const pdfText = (file: string) => execFileSync("node", [join(process.cwd(), "tests/e2e-supabase/pdf-text.mjs"), file], { encoding: "utf8" });
const objects = (prefix: string) => Number(sql(`select count(*) from storage.objects where bucket_id = 'invoices' and name like '${prefix}%'`));

async function downloadFromSheet(page: Page, ref: string, number: string) {
  await page.goto(`/bookings?booking=${ref}`);
  const [d] = await Promise.all([
    page.waitForEvent("download", { timeout: 30_000 }),
    page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: `Download PDF (${number})` }).click(),
  ]);
  return { name: d.suggestedFilename(), text: pdfText(await d.path()) };
}

test("download: server render from the snapshot, stored, then reused; a business change re-renders once", async ({ page }) => {
  await signIn(page);
  const first = await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187");
  expect(first.name).toBe("INV-2026-0187_sari-wulandari.pdf");
  for (const s of ["INV-2026-0187", "Sari Wulandari", "BK-2026-0142", "Rp 3.000.000", "Bank BCA", "bs.moment"]) expect(first.text).toContain(s);
  const path1 = sql("select pdf_path from invoices where number = 'INV-2026-0187'");
  expect(path1).toMatch(/^INV-2026-0187\/[0-9a-f]{16}\.pdf$/);
  expect(objects("INV-2026-0187/")).toBe(1);

  await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187"); // same business → reused, nothing new stored
  expect(sql("select pdf_path from invoices where number = 'INV-2026-0187'")).toBe(path1);
  expect(objects("INV-2026-0187/")).toBe(1);

  sql("update workspace_settings set business_name = 'Studio Baru'");
  const changed = await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187");
  expect(changed.text).toContain("Studio Baru");
  expect(changed.text).toContain("Rp 3.000.000"); // figures are the snapshot's
  const path2 = sql("select pdf_path from invoices where number = 'INV-2026-0187'");
  expect(path2).not.toBe(path1);
  expect(objects("INV-2026-0187/")).toBe(1); // the superseded file is removed once the new one is stored (P9 review #10)

  // Back to the original business: re-rendered (its old file is gone) with text identical to the first render.
  sql("update workspace_settings set business_name = 'bs.moment'");
  const back = await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187");
  expect(back.text).toBe(first.text);
  expect(sql("select pdf_path from invoices where number = 'INV-2026-0187'")).toBe(path1);

  // A stored file that went missing is regenerated from the snapshot, identical again.
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  expect((await admin.storage.from("invoices").remove([path1])).error).toBeNull(); // Storage API (direct SQL deletes are blocked)
  const again = await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187");
  expect(again.text).toBe(first.text);
  expect(objects("INV-2026-0187/")).toBe(1);
});

test("F19 · the PDF header carries the snapshot's event details (Bill to | Event)", async ({ page }) => {
  await signIn(page);
  const { text } = await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187"); // 0201 must stay unrendered for the integrity test
  for (const s of ["Bill to", "Event", "Wedding · Sari & Dimas", "Thu, 12 Nov 2026 · 08:00", "Hotel Mulia Senayan", "Notes: Akad 08:00"]) expect(text).toContain(s);
  expect(text).not.toContain("From");
});

test("a new invoice's PDF is generated on confirm (quietly) and downloads", async ({ page }) => {
  await signIn(page);
  await page.goto("/bookings/BK-2026-0144/edit"); // Draft, no invoices
  await page.getByRole("region", { name: "Invoices" }).getByRole("button", { name: "Create invoice" }).click();
  const m = page.getByRole("dialog", { name: "New invoice #1" });
  await m.getByLabel("DP percentage").fill("50");
  await m.getByRole("button", { name: /Confirm & generate invoice/ }).click();
  await expect(page.getByRole("region", { name: "Invoices" }).getByRole("article")).toHaveCount(1);
  const number = sql("select i.number from invoices i join bookings b on b.id = i.booking_id where b.ref = 'BK-2026-0144'");
  await expect.poll(() => sql(`select coalesce(pdf_path, '') from invoices where number = '${number}'`), { timeout: 20_000 }).toMatch(new RegExp(`^${number}/`));
});

test("who: a crew can download; no session → 401; a signed URL stops working when it expires", async ({ page, request }) => {
  const anon = await request.get("/api/invoices/INV-2026-0187/pdf", { maxRedirects: 0 });
  expect(anon.status()).toBe(401);

  await signIn(page, "crew@bs-moment.test", "crewview26");
  const crew = await downloadFromSheet(page, "BK-2026-0142", "INV-2026-0187");
  expect(crew.text).toContain("INV-2026-0187");

  // The route's OWN link: valid for exactly 10 minutes (PRD §4.3) and downloads under the invoice's file name.
  const issued = await page.evaluate(async () => (await (await fetch("/api/invoices/INV-2026-0187/pdf")).json()) as { url: string; fileName: string });
  const u = new URL(issued.url);
  const claims = JSON.parse(Buffer.from(u.searchParams.get("token")!.split(".")[1], "base64url").toString());
  expect(claims.exp - claims.iat).toBe(600);
  expect(u.searchParams.get("download")).toBe("INV-2026-0187_sari-wulandari.pdf");

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const path = sql("select pdf_path from invoices where number = 'INV-2026-0187'");
  const s = await admin.storage.from("invoices").createSignedUrl(path, 1);
  expect((await fetch(s.data!.signedUrl)).status).toBe(200);
  await new Promise((r) => setTimeout(r, 2500));
  expect((await fetch(s.data!.signedUrl)).status).toBeGreaterThanOrEqual(400);
});

test("server text widths match the browser's (greedy wrapping breaks lines in the same places)", async ({ page }) => {
  const dir = join(process.cwd(), "public", "fonts", "pdf");
  const files: Record<number, string> = { 400: "Inter-Regular.woff", 500: "Inter-Medium.woff", 600: "Inter-SemiBold.woff", 700: "Inter-Bold.woff" };
  const samples: [string, number, number][] = [
    ["Remaining balance is due H-3 before the booking date. DP is non-refundable once the date is locked.", 12, 400],
    ["Wedding · Sari & Dimas — Gold Package — 8-hour coverage · 2 crew · 1 premium album", 13, 500],
    ["Jl. Rawa Mangun No. 12, Jakarta Timur", 12, 400],
    ["INV-2026-0187 · Down payment (40%)", 16, 600],
    ["Rp 12.500.000", 20, 700],
  ];
  await signIn(page);
  const browser = await page.evaluate((list) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    const family = getComputedStyle(document.body).fontFamily;
    return list.map(([s, size, weight]) => {
      ctx.font = `${weight} ${size}px ${family}`;
      return ctx.measureText(s).width;
    });
  }, samples);
  samples.forEach(([s, size, weight], i) => {
    const f = openSync(join(dir, files[weight]));
    const server = (f.layout(s).advanceWidth / f.unitsPerEm) * size;
    expect(Math.abs(server - browser[i]), `"${s}" ${size}/${weight}: server ${server.toFixed(2)} vs browser ${browser[i].toFixed(2)}`).toBeLessThan(Math.max(1, browser[i] * 0.01));
  });
});

test("integrity: a snapshot that no longer matches its hash is refused → dialog 37, invoice untouched", async ({ page }) => {
  // Simulate tampering (the append-only guard has to be switched off to even try).
  sql("alter table invoices disable trigger invoices_append_only; update invoices set snapshot = jsonb_set(snapshot, '{amount}', '1') where number = 'INV-2026-0201'; alter table invoices enable trigger invoices_append_only;");
  await signIn(page);
  await page.goto("/bookings?booking=BK-2026-0142");
  await page.getByRole("dialog", { name: "Booking detail" }).getByRole("button", { name: "Download PDF (INV-2026-0201)" }).click();
  await expect(page.getByRole("alertdialog").or(page.getByRole("dialog", { name: /Couldn.t generate the invoice PDF/ }))).toContainText("Couldn’t generate the invoice PDF");
  expect(sql("select coalesce(pdf_path, 'none') from invoices where number = 'INV-2026-0201'")).not.toMatch(/\.pdf$/);
});
