"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { parseFilters, writeFilters, type BookingFilters } from "@/lib/booking/filters";

const CLEARED = { q: "", range: null, from: null, to: null, status: [], crew: [], pkg: [] } satisfies Partial<BookingFilters>;

/**
 * Search + filters + sort + page for Calendar and Table, synced to the URL (PLAN §6, PRD US-8). Any
 * change other than paging returns to page 1 (INTERACTIONS 1.21: paging keeps the filters, filtering
 * restarts the list). Writes merge onto the live location so quick successive changes don't race.
 */
export function useBookingFilters() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const filters = useMemo(() => parseFilters(params), [params]);

  const update = useCallback(
    (patch: Partial<BookingFilters>) => {
      const live = new URLSearchParams(window.location.search);
      const next = { ...parseFilters(live), ...patch };
      if (!("page" in patch)) next.page = 1;
      const qs = writeFilters(next, live).toString();
      router.replace(`${path}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, path],
  );
  const reset = useCallback(() => update(CLEARED), [update]);
  return { filters, update, reset };
}
