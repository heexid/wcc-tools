"use client";

import { PaymentStatusBadge, type BookingStatus } from "./Badges";
import { Icon } from "./Icon";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Booking components → Schedule item [Default / Hover / Current] (Bookings 27 / 29).
// pad compact, gap 10, radius control. Date tile 40 × 46 (pad micro, surface/default, hairline border, radius 6):
// weekday Timestamp text/secondary over day Body Strong. Text (fills, gap 2): title Caption Strong (+ "This
// booking" tag at the row's end on Current: pad 1/tight, surface/default, border/accent, radius small, Timestamp text/accent) ·
// meta Timestamp text/secondary · status badge. Chevron 16 text/secondary (hidden on Current).
// Hover: surface/subtle. Current: surface/accent + 1px INSIDE border/accent, not clickable.

export function ScheduleItem({
  weekday,
  day,
  title,
  meta,
  status,
  current,
  forceState,
  onOpen,
}: {
  weekday: string;
  day: string;
  title: string;
  meta: string;
  status: BookingStatus;
  current?: boolean;
  forceState?: "hover";
  onOpen?: () => void;
}) {
  const body = (
    <>
      <span className="flex w-[calc(var(--spacing-32)+var(--spacing-8))] shrink-0 flex-col items-center rounded-6 border border-border-default bg-surface-default py-micro">
        <Txt className="text-timestamp text-text-secondary">{weekday}</Txt>
        <Txt className="text-body-strong text-text-primary">{day}</Txt>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2 text-left">
        <span className="flex w-full items-center gap-tight">
          <span className="min-w-0 flex-1 text-caption-strong text-text-primary">{title}</span>
          {current && (
            <span className="flex shrink-0 rounded-small border border-border-accent bg-surface-default px-tight py-px text-timestamp text-text-accent">
              <Txt>This booking</Txt>
            </span>
          )}
        </span>
        <Txt className="text-timestamp text-text-secondary">{meta}</Txt>
        <PaymentStatusBadge status={status} className="self-start" />
      </span>
      <Icon name="chevron-right" className={cn("size-icon-sm shrink-0 text-text-secondary", current && "opacity-0")} />
    </>
  );
  const cls = "flex w-full items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-control p-compact";
  if (current)
    return (
      <div aria-current="true" className={cn(cls, "border border-border-accent bg-surface-accent")}>
        {body}
      </div>
    );
  return (
    <button
      type="button"
      data-force={forceState}
      onClick={onOpen}
      className={cn(
        cls,
        "cursor-pointer bg-surface-default outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) hover:bg-surface-subtle focus-visible:shadow-focus-ring data-[force=hover]:bg-surface-subtle",
      )}
    >
      {body}
    </button>
  );
}
