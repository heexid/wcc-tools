import type { HTMLAttributes, ReactNode } from "react";
import { cn, type ForceState } from "./cn";

// Figma: Cards, table & overlays → Table/Header (20:1512), Table/Row (20:1583);
// Pattern · Data & content → Table/Toolbar (20:4675), Table/Footer (20:4694).
// Generic CIR table parts. Column widths are passed by the slice that owns the table
// (Booking table in F9, Package table in F5) as token classes.

/** h table/header-height (36), surface/header, pad 0/control, gap inset (20). Cells Text/Caption text/secondary. */
export function TableHeader({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="row" className={cn("flex h-table-header-height w-full items-center gap-inset bg-surface-header px-control text-caption text-text-secondary", className)} {...rest}>
      {children}
    </div>
  );
}

/** h table/row-height (62), surface/default, bottom border, pad 0/control, gap inset. Hover surface/subtle, Selected surface/accent. */
export function TableRow({
  selected,
  forceState,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { selected?: boolean; forceState?: Extract<ForceState, "hover"> }) {
  return (
    <div
      role="row"
      aria-selected={selected || undefined}
      data-force={forceState}
      className={cn(
        "flex h-table-row-height w-full items-center gap-inset border-b border-border-default px-control text-caption text-text-primary",
        "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover)",
        selected ? "bg-surface-accent" : "bg-surface-default hover:bg-surface-subtle data-[force=hover]:bg-surface-subtle",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** h 52, surface/default, pad 0/base, space-between. */
export function TableToolbar({ start, end, className }: { start?: ReactNode; end?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-[calc(var(--spacing-48)+var(--spacing-4))] w-full items-center justify-between bg-surface-default px-base", className)}>
      <div className="flex">{start}</div>
      <div className="flex gap-compact">{end}</div>
    </div>
  );
}

/** h 52, surface/default, pad 0/base, summary UI/Input text/secondary + pagination. */
export function TableFooter({ summary, pagination, className }: { summary: ReactNode; pagination?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex h-[calc(var(--spacing-48)+var(--spacing-4))] w-full items-center justify-between bg-surface-default px-base", className)}>
      <p className="text-ui-input text-text-secondary whitespace-nowrap">{summary}</p>
      {pagination}
    </div>
  );
}
