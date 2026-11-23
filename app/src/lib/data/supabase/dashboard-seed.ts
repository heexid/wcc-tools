// The Bookings dashboard's first reads, started on the server at request time (DATA_SOURCE=supabase) and streamed
// to the browser with the page, so they run while the page's JavaScript downloads instead of after it. Same reads,
// same keys as the page (../dashboard-reads.ts), under the user's own session (RLS) from the request cookies.
// Nothing here is awaited by the render: the page shows its skeletons at once and the results follow in the stream.
import "server-only";
import { now } from "@/lib/clock";
import { isoToLocalDate } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";
import type { Seed } from "../cache";
import { dashboardKeys, defaultCalendarQuery, kpiMonth, upcomingQuery, weekQuery } from "../dashboard-reads";
import { countBookingsWith, filterCatalogWith, getKpisWith, listAllBookingsWith } from "./reads";

/** A read that never rejects: { v } or null (the browser then reads that key itself). */
const settle = (p: Promise<unknown>) =>
  p.then(
    (v) => ({ v }),
    () => null,
  );

export function dashboardSeed(): Seed {
  return (async () => {
    try {
      const sb = await supabaseServer(); // reads the request cookies: request time only
      const today = isoToLocalDate(now().toISOString());
      return {
        [dashboardKeys.catalog]: settle(filterCatalogWith(sb)),
        [dashboardKeys.count]: settle(countBookingsWith(sb)),
        [dashboardKeys.kpis(today)]: settle(getKpisWith(sb, kpiMonth(today))),
        [dashboardKeys.week(today)]: settle(listAllBookingsWith(sb, weekQuery(today))),
        [dashboardKeys.upcoming(today)]: settle(listAllBookingsWith(sb, upcomingQuery(today))),
        [dashboardKeys.calendar(defaultCalendarQuery(today))]: settle(listAllBookingsWith(sb, defaultCalendarQuery(today))),
      };
    } catch {
      return null;
    }
  })();
}
