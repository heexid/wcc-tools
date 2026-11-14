"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { CalendarBookingChip, CalendarDayCell, CalendarMore, type DayCellState } from "@/components/ds/Calendar";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { useDismiss } from "@/components/shell/useDismiss";
import type { BookingRow } from "@/lib/data/repo";
import { addDays, formatDateLongDay, parseISODate, toISODate, type ISODate } from "@/lib/format";
import { DayPopover, DAY_POPOVER_WIDTH } from "./DayPopover";
import { useIsViewer } from "@/lib/role";
import { Skeleton } from "@/components/ds/Loading";

// Figma Bookings 01 (month) + 17 ("+N more" popover, empty-date hover) — PRD US-6, §4.5 (keyboard grid),
// INTERACTIONS 1.11–1.15. Weekdays row (h 36, surface/header, Caption text/secondary, pad compact) + 6 week
// rows of 7 Calendar/Day cells (Mon-first). Up to 3 chips per day, then "+N more" → day popover.
// Keyboard: the grid has one tab stop (the anchor date). ← → ±1 day · ↑ ↓ ±1 week · Home / End week start /
// end · PageUp / PageDown ±1 month · Enter / Space: day popover (bookings) or New booking (empty date).

export const CHIP_LIMIT = 3;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STATUS_TEXT = { draft: "Draft", partially_paid: "Partially paid", paid: "Paid", canceled: "Canceled" } as const;

/** The 42 dates (6 Mon-first weeks) shown for the anchor's month. */
export function monthGrid(anchor: string): ISODate[] {
  const { y, m } = parseISODate(anchor);
  const first = toISODate(y, m, 1);
  const lead = (parseISODate(first).dow + 6) % 7; // Mon = 0
  return Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
}

/** Same day-of-month in the month `delta` away, clamped to that month's length. */
export function shiftMonth(d: string, delta: number): ISODate {
  const { y, m, day } = parseISODate(d);
  const last = parseISODate(toISODate(y, m + delta + 1, 0)).day;
  return toISODate(y, m + delta, Math.min(day, last));
}

type Pop = { date: ISODate; left: number; top?: number; bottom?: number; origin: string; instant: boolean };

export function MonthCalendar({
  rows,
  today,
  anchor,
  onAnchor,
  onOpenBooking,
  onNewBooking,
  onOpenDay,
  loading,
}: {
  loading?: boolean;
  rows: BookingRow[];
  today: ISODate;
  anchor: ISODate;
  onAnchor: (d: ISODate) => void;
  onOpenBooking: (id: string) => void;
  onNewBooking: (d: ISODate) => void;
  onOpenDay: (d: ISODate) => void;
}) {
  const viewer = useIsViewer();
  const days = useMemo(() => monthGrid(anchor), [anchor]);
  const month = anchor.slice(0, 7);
  const byDate = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const r of rows) map.set(r.bookingDate, [...(map.get(r.bookingDate) ?? []), r]); // rows arrive date + creation ordered
    return map;
  }, [rows]);

  const rootRef = useRef<HTMLDivElement>(null);
  const cells = useRef(new Map<string, HTMLDivElement>());
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);

  const [pop, setPop] = useState<Pop | null>(null);
  const [shown, setShown] = useState<Pop | null>(null); // last popover, kept while it animates out
  if (pop && pop !== shown) setShown(pop);
  const { mounted, presence } = usePresence(!!pop);
  const close = () => setPop(null);
  useDismiss(!!pop, close, { panel: panelRef, trigger: triggerRef });

  // Keyboard moved the anchor → focus the new tab stop once it has rendered.
  useEffect(() => {
    if (!focusNext.current) return;
    focusNext.current = false;
    cells.current.get(anchor)?.focus();
  }, [anchor]);

  const openDay = (date: ISODate, viaKeyboard = false) => {
    const cell = cells.current.get(date), root = rootRef.current;
    if (!cell || !root) return;
    const c = cell.getBoundingClientRect(), r = root.getBoundingClientRect();
    const row = Math.floor(days.indexOf(date) / 7);
    // Left-aligned with the day, kept a compact (8) margin inside the card's outer edge — the grid sits
    // inside the card's 1px border, hence − 1 (Figma 17: 14 Nov → x 663, right edge 1023).
    const margin = parseFloat(getComputedStyle(root).getPropertyValue("--spacing-compact")) - 1;
    const left = Math.min(c.left - r.left, r.width - margin - DAY_POPOVER_WIDTH);
    const originX = c.left - r.left - left + (c.width / 2);
    // Opens below the day; from the 4th week up it opens above so it stays on the card.
    const below = row < 3;
    triggerRef.current = cell; // opening the popover doesn't move the selection (Figma 17: 12 stays Selected)
    setPop(below ? { date, left, top: c.bottom - r.top, origin: `${originX}px top`, instant: viaKeyboard } : { date, left, bottom: r.bottom - c.top, origin: `${originX}px bottom`, instant: viaKeyboard });
  };

  const onKey = (e: KeyboardEvent, date: ISODate) => {
    const { dow } = parseISODate(date);
    const mon = (dow + 6) % 7;
    const to: Record<string, () => ISODate> = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => addDays(date, -mon),
      End: () => addDays(date, 6 - mon),
      PageUp: () => shiftMonth(date, -1),
      PageDown: () => shiftMonth(date, 1),
    };
    if (to[e.key]) {
      e.preventDefault();
      focusNext.current = true;
      onAnchor(to[e.key]());
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
      e.preventDefault();
      if (byDate.get(date)?.length) openDay(date, true);
      else if (!viewer) onNewBooking(date);
    }
  };

  const stateOf = (d: ISODate): DayCellState => (d === today ? "today" : d.slice(0, 7) !== month ? "outside" : d === anchor ? "selected" : "default");
  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <div ref={rootRef} className="relative">
      <div role="grid" aria-label="Month" className="flex flex-col overflow-hidden rounded-b-[calc(var(--radius-card)-var(--spacing-2)/2)]">
        <div role="row" className="grid h-[calc(var(--spacing-32)+var(--spacing-4))] grid-cols-7 bg-surface-header">
          {WEEKDAYS.map((d) => (
            <span key={d} role="columnheader" className="flex p-compact text-caption text-text-secondary">
              <Txt>{d}</Txt>
            </span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} role="row" className="grid grid-cols-7">
            {week.map((date) => {
              const list = byDate.get(date) ?? [];
              const chips = list.slice(0, CHIP_LIMIT);
              const extra = list.length - chips.length;
              const n = list.length;
              return (
                <CalendarDayCell
                  key={date}
                  ref={(el: HTMLDivElement | null) => {
                    if (el) cells.current.set(date, el);
                    else cells.current.delete(date);
                  }}
                  role="gridcell"
                  tabIndex={date === anchor ? 0 : -1}
                  aria-selected={date === anchor}
                  aria-current={date === today ? "date" : undefined}
                  aria-label={`${formatDateLongDay(date)}${n ? ` · ${n} ${n === 1 ? "booking" : "bookings"}` : ""}`}
                  state={stateOf(date)}
                  day={parseISODate(date).day}
                  count={n}
                  // Hover previews the clicked (selected) state: the same surface/accent fill. Only cells whose click
                  // shows that fill (in-month, not today) get it, so hover never promises a look the click won't give.
                  className={cn(
                    "group/day cursor-pointer",
                    stateOf(date) === "default" && "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) hover:bg-surface-accent",
                  )}
                  // A click on the date itself (not a booking chip or "+N more") starts a New booking on that date —
                  // also on dates that already have bookings (decision 2026-11-11). Chips still open their booking.
                  onClick={(e: MouseEvent) => {
                    if (!viewer && (e.target === e.currentTarget || !(e.target as HTMLElement).closest("button"))) onNewBooking(date);
                  }}
                  onKeyDown={(e) => onKey(e, date)}
                  more={extra > 0 && <CalendarMore n={extra} aria-haspopup="dialog" aria-expanded={pop?.date === date} onClick={() => openDay(date)} />}
                >
                  {loading ? (
                    // 6.3: skeleton date cells — the grid and day numbers are real, the bookings aren't known yet.
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      {chips.map((b) => (
                        <CalendarBookingChip key={b.id} status={b.status} label={b.bookingName} aria-label={`${b.bookingName}, ${STATUS_TEXT[b.status]}`} onClick={() => onOpenBooking(b.id)} />
                      ))}
                      {n === 0 && <EmptyDateTarget date={date} onNew={onNewBooking} />}
                    </>
                  )}
                </CalendarDayCell>
              );
            })}
          </div>
        ))}
      </div>
      {mounted && shown && (
        <DayPopover
          ref={panelRef}
          presence={presence}
          instant={shown.instant}
          date={shown.date}
          bookings={byDate.get(shown.date) ?? []}
          style={{ left: shown.left, top: shown.top, bottom: shown.bottom, ["--transform-origin" as string]: shown.origin }}
          onOpenBooking={(id) => {
            close();
            onOpenBooking(id);
          }}
          onNew={(d) => {
            close();
            onNewBooking(d);
          }}
          onOpenDay={(d) => {
            close();
            onOpenDay(d);
          }}
        />
      )}
    </div>
  );
}

/**
 * Empty date hover (Figma 17 · "Hover · empty date"): inset tight (6) from the cell edges, below the date
 * row (top = compact + 24 + 2); surface/accent, 1px border/accent dashed 4·3, radius 6; plus 16 + "New
 * booking" Caption Strong text/accent, centred, gap micro. Pointer-only affordance — keyboard users press
 * Enter on the date.
 */
function EmptyDateTarget({ date, onNew }: { date: ISODate; onNew: (d: ISODate) => void }) {
  if (useIsViewer()) return null;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={`New booking on ${formatDateLongDay(date)}`}
      onClick={() => onNew(date)}
      className={cn(
        "absolute top-[calc(var(--spacing-compact)+var(--spacing-24)+var(--spacing-2))] right-[calc(var(--spacing-tight)-var(--spacing-2)/2)] bottom-[calc(var(--spacing-tight)-var(--spacing-2)/2)] left-tight",
        "flex cursor-pointer flex-col items-center justify-center gap-micro rounded-6 bg-surface-accent text-caption-strong text-text-accent outline-none",
        "motion-hover-target opacity-0 group-hover/day:opacity-100 data-[force=hover]:opacity-100",
      )}
    >
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible text-border-accent">
        <rect x="0.5" y="0.5" rx="5.5" fill="none" stroke="currentColor" strokeDasharray="4 3" className="h-[calc(100%-var(--spacing-2)/2)] w-[calc(100%-var(--spacing-2)/2)]" />
      </svg>
      <Icon name="plus" className="size-icon-sm" />
      <Txt>New booking</Txt>
    </button>
  );
}
