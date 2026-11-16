import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Txt } from "./Txt";
import { cn, type ForceState } from "./cn";

// Figma: CIR · Design System → Button (20:1256) — Variant × State × Content.
// Size: h control/height (32), pad micro/base (4/16), gap tight (6), radius pill, label UI/Button.
// Strokes are INSIDE and counted in layout → CSS border-box + 1px border (Primary/Secondary);
// Ghost has no stroke. Focus ring: see `ring` below. 

type Variant = "primary" | "secondary" | "ghost";

const base =
    "group/btn relative inline-flex shrink-0 items-center justify-center gap-tight h-control-height rounded-pill " +
    "text-ui-button whitespace-nowrap select-none cursor-pointer outline-none " +
    "transition-[background-color,border-color,color,transform] duration-(--dur-hover) ease-(--ease-hover) " +
    "active:scale-(--press-scale) active:duration-(--dur-press) active:ease-(--ease-out) " +
    "disabled:cursor-not-allowed disabled:active:scale-100 aria-busy:cursor-progress";

const variants: Record<Variant, string> = {
  primary:
    // Solid hover colour underneath; the gradient lives on <PrimaryFill> above it and fades out on hover
    // (background-image can't interpolate, so swapping it for a colour flashed transparent mid-transition).
    "isolate border border-border-accent bg-accent-strong text-text-on-accent " +
    // Effect/Button Highlight: Figma paints the inner shadow over the INSIDE stroke, so it lives on a
    // ::before covering the border box (CSS inset shadows would start inside the border).
    "before:pointer-events-none before:absolute before:z-1 before:-inset-px before:rounded-pill before:content-[''] before:inset-shadow-button-highlight " +
    "active:bg-accent-deep active:border-accent-deep active:before:hidden " +
    "data-[force=pressed]:bg-accent-deep data-[force=pressed]:border-accent-deep data-[force=pressed]:before:hidden " +
    "disabled:bg-surface-header disabled:border-border-default disabled:text-text-tertiary disabled:before:hidden " +
    "aria-busy:bg-surface-header aria-busy:border-border-default aria-busy:text-text-tertiary aria-busy:before:hidden",
  secondary:
    "border border-border-default bg-surface-default text-text-primary " +
    "hover:bg-surface-subtle hover:border-border-strong data-[force=hover]:bg-surface-subtle data-[force=hover]:border-border-strong " +
    "active:bg-surface-header active:border-border-strong data-[force=pressed]:bg-surface-header data-[force=pressed]:border-border-strong " +
    "disabled:bg-surface-default disabled:border-border-default disabled:text-text-tertiary " +
    "aria-busy:bg-surface-default aria-busy:border-border-default aria-busy:text-text-tertiary",
  ghost:
    "text-text-accent " +
    "hover:bg-surface-accent data-[force=hover]:bg-surface-accent " +
    "active:bg-surface-accent active:text-accent-strong data-[force=pressed]:bg-surface-accent data-[force=pressed]:text-accent-strong " +
    "disabled:bg-transparent disabled:text-text-tertiary aria-busy:text-text-tertiary",
};

// Padding: label = base/base; leading icon = 14 left (base − 2) / base right; icon only = square.
const content = {
  label: "py-micro px-base after:-inset-x-2 after:-inset-y-[calc(var(--spacing-6)/2)]",
  icon: "py-micro pl-[calc(var(--spacing-base)-var(--spacing-2))] pr-base after:-inset-x-2 after:-inset-y-[calc(var(--spacing-6)/2)]",
  iconOnly: "w-control-height p-0 after:-inset-[calc(var(--spacing-6)/2)]",
};

// Focus ring (Figma: 2px OUTSIDE stroke accent/primary, no 1px stroke). Hug buttons' focused body is
// 71×32 inside our 73×32 box (the dropped stroke), so the ring box sits −1/−2 outside our border box
// (−2/−3 from the padding box that ::after is positioned against); fixed icon-only: −3; stroke-less Ghost: −2. Drawn as ::after → exact footprint, no layout shift.
// Primary only (Tailwind gives ::before content for any before: utility — on other variants it would
// become a flex item): on focus the highlight takes the ring's box, as Figma paints it over the ring.
const primaryFocusHighlight = {
  hug: "focus-visible:before:-inset-x-2 focus-visible:before:-inset-y-[calc(var(--spacing-6)/2)] data-[force=focus]:before:-inset-x-2 data-[force=focus]:before:-inset-y-[calc(var(--spacing-6)/2)]",
  iconOnly: "focus-visible:before:-inset-[calc(var(--spacing-6)/2)] data-[force=focus]:before:-inset-[calc(var(--spacing-6)/2)]",
};

// Primary gradient fill as its own layer so hover/press can fade it (opacity = composite-only)
// onto the solid accent-strong / accent-deep behind it. Covers the border box like the old
// border-box background did; hidden outright when disabled or busy.
const primaryFill =
  "pointer-events-none absolute z-0 -inset-px rounded-pill bg-(image:--gradient-accent-primary) " +
  "transition-opacity duration-(--dur-hover) ease-(--ease-hover) " +
  "group-hover/btn:opacity-0 group-data-[force=hover]/btn:opacity-0 " +
  "group-active/btn:opacity-0 group-active/btn:duration-(--dur-press) group-active/btn:ease-(--ease-out) group-data-[force=pressed]/btn:opacity-0 " +
  "group-disabled/btn:hidden group-aria-busy/btn:hidden";

const ring =
  "after:pointer-events-none after:absolute after:hidden after:rounded-pill after:border-2 after:border-accent-primary after:content-[''] " +
  "focus-visible:after:block data-[force=focus]:after:block focus-visible:border-transparent data-[force=focus]:border-transparent";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: IconName;
  /** Icon-only button — `aria-label` is required. */
  iconOnly?: boolean;
  loading?: boolean;
  forceState?: ForceState;
  children?: ReactNode;
};

export function Button({ variant = "primary", icon, iconOnly, loading, forceState, className, children, disabled, ...rest }: ButtonProps) {
  // Primary stacks fill (z-0) → highlight ::before (z-1) → content (z-2).
  const layer = variant === "primary" ? "relative z-2" : undefined;
  const shape = iconOnly ? content.iconOnly : icon || loading ? content.icon : content.label;
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-force={forceState}
      className={cn(
        base,
        ring,
        shape,
        variants[variant],
        variant === "ghost" && "after:-inset-2",
        variant === "primary" && (iconOnly ? primaryFocusHighlight.iconOnly : primaryFocusHighlight.hug),
        className,
      )}
    >
      {variant === "primary" && <span aria-hidden className={primaryFill} />}
      {loading ? (
        <Icon name="loader" className={cn("size-icon-sm motion-safe:animate-spin", layer)} />
      ) : (
        icon && <Icon name={icon} className={cn("size-icon-sm", layer)} />
      )}
      {!iconOnly && children != null && <Txt className={layer}>{children}</Txt>}
    </button>
  );
}

// Figma: Booking components → Warning button (33:98883) — Default / Hover / Disabled.
// pad 0/14, gap 6, radius pill, stroke status/danger, label UI/Button status/danger, icon circle-x.
export function WarningButton({
  forceState,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { forceState?: ForceState }) {
  return (
    <button
      type="button"
      {...rest}
      data-force={forceState}
      className={cn(
    "inline-flex shrink-0 items-center gap-tight h-control-height rounded-pill px-[calc(var(--spacing-base)-var(--spacing-2))]",
    "border border-status-danger bg-surface-default text-ui-button text-status-danger whitespace-nowrap cursor-pointer outline-none",
    "transition-[background-color,transform] duration-(--dur-hover) ease-(--ease-hover)",
    "hover:bg-surface-danger data-[force=hover]:bg-surface-danger",
    "active:scale-(--press-scale) active:duration-(--dur-press) active:ease-(--ease-out)",
    "focus-visible:outline-status-danger",
    "disabled:bg-surface-disabled disabled:border-border-default disabled:text-text-placeholder disabled:cursor-not-allowed disabled:active:scale-100",
        className,
      )}
    >
      <Icon name="circle-x" className="size-icon-sm" />
      <Txt>{children}</Txt>
    </button>
  );
}
