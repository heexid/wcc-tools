"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { Avatar } from "./Feedback";
import { Icon } from "./Icon";
import { PaymentStatusBadge, type BookingStatus } from "./Badges";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma Bookings 03 (Layout/Editor) + CIR DS "Booking components": Page header, Section header, Inline
// input, Line item row, Summary row, Crew chip, dashed empty box.

/** Page header (h 82, pad group/gutter, bottom border): ‹ back 20 · Heading/Page title · status badge (gap control). */
export function EditorPageHeader({ title, status, onBack, backLabel = "Back", actions }: { title: string; status?: BookingStatus; onBack: () => void; backLabel?: string; actions?: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between border-b border-border-default px-layout-gutter py-group">
      <div className="flex items-center gap-control">
        <button type="button" aria-label={backLabel} onClick={onBack} className="flex cursor-pointer rounded-small text-text-primary outline-none focus-visible:shadow-focus-ring">
          <Icon name="chevron-left" className="size-icon-md" />
        </button>
        <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
          <Txt>{title}</Txt>
        </h1>
        {status && <PaymentStatusBadge status={status} />}
      </div>
      {actions && <span className="flex gap-compact">{actions}</span>}
    </div>
  );
}

/** Section header: Heading/Section title · optional meta (Caption text/secondary; "*" in text/danger), space-between. */
export function SectionHeader({ title, meta, required, id }: { title: string; meta?: ReactNode; required?: boolean; id?: string }) {
  return (
    <div className="flex h-24 w-full items-center justify-between">
      <h2 id={id} className="flex text-heading-section text-text-primary">
        <Txt>{title}</Txt>
      </h2>
      {meta && (
        <span className="flex items-start gap-2 text-caption text-text-secondary">
          {required && <Txt className="text-text-danger">*</Txt>}
          {typeof meta === "string" ? <Txt>{meta}</Txt> : meta}
        </span>
      )}
    </div>
  );
}

/** Inline input (Line item row cell): h 36, pad 0/control, gap tight, hairline border, radius control, UI/Input; optional
 *  "Rp" prefix in text/tertiary. Error → border status/danger. Focus → border accent + focus ring. */
export function InlineInput({ prefix, error, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { prefix?: string; error?: boolean }) {
  return (
    <label
      className={cn(
        "flex h-[calc(var(--spacing-32)+var(--spacing-4))] min-w-0 items-center gap-tight rounded-control border bg-surface-default px-control",
        "transition-[border-color,box-shadow] duration-(--dur-hover) ease-(--ease-hover) focus-within:shadow-focus-ring",
        error ? "border-status-danger" : "border-border-default focus-within:border-border-accent",
        className,
      )}
    >
      {prefix && <Txt className="text-ui-input text-text-tertiary">{prefix}</Txt>}
      <input aria-invalid={error || undefined} className="min-w-0 flex-1 bg-transparent text-ui-input text-text-primary outline-none placeholder:text-text-placeholder" {...rest} />
    </label>
  );
}

/** Line item row widths (Figma, inside the 1px table border): item fills · price 140 · qty 72 · subtotal 130 · action 24. */
export const LINE_COLS = {
  price: "w-[calc(var(--spacing-64)*2+var(--spacing-12))]",
  qty: "w-[calc(var(--spacing-64)+var(--spacing-8))]",
  subtotal: "w-[calc(var(--spacing-64)*2+var(--spacing-2))]",
  action: "w-24",
};

/** Line item row [Type=Header]: pad compact/control, gap compact, surface/header, bottom border, Caption text/secondary. */
export function LineItemHeader() {
  return (
    <div role="row" className="flex w-full items-center gap-compact border-b border-border-default bg-surface-header px-control py-compact text-caption text-text-secondary">
      <span role="columnheader" className="min-w-0 flex-1">Item</span>
      <span role="columnheader" className={cn("shrink-0", LINE_COLS.price)}>Price</span>
      <span role="columnheader" className={cn("shrink-0", LINE_COLS.qty)}>Qty</span>
      <span role="columnheader" className={cn("shrink-0 text-right", LINE_COLS.subtotal)}>Subtotal</span>
      <span role="columnheader" className={cn("shrink-0", LINE_COLS.action)}>
        <span className="sr-only">Remove</span>
      </span>
    </div>
  );
}

/** Summary row: Default (Caption secondary / Body) · Emphasis (Body Strong / Body Strong) · Total (Body Strong / Heading/Panel)
 *  · Accent (Total in text/accent — "Total bayar" in the invoice modal, Bookings 04). */
export function SummaryRow({ label, value, type = "default" }: { label: ReactNode; value: string; type?: "default" | "emphasis" | "total" | "accent" | "negative" }) {
  const accent = type === "accent";
  return (
    <div className="flex w-full items-center justify-between">
      <Txt className={type === "default" || type === "negative" ? "text-caption text-text-secondary" : cn("text-body-strong", accent ? "text-text-accent" : "text-text-primary")}>{label}</Txt>
      <Txt
        className={cn(
          type === "total" || accent ? "text-heading-panel" : type === "emphasis" ? "text-body-strong" : "text-body",
          type === "negative" ? "text-text-danger" : accent ? "text-text-accent" : "text-text-primary",
        )}
      >
        {value}
      </Txt>
    </div>
  );
}

/** Crew chip (Default / Read-only): h 28, pad 2/tight/2/2 (read-only 2/10/2/2), gap tight, surface/accent, radius pill;
 *  avatar 24 · name Caption · × 14 text/secondary (Default). */
export function CrewChip({ name, initials, onRemove, className }: { name: string; initials: string; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn("flex h-[calc(var(--spacing-24)+var(--spacing-4))] shrink-0 items-center gap-tight rounded-pill bg-surface-accent py-2 pl-2 text-caption text-text-primary", onRemove ? "pr-tight" : "pr-[calc(var(--spacing-12)-var(--spacing-2))]", className)}>
      <Avatar size={24} initials={initials} />
      <Txt>{name}</Txt>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="flex cursor-pointer rounded-pill text-text-secondary outline-none hover:text-text-primary focus-visible:shadow-focus-ring"
        >
          <Icon name="x" className="size-[calc(var(--spacing-12)+var(--spacing-2))]" />
        </button>
      )}
    </span>
  );
}

/** Crew chip [Read-only] as a button (detail panel Crew row, INTERACTIONS 4.8): opens the crew's schedule.
 *  Hover / open = "Read-only hover" (Figma 27): 1px INSIDE border/accent — counted in layout like Figma's
 *  (121×28 → 123×30) — and an underlined name. */
export const CrewChipButton = forwardRef<HTMLButtonElement, { name: string; initials: string; open?: boolean; onClick: () => void }>(function CrewChipButton(
  { name, initials, open, onClick },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`${name} — show schedule`}
      onClick={onClick}
      data-open={open || undefined}
      className={cn(
        "group/chip flex shrink-0 cursor-pointer items-center gap-tight rounded-pill border-border-accent bg-surface-accent py-2 pl-2 pr-[calc(var(--spacing-12)-var(--spacing-2))] text-caption text-text-primary outline-none",
        "hover:border data-open:border focus-visible:shadow-focus-ring",
      )}
    >
      <Avatar size={24} initials={initials} />
      <Txt className="group-hover/chip:underline group-data-open/chip:underline">{name}</Txt>
    </button>
  );
});

/** Dashed empty box (Invoices (0)): surface/subtle, hairline border/strong dashed 6·4, radius card — drawn as SVG (CSS can't set the dash). */
export function DashedBox({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("relative flex flex-col items-center rounded-card border border-transparent bg-surface-subtle", className)}>
      {/* The hairline transparent border keeps Figma's INSIDE stroke in layout; the SVG covers the border box. */}
      <svg aria-hidden className="pointer-events-none absolute -inset-[calc(var(--spacing-2)/2)] h-[calc(100%+var(--spacing-2))] w-[calc(100%+var(--spacing-2))] overflow-visible text-border-strong">
        <rect x="0.5" y="0.5" rx="11.5" fill="none" stroke="currentColor" strokeDasharray="6 4" className="h-[calc(100%-var(--spacing-2)/2)] w-[calc(100%-var(--spacing-2)/2)]" />
      </svg>
      {children}
    </div>
  );
}

/** Small icon button (line item remove: 24 box, trash 16 status/danger). */
export function IconAction({ icon, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: "trash" }) {
  return (
    <button type="button" className={cn("flex size-24 shrink-0 cursor-pointer items-center justify-center rounded-small text-status-danger outline-none hover:bg-surface-danger focus-visible:shadow-focus-ring", className)} {...rest}>
      <Icon name={icon} className="size-icon-sm" />
    </button>
  );
}
