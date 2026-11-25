"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomSheet } from "@/components/ds/BottomSheet";
import { Button } from "@/components/ds/Button";
import { Avatar } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { Skeleton } from "@/components/ds/Loading";
import { ScheduleItem } from "@/components/ds/Schedule";
import { SideSheet } from "@/components/ds/SideSheet";
import { Tabs } from "@/components/ds/Tabs";
import { useIsMobile } from "@/components/ds/useBreakpoint";
import { groupByMonth } from "@/lib/booking/people";
import { now } from "@/lib/clock";
import { getCrewSchedule, listBookings, type BookingRow } from "@/lib/data/repo";
import type { Person } from "@/lib/data/types";
import { prefetchBooking } from "@/lib/data/prefetch";
import { addDays, formatDowUpper, initials, isoToLocalDate, parseISODate } from "@/lib/format";
import { AccountTypeTag, Message } from "./PeopleSection";

// Figma Workspace & Crew → WC8–WC13 (side sheet 560) · mobile WM3–WM4 (bottom sheet) — SHARED-DATABASE-PLAN §9, WC-4.
// Header: avatar 38 · name Heading/Section + account type tag · "Job title · n bookings in Nov" · ×; tabs Upcoming /
// Past. Body: Schedule items under month headings. Footer: See in Booking. Canceled bookings are left out.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PAGE = 20;
type Tab = "upcoming" | "past";
type Data = { monthCount: number; upcoming: BookingRow[]; past: BookingRow[]; pastTotal: number; page: number; pages: number };

const pastPage = (crewId: string, today: string, page: number) =>
  listBookings({ view: "calendar", crewIds: [crewId], to: addDays(today, -1), sort: { key: "bookingDate", dir: "desc" }, page, pageSize: PAGE });

export function PersonPanel({ person, onClose, onOpenBooking, onSeeInBooking }: { person: Person | null; onClose: () => void; onOpenBooking: (id: string) => void; onSeeInBooking: (crewId: string) => void }) {
  const mobile = useIsMobile();
  const [last, setLast] = useState(person); // keeps the content through the exit motion
  if (person && person !== last) setLast(person);
  const p = person ?? last;
  const open = !!person;
  const content = p && <PanelContent key={p.crewId} person={p} mobile={mobile} onClose={onClose} onOpenBooking={onOpenBooking} onSeeInBooking={onSeeInBooking} />;
  if (mobile)
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Bookings"
        initialFocus="[data-sheet-focus]"
        actions={
          <Button variant="secondary" onClick={() => p && onSeeInBooking(p.crewId)}>
            See in Booking
          </Button>
        }
      >
        {content}
      </BottomSheet>
    );
  return (
    <SideSheet open={open} onClose={onClose} label={p ? `${p.name}’s bookings` : "Bookings"}>
      {content}
    </SideSheet>
  );
}

function PanelContent({ person: p, mobile, onClose, onOpenBooking, onSeeInBooking }: { person: Person; mobile: boolean; onClose: () => void; onOpenBooking: (id: string) => void; onSeeInBooking: (crewId: string) => void }) {
  const [today] = useState(() => isoToLocalDate(now().toISOString()));
  const [tab, setTab] = useState<Tab>("upcoming");
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);

  const fetchAll = useCallback(async (): Promise<Data> => {
    const [s, past] = await Promise.all([getCrewSchedule(p.crewId), pastPage(p.crewId, today, 1)]);
    return { monthCount: s?.monthCount ?? 0, upcoming: s?.upcoming ?? [], past: past.rows, pastTotal: past.total, page: past.page, pages: past.pages };
  }, [p.crewId, today]);
  useEffect(() => {
    let live = true;
    fetchAll().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [fetchAll]);

  const retry = async () => {
    setBusy(true);
    await fetchAll().then(
      (d) => (setData(d), setFailed(false)),
      () => setFailed(true),
    );
    setBusy(false);
  };
  const more = async () => {
    if (!data) return;
    setBusy(true);
    setMoreFailed(false);
    await pastPage(p.crewId, today, data.page + 1).then(
      (r) =>
        setData((d) => {
          if (!d) return d;
          const seen = new Set(d.past.map((b) => b.id)); // a booking added meanwhile shifts the pages
          return { ...d, past: [...d.past, ...r.rows.filter((b) => !seen.has(b.id))], pastTotal: r.total, page: r.page, pages: r.pages };
        }),
      () => setMoreFailed(true),
    );
    setBusy(false);
  };

  const month = MONTHS[parseISODate(today).m - 1];
  const meta = [p.jobTitle, data && `${data.monthCount} ${data.monthCount === 1 ? "booking" : "bookings"} in ${month}`].filter(Boolean).join(" · ");
  const rows = data ? data[tab] : [];
  const count = (n: number | undefined) => (n === undefined ? "" : ` (${n})`);

  const head = (
    <>
      <div className="flex items-center gap-control">
        <Avatar size={38} initials={initials(p.name)} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-compact">
            <h2 tabIndex={-1} data-sheet-focus className="min-w-0 truncate text-heading-section text-text-primary outline-none max-tablet:text-body-strong">
              {p.name}
            </h2>
            <AccountTypeTag type={p.type} />
          </div>
          <p className="min-h-20 text-caption wrap-anywhere text-text-secondary">{meta}</p>
        </div>
        {!mobile && <Button variant="ghost" iconOnly icon="x" aria-label="Close" data-close onClick={onClose} />}
      </div>
      <Tabs<Tab>
        label="Bookings"
        value={tab}
        onChange={setTab}
        items={[
          { value: "upcoming", label: `Upcoming${count(data?.upcoming.length)}` },
          { value: "past", label: `Past${count(data?.pastTotal)}` },
        ]}
        tabClassName="w-[calc(var(--spacing-64)+var(--spacing-48))] max-tablet:w-auto max-tablet:flex-1"
      />
    </>
  );

  const list = (
    <div role="tabpanel" aria-label={tab === "upcoming" ? "Upcoming" : "Past"} aria-busy={!data && !failed} className="flex flex-col gap-micro">
      {!data ? (
        failed ? (
          <Message icon="wifi-off" title="Couldn’t load bookings" text="Check your connection and try again." alert>
            <Button variant="secondary" loading={busy} onClick={() => void retry()}>
              Try again
            </Button>
          </Message>
        ) : (
          [0, 1, 2, 3].map((k) => <Skeleton key={k} className="h-[calc(var(--spacing-64)-var(--spacing-2))] w-full" />)
        )
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-base py-region">
          <Icon name="calendar" className="size-32 text-text-tertiary" />
          <p className="text-center text-heading-section text-text-primary">{tab === "upcoming" ? "Nothing scheduled from today." : "No past bookings."}</p>
        </div>
      ) : (
        groupByMonth(rows).map((g) => (
          <section key={g.month} aria-label={g.month} className="flex flex-col gap-micro">
            <h3 className="px-compact pt-tight pb-micro text-caption-strong text-text-secondary">{g.month}</h3>
            {g.rows.map((b) => (
              <ScheduleItem
                key={b.id}
                weekday={formatDowUpper(b.bookingDate)}
                day={String(parseISODate(b.bookingDate).day).padStart(2, "0")}
                title={b.bookingName}
                meta={`${b.packageNameSnapshot} · ${b.clientName}${b.bookingDate === today ? " · Today" : ""}`}
                status={b.status}
                onOpen={() => onOpenBooking(b.id)}
                onIntent={() => prefetchBooking(b.id)}
              />
            ))}
          </section>
        ))
      )}
      {data && tab === "past" && data.page < data.pages && (
        <div className="flex flex-col items-center gap-compact pt-compact">
          {moreFailed && (
            <p role="alert" className="text-caption text-text-danger">
              Couldn’t load more. Check your connection and try again.
            </p>
          )}
          <Button variant="secondary" loading={busy} onClick={() => void more()}>
            Show more
          </Button>
        </div>
      )}
    </div>
  );

  if (mobile)
    return (
      <>
        {head}
        {list}
      </>
    );
  return (
    <>
      <header className="flex shrink-0 flex-col gap-control border-b border-border-default px-group pt-inset">{head}</header>
      <div key={tab} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-group py-base">
        {list}
      </div>
      <footer className="flex shrink-0 justify-end border-t border-border-default px-group py-base">
        <Button variant="secondary" onClick={() => onSeeInBooking(p.crewId)}>
          See in Booking
        </Button>
      </footer>
    </>
  );
}
