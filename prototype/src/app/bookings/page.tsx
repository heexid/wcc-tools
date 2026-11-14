"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ds/Button";
import { MetricCard } from "@/components/ds/Surfaces";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { cascade, useEntrance } from "@/components/ds/useEntrance";
import { AppShell } from "@/components/shell/AppShell";
import { useLeaveGuard } from "@/components/shell/LeaveGuard";
import { BookingTableHeader } from "@/components/bookings/BookingTableHeader";
import { BookingCalendar } from "@/components/bookings/BookingCalendar";
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
import { UpcomingRail } from "@/components/bookings/UpcomingRail";
import { buildInsights, countTrend, percentTrend } from "@/lib/booking/insights";
import { now } from "@/lib/clock";
import { computeKpis, filterBookings, listCrew, type BookingRow } from "@/lib/data/repo";
import type { Crew, Db } from "@/lib/data/types";
import { getDb } from "@/lib/data/store";
import { addDays, formatIDR, isoToLocalDate, type ISODate } from "@/lib/format";
import { useIsViewer } from "@/lib/role";
import { Skeleton } from "@/components/ds/Loading";

// Figma Bookings 01 (calendar) + 02 / 16 / 18 / 25 / 26 (table) + 36 (first use) — PRD US-6–8, US-12,
// INTERACTIONS 1.1–1.10, 1.16–1.23, 1.32–1.33. Workspace: content (pad section) + 352 rail, 32 px margins.
// Calendar → BookingCalendar (F7/F8); Table, search + filters → F9 (useBookingFilters ↔ URL); detail panel
// (?booking=) → BookingDetail in a SideSheet (F12). Sections are spaced by space/group (24) in the Calendar view and space/inset (20) in the
// Table view and first use (Figma 02–36).


const KPI_INFO = {
  bookings: "Bookings with a booking date this month",
  outstanding: "Remaining across Partially paid bookings",
  collected: "Sum of invoices created this month",
};

function useDashboardData() {
  const [data, setData] = useState<null | { db: Db; rows: BookingRow[]; crew: Map<string, Crew>; kpis: ReturnType<typeof computeKpis>; today: ISODate }>(null);
  const load = useCallback(() => {
    // Goes through the data layer's latency (?latency=…) so the loading state (6.3) can be held on screen.
    void listCrew().then(() => {
      const d = getDb();
      const today = isoToLocalDate(now().toISOString());
      setData({ db: d, rows: filterBookings(d, {}), crew: new Map(d.crew.map((c) => [c.id, c])), kpis: computeKpis(d, today.slice(0, 7)), today });
    });
  }, []);
  useEffect(load, [load]);
  return data;
}

function FirstUse({ onNew, className }: { onNew: () => void; className?: string }) {
  const viewer = useIsViewer();
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
          <Txt>{viewer ? "Bookings created by your team appear on the calendar and in this table." : "Create your first booking. It appears on the calendar and in this table right away."}</Txt>
        </p>
        {!viewer && (
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
  const viewer = useIsViewer();
  const data = useDashboardData();
  // The arrival cascade plays once per visit, then its classes go, so view swaps and re-renders never replay it.
  const entering = useEntrance(!!data);
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

  const upcoming = useMemo(() => (data ? data.rows.filter((r) => r.status !== "canceled" && r.bookingDate >= data.today && r.bookingDate <= addDays(data.today, 6)) : []), [data]);
  const { filters, update, reset } = useBookingFilters();
  // Calendar: search + status / crew / package / invoice filters; Canceled hidden unless the Status filter
  // includes it (PRD US-12, INTERACTIONS 1.33). Table: the same plus the date range, sort and paging.
  const calendarRows = useMemo(() => (data ? filterBookings(data.db, toQuery(filters, data.today, "calendar")) : []), [data, filters]);
  const tableAll = useMemo(() => (data ? filterBookings(data.db, toQuery(filters, data.today, "table")) : []), [data, filters]);
  const pages = Math.max(1, Math.ceil(tableAll.length / filters.size));
  const page = Math.min(filters.page, pages);
  const tableRows = tableAll.slice((page - 1) * filters.size, page * filters.size);
  const insights = useMemo(() => (data ? buildInsights(data.rows, data.today, now()) : []), [data]);
  // 6.3: while the data loads the frame stays — title, filters and view switch are live; KPIs, rail, table rows and
  // calendar cells show skeletons.
  const loading = !data;
  const today = data?.today ?? isoToLocalDate(now().toISOString());
  const crewList = data ? [...data.crew.values()] : [];
  const packageList = data?.db.packages ?? [];
  const rise = (i: number) => (entering ? cascade(i) : undefined);

  const kpis = data?.kpis;
  const firstUse = !!data && data.rows.length === 0;
  const count = kpis ? countTrend(kpis.bookingsThisMonth, kpis.bookingsPrevMonth) : null;
  const collected = kpis ? percentTrend(kpis.collectedThisMonth, kpis.collectedPrevMonth) : null;
  const noData = firstUse ? "No data yet" : undefined;
  const kpiSkeleton = <Skeleton className="h-[calc(var(--spacing-24)+var(--spacing-4))] w-[calc(var(--spacing-64)+var(--spacing-24))]" />;

  return (
    <CrewScheduleContext.Provider value={crewCtx}>
    <div data-cascade className="flex flex-1 gap-group px-section">
      <main className={cn("flex min-w-0 flex-1 flex-col py-section", firstUse || view === "table" ? "gap-inset" : "gap-group")}>
        <div className={cn("flex items-center gap-compact", rise(0))}>
          <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
            <Txt>Bookings</Txt>
          </h1>
          <span className="flex-1" />
          {/* No Package library button here (removed 2026-11-11) — Packages is reached from the app launcher. */}
          {!viewer && (
            <Button icon="plus" onClick={() => navigate("/bookings/new")}>
              New booking
            </Button>
          )}
        </div>

        <div className="flex items-start gap-base">
          <MetricCard
            className={cn("min-w-0 flex-1", rise(1))}
            label="Bookings this month"
            info={KPI_INFO.bookings}
            icon="calendar"
            value={kpis ? String(kpis.bookingsThisMonth) : kpiSkeleton}
            trend={!firstUse && count?.changed ? { value: count.value, direction: count.direction, tone: count.tone } : undefined}
            period={loading ? undefined : (noData ?? "vs last month")}
          />
          <MetricCard
            className={cn("min-w-0 flex-1", rise(2))}
            label="Outstanding balance"
            info={KPI_INFO.outstanding}
            icon="wallet"
            value={kpis ? formatIDR(kpis.outstanding) : kpiSkeleton}
            period={kpis ? (noData ?? `${kpis.outstandingCount} ${kpis.outstandingCount === 1 ? "booking" : "bookings"}`) : undefined}
          />
          <MetricCard
            className={cn("min-w-0 flex-1", rise(3))}
            label="Collected this month"
            info={KPI_INFO.collected}
            icon="chart-analytics"
            value={kpis ? formatIDR(kpis.collectedThisMonth) : kpiSkeleton}
            trend={!firstUse && collected ? collected : undefined}
            period={noData ?? (collected ? "vs last month" : undefined)}
          />
        </div>

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
            summary={view === "table" && hasFilters(filters) && data ? `Showing ${tableAll.length} of ${data.rows.length} bookings` : undefined}
          />
        )}

        {firstUse ? (
          <FirstUse className={rise(6)} onNew={() => navigate("/bookings/new")} />
        ) : view === "calendar" ? (
          <BookingCalendar loading={loading} className={rise(6)} rows={calendarRows} crew={data?.crew ?? new Map()} today={today} onOpenBooking={openBooking} onNewBooking={(d) => navigate(`/bookings/new?date=${d}`)} />
        ) : (
          <BookingTable
            loading={loading}
            className={rise(6)}
            rows={tableRows}
            total={tableAll.length}
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
      <UpcomingRail loading={loading} className={rise(1)} upcoming={upcoming} insights={insights} today={today} onOpenBooking={openBooking} onNavigate={(href) => navigate(href)} />
    </div>
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
