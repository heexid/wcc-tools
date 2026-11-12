"use client";

import { Button } from "@/components/ds/Button";
import { CalendarDayRow, STATUS_LABEL } from "@/components/ds/Calendar";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import type { BookingStatus } from "@/components/ds/Badges";
import type { BookingRow } from "@/lib/data/repo";
import type { Crew } from "@/lib/data/types";
import { formatDayMonth, formatIDR, parseISODate, type ISODate } from "@/lib/format";
import { CrewAvatars } from "./WeekCalendar";

// Figma Bookings 20 (day), 29 (row hover · crew schedule → F12), 30 (no bookings) — PRD US-6 day,
// INTERACTIONS 1.28–1.31. Summary bar (h 45, pad control/base, gap base, surface/subtle, bottom border):
// "4 bookings" Caption Strong · "2 Draft · 1 Partially paid · 1 Paid" Caption text/secondary. Then one
// Calendar/Day row per booking (creation order) and "+ New booking on this date" (pad control/base).
// Empty: calendar 32 text/tertiary · "No bookings on Sunday, 15 Nov" Heading/Subsection · body copy ·
// primary "New booking on this date" (pad region/0, gap base, centred).

const ORDER: BookingStatus[] = ["draft", "partially_paid", "paid", "canceled"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function DayCalendar({
  rows,
  crew,
  date,
  onOpenBooking,
  onNewBooking,
}: {
  rows: BookingRow[];
  crew: Map<string, Crew>;
  date: ISODate;
  onOpenBooking: (id: string) => void;
  onNewBooking: (d: ISODate) => void;
}) {
  const list = rows.filter((r) => r.bookingDate === date);
  const n = list.length;

  if (!n)
    return (
      <div className="flex flex-col items-center gap-base py-region">
        <Icon name="calendar" className="size-32 text-text-tertiary" />
        <h3 className="flex text-heading-subsection text-text-primary">
          <Txt>{`No bookings on ${DAYS_LONG[parseISODate(date).dow]}, ${formatDayMonth(date)}`}</Txt>
        </h3>
        <p className="flex text-body text-text-secondary">
          <Txt>Nothing is scheduled for this date with the current filters.</Txt>
        </p>
        <Button icon="plus" onClick={() => onNewBooking(date)}>
          New booking on this date
        </Button>
      </div>
    );

  const counts = ORDER.map((s) => [s, list.filter((r) => r.status === s).length] as const).filter(([, c]) => c > 0);
  return (
    <div className="flex flex-col">
      <div role="status" className="flex items-start gap-base border-b border-border-default bg-surface-subtle px-base py-control">
        <Txt className="text-caption-strong text-text-primary">{`${n} ${n === 1 ? "booking" : "bookings"}`}</Txt>
        <Txt className="text-caption text-text-secondary">{counts.map(([s, c]) => `${c} ${STATUS_LABEL[s]}`).join(" · ")}</Txt>
      </div>
      <ul aria-label="Bookings on this date" className="flex flex-col">
        {list.map((b) => (
          <li key={b.id}>
            <CalendarDayRow
              status={b.status}
              name={b.bookingName}
              sub={`${b.packageNameSnapshot} · ${b.clientName}`}
              crew={b.crewIds.length ? <CrewAvatars ids={b.crewIds} crew={crew} bookingId={b.id} /> : undefined}
              total={formatIDR(b.total)}
              remaining={formatIDR(b.remaining)}
              onOpen={() => onOpenBooking(b.id)}
            />
          </li>
        ))}
      </ul>
      <div className="flex px-base py-control">
        <Button variant="ghost" icon="plus" onClick={() => onNewBooking(date)}>
          New booking on this date
        </Button>
      </div>
    </div>
  );
}
