import { expect, test, type Page } from "@playwright/test";
import { signIn } from "../helpers/session";

// F9 — Table + search + filters: PRD US-7, US-8; INTERACTIONS 1.4–1.10, 1.17–1.22, 1.33; lanes C and D.

test.beforeEach(async ({ page }) => signIn(page));

const table = (p: Page) => p.getByRole("table", { name: "Bookings" });
const names = (p: Page) => table(p).getByRole("row").locator("button").filter({ hasNotText: /^(Booking date|Total|Remaining|Status)$/ });
const chips = (p: Page) => p.getByRole("list", { name: "Active filters" }).getByRole("listitem");

async function open(page: Page, q = "?tab=table") {
  await page.goto(`/bookings${q}`);
  await expect(page.getByRole("tab", { name: "Table", exact: true })).toHaveAttribute("aria-selected", "true");
}

test("lane C: Calendar → Table; default order is upcoming first, then past (1.20, PRD US-7)", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("tab", { name: "Table", exact: true }).click();
  await expect(page).toHaveURL(/tab=table/);
  await expect(names(page).first()).toHaveText("Graduation · Aulia");
  await expect(names(page).nth(3)).toHaveText("Prewedding · Nadia & Fajar");
  await expect(page.getByText("Showing 1–10 of 40 bookings")).toBeVisible();
  await page.getByRole("button", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(names(page).nth(5)).toHaveText("Wedding · Maya & Teguh"); // 16th and last upcoming booking
  await expect(names(page).nth(6)).toHaveText("Birthday · Kenzo"); // then past, newest first (7 Nov)
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=3/);
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page).toHaveURL(/page=4/);
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await expect(names(page).last()).toHaveText("Wedding · Anisa & Rudi"); // oldest past booking last
});

test("search debounces 250 ms, matches phone, × clears (1.4)", async ({ page }) => {
  await open(page);
  const box = page.getByRole("searchbox", { name: "Search bookings" });
  await box.fill("kenzo");
  await expect(page).not.toHaveURL(/q=/); // debounced
  await expect(page).toHaveURL(/q=kenzo/);
  await expect(names(page)).toHaveText(["Birthday · Kenzo"]);
  await box.fill("0812 7788");
  await expect(names(page)).toHaveText(["Graduation · Aulia"]);
  await page.getByRole("button", { name: "Clear search text" }).click();
  await expect(page).not.toHaveURL(/q=/);
});

test("no results → Reset filters / New booking (1.5)", async ({ page }) => {
  await open(page, "?tab=table&q=zzzz&status=paid");
  await expect(page.getByText("No bookings match your search and filters")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).not.toHaveURL(/q=|status=/);
  await expect(page.getByRole("searchbox", { name: "Search bookings" })).toHaveValue("");
  await open(page, "?tab=table&q=zzzz");
  await page.getByRole("table", { name: "Bookings" }).locator("..").getByRole("button", { name: "New booking", exact: true }).click();
  await expect(page).toHaveURL(/\/bookings\/new$/);
});

test("Status / Package dropdowns: check, Clear, Apply → chips (1.6, 1.8, 1.33)", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Status: All status" }).click();
  const dlg = page.getByRole("dialog", { name: "Status" });
  await dlg.getByLabel("Canceled").check();
  await expect(dlg).toContainText("1 selected");
  await dlg.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/status=canceled/);
  await expect(names(page)).toHaveText(["Prewedding · Yuni & Arif"]); // Canceled always reachable in the Table
  await expect(chips(page)).toHaveText(["Status: Canceled"]);
  await page.getByRole("button", { name: "Status: Canceled", exact: true }).click();
  await page.getByRole("dialog", { name: "Status" }).getByRole("button", { name: "Clear" }).click();
  await page.getByRole("dialog", { name: "Status" }).getByRole("button", { name: "Apply" }).click();
  await expect(page).not.toHaveURL(/status=/);

  await page.getByRole("button", { name: "Package: All packages" }).click();
  await page.getByRole("dialog", { name: "Package" }).getByRole("textbox").fill("plat");
  await page.getByRole("dialog", { name: "Package" }).getByLabel("Platinum Package").check();
  await page.getByRole("dialog", { name: "Package" }).getByRole("button", { name: "Apply" }).click();
  await expect(chips(page)).toHaveText(["Package: Platinum Package"]);
  await expect(page.getByText("1 filter ·")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Invoice type/ })).toHaveCount(0); // invoice-type filter removed
});

test("Crew dropdown (02b): search, check two, Apply → “2 crew” + chip; Esc discards a draft (1.7)", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Crew: All crew" }).click();
  const dlg = page.getByRole("dialog", { name: "Crew" });
  await dlg.getByRole("textbox", { name: "Search crew" }).fill("graph"); // matches roles too
  await expect(dlg.getByRole("listitem")).toHaveText([/Raka Pratama/, /Dinda Ayu/, /Bima Saputra/]);
  await dlg.getByLabel(/Raka Pratama/).check();
  await dlg.getByRole("textbox", { name: "Search crew" }).fill("");
  await dlg.getByLabel(/Dinda Ayu/).check();
  await dlg.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("button", { name: "Crew: 2 crew" })).toBeVisible();
  await expect(chips(page)).toHaveText(["Crew: Raka Pratama, Dinda Ayu"]);
  await page.getByRole("button", { name: "Crew: 2 crew" }).click();
  await page.getByRole("dialog", { name: "Crew" }).getByLabel(/Bima Saputra/).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Crew: 2 crew" })).toBeFocused();
  await expect(page).toHaveURL(/crew=crew_rp%2Ccrew_da|crew=crew_rp,crew_da/);
});

test("Date filter (16): presets and a custom range (1.9)", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Booking date: All dates" }).click();
  const dlg = page.getByRole("dialog", { name: "Booking date" });
  await dlg.getByRole("button", { name: "This month" }).click();
  await expect(dlg).toContainText("1 Nov – 30 Nov 2026");
  await expect(dlg.getByRole("gridcell", { name: "2026-11-10" })).toHaveAttribute("aria-selected", "true");
  await dlg.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/range=this-month/);
  await expect(chips(page)).toHaveText(["Nov 2026"]);
  await expect(page.getByText("Showing 19 of 40 bookings")).toBeVisible();
  await page.getByRole("button", { name: "Booking date: This month" }).click();
  await dlg.getByRole("gridcell", { name: "2026-11-14" }).click();
  await dlg.getByRole("gridcell", { name: "2026-11-12" }).click();
  await expect(dlg).toContainText("12 Nov – 14 Nov 2026");
  await dlg.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/range=custom&from=2026-11-12&to=2026-11-14/);
  await expect(chips(page)).toHaveText(["12 Nov – 14 Nov 2026"]);
  await expect(table(page).getByRole("row")).toHaveCount(6); // header + Sari + 4 on 14 Nov
});

test("chip × removes one filter, Reset all removes all (1.10); filters are shared with the Calendar", async ({ page }) => {
  // An old link's `type=` (retired invoice-type filter) is ignored and dropped from the URL on the next change.
  await open(page, "?tab=table&q=wedding&range=this-month&status=partially_paid&crew=crew_rp,crew_da&type=dp");
  await expect(page.getByText("3 filters ·")).toBeVisible();
  await expect(chips(page)).toHaveText(["Nov 2026", "Status: Partially paid", "Crew: Raka Pratama, Dinda Ayu"]);
  await expect(page.getByRole("button", { name: /Invoice type/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove filter Nov 2026" }).click();
  await expect(page).not.toHaveURL(/type=|range=/);
  await expect(chips(page)).toHaveCount(2);
  // Calendar shares search + filters (the date range is Table-only).
  await page.getByRole("tab", { name: "Calendar", exact: true }).click();
  await expect(page).toHaveURL(/q=wedding/);
  await expect(page.getByRole("grid", { name: "Month" }).getByRole("button", { name: /, (Draft|Partially paid|Paid)$/ })).toHaveCount(5); // incl. 5 Dec (outside month)
  await page.getByRole("button", { name: "Reset all" }).click();
  await expect(page).not.toHaveURL(/q=|status=|crew=|range=/);
  await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);
});

test("sort: one column at a time, asc ⇄ desc, keeps filters (1.20); paging keeps filters (1.21)", async ({ page }) => {
  await open(page, "?tab=table&status=partially_paid");
  await page.getByRole("button", { name: "Remaining" }).click();
  await expect(page).toHaveURL(/sort=remaining/);
  await expect(table(page).getByRole("columnheader", { name: "Remaining" })).toHaveAttribute("aria-sort", "ascending");
  await page.getByRole("button", { name: "Remaining" }).click();
  await expect(page).toHaveURL(/dir=desc/);
  await expect(names(page).first()).toHaveText("Wedding · Laras & Bima"); // Rp 13.125.000
  await page.getByRole("button", { name: "Total" }).click();
  await expect(table(page).getByRole("columnheader", { name: "Remaining" })).not.toHaveAttribute("aria-sort", /.+/);
  await expect(page).toHaveURL(/status=partially_paid/);
  await page.getByRole("button", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/status=partially_paid/);
  await expect(page).toHaveURL(/sort=total/);
});

test("row → detail param, no actions menu (1.19, 1.22)", async ({ page }) => {
  await open(page);
  await expect(table(page).getByRole("button", { name: /actions|more/i })).toHaveCount(0);
  await table(page).getByRole("row").nth(1).click({ position: { x: 900, y: 30 } });
  await expect(page).toHaveURL(/booking=/);
});

test("lane D: See all in table → 25, View bookings → 26 (1.17, 1.18)", async ({ page }) => {
  await page.goto("/bookings");
  await page.getByRole("button", { name: "See all in table" }).click();
  await expect(page).toHaveURL(/tab=table&range=next-7-days/);
  await expect(chips(page)).toHaveText(["Next 7 days"]);
  await expect(names(page)).toHaveCount(7);
  await page.goto("/bookings");
  await page.getByRole("button", { name: "View bookings", exact: true }).click();
  await expect(page).toHaveURL(/range=this-week&status=partially_paid$/);
  await expect(names(page)).toHaveText(["Graduation · Aulia", "Wedding · Sari & Dimas", "Prewedding · Nadia & Fajar"]);
});
