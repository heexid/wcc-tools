"use client";

import { Skeleton } from "@/components/ds/Loading";
import { MetricCard } from "@/components/ds/Surfaces";
import { cn } from "@/components/ds/cn";
import { countTrend, percentTrend } from "@/lib/booking/insights";
import type { getKpis } from "@/lib/data/repo";
import { formatIDR } from "@/lib/format";

const KPI_INFO = {
  bookings: "Bookings with a booking date this month",
  outstanding: "Remaining across Partially paid bookings",
  collected: "Sum of invoices created this month",
};

type Kpis = Awaited<ReturnType<typeof getKpis>>;

/** The dashboard's three KPI cards. Desktop: equal columns. Mobile: a row that swipes sideways, edge to edge. Its
 *  skeleton keeps the loaded height, so the agenda (which opens on Today) doesn't move when the numbers land. */
export function KpiCards({ kpis, firstUse, mobile, rise }: { kpis: Kpis | null | undefined; firstUse: boolean; mobile?: boolean; rise?: (i: number) => string | undefined }) {
  const count = kpis ? countTrend(kpis.bookingsThisMonth, kpis.bookingsPrevMonth) : null;
  const collected = kpis ? percentTrend(kpis.collectedThisMonth, kpis.collectedPrevMonth) : null;
  const noData = firstUse ? "No data yet" : undefined;
  const valueSkeleton = <Skeleton className="h-[calc(var(--spacing-24)+var(--spacing-4))] w-[calc(var(--spacing-64)+var(--spacing-24))]" />;
  const card = (i: number) =>
    cn(mobile ? "w-[calc(var(--spacing-64)*4)] shrink-0 snap-start [&>div]:min-h-[calc(var(--spacing-64)+var(--spacing-4))]" : "min-w-0 flex-1", rise?.(i));
  return (
    <div
      {...(mobile && { role: "group", "aria-label": "Key metrics", tabIndex: 0 })}
      className={cn(
        "flex items-stretch",
        mobile
          ? "-mx-layout-gutter shrink-0 snap-x snap-mandatory scroll-px-layout-gutter gap-control overflow-x-auto px-layout-gutter [scrollbar-width:none] outline-none focus-visible:shadow-focus-ring"
          : "gap-base",
      )}
    >
      <MetricCard
        className={card(1)}
        label="Bookings this month"
        info={KPI_INFO.bookings}
        icon="calendar"
        value={kpis ? String(kpis.bookingsThisMonth) : valueSkeleton}
        trend={!firstUse && count?.changed ? { value: count.value, direction: count.direction, tone: count.tone } : undefined}
        period={kpis ? (noData ?? "vs last month") : undefined}
      />
      <MetricCard
        className={card(2)}
        label="Outstanding balance"
        info={KPI_INFO.outstanding}
        icon="wallet"
        value={kpis ? formatIDR(kpis.outstanding) : valueSkeleton}
        period={kpis ? (noData ?? `${kpis.outstandingCount} ${kpis.outstandingCount === 1 ? "booking" : "bookings"}`) : undefined}
      />
      <MetricCard
        className={card(3)}
        label="Collected this month"
        info={KPI_INFO.collected}
        icon="chart-analytics"
        value={kpis ? formatIDR(kpis.collectedThisMonth) : valueSkeleton}
        trend={!firstUse && collected ? collected : undefined}
        period={noData ?? (collected ? "vs last month" : undefined)}
      />
    </div>
  );
}
