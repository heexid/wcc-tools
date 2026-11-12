"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { InputField } from "@/components/ds/InputField";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { cleanPayment, maskAccountNumber, PAYMENT_HELPER, paymentDetail, validatePayment, type PaymentErrors } from "@/lib/booking/payment";
import type { PaymentInstruction } from "@/lib/data/types";

// Figma Bookings · Hi-fi flow lane I (I1–I3, I2e) + Booking components › "Payment instruction card".

/** Payment instruction card [State=Filled | Read-only]: pad base, gap control, surface/default, 1px border/default,
 *  radius card; 36 icon tile (surface/accent, radius control, 18 wallet text/accent) · bank (Body Strong) / "number ·
 *  a.n. name" (Caption text/secondary) · Secondary "Edit" (pencil) — no button when read-only. */
export function PaymentInstructionCard({ value, onEdit, className }: { value: PaymentInstruction; onEdit?: () => void; className?: string }) {
  return (
    <div className={cn("flex w-full items-center gap-control rounded-card border border-border-default bg-surface-default p-base", className)}>
      <span className="flex size-[calc(var(--spacing-32)+var(--spacing-4))] shrink-0 items-center justify-center rounded-control bg-surface-accent text-text-accent">
        <Icon name="wallet" className="size-[calc(var(--spacing-16)+var(--spacing-2))]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Txt className="text-body-strong text-text-primary">{value.receiptName}</Txt>
        <span className="truncate text-caption text-text-secondary">{paymentDetail(value)}</span>
      </span>
      {onEdit && (
        <Button variant="secondary" icon="pencil" onClick={onEdit} aria-label={`Edit payment instruction (${value.receiptName})`}>
          Edit
        </Button>
      )}
    </div>
  );
}

/** "Payment instruction" field in the Package section, under the package info: UI/Field Label + card (gap micro). */
export function PaymentInstructionField({ value, onEdit }: { value: PaymentInstruction; onEdit?: () => void }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="flex w-full flex-col gap-micro">
      <span id={id} className="flex text-ui-field-label text-text-secondary">
        <Txt>Payment instruction</Txt>
      </span>
      <PaymentInstructionCard value={value} onEdit={onEdit} />
    </div>
  );
}

/**
 * Payment instruction modal — the DS Modal (CIR 20:1584): 640 wide, surface/header, radius card, Shadow/Floating;
 * header (pad base/group, gap control): × 20 · 1×20 divider · Heading/Module title; body (surface/default, hairline
 * border, top corners card, pad group/group/section/group, gap base): "Bank account" Heading/Section + three required
 * fields; footer (surface/default, top border, pad base/group, gap tight, right-aligned): Cancel · Save. Centred (Dialog).
 * Opens prefilled; Save with an empty / invalid field shows the I2e errors and keeps the modal open.
 */
export function PaymentInstructionModal({ open, value, onClose, onSave }: { open: boolean; value: PaymentInstruction; onClose: () => void; onSave: (v: PaymentInstruction) => void }) {
  const titleId = useId();
  const [draft, setDraft] = useState(value);
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [tried, setTried] = useState(false);
  // Every open starts from the booking's current instruction (Cancel / Esc drop the draft) — reset while rendering
  // the open transition, not on every parent re-render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setErrors({});
      setTried(false);
    }
  }
  const set = (k: keyof PaymentInstruction, v: string) => {
    const next = { ...draft, [k]: v };
    setDraft(next);
    if (tried) setErrors(validatePayment(next)); // errors clear as fields are fixed
  };
  const save = () => {
    const e = validatePayment(draft);
    setTried(true);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-payment-modal] [aria-invalid='true']")?.focus());
      return;
    }
    onSave(cleanPayment(draft));
  };
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} top="cancel" width="w-[calc(var(--spacing-64)*10)]" className="bg-surface-header" initialFocus="[data-payment-modal] input">
      <form
        data-payment-modal
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex flex-col"
      >
        <header className="flex items-center gap-control px-group py-base">
          <button type="button" aria-label="Close" data-close onClick={onClose} className="flex cursor-pointer rounded-small text-text-primary outline-none focus-visible:shadow-focus-ring">
            <Icon name="x" className="size-icon-md" />
          </button>
          <span aria-hidden className="h-20 w-px bg-border-default" />
          <h2 id={titleId} className="flex text-heading-module text-text-primary">
            <Txt>Payment instruction</Txt>
          </h2>
        </header>
        <div className="flex flex-col gap-base rounded-t-card border border-border-default bg-surface-default px-group pt-group pb-section">
          <h3 className="flex text-heading-section text-text-primary">
            <Txt>Bank account</Txt>
          </h3>
          <InputField label="Payment receipt name" required placeholder={PAYMENT_HELPER.receiptName} value={draft.receiptName} onChange={(e) => set("receiptName", e.target.value)} error={errors.receiptName} helper={PAYMENT_HELPER.receiptName} />
          <InputField label="Account number" required inputMode="numeric" placeholder="e.g. 1234567890" value={draft.accountNumber} onChange={(e) => set("accountNumber", maskAccountNumber(e.target.value))} error={errors.accountNumber} helper={PAYMENT_HELPER.accountNumber} />
          <InputField label="Account name" required placeholder={PAYMENT_HELPER.accountName} value={draft.accountName} onChange={(e) => set("accountName", e.target.value)} error={errors.accountName} helper={PAYMENT_HELPER.accountName} />
        </div>
        <footer className="flex justify-end gap-tight border-t border-border-default bg-surface-default px-group py-base">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </footer>
      </form>
    </Dialog>
  );
}
