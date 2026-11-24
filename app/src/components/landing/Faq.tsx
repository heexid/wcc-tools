"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ds/Icon";

// Figma LP-D › 07 · FAQ › Questions (231:80799): 640 wide, rows pad 20/0, gap 8, bottom border/default.
// Question Heading/Section + Icon/plus (closed) / Icon/minus (open); answer Text/Body, text/secondary, 560 wide.
// The first question is open, the rest closed. Several can be open at once.

const QUESTIONS: Array<{ q: string; a: string }> = [
  {
    q: "Can I record a partial payment?",
    a: "Yes, record part of the total as a percentage or a fixed amount, and the booking shows Partially paid until the rest is in",
  },
  {
    q: "What happens to old invoices when I edit a booking?",
    a: "Nothing, each invoice is a snapshot of what was paid, so editing the booking later never rewrites an invoice your client already has",
  },
  {
    q: "If I change a package price, do existing bookings change?",
    a: "No, each booking keeps the package name and price it was saved with, and new bookings use the new price",
  },
  {
    q: "Who on my team can see the data?",
    a: "Admins create and edit bookings and invoices, and crew see bookings, invoices and PDFs without changing anything",
  },
  {
    q: "Can I send invoices to clients?",
    a: "Download the A4 PDF and send it the way you already do, on a phone you can share it straight from the booking",
  },
  {
    q: "Can I customize the invoice template?",
    a: "Set your logo and business details once and edit payment instructions and terms per booking, while the A4 layout stays fixed",
  },
  {
    q: "Is setup included?",
    a: "Yes, every plan includes free setup by our team",
  },
];

export function Faq() {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const base = useId();
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul className="mx-auto w-full max-w-[calc(var(--spacing-64)*10)]">
      {QUESTIONS.map(({ q, a }, i) => {
        const isOpen = open.has(i);
        const id = `${base}-${i}`;
        return (
          <li key={q} data-reveal className="border-b border-border-default">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => toggle(i)}
                className="group/q flex w-full cursor-pointer items-center justify-between gap-16 py-20 text-left text-heading-section text-text-primary outline-none focus-visible:rounded-small focus-visible:ring-2 focus-visible:ring-accent-primary"
              >
                {q}
                <span aria-hidden className="relative size-icon-md shrink-0">
                  {/* plus → minus: the vertical bar rotates flat (one icon, so it can't flash between two) */}
                  <Icon name="minus" className="absolute inset-0 size-icon-md" />
                  <Icon name="minus" className="lp-faq-bar absolute inset-0 size-icon-md" />
                </span>
              </button>
            </h3>
            <div id={id} role="region" aria-label={q} data-open={isOpen || undefined} className="lp-faq-panel">
              <div className="min-h-0 overflow-hidden">
                <p className="max-w-[calc(var(--spacing-64)*8+var(--spacing-48))] pb-20 text-body text-text-secondary">{a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
