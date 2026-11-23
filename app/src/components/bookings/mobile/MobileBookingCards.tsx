"use client";

import { PaymentStatusBadge } from "@/components/ds/Badges";
import { STATUS_TONE } from "@/components/ds/Calendar";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import type { BookingRow } from "@/lib/data/repo";
import { formatDate, formatIDR } from "@/lib/format";
import { prefetchBooking } from "@/lib/data/prefetch";

// Figma: Booking components › Mobile/Booking list item (206:55829) — replaces Booking table/Row below 768 (M01).
// Card: surface/default, 1px border/default, radius card, pad base (16, mobile cards 2026-11-23), gap tight (6).
// Top: ref Text/Caption text/secondary · Payment status badge (gap compact). Main: booking name + remaining, Body
// Strong. Meta: date · client + "remaining" / "paid in full", Text/Caption text/secondary. Whole card is the tap target.
export function MobileBookingCard({ row, onOpen }: { row: BookingRow; onOpen: (id: string) => void }) {
  const settled = row.status === "paid";
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      onPointerDown={() => prefetchBooking(row.id)}
      aria-label={`${row.bookingName}, ${row.ref}`}
      className="flex w-full cursor-pointer flex-col gap-tight rounded-card border border-border-default bg-surface-default p-base text-left outline-none transition-[background-color,transform] duration-(--dur-hover) ease-(--ease-hover) focus-visible:shadow-focus-ring active:scale-(--press-scale) active:bg-surface-subtle active:duration-(--dur-press) active:ease-(--ease-out)"
    >
      <span className="flex items-center gap-compact">
        <Txt className="min-w-0 flex-1 truncate text-caption text-text-secondary">{row.ref}</Txt>
        <PaymentStatusBadge status={row.status} info={false} />
      </span>
      <span className="flex items-center gap-compact">
        <Txt className="min-w-0 flex-1 truncate text-body-strong text-text-primary">{row.bookingName}</Txt>
        <Txt className="shrink-0 text-body-strong text-text-primary">{formatIDR(row.remaining)}</Txt>
      </span>
      <span className="flex gap-compact">
        <Txt className="min-w-0 flex-1 truncate text-caption text-text-secondary">
          {formatDate(row.bookingDate)} · {row.clientName}
        </Txt>
        <Txt className="shrink-0 text-caption text-text-secondary">{settled ? "paid in full" : "remaining"}</Txt>
      </span>
    </button>
  );
}

// Figma: Booking components › Mobile/Agenda item (206:56376) — Calendar/Day row at 358 (M03).
// Row: pad base (16), gap control, bottom divider border/default (none on the last row of a day card).
// 4×(row) status bar radius 2 · title Body Strong + payment badge / package · client Caption secondary /
// total Caption Strong + "Remaining Rp …" Timestamp secondary (right) · chevron-right 16.
export function MobileAgendaItem({ row, onOpen }: { row: BookingRow; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(row.id)}
      onPointerDown={() => prefetchBooking(row.id)}
      aria-label={`${row.bookingName}, ${row.ref}`}
      className="flex w-full cursor-pointer items-center gap-control border-b border-border-default p-base text-left outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) last:border-b-0 focus-visible:bg-surface-subtle active:bg-surface-subtle"
    >
      <span aria-hidden className={cn("w-4 self-stretch shrink-0 rounded-2", STATUS_TONE[row.status].bar)} />
      <span className="flex min-w-0 flex-1 flex-col gap-micro">
        <span className="flex items-center gap-compact">
          <Txt className="min-w-0 flex-1 truncate text-body-strong text-text-primary">{row.bookingName}</Txt>
          <PaymentStatusBadge status={row.status} info={false} />
        </span>
        <Txt className="truncate text-caption text-text-secondary">
          {row.packageNameSnapshot} · {row.clientName}
        </Txt>
        <span className="flex items-center gap-compact">
          <Txt className="min-w-0 flex-1 text-caption-strong text-text-primary">{formatIDR(row.total)}</Txt>
          <Txt className="shrink-0 text-timestamp text-text-secondary">{row.status === "paid" ? "Paid in full" : `Remaining ${formatIDR(row.remaining)}`}</Txt>
        </span>
      </span>
      <Icon name="chevron-right" className="size-icon-sm shrink-0 text-text-secondary" />
    </button>
  );
}
