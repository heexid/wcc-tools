import { Icon } from "./Icon";
import { Tooltip } from "./Tooltip";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Booking components → Payment status badge (26:4846), Invoice type tag (26:4855);
// Badges & avatar → Trend badge (20:1463). Status is never colour-only: dot + text (PRD §4.5).

export type BookingStatus = "draft" | "partially_paid" | "paid" | "canceled";
export type InvoiceType = "dp" | "full" | "partial" | "paid";

const statusStyle: Record<BookingStatus, { label: string; bg: string; fg: string; dot: string }> = {
  draft: { label: "Draft", bg: "bg-surface-header", fg: "text-status-neutral", dot: "bg-status-neutral" },
  partially_paid: { label: "Partially paid", bg: "bg-surface-warning", fg: "text-status-warning", dot: "bg-status-warning" },
  paid: { label: "Paid", bg: "bg-surface-positive", fg: "text-status-positive", dot: "bg-status-positive" },
  canceled: { label: "Canceled", bg: "bg-surface-danger", fg: "text-status-danger", dot: "bg-status-danger" },
};

/** What each status means (PRD §2 “Booking status”) — shown in a tooltip when the badge is hovered. */
export const STATUS_MEANING: Record<BookingStatus, string> = {
  draft: "No invoice yet. Create the first invoice to take a payment.",
  partially_paid: "Has invoices, but part of the total is still unpaid.",
  paid: "Invoices cover the full total. Nothing left to pay.",
  canceled: "Canceled by an admin. Read-only — no edits or new invoices.",
};

/** h 24, pad micro/compact/micro/tight, gap micro, radius pill, 6 dot, Text/Micro.
 *  Hover shows what the status means in the Figma "Tooltips" popover (62:115173, as the KPI ⓘ). `info={false}` for a bare badge (DS gallery). */
export function PaymentStatusBadge({ status, className, info = true }: { status: BookingStatus; className?: string; info?: boolean }) {
  const s = statusStyle[status];
  const badge = (
    <span className={cn("inline-flex h-24 shrink-0 items-center gap-micro rounded-pill py-micro pr-compact pl-tight whitespace-nowrap", s.bg, info ? "cursor-default" : className)}>
      <span aria-hidden className={cn("size-6 rounded-pill", s.dot)} />
      <Txt className={cn("text-micro", s.fg)}>{s.label}</Txt>
    </span>
  );
  return info ? (
    // Layout classes (e.g. self-start) go on the outer element — the tooltip wrapper when there is one.
    <Tooltip content={STATUS_MEANING[status]} variant="popover" className={cn("shrink-0", className)}>
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}

const typeStyle: Record<InvoiceType, { label: string; bg: string; fg: string }> = {
  dp: { label: "DP", bg: "bg-surface-info", fg: "text-status-info" },
  full: { label: "Full", bg: "bg-surface-accent", fg: "text-text-accent" },
  partial: { label: "Partial", bg: "bg-surface-warning", fg: "text-status-warning" },
  paid: { label: "Paid", bg: "bg-surface-positive", fg: "text-status-positive" },
};

/** pad 2/tight, radius small, Text/Caption Strong. */
export function InvoiceTypeTag({ type, className }: { type: InvoiceType; className?: string }) {
  const t = typeStyle[type];
  return <span className={cn("inline-flex shrink-0 items-center rounded-small px-tight py-2 text-caption-strong whitespace-nowrap", t.bg, t.fg, className)}><Txt>{t.label}</Txt></span>;
}

/** pad 3/tight, gap micro, radius small, 12px arrow, Text/Micro. Tone is about good/bad, direction about up/down. */
export function TrendBadge({ value, direction, tone }: { value: string; direction: "up" | "down"; tone: "positive" | "negative" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-micro rounded-small px-tight py-[calc(var(--spacing-6)/2)] text-micro",
        tone === "positive" ? "bg-surface-positive text-status-positive" : "bg-surface-danger text-status-danger",
      )}
    >
      <Icon name={direction === "up" ? "arrow-up-right" : "arrow-down-right"} className="size-12" />
      <Txt>{value}</Txt>
    </span>
  );
}

// Figma: Badges & avatar → Status badge (20:1426) — pad micro/tight both sides, gap micro, radius pill,
// 6px dot, Text/Micro. Used for Package Library status (Active = Paid tone, Archived = Draft tone).
const pillTone = {
  positive: { bg: "bg-surface-positive", fg: "text-status-positive", dot: "bg-status-positive" },
  neutral: { bg: "bg-surface-header", fg: "text-status-neutral", dot: "bg-status-neutral" },
};
export function StatusPill({ tone, children, className }: { tone: keyof typeof pillTone; children: string; className?: string }) {
  const t = pillTone[tone];
  return (
    <span className={cn("inline-flex h-24 shrink-0 items-center gap-micro rounded-pill px-tight py-micro whitespace-nowrap", t.bg, className)}>
      <span aria-hidden className={cn("size-6 rounded-pill", t.dot)} />
      <Txt className={cn("text-micro", t.fg)}>{children}</Txt>
    </span>
  );
}
