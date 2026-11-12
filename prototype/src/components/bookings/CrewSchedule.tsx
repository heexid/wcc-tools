"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ds/Button";
import { Avatar } from "@/components/ds/Feedback";
import { ScheduleItem } from "@/components/ds/Schedule";
import { Txt } from "@/components/ds/Txt";
import { usePresence } from "@/components/ds/usePresence";
import { now } from "@/lib/clock";
import { getCrewSchedule } from "@/lib/data/repo";
import { initials, isoToLocalDate, parseISODate } from "@/lib/format";

// Figma Booking components → Crew schedule popover (Bookings 27 / 29; PRD US-9; INTERACTIONS 1.29, 4.8–4.10).
// 344 wide, pad popover/inset, gap micro, radius card, hairline border, Shadow/Floating.
// Header (pad compact/compact/10, gap 10, bottom border): avatar 38 · name Body Strong / "Role · n bookings in Mon"
// Caption secondary. "Upcoming schedule" Caption Strong secondary · "From today" Timestamp tertiary.
// Schedule items (gap 2) from today, the viewed booking marked "This booking" (not clickable); 5 rows show, more
// scroll. Footer (top border): ghost "See in calendar" · "Crew: Name" Timestamp tertiary.
// Placement: under its trigger — start-aligned 6 below a crew chip (27), centred 8 below a crew avatar (29).
// Esc / outside click close; focus returns to the trigger. Motion: .motion-popover from the trigger.

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Schedule = NonNullable<Awaited<ReturnType<typeof getCrewSchedule>>>;

export type CrewPopoverAnchor = { crewId: string; el: HTMLElement; align: "start" | "center" };

/** Calendar crew avatars (Week card / Day row, INTERACTIONS 1.29) open the popover through the page. */
export const CrewScheduleContext = createContext<{ open: (a: CrewPopoverAnchor & { bookingId: string }) => void; active: { crewId: string; bookingId: string } | null } | null>(null);
export const useCrewSchedule = () => useContext(CrewScheduleContext);

export function CrewSchedulePopover({
  anchor,
  currentBookingId,
  onClose,
  onOpenBooking,
  onSeeInCalendar,
}: {
  anchor: CrewPopoverAnchor | null;
  currentBookingId: string | null;
  onClose: () => void;
  onOpenBooking: (id: string) => void;
  onSeeInCalendar: (crewId: string) => void;
}) {
  const open = !!anchor;
  const { mounted, presence } = usePresence(open);
  const [last, setLast] = useState(anchor);
  if (anchor && anchor !== last) setLast(anchor);
  const a = anchor ?? last;
  const [data, setData] = useState<{ id: string; s: Schedule } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    let live = true;
    getCrewSchedule(anchor.crewId).then((s) => live && s && setData({ id: anchor.crewId, s }));
    return () => {
      live = false;
    };
  }, [anchor]);

  // Follows its trigger: re-placed on every scroll (any scroller — the side sheet body, the calendar, the page)
  // and resize, in viewport coords (position: fixed). Stays on screen: flips above the trigger when there's no
  // room below, and never taller than the viewport (the schedule list scrolls instead). While the trigger is
  // scrolled out of its scroll box or under the sticky global header, the popover hides (it stays open and
  // reappears when the chip is back).
  const pos = useAnchoredPosition(open ? a : null, panel, data);
  const trigger = useMemo(() => ({ current: anchor?.el ?? null }), [anchor]);

  useDismissPopover(open, onClose, panel, trigger);

  if (!mounted || !a || !pos || typeof document === "undefined") return null;
  const s = data?.id === a.crewId ? data.s : null;
  const today = isoToLocalDate(now().toISOString());
  const month = MONTH[parseISODate(today).m - 1];
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={s ? `${s.crew.name}’s schedule` : "Crew schedule"}
      {...presence}
      style={{ left: pos.left, top: pos.top, maxHeight: pos.maxHeight, visibility: pos.hidden ? "hidden" : undefined, ["--transform-origin" as string]: `${pos.above ? "bottom" : "top"}${a.align === "start" ? " left" : ""}` }}
      className="motion-popover fixed z-50 flex w-[calc(var(--spacing-64)*5+var(--spacing-24))] flex-col gap-micro rounded-card border border-border-default bg-surface-default p-popover-inset shadow-floating"
    >
      {s && (
        <>
          <div className="flex items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] border-b border-border-default px-compact pt-compact pb-[calc(var(--spacing-12)-var(--spacing-2))]">
            <Avatar size={38} initials={initials(s.crew.name)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <Txt className="text-body-strong text-text-primary">{s.crew.name}</Txt>
              <Txt className="text-caption text-text-secondary">{`${s.crew.role} · ${s.monthCount} ${s.monthCount === 1 ? "booking" : "bookings"} in ${month}`}</Txt>
            </span>
          </div>
          <div className="flex items-center px-compact pt-tight pb-2">
            <Txt className="text-caption-strong text-text-secondary">Upcoming schedule</Txt>
            <span className="flex-1" />
            <Txt className="text-timestamp text-text-tertiary">From today</Txt>
          </div>
          <div className="flex max-h-[calc(var(--spacing-64)*6+var(--spacing-16))] min-h-0 shrink flex-col gap-2 overflow-y-auto" data-popover-scroll>
            {s.upcoming.length === 0 && <p className="px-compact py-base text-caption text-text-secondary">Nothing scheduled from today.</p>}
            {s.upcoming.map((b) => {
              const d = parseISODate(b.bookingDate);
              return (
                <ScheduleItem
                  key={b.id}
                  weekday={DOW[d.dow]}
                  day={String(d.day)}
                  title={b.bookingName}
                  meta={`${b.packageNameSnapshot} · ${b.clientName}${b.bookingDate === today ? " · Today" : ""}`}
                  status={b.status}
                  current={b.id === currentBookingId}
                  onOpen={() => onOpenBooking(b.id)}
                />
              );
            })}
          </div>
          <div className="flex items-center border-t border-border-default px-micro pt-tight pb-2">
            <Button variant="ghost" icon="calendar" onClick={() => onSeeInCalendar(s.crew.id)}>
              See in calendar
            </Button>
            <span className="flex-1" />
            <Txt className="text-timestamp text-text-tertiary">{`Crew: ${s.crew.name}`}</Txt>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}

/** Esc (handled before the side sheet's own Esc, so only the popover closes) and outside pointer-down. */
function useDismissPopover(open: boolean, close: () => void, panel: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
      trigger.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panel.current?.contains(t) || trigger.current?.contains(t)) return;
      close();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close, panel, trigger]);
}


const POPOVER_W = 344;

const EDGE = 8; // min distance from the viewport edges

type Placement = { left: number; top: number; maxHeight: number; above: boolean; hidden: boolean };

/** Viewport position next to the trigger, kept in sync while anything scrolls or the panel's height changes.
 *  Below the trigger when it fits, else above when that fits, else on the side with more room with its height
 *  capped to that room — never off screen, never over the trigger. `hidden` when the trigger itself is clipped. */
function useAnchoredPosition(a: CrewPopoverAnchor | null, panel: RefObject<HTMLElement | null>, content: unknown) {
  const [pos, setPos] = useState<Placement | null>(null);
  useLayoutEffect(() => {
    const anchor = a;
    if (!anchor) return;
    const gap = anchor.align === "start" ? 6 : 8;
    const place = () => {
      const r = anchor.el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Natural height = rendered height + whatever the schedule list currently hides behind its scroll.
      const el = panel.current;
      const list = el?.querySelector<HTMLElement>("[data-popover-scroll]");
      const natural = (el?.offsetHeight ?? 0) + (list ? list.scrollHeight - list.clientHeight : 0);
      const roomBelow = vh - EDGE - (r.bottom + gap);
      const roomAbove = r.top - gap - EDGE;
      // Below if it fits, else above if it fits, else the roomier side — capped to that room (the list scrolls).
      const above = natural > roomBelow && (natural <= roomAbove || roomAbove > roomBelow);
      const maxHeight = Math.max(0, Math.floor(above ? roomAbove : roomBelow));
      const h = Math.min(natural, maxHeight);
      const top = above ? r.top - gap - h : r.bottom + gap;
      const leftRaw = anchor.align === "start" ? r.left : r.left + r.width / 2 - POPOVER_W / 2;
      const left = Math.max(EDGE, Math.min(leftRaw, window.innerWidth - POPOVER_W - EDGE));
      setPos((p) =>
        p && p.left === left && p.top === top && p.maxHeight === maxHeight && p.above === above && p.hidden === isClipped(anchor.el, r)
          ? p
          : { left, top, maxHeight, above, hidden: isClipped(anchor.el, r) },
      );
    };
    place();
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    // The panel mounts empty and grows when the schedule loads — re-place on every size change.
    const ro = new ResizeObserver(onMove);
    if (panel.current) ro.observe(panel.current);
    window.addEventListener("scroll", onMove, { capture: true, passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("scroll", onMove, { capture: true });
      window.removeEventListener("resize", onMove);
    };
  }, [a, panel, content]);
  // pos isn't cleared on close, so the exit animation plays where the popover was.
  return pos;
}

/** True when the trigger is fully outside any scrolling ancestor's box, the viewport, or under the sticky header. */
function isClipped(el: HTMLElement, r: DOMRect) {
  let top = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
  let bottom = window.innerHeight;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if (o === "auto" || o === "scroll" || o === "hidden") {
      const b = p.getBoundingClientRect();
      top = Math.max(top, b.top);
      bottom = Math.min(bottom, b.bottom);
    }
  }
  return r.bottom <= top || r.top >= bottom;
}
