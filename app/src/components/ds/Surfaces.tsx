import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { TrendBadge } from "./Badges";
import { Tooltip } from "./Tooltip";
import { Txt } from "./Txt";
import { cn, type ForceState } from "./cn";
import type { Presence } from "./usePresence";

// Figma: Cards, table & overlays → Metric card (20:1472), Modal (20:1584);
// Pattern · Navigation → Shell/Popover (20:4550), Menu item (20:4573).

/** Metric card: pad inset (20), gap group (24), Gradient/Metric Glow, 1px border, radius card, Shadow/Card. */
export function MetricCard({
  label,
  info,
  icon,
  value,
  trend,
  period,
  className,
}: {
  label: ReactNode;
  info?: string;
  icon: IconName;
  value: ReactNode;
  trend?: { value: string; direction: "up" | "down"; tone: "positive" | "negative" };
  period?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-group rounded-card border border-border-default [background:var(--gradient-metric-glow)] p-inset shadow-card", className)}>
      <header className="flex w-full items-center gap-tight">
        <h3 className="flex text-metric-label text-text-secondary whitespace-nowrap">
          <Txt>{label}</Txt>
        </h3>
        {info && (
          <Tooltip content={info} variant="popover">
            <button type="button" aria-label={`About ${typeof label === "string" ? label : "this metric"}`} className="flex cursor-default rounded-pill text-text-secondary outline-none focus-visible:shadow-focus-ring">
              <Icon name="info" className="size-[calc(var(--spacing-12)+var(--spacing-2))]" />
            </button>
          </Tooltip>
        )}
        <span className="flex-1" />
        <Icon name={icon} className="size-icon-lg text-accent-primary" />
      </header>
      <div className="flex flex-col gap-compact">
        <p className="flex text-display-metric text-text-primary whitespace-nowrap">
          <Txt>{value}</Txt>
        </p>
        {(trend || period) && (
          <div className="flex items-center gap-compact">
            {trend && <TrendBadge {...trend} />}
            {period && <Txt className="text-caption text-text-secondary">{period}</Txt>}
          </div>
        )}
      </div>
    </section>
  );
}

/** Close × + vertical divider + title — shared by Modal (icon 20, divider 20) and Shell/Popover (icon 24, divider 22). */
function OverlayTitle({ title, onClose, size, gap }: { title: ReactNode; onClose?: () => void; size: "modal" | "popover"; gap: string }) {
  return (
    <div className={cn("flex items-center", gap)}>
      <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer rounded-small text-text-primary outline-none focus-visible:shadow-focus-ring">
        <Icon name="x" className={size === "modal" ? "size-icon-md" : "size-icon-lg"} />
      </button>
      <span aria-hidden className={cn("w-px", size === "modal" ? "h-20 bg-border-default" : "h-[calc(var(--spacing-20)+var(--spacing-2))] bg-border-control")} />
      <h2 className="text-heading-module text-text-primary whitespace-nowrap">{title}</h2>
    </div>
  );
}

/**
 * Modal panel (no scrim / positioning — the slice that opens it adds those).
 * surface/header, radius card, Shadow/Floating. Header pad base/group, gap control.
 * Body: surface/default, 1px border, radius 12/12/0/0, pad group/group/section/group, gap base.
 * Footer: surface/default, top border, pad base/group, gap tight, right-aligned.
 */
export function ModalPanel({
  title,
  onClose,
  children,
  footer,
  className,
  titleId,
  presence,
}: {
  title: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  titleId?: string;
  /** From usePresence() — enables the enter/exit motion (motion.css .motion-modal). */
  presence?: Presence;
}) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} {...presence} className={cn(presence && "motion-modal", "flex flex-col overflow-hidden rounded-card bg-surface-header shadow-floating", className)}>
      <header id={titleId} className="flex w-full items-center px-group py-base">
        <OverlayTitle title={title} onClose={onClose} size="modal" gap="gap-control" />
      </header>
      <div className="flex w-full flex-col gap-base rounded-t-card border border-border-default bg-surface-default px-group pt-group pb-section">{children}</div>
      {footer && <footer className="flex w-full justify-end gap-tight border-t border-border-default bg-surface-default px-group py-base">{footer}</footer>}
    </div>
  );
}

/**
 * Shell/Popover: pad popover/inset (6), surface/header, 1px border, radius card, Shadow/Floating.
 * Optional header (pad base/group, gap base). Panel: surface/default, 1px border, radius control,
 * pad group/group/section/group, gap group.
 */
export function ShellPopover({
  title,
  onClose,
  children,
  className,
  panelClassName,
  presence,
}: {
  title?: ReactNode;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
  /** From usePresence() — enables the enter/exit motion (motion.css .motion-popover). Set --transform-origin to the trigger edge. */
  presence?: Presence;
}) {
  return (
    <div {...presence} className={cn(presence && "motion-popover", "flex flex-col rounded-card border border-border-default bg-surface-header p-popover-inset shadow-floating", className)}>
      {title && (
        <header className="flex w-full items-center px-group py-base">
          <OverlayTitle title={title} onClose={onClose} size="popover" gap="gap-base" />
        </header>
      )}
      <div className={cn("flex w-full flex-col gap-group rounded-control border border-border-default bg-surface-default px-group pt-group pb-section", panelClassName)}>
        {children}
      </div>
    </div>
  );
}

/** Menu item: h 32, pad micro/compact, gap compact, radius control, 24px icon, Text/Body. Hover: surface/subtle. */
export function MenuItem({
  icon,
  tone = "default",
  forceState,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; tone?: "default" | "danger"; forceState?: Extract<ForceState, "hover"> }) {
  return (
    <button
      type="button"
      role="menuitem"
      data-force={forceState}
      className={cn(
        "flex h-control-height w-full cursor-pointer items-center gap-compact rounded-control px-compact py-micro text-body outline-none",
        // Hover fades; arrow-key focus moves the highlight at once (keyboard never waits on motion).
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) focus-visible:duration-0 hover:bg-surface-subtle focus-visible:bg-surface-subtle data-[force=hover]:bg-surface-subtle",
        "text-text-primary", // Danger tone colours the icon only (Figma)
        className,
      )}
      {...rest}
    >
      <Icon name={icon} className={cn("size-icon-lg", tone === "danger" ? "text-status-danger" : "text-text-secondary")} />
      <Txt>{children}</Txt>
    </button>
  );
}

/** Figma DS Insight card (Danger / Warning): pad control, gap control, radius card, tone surface; metadata
 *  row (16px icon in status tone, Text/Micro title text/secondary, Text/Timestamp time text/tertiary),
 *  Text/Body message, secondary action button. */
export function InsightCard({
  tone,
  title,
  time,
  children,
  action,
}: {
  tone: "danger" | "warning";
  title: string;
  time: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <article className={cn("flex flex-col gap-control rounded-card p-control", tone === "danger" ? "bg-surface-danger" : "bg-surface-warning")}>
      <header className="flex items-center gap-tight">
        <Icon name="triangle-alert" className={cn("size-icon-sm", tone === "danger" ? "text-status-danger" : "text-status-warning")} />
        <h3 className="min-w-0 flex-1 text-micro text-text-secondary">{title}</h3>
        <span className="text-timestamp text-text-tertiary">{time}</span>
      </header>
      <p className="text-body text-text-primary">{children}</p>
      {action && <div className="flex">{action}</div>}
    </article>
  );
}
