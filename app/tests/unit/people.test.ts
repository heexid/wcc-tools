import { describe, expect, it } from "vitest";
import { countLabel, filterPeople, groupByMonth, personLabel, sortPeople } from "@/lib/booking/people";
import { listPeople } from "@/lib/data/repo";
import type { Person } from "@/lib/data/types";

const p = (name: string, type: Person["type"], extra: Partial<Person> = {}): Person => ({ crewId: name, name, jobTitle: "", type, isYou: false, upcomingCount: 0, ...extra });
const list = [p("zed", "none"), p("Raka", "crew", { jobTitle: "Videographer" }), p("bima", "crew"), p("Ana", "admin"), p("Me", "crew", { isYou: true })];
const names = (x: Person[]) => x.map((y) => y.name);

describe("people list", () => {
  it("orders You, admins, crew, no login; A–Z ignoring case", () => expect(names(sortPeople(list))).toEqual(["Me", "Ana", "bima", "Raka", "zed"]));
  it("labels only the signed-in person", () => expect([personLabel(list[4]), personLabel(list[0])]).toEqual(["Me (You)", "zed"]));
  it("searches name, job title and you", () => {
    expect(names(filterPeople(list, " RAK ", null))).toEqual(["Raka"]);
    expect(names(filterPeople(list, "video", null))).toEqual(["Raka"]);
    expect(names(filterPeople(list, "you", null))).toEqual(["Me"]);
    expect(filterPeople(list, "  ", null)).toHaveLength(5);
  });
  it("combines search and type", () => {
    expect(names(filterPeople(list, "", "crew"))).toEqual(["Raka", "bima", "Me"]);
    expect(filterPeople(list, "raka", "admin")).toEqual([]);
  });
  it("groups by month and year, keeping the order", () =>
    expect(groupByMonth(["2026-12-05", "2026-12-01", "2026-11-30", "2025-11-30"].map((bookingDate) => ({ bookingDate }))).map((g) => `${g.month}:${g.rows.length}`)).toEqual(["December 2026:2", "November 2026:1", "November 2025:1"]));
  it("counts", () => {
    expect(countLabel(7, 7, false)).toBe("7 people");
    expect(countLabel(1, 1, false)).toBe("1 person");
    expect(countLabel(0, 7, true)).toBe("Showing 0 of 7 people");
  });
  it("mock: Figma WC1 counts, no email or user id", async () => {
    const rows = sortPeople(await listPeople());
    expect(rows.map((r) => `${personLabel(r)} · ${r.type} · ${r.upcomingCount}`)).toEqual([
      "bs.moment (You) · admin · 0", "Bima Saputra · crew · 5", "Dinda Ayu · crew · 6", "Nadia Putri · crew · 4", "Raka Pratama · crew · 5", "Fajar Nugroho · none · 3", "Sinta Dewi · none · 2",
    ]);
    expect(Object.keys(rows[0]).sort()).toEqual(["crewId", "isYou", "jobTitle", "name", "type", "upcomingCount"]);
  });
});
