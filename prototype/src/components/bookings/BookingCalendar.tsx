"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarHeader, type CalendarRange } from "@/components/ds/Calendar";
import type { BookingRow } from "@/lib/data/repo";
import { addDays, formatDateLongDay, formatMonthYear, formatWeekRange, parseISODate, type ISODate } from "@/lib/format";
import type { Crew } from "@/lib/data/types";
import { DayCalendar } from "./DayCalendar";
import { MonthCalendar, shiftMonth } from "./MonthCalendar";
import { WeekCalendar, weekStartOf } from "./WeekCalendar";

// Calendar card (Figma 01: 998 wide, 1px border, radius card, surface/default): Calendar/Header + the
// range body (Month F7 · Week / Day F8). URL: `view=day|week` (Month is the default, no param) and
// `date=YYYY-MM-DD` (the anchor — Selected cell / keyboard tab stop; defaults to today). Switching the
// range keeps the anchor and every other param (filters).

const isISO = (v: string | null): v is ISODate => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function BookingCalendar({
  rows,
  crew,
  today,
  onOpenBooking,
  onNewBooking,
}: {
  rows: BookingRow[];
  crew: Map<string, Crew>;
  today: ISODate;
  onOpenBooking: (id: string) => void;
  onNewBooking: (d: ISODate) => void;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const urlDate = params.get("date");
  const range: CalendarRange = params.get("view") === "week" ? "week" : params.get("view") === "day" ? "day" : "month";

  // The anchor lives in state (arrow keys move it every keypress) and is written to the URL. The URL is
  // only read back on load and on back / forward — reading it on every change would race fast ‹ › clicks
  // against router.replace.
  const [anchor, setAnchorState] = useState<ISODate>(isISO(urlDate) ? urlDate : today);
  useEffect(() => {
    const onPop = () => {
      const d = new URLSearchParams(window.location.search).get("date");
      setAnchorState(isISO(d) ? d : today);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [today]);

  const write = (next: { date?: ISODate; view?: CalendarRange }) => {
    const p = new URLSearchParams(params);
    if (next.date !== undefined) {
      if (next.date === today) p.delete("date");
      else p.set("date", next.date);
    }
    if (next.view !== undefined) {
      if (next.view === "month") p.delete("view");
      else p.set("view", next.view);
    }
    const qs = p.toString();
    router.replace(`${path}${qs ? `?${qs}` : ""}`, { scroll: false });
  };
  const setAnchor = (d: ISODate) => {
    setAnchorState(d);
    write({ date: d });
  };

  const { y, m } = parseISODate(anchor);
  const weekStart = weekStartOf(anchor);
  const head = {
    month: { title: formatMonthYear(y, m), unit: "month", step: (d: ISODate, k: number) => shiftMonth(d, k) },
    week: { title: formatWeekRange(weekStart, addDays(weekStart, 6)), unit: "week", step: (d: ISODate, k: number) => addDays(d, 7 * k) },
    day: { title: formatDateLongDay(anchor), unit: "day", step: (d: ISODate, k: number) => addDays(d, k) },
  }[range];
  const openDay = (d: ISODate) => {
    setAnchorState(d);
    write({ date: d, view: "day" });
  };

  return (
    <section aria-label="Calendar" className="flex flex-col rounded-card border border-border-default bg-surface-default">
      <CalendarHeader
        title={head.title}
        unit={head.unit}
        range={range}
        onRange={(v) => write({ view: v })}
        onPrev={() => setAnchor(head.step(anchor, -1))}
        onNext={() => setAnchor(head.step(anchor, 1))}
        onToday={() => setAnchor(today)}
      />
      {range === "month" ? (
        <MonthCalendar rows={rows} today={today} anchor={anchor} onAnchor={setAnchor} onOpenBooking={onOpenBooking} onNewBooking={onNewBooking} onOpenDay={openDay} />
      ) : range === "week" ? (
        <WeekCalendar rows={rows} crew={crew} today={today} anchor={anchor} onOpenBooking={onOpenBooking} onNewBooking={onNewBooking} onOpenDay={openDay} />
      ) : (
        <DayCalendar rows={rows} crew={crew} date={anchor} onOpenBooking={onOpenBooking} onNewBooking={onNewBooking} />
      )}
    </section>
  );
}
