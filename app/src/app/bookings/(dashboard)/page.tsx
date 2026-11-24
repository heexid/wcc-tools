"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ds/Button";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { cascade, useEntrance } from "@/components/ds/useEntrance";
import { AppShell } from "@/components/shell/AppShell";
import { useLeaveGuard } from "@/components/shell/LeaveGuard";
import { BookingTableHeader } from "@/components/bookings/BookingTableHeader";
import { BookingCalendar, initialCalendarWindow } from "@/components/bookings/BookingCalendar";
import { ActiveFilters, BookingToolbar, type View } from "@/components/bookings/BookingFilters";
import { BookingTable } from "@/components/bookings/BookingTable";
import { BookingDetail } from "@/components/bookings/BookingDetail";
import { CrewScheduleContext, CrewSchedulePopover, type CrewPopoverAnchor } from "@/components/bookings/CrewSchedule";
import { SideSheet } from "@/components/ds/SideSheet";
import { Toast, ToastRegion } from "@/components/ds/Feedback";
import { usePresence } from "@/components/ds/usePresence";
import { takeFlash } from "@/lib/flash";
import { useBookingFilters } from "@/components/bookings/useBookingFilters";
import { hasFilters, toQuery } from "@/lib/booking/filters";
import { KpiCards } from "@/components/bookings/KpiCards";
import { UpcomingRail } from "@/components/bookings/UpcomingRail";
import { buildInsights } from "@/lib/booking/insights";
import { now } from "@/lib/clock";
import { countBookings, getKpis, getUpcoming, listAllBookings, listBookings, loadFilterCatalog, type BookingQuery } from "@/lib/data/repo";
import { useCachedQuery } from "@/lib/data/useCachedQuery";
import { calendarQuery, dashboardKeys, kpiMonth, weekQuery } from "@/lib/data/dashboard-reads";
import type { Crew } from "@/lib/data/types";
import { isoToLocalDate, type ISODate } from "@/lib/format";
import { useIsReadOnly } from "@/lib/role";
import { useIsMobile } from "@/components/ds/useBreakpoint";
import { MobileBookings } from "@/components/bookings/mobile/MobileBookings";

// Figma Bookings 01 (calendar) + 02 / 16 / 18 / 25 / 26 (table) + 36 (first use) — PRD US-6–8, US-12,
// INTERACTIONS 1.1–1.10, 1.16–1.23, 1.32–1.33. Workspace: content (pad section) + 352 rail, 32 px margins.
// Calendar → BookingCalendar (F7/F8); Table, search + filters → F9 (useBookingFilters ↔ URL); detail panel
// (?booking=) → BookingDetail in a SideSheet (F12). Sections are spaced by space/group (24) in the Calendar view and space/inset (20) in the
// Table view and first use (Figma 02–36).


/** Everything the dashboard shows regardless of filters. Each read lands on its own, so a section fills in as soon
 *  as its data is in instead of waiting for the slowest read; a failed read retries by itself (useCachedQuery); a return visit opens on the cached results. The
 *  rail is desktop-only, so the mobile view skips its reads. Goes through the data layer's latency
 *  (?latency=…) so the loading state (6.3) can be held on screen. */
function useDashboardData(today: ISODate, mobile: boolean) {
  // Keys + queries shared with the server's streamed first reads (lib/data/dashboard-reads.ts).
  // Every crew member (incl. inactive — a past booking keeps their avatar) and every package.
  const catalog = useCachedQuery(() => loadFilterCatalog(), dashboardKeys.catalog);
  const count = useCachedQuery(() => countBookings(), dashboardKeys.count);
  const kpis = useCachedQuery(() => getKpis(kpiMonth(today)), dashboardKeys.kpis(today));
  const week = useCachedQuery(mobile ? null : () => listAllBookings(weekQuery(today)), mobile ? "" : dashboardKeys.week(today));
  const upcoming = useCachedQuery(mobile ? null : () => getUpcoming(7), mobile ? "" : dashboardKeys.upcoming(today));
  const crew = useMemo(() => new Map<string, Crew>(catalog?.crew.map((c) => [c.id, c])), [catalog]);
  const ready = !!catalog && count !== null && !!kpis && (mobile || (!!week && !!upcoming));
  return { catalog, crew, count, kpis, week, upcoming, ready };
}

function FirstUse({ onNew, className }: { onNew: () => void; className?: string }) {
  const readOnly = useIsReadOnly();
  return (
    <section aria-label="Bookings" className={cn("flex flex-col overflow-hidden rounded-card border border-border-default bg-surface-default", className)}>
      <BookingTableHeader />
      <div className="flex flex-col items-center gap-compact px-group py-region">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/tile-bookings.png" srcSet="/assets/tile-bookings.png 1x, /assets/tile-bookings@2x.png 2x" alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
        <h2 className="flex text-body-strong text-text-primary">
          <Txt>No bookings yet</Txt>
        </h2>
        <p className="flex text-caption text-text-secondary">
          <Txt>{readOnly ? "Bookings created by your team appear on the calendar and in this table." : "Create your first booking. It appears on the calendar and in this table right away."}</Txt>
        </p>
        {!readOnly && (
          <Button icon="plus" onClick={onNew}>
            New booking
          </Button>
        )}
      </div>
    </section>
  );
}

function Dashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { navigate } = useLeaveGuard();
  const readOnly = useIsReadOnly();
  // Below 768 the page is the mobile view (R04, Figma M01–M03); it runs its own list / agenda queries.
  const mobile = useIsMobile();
  // Fixed for the visit, so every read (and the calendar's first window) agrees on the day.
  const [today] = useState(() => isoToLocalDate(now().toISOString()));
  const data = useDashboardData(today, mobile);
  // The arrival cascade plays once per visit, then its classes go, so view swaps and re-renders never replay it.
  // Its timer starts once every dashboard read is in, as before.
  const entering = useEntrance(data.ready);
  // One-shot toast carried from another screen ("Booking canceled · BK-…" after canceling in Edit booking, US-12).
  const [flash, setFlashState] = useState<{ text: string; open: boolean } | null>(null);
  const flashPresence = usePresence(!!flash?.open);
  useEffect(() => {
    const text = takeFlash();
    if (!text) return;
    setFlashState({ text, open: true }); // eslint-disable-line react-hooks/set-state-in-effect -- sessionStorage is read once on mount
  }, []);
  useEffect(() => {
    if (!flash?.open) return;
    const t = setTimeout(() => setFlashState((f) => f && { ...f, open: false }), 4000);
    return () => clearTimeout(t);
  }, [flash]);
  const view: View = params.get("tab") === "table" ? "table" : "calendar";
  const setView = (v: View) => {
    const p = new URLSearchParams(params);
    if (v === "calendar") p.delete("tab");
    else p.set("tab", v);
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  };
  // Detail panel (F12, INTERACTIONS 1.13 / 1.18 / 1.19 / 4.4): ?booking=<id> over the list; closing keeps the
  // list's scroll and filters (only the param goes).
  const openBooking = (id: string) => {
    const p = new URLSearchParams(params);
    p.set("booking", id);
    router.replace(`${path}?${p}`, { scroll: false });
  };
  const bookingId = params.get("booking");
  const closeBooking = useCallback(() => {
    const p = new URLSearchParams(params);
    p.delete("booking");
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  }, [params, path, router]);
  const seeInCalendar = (crewId: string) => router.replace(`${path}?crew=${crewId}`, { scroll: false }); // 4.10
  const [avatarPop, setAvatarPop] = useState<(CrewPopoverAnchor & { bookingId: string }) | null>(null);
  const crewCtx = useMemo(() => ({ open: setAvatarPop, active: avatarPop }), [avatarPop]);

  const upcoming = data.upcoming ?? [];
  const { filters, update, reset } = useBookingFilters();
  // Calendar: search + status / crew / package / invoice filters; Canceled hidden unless the Status filter
  // includes it (PRD US-12, INTERACTIONS 1.33). Table: the same plus the date range, sort and paging — one page
  // from the data source (server-side sort + pagination).
  // Calendar: only the visible days (P6 range-bounded load). The first window is read from the URL the same way the
  // calendar reads it, so this query starts on the first render, in parallel with the dashboard reads, rather than
  // after the calendar mounts and reports its window. Each list query runs only for the view on screen (review P6 #3, #4).
  const [visibleRange, setVisibleRange] = useState(() => initialCalendarWindow(params, today));
  const onVisibleRange = useCallback((r: { from: ISODate; to: ISODate }) => setVisibleRange((p) => (p.from === r.from && p.to === r.to ? p : r)), []);
  const calQuery: BookingQuery | null = !mobile && view === "calendar" ? calendarQuery(filters, today, visibleRange) : null;
  const tableQuery: BookingQuery | null = !mobile && view === "table" ? { ...toQuery(filters, today, "table"), page: filters.page, pageSize: filters.size } : null;
  const calendarResult = useCachedQuery(calQuery && (() => listAllBookings(calQuery)), calQuery ? dashboardKeys.calendar(calQuery) : "");
  const calendarRows = calendarResult ?? [];
  const table = useCachedQuery(tableQuery && (() => listBookings(tableQuery)), tableQuery ? dashboardKeys.table(tableQuery) : "");
  const tableRows = table?.rows ?? [];
  const page = table?.page ?? 1;
  const pages = table?.pages ?? 1;
  // Insights only look at this week (due today, still on DP this week), so the week's rows are enough.
  const insights = useMemo(() => (data.week ? buildInsights(data.week, today, now()) : []), [data.week, today]);
  // 6.3: while the data loads the frame stays — title, filters and view switch are live; KPIs, rail, table rows and
  // calendar cells show skeletons. Each section leaves its skeleton when its own reads are in.
  const railLoading = !data.week || !data.upcoming;
  // The list needs the count (first use replaces it) and the crew (avatars) as well as its own first result, so it
  // never shows rows that first use then swaps out (no empty frame between data and rows).
  const listLoading = data.count === null || !data.catalog || (view === "calendar" ? !calendarResult : !table);
  const crewList = data.catalog?.crew ?? [];
  const packageList = data.catalog?.packages ?? [];
  const rise = (i: number) => (entering ? cascade(i) : undefined);

  // KPI cards wait for the count too: on first use their captions read "No data yet".
  const kpis = data.count !== null ? data.kpis : null;
  const firstUse = data.count === 0;

  return (
    <CrewScheduleContext.Provider value={crewCtx}>
    {mobile ? (
      <MobileBookings
        today={today}
        crew={crewList}
        packages={packageList}
        total={data.count}
        kpis={kpis}
        loading={data.count === null || !data.catalog}
        onOpen={openBooking}
        onNew={() => navigate("/bookings/new")}
      />
    ) : (
    <div data-cascade className="flex flex-1 gap-group px-section">
      <main className={cn("flex min-w-0 flex-1 flex-col py-section", firstUse || view === "table" ? "gap-inset" : "gap-group")}>
        <div className={cn("flex items-center gap-compact", rise(0))}>
          <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
            <Txt>Bookings</Txt>
          </h1>
          <span className="flex-1" />
          {/* No Package library button here (removed 2026-11-11) — Packages is reached from the app launcher. */}
          {!readOnly && (
            <Button icon="plus" onClick={() => navigate("/bookings/new")}>
              New booking
            </Button>
          )}
        </div>

        <KpiCards kpis={kpis} firstUse={firstUse} rise={rise} />

        <BookingToolbar className={rise(4)} view={view} onView={setView} filters={filters} update={update} today={today} crew={crewList} packages={packageList} />
        {!firstUse && (
          <ActiveFilters
            className={rise(5)}
            filters={filters}
            update={update}
            reset={reset}
            today={today}
            crew={crewList}
            packages={packageList}
            summary={view === "table" && hasFilters(filters) && data.count !== null && table ? `Showing ${table.total} of ${data.count} bookings` : undefined}
          />
        )}

        {firstUse ? (
          <FirstUse className={rise(6)} onNew={() => navigate("/bookings/new")} />
        ) : view === "calendar" ? (
          <BookingCalendar onVisibleRange={onVisibleRange} loading={listLoading} className={rise(6)} rows={calendarRows} crew={data.crew} today={today} onOpenBooking={openBooking} onNewBooking={(d) => navigate(`/bookings/new?date=${d}`)} />
        ) : (
          <BookingTable
            loading={listLoading}
            className={rise(6)}
            rows={tableRows}
            total={table?.total ?? 0}
            page={page}
            pages={pages}
            size={filters.size}
            sort={{ key: filters.sort, dir: filters.dir }}
            onSort={(k) => update(filters.sort === k ? { sort: k, dir: filters.dir === "asc" ? "desc" : "asc" } : { sort: k, dir: "asc" })}
            onPage={(p) => update({ page: p })}
            onOpen={openBooking}
            onReset={reset}
            onNew={() => navigate("/bookings/new")}
          />
        )}
      </main>
      <UpcomingRail loading={railLoading} className={rise(1)} upcoming={upcoming} insights={insights} today={today} onOpenBooking={openBooking} onNavigate={(href) => navigate(href)} />
    </div>
    )}
    <SideSheet open={!!bookingId} onClose={closeBooking} label="Booking detail">
      {bookingId && (
        <BookingDetail
          id={bookingId}
          mode="sheet"
          onClose={closeBooking}
          onOpenFull={(canceled) => navigate(canceled ? `/bookings/${bookingId}` : `/bookings/${bookingId}/edit`)} // ↗ full page: Edit booking, or the read-only page when Canceled (H5)
          onEdit={() => navigate(`/bookings/${bookingId}/edit`)}
          onOpenBooking={openBooking}
          onSeeInCalendar={seeInCalendar}
        />
      )}
    </SideSheet>
    <CrewSchedulePopover
      anchor={avatarPop}
      currentBookingId={avatarPop?.bookingId ?? null}
      onClose={() => setAvatarPop(null)}
      onOpenBooking={(id) => {
        setAvatarPop(null);
        openBooking(id);
      }}
      onSeeInCalendar={(crewId) => {
        setAvatarPop(null);
        seeInCalendar(crewId);
      }}
    />
    {flashPresence.mounted && (
      <ToastRegion>
        <Toast presence={flashPresence.presence}>{flash?.text}</Toast>
      </ToastRegion>
    )}
    </CrewScheduleContext.Provider>
  );
}

export default function BookingsPage() {
  return (
    <AppShell module="booking">
      <Suspense>
        <Dashboard />
      </Suspense>
    </AppShell>
  );
}
