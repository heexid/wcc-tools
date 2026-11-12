"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { PaymentStatusBadge, type BookingStatus } from "@/components/ds/Badges";
import { Button } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { SummaryRow } from "@/components/ds/Editor";
import { Alert } from "@/components/ds/Feedback";
import { InputField } from "@/components/ds/InputField";
import { SegmentedControl } from "@/components/ds/SegmentedControl";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { invoiceErrorMessage, validateInvoice, type DpMethod, type InvoiceError, type InvoiceRequest } from "@/lib/booking/calc";
import { formatIDR } from "@/lib/format";

// Figma Bookings 04 / 04c / 05b / 22 / 23 — New invoice #1 modal over the New booking screen (PRD US-2, PLAN §5,
// INTERACTIONS 2.11, 3.1–3.3, 3.5–3.8); 09 / 10 — follow-up New invoice #n over Edit booking (PRD US-5, 3.4):
// Partial (amount, 1 ≤ amount < remaining, "use Paid to settle in full") / Paid (Lunas) (locked to the remaining
// balance, "Confirm full payment"). 640 wide, 150 from the top, radius card, Shadow/Floating.
// Header (surface/header, pad base/inset, gap control): ghost × · title Heading/Section over Caption subtitle · status.
// Body (pad inset, gap base): [failure alert] · booking balance strip · invoice configurator (gap base):
//   Invoice type segmented · DP: "Calculate DP by" segmented + DP percentage / DP amount · Full: read-only amount ·
//   payment summary (surface/accent; surface/subtle while there's no valid amount, Figma 05b).
// Footer (top border, pad base/inset, gap compact): caption · Cancel · Confirm & generate invoice (circle-check, as every invoice confirm — 2026-11-12).

export type InvoiceModalRequest = Required<Pick<InvoiceRequest, "type">> & { dp?: { method: DpMethod; value: number }; amount?: number };
/** @deprecated name kept for F11 call sites */
export type FirstInvoiceRequest = InvoiceModalRequest;

type Props = {
  open: boolean;
  onClose: () => void;
  /** "For this new booking · Wedding · Sari & Dimas" */
  subtitle: string;
  status: BookingStatus;
  /** Booking total, including unsaved edits (Figma 09: the balance uses the updated total). */
  total: number;
  /** Already paid and how many invoices — 0 / 0 → first invoice (DP / Full), otherwise follow-up (Partial / Paid). */
  paid?: number;
  invoiceCount?: number;
  /** Confirm also saves pending booking edits (US-5) — only changes the in-progress caption. */
  pendingEdits?: boolean;
  /** Confirm in flight (Bookings 22) — Confirm loading, Cancel / × / Esc / scrim disabled. */
  busy: boolean;
  /** Last Confirm failed (Bookings 23) — alert at the top, Confirm becomes "Try again". */
  failed: boolean;
  /** Server-side rejection (e.g. the total changed) — shown under the amount. */
  rejected?: InvoiceError | null;
  onConfirm: (req: InvoiceModalRequest) => void;
};

const digits = (v: string) => v.replace(/\D/g, "");

/** "12,5" / "12.5" → 12.5; keeps at most 2 decimals and one separator (typed as in Indonesian, shown with a comma). */
function cleanPct(v: string): string {
  const s = v.replace(/\s*%\s*$/, "").replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [int, ...rest] = s.split(",");
  const dec = rest.join("").slice(0, 2);
  const i = int.replace(/^0+(?=\d)/, "").slice(0, 3);
  return rest.length ? `${i || "0"},${dec}` : i;
}
const pctValue = (raw: string) => Number(raw.replace(",", "."));

export function NewInvoiceModal(props: Props) {
  // Each opening starts fresh (3.1: closing creates nothing and keeps nothing).
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(props.open);
  if (props.open !== wasOpen) {
    setWasOpen(props.open);
    if (props.open) setSession((s) => s + 1);
  }
  const titleId = useId();
  return (
    <Dialog open={props.open} onClose={props.onClose} locked={props.busy} labelledBy={titleId} top="invoice" width="w-[calc(var(--spacing-64)*10)]">
      <Configurator key={session} titleId={titleId} {...props} />
    </Dialog>
  );
}

function Configurator(props: Props & { titleId: string }) {
  return props.invoiceCount ? <FollowUp {...props} /> : <First {...props} />;
}

function First({ titleId, onClose, subtitle, status, total, busy, failed, rejected, onConfirm }: Props & { titleId: string }) {
  const [type, setType] = useState<"dp" | "full">("dp");
  // The DP group drops in only when the admin brings it back (Full → DP); on open it arrives with the modal.
  const [toggled, setToggled] = useState(false);
  const [method, setMethod] = useState<DpMethod>("percentage");
  const [pct, setPct] = useState("");
  const [fixed, setFixed] = useState("");

  const raw = method === "percentage" ? pct : fixed;
  const req: InvoiceModalRequest | null =
    type === "full" ? { type: "full" } : raw === "" ? null : { type: "dp", dp: { method, value: method === "percentage" ? pctValue(pct) : Number(digits(fixed)) } };
  const check = req ? validateInvoice({ total, totalPaid: 0, invoiceCount: 0 }, req) : null;
  const amount = check?.ok ? check.amount : null;
  const error = check && !check.ok ? check.error : rejected ?? null;
  const errorText = error ? invoiceErrorMessage(error, { total, remaining: total }, formatIDR) : undefined;
  const valid = amount !== null && !rejected;

  const confirm = () => {
    if (valid && req && !busy) onConfirm(req);
  };

  return (
    <Shell
      titleId={titleId}
      title="New invoice #1"
      subtitle={subtitle}
      status={status}
      onClose={onClose}
      busy={busy}
      failed={failed}
      balance={{ total, paid: 0, count: 0 }}
      caption="Saving booking and creating invoice…"
      confirm={{ label: "Confirm & generate invoice", icon: "circle-check", enabled: valid, onConfirm: confirm }}
    >
        <div className="flex flex-col gap-base">
          <Group label="Invoice type">
            <SegmentedControl
              label="Invoice type"
              value={type}
              onChange={(t) => {
                setType(t);
                setToggled(true);
              }}
              options={[
                { value: "dp", label: "DP (down payment)" },
                { value: "full", label: "Full price" },
              ]}
            />
          </Group>

          {type === "dp" ? (
            <>
              {/* Progressive disclosure (3.2): the method only exists for DP. */}
              <Group label="Calculate DP by" className={cn(toggled && "motion-notice")}>
                <SegmentedControl
                  label="Calculate DP by"
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: "percentage", label: "Percentage (%)" },
                    { value: "fixed", label: "Fixed amount (Rp)" },
                  ]}
                />
              </Group>
              {method === "percentage" ? (
                <PercentField value={pct} onChange={setPct} error={errorText} />
              ) : (
                <InputField
                  key="fixed"
                  label="DP amount"
                  required
                  inputMode="numeric"
                  placeholder="Rp 0"
                  value={fixed ? `Rp ${Number(fixed).toLocaleString("id-ID")}` : ""}
                  onChange={(e) => setFixed(digits(e.target.value).replace(/^0+(?=\d)/, "").slice(0, 15))}
                  error={errorText}
                  helper={`Up to the booking total (${formatIDR(total)})`}
                />
              )}
            </>
          ) : (
            <InputField label="Payment amount" disabled readOnly value={formatIDR(total)} helper="Full price is always 100% of the total" error={errorText} />
          )}

          <section
            aria-label="Payment summary"
            aria-live="polite"
            className={cn(
              "flex flex-col gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-control p-base transition-colors duration-(--dur-collapse) ease-(--ease-out)",
              valid ? "bg-surface-accent" : "bg-surface-subtle",
            )}
          >
            <SummaryRow label="Total booking amount" value={formatIDR(total)} />
            <SummaryRow label="Invoice type" value={type === "dp" ? "DP" : "Full price"} />
            {type === "dp" && <SummaryRow label="Payment method" value={method === "percentage" ? (pct && valid ? `Percentage · ${pct}%` : "Percentage") : "Fixed amount"} />}
            <hr className="border-border-default" />
            <SummaryRow type="accent" label="Total bayar" value={valid ? formatIDR(amount) : "—"} />
            <SummaryRow type="emphasis" label="Remaining balance" value={valid ? formatIDR(total - amount) : "—"} />
          </section>
        </div>
    </Shell>
  );
}

/** Follow-up invoice #n (Figma 09 / 10): Partial / Paid (Lunas) against the updated total. */
function FollowUp({ titleId, onClose, subtitle, status, total, paid = 0, invoiceCount = 1, pendingEdits, busy, failed, rejected, onConfirm }: Props & { titleId: string }) {
  const [type, setType] = useState<"partial" | "paid">("partial");
  const [raw, setRaw] = useState("");
  const remaining = total - paid;
  const req: InvoiceModalRequest | null = type === "paid" ? { type: "paid" } : raw === "" ? null : { type: "partial", amount: Number(raw) };
  const check = req ? validateInvoice({ total, totalPaid: paid, invoiceCount }, req) : null;
  const amount = check?.ok ? check.amount : null;
  const error = check && !check.ok ? check.error : rejected ?? null;
  const errorText = error ? invoiceErrorMessage(error, { total, remaining }, formatIDR) : undefined;
  const valid = amount !== null && !rejected;
  const n = `${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"}`;
  return (
    <Shell
      titleId={titleId}
      title={`New invoice #${invoiceCount + 1}`}
      subtitle={subtitle}
      status={status}
      onClose={onClose}
      busy={busy}
      failed={failed}
      balance={{ total, paid, count: invoiceCount }}
      caption={pendingEdits ? "Saving changes and creating invoice…" : "Creating invoice…"}
      confirm={
        type === "paid"
          ? { label: "Confirm full payment", icon: "circle-check", enabled: valid, onConfirm: () => valid && req && !busy && onConfirm(req) }
          : { label: "Confirm & generate invoice", icon: "circle-check", enabled: valid, onConfirm: () => valid && req && !busy && onConfirm(req) }
      }
    >
      <div className="flex flex-col gap-base">
        <Group label="Invoice type">
          <SegmentedControl
            label="Invoice type"
            value={type}
            onChange={setType}
            options={[
              { value: "partial", label: "Partial" },
              { value: "paid", label: "Paid (Lunas)" },
            ]}
          />
        </Group>
        {type === "partial" ? (
          <InputField
            key="partial"
            label="Payment amount"
            required
            inputMode="numeric"
            placeholder="Rp 0"
            value={raw ? `Rp ${Number(raw).toLocaleString("id-ID")}` : ""}
            onChange={(e) => setRaw(digits(e.target.value).replace(/^0+(?=\d)/, "").slice(0, 15))}
            error={errorText}
            helper={invoiceErrorMessage("partial_not_less_than_remaining", { total, remaining }, formatIDR)}
          />
        ) : (
          <InputField key="paid" label="Payment amount" disabled readOnly value={formatIDR(remaining)} helper="Auto-calculated: updated total − previously paid" error={errorText} />
        )}
        <section
          aria-label="Payment summary"
          aria-live="polite"
          className={cn(
            "flex flex-col gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-control p-base transition-colors duration-(--dur-collapse) ease-(--ease-out)",
            valid ? "bg-surface-accent" : "bg-surface-subtle",
          )}
        >
          <SummaryRow label="Updated booking total" value={formatIDR(total)} />
          <SummaryRow label={`Previously paid (${n})`} value={formatIDR(paid)} />
          <SummaryRow type="accent" label="This payment" value={valid ? formatIDR(amount) : "—"} />
          <hr className="border-border-default" />
          <SummaryRow type="emphasis" label="New total paid" value={valid ? formatIDR(paid + amount) : "—"} />
          <SummaryRow type="emphasis" label="New remaining balance" value={valid ? formatIDR(remaining - amount) : "—"} />
        </section>
      </div>
    </Shell>
  );
}

/** Modal chrome shared by both modes: header · [failure alert] · balance strip · {children} · footer. */
function Shell({
  titleId,
  title,
  subtitle,
  status,
  onClose,
  busy,
  failed,
  balance,
  caption,
  confirm,
  children,
}: {
  titleId: string;
  title: string;
  subtitle: string;
  status: BookingStatus;
  onClose: () => void;
  busy: boolean;
  failed: boolean;
  balance: { total: number; paid: number; count: number };
  caption: string;
  confirm: { label: string; icon: "circle-check"; enabled: boolean; onConfirm: () => void };
  children: React.ReactNode;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        confirm.onConfirm();
      }}
      className="flex flex-col"
    >
      <header className="flex items-center gap-control bg-surface-header px-inset py-base">
        <Button variant="ghost" iconOnly icon="x" aria-label="Close" data-close disabled={busy} onClick={onClose} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={titleId} className="flex text-heading-section text-text-primary">
            <Txt>{title}</Txt>
          </h2>
          <Txt className="text-caption text-text-secondary">{subtitle}</Txt>
        </div>
        <PaymentStatusBadge status={status} />
      </header>

      <div className="flex flex-col gap-base p-inset">
        {failed && (
          <Alert tone="danger" title="Couldn’t create the invoice" className="motion-notice">
            Connection lost. Nothing was saved — your entries are kept. Try again.
          </Alert>
        )}
        <dl aria-label="Booking balance" className="flex gap-control rounded-control border border-border-default bg-surface-subtle px-base py-control">
          <Balance label="Total booking" value={formatIDR(balance.total)} />
          <Balance label={`Paid (${balance.count} ${balance.count === 1 ? "invoice" : "invoices"})`} value={formatIDR(balance.paid)} tone="text-status-positive" />
          <Balance label="Remaining" value={formatIDR(balance.total - balance.paid)} tone="text-text-accent" />
        </dl>
        {children}
      </div>

      <footer className="flex items-center gap-compact border-t border-border-default px-inset py-base">
        <span role="status" className="flex">
          <Txt className="text-caption text-text-secondary">{busy ? caption : "Invoice is linked to this booking once confirmed"}</Txt>
        </span>
        <span className="flex-1" />
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" icon={confirm.icon} loading={busy} disabled={!confirm.enabled}>
          {failed && !busy ? "Try again" : confirm.label}
        </Button>
      </footer>
    </form>
  );
}

function Balance({ label, value, tone = "text-text-primary" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <dt className="flex text-caption text-text-secondary">
        <Txt>{label}</Txt>
      </dt>
      <dd className={cn("flex text-body-strong", tone)}>
        <Txt>{value}</Txt>
      </dd>
    </div>
  );
}

function Group({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-tight", className)}>
      <span className="flex text-ui-field-label text-text-secondary">
        <Txt>{label}</Txt>
      </span>
      {children}
    </div>
  );
}

/** DP percentage: the value reads "40 %" (Figma 04); the caret never passes the suffix. 0–100, ≤ 2 decimals. */
function PercentField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const shown = value ? `${value} %` : "";
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && document.activeElement === el && el.selectionStart !== null && el.selectionStart > value.length) el.setSelectionRange(value.length, value.length);
  }, [value]);
  return (
    <InputField
      ref={ref}
      label="DP percentage"
      required
      inputMode="decimal"
      placeholder="0 %"
      value={shown}
      onChange={(e) => onChange(cleanPct(e.target.value))}
      error={error}
      helper="0–100% of total booking"
    />
  );
}
