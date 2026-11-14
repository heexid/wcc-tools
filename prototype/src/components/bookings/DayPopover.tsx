"use client";

import { useEffect, useId, useRef, type CSSProperties, type Ref } from "react";
import { Button } from "@/components/ds/Button";
import { PaymentStatusBadge } from "@/components/ds/Badges";
import { STATUS_TONE } from "@/components/ds/Calendar";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import type { Presence } from "@/components/ds/usePresence";
import type { BookingRow } from "@/lib/data/repo";
import { formatDateWithDay, formatDayMonth, type ISODate } from "@/lib/format";
import { useIsViewer } from "@/lib/role";

// Figma Bookings 17 · "Day popover" (also Week overflow 31 → F8): 360 wide, pad popover/inset (6) inside a
// 1px border, gap tight, surface/default, radius card, Shadow/Floating.
// Head (pad tight/compact): "Sat, 14 Nov 2026" Body Strong · spacer · "4 bookings" Caption text/secondary.
// Rows (pad compact, gap compact, surface/subtle, radius control): 3×28 status bar · name Caption Strong /
// "Package · Client" Timestamp text/secondary · Payment status badge. Footer (top border, pad micro,
// space-between): ghost "+ New booking on 14 Nov" · ghost calendar "Open day view".

/** Popover width (Figma 360) — mirrors the class below; MonthCalendar uses it to keep it on the card. */
export const DAY_POPOVER_WIDTH = 360;

export function DayPopover({
  ref,
  date,
  bookings,
  presence,
  instant,
  style,
  onOpenBooking,
  onNew,
  onOpenDay,
}: {
  ref?: Ref<HTMLDivElement>;
  date: ISODate;
  bookings: BookingRow[];
  presence: Presence;
  /** Opened from the keyboard → no entrance (motion.css .motion-popover[data-instant]). */
  instant?: boolean;
  style?: CSSProperties;
  onOpenBooking: (id: string) => void;
  onNew: (d: ISODate) => void;
  onOpenDay: (d: ISODate) => void;
}) {
  const titleId = useId();
  const viewer = useIsViewer();
  const listRef = useRef<HTMLUListElement>(null);
  const n = bookings.length;

  // Focus moves into the popover (first booking) when it opens; Esc / outside click return it (useDismiss).
  useEffect(() => {
    const id = requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>("button")?.focus());
    return () => cancelAnimationFrame(id);
  }, [date]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      {...presence}
      data-instant={instant || undefined}
      style={style}
      className="motion-popover absolute z-20 flex w-[calc(var(--spacing-64)*5+var(--spacing-32)+var(--spacing-8))] flex-col gap-tight rounded-card border border-border-default bg-surface-default p-popover-inset shadow-floating"
    >
      <div id={titleId} className="flex w-full items-center px-compact py-tight">
        <Txt className="text-body-strong text-text-primary">{formatDateWithDay(date)}</Txt>
        <span className="flex-1" />
        <Txt className="text-caption text-text-secondary">{`${n} ${n === 1 ? "booking" : "bookings"}`}</Txt>
      </div>
      <ul ref={listRef} className="flex max-h-[calc(var(--spacing-64)*7)] flex-col gap-tight overflow-y-auto">
        {bookings.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => onOpenBooking(b.id)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-compact rounded-control bg-surface-subtle p-compact text-left outline-none",
                "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) hover:bg-surface-header focus-visible:shadow-focus-ring",
              )}
            >
              <span aria-hidden className={cn("h-[calc(var(--spacing-24)+var(--spacing-4))] w-[calc(var(--spacing-6)/2)] shrink-0 rounded-2", STATUS_TONE[b.status].bar)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-caption-strong text-text-primary">{b.bookingName}</span>
                <span className="truncate text-timestamp text-text-secondary">{`${b.packageNameSnapshot} · ${b.clientName}`}</span>
              </span>
              <PaymentStatusBadge status={b.status} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex w-full items-start justify-between border-t border-border-default p-micro">
        {viewer ? (
          <span aria-hidden />
        ) : (
          <Button variant="ghost" icon="plus" onClick={() => onNew(date)}>
            {`New booking on ${formatDayMonth(date)}`}
          </Button>
        )}
        <Button variant="ghost" icon="calendar" onClick={() => onOpenDay(date)}>
          Open day view
        </Button>
      </div>
    </div>
  );
}
