"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { cn } from "./cn";

// Figma: Pattern · Data & content → Search field (20:4657) — Default / Hover / Filled / Focus.
// h search/height (36), radius pill, 1px border, pad 0/control (12), gap 10, icon search 16,
// query UI/Input (placeholder text/secondary), clear = circle-x 16 text/tertiary when filled. Hover → border border/hover (~6:1, WCAG 1.4.11;
// not focused). Focus → border accent/primary.

export function SearchField({
  value,
  defaultValue,
  onValueChange,
  forceFocus,
  forceHover,
  className,
  placeholder = "Search",
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  forceFocus?: boolean;
  /** Gallery-only: show the Hover state. */
  forceHover?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const q = value ?? inner;
  const set = (v: string) => {
    setInner(v);
    onValueChange?.(v);
  };
  return (
    <div
      data-force={forceFocus ? "focus" : forceHover ? "hover" : undefined}
      className={cn(
        "flex h-search-height w-full items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-pill border bg-surface-default px-control",
        "border-border-default hover:not-focus-within:border-border-hover data-[force=hover]:border-border-hover focus-within:border-accent-primary data-[force=focus]:border-accent-primary",
        "transition-[border-color] duration-(--dur-hover) ease-(--ease-hover)",
        className,
      )}
    >
      <Icon name="search" className="size-icon-sm text-text-secondary" />
      <input
        type="search"
        value={q}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-ui-input text-text-primary outline-none placeholder:text-text-secondary [&::-webkit-search-cancel-button]:appearance-none"
        {...rest}
      />
      {q && (
        <button type="button" aria-label="Clear search text" onClick={() => set("")} className="cursor-pointer text-text-tertiary outline-none hover:text-text-secondary focus-visible:text-text-accent">
          <Icon name="circle-x" className="size-icon-sm" />
        </button>
      )}
    </div>
  );
}
