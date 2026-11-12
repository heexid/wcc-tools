import type { InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { cn } from "./cn";

// Figma: Selection & navigation → Checkbox (20:1409) — Unchecked / Checked / Indeterminate / Disabled.
// 14×14, radius checkbox (2). Unchecked: surface/default + 1px border/control. Checked /
// Indeterminate: accent/primary, 12px check / minus in text/on-accent with a 2px stroke.
// Disabled: surface/disabled + border/default.

export function Checkbox({
  indeterminate,
  className,
  checked,
  disabled,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { indeterminate?: boolean }) {
  const on = checked || indeterminate;
  return (
    <span className={cn("relative inline-flex size-[calc(var(--spacing-12)+var(--spacing-2))] shrink-0", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        ref={(el) => {
          if (el) el.indeterminate = !!indeterminate;
        }}
        className={cn(
          "peer absolute inset-0 m-0 cursor-pointer appearance-none rounded-checkbox outline-none",
          "focus-visible:shadow-focus-ring disabled:cursor-not-allowed",
          disabled ? "bg-surface-disabled border border-border-default" : on ? "bg-accent-primary" : "bg-surface-default border border-border-control",
        )}
        {...rest}
      />
      {on && !disabled && (
        <Icon
          name={indeterminate ? "minus" : "check"}
          stroke="var(--spacing-2)"
          className="pointer-events-none absolute left-px top-px size-12 text-text-on-accent"
        />
      )}
    </span>
  );
}
