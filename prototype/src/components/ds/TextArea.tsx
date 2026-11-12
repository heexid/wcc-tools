"use client";

import { useId, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

// Figma: Booking components → Text area (28:29909) — Default / Filled / Focus / Error / Disabled.
// Column gap tight (6). Box: pad compact/control (8/12), 1px border, radius control, min height 96
// (hug content above that), value UI/Input. Hover → border border/hover (~6:1,
// WCAG 1.4.11; not focused) · Focus → border border/accent + Effect/Focus Ring.
// Footer: helper Text/Caption (fill) + count Text/Caption text/tertiary right, gap compact (8).
// Error → border status/danger, helper + count text/danger. Typing stops at maxLength; a paste over
// the limit is kept and shown as Error (Figma 267/255, PRD US-1) unless pasteOverflow="cut" (US-0).

export function TextArea({
  label,
  helper,
  maxLength,
  pasteOverflow = "keep",
  error,
  forceFocus,
  forceHover,
  className,
  value,
  defaultValue,
  onValueChange,
  disabled,
  ...rest
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "defaultValue" | "onChange" | "maxLength"> & {
  label: ReactNode;
  helper?: ReactNode;
  maxLength: number;
  /** "keep" (Terms & Conditions, Figma Error state 267/255) or "cut" (Package description, PRD US-0). */
  pasteOverflow?: "keep" | "cut";
  error?: ReactNode;
  forceFocus?: boolean;
  /** Gallery-only: show the Hover state. */
  forceHover?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue ?? "");
  const [cut, setCut] = useState(false);
  const pasting = useRef(false);
  const text = value ?? inner;
  const over = text.length > maxLength;
  const err = error ?? (over || cut ? `Max ${maxLength} characters` : undefined);
  const commit = (v: string) => {
    setInner(v);
    onValueChange?.(v);
  };
  return (
    <div className={cn("flex w-full flex-col gap-tight", className)}>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-ui-field-label text-text-secondary">
          {label}
        </label>
      </div>
      <div
        data-force={forceFocus ? "focus" : forceHover ? "hover" : undefined}
        className={cn(
          "flex w-full flex-col rounded-control border px-control py-compact",
          "transition-[border-color,box-shadow] duration-(--dur-hover) ease-(--ease-hover)",
          disabled
            ? "bg-surface-disabled border-border-default"
            : err
              ? "bg-surface-default border-status-danger"
              : "bg-surface-default border-border-default hover:not-focus-within:border-border-hover data-[force=hover]:border-border-hover focus-within:border-border-accent focus-within:shadow-focus-ring data-[force=focus]:border-border-accent data-[force=focus]:shadow-focus-ring",
        )}
      >
        <textarea
          id={id}
          value={text}
          disabled={disabled}
          aria-invalid={!!err || undefined}
          aria-describedby={`${id}-foot`}
          onPaste={() => {
            pasting.current = true;
          }}
          onChange={(e) => {
            const next = e.target.value;
            const wasPaste = pasting.current;
            pasting.current = false;
            if (next.length <= maxLength || next.length < text.length) {
              setCut(false);
              return commit(next); // within limit, or deleting
            }
            if (wasPaste && pasteOverflow === "keep") return commit(next); // shown as Error, save blocked by the form
            if (wasPaste) setCut(true);
            commit(next.slice(0, maxLength)); // typing stops at the limit
          }}
          className={cn(
            "block w-full resize-none bg-transparent text-ui-input outline-none [field-sizing:content]",
            "min-h-[calc(var(--spacing-region)*2-var(--spacing-compact)*2-var(--spacing-2))]" /* box min 96 = 2×48 */,
            "placeholder:text-text-placeholder",
            disabled ? "text-text-tertiary cursor-not-allowed" : "text-text-primary",
          )}
          {...rest}
        />
      </div>
      <div id={`${id}-foot`} className="flex w-full gap-compact">
        <p className={cn("min-w-0 flex-1 text-caption", err ? "text-text-danger" : "text-text-secondary")}>{err ?? helper}</p>
        <p aria-live="polite" className={cn("text-caption text-right whitespace-nowrap", err ? "text-text-danger" : "text-text-tertiary")}>
          {text.length}/{maxLength}
        </p>
      </div>
    </div>
  );
}
