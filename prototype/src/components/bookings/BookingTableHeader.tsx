import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import type { SortKey } from "@/lib/booking/filters";

// Figma: Booking components → Booking table/Header (Bookings 02, 36): h table/header-height, surface/header,
// pad 0/control. Columns (each pad-right 8): Booking 170 · Client 150 · Package 110 · Booking date 96 ↕ ·
// Total 106 → ↕ · Paid 106 → · Remaining 106 → ↕ · Status 104 (pad-left 12) ↕ · chevron 24.
// Sortable columns are buttons (INTERACTIONS 1.20): one column at a time, asc ⇄ desc. Unsorted / default
// order shows the ↕ icon (text/tertiary); the active column shows ↑ / ↓ in text/primary.

export const BOOKING_COLS = {
  booking: "w-[calc(var(--spacing-64)*2+var(--spacing-32)+var(--spacing-8)+var(--spacing-2))]", // 170
  client: "w-[calc(var(--spacing-64)*2+var(--spacing-16)+var(--spacing-6))]", // 150
  package: "w-[calc(var(--spacing-64)+var(--spacing-32)+var(--spacing-12)+var(--spacing-2))]", // 110
  date: "w-[calc(var(--spacing-64)+var(--spacing-32))]", // 96
  money: "w-[calc(var(--spacing-64)+var(--spacing-32)+var(--spacing-8)+var(--spacing-2))]", // 106
  status: "w-[calc(var(--spacing-64)+var(--spacing-32)+var(--spacing-8))]", // 104
  actions: "w-24",
};

type Sort = { key: SortKey | null; dir: "asc" | "desc" };

function Col({
  label,
  width,
  sortKey,
  sort,
  onSort,
  align = "start",
  className,
}: {
  label: string;
  width: string;
  sortKey?: SortKey;
  sort?: Sort;
  onSort?: (k: SortKey) => void;
  align?: "start" | "end";
  className?: string;
}) {
  const active = !!sortKey && sort?.key === sortKey;
  const icon = sortKey && (
    <Icon name={active ? "arrow-up" : "chevrons-up-down"} className={cn("size-12", active ? "text-text-primary" : "text-text-tertiary", active && sort?.dir === "desc" && "rotate-180")} />
  );
  return (
    <span
      role="columnheader"
      aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn("flex h-20 shrink-0 items-center pr-compact", align === "end" && "justify-end", width, className)}
    >
      {sortKey && onSort ? (
        <button type="button" onClick={() => onSort(sortKey)} className="flex cursor-pointer items-center gap-micro rounded-small outline-none hover:text-text-primary focus-visible:shadow-focus-ring">
          <Txt>{label}</Txt>
          {icon}
        </button>
      ) : (
        <span className="flex items-center gap-micro">
          <Txt>{label}</Txt>
          {icon}
        </span>
      )}
    </span>
  );
}

export function BookingTableHeader({ sort, onSort }: { sort?: Sort; onSort?: (k: SortKey) => void }) {
  return (
    <div role="row" className="flex h-table-header-height w-full items-center bg-surface-header px-control text-caption text-text-secondary">
      <Col label="Booking" width={BOOKING_COLS.booking} />
      <Col label="Client" width={BOOKING_COLS.client} />
      <Col label="Package" width={BOOKING_COLS.package} />
      <Col label="Booking date" width={BOOKING_COLS.date} sortKey="bookingDate" sort={sort} onSort={onSort} />
      <Col label="Total" width={BOOKING_COLS.money} align="end" sortKey="total" sort={sort} onSort={onSort} />
      <Col label="Paid" width={BOOKING_COLS.money} align="end" />
      <Col label="Remaining" width={BOOKING_COLS.money} align="end" sortKey="remaining" sort={sort} onSort={onSort} />
      <Col label="Status" width={BOOKING_COLS.status} sortKey="status" sort={sort} onSort={onSort} className="pl-control" />
      <span role="columnheader" className={cn("shrink-0", BOOKING_COLS.actions)}>
        <span className="sr-only">Open</span>
      </span>
    </div>
  );
}
