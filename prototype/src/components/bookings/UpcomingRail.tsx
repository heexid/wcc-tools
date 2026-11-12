"use client";

import { Button } from "@/components/ds/Button";
import { Icon } from "@/components/ds/Icon";
import { InsightCard } from "@/components/ds/Surfaces";
import { PaymentStatusBadge } from "@/components/ds/Badges";
import { Txt } from "@/components/ds/Txt";
import type { BookingRow } from "@/lib/data/repo";
import type { Insight } from "@/lib/booking/insights";
import { formatDowUpper, formatIDR, parseISODate } from "@/lib/format";

// Figma Bookings 01 → Rail (352, pad section/group, gap inset, left border): Upcoming heading (calendar 20
// text/accent · Heading/Section · "Next 7 days" Caption), up to 4 Upcoming items, "See all in table",
// "Needs attention" (Heading/Subsection) + Insight cards. First use (36): "Nothing scheduled in the next 7 days."
// Upcoming item: surface/subtle, 1px border, radius control, pad control, gap control; date chip 44×52
// (TODAY / weekday Text/Timestamp + day Heading/Section); name Caption Strong · package (· n items) Caption ·
// status row (badge + "Rp X due" Caption Strong, or "Lunas" status/positive).

export const RAIL_LIMIT = 4;

function UpcomingItem({ b, today, onOpen }: { b: BookingRow; today: string; onOpen: (id: string) => void }) {
  const items = b.items.length;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(b.id)}
        className="flex w-full cursor-pointer items-start gap-control rounded-control border border-border-default bg-surface-subtle p-control text-left outline-none transition-[background-color,border-color] duration-(--dur-hover) ease-(--ease-hover) hover:border-border-strong hover:bg-surface-default focus-visible:shadow-focus-ring"
      >
        <span className="flex w-[calc(var(--spacing-32)+var(--spacing-12))] shrink-0 flex-col items-center rounded-control border border-border-default bg-surface-default py-tight">
          <Txt className="text-timestamp text-text-secondary">{b.bookingDate === today ? "TODAY" : formatDowUpper(b.bookingDate)}</Txt>
          <Txt className="text-heading-section text-text-primary">{String(parseISODate(b.bookingDate).day)}</Txt>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="truncate text-caption-strong text-text-primary">{b.bookingName}</span>
          <span className="flex text-caption text-text-secondary">
            <Txt>{items ? `${b.packageNameSnapshot} · ${items} ${items === 1 ? "item" : "items"}` : b.packageNameSnapshot}</Txt>
          </span>
          <span className="flex items-center gap-tight pt-micro">
            <PaymentStatusBadge status={b.status} />
            <span className="flex-1" />
            {b.status === "paid" ? <Txt className="text-caption-strong text-status-positive">Lunas</Txt> : <Txt className="text-caption-strong text-text-primary">{`${formatIDR(b.remaining)} due`}</Txt>}
          </span>
        </span>
      </button>
    </li>
  );
}

export function UpcomingRail({
  upcoming,
  insights,
  today,
  onOpenBooking,
  onNavigate,
}: {
  upcoming: BookingRow[];
  insights: Insight[];
  today: string;
  onOpenBooking: (id: string) => void;
  onNavigate: (href: string) => void;
}) {
  const shown = upcoming.slice(0, RAIL_LIMIT);
  return (
    <aside aria-label="Upcoming and insights" className="flex w-layout-rail-width shrink-0 flex-col gap-inset border-l border-border-default bg-surface-default px-group py-section">
      <div className="flex items-center gap-compact">
        <Icon name="calendar" className="size-icon-md text-text-accent" />
        <h2 className="flex text-heading-section text-text-primary">
          <Txt>Upcoming</Txt>
        </h2>
        <span className="flex-1" />
        <Txt className="text-caption text-text-secondary">Next 7 days</Txt>
      </div>
      {shown.length ? (
        <>
          <ul className="flex flex-col gap-compact">
            {shown.map((b) => (
              <UpcomingItem key={b.id} b={b} today={today} onOpen={onOpenBooking} />
            ))}
          </ul>
          <Button variant="secondary" className="w-full" onClick={() => onNavigate("/bookings?tab=table&range=next-7-days")}>
            See all in table
          </Button>
        </>
      ) : (
        <p className="text-body text-text-tertiary">Nothing scheduled in the next 7 days.</p>
      )}
      {insights.length > 0 && (
        <>
          <h2 className="text-heading-subsection text-text-primary">Needs attention</h2>
          {insights.map((i) => (
            <InsightCard
              key={i.id}
              tone={i.tone}
              title={i.title}
              time={i.time}
              action={
                <Button variant="secondary" onClick={() => onNavigate(i.action.href)}>
                  {i.action.label}
                </Button>
              }
            >
              {i.message}
            </InsightCard>
          ))}
        </>
      )}
    </aside>
  );
}
