"use client";

import { useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ds/Feedback";
import { useCrewSchedule } from "./CrewSchedule";
import { Button } from "@/components/ds/Button";
import { CalendarWeekCard, CalendarWeekDayHead } from "@/components/ds/Calendar";
import { Icon } from "@/components/ds/Icon";
import { Tooltip } from "@/components/ds/Tooltip";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { useDismiss } from "@/components/shell/useDismiss";
import type { BookingRow } from "@/lib/data/repo";
import type { Crew } from "@/lib/data/types";
import { addDays, formatDayMonth, formatDateLongDay, initials, parseISODate, type ISODate } from "@/lib/format";
import { DayPopover, DAY_POPOVER_WIDTH } from "./DayPopover";
import { useIsViewer } from "@/lib/role";

// Figma Bookings 19 (week), 28 (hover · drill-in · quick add), 31 (busy day "+N more") — PRD US-6 week,
// INTERACTIONS 1.24–1.27. Mon–Sun, 7 columns (pad compact/tight, gap tight, right border; today's column
// surface/accent). The grid is 1px wider than the card's inner box, so Figma's 142.43 columns line up and
// Sunday's 1px overhang is clipped (Figma: six 142.43 columns + 141.43). Min height 640, grows with the
// busiest day. Up to 5 cards, then a full-width ghost "+N more" (pressed while open) → day popover centred
// under it, compact (8) below.

export const WEEK_CARD_LIMIT = 5;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Monday of the anchor's week. */
export const weekStartOf = (d: string): ISODate => addDays(d, -((parseISODate(d).dow + 6) % 7));

type Pop = { date: ISODate; left: number; top: number; origin: string };

/** Crew avatars (Week card / Day row): each opens that person's Crew schedule popover, centred under it, with
 *  this booking marked "This booking" (INTERACTIONS 1.29, Figma 29). Open / focus: 2px accent/primary ring 2 out. */
export function CrewAvatars({ ids, crew, bookingId }: { ids: string[]; crew: Map<string, Crew>; bookingId: string }) {
  const ctx = useCrewSchedule();
  return ids.map((id) => {
    const c = crew.get(id);
    if (!c) return null;
    const open = ctx?.active?.crewId === id && ctx.active.bookingId === bookingId;
    return (
      <button
        key={id}
        type="button"
        aria-label={`${c.name} — show schedule`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-open={open || undefined}
        onClick={(e) => ctx?.open({ crewId: id, el: e.currentTarget, align: "center", bookingId })}
        className="relative z-1 flex cursor-pointer rounded-pill outline-offset-2 outline-accent-primary focus-visible:outline-2 data-open:outline-2"
      >
        <Avatar size={24} initials={initials(c.name)} />
      </button>
    );
  });
}

export function WeekCalendar({
  rows,
  crew,
  today,
  anchor,
  onOpenBooking,
  onNewBooking,
  onOpenDay,
}: {
  rows: BookingRow[];
  crew: Map<string, Crew>;
  today: ISODate;
  anchor: ISODate;
  onOpenBooking: (id: string) => void;
  onNewBooking: (d: ISODate) => void;
  onOpenDay: (d: ISODate) => void;
}) {
  const start = weekStartOf(anchor);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const byDate = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const r of rows) map.set(r.bookingDate, [...(map.get(r.bookingDate) ?? []), r]);
    return map;
  }, [rows]);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [shown, setShown] = useState<Pop | null>(null);
  if (pop && pop !== shown) setShown(pop);
  const { mounted, presence } = usePresence(!!pop);
  const close = () => setPop(null);
  useDismiss(!!pop, close, { panel: panelRef, trigger: triggerRef });

  const openMore = (date: ISODate, btn: HTMLElement) => {
    const root = rootRef.current;
    if (!root) return;
    if (pop?.date === date) return close();
    const b = btn.getBoundingClientRect(), r = root.getBoundingClientRect();
    const margin = parseFloat(getComputedStyle(root).getPropertyValue("--spacing-compact"));
    const centre = b.left - r.left + b.width / 2;
    const left = Math.max(margin, Math.min(centre - DAY_POPOVER_WIDTH / 2, r.width - margin - DAY_POPOVER_WIDTH));
    triggerRef.current = btn;
    setPop({ date, left, top: b.bottom - r.top + margin, origin: `${centre - left}px top` });
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="overflow-hidden rounded-b-[calc(var(--radius-card)-var(--spacing-2)/2)]">
        <div role="group" aria-label="Week" className="grid min-h-[calc(var(--spacing-64)*10)] w-[calc(100%+var(--spacing-2)/2)] grid-cols-7">
          {days.map((date) => {
            const list = byDate.get(date) ?? [];
            const shownCards = list.slice(0, WEEK_CARD_LIMIT);
            const extra = list.length - shownCards.length;
            const { day, dow } = parseISODate(date);
            const isToday = date === today;
            return (
              <section
                key={date}
                aria-label={`${formatDateLongDay(date)}${list.length ? ` · ${list.length} ${list.length === 1 ? "booking" : "bookings"}` : ""}`}
                data-today={isToday || undefined}
                className={cn(
                  "group/col relative flex min-w-0 flex-col gap-tight border-r border-border-default px-tight py-compact",
                  isToday ? "bg-surface-accent" : "bg-surface-default",
                  !list.length && !isToday && "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) hover:bg-surface-subtle",
                )}
              >
                <Tooltip content={`Open day view · ${formatDayMonth(date, true)}`} className="flex w-full">
                  <CalendarWeekDayHead dow={DOW[dow]} day={day} today={isToday} aria-label={`Open day view · ${formatDateLongDay(date)}`} onClick={() => onOpenDay(date)} />
                </Tooltip>
                {shownCards.map((b) => (
                  <CalendarWeekCard
                    key={b.id}
                    status={b.status}
                    name={b.bookingName}
                    pkg={b.packageNameSnapshot}
                    crew={<CrewAvatars ids={b.crewIds} crew={crew} bookingId={b.id} />}
                    onOpen={() => onOpenBooking(b.id)}
                  />
                ))}
                {extra > 0 && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    aria-haspopup="dialog"
                    aria-expanded={pop?.date === date}
                    forceState={pop?.date === date ? "pressed" : undefined}
                    onClick={(e) => openMore(date, e.currentTarget)}
                  >
                    {`+${extra} more`}
                  </Button>
                )}
                {!list.length && (
                  <>
                    <Txt className="text-timestamp text-text-tertiary group-hover/col:opacity-0">No bookings</Txt>
                    <WeekQuickAdd date={date} onNew={onNewBooking} />
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
      {mounted && shown && (
        <DayPopover
          ref={panelRef}
          presence={presence}
          date={shown.date}
          bookings={byDate.get(shown.date) ?? []}
          style={{ left: shown.left, top: shown.top, ["--transform-origin" as string]: shown.origin }}
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
 * Figma 28 · "Hover · empty day (quick add)": under the day head (top = compact + 31 + tight), inset tight,
 * 88 tall; surface/accent, 1px border/accent dashed 4·3, radius 6; plus 16 + "New booking" Caption Strong
 * text/accent, centred. Replaces "No bookings" while the column is hovered (INTERACTIONS 1.26).
 */
function WeekQuickAdd({ date, onNew }: { date: ISODate; onNew: (d: ISODate) => void }) {
  if (useIsViewer()) return null;
  return (
    <button
      type="button"
      aria-label={`New booking on ${formatDateLongDay(date)}`}
      onClick={() => onNew(date)}
      className={cn(
        "absolute inset-x-tight top-[calc(var(--spacing-compact)+var(--spacing-32)-var(--spacing-2)/2+var(--spacing-tight))] h-[calc(var(--spacing-64)+var(--spacing-24))]",
        "flex cursor-pointer flex-col items-center justify-center gap-micro rounded-6 bg-surface-accent text-caption-strong text-text-accent outline-none",
        "motion-hover-target opacity-0 group-hover/col:opacity-100 focus-visible:opacity-100",
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
