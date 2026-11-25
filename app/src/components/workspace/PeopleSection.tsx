"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ds/Button";
import { Avatar, Toast, ToastRegion } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { SelectField } from "@/components/ds/InputField";
import { Skeleton } from "@/components/ds/Loading";
import { SearchField } from "@/components/ds/SearchField";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { useIsMobile } from "@/components/ds/useBreakpoint";
import { usePresence } from "@/components/ds/usePresence";
import { BookingDetail } from "@/components/bookings/BookingDetail";
import { SideSheet } from "@/components/ds/SideSheet";
import { useLeaveGuard } from "@/components/shell/LeaveGuard";
import { useDismiss } from "@/components/shell/useDismiss";
import { TYPE_LABEL, TYPE_OPTIONS, countLabel, filterPeople, personLabel, sortPeople, type PersonType } from "@/lib/booking/people";
import { listPeople } from "@/lib/data/repo";
import type { Person } from "@/lib/data/types";
import { initials } from "@/lib/format";
import { useIsReadOnly } from "@/lib/role";
import { PersonPanel } from "./PersonPanel";

// Figma Workspace & Crew → WC1–WC6 · mobile WM1–WM2; DS People table/Header, People table/Row, Account type tag,
// Mobile/Person card (SHARED-DATABASE-PLAN §9, WC-3). Columns: name fills · type 200 · job title 280 · upcoming 200 ·
// open 24. A row (its name is the button) opens the person panel, ?person=<crew id>. View only: accounts are managed
// by query.

const COLS = {
  name: "min-w-0 flex-1 pr-base",
  type: "w-[calc(var(--spacing-64)*2)] desktop:w-[calc(var(--spacing-64)*3+var(--spacing-8))] shrink-0",
  job: "w-[calc(var(--spacing-64)*2+var(--spacing-32))] desktop:w-[calc(var(--spacing-64)*4+var(--spacing-24))] shrink-0 pr-base",
  upcoming: "w-[calc(var(--spacing-64)*2)] desktop:w-[calc(var(--spacing-64)*3+var(--spacing-8))] shrink-0",
  open: "w-24 shrink-0",
};

export function PeopleSection() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PersonType | null>(null);
  const mobile = useIsMobile();
  const readOnly = useIsReadOnly(); // the mock's account type can change under the page (/dev/role)

  const load = useCallback(
    () =>
      listPeople().then(
        (p) => (setPeople(sortPeople(p)), setFailed(false)),
        () => setFailed(true),
      ),
    [],
  );
  useEffect(() => void load(), [load, readOnly]);
  const retry = async () => {
    setRetrying(true);
    await load();
    setRetrying(false);
  };

  // Person panel (WC-4): ?person=<crew id>, and ?booking=<id> for the booking detail over it. The URL changes through the
  // History API, which useSearchParams follows: no server request, so both open at once.
  const params = useSearchParams();
  const { navigate } = useLeaveGuard();
  const personId = params.get("person");
  const person = people?.find((p) => p.crewId === personId) ?? null;
  const missing = !!personId && !!people && !person;
  const setPerson = useCallback(
    (id: string | null) => {
      const q = new URLSearchParams(window.location.search);
      if (id) q.set("person", id);
      else q.delete("person");
      q.delete("booking");
      window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    },
    [],
  );
  // Booking detail, in place over the panel (the page stays Workspace & Crew). Opening adds a history entry, so the
  // browser's Back returns to the person too.
  const bookingId = params.get("booking");
  const bookingOpen = !!bookingId && (!personId || !!people || failed); // from a link: after the person, so it stacks on top
  const pushed = useRef(false);
  useEffect(() => {
    if (!bookingId) pushed.current = false;
  }, [bookingId]);
  const openBooking = useCallback((id: string) => {
    const q = new URLSearchParams(window.location.search);
    const switching = q.has("booking");
    q.set("booking", id);
    const url = `${window.location.pathname}?${q}`;
    if (switching) window.history.replaceState(null, "", url);
    else {
      window.history.pushState(null, "", url);
      pushed.current = true;
    }
  }, []);
  const closeBooking = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      return window.history.back();
    }
    const q = new URLSearchParams(window.location.search);
    q.delete("booking");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
  }, []);
  const closePanel = useCallback(() => setPerson(null), [setPerson]);
  // Closing focuses the person's row. The sheet only knows its opener, and after a link or Back that isn't the row.
  const openId = person?.crewId ?? null;
  const lastOpen = useRef<string | null>(null);
  useEffect(() => {
    const id = lastOpen.current;
    lastOpen.current = openId;
    if (!openId && id) document.querySelector<HTMLElement>(`[data-person="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }, [openId]);
  const [gone, setGone] = useState(false);
  const goneToast = usePresence(gone);
  useEffect(() => {
    if (!missing) return;
    setGone(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-shot notice for a stale or foreign link
    setPerson(null);
  }, [missing, setPerson]);
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => setGone(false), 4000);
    return () => clearTimeout(t);
  }, [gone]);

  const shown = useMemo(() => filterPeople(people ?? [], search, type), [people, search, type]);
  const narrowed = !!search.trim() || !!type;
  const reset = () => {
    setSearch("");
    setType(null);
  };
  const none = !!people && shown.length === 0;

  const message = failed && !people ? (
    <Message icon="wifi-off" title="Couldn’t load admin &amp; crew" text="Check your connection and try again." alert>
      <Button variant="secondary" loading={retrying} onClick={() => void retry()}>
        Try again
      </Button>
    </Message>
  ) : none ? (
    <Message icon="search" title={narrowed ? "No people match your search." : "No people yet"} text={narrowed ? "Try another name or job title, or choose All types." : "People appear here once they have an account or are added to the crew list."}>
      {narrowed && (
        <Button variant="secondary" onClick={reset}>
          Reset
        </Button>
      )}
    </Message>
  ) : null;

  const searchField = (
    <SearchField
      value={search}
      onValueChange={setSearch}
      placeholder="Search name or job title"
      aria-label="Search name or job title"
      className="w-[calc(var(--spacing-64)*4+var(--spacing-24))] max-tablet:w-full"
    />
  );

  return (
    <section aria-label="Admin & crew" aria-busy={!people && !failed} className="flex flex-col gap-base max-tablet:gap-control">
      <div className="flex items-center gap-compact max-tablet:flex-col max-tablet:items-stretch max-tablet:gap-control">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="flex text-heading-section text-text-primary">
            <Txt>Admin &amp; crew</Txt>
          </h2>
          <p aria-live="polite" className="min-h-20 text-caption text-text-secondary">
            {people ? countLabel(shown.length, people.length, narrowed) : ""}
          </p>
        </div>
        {searchField}
        {mobile ? <TypeChips value={type} onChange={setType} /> : <TypeFilter value={type} onChange={setType} />}
      </div>

      {mobile ? (
        message ?? (
          <ul aria-label="People" className="flex flex-col gap-control">
            {people
              ? shown.map((p) => <PersonCard key={p.crewId} person={p} onOpen={setPerson} />)
              : [0, 1, 2, 3].map((k) => (
                  <li key={k}>
                    <Skeleton className="h-[calc(var(--spacing-64)+var(--spacing-16))] w-full rounded-card" />
                  </li>
                ))}
          </ul>
        )
      ) : (
        <div className="flex flex-col overflow-hidden rounded-card border border-border-default bg-surface-default">
          <div role="table" aria-label="Admin & crew" className="flex flex-col">
            <div role="row" className="flex h-table-header-height items-center bg-surface-header px-base text-caption text-text-secondary">
              <span role="columnheader" className={COLS.name}>Name</span>
              <span role="columnheader" className={COLS.type}>Account type</span>
              <span role="columnheader" className={COLS.job}>Job title</span>
              <span role="columnheader" className={COLS.upcoming}>Upcoming bookings</span>
              <span aria-hidden className={COLS.open} />
            </div>
            {!message &&
              (people
                ? shown.map((p) => <PersonRow key={p.crewId} person={p} open={p.crewId === personId} onOpen={setPerson} />)
                : [0, 1, 2, 3, 4].map((k) => (
                    <div key={k} aria-hidden className={ROW}>
                      <span className={COLS.name}><Skeleton className="h-16 w-[calc(var(--spacing-64)*3-var(--spacing-12))] max-w-full" /></span>
                      <span className={COLS.type}><Skeleton className="h-16 w-[calc(var(--spacing-64)+var(--spacing-32))]" /></span>
                      <span className={COLS.job}><Skeleton className="h-16 w-[calc(var(--spacing-64)+var(--spacing-48))]" /></span>
                      <span className={COLS.upcoming}><Skeleton className="h-16 w-32" /></span>
                      <span className={COLS.open} />
                    </div>
                  )))}
          </div>
          {message}
        </div>
      )}

      <PersonPanel person={person} onClose={closePanel} onOpenBooking={openBooking} onSeeInBooking={(id) => navigate(`/bookings?tab=table&crew=${encodeURIComponent(id)}`)} />
      <SideSheet open={bookingOpen} onClose={closeBooking} label="Booking detail" stacked={!!person}>
        {bookingId && (
          <BookingDetail
            id={bookingId}
            mode="sheet"
            onClose={closeBooking}
            onOpenFull={(readOnlyPage) => navigate(readOnlyPage ? `/bookings/${bookingId}` : `/bookings/${bookingId}/edit`)}
            onEdit={() => navigate(`/bookings/${bookingId}/edit`)}
            onOpenBooking={openBooking}
            onSeeInCalendar={(crewId) => navigate(`/bookings?crew=${crewId}`)}
          />
        )}
      </SideSheet>
      {goneToast.mounted && (
        <ToastRegion>
          <Toast tone="info" presence={goneToast.presence}>
            This person is no longer in the list.
          </Toast>
        </ToastRegion>
      )}
    </section>
  );
}

const ROW = "flex h-table-row-height items-center border-b border-border-default px-base last:border-b-0";

function PersonRow({ person: p, open, onOpen }: { person: Person; open: boolean; onOpen: (id: string) => void }) {
  return (
    <div
      role="row"
      className={cn(
        ROW,
        "relative transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) has-[:focus-visible]:shadow-[inset_0_0_0_2px_var(--color-border-accent)]",
        open ? "bg-surface-accent" : "hover:bg-surface-subtle",
      )}
    >
      <span role="cell" className={cn(COLS.name, "flex items-center gap-control")}>
        <Avatar initials={initials(p.name)} />
        {/* The button's ::after covers the row, so the whole row is the target. */}
        <button type="button" data-person={p.crewId} aria-haspopup="dialog" onClick={() => onOpen(p.crewId)} className="min-w-0 cursor-pointer truncate text-left text-body-strong text-text-primary outline-none after:absolute after:inset-0 after:content-['']">
          {personLabel(p)}
        </button>
      </span>
      <span role="cell" className={cn(COLS.type, "flex")}>
        <AccountTypeTag type={p.type} />
      </span>
      <span role="cell" className={cn(COLS.job, "truncate text-body text-text-primary")}>{p.jobTitle || "—"}</span>
      <span role="cell" className={cn(COLS.upcoming, "text-body text-text-primary")}>{p.upcomingCount}</span>
      <span aria-hidden className={cn(COLS.open, "flex justify-end")}>
        <Icon name="chevron-right" className="size-icon-sm text-text-primary" />
      </span>
    </div>
  );
}

/** Mobile/Person card: avatar 38 · name + type tag · "Job title · n upcoming". */
function PersonCard({ person: p, onOpen }: { person: Person; onOpen: (id: string) => void }) {
  return (
    <li>
      <button
        type="button"
        data-person={p.crewId}
        aria-haspopup="dialog"
        onClick={() => onOpen(p.crewId)}
        className="flex w-full cursor-pointer items-center gap-control rounded-card border border-border-default bg-surface-default p-base text-left outline-none transition-[transform] focus-visible:shadow-focus-ring active:scale-(--press-scale) active:duration-(--dur-press) active:ease-(--ease-out)"
      >
      <Avatar size={38} initials={initials(p.name)} />
      <span className="flex min-w-0 flex-1 flex-col gap-micro">
        <span className="flex items-center gap-compact">
          <span className="min-w-0 flex-1 truncate text-body-strong text-text-primary">{personLabel(p)}</span>
          <AccountTypeTag type={p.type} />
        </span>
        <span className="text-caption wrap-anywhere text-text-secondary">{`${p.jobTitle ? `${p.jobTitle} · ` : ""}${p.upcomingCount} upcoming`}</span>
      </span>
      <Icon name="chevron-right" className="size-icon-sm shrink-0 text-text-primary" />
      </button>
    </li>
  );
}

const TAG: Record<PersonType, string> = {
  admin: "bg-surface-accent text-text-accent",
  crew: "bg-surface-info text-text-primary",
  none: "bg-surface-header text-text-secondary",
};
/** Account type tag (DS): pad 2/10, radius pill, Caption Strong. */
export function AccountTypeTag({ type }: { type: PersonType }) {
  return (
    <span className={cn("flex shrink-0 rounded-pill px-[calc(var(--spacing-12)-var(--spacing-2))] py-2 text-caption-strong", TAG[type])}>
      <Txt>{TYPE_LABEL[type]}</Txt>
    </span>
  );
}

export function Message({ icon, title, text, alert, children }: { icon: "search" | "wifi-off"; title: string; text: string; alert?: boolean; children?: ReactNode }) {
  return (
    <div role={alert ? "alert" : undefined} className="flex flex-col items-center gap-base px-base py-region">
      <Icon name={icon} className="size-32 text-text-tertiary" />
      <h3 className="text-center text-heading-section text-text-primary">{title}</h3>
      <p className="text-center text-body text-text-secondary">{text}</p>
      {children}
    </div>
  );
}

const CHOICES: (PersonType | null)[] = [null, ...TYPE_OPTIONS];
const choiceLabel = (t: PersonType | null) => (t ? TYPE_LABEL[t] : "All types");

/** Desktop: single-select dropdown (the options of Event start in the booking form). */
function TypeFilter({ value, onChange }: { value: PersonType | null; onChange: (t: PersonType | null) => void }) {
  const [open, setOpen] = useState(false);
  const { mounted, presence } = usePresence(open);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, { panel, trigger: box });
  useEffect(() => {
    if (open && mounted) panel.current?.querySelector<HTMLElement>("[aria-selected=true]")?.focus();
  }, [open, mounted]);
  const pick = (t: PersonType | null) => {
    onChange(t);
    setOpen(false);
    box.current?.querySelector("button")?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const items = [...(panel.current?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to !== undefined) {
      e.preventDefault();
      items[Math.max(0, Math.min(items.length - 1, to))]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (at >= 0) pick(CHOICES[at]);
    } else if (e.key === "Tab") setOpen(false);
  };
  return (
    <div ref={box} className="relative w-[calc(var(--spacing-64)*2+var(--spacing-8))] shrink-0">
      <SelectField hideLabel label="Account type" value={choiceLabel(value)} expanded={open} onClick={() => setOpen((o) => !o)} />
      {mounted && (
        <ul
          ref={panel}
          role="listbox"
          aria-label="Account type"
          onKeyDown={onKey}
          {...presence}
          className="motion-popover absolute top-[calc(100%+var(--spacing-6))] right-0 z-30 flex w-full flex-col gap-micro rounded-card border border-border-default bg-surface-default p-popover-inset shadow-floating [--transform-origin:top_right]"
        >
          {CHOICES.map((t) => {
            const on = t === value;
            return (
              <li
                key={t ?? "all"}
                role="option"
                aria-selected={on}
                tabIndex={-1}
                onClick={() => pick(t)}
                className={cn(
                  "flex cursor-pointer items-center gap-compact rounded-6 px-[calc(var(--spacing-12)-var(--spacing-2))] py-compact outline-none focus-visible:shadow-focus-ring",
                  "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover)",
                  on ? "bg-surface-accent" : "hover:bg-surface-subtle",
                )}
              >
                <Txt className={cn("min-w-0 flex-1 text-caption-strong", on ? "text-text-accent" : "text-text-primary")}>{choiceLabel(t)}</Txt>
                <Icon name="check" className={cn("size-icon-sm text-text-accent", !on && "opacity-0")} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Mobile: chips (All · Admin · Crew · No login), scroll sideways; the active chip is Primary. */
function TypeChips({ value, onChange }: { value: PersonType | null; onChange: (t: PersonType | null) => void }) {
  return (
    <div role="group" aria-label="Account type" className="flex gap-compact overflow-x-auto [scrollbar-width:none]">
      {CHOICES.map((t) => (
        <Button key={t ?? "all"} variant={t === value ? "primary" : "secondary"} aria-pressed={t === value} onClick={() => onChange(t)}>
          {t ? TYPE_LABEL[t] : "All"}
        </Button>
      ))}
    </div>
  );
}
