// Crew → Admin & crew: order, "(You)", search and type filter (SHARED-DATABASE-PLAN §9, WC-3).
import type { Person } from "@/lib/data/types";
import { formatMonthYear, parseISODate } from "@/lib/format";

export type PersonType = Person["type"];
export const TYPE_LABEL: Record<PersonType, string> = { admin: "Admin", crew: "Crew", none: "No login" };
export const TYPE_OPTIONS: PersonType[] = ["admin", "crew", "none"];

export const personLabel = (p: Person) => (p.isYou ? `${p.name} (You)` : p.name);

/** The signed-in person, then admins, crew, no login; A–Z inside each group. */
export function sortPeople(people: Person[]): Person[] {
  const rank = (p: Person) => (p.isYou ? -1 : TYPE_OPTIONS.indexOf(p.type));
  return [...people].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.crewId.localeCompare(b.crewId));
}

/** Search matches name and job title, ignoring case; "you" also finds the signed-in person. */
export function filterPeople(people: Person[], search: string, type: PersonType | null): Person[] {
  const s = search.trim().toLowerCase();
  return people.filter((p) => (!type || p.type === type) && (!s || personLabel(p).toLowerCase().includes(s) || p.jobTitle.toLowerCase().includes(s)));
}

export const countLabel = (shown: number, total: number, narrowed: boolean) =>
  narrowed ? `Showing ${shown} of ${total} ${total === 1 ? "person" : "people"}` : `${total} ${total === 1 ? "person" : "people"}`;

/** Consecutive rows of the same month under one "November 2026" heading; keeps the order. */
export function groupByMonth<T extends { bookingDate: string }>(rows: T[]): { month: string; rows: T[] }[] {
  const out: { month: string; rows: T[] }[] = [];
  for (const r of rows) {
    const { y, m } = parseISODate(r.bookingDate);
    const month = formatMonthYear(y, m);
    if (out.at(-1)?.month === month) out.at(-1)!.rows.push(r);
    else out.push({ month, rows: [r] });
  }
  return out;
}
