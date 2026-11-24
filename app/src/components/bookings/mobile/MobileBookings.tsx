"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ActionBar } from "@/components/ds/BottomSheet";
import { Button } from "@/components/ds/Button";
import { Skeleton } from "@/components/ds/Loading";
import { SearchField } from "@/components/ds/SearchField";
import { Tab, TabList } from "@/components/ds/Tabs";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { KpiCards } from "@/components/bookings/KpiCards";
import { useBookingFilters } from "@/components/bookings/useBookingFilters";
import { STATUS_OPTIONS, rangeChip, toQuery, type BookingFilters } from "@/lib/booking/filters";
import { listAllBookings, listBookings, type getKpis, type BookingRow } from "@/lib/data/repo";
import { fetchCached, peek } from "@/lib/data/cache";
import { useCachedQuery } from "@/lib/data/useCachedQuery";
import type { Crew, Package } from "@/lib/data/types";
import { addDays, formatMonthYear, parseISODate, toISODate, type ISODate } from "@/lib/format";
import { useOpeningNewBooking } from "@/components/shell/LeaveGuard";
import { useIsReadOnly } from "@/lib/role";
import { MobileAgendaItem, MobileBookingCard } from "./MobileBookingCards";
import { MobileFiltersSheet } from "./MobileFilters";

// Figma: Bookings › Booking · Mobile (390) — M01 List · M02 Filters sheet · M03 Calendar (agenda). Below 768 the
// Bookings page is this view (the desktop dashboard's Upcoming rail is not shown on mobile; its KPI cards are, in a row
// that swipes sideways, and the tabs stick under the top bar).
// Body: surface/default, pad 20/16/24/16 (mobile/margin), gap control (12) in List / base (16) in Calendar.
// Title Heading/Page · Calendar | List tabs (equal width) · List: search 44 · chips (Filters + status, scroll-x) ·
// result meta Caption secondary · Mobile/Booking list item cards (infinite scroll replaces pagination).
// Calendar: month nav (‹ Heading/Section month › · Today) · chips · "n bookings this month" · one section per day of
// the month — Caption Strong day label (Today in text/accent) + a card of Mobile/Agenda items, or "No bookings"
// (user decision 2026-11-22: never hide empty days). Opens scrolled to Today. Sticky Mobile/Action bar "New booking".

const PAGE = 25 as const;
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const dayLabel = (d: ISODate) => {
  const p = parseISODate(d);
  return `${DAYS[p.dow]} ${p.day} ${MONTHS[p.m - 1]}`;
};

export function MobileBookings({
  today,
  crew,
  packages,
  total,
  kpis,
  loading,
  onOpen,
  onNew,
}: {
  today: ISODate;
  crew: Crew[];
  packages: Package[];
  /** Bookings that exist at all (null while loading) — 0 = first use. */
  total: number | null;
  kpis: Awaited<ReturnType<typeof getKpis>> | null | undefined;
  loading: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const openingNew = useOpeningNewBooking();
  const readOnly = useIsReadOnly();
  const { filters, update } = useBookingFilters();
  const view = params.get("tab") === "table" ? "table" : "calendar";
  const [sheet, setSheet] = useState(false);
  const tabs = useRef<HTMLDivElement>(null);
  const wasStuckRef = useRef(false);
  const setView = (v: string | null) => {
    const el = tabs.current;
    const mark = el?.previousElementSibling;
    wasStuckRef.current = !!el && !!mark && mark.getBoundingClientRect().bottom < el.getBoundingClientRect().top;
    setParam("tab", v);
  };
  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(window.location.search);
    if (v) p.set(k, v);
    else p.delete(k);
    router.replace(`${path}${p.size ? `?${p}` : ""}`, { scroll: false });
  };
  const filterCount = (filters.range ? 1 : 0) + (filters.crew.length ? 1 : 0) + (filters.pkg.length ? 1 : 0);
  const firstUse = total === 0;

  return (
    // No scroll anchoring: rows replacing skeletons after a tab switch would drag the page down with them.
    <div className="flex flex-1 flex-col [overflow-anchor:none]">
      <main className={cn("flex flex-1 flex-col px-layout-gutter pt-20 pb-24", view === "table" ? "gap-control" : "gap-base")}>
        <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
          <Txt>Bookings</Txt>
        </h1>
        <KpiCards mobile kpis={kpis} firstUse={firstUse} />
        <ViewTop key={view} wasStuckRef={wasStuckRef} className={view === "table" ? "-mb-(--spacing-control)" : "-mb-(--spacing-base)"} />
        <div ref={tabs} data-sticky-tabs className="sticky top-layout-header-height z-20 -mx-layout-gutter bg-surface-default px-layout-gutter">
          <TabList label="View" className="flex">
            <Tab active={view === "calendar"} onClick={() => setView(null)} className="flex-1">
              Calendar
            </Tab>
            <Tab active={view === "table"} onClick={() => setView("table")} className="flex-1">
              List
            </Tab>
          </TabList>
        </div>
        {view === "table" ? (
          <MobileList filters={filters} update={update} today={today} crew={crew} filterCount={filterCount} onFilters={() => setSheet(true)} onOpen={onOpen} firstUse={firstUse} loading={loading} />
        ) : (
          <MobileAgenda
            filters={filters}
            update={update}
            today={today}
            anchor={(params.get("date") as ISODate | null) ?? today}
            onMonth={(d) => setParam("date", d)}
            filterCount={filterCount}
            onFilters={() => setSheet(true)}
            onOpen={onOpen}
            loading={loading}
          />
        )}
      </main>
      {!readOnly && (
        <ActionBar className="sticky bottom-0 z-30">
          <Button icon="plus" loading={openingNew} onClick={onNew}>
            New booking
          </Button>
        </ActionBar>
      )}
      <MobileFiltersSheet open={sheet} onClose={() => setSheet(false)} filters={filters} update={update} today={today} crew={crew} packages={packages} view={view} />
    </div>
  );
}

/** Zero-height mark at the tabs' natural place. Keyed by view: switching with the tabs stuck starts the new view at its
 *  top instead of mid-scroll. Rendered before the views, so the agenda's own scroll to Today runs after it. */
function ViewTop({ className, wasStuckRef }: { className: string; wasStuckRef: RefObject<boolean> }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const tabs = el?.nextElementSibling;
    if (!el || !tabs) return;
    const stuck = parseFloat(getComputedStyle(tabs).top) || 0;
    const past = el.getBoundingClientRect().bottom - stuck;
    // Always set the position, even when the shorter view already clamped it: an unset clamp is undone once rows land.
    if (wasStuckRef.current) window.scrollTo({ top: window.scrollY + past, behavior: "instant" });
    wasStuckRef.current = false;
  }, [wasStuckRef]);
  return <div ref={ref} aria-hidden className={cn("h-0", className)} />;
}

/** Filters chip (sliders, "Filters · n") + single-select status chips (All · Draft · Partially paid · Paid · Canceled).
 *  44 high (control-height), scroll sideways; the active chip is Primary. */
function Chips({ filters, update, filterCount, onFilters }: { filters: BookingFilters; update: (p: Partial<BookingFilters>) => void; filterCount: number; onFilters: () => void }) {
  const one = filters.status.length === 1 ? filters.status[0] : null;
  return (
    <div role="group" aria-label="Filters" className="flex gap-compact overflow-x-auto [scrollbar-width:none]">
      <Button variant="secondary" icon="sliders-horizontal" onClick={onFilters} aria-haspopup="dialog">
        {filterCount ? `Filters · ${filterCount}` : "Filters"}
      </Button>
      <Button variant={filters.status.length ? "secondary" : "primary"} aria-pressed={!filters.status.length} onClick={() => update({ status: [] })}>
        All
      </Button>
      {STATUS_OPTIONS.map((s) => (
        <Button key={s.value} variant={one === s.value ? "primary" : "secondary"} aria-pressed={one === s.value} onClick={() => update({ status: one === s.value ? [] : [s.value] })}>
          {s.label}
        </Button>
      ))}
    </div>
  );
}

function useDebounced(value: string, onChange: (v: string) => void) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  useEffect(() => {
    if (text === value) return;
    const t = setTimeout(() => onChange(text), 250);
    return () => clearTimeout(t);
  }, [text, value, onChange]);
  return [text, setText] as const;
}

function MobileList({
  filters,
  update,
  today,
  crew,
  filterCount,
  onFilters,
  onOpen,
  firstUse,
  loading,
}: {
  filters: BookingFilters;
  update: (p: Partial<BookingFilters>) => void;
  today: ISODate;
  crew: Crew[];
  filterCount: number;
  onFilters: () => void;
  onOpen: (id: string) => void;
  firstUse: boolean;
  loading: boolean;
}) {
  const [q, setQ] = useDebounced(filters.q, (v) => update({ q: v }));
  const query = useMemo(() => ({ ...toQuery(filters, today, "table"), pageSize: PAGE }), [filters, today]);
  const key = JSON.stringify(query);
  // Infinite scroll (DS Mobile/List): pages of 25 append as the sentinel nears the viewport.
  const [state, setState] = useState<{ key: string; rows: BookingRow[]; page: number; pages: number; total: number } | null>(null);
  const [want, setWant] = useState(1);
  const [wantKey, setWantKey] = useState(key);
  if (wantKey !== key) {
    setWantKey(key);
    setWant(1);
  }
  // Page 1 is cached (lib/data/cache.ts): coming back, or back to filters seen before, shows it at once while it
  // refreshes; later pages always load fresh.
  const firstKey = `bookings:mobile-list:${key}`;
  useEffect(() => {
    const have = state?.key === key ? state.page : 0;
    if (have >= want) return;
    let live = true;
    const run = () => listBookings({ ...query, page: have + 1 });
    void (have === 0 ? fetchCached(firstKey, run) : run()).then(
      (r) => live && setState((s) => ({ key, rows: s?.key === key ? [...s.rows, ...r.rows] : r.rows, page: r.page, pages: r.pages, total: r.total })),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [key, firstKey, query, want, state]);
  const cachedFirst = state?.key === key ? undefined : peek<{ rows: BookingRow[]; page: number; pages: number; total: number }>(firstKey)?.value;
  const current = useMemo(() => (state?.key === key ? state : cachedFirst ? { key, ...cachedFirst } : null), [state, key, cachedFirst]);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !current || current.page >= current.pages) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setWant(current.page + 1), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [current]);

  const meta = [
    filters.range ? rangeChip(filters, today) : null,
    filters.crew.length ? (filters.crew.length === 1 ? crew.find((c) => c.id === filters.crew[0])?.name ?? "1 crew" : `${filters.crew.length} crew`) : null,
    current ? `${current.total} ${current.total === 1 ? "booking" : "bookings"}` : null,
  ].filter(Boolean);

  return (
    <>
      <SearchField value={q} onValueChange={setQ} placeholder="Search booking, client or ref" aria-label="Search bookings" />
      <Chips filters={filters} update={update} filterCount={filterCount} onFilters={onFilters} />
      <Txt aria-live="polite" className="min-h-20 text-caption text-text-secondary">
        {meta.join(" · ")}
      </Txt>
      {firstUse ? (
        <Empty title="No bookings yet" body="Create your first booking. It appears on the calendar and in this list right away." />
      ) : loading || !current ? (
        [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-[calc(var(--spacing-64)+var(--spacing-32)+var(--spacing-8))] w-full rounded-card" />)
      ) : current.rows.length ? (
        <>
          <ul className="flex flex-col gap-control">
            {current.rows.map((r) => (
              <li key={r.id}>
                <MobileBookingCard row={r} onOpen={onOpen} />
              </li>
            ))}
          </ul>
          <div ref={sentinel} aria-hidden />
        </>
      ) : (
        <Empty title="No bookings match" body="Try another search or clear the filters." />
      )}
    </>
  );
}

function MobileAgenda({
  filters,
  update,
  today,
  anchor,
  onMonth,
  filterCount,
  onFilters,
  onOpen,
  loading,
}: {
  filters: BookingFilters;
  update: (p: Partial<BookingFilters>) => void;
  today: ISODate;
  anchor: ISODate;
  onMonth: (d: ISODate | null) => void;
  filterCount: number;
  onFilters: () => void;
  onOpen: (id: string) => void;
  loading: boolean;
}) {
  const { y, m } = parseISODate(anchor);
  const from = toISODate(y, m, 1), to = toISODate(y, m + 1, 0);
  const key = JSON.stringify({ ...toQuery(filters, today, "calendar"), from, to });
  // Cached per month + filters: a month seen before shows at once and refreshes. Tagged with its key so another
  // month's rows never show under this month's days.
  const result = useCachedQuery(() => listAllBookings(JSON.parse(key)).then((rows) => ({ key, rows })), `bookings:agenda:${key}`);
  const rows = result?.key === key ? result.rows : null;
  const byDay = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const r of rows ?? []) map.set(r.bookingDate, [...(map.get(r.bookingDate) ?? []), r]);
    // Same order as the desktop calendar (repo: booking date, then creation time).
    return map;
  }, [rows]);
  const days: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);

  // Open on Today (once per month shown): the day section scrolls to just below the sticky top bar + tabs.
  const scrolled = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!rows || scrolled.current === from) return;
    scrolled.current = from;
    if (today >= from && today <= to) document.getElementById(`day-${today}`)?.scrollIntoView({ block: "start" });
  }, [rows, from, to, today]);

  const prev = toISODate(y, m - 1, 1), next = toISODate(y, m + 1, 1);
  const thisMonth = today >= from && today <= to;
  return (
    <>
      {/* Wraps on the narrowest phones (320): Today moves under the month instead of off-screen. */}
      <div className="flex flex-wrap items-center gap-x-micro gap-y-compact">
        <Button variant="ghost" iconOnly icon="chevron-left" aria-label="Previous month" onClick={() => onMonth(prev)}/>
        <h2 aria-live="polite" className="text-heading-section text-text-primary">
          <Txt>{formatMonthYear(y, m)}</Txt>
        </h2>
        <Button variant="ghost" iconOnly icon="chevron-right" aria-label="Next month" onClick={() => onMonth(next)}/>
        <span className="flex-1" />
        <Button
          variant="secondary"
          onClick={() => (thisMonth ? document.getElementById(`day-${today}`)?.scrollIntoView({ block: "start", behavior: "smooth" }) : onMonth(null))}
        >
          Today
        </Button>
      </div>
      <Chips filters={filters} update={update} filterCount={filterCount} onFilters={onFilters} />
      <Txt className="min-h-20 text-caption text-text-secondary">{rows ? `${rows.length} ${rows.length === 1 ? "booking" : "bookings"} this month` : ""}</Txt>
      {loading || !rows
        ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[calc(var(--spacing-64)*2)] w-full rounded-card" />)
        : days.map((d) => {
            const list = byDay.get(d) ?? [];
            const isToday = d === today;
            return (
              <section key={d} id={`day-${d}`} aria-label={`${dayLabel(d)}${isToday ? ", today" : ""}`} className="flex flex-col gap-compact">
                <h3 className={cn("text-caption-strong", isToday ? "text-text-accent" : "text-text-secondary")}>
                  <Txt>{isToday ? `${dayLabel(d)} · TODAY` : dayLabel(d)}</Txt>
                </h3>
                <div className="flex flex-col overflow-hidden rounded-card border border-border-default bg-surface-default">
                  {list.length ? (
                    list.map((r) => <MobileAgendaItem key={r.id} row={r} onOpen={onOpen} />)
                  ) : (
                    <Txt className="px-base py-[calc(var(--spacing-12)+var(--spacing-2))] text-caption text-text-tertiary">No bookings</Txt>
                  )}
                </div>
              </section>
            );
          })}
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-compact px-base py-section text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/tile-bookings.png" srcSet="/assets/tile-bookings.png 1x, /assets/tile-bookings@2x.png 2x" alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
      <h2 className="text-body-strong text-text-primary">{title}</h2>
      <p className="text-caption text-text-secondary">{body}</p>
    </div>
  );
}
