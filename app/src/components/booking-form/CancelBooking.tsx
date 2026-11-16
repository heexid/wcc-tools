"use client";

import { useId, useState } from "react";
import { Button, WarningButton } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { SectionHeader } from "@/components/ds/Editor";
import { Alert } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { TextArea } from "@/components/ds/TextArea";
import { Txt } from "@/components/ds/Txt";
import { LIMITS } from "@/lib/booking/calc";
import { formatIDR } from "@/lib/format";

// Figma Bookings 33 / 34 — Cancel booking (PRD US-12, INTERACTIONS 2.15 / 2.16, flow lane H).

/** Section at the end of the booking form (33): Heading/Section title · row (gap group): explanation Body
 *  text/secondary (fills) · Warning button "Cancel booking". Only for a saved Draft / Partially paid booking. */
export function CancelBookingSection({ onCancel }: { onCancel: () => void }) {
  return (
    <section aria-labelledby="sec-cancel" className="flex flex-col gap-base">
      <SectionHeader id="sec-cancel" title="Cancel booking" />
      <div className="flex items-center gap-group">
        <p className="min-w-0 flex-1 text-body text-text-secondary">
          Canceling makes this booking read-only: no edits and no new invoices. Existing invoices stay on record. A canceled booking can’t be reopened.
        </p>
        <WarningButton onClick={onCancel}>Cancel booking</WarningButton>
      </div>
    </section>
  );
}

/** Modal (34): 520 wide, 220 from the top. Header (pad inset/group, gap control, bottom border): 36 danger circle with
 *  circle-x · "Cancel this booking?" Heading/Section over "BK-… · name" Caption. Body (pad inset/group, gap base):
 *  Warning alert "This can’t be undone" · Reason (optional) text area ≤ 255 with counter. Footer (surface/subtle, top
 *  border, pad base/group, right): Keep booking (default focus; Esc / scrim do the same) · Warning "Cancel booking". */
export function CancelBookingDialog({
  open,
  title,
  invoiceCount,
  paid,
  busy,
  failed,
  onKeep,
  onConfirm,
}: {
  open: boolean;
  /** "BK-2026-0142 · Wedding · Sari & Dimas" */
  title: string;
  invoiceCount: number;
  paid: number;
  busy: boolean;
  failed: boolean;
  onKeep: () => void;
  onConfirm: (reason: string) => void;
}) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason(""); // each opening starts empty
  }
  const tooLong = reason.length > LIMITS.cancelReasonMax;
  const record = invoiceCount
    ? `The ${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"} (${formatIDR(paid)} paid) stay on record — refunds are handled outside the app.`
    : "There are no invoices on this booking yet.";
  return (
    <Dialog open={open} onClose={onKeep} locked={busy} role="alertdialog" labelledBy={titleId} top="cancel" width="w-[calc(var(--spacing-64)*8+var(--spacing-8))]" initialFocus="[data-keep]">
      <header className="flex items-center gap-control border-b border-border-default px-group py-inset">
        <span className="flex size-[calc(var(--spacing-32)+var(--spacing-4))] shrink-0 items-center justify-center rounded-pill bg-surface-danger text-status-danger">
          <Icon name="circle-x" className="size-icon-md" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 id={titleId} className="flex text-heading-section text-text-primary">
            <Txt>Cancel this booking?</Txt>
          </h2>
          <Txt className="text-caption text-text-secondary">{title}</Txt>
        </div>
      </header>
      <div className="flex flex-col gap-base px-group py-inset">
        {failed && (
          <Alert tone="danger" title="Couldn’t cancel the booking" className="motion-notice">
            Connection lost. Nothing changed — try again.
          </Alert>
        )}
        <Alert tone="warning" title="This can’t be undone">
          {`After canceling, the booking becomes read-only: it can’t be edited and no new invoices can be created. ${record}`}
        </Alert>
        <TextArea
          label="Reason (optional)"
          placeholder="e.g. Client postponed the wedding to next year"
          helper="Shown on the canceled booking"
          maxLength={LIMITS.cancelReasonMax}
          value={reason}
          onValueChange={setReason}
          error={tooLong ? "Max 255 characters" : undefined}
        />
      </div>
      <footer className="flex items-center justify-end gap-compact border-t border-border-default bg-surface-subtle px-group py-base">
        <Button variant="secondary" data-keep disabled={busy} onClick={onKeep}>
          Keep booking
        </Button>
        <WarningButton disabled={busy || tooLong} aria-busy={busy || undefined} onClick={() => onConfirm(reason)}>
          {busy ? "Canceling…" : "Cancel booking"}
        </WarningButton>
      </footer>
    </Dialog>
  );
}
