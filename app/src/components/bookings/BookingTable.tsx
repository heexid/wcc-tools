"use client";

import { Button } from "@/components/ds/Button";
import { Icon } from "@/components/ds/Icon";
import { Pagination } from "@/components/ds/Pagination";
import { PaymentStatusBadge } from "@/components/ds/Badges";
import { openUnlessControl } from "@/components/ds/Calendar";
import { TableFooter } from "@/components/ds/Table";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import type { SortKey } from "@/lib/booking/filters";
import type { BookingRow } from "@/lib/data/repo";
import { formatDate, formatIDR, formatPhone } from "@/lib/format";
import { BOOKING_COLS, BookingTableHeader } from "./BookingTableHeader";
import { useIsViewer } from "@/lib/role";
import { Skeleton } from "@/components/ds/Loading";

// Figma Bookings 02 / 18 / 25 / 26 — Booking table (998, 1px border, radius card, clips): header, Booking
// table/Row (h 62, pad 0/control, bottom border; Hover surface/subtle), Table/Footer ("Showing 1–4 of 4
// bookings" + pagination). PRD US-7, INTERACTIONS 1.19–1.22: a row (or its chevron) opens the detail
// panel; no actions menu. No results (18, 1.5): Asset/invoice 56 · Body Strong title · Caption hint ·
// secondary Reset filters + primary New booking (pad region/group, gap compact).

const cell = "flex shrink-0 flex-col pr-compact";

/** 6.3: skeleton rows — same height and column widths as Row; the header above stays live (sort stays usable). */
function SkeletonRow() {
  return (
    <div role="row" aria-hidden className="flex h-table-row-height w-full items-center border-b border-border-default bg-surface-default px-control">
      {[BOOKING_COLS.booking, BOOKING_COLS.client, BOOKING_COLS.package, BOOKING_COLS.date, BOOKING_COLS.money, BOOKING_COLS.money, BOOKING_COLS.money, BOOKING_COLS.status].map((w, k) => (
        <span key={k} role="cell" className={cn(cell, w)}>
          <Skeleton className="h-16 w-3/4" />
          {k < 2 && <Skeleton className="h-12 w-1/2" />}
        </span>
      ))}
      <span className={cn("shrink-0", BOOKING_COLS.actions)} />
    </div>
  );
}

function Row({ b, onOpen }: { b: BookingRow; onOpen: (id: string) => void }) {
  return (
    <div
      role="row"
      onClick={openUnlessControl(() => onOpen(b.id))}
      className={cn(
        "relative flex h-table-row-height w-full items-center border-b border-border-default bg-surface-default px-control text-caption text-text-primary",
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) hover:bg-surface-subtle has-focus-visible:bg-surface-subtle",
      )}
    >
      <span role="cell" className={cn(cell, BOOKING_COLS.booking)}>
        <button
          type="button"
          onClick={() => onOpen(b.id)}
          className="cursor-pointer truncate text-left text-caption-strong outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
        >
          {b.bookingName}
        </button>
        <span className="truncate text-timestamp text-text-tertiary">{b.ref}</span>
      </span>
      <span role="cell" className={cn(cell, BOOKING_COLS.client)}>
        <span className="truncate">{b.clientName}</span>
        <span className="truncate text-timestamp text-text-tertiary">{formatPhone(b.clientPhone)}</span>
      </span>
      <span role="cell" className={cn(cell, BOOKING_COLS.package)}>
        <span className="truncate">{b.packageNameSnapshot}</span>
      </span>
      <span role="cell" className={cn(cell, BOOKING_COLS.date)}>
        {formatDate(b.bookingDate)}
      </span>
      <span role="cell" className={cn(cell, "items-end", BOOKING_COLS.money)}>
        {formatIDR(b.total)}
      </span>
      <span role="cell" className={cn(cell, "items-end text-text-secondary", BOOKING_COLS.money)}>
        {formatIDR(b.totalPaid)}
      </span>
      <span role="cell" className={cn(cell, "items-end text-caption-strong", BOOKING_COLS.money)}>
        {formatIDR(b.remaining)}
      </span>
      <span role="cell" className={cn(cell, "items-start pl-control", BOOKING_COLS.status)}>
        <PaymentStatusBadge status={b.status} />
      </span>
      <span role="cell" aria-hidden className={cn("flex shrink-0 justify-end", BOOKING_COLS.actions)}>
        <Icon name="chevron-right" className="size-icon-sm text-text-secondary" />
      </span>
    </div>
  );
}

export function BookingTable({
  className,
  rows,
  total,
  page,
  pages,
  size,
  sort,
  onSort,
  onPage,
  onOpen,
  onReset,
  onNew,
  loading,
}: {
  loading?: boolean;
  className?: string;
  rows: BookingRow[];
  total: number;
  page: number;
  pages: number;
  size: number;
  sort: { key: SortKey | null; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  onPage: (p: number) => void;
  onOpen: (id: string) => void;
  onReset: () => void;
  onNew: () => void;
}) {
  const viewer = useIsViewer();
  const first = (page - 1) * size + 1;
  return (
    <section aria-label="Bookings table" className={cn("motion-swap flex flex-col overflow-hidden rounded-card border border-border-default bg-surface-default", className)}>
      <div key={loading ? "loading" : "rows"} role="table" aria-label="Bookings" aria-rowcount={total + 1} className={cn("flex flex-col", !loading && "motion-swap")}>
        <BookingTableHeader sort={sort} onSort={onSort} />
        {loading
          ? Array.from({ length: 8 }, (_, k) => <SkeletonRow key={k} />)
          : rows.map((b) => <Row key={b.id} b={b} onOpen={onOpen} />)}
      </div>
      {loading ? (
        <TableFooter summary={<Skeleton className="h-16 w-[calc(var(--spacing-64)*3)]" />} />
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-compact px-group py-region">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/empty-invoice.png" srcSet="/assets/empty-invoice.png 1x, /assets/empty-invoice@2x.png 2x" alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
          <h2 className="flex text-body-strong text-text-primary">
            <Txt>No bookings match your search and filters</Txt>
          </h2>
          <p className="flex text-caption text-text-secondary">
            <Txt>Try a different name or phone number, or remove some filters</Txt>
          </p>
          <div className="flex gap-compact">
            <Button variant="secondary" onClick={onReset}>
              Reset filters
            </Button>
            {!viewer && (
              <Button icon="plus" onClick={onNew}>
                New booking
              </Button>
            )}
          </div>
        </div>
      ) : (
        <TableFooter summary={`Showing ${first}–${first + rows.length - 1} of ${total} ${total === 1 ? "booking" : "bookings"}`} pagination={<Pagination page={page} pages={pages} onPage={onPage} />} />
      )}
    </section>
  );
}
