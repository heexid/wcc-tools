"use client";

import { type Ref, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "./Icon";
import { cn } from "./cn";

// Figma: CIR · Design System → Input field (20:1399) — Type (Text/Select/Date/Password) × State.
// Field: column, gap micro (4). Label row: UI/Field Label text/secondary + "*" text/danger, gap micro.
// Box: h input/height (36), 1px border INSIDE, pad 0/control (12), gap tight (6), radius control,
// value UI/Input (13/22) centred vertically. Helper: Text/Caption.
// States: Hover → border border/hover, ~6:1 (enabled, not focused, not in error) · Focus → border accent/primary + Effect/Focus Ring · Error → border status/danger + helper text/danger ·
// Disabled → surface/disabled, value text/placeholder.

export type FieldState = "default" | "focus" | "error" | "disabled";

export function FieldLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <div className="flex items-start gap-micro overflow-hidden">
      <label htmlFor={htmlFor} className="text-ui-field-label text-text-secondary whitespace-nowrap">
        {children}
      </label>
      {required && (
        <span aria-hidden className="text-ui-field-label text-text-danger">
          *
        </span>
      )}
    </div>
  );
}

export function FieldHelper({ children, error, warning, id }: { children: ReactNode; error?: boolean; warning?: boolean; id?: string }) {
  return (
    // Figma helpers are auto-width text: one line that may run past the field (Bookings 15 phone error).
    <p id={id} aria-live={warning ? "polite" : undefined} className={cn("text-caption whitespace-nowrap", error ? "text-text-danger" : warning ? "text-status-warning" : "text-text-secondary")}>
      {children}
    </p>
  );
}

/** The 36px input box. `forceFocus` / `forceHover` are gallery-only. */
export function FieldBox({
  children,
  error,
  disabled,
  forceFocus,
  forceHover,
  className,
}: {
  children: ReactNode;
  error?: boolean;
  disabled?: boolean;
  forceFocus?: boolean;
  forceHover?: boolean;
  className?: string;
}) {
  return (
    <div
      data-force={forceFocus ? "focus" : forceHover ? "hover" : undefined}
      className={cn(
        "flex h-input-height w-full items-center gap-tight overflow-hidden rounded-control border px-control",
        "transition-[border-color,box-shadow] duration-(--dur-hover) ease-(--ease-hover)",
        disabled ? "bg-surface-disabled border-border-default" : "bg-surface-default",
        // Rest border/default (Figma) · hover border/hover (~6:1, WCAG 1.4.11 — the state change is clearly visible) ·
        // focus accent/primary + focus ring (Figma Input field Focus). Hover only while not focused.
        !disabled &&
          (error
            ? "border-status-danger"
            : "border-border-default hover:not-focus-within:border-border-hover data-[force=hover]:border-border-hover focus-within:border-accent-primary focus-within:shadow-focus-ring data-[force=focus]:border-accent-primary data-[force=focus]:shadow-focus-ring"),
        className,
      )}
    >
      {children}
    </div>
  );
}

const valueText =
  "min-w-0 flex-1 bg-transparent text-ui-input text-text-primary outline-none placeholder:text-text-placeholder disabled:text-text-placeholder disabled:cursor-not-allowed";

type Common = {
  label: ReactNode;
  required?: boolean;
  helper?: ReactNode;
  error?: ReactNode;
  /** Non-blocking hint in warning tone (e.g. "Caps Lock is on", Login E5). Shown when there's no error. */
  warning?: ReactNode;
  forceFocus?: boolean;
  forceHover?: boolean;
  className?: string;
};

/** Text / Password input field. */
export function InputField({
  label,
  required,
  helper,
  error,
  warning,
  forceFocus,
  forceHover,
  className,
  type = "text",
  disabled,
  defaultRevealed = false,
  ...input
}: Common & InputHTMLAttributes<HTMLInputElement> & { defaultRevealed?: boolean; ref?: Ref<HTMLInputElement> }) {
  const id = useId();
  const [reveal, setReveal] = useState(defaultRevealed);
  const isPassword = type === "password";
  const msg = error ?? warning ?? helper;
  return (
    <div className={cn("flex w-full flex-col gap-micro", className)}>
      <FieldLabel required={required} htmlFor={id}>
        {label}
      </FieldLabel>
      <FieldBox error={!!error} disabled={disabled} forceFocus={forceFocus} forceHover={forceHover}>
        <input
          id={id}
          type={isPassword && reveal ? "text" : type}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          aria-describedby={msg ? `${id}-msg` : undefined}
          className={valueText}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            disabled={disabled}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="text-text-secondary outline-none focus-visible:text-text-accent cursor-pointer disabled:cursor-not-allowed"
          >
            <Icon name={reveal ? "eye-off" : "eye"} className="size-icon-sm" />
          </button>
        )}
      </FieldBox>
      {msg && (
        <FieldHelper id={`${id}-msg`} error={!!error} warning={!error && !!warning}>
          {msg}
        </FieldHelper>
      )}
    </div>
  );
}

/** Select / Date trigger (opens a popover in the slice that owns it). */
export function SelectField({
  label,
  required,
  helper,
  error,
  forceFocus,
  forceHover,
  className,
  kind = "select",
  value,
  placeholder,
  disabled,
  onClick,
  expanded,
  hideLabel,
  valueText,
}: Common & {
  /** Accessible value when `value` is an element (e.g. a measured <Txt>). */
  valueText?: string;
  /** Toolbar filters: no visible label row (Figma hides it); the label stays as the accessible name. */
  hideLabel?: boolean;
  kind?: "select" | "date";
  value?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  onClick?: () => void;
  expanded?: boolean;
}) {
  const id = useId();
  const msg = error ?? helper;
  return (
    <div className={cn("flex w-full flex-col gap-micro", className)}>
      {!hideLabel && (
        <FieldLabel required={required} htmlFor={id}>
          {label}
        </FieldLabel>
      )}
      <FieldBox error={!!error} disabled={disabled} forceFocus={forceFocus || expanded} forceHover={forceHover}>
        <button
          aria-label={hideLabel && typeof label === "string" ? `${label}: ${typeof value === "string" ? value : valueText ?? placeholder ?? ""}` : undefined}
          id={id}
          type="button"
          disabled={disabled}
          onClick={onClick}
          aria-haspopup={kind === "select" ? "listbox" : "dialog"}
          aria-expanded={expanded}
          aria-describedby={msg ? `${id}-msg` : undefined}
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-tight text-left outline-none disabled:cursor-not-allowed"
        >
          {kind === "date" && <Icon name="calendar" className="size-icon-sm text-text-secondary" />}
          <span className={cn("min-w-0 flex-1 truncate text-ui-input", value && !disabled ? "text-text-primary" : "text-text-placeholder")}>
            {value ?? placeholder}
          </span>
          {kind === "select" && <Icon name="chevron-down" className="size-icon-sm text-text-secondary" />}
        </button>
      </FieldBox>
      {msg && (
        <FieldHelper id={`${id}-msg`} error={!!error}>
          {msg}
        </FieldHelper>
      )}
    </div>
  );
}
