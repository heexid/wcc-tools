import { expect, test, type Page } from "@playwright/test";
import { resetDb, sql } from "./db";

// W5 · Workspace & Crew on local Supabase (SHARED-DATABASE-PLAN §9): the real list_people under RLS, the person panel,
// and the load errors the mock can't hold (the request is aborted, then let through by Try again).

test.beforeAll(() => resetDb());
test.beforeEach(async ({ page }) => page.clock.setFixedTime(new Date("2026-11-10T09:00:00+07:00")));

async function open(page: Page, email = "bs-moment@email.com", password = "bsmoment26", next = "/workspace") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL(/\/workspace/);
}
const people = (p: Page) => p.getByRole("region", { name: "Admin & crew" });
const row = (p: Page, name: string) => people(p).getByRole("row").filter({ hasText: name });
const panel = (p: Page, name: string) => p.getByRole("dialog", { name: `${name}’s bookings` });

test("list: one row per active crew entry, counts from the database, You first", async ({ page }) => {
  await open(page);
  const total = Number(sql("select count(*) from crew where is_active"));
  await expect(people(page).getByRole("row").filter({ has: page.getByRole("cell") })).toHaveCount(total);
  await expect(people(page).getByRole("row").nth(1)).toContainText("(You)");
  await expect(people(page).getByRole("row").nth(1)).toContainText("Admin");
  for (const n of ["Raka Pratama", "Dinda Ayu", "Sinta Dewi"]) {
    const count = sql(`select count(*) from booking_crew bc join crew c on c.id = bc.crew_id join bookings b on b.id = bc.booking_id where c.name = '${n}' and b.booking_date >= '2026-11-10' and b.status <> 'canceled'`);
    await expect(row(page, n).getByRole("cell").nth(3)).toHaveText(count);
  }
});

test("panel: Upcoming and Past match the database; See in Booking keeps one filter", async ({ page }) => {
  await open(page);
  await row(page, "Raka Pratama").click();
  const q = (op: string) => sql(`select count(*) from booking_crew bc join crew c on c.id = bc.crew_id join bookings b on b.id = bc.booking_id where c.name = 'Raka Pratama' and b.booking_date ${op} '2026-11-10' and b.status <> 'canceled'`);
  const p = panel(page, "Raka Pratama");
  await expect(p.getByRole("tab", { name: `Upcoming (${q(">=")})` })).toBeVisible();
  await p.getByRole("tab", { name: `Past (${q("<")})` }).click();
  await expect(p.getByRole("tabpanel").getByRole("button").first()).toContainText("Rahma & Yusuf");
  await p.getByRole("button", { name: "See in Booking" }).click();
  await expect(page).toHaveURL(/\/bookings\?tab=table&crew=[0-9a-f-]{36}$/);
  await expect(page.getByText("Crew: Raka Pratama")).toBeVisible();
});

test("crew reads the list and panel; a revoked person is gone and their link says so", async ({ page }) => {
  await open(page, "crew@bs-moment.test", "crewview26");
  await expect(row(page, "Raka Pratama")).toBeVisible();
  await expect(people(page).getByRole("row").nth(1)).toContainText("(You)");
  await expect(people(page).getByRole("row").nth(1)).toContainText("Crew");
  const id = sql("select id from crew where name = 'Sinta Dewi'");
  sql("update crew set is_active = false where name = 'Sinta Dewi'");
  await page.goto(`/workspace?person=${id}`);
  await expect(page.getByRole("status").filter({ hasText: "This person is no longer in the list." })).toBeVisible();
  await expect(row(page, "Sinta Dewi")).toHaveCount(0);
  sql("update crew set is_active = true where name = 'Sinta Dewi'");
});

test("people load error → Try again; business information is not blocked", async ({ page }) => {
  await page.route("**/rest/v1/rpc/list_people*", (r) => r.abort("internetdisconnected"));
  await open(page);
  await expect(people(page).getByRole("alert")).toContainText("Couldn’t load admin & crew");
  await expect(page.getByRole("region", { name: "Business information" })).toContainText("finance@bs-moment.com");
  await page.unroute("**/rest/v1/rpc/list_people*");
  await people(page).getByRole("button", { name: "Try again" }).click();
  await expect(row(page, "Raka Pratama")).toBeVisible();
});

test("business load error → Try again; people are not blocked", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_settings*", (r) => r.abort("internetdisconnected"));
  await open(page);
  const card = page.getByRole("region", { name: "Business information" });
  await expect(card.getByRole("alert")).toContainText("Couldn’t load business information");
  await expect(row(page, "Raka Pratama")).toBeVisible();
  await page.unroute("**/rest/v1/rpc/get_settings*");
  await card.getByRole("button", { name: "Try again" }).click();
  await expect(card).toContainText("finance@bs-moment.com");
});

test("panel load error → Try again", async ({ page }) => {
  await open(page);
  await page.route("**/rest/v1/rpc/get_crew_schedule*", (r) => r.abort("internetdisconnected"));
  await row(page, "Raka Pratama").click();
  const p = panel(page, "Raka Pratama");
  await expect(p.getByRole("alert")).toContainText("Couldn’t load bookings");
  await page.unroute("**/rest/v1/rpc/get_crew_schedule*");
  await p.getByRole("button", { name: "Try again" }).click();
  await expect(p.getByRole("tabpanel").getByRole("button").first()).toContainText("Graduation · Aulia");
});

test("Show more: 20 at a time; a failed page keeps the list and can be retried", async ({ page }) => {
  const id = sql("select id from crew where name = 'Fajar Nugroho'");
  sql(`with b as (select id from bookings where booking_date < '2026-11-10' and status <> 'canceled' and id not in (select booking_id from booking_crew where crew_id = '${id}')) insert into booking_crew (workspace_id, booking_id, crew_id, position) select (select id from workspaces), id, '${id}', 9 from b`);
  const total = Number(sql(`select count(*) from booking_crew bc join bookings b on b.id = bc.booking_id where bc.crew_id = '${id}' and b.booking_date < '2026-11-10' and b.status <> 'canceled'`));
  expect(total).toBeGreaterThan(20);
  await open(page, undefined, undefined, `/workspace?person=${id}`);
  const p = panel(page, "Fajar Nugroho");
  await p.getByRole("tab", { name: `Past (${total})` }).click();
  const items = p.getByRole("tabpanel").getByRole("button").filter({ hasNotText: "Show more" });
  await expect(items).toHaveCount(20);
  await page.route("**/rest/v1/rpc/list_bookings*", (r) => r.abort("internetdisconnected"));
  await p.getByRole("button", { name: "Show more" }).click();
  await expect(p.getByRole("alert")).toContainText("Couldn’t load more.");
  await expect(items).toHaveCount(20);
  await page.unroute("**/rest/v1/rpc/list_bookings*");
  await p.getByRole("button", { name: "Show more" }).click();
  await expect(items).toHaveCount(total);
});
