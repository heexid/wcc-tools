import type { ButtonHTMLAttributes } from "react";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Selection & navigation → Pagination item (20:1425) — Type Page / Nav × State.
// Page: 28×28, radius small, 1px border/default (Active: accent/primary), Text/Caption Strong.
// Nav: h 28, pad 0/compact, label 12/20 Medium uppercase (= UI/Button) + 1px tracking, text/secondary; Disabled text/tertiary.

export function PageButton({ active, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex size-[calc(var(--spacing-24)+var(--spacing-4))] shrink-0 cursor-pointer items-center justify-center rounded-small border bg-surface-default text-caption-strong text-text-primary outline-none",
        "transition-[border-color] duration-(--dur-hover) ease-(--ease-hover) focus-visible:shadow-focus-ring",
        active ? "border-accent-primary" : "border-border-default hover:border-border-strong",
        className,
      )}
      {...rest}
    >
      <Txt>{children}</Txt>
    </button>
  );
}

export function PageNav({ className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-[calc(var(--spacing-24)+var(--spacing-4))] shrink-0 cursor-pointer items-center justify-center rounded-small px-compact text-ui-button uppercase text-text-secondary outline-none",
        "hover:text-text-primary focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:text-text-tertiary",
        className,
      )}
      {...rest}
    >
      {/* 1px tracking (Figma, unbound); Txt drops the trailing tracking like Figma */}
      <Txt className="tracking-[calc(var(--spacing-2)/2)]">{children}</Txt>
    </button>
  );
}

/** Numbered pages with Previous / Next (Table/Footer pagination). Shows up to 5 page buttons. */
export function Pagination({ page, pages, onPage, className }: { page: number; pages: number; onPage: (p: number) => void; className?: string }) {
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const list = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);
  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-control", className)}>
      <PageNav disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </PageNav>
      <div className="flex gap-compact">
        {list.map((p) => (
          <PageButton key={p} active={p === page} onClick={() => onPage(p)} aria-label={`Page ${p}`}>
            {p}
          </PageButton>
        ))}
      </div>
      <PageNav disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Next
      </PageNav>
    </nav>
  );
}
