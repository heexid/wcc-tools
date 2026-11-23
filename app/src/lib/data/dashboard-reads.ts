// The Bookings dashboard's reads and their cache keys (./cache.ts), in one place: the page reads them in the
// browser, and with DATA_SOURCE=supabase the server starts the same reads under the same keys and streams them in
// (./supabase/dashboard-seed.ts) — so a key computed on either side always means the same query.
import { initialCalendarWindow } from "@/lib/booking/calendar-window";
import { parseFilters, toQuery, type BookingFilters } from "@/lib/booking/filters";
import { weekStart } from "@/lib/booking/insights";
import { addDays, type ISODate } from "@/lib/format";
import type { BookingQuery } from "./repo";

export const dashboardKeys = {
  catalog: "bookings:catalog",
  count: "bookings:count",
  kpis: (today: ISODate) => `bookings:kpis:${today}`,
  week: (today: ISODate) => `bookings:week:${weekStart(today)}`,
  upcoming: (today: ISODate) => `bookings:upcoming:${today}`,
  calendar: (q: BookingQuery) => `bookings:all:${JSON.stringify(q)}`,
  table: (q: BookingQuery) => `bookings:page:${JSON.stringify(q)}`,
};

/** KPIs are for the month of `today`. */
export const kpiMonth = (today: ISODate) => today.slice(0, 7);
/** This week, Monday–Sunday (the rail's insights). */
export const weekQuery = (today: ISODate): BookingQuery => ({ from: weekStart(today), to: addDays(weekStart(today), 6) });
/** The next 7 days from today, as the calendar shows them (getUpcoming(7)). */
export const upcomingQuery = (today: ISODate): BookingQuery => ({ view: "calendar", from: today, to: addDays(today, 6) });
/** The calendar's read: its filters + the days on screen. */
export const calendarQuery = (filters: BookingFilters, today: ISODate, window: { from: ISODate; to: ISODate }): BookingQuery => ({
  ...toQuery(filters, today, "calendar"),
  ...window,
});
/** The calendar a plain /bookings opens on (no filters, this month) — the one the server streams. */
export const defaultCalendarQuery = (today: ISODate): BookingQuery => {
  const none = new URLSearchParams();
  return calendarQuery(parseFilters(none), today, initialCalendarWindow(none, today));
};
