"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { PaymentStatusBadge, type BookingStatus } from "./Badges";

/** Whole card / row opens the booking, also where the status badge's tooltip sits above the name button's
 *  click overlay; clicks on the row's own controls (name button, crew avatars, links) keep their own action. */
export const openUnlessControl = (onOpen: () => void) => (e: React.MouseEvent) => {
  if ((e.target as Element).closest("button, a")) return;
  onOpen();
};
import { Tabs } from "./Tabs";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: CIR · Design System → Booking components → Calendar/* (Bookings 01, 17).

/** Status → chip fill + bar colour (Calendar/Booking chip Status=Draft / Partially paid / Paid). */
export const STATUS_TONE: Record<BookingStatus, { surface: string; bar: string }> = {
  draft: { surface: "bg-surface-header", bar: "bg-status-neutral" },
  partially_paid: { surface: "bg-surface-warning", bar: "bg-status-warning" },
  paid: { surface: "bg-surface-positive", bar: "bg-status-positive" },
  canceled: { surface: "bg-surface-header", bar: "bg-status-danger" },
};

/**
 * Calendar/Booking chip: h 20, pad 2/tight/2/micro, gap micro, radius small, status surface; 3×14 status
 * bar (radius 2) + Text/Micro label (fills, truncates). Status is also in the accessible name — colour
 * alone never carries it (PRD §4.5).
 */
export function CalendarBookingChip({
  status,
  label,
  className,
  ...rest
}: { status: BookingStatus; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tone = STATUS_TONE[status];
  return (
    <button
      type="button"
      tabIndex={-1}
      className={cn(
        "flex h-20 w-full min-w-0 shrink-0 cursor-pointer items-center gap-micro rounded-small py-2 pr-tight pl-micro text-left outline-none",
        "[&:hover>span:last-child]:underline", // hover: underlined label, like the Week card title (1.25)
        tone.surface,
        className,
      )}
      {...rest}
    >
      <span aria-hidden className={cn("h-[calc(var(--spacing-12)+var(--spacing-2))] w-[calc(var(--spacing-6)/2)] shrink-0 rounded-2", tone.bar)} />
      <span className="min-w-0 flex-1 truncate text-micro text-text-primary">{label}</span>
    </button>
  );
}

export type DayCellState = "default" | "today" | "outside" | "selected";

/**
 * Calendar/Day cell: 142×128 (fills its grid column), pad compact, gap micro, right + bottom 1px
 * border/default (INSIDE), clips. Fill: surface/default · Outside month surface/subtle · Selected
 * surface/accent. Top row (h 24, space-between): date in a 24 pill (Caption Strong — Today: accent/primary
 * fill + on-accent; Outside month: text/tertiary) and the booking count pill (surface/header, pad 0/tight,
 * Text/Timestamp text/secondary). Then up to 3 chips and "+N more" (Text/Timestamp text/accent).
 */
export function CalendarDayCell({
  state,
  day,
  count,
  children,
  more,
  className,
  ...rest
}: {
  state: DayCellState;
  day: number;
  count?: number;
  children?: ReactNode;
  more?: ReactNode;
  ref?: Ref<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-state={state}
      className={cn(
        "relative flex h-[calc(var(--spacing-64)*2)] min-w-0 flex-col gap-micro overflow-hidden border-r border-b border-border-default p-compact outline-none",
        state === "outside" ? "bg-surface-subtle" : state === "selected" ? "bg-surface-accent" : "bg-surface-default",
        // Keyboard focus (roving tab stop): 2px accent ring inside the cell's own borders.
        "after:pointer-events-none after:absolute after:inset-0 after:z-10 after:hidden after:border-2 after:border-accent-primary after:content-[''] focus-visible:after:block",
        className,
      )}
      {...rest}
    >
      <span className="flex h-24 w-full shrink-0 items-center justify-between">
        <span
          className={cn(
            "flex size-24 items-center justify-center rounded-pill text-caption-strong",
            state === "today" ? "bg-accent-primary text-text-on-accent" : state === "outside" ? "text-text-tertiary" : "text-text-primary",
          )}
        >
          <Txt>{String(day)}</Txt>
        </span>
        {!!count && (
          <span aria-hidden className="flex h-[calc(var(--spacing-12)+var(--spacing-2))] items-center rounded-pill bg-surface-header px-tight text-timestamp text-text-secondary">
            <Txt>{String(count)}</Txt>
          </span>
        )}
      </span>
      {children}
      {more}
    </div>
  );
}

/** "+N more" link under the chips (Text/Timestamp text/accent). */
export function CalendarMore({ n, className, ...rest }: { n: number } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      tabIndex={-1}
      className={cn("flex h-[calc(var(--spacing-12)+var(--spacing-2))] shrink-0 cursor-pointer self-start text-timestamp text-text-accent outline-none hover:underline", className)}
      {...rest}
    >
      <Txt>{`+${n} more`}</Txt>
    </button>
  );
}

export type CalendarRange = "day" | "week" | "month";
const RANGES: { value: CalendarRange; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

/**
 * Calendar/Header: pad control/base, gap control, bottom border. ‹ › (secondary icon-only, gap micro) ·
 * title Heading/Section · ghost "Today" · spacer · legend (Payment status badges, gap tight) · Range tabs.
 */
export function CalendarHeader({
  title,
  unit,
  range,
  onRange,
  onPrev,
  onNext,
  onToday,
}: {
  title: string;
  unit: string;
  range: CalendarRange;
  onRange: (r: CalendarRange) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-control border-b border-border-default px-base py-control">
      <div className="flex items-center gap-micro">
        <Button variant="secondary" iconOnly icon="chevron-left" aria-label={`Previous ${unit}`} onClick={onPrev} />
        <Button variant="secondary" iconOnly icon="chevron-right" aria-label={`Next ${unit}`} onClick={onNext} />
      </div>
      <h2 aria-live="polite" className="flex text-heading-section text-text-primary">
        <Txt>{title}</Txt>
      </h2>
      <Button variant="ghost" onClick={onToday}>
        Today
      </Button>
      <span className="flex-1" />
      <div role="group" aria-label="Legend" className="flex items-center gap-tight">
        <PaymentStatusBadge status="draft" />
        <PaymentStatusBadge status="partially_paid" />
        <PaymentStatusBadge status="paid" />
      </div>
      <Tabs label="Calendar range" value={range} onChange={onRange} items={RANGES} />
    </div>
  );
}

export const STATUS_LABEL: Record<BookingStatus, string> = { draft: "Draft", partially_paid: "Partially paid", paid: "Paid", canceled: "Canceled" };
const STATUS_EDGE: Record<BookingStatus, string> = {
  draft: "border-status-neutral",
  partially_paid: "border-status-warning",
  paid: "border-status-positive",
  canceled: "border-status-danger",
};

/**
 * Calendar/Week day head (Default / Today / Hover): fills the column, h 31 (24 + pad-bottom tight + 1px
 * bottom border), pad 0/2/tight/2, gap tight. Day name Caption text/secondary · date in a 24 pill (Caption
 * Strong). Today: accent/primary pill + on-accent. Hover: name accent/primary underlined, pill surface/accent
 * with accent/primary date. A button — opens the Day view.
 */
export function CalendarWeekDayHead({
  dow,
  day,
  today,
  forceState,
  className,
  ...rest
}: { dow: string; day: number; today?: boolean; forceState?: "hover" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      data-force={forceState}
      className={cn(
        "group/head flex w-full shrink-0 cursor-pointer items-center gap-tight border-b border-border-default px-2 pb-tight text-left outline-none",
        "focus-visible:bg-surface-accent",
        className,
      )}
      {...rest}
    >
      <Txt className="text-caption text-text-secondary transition-[color] duration-(--dur-hover) ease-(--ease-hover) group-hover/head:text-accent-primary group-hover/head:underline group-data-[force=hover]/head:text-accent-primary group-data-[force=hover]/head:underline">
        {dow}
      </Txt>
      <span
        className={cn(
          "flex size-24 items-center justify-center rounded-pill text-caption-strong transition-[color,background-color] duration-(--dur-hover) ease-(--ease-hover)",
          today
            ? "bg-accent-primary text-text-on-accent"
            : "text-text-primary group-hover/head:bg-surface-accent group-hover/head:text-accent-primary group-data-[force=hover]/head:bg-surface-accent group-data-[force=hover]/head:text-accent-primary",
        )}
      >
        <Txt>{String(day)}</Txt>
      </span>
    </button>
  );
}

/**
 * Calendar/Week card (status × Default / Hover): pad compact, gap tight, radius control, 3px left status
 * edge (INSIDE, counted in layout), surface/default. Name Caption Strong (wraps) · package Timestamp
 * text/secondary · row (wraps, gap micro / tight): Payment status badge + crew avatars. Hover: surface/subtle,
 * Shadow/Card, underlined name. The name is the button; its ::after covers the card so the whole card
 * clicks, while crew avatars (F12) stay separately clickable above it.
 */
export function CalendarWeekCard({
  status,
  name,
  pkg,
  crew,
  onOpen,
  forceState,
  className,
}: {
  status: BookingStatus;
  name: string;
  pkg: string;
  crew?: ReactNode;
  onOpen: () => void;
  forceState?: "hover";
  className?: string;
}) {
  return (
    <div
      data-force={forceState}
      onClick={openUnlessControl(onOpen)}
      className={cn(
        "group/card relative flex w-full shrink-0 flex-col gap-tight rounded-control border-l-3 bg-surface-default p-compact",
        "transition-[background-color,box-shadow] duration-(--dur-hover) ease-(--ease-hover)",
        "hover:bg-surface-subtle hover:shadow-card data-[force=hover]:bg-surface-subtle data-[force=hover]:shadow-card has-focus-visible:shadow-focus-ring",
        STATUS_EDGE[status],
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${name}, ${STATUS_LABEL[status]}`}
        className="cursor-pointer text-left text-caption-strong text-text-primary outline-none after:absolute after:inset-0 after:content-[''] group-hover/card:underline group-data-[force=hover]/card:underline"
      >
        {name}
      </button>
      <span className="text-timestamp text-text-secondary">{pkg}</span>
      <span className="flex flex-wrap items-center gap-x-micro gap-y-tight">
        <PaymentStatusBadge status={status} />
        {crew}
      </span>
    </div>
  );
}

/**
 * Calendar/Day row (status × Default / Hover): h 73, pad 14/base, gap base, bottom border. 4×40 status bar
 * (radius 2) · name Body Strong / "Package · Client" Caption text/secondary (gap 2, fills) · crew avatars
 * (gap micro) · money (130, right: total Caption Strong / "Remaining Rp X" Timestamp) · status (110) ·
 * chevron 16 text/secondary. Hover: surface/subtle + underlined name. Whole row opens the detail panel.
 */
export function CalendarDayRow({
  status,
  name,
  sub,
  crew,
  total,
  remaining,
  onOpen,
  forceState,
}: {
  status: BookingStatus;
  name: string;
  sub: string;
  crew?: ReactNode;
  total: string;
  remaining: string;
  onOpen: () => void;
  forceState?: "hover";
}) {
  return (
    <div
      data-force={forceState}
      onClick={openUnlessControl(onOpen)}
      className={cn(
        "group/row relative flex w-full items-center gap-base border-b border-border-default px-base py-[calc(var(--spacing-12)+var(--spacing-2))]",
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) hover:bg-surface-subtle data-[force=hover]:bg-surface-subtle has-focus-visible:bg-surface-subtle",
      )}
    >
      <span aria-hidden className={cn("h-[calc(var(--spacing-32)+var(--spacing-8))] w-4 shrink-0 rounded-2", STATUS_TONE[status].bar)} />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${name}, ${STATUS_LABEL[status]}`}
          className="flex cursor-pointer text-left text-body-strong text-text-primary outline-none after:absolute after:inset-0 after:content-[''] group-hover/row:underline group-data-[force=hover]/row:underline focus-visible:underline"
        >
          <Txt>{name}</Txt>
        </button>
        <span className="flex text-caption text-text-secondary">
          <Txt>{sub}</Txt>
        </span>
      </span>
      {crew && <span className="relative flex items-start gap-micro">{crew}</span>}
      <span className="flex w-[calc(var(--spacing-64)*2+var(--spacing-2))] shrink-0 flex-col items-end">
        <Txt className="text-caption-strong text-text-primary">{total}</Txt>
        <Txt className="text-timestamp text-text-secondary">{`Remaining ${remaining}`}</Txt>
      </span>
      <span className="flex w-[calc(var(--spacing-64)+var(--spacing-48)-var(--spacing-2))] shrink-0">
        <PaymentStatusBadge status={status} />
      </span>
      <Icon name="chevron-right" className="size-icon-sm shrink-0 text-text-secondary" />
    </div>
  );
}
