"use client";

import { Button } from "./Button";
import { Icon } from "./Icon";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Booking components → Invoice card [State=Latest | Default] (Bookings 05 / 05c / 10).
// Card: pad base, gap control, 1px INSIDE border (Latest: border/accent, else border/default), radius card.
// Top (gap control, centred): 36 icon box surface/accent radius control + receipt 18 text/accent · number Body Strong
// over "Issued …" Caption secondary · amount Heading/Section.
// Footer: top border, pad-top control, gap compact, centred: "Paid after this invoice: Rp X of Rp Y" Caption secondary
// (fills, wraps) · "Download PDF" (Secondary, leading download icon).

export function InvoiceCard({
  number,
  issued,
  amount,
  meta,
  latest,
  onPdf,
  className,
}: {
  number: string;
  /** Formatted issue date ("10 Nov 2026, 09:48"). */
  issued: string;
  /** Formatted amount ("Rp 5.000.000"). */
  amount: string;
  /** "Paid after this invoice: Rp 5.000.000 of Rp 12.500.000" */
  meta: string;
  latest?: boolean;
  onPdf?: () => void;
  className?: string;
}) {
  return (
    <article
      aria-label={`Invoice ${number}`}
      className={cn("flex w-full flex-col gap-control rounded-card border bg-surface-default p-base", latest ? "border-border-accent" : "border-border-default", className)}
    >
      <div className="flex w-full items-center gap-control">
        <span className="flex size-[calc(var(--spacing-32)+var(--spacing-4))] shrink-0 items-center justify-center rounded-control bg-surface-accent text-text-accent">
          <Icon name="receipt" className="size-[calc(var(--spacing-16)+var(--spacing-2))]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <Txt className="text-body-strong text-text-primary">{number}</Txt>
          <Txt className="text-caption text-text-secondary">{`Issued ${issued}`}</Txt>
        </div>
        <Txt className="text-heading-section text-text-primary">{amount}</Txt>
      </div>
      <div className="flex w-full items-center gap-compact border-t border-border-default pt-control">
        {/* Meta fills the free space and wraps on narrow cards so the button never overflows (Figma 10, 398 wide). */}
        <p className="min-w-0 flex-1 text-caption text-text-secondary">{meta}</p>
        <Button variant="secondary" icon="download" onClick={onPdf} aria-label={`Download PDF (${number})`} className="shrink-0">
          Download PDF
        </Button>
      </div>
    </article>
  );
}
