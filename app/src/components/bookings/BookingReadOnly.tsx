"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ds/Button";
import { CrewChip, DashedBox, EditorPageHeader, LINE_COLS, LineItemHeader, SectionHeader, SummaryRow } from "@/components/ds/Editor";
import { Alert, Toast, ToastRegion } from "@/components/ds/Feedback";
import { FieldBox, FieldHelper, FieldLabel, InputField } from "@/components/ds/InputField";
import { Icon } from "@/components/ds/Icon";
import { InvoiceCard } from "@/components/ds/InvoiceCard";
import { useInvoicePdf } from "@/components/pdf/useInvoicePdf";
import { PaymentStatusBadge } from "@/components/ds/Badges";
import { TextArea } from "@/components/ds/TextArea";
import { Txt } from "@/components/ds/Txt";
import { cascade, cascadeChildren, useEntrance } from "@/components/ds/useEntrance";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { useShellCrumb } from "@/components/shell/AppShell";
import { PaymentInstructionField } from "@/components/booking-form/PaymentInstruction";
import { LIMITS, paidPercent } from "@/lib/booking/calc";
import type { BookingDetail } from "@/lib/data/repo";
import { formatDate, formatDateTime, formatIDR, formatPhone, initials, isoToLocalDate } from "@/lib/format";

// Figma Bookings · Hi-fi flow H5 — Booking, Canceled, full page (read-only). Opened from the detail sheet's ↗ "Open
// full page" or a direct /bookings/[id] link (PRD US-12: a canceled booking can't be edited, so /edit never opens).
// Same layout as Edit booking (H2): page header ‹ · name · Canceled · Download latest PDF; form column with the
// cancellation alert on top and every field disabled (line items Read-only, no trash / Add item, crew chips without
// ×, no Manage library, no Cancel booking section); rail "Totals" (Total booking · Paid · Not collected) + Invoices
// (n) without Create invoice. The editor global header shows no save status or buttons.

export function BookingReadOnly({ b, onBack }: { b: BookingDetail; onBack: () => void }) {
  const entering = useEntrance(); // module entrance cascade (motion.css)
  useShellCrumb(b.ref);
  const [toast, setToast] = useState<{ text: string; open: boolean } | null>(null);
  const toastPresence = usePresence(!!toast?.open);
  useEffect(() => {
    if (!toast?.open) return;
    const t = setTimeout(() => setToast((v) => v && { ...v, open: false }), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  // Esc goes back like ‹ (Figma H5 note) — unless something else (a toast, a focused control) owns it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  const pdf = useInvoicePdf(); // PDFs still download on a canceled booking (US-12, 4.11)
  const extras = b.items.reduce((s, it) => s + it.price * it.qty, 0);
  const pct = paidPercent(b.total, b.totalPaid);
  const n = b.invoices.length;

  return (
    <>
      <EditorPageHeader
        className={entering ? cascade(0) : undefined}
        title={b.bookingName}
        status={b.status}
        onBack={onBack}
        backLabel="Back to bookings"
        actions={
          n > 0 && (
            <Button variant="secondary" icon="download" loading={pdf.busyId === b.invoices[0].id} onClick={() => pdf.download(b.invoices[0])}>
              Download latest PDF
            </Button>
          )
        }
      />
      <div data-cascade className="flex flex-1 gap-section pl-section">
        <main className={cn("flex w-[calc(var(--spacing-64)*9+var(--spacing-48))] shrink-0 flex-col gap-[calc(var(--spacing-24)+var(--spacing-4))] pt-group pb-[calc(var(--spacing-32)+var(--spacing-8))]", entering && cascadeChildren(1))}>
          {b.canceledAt && (
            <Alert tone="danger" title={`Canceled on ${formatDate(isoToLocalDate(b.canceledAt))} by ${b.canceledBy}`}>
              {`${b.cancelReason ? `Reason: ${b.cancelReason.replace(/\.?$/, ".")} ` : ""}This booking is read-only — it can’t be edited and no new invoices can be created.`}
            </Alert>
          )}
          <section aria-labelledby="ro-client" className="flex flex-col gap-base">
            <SectionHeader id="ro-client" title="Client" />
            <div className="flex gap-base">
              <InputField label="Client name" required disabled readOnly value={b.clientName} />
              <InputField label="Phone number" required disabled readOnly value={formatPhone(b.clientPhone)} />
            </div>
            <InputField label="Booking name" disabled readOnly value={b.bookingName} />
          </section>
          <Divider />
          <section aria-labelledby="ro-package" className="flex flex-col gap-base">
            <SectionHeader id="ro-package" title="Package" />
            <DisabledBox label="Package" required trailing="chevron-down" value={b.packageNameSnapshot} />
            <div className="flex items-center gap-control rounded-control border border-border-default bg-surface-subtle px-base py-control">
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <Txt className="text-caption-strong text-text-primary">{b.packageNameSnapshot}</Txt>
                {b.package?.summary && <span className="truncate text-caption text-text-secondary">{b.package.summary}</span>}
              </span>
              <Txt className="text-body-strong text-text-primary">{formatIDR(b.packagePriceSnapshot)}</Txt>
            </div>
            <PaymentInstructionField value={b.paymentInstruction} />
          </section>
          <Divider />
          <section aria-labelledby="ro-items" className="flex flex-col gap-base">
            <SectionHeader id="ro-items" title="Additional items" meta={`${b.items.length} ${b.items.length === 1 ? "item" : "items"}`} />
            {b.items.length ? (
              <div role="table" aria-label="Additional items" className="flex flex-col overflow-hidden rounded-control border border-border-default">
                <LineItemHeader />
                {b.items.map((it, i) => (
                  <div key={it.id} role="row" className={cn("flex w-full items-center gap-compact bg-surface-default px-control py-compact", i < b.items.length - 1 && "border-b border-border-default")}>
                    <span role="cell" className="flex min-w-0 flex-1">
                      <ReadOnlyCell value={it.name} />
                    </span>
                    <span role="cell" className={cn("flex shrink-0", LINE_COLS.price)}>
                      <ReadOnlyCell prefix="Rp" value={formatIDR(it.price).replace(/^Rp\s*/, "")} />
                    </span>
                    <span role="cell" className={cn("flex shrink-0", LINE_COLS.qty)}>
                      <ReadOnlyCell value={String(it.qty)} />
                    </span>
                    <span role="cell" className={cn("flex shrink-0 justify-end text-body-strong text-text-primary", LINE_COLS.subtotal)}>
                      <Txt>{formatIDR(it.price * it.qty)}</Txt>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Txt className="text-caption text-text-secondary">No additional items</Txt>
            )}
          </section>
          <Divider />
          <section aria-labelledby="ro-schedule" className="flex flex-col gap-base">
            <SectionHeader id="ro-schedule" title="Schedule" />
            <div className="flex items-start gap-base">
              <DisabledBox label="Booking date" required leading="calendar" value={formatDate(b.bookingDate)} />
              <InputField label="Created" disabled readOnly value={formatDateTime(b.createdAt)} helper="Set automatically" />
            </div>
          </section>
          <Divider />
          <section aria-labelledby="ro-crew" className="flex flex-col gap-base">
            <SectionHeader id="ro-crew" title="Crew" meta="Handling this booking" />
            <div className="flex w-full flex-col gap-tight">
              <FieldLabel>Assigned crew</FieldLabel>
              <div aria-label="Assigned crew" className="flex min-h-[calc(var(--spacing-32)+var(--spacing-6))] w-full flex-wrap items-center gap-tight rounded-control border border-border-default bg-surface-disabled px-compact py-micro">
                {b.crew.length ? (
                  b.crew.map((c) => <CrewChip key={c.id} name={c.name} initials={initials(c.name)} />)
                ) : (
                  <span className="flex h-[calc(var(--spacing-24)+var(--spacing-4))] items-center px-micro text-ui-input text-text-placeholder">No crew assigned</span>
                )}
              </div>
              <FieldHelper>{b.crew.length ? `${b.crew.length} crew assigned` : "No crew was assigned"}</FieldHelper>
            </div>
          </section>
          <Divider />
          <section aria-labelledby="ro-others" className="flex flex-col gap-base">
            <SectionHeader id="ro-others" title="Others" />
            <TextArea label="Terms & Conditions" helper="Printed on every invoice for this booking" maxLength={LIMITS.termsMax} value={b.terms} disabled readOnly />
          </section>
        </main>

        <aside aria-label="Summary and invoices" className={cn("flex min-w-0 flex-1 flex-col gap-inset border-l border-border-default bg-surface-header p-section", entering && cascade(1))}>
          <section aria-label="Totals" className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default p-inset">
            <h2 className="flex text-heading-section text-text-primary">
              <Txt>Totals</Txt>
            </h2>
            <SummaryRow label={b.packageNameSnapshot} value={formatIDR(b.packagePriceSnapshot)} />
            <SummaryRow label={`Additional items (${b.items.length})`} value={formatIDR(extras)} />
            <hr className="border-border-default" />
            <SummaryRow type="emphasis" label="Total booking" value={formatIDR(b.total)} />
            <SummaryRow label={`Paid (${n} ${n === 1 ? "invoice" : "invoices"})`} value={formatIDR(b.totalPaid)} />
            <div className="flex flex-col gap-micro rounded-control bg-surface-subtle p-base">
              <SummaryRow label="Not collected" value={formatIDR(b.remaining)} />
              <Txt className="text-caption text-text-secondary">
                {b.canceledAt ? `${pct}% paid before cancellation · no balance due.${n ? " Existing invoices stay on record." : ""}` : `${pct}% paid`}
              </Txt>
            </div>
          </section>
          <section aria-label="Invoices" className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default p-inset">
            <div className="flex items-center gap-compact">
              <h2 className="flex text-heading-section text-text-primary">
                <Txt>{`Invoices (${n})`}</Txt>
              </h2>
              <span className="flex-1" />
              <PaymentStatusBadge status={b.status} />
            </div>
            {n ? (
              b.invoices.map((inv, i) => (
                <InvoiceCard
                  key={inv.id}
                  number={inv.number}
                  issued={formatDateTime(inv.issuedAt)}
                  amount={formatIDR(inv.amount)}
                  meta={`Paid after this invoice: ${formatIDR(inv.snapshot.paidAfter)} of ${formatIDR(inv.snapshot.total)}`}
                  latest={i === 0}
                  pdfBusy={pdf.busyId === inv.id}
                  onPdf={() => pdf.download(inv)}
                />
              ))
            ) : (
              <DashedBox className="gap-compact p-inset text-center">
                <p className="flex text-body-strong text-text-primary">
                  <Txt>No invoices</Txt>
                </p>
                <p className="w-full text-caption text-text-secondary">{b.canceledAt ? "This booking was canceled before any payment. No new invoices can be created." : "No invoice has been created for this booking yet."}</p>
              </DashedBox>
            )}
          </section>
        </aside>
      </div>
      {pdf.dialog}
      {toastPresence.mounted && (
        <ToastRegion>
          <Toast presence={toastPresence.presence}>{toast?.text}</Toast>
        </ToastRegion>
      )}
    </>
  );
}

function Divider() {
  return <hr className="w-full border-border-default" />;
}

/** Select / Date field in the Disabled state (Figma Input field Type=Select|Date, State=Disabled). */
function DisabledBox({ label, required, value, leading, trailing }: { label: string; required?: boolean; value: string; leading?: "calendar"; trailing?: "chevron-down" }) {
  return (
    <div className="flex w-full flex-col gap-micro">
      <FieldLabel required={required}>{label}</FieldLabel>
      <FieldBox disabled>
        <span aria-disabled="true" aria-label={`${label}: ${value}`} className="flex h-full min-w-0 flex-1 cursor-not-allowed items-center gap-tight">
          {leading && <Icon name={leading} className="size-icon-sm text-text-secondary" />}
          <span className="min-w-0 flex-1 truncate text-ui-input text-text-placeholder">{value}</span>
          {trailing && <Icon name={trailing} className="size-icon-sm text-text-secondary" />}
        </span>
      </FieldBox>
    </div>
  );
}

/** Line item cell [State=Read-only]: h 36, pad 0/control, gap tight, surface/header, hairline border, radius control;
 *  value text/secondary, "Rp" prefix text/tertiary. */
function ReadOnlyCell({ value, prefix }: { value: string; prefix?: string }) {
  return (
    <span className="flex h-[calc(var(--spacing-32)+var(--spacing-4))] w-full min-w-0 items-center gap-tight rounded-control border border-border-default bg-surface-header px-control">
      {prefix && <Txt className="text-ui-input text-text-tertiary">{prefix}</Txt>}
      <span className="min-w-0 flex-1 truncate text-ui-input text-text-secondary">{value}</span>
    </span>
  );
}
