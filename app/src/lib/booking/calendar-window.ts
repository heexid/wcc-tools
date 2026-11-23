// Which days the Bookings calendar shows, from its URL (`view=day|week`, `date=YYYY-MM-DD`). Pure — shared by the
// calendar, the page (starts the calendar read on its first render) and the server (streams the first read).
import { addDays, parseISODate, toISODate, type ISODate } from "@/lib/format";

export type CalendarRange = "month" | "week" | "day";
type Params = { get(k: string): string | null };

export const isISO = (v: string | null): v is ISODate => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const rangeOf = (params: Params): CalendarRange => (params.get("view") === "week" ? "week" : params.get("view") === "day" ? "day" : "month");

/** The 42 dates (6 Mon-first weeks) shown for the anchor's month. */
export function monthGrid(anchor: string): ISODate[] {
  const { y, m } = parseISODate(anchor);
  const first = toISODate(y, m, 1);
  const lead = (parseISODate(first).dow + 6) % 7; // Mon = 0
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
}

/** Monday of the anchor's week. */
export const weekStartOf = (d: string): ISODate => addDays(d, -((parseISODate(d).dow + 6) % 7));

/** The days on screen for a range + anchor: the month grid incl. outside days, the week, or the day. */
export function windowOf(range: CalendarRange, anchor: ISODate): { from: ISODate; to: ISODate } {
  if (range === "month") {
    const grid = monthGrid(anchor);
    return { from: grid[0], to: grid[41] };
  }
  if (range === "week") return { from: weekStartOf(anchor), to: addDays(weekStartOf(anchor), 6) };
  return { from: anchor, to: anchor };
}

/** The window the calendar opens on, read from the URL the way the calendar reads it. */
export function initialCalendarWindow(params: Params, today: ISODate) {
  const d = params.get("date");
  return windowOf(rangeOf(params), isISO(d) ? d : today);
}
