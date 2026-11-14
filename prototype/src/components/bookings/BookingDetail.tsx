"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { PaymentStatusBadge } from "@/components/ds/Badges";
import { Button } from "@/components/ds/Button";
import { CrewChipButton, DashedBox } from "@/components/ds/Editor";
import { Alert, Toast } from "@/components/ds/Feedback";
import { Icon, type IconName } from "@/components/ds/Icon";
import { InvoiceCard } from "@/components/ds/InvoiceCard";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { paidPercent } from "@/lib/booking/calc";
import { paymentDetail } from "@/lib/booking/payment";
import { now } from "@/lib/clock";
import { getBooking, type BookingDetail as Detail } from "@/lib/data/repo";
import { formatDate, formatDateTime, formatDateWithDay, formatIDR, formatPhone, initials, isoToLocalDate, waLink } from "@/lib/format";
import { useShellCrumb } from "@/components/shell/AppShell";
import { useInvoicePdf } from "@/components/pdf/useInvoicePdf";
import { CrewSchedulePopover, type CrewPopoverAnchor } from "./CrewSchedule";
import { useIsViewer } from "@/lib/role";
import { Loader } from "@/components/ds/Loading";

// Figma Bookings 06 / 21 / 24 / 27 — Booking detail (PRD US-9, PLAN §7, INTERACTIONS 4.1–4.10). Read-only.
// Header (pad inset/group, gap control, bottom border): ref Caption secondary · status · [open full page · ×] /
// title Heading/Panel / Edit booking (Primary, pencil) · Download latest PDF (Secondary, hidden while Draft).
// Body (pad inset/group, gap group, scrolls): financial summary card (surface/subtle, pad base, gap control: three
// stats Caption / Heading/Section · 6px progress · caption) · Booking information (gap 10; key column 150 with a
// 16 icon) · Additional items (gap compact) · divider · Invoices (n) (gap control): Invoice cards newest first,
// or the dashed empty state with the hint (21).

type Props = {
  id: string;
  mode: "sheet" | "page";
  onClose?: () => void;
  /** ↗ Open full page — `canceled` picks the read-only full page (Figma H5) over Edit booking. */
  onOpenFull?: (canceled: boolean) => void;
  onEdit: () => void;
  /** Crew schedule → another booking (switches the panel, 4.9). */
  onOpenBooking: (id: string) => void;
  /** Crew schedule → Calendar filtered to that crew member (4.10). */
  onSeeInCalendar: (crewId: string) => void;
};

export function BookingDetail({ id, mode, onClose, onOpenFull, onEdit, onOpenBooking, onSeeInCalendar }: Props) {
  const [state, setState] = useState<{ id: string; b: Detail | null } | null>(null);
  const viewer = useIsViewer();
  const [crewAnchor, setCrewAnchor] = useState<CrewPopoverAnchor | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastPresence = usePresence(!!toast);
  const chips = useRef(new Map<string, HTMLButtonElement>());
  const pdf = useInvoicePdf(); // 4.2 / 4.6 / 4.12
  // Content eases in after the Loader (first open) and when switching to another booking inside the open sheet (4.9).
  const swap = "motion-notice";

  useEffect(() => {
    let live = true;
    getBooking(id).then((b) => live && setState({ id, b }));
    return () => {
      live = false;
    };
  }, [id]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const b = state?.id === id ? state.b : undefined;
  useShellCrumb(mode === "page" ? (b?.ref ?? null) : null); // full page: breadcrumb shows the ref
  if (b === undefined)
    return (
      <div className="flex flex-1 items-center justify-center" aria-busy="true">
        <Loader label="Loading booking…" />
      </div>
    ); // 6.3: DS Loader in the detail panel
  if (b === null) return <p className="p-group text-body text-text-secondary">This booking doesn’t exist.</p>;

  const today = isoToLocalDate(now().toISOString());
  const pct = paidPercent(b.total, b.totalPaid);
  const canceled = b.status === "canceled";
  const line = canceled
    ? `${pct}% paid before cancellation · no balance due`
    : b.status === "draft"
      ? "Draft · no invoice yet"
      : b.status === "paid"
        ? `Paid in full · ${b.invoices.length} ${b.invoices.length === 1 ? "invoice" : "invoices"}`
        : `${pct}% paid · balance due ${b.bookingDate === today ? `today (${formatDate(b.bookingDate)})` : `before ${formatDate(b.bookingDate)}`}`;

  return (
    <>
      <header key={`h-${id}`} className={cn("flex shrink-0 flex-col gap-control border-b border-border-default px-group py-inset", swap)}>
        <div className="flex h-32 items-center gap-compact">
          <Txt className="text-caption text-text-secondary">{b.ref}</Txt>
          <PaymentStatusBadge status={b.status} />
          <span className="flex-1" />
          {mode === "sheet" && (
            <>
              <Button variant="ghost" iconOnly icon="external-link" aria-label="Open full page" onClick={() => onOpenFull?.(canceled || viewer)} />
              <Button variant="ghost" iconOnly icon="x" aria-label="Close" data-close onClick={onClose} />
            </>
          )}
        </div>
        <h2 tabIndex={-1} data-sheet-focus className="flex text-heading-panel text-text-primary outline-none">
          <Txt>{b.bookingName}</Txt>
        </h2>
        <div className="flex gap-compact">
          {!canceled && !viewer && (
            <Button icon="pencil" onClick={onEdit}>
              Edit booking
            </Button>
          )}
          {b.invoices.length > 0 && (
            <Button variant="secondary" icon="download" loading={pdf.busyId === b.invoices[0].id} onClick={() => pdf.download(b.invoices[0])}>
              Download latest PDF
            </Button>
          )}
        </div>
        {canceled && (
          // Canceled (Figma 35, US-12 / 4.11): danger alert in the header — when, by whom, the reason if given.
          <Alert tone="danger" title={`Canceled on ${formatDate(isoToLocalDate(b.canceledAt!))} by ${b.canceledBy}`}>
            {`${b.cancelReason ? `Reason: ${b.cancelReason.replace(/\.?$/, ".")} ` : ""}This booking is read-only — it can’t be edited and no new invoices can be created.`}
          </Alert>
        )}
      </header>

      <div key={`b-${id}`} className={cn("flex flex-col gap-group px-group py-inset", mode === "sheet" && "min-h-0 flex-1 overflow-y-auto", swap)}>
        <section aria-label="Financial summary" className="flex flex-col gap-control rounded-card border border-border-default bg-surface-subtle p-base">
          <dl className="flex gap-control">
            <Stat label="Total booking" value={formatIDR(b.total)} />
            <Stat label="Total paid" value={formatIDR(b.totalPaid)} tone="text-status-positive" />
            {canceled ? <Stat label="Not collected" value={formatIDR(b.remaining)} tone="text-text-tertiary" /> : <Stat label="Remaining" value={formatIDR(b.remaining)} tone="text-text-accent" />}
          </dl>
          <div role="progressbar" aria-label="Paid" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-6 w-full overflow-hidden rounded-pill bg-surface-disabled">
            <div className="h-full bg-accent-primary" style={{ width: `${pct}%` }} />
          </div>
          <Txt className="text-caption text-text-secondary">{line}</Txt>
        </section>

        <section aria-labelledby="bd-info" className="flex flex-col gap-[calc(var(--spacing-12)-var(--spacing-2))]">
          <h3 id="bd-info" className="flex text-heading-subsection text-text-primary">
            <Txt>Booking information</Txt>
          </h3>
          <Row icon="user" label="Client">
            <Txt className="text-body text-text-primary">{b.clientName}</Txt>
          </Row>
          <Row icon="phone" label="Phone">
            <a href={waLink(b.clientPhone)} target="_blank" rel="noopener noreferrer" aria-label={`${formatPhone(b.clientPhone)} (WhatsApp, opens in a new tab)`} className="flex rounded-small text-body text-text-accent underline outline-none focus-visible:shadow-focus-ring">
              <Txt>{formatPhone(b.clientPhone)}</Txt>
            </a>
          </Row>
          <Row icon="calendar" label="Booking date">
            <Txt className="text-body text-text-primary">{`${formatDateWithDay(b.bookingDate)}${b.bookingDate === today ? " · today" : ""}`}</Txt>
          </Row>
          <Row icon="package" label="Package">
            <Txt className="text-body text-text-primary">{`${b.packageNameSnapshot} · ${formatIDR(b.packagePriceSnapshot)}`}</Txt>
          </Row>
          {/* Payment instruction (lane I) — printed on every invoice. */}
          <Row icon="wallet" label="Payment">
            <Txt className="text-body text-text-primary">{`${b.paymentInstruction.receiptName} · ${paymentDetail(b.paymentInstruction)}`}</Txt>
          </Row>
          <Row icon="users" label="Crew" top>
            {b.crew.length ? (
              <span className="flex flex-wrap gap-tight">
                {b.crew.map((c) => (
                  <CrewChipButton
                    key={c.id}
                    ref={(el) => {
                      if (el) chips.current.set(c.id, el);
                      else chips.current.delete(c.id);
                    }}
                    name={c.name}
                    initials={initials(c.name)}
                    open={crewAnchor?.crewId === c.id}
                    onClick={() => setCrewAnchor((a) => (a?.crewId === c.id ? null : { crewId: c.id, el: chips.current.get(c.id)!, align: "start" }))}
                  />
                ))}
              </span>
            ) : (
              <Txt className="text-body text-text-secondary">No crew assigned</Txt>
            )}
          </Row>
          <Row icon="clock" label="Created">
            <Txt className="text-body text-text-secondary">{`${formatDate(isoToLocalDate(b.createdAt))} by ${b.createdBy}`}</Txt>
          </Row>
        </section>

        <section aria-labelledby="bd-items" className="flex flex-col gap-compact">
          <h3 id="bd-items" className="flex text-heading-subsection text-text-primary">
            <Txt>{`Additional items (${b.items.length})`}</Txt>
          </h3>
          {b.items.length === 0 && <Txt className="text-caption text-text-secondary">No additional items</Txt>}
          {b.items.map((it) => (
            <div key={it.id} className="flex w-full items-center gap-compact">
              <Txt className="text-body text-text-primary">{it.name}</Txt>
              <Txt className="text-caption text-text-tertiary">{`${it.qty} × ${formatIDR(it.price)}`}</Txt>
              <span className="flex-1" />
              <Txt className="text-body text-text-primary">{formatIDR(it.price * it.qty)}</Txt>
            </div>
          ))}
        </section>

        <hr className="border-border-default" />

        <section aria-labelledby="bd-invoices" className="flex flex-col gap-control">
          <div className="flex items-center">
            <h3 id="bd-invoices" className="flex text-heading-subsection text-text-primary">
              <Txt>{`Invoices (${b.invoices.length})`}</Txt>
            </h3>
            <span className="flex-1" />
            <Txt className="text-caption text-text-secondary">Linked to this booking</Txt>
          </div>
          {b.invoices.length ? (
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
            <DashedBox className="gap-compact p-group text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/empty-invoice.png" srcSet="/assets/empty-invoice.png 1x, /assets/empty-invoice@2x.png 2x" alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
              <p className="flex text-body-strong text-text-primary">
                <Txt>No invoices yet</Txt>
              </p>
              <p className="w-full text-caption text-text-secondary">{viewer ? "No invoice has been created for this booking yet." : "Open Edit booking to create the first invoice (DP or full price). Invoices are created inside the booking screen."}</p>
            </DashedBox>
          )}
        </section>
      </div>

      <CrewSchedulePopover
        anchor={crewAnchor}
        currentBookingId={b.id}
        onClose={() => setCrewAnchor(null)}
        onOpenBooking={(next) => {
          setCrewAnchor(null);
          onOpenBooking(next);
        }}
        onSeeInCalendar={(crewId) => {
          setCrewAnchor(null);
          onSeeInCalendar(crewId);
        }}
      />
      {pdf.dialog}
      {toastPresence.mounted && (
        <div className="pointer-events-none fixed inset-x-0 bottom-section z-50 flex justify-center">
          <Toast presence={toastPresence.presence}>{toast}</Toast>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, tone = "text-text-primary" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <dt className="flex text-caption text-text-secondary">
        <Txt>{label}</Txt>
      </dt>
      <dd className={cn("flex text-heading-section", tone)}>
        <Txt>{value}</Txt>
      </dd>
    </div>
  );
}

/** Info row: key column 150 (16 icon text/secondary · Caption secondary, gap tight) · value (gap compact). */
function Row({ icon, label, top, children }: { icon: IconName; label: string; top?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex w-full gap-compact", top ? "items-start" : "items-center")}>
      <span className="flex w-[calc(var(--spacing-64)*2+var(--spacing-24)-var(--spacing-2))] shrink-0 items-center gap-tight text-text-secondary">
        <Icon name={icon} className="size-icon-sm" />
        <Txt className="text-caption">{label}</Txt>
      </span>
      {children}
    </div>
  );
}
