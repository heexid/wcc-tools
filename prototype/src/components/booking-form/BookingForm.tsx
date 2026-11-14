"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useId, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors } from "react-hook-form";
import { Button } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { DashedBox, EditorPageHeader, IconAction, InlineInput, LINE_COLS, LineItemHeader, SectionHeader, SummaryRow } from "@/components/ds/Editor";
import { Alert, Toast, ToastRegion, type ToastTone } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { InputField } from "@/components/ds/InputField";
import { PaymentStatusBadge, type BookingStatus } from "@/components/ds/Badges";
import { TextArea } from "@/components/ds/TextArea";
import { Tooltip } from "@/components/ds/Tooltip";
import { Txt } from "@/components/ds/Txt";
import { cascade, cascadeChildren, useEntrance } from "@/components/ds/useEntrance";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { InvoiceCard } from "@/components/ds/InvoiceCard";
import { EditorActions, HeaderDivider, useShellCrumb } from "@/components/shell/AppShell";
import { useLeaveGuard } from "@/components/shell/LeaveGuard";
import { LIMITS, type InvoiceError } from "@/lib/booking/calc";
import { bookingSchema, countErrors, emptyItem, itemSubtotal, maskAmount, maskQty, MSG, toBookingInput, type BookingFormValues } from "@/lib/booking/form";
import { now } from "@/lib/clock";
import { cancelBooking, saveBooking, saveBookingAndCreateInvoice } from "@/lib/data/repo";
import { getDb } from "@/lib/data/store";
import type { Crew, Invoice, Package } from "@/lib/data/types";
import { formatDate, formatDateTime, formatIDR, formatPhone, isoToLocalDate, normalizePhone, type ISODate } from "@/lib/format";
import { CrewSelect, DateField, PackageSelect } from "./FormPopovers";
import { NewInvoiceModal, type InvoiceModalRequest } from "./InvoiceModal";
import { CancelBookingDialog, CancelBookingSection } from "./CancelBooking";
import { useInvoicePdf } from "@/components/pdf/useInvoicePdf";
import { PaymentInstructionField, PaymentInstructionModal } from "./PaymentInstruction";
import { setFlash } from "@/lib/flash";
import { useRouter } from "next/navigation";

// Figma Bookings 03 / 03b / 13 / 14 / 15 / 32 / 39 / 40 — New booking (Layout/Editor). PRD US-1, PLAN §5,
// INTERACTIONS 2.1b, 2.2, 2.4–2.10, 2.12, 2.17.
// Page header (‹ · "New booking" · Draft) · workspace: form column 624 (pad group/0/40/0, sections + 1px
// dividers, gap 28) | summary rail (fills, surface/header, left border, pad section, gap inset): Booking
// summary card + Invoices (0) card. Editor global header: "Draft · not saved" · Cancel · Save booking.

type Props = {
  /** Prefilled booking date from the calendar (?date=) — doesn't make the form dirty (PRD US-1). */
  date: ISODate | null;
  /** Edit mode: the saved booking (F10 / F11 / F13). `packagePrice` is its saved package price (kept while the package
   *  is unchanged — US-0), `total` / `totalPaid` the saved figures the diff strip and below-paid rule compare with. */
  initial?: {
    id: string;
    ref: string;
    bookingName: string;
    status: BookingStatus;
    invoices: Invoice[];
    values: BookingFormValues;
    createdAt: string;
    packagePrice: number;
    total: number;
    totalPaid: number;
  };
};

const STATUS_LABEL: Record<BookingStatus, string> = { draft: "Draft", partially_paid: "Partially paid", paid: "Paid", canceled: "Canceled" };

function useCatalog() {
  const [cat, setCat] = useState(() => {
    const d = getDb();
    return { packages: d.packages, crew: d.crew, terms: d.settings.defaultTerms, payment: d.settings.defaultPayment };
  });
  const refresh = useCallback(() => {
    const d = getDb();
    setCat((c) => ({ ...c, packages: d.packages, crew: d.crew }));
  }, []);
  // Package lists refresh when the booking tab regains focus (PRD US-0 — the library opens in a new tab).
  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);
  return { ...cat, refresh };
}

/** Live booking summary (US-1: updates on every keystroke). */
function BookingSummary({ control, packages, priceOf }: { control: Control<BookingFormValues>; packages: Package[]; priceOf: (p: Package) => number }) {
  const [packageId, items, bookingDate] = useWatch({ control, name: ["packageId", "items", "bookingDate"] });
  const pkg = packages.find((p) => p.id === packageId);
  const extras = (items ?? []).reduce((s, it) => s + itemSubtotal(it), 0);
  const total = (pkg ? priceOf(pkg) : 0) + extras;
  return (
    <section aria-label="Booking summary" className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default p-inset">
      <div className="flex items-center">
        <h2 className="flex text-heading-section text-text-primary">
          <Txt>Booking summary</Txt>
        </h2>
        <span className="flex-1" />
        <Txt className="text-caption text-text-secondary">Updates live</Txt>
      </div>
      <SummaryRow label={pkg?.name ?? "Package (not selected)"} value={pkg ? formatIDR(priceOf(pkg)) : "—"} />
      <SummaryRow label={`Additional items (${items?.length ?? 0})`} value={formatIDR(extras)} />
      <hr className="border-border-default" />
      <SummaryRow type="emphasis" label="Subtotal" value={formatIDR(total)} />
      <div className="flex flex-col gap-micro rounded-control bg-surface-accent p-base">
        <SummaryRow type="total" label="Total booking" value={formatIDR(total)} />
        <Txt className="text-caption text-text-secondary">
          {bookingDate ? `Booking date ${formatDate(bookingDate)} · shows on calendar after save` : "Pick a booking date to place it on the calendar"}
        </Txt>
      </div>
    </section>
  );
}

type Ledger = { pkg?: Package; price: number; itemsCount: number; extras: number; total: number; paid: number; invoiceCount: number; savedTotal: number };
const invoicesLabel = (n: number) => `${n} ${n === 1 ? "invoice" : "invoices"}`;
const pkgLabel = (p?: Package) => (p ? `${p.name}${p.isActive ? "" : " (archived)"}` : "Package (not selected)");

/** Edit with invoices (Figma 07 / 38, PRD US-4 / US-5): "Updated totals" — package · items · New total · Paid (n
 *  invoices) · accent block "Remaining after save" (Heading/Panel) + "Existing invoices keep their original figures…". */
function UpdatedTotals({ l }: { l: Ledger }) {
  return (
    <section aria-label="Updated totals" className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default p-inset">
      <div className="flex items-center">
        <h2 className="flex text-heading-section text-text-primary">
          <Txt>Updated totals</Txt>
        </h2>
        <span className="flex-1" />
        <Txt className="text-caption text-text-secondary">Updates live</Txt>
      </div>
      <SummaryRow label={pkgLabel(l.pkg)} value={l.pkg ? formatIDR(l.price) : "—"} />
      <SummaryRow label={`Additional items (${l.itemsCount})`} value={formatIDR(l.extras)} />
      <hr className="border-border-default" />
      <SummaryRow type="emphasis" label="New total" value={formatIDR(l.total)} />
      <SummaryRow label={`Paid (${invoicesLabel(l.invoiceCount)})`} value={formatIDR(l.paid)} />
      <div className="flex flex-col gap-micro rounded-control bg-surface-accent p-base">
        <SummaryRow type="accent" label="Remaining after save" value={formatIDR(l.total - l.paid)} />
        <Txt className="text-caption text-text-secondary">
          {l.total - l.paid > 0 ? "Existing invoices keep their original figures. Create the next invoice below." : "Paid in full. Existing invoices keep their original figures."}
        </Txt>
      </div>
    </section>
  );
}

/** Total below what's already paid (Figma 08, PRD US-5 / §2.4 rule 10, INTERACTIONS 2.13): "Booking total" with the
 *  previous total and the amount paid, then the new total in a danger block (surface/danger, 1px status/danger) with
 *  the inline error. Invoices and Save are unavailable until it's fixed. */
function BelowPaidTotals({ l }: { l: Ledger }) {
  return (
    <section aria-label="Booking total" className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default p-inset">
      <div className="flex items-center">
        <h2 className="flex text-heading-section text-text-primary">
          <Txt>Booking total</Txt>
        </h2>
        <span className="flex-1" />
        <Txt className="text-caption text-text-secondary">Updates live</Txt>
      </div>
      <SummaryRow label={pkgLabel(l.pkg)} value={l.pkg ? formatIDR(l.price) : "—"} />
      <SummaryRow label={`Additional items (${l.itemsCount})`} value={formatIDR(l.extras)} />
      <hr className="border-border-default" />
      <SummaryRow label="Previous total" value={formatIDR(l.savedTotal)} />
      <SummaryRow label={`Already paid (${invoicesLabel(l.invoiceCount)})`} value={formatIDR(l.paid)} />
      <div role="alert" className="motion-notice flex flex-col gap-compact rounded-control border border-status-danger bg-surface-danger p-base">
        <div className="flex w-full items-center justify-between">
          <Txt className="text-body-strong text-text-primary">New total</Txt>
          <Txt className="text-heading-panel text-text-danger">{formatIDR(l.total)}</Txt>
        </div>
        <div className="flex items-start gap-tight text-text-danger">
          <Icon name="triangle-alert" className="size-icon-sm shrink-0 text-status-danger" />
          <p className="text-caption">{`Total can’t be lower than ${formatIDR(l.paid)} already paid. Choose a higher package or add items — Save stays disabled until fixed.`}</p>
        </div>
      </div>
    </section>
  );
}

/** Invoices (n) card (US-1 / US-2, Figma 03 / 05 / 05c): status badge; (0) → dashed empty state with Create invoice
 *  (disabled + tooltip until client name and phone are valid — INTERACTIONS 2.12); (n) → Invoice cards, newest first
 *  and highlighted (Latest), then a full-width Secondary "Create invoice" (hidden once Paid — PRD US-5). */
function InvoicesSection({ status, invoices, fresh, canInvoice, onCreate, onPdf, pdfBusyId }: {
  status: BookingStatus;
  invoices: Invoice[];
  /** Invoice created in this session — its card enters with motion. */
  fresh: string | null;
  canInvoice: boolean;
  onCreate: () => void;
  onPdf: (inv: Invoice) => void;
  /** Invoice whose PDF is generating (its button shows Loading). */
  pdfBusyId: string | null;
}) {
  const button = (
    <Button icon="plus" disabled={!canInvoice} onClick={onCreate} className={cn(!canInvoice && "pointer-events-none")}>
      Create invoice
    </Button>
  );
  return (
    <section aria-label="Invoices" className="flex flex-col gap-base rounded-card border border-border-default bg-surface-default p-inset">
      <div className="flex items-center gap-compact">
        <h2 className="flex text-heading-section text-text-primary">
          <Txt>{`Invoices (${invoices.length})`}</Txt>
        </h2>
        <span className="flex-1" />
        <PaymentStatusBadge status={status} />
      </div>
      {invoices.length ? (
        <>
          {invoices.map((inv, i) => (
            <InvoiceCard
              key={inv.id}
              className={cn(inv.id === fresh && "motion-notice")}
              number={inv.number}
              issued={formatDateTime(inv.issuedAt)}
              amount={formatIDR(inv.amount)}
              meta={`Paid after this invoice: ${formatIDR(inv.snapshot.paidAfter)} of ${formatIDR(inv.snapshot.total)}`}
              latest={i === 0}
              pdfBusy={pdfBusyId === inv.id}
              onPdf={() => onPdf(inv)}
            />
          ))}
          {status !== "paid" && status !== "canceled" && (
            <Button variant="secondary" icon="plus" onClick={onCreate} className="w-full">
              Create invoice
            </Button>
          )}
        </>
      ) : (
        <DashedBox className="gap-compact p-inset text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/empty-invoice.png" srcSet="/assets/empty-invoice.png 1x, /assets/empty-invoice@2x.png 2x" alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
          <p className="flex text-body-strong text-text-primary">
            <Txt>No invoice yet — booking will be saved as Draft</Txt>
          </p>
          <p className="w-full text-caption text-text-secondary">Create the first invoice (DP or full price) here when the client pays. Each invoice is linked to this booking.</p>
          {canInvoice ? (
            button
          ) : (
            <Tooltip content="Complete client name and phone first">
              <span tabIndex={0} aria-label="Create invoice (unavailable: complete client name and phone first)" className="flex rounded-pill outline-none focus-visible:shadow-focus-ring">
                {button}
              </span>
            </Tooltip>
          )}
        </DashedBox>
      )}
    </section>
  );
}

/** Additional items (US-1, INTERACTIONS 2.8): Line item rows — name · Rp price (thousands mask) · qty (1–999) ·
 *  live subtotal (Body Strong) · trash (no confirm); "+ Add item" ghost row. */
function LineItems({ control, register, errors, onAdd, onRemove, fields }: {
  control: Control<BookingFormValues>;
  register: ReturnType<typeof useForm<BookingFormValues>>["register"];
  errors: FieldErrors<BookingFormValues>;
  fields: { id: string }[];
  onAdd: () => void;
  onRemove: (i: number) => void;
}) {
  const items = useWatch({ control, name: "items" });
  // Rows present on load (edit mode) don't animate; rows the admin adds slide in (.motion-notice).
  const [initial] = useState(() => new Set(fields.map((f) => f.id)));
  return (
    <div role="table" aria-label="Additional items" className="flex flex-col overflow-hidden rounded-control border border-border-default">
      <LineItemHeader />
      {fields.map((f, i) => {
        const e = errors.items?.[i];
        return (
          <div key={f.id} role="row" className={cn(!initial.has(f.id) && "motion-notice", "flex w-full items-center gap-compact border-b border-border-default bg-surface-default px-control py-compact")}>
            <span role="cell" className="flex min-w-0 flex-1">
              <InlineInput className="w-full" aria-label={`Item ${i + 1} name`} placeholder="Item name" error={!!e?.name} {...register(`items.${i}.name`)} />
            </span>
            <span role="cell" className={cn("flex shrink-0", LINE_COLS.price)}>
              <Controller
                control={control}
                name={`items.${i}.price`}
                render={({ field }) => (
                  <InlineInput className="w-full" prefix="Rp" inputMode="numeric" aria-label={`Item ${i + 1} price`} placeholder="0" error={!!e?.price} {...field} onChange={(ev) => field.onChange(maskAmount(ev.target.value))} />
                )}
              />
            </span>
            <span role="cell" className={cn("flex shrink-0", LINE_COLS.qty)}>
              <Controller
                control={control}
                name={`items.${i}.qty`}
                render={({ field }) => (
                  <InlineInput className="w-full" inputMode="numeric" aria-label={`Item ${i + 1} quantity`} error={!!e?.qty} {...field} onChange={(ev) => field.onChange(maskQty(ev.target.value))} />
                )}
              />
            </span>
            <span role="cell" className={cn("flex shrink-0 justify-end text-body-strong text-text-primary", LINE_COLS.subtotal)}>
              <Txt>{formatIDR(itemSubtotal(items?.[i] ?? {}))}</Txt>
            </span>
            <span role="cell" className={cn("flex shrink-0", LINE_COLS.action)}>
              <IconAction icon="trash" aria-label={`Remove item ${i + 1}`} onClick={() => onRemove(i)} />
            </span>
          </div>
        );
      })}
      <div className="flex px-control py-[calc(var(--spacing-12)-var(--spacing-2))]">
        <Button variant="ghost" icon="plus" onClick={onAdd}>
          Add item
        </Button>
      </div>
    </div>
  );
}

function Divider() {
  return <hr className="w-full border-border-default" />;
}

/** Leave guard dialog (Figma 32 / 12, INTERACTIONS 2.1b / 2.1): warning icon · "Discard this new booking?" /
 *  "Discard unsaved changes?" (naming what changed) · body; footer Keep editing (default focus; Esc / scrim do the
 *  same) · Discard booking / Discard changes. */
function DiscardDialog({ open, editing, changes, onKeep, onDiscard }: { open: boolean; editing: boolean; changes: string; onKeep: () => void; onDiscard: () => void }) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onKeep} role="alertdialog" labelledBy={titleId} top="guard" width="w-[calc(var(--spacing-64)*7-var(--spacing-8))]" initialFocus="[data-keep]">
      <div className="flex gap-base p-group">
        <span className="flex size-[calc(var(--spacing-32)+var(--spacing-8))] shrink-0 items-center justify-center rounded-pill bg-surface-warning text-status-warning">
          <Icon name="triangle-alert" className="size-icon-md" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-tight">
          <h2 id={titleId} className="text-heading-section text-text-primary">
            {editing ? "Discard unsaved changes?" : "Discard this new booking?"}
          </h2>
          <p className="text-body text-text-secondary">
            {editing
              ? `${changes ? `You changed the ${changes}. ` : ""}If you leave now, these changes won’t be saved. Existing invoices are not affected.`
              : "If you close this page, your progress will be discarded. The client details, package, items and crew you entered haven’t been saved yet."}
          </p>
        </div>
      </div>
      <footer className="flex justify-end gap-compact border-t border-border-default bg-surface-subtle px-group py-base">
        <Button variant="secondary" data-keep onClick={onKeep}>
          Keep editing
        </Button>
        <Button onClick={onDiscard}>{editing ? "Discard changes" : "Discard booking"}</Button>
      </footer>
    </Dialog>
  );
}

export function BookingForm({ date, initial }: Props) {
  const entering = useEntrance(); // module entrance cascade (motion.css)
  const { packages, crew, terms, payment, refresh } = useCatalog();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { navigate, setGuard } = useLeaveGuard();
  const [created] = useState(() => formatDateTime(initial?.createdAt ?? now().toISOString()));
  const today = isoToLocalDate(now().toISOString());
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);
  const [saved, setSaved] = useState(() => ({
    ref: initial?.ref ?? null,
    name: initial?.bookingName ?? "",
    status: initial?.status ?? ("draft" as BookingStatus),
    invoices: initial?.invoices ?? [],
    packageId: initial?.values.packageId ?? "",
    packagePrice: initial?.packagePrice ?? 0,
    bookingDate: initial?.values.bookingDate ?? "",
    total: initial?.total ?? 0,
    totalPaid: initial?.totalPaid ?? 0,
  }));
  const [justSaved, setJustSaved] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [invoiceUi, setInvoiceUi] = useState<{ open: boolean; busy: boolean; failed: boolean; rejected: InvoiceError | null }>({ open: false, busy: false, failed: false, rejected: null });
  const [saving, setSaving] = useState(false);
  const pdf = useInvoicePdf(); // invoice card Download PDF (2.14)
  const router = useRouter();
  const [cancelUi, setCancelUi] = useState({ open: false, busy: false, failed: false });
  const [isAdmin] = useState(() => getDb().profile.role === "admin");
  const [attention, setAttention] = useState(0);
  // Content stays while the toast animates out; only `open` flips (else an Error toast would turn Success mid-exit).
  const [toast, setToastState] = useState<{ text: string; tone: ToastTone; open: boolean } | null>(null);
  const setToast = (text: string, tone: ToastTone = "success") => setToastState({ text, tone, open: true });
  const toastPresence = usePresence(!!toast?.open);
  const [leaving, setLeaving] = useState<null | (() => void)>(null);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: initial?.values ?? { clientName: "", clientPhone: "", bookingName: "", packageId: "", bookingDate: date ?? "", items: [], crewIds: [], terms, paymentInstruction: { ...payment } },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { register, control, handleSubmit, formState, setValue, trigger, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const [clientName, clientPhone, packageId, bookingName, items, bookingDate] = useWatch({ control, name: ["clientName", "clientPhone", "packageId", "bookingName", "items", "bookingDate"] });
  const pkg = packages.find((p) => p.id === packageId);
  const pkgName = pkg?.name;
  // A saved booking keeps its package at the saved price while the package is unchanged (US-0, archived 38).
  const priceOf = useCallback((p: Package) => (savedId && p.id === saved.packageId ? saved.packagePrice : p.price), [savedId, saved.packageId, saved.packagePrice]);
  const extras = (items ?? []).reduce((sum, it) => sum + itemSubtotal(it), 0);
  const liveTotal = (pkg ? priceOf(pkg) : 0) + extras;
  const liveName = bookingName.trim() || `${clientName.trim()} · ${pkgName ?? "Package"}`;
  useShellCrumb(saved.ref);
  const canInvoice = clientName.trim().length >= LIMITS.clientNameMin && !!normalizePhone(clientPhone);
  const dirty = formState.isDirty;
  const editing = !!savedId;
  const df = formState.dirtyFields;
  // Edit with invoices (07 / 08 / 38): the rail compares with the saved booking; a fresh "new → invoice" visit keeps
  // the Booking summary (05) until something changes.
  const ledgerMode = editing && saved.invoices.length > 0 && (!!initial || dirty);
  const belowPaid = ledgerMode && !!pkg && liveTotal < saved.totalPaid;
  const ledger: Ledger = { pkg, price: pkg ? priceOf(pkg) : 0, itemsCount: items?.length ?? 0, extras, total: liveTotal, paid: saved.totalPaid, invoiceCount: saved.invoices.length, savedTotal: saved.total };
  const dateMoved = editing && !!saved.bookingDate && !!df.bookingDate && bookingDate !== saved.bookingDate ? `Moved from ${formatDate(saved.bookingDate)}` : undefined;
  const changedList = (() => {
    const parts: string[] = [];
    if (df.clientName || df.clientPhone || df.bookingName) parts.push("client details");
    if (df.packageId) parts.push("package");
    if (df.items) parts.push("items");
    if (df.bookingDate) parts.push("booking date");
    if (df.crewIds) parts.push("crew");
    if (df.terms) parts.push("terms");
    if (df.paymentInstruction) parts.push("payment instruction");
    return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : (parts[0] ?? "");
  })();
  // Diff strip (07): what moved the total — package → Name, items updated, date moved to D.
  const totalChange = (() => {
    if (!ledgerMode || belowPaid || !dirty || liveTotal === saved.total) return null;
    const why: string[] = [];
    if (df.packageId && pkg) why.push(`package → ${pkg.name.replace(/ Package$/, "")}`);
    if (df.items) why.push("items updated");
    if (df.bookingDate && bookingDate) why.push(`date moved to ${formatDate(bookingDate)}`);
    const d = liveTotal - saved.total;
    return {
      title: `Total updated: ${formatIDR(saved.total)} → ${formatIDR(liveTotal)}`,
      body: `${d > 0 ? "+" : "−"}${formatIDR(Math.abs(d))} since last invoice${why.length ? ` · ${why.join(", ")}` : ""}. Past invoices keep their original figures.`,
    };
  })();

  // Leave guard (fills the F4 hook): any exit with unsaved input asks first; nothing entered → leave at once.
  useEffect(() => {
    setGuard(
      dirty
        ? (_href, proceed) => {
            setLeaving(() => proceed);
            return false;
          }
        : null,
    );
    return () => setGuard(null);
  }, [dirty, setGuard]);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault(); // native "Leave site?" prompt
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);
  useEffect(() => {
    if (!toast?.open) return;
    const t = setTimeout(() => setToastState((v) => v && { ...v, open: false }), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const scrollToFirstError = () =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("main [aria-invalid='true'], main [data-invalid='true']");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus({ preventScroll: true });
    });

  const savedFrom = (b: { ref: string; bookingName: string; status: BookingStatus; packageId: string; packagePriceSnapshot: number; bookingDate: string; total: number; totalPaid: number }) => ({
    ref: b.ref,
    name: b.bookingName,
    status: b.status,
    packageId: b.packageId,
    packagePrice: b.packagePriceSnapshot,
    bookingDate: b.bookingDate,
    total: b.total,
    totalPaid: b.totalPaid,
  });
  const onSave = handleSubmit(
    async (values) => {
      if (belowPaid) return;
      setAttention(0);
      setSaving(true);
      const res = await saveBooking(toBookingInput(values, savedId ?? undefined)).catch(() => null);
      setSaving(false);
      if (!res) return setToast("Couldn’t save the booking. Check your connection and try again.", "danger");
      if (!res.ok) return setToast("Couldn’t save the booking. Check the highlighted fields.", "danger");
      setSavedId(res.booking.id);
      setSaved((s) => ({ ...s, ...savedFrom(res.booking) }));
      setJustSaved(true);
      reset(values); // the saved state is the new baseline (edit mode)
      setToast(res.booking.status === "draft" ? (editing ? "Changes saved" : "Booking saved as Draft") : "Changes saved"); // 2.2 / 2.3
      // Stay on the screen, now in edit mode (INTERACTIONS 2.2) — the URL follows without remounting.
      window.history.replaceState(null, "", `/bookings/${res.booking.id}/edit`);
    },
    (errors) => {
      setAttention(countErrors(errors));
      scrollToFirstError();
    },
  );
  // Confirm in the invoice modal (3.6): save the booking if it's new or edited + create the invoice, one transaction.
  const onConfirmInvoice = async (req: InvoiceModalRequest) => {
    setInvoiceUi((u) => ({ ...u, busy: true, rejected: null }));
    const values = form.getValues();
    const bookingInput = !savedId || dirty ? toBookingInput(values, savedId ?? undefined) : null;
    const res = await saveBookingAndCreateInvoice(bookingInput, { ...req, bookingId: savedId ?? undefined }).catch(() => null);
    if (!res) return setInvoiceUi((u) => ({ ...u, busy: false, failed: true })); // 3.8 — entries kept, Try again
    if (!res.ok) {
      if (res.error === "booking_invalid" || res.error === "not_found") {
        setInvoiceUi({ open: false, busy: false, failed: false, rejected: null });
        await trigger();
        setAttention(countErrors(form.formState.errors));
        scrollToFirstError();
        return setToast("Couldn’t save the booking. Check the highlighted fields.", "danger");
      }
      return setInvoiceUi((u) => ({ ...u, busy: false, rejected: res.error }));
    }
    setSavedId(res.booking.id);
    setSaved({ ...savedFrom(res.booking), invoices: res.invoices });
    setFresh(res.invoice.id);
    setJustSaved(true);
    reset(values);
    setInvoiceUi({ open: false, busy: false, failed: false, rejected: null });
    // 3.6 / B5: "Booking saved · INV-… added · …" (new), "Changes saved · …" (pending edits), "INV-… added · …".
    const prefix = !bookingInput ? "" : saved.invoices.length ? "Changes saved · " : "Booking saved · ";
    setToast(`${prefix}${res.invoice.number} added · ${STATUS_LABEL[res.booking.status]}`);
    window.history.replaceState(null, "", `/bookings/${res.booking.id}/edit`);
  };

  // Cancel booking (US-12, 2.15 / 2.16): saved Draft / Partially paid only, admins only. Confirm → Canceled, read-only
  // detail with a toast; any unsaved edits are dropped (the booking can't be edited afterwards anyway).
  const canCancel = editing && isAdmin && (saved.status === "draft" || saved.status === "partially_paid");
  const onConfirmCancel = async (reason: string) => {
    if (!savedId) return;
    setCancelUi((u) => ({ ...u, busy: true, failed: false }));
    const res = await cancelBooking(savedId, reason).catch(() => null);
    if (!res) return setCancelUi((u) => ({ ...u, busy: false, failed: true }));
    if (!res.ok) {
      setCancelUi({ open: false, busy: false, failed: false });
      return setToast("This booking can’t be canceled.", "danger");
    }
    setGuard(null);
    setFlash(`Booking canceled · ${res.booking.ref}`);
    router.push(`/bookings?booking=${res.booking.id}`);
  };

  const errors = formState.errors;
  // Counted once a Save or Create invoice attempt has flagged fields (2.4); updates as fields are fixed.
  const liveCount = formState.submitCount || attention ? countErrors(errors) : 0;
  const showAlert = attention > 0 && liveCount > 0;

  return (
    <>
      <EditorActions>
        <span className="flex items-center gap-compact text-text-secondary" role="status">
          <Icon name="history" className="size-icon-sm" />
          <Txt className="text-micro">{!editing ? "Draft · not saved" : dirty ? "Unsaved changes" : justSaved ? "Saved just now" : saved.status === "draft" ? "Draft · saved" : "All changes saved"}</Txt>
        </span>
        <HeaderDivider />
        <span className="flex gap-tight">
          <Button variant="secondary" onClick={() => navigate("/bookings")}>
            Cancel
          </Button>
          <Button icon="check" loading={saving} disabled={belowPaid} onClick={() => onSave()}>
            {savedId ? "Save changes" : "Save booking"}
          </Button>
        </span>
      </EditorActions>

      <EditorPageHeader className={entering ? cascade(0) : undefined} title={savedId ? saved.name : "New booking"} status={saved.status} onBack={() => navigate("/bookings")} backLabel="Back to bookings" />
      <div data-cascade className="flex flex-1 gap-section pl-section">
        <main className="flex w-[calc(var(--spacing-64)*9+var(--spacing-48))] shrink-0 flex-col gap-[calc(var(--spacing-24)+var(--spacing-4))] pt-group pb-[calc(var(--spacing-32)+var(--spacing-8))]">
          <form noValidate onSubmit={onSave} className={cn("contents", entering && cascadeChildren(1))}>
            <section aria-labelledby="sec-client" className="flex flex-col gap-base">
              <SectionHeader id="sec-client" title="Client" meta="Required fields" required />
              <div className="flex gap-base">
                <InputField label="Client name" required placeholder="Client name" error={errors.clientName?.message} {...register("clientName")} />
                <InputField
                  label="Phone number"
                  required
                  type="tel"
                  placeholder="+62 812-3456-7890"
                  error={errors.clientPhone?.message}
                  {...register("clientPhone", {
                    onBlur: (e) => {
                      const n = normalizePhone(e.target.value);
                      if (n) setValue("clientPhone", formatPhone(n), { shouldDirty: true, shouldValidate: formState.submitCount > 0 });
                    },
                  })}
                />
              </div>
              <InputField label="Booking name" placeholder={`${clientName.trim() || "Client"} · ${pkgName ?? "Package"}`} helper="Optional — defaults to “Client · Package”" {...register("bookingName")} />
            </section>
            <Divider />
            <section aria-labelledby="sec-package" className="flex flex-col gap-base">
              <SectionHeader
                id="sec-package"
                title="Package"
                meta={
                  <a href="/packages" target="_blank" rel="noopener" className="flex rounded-small outline-none hover:underline focus-visible:shadow-focus-ring">
                    <Txt>Manage library</Txt>
                  </a>
                }
              />
              <Controller
                control={control}
                name="packageId"
                render={({ field, fieldState }) => (
                  <PackageSelect
                    value={field.value}
                    onChange={field.onChange}
                    packages={packages}
                    error={fieldState.error?.message ?? (belowPaid ? `Total ${formatIDR(liveTotal)} can’t be lower than ${formatIDR(saved.totalPaid)} already paid` : undefined)}
                    helper={pkg && !pkg.isActive ? "Archived — kept on this booking at its saved price. It isn’t listed in the dropdown." : undefined}
                    onRefresh={refresh}
                  />
                )}
              />
              <PackageInfo pkg={pkg} price={pkg ? priceOf(pkg) : 0} />
              {/* Payment instruction (lane I): prefilled with the studio account, edited in its modal, never empty. */}
              <Controller control={control} name="paymentInstruction" render={({ field }) => <PaymentInstructionField value={field.value} onEdit={() => setPaymentOpen(true)} />} />
            </section>
            <Divider />
            <section aria-labelledby="sec-items" className="flex flex-col gap-base">
              <SectionHeader id="sec-items" title="Additional items" meta={`${fields.length} ${fields.length === 1 ? "item" : "items"}`} />
              <LineItems control={control} register={register} errors={errors} fields={fields} onAdd={() => append(emptyItem(), { shouldFocus: true })} onRemove={(i) => remove(i)} />
            </section>
            <Divider />
            <section aria-labelledby="sec-schedule" className="flex flex-col gap-base">
              <SectionHeader id="sec-schedule" title="Schedule" />
              <div className="flex items-start gap-base">
                <Controller control={control} name="bookingDate" render={({ field, fieldState }) => <DateField value={field.value} onChange={field.onChange} today={today} error={fieldState.error?.message} helper={dateMoved} />} />
                <InputField label="Created" disabled value={created} readOnly helper="Set automatically" />
              </div>
            </section>
            <Divider />
            <section aria-labelledby="sec-crew" className="flex flex-col gap-base">
              <SectionHeader id="sec-crew" title="Crew" meta="Handling this booking" />
              <Controller control={control} name="crewIds" render={({ field }) => <CrewSelect value={field.value} onChange={field.onChange} crew={crew as Crew[]} />} />
            </section>
            <Divider />
            <section aria-labelledby="sec-others" className="flex flex-col gap-base">
              <SectionHeader id="sec-others" title="Others" />
              <Controller
                control={control}
                name="terms"
                render={({ field, fieldState }) => (
                  <TextArea label="Terms & Conditions" helper="Printed on every invoice for this booking" maxLength={LIMITS.termsMax} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} error={field.value.length > LIMITS.termsMax || fieldState.error ? MSG.termsMax : undefined} />
                )}
              />
            </section>
            {canCancel && (
              <>
                <Divider />
                <CancelBookingSection onCancel={() => setCancelUi({ open: true, busy: false, failed: false })} />
              </>
            )}
          </form>
        </main>
        <aside aria-label="Summary and invoices" className={cn("flex min-w-0 flex-1 flex-col gap-inset border-l border-border-default bg-surface-header p-section", entering && cascade(1))}>
          {showAlert && (
            <Alert tone="danger" title={`${liveCount} ${liveCount === 1 ? "field needs" : "fields need"} attention`} className="motion-notice">
              Fix the highlighted fields to save the booking or create an invoice.
            </Alert>
          )}
          {belowPaid ? (
            <BelowPaidTotals l={ledger} />
          ) : ledgerMode ? (
            <>
              {totalChange && (
                // Enters once when the total first moves; later changes update the text in place (no replay per keystroke).
                <Alert key="total-change" tone="info" title={totalChange.title} className="motion-notice">
                  {totalChange.body}
                </Alert>
              )}
              <UpdatedTotals l={ledger} />
            </>
          ) : (
            <BookingSummary control={control} packages={packages} priceOf={priceOf} />
          )}
          {!belowPaid && <InvoicesSection
            status={saved.status}
            invoices={saved.invoices}
            fresh={fresh}
            canInvoice={canInvoice}
            onPdf={pdf.download}
            pdfBusyId={pdf.busyId}
            onCreate={async () => {
              if (!(await trigger())) {
                setAttention(countErrors(form.formState.errors));
                return scrollToFirstError();
              }
              setAttention(0);
              setInvoiceUi({ open: true, busy: false, failed: false, rejected: null });
            }}
          />}
        </aside>
      </div>

      <NewInvoiceModal
        open={invoiceUi.open}
        onClose={() => setInvoiceUi((u) => ({ ...u, open: false }))}
        subtitle={savedId ? `For ${saved.ref} · ${liveName}` : `For this new booking · ${liveName}`}
        status={saved.status}
        total={liveTotal}
        paid={saved.totalPaid}
        invoiceCount={saved.invoices.length}
        pendingEdits={dirty}
        busy={invoiceUi.busy}
        failed={invoiceUi.failed}
        rejected={invoiceUi.rejected}
        onConfirm={onConfirmInvoice}
      />
      <PaymentInstructionModal
        open={paymentOpen}
        value={form.getValues("paymentInstruction")}
        onClose={() => setPaymentOpen(false)}
        onSave={(v) => {
          setValue("paymentInstruction", v, { shouldDirty: true });
          setPaymentOpen(false);
        }}
      />
      {pdf.dialog}
      <CancelBookingDialog
        open={cancelUi.open}
        title={`${saved.ref} · ${saved.name}`}
        invoiceCount={saved.invoices.length}
        paid={saved.totalPaid}
        busy={cancelUi.busy}
        failed={cancelUi.failed}
        onKeep={() => setCancelUi({ open: false, busy: false, failed: false })}
        onConfirm={onConfirmCancel}
      />
      <DiscardDialog
        editing={editing}
        changes={changedList}
        open={!!leaving}
        onKeep={() => setLeaving(null)}
        onDiscard={() => {
          const go = leaving;
          setGuard(null);
          setLeaving(null);
          go?.();
        }}
      />
      {toastPresence.mounted && (
        <ToastRegion>
          <Toast presence={toastPresence.presence} tone={toast?.tone}>
            {toast?.text}
          </Toast>
        </ToastRegion>
      )}
    </>
  );
}

/** Package info card (Figma 03): pad control/base, gap control, surface/subtle, hairline border, radius control —
 *  name Caption Strong / summary Caption text/secondary (gap 2) · price Body Strong. With no package the slot
 *  stays (Figma 39 / 40 keep the section's height) and says so. */
function PackageInfo({ pkg, price }: { pkg?: Package; price: number }) {
  if (!pkg)
    return (
      <div className="flex items-center gap-control rounded-control border border-border-default bg-surface-subtle px-base py-control">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <Txt className="text-caption-strong text-text-secondary">No package selected</Txt>
          <span className="truncate text-caption text-text-tertiary">Pick a package to see what’s included and its price.</span>
        </span>
        <Txt className="text-body-strong text-text-tertiary">—</Txt>
      </div>
    );
  return (
    <div className="flex items-center gap-control rounded-control border border-border-default bg-surface-subtle px-base py-control">
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-center gap-8">
          <Txt className="text-caption-strong text-text-primary">{pkg.name}</Txt>
          {!pkg.isActive && (
            // Archived tag (Figma 38): h 24, pad 2/8, gap 4, surface/header, pill; 12 archive icon · Caption Strong secondary.
            <span className="flex h-24 items-center gap-micro rounded-pill bg-surface-header px-8 py-2 text-text-secondary">
              <Icon name="archive" className="size-12" />
              <Txt className="text-caption-strong">Archived</Txt>
            </span>
          )}
        </span>
        <span className="truncate text-caption text-text-secondary">{pkg.summary}</span>
      </span>
      <Txt className="text-body-strong text-text-primary">{formatIDR(price)}</Txt>
    </div>
  );
}

