"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { BottomSheet } from "@/components/ds/BottomSheet";
import { MenuItem } from "@/components/ds/Surfaces";
import { useIsMobile } from "@/components/ds/useBreakpoint";
import { isPdfBusy, showPdfError, startPdf, usePdfActivity } from "@/lib/pdf/activity";
import { downloadInvoicePdf, shareInvoicePdf } from "@/lib/pdf/download";
import { formatDate, formatIDR, isoToLocalDate } from "@/lib/format";

// Invoice PDF downloads for every screen that shows invoices (detail panel, Edit booking, canceled read-only view;
// INTERACTIONS 2.14 / 4.2 / 4.6). While one generates, its button shows Loading and an info toast names
// it; several can run at once, one toast each (lib/pdf/activity.ts). A failure opens "Couldn’t generate
// the invoice PDF" (Figma 37, 4.12): Try again retries; Cancel closes — the invoice itself is never rolled back.

type Target = { id: string; number: string; amount?: number; type?: string; issuedAt?: string };

const TYPE_LABEL: Record<string, string> = { dp: "DP", full: "Full price", partial: "Partial", paid: "Paid" };

/** `download` saves the file; `pick` is the invoice card action — on mobile it opens the Share sheet (Figma M07:
 *  Share PDF… via the OS share sheet · Download PDF), on desktop it downloads. */
export function useInvoicePdf(): { isBusy: (id: string) => boolean; download: (inv: Target) => void; pick: (inv: Target) => void; dialog: ReactNode } {
  const { busy } = usePdfActivity();
  const [failures, setFailures] = useState<Target[]>([]); // shown one at a time
  const failed = failures[0] ?? null;
  const dismiss = (id: string) => setFailures((f) => f.filter((t) => t.id !== id));
  const shownRef = useRef(false);
  useEffect(() => {
    shownRef.current = true;
    return () => {
      shownRef.current = false;
    };
  }, []);
  const [sharing, setSharing] = useState<Target | null>(null);
  const mobile = useIsMobile();
  const run = async (inv: Target, how: "download" | "share" = "download") => {
    dismiss(inv.id);
    if (isPdfBusy(inv.id)) return;
    const finish = startPdf(inv.id, how === "share" ? `Preparing invoice ${inv.number}…` : `Downloading invoice ${inv.number}…`);
    let ready = false;
    const done = () => {
      if (!ready) finish("done");
      ready = true;
    };
    try {
      // Sharing: over once the file is ready, not when the OS share sheet closes.
      if (how === "share") await shareInvoicePdf(inv.id, inv.number, done);
      else await downloadInvoicePdf(inv.id);
      done();
    } catch {
      if (!ready) finish("failed");
      // The screen that asked is gone (sheet closed, page left): there is no dialog to show, so a toast says it.
      if (shownRef.current) setFailures((f) => [...f.filter((t) => t.id !== inv.id), inv]);
      else showPdfError(`Invoice ${inv.number} not downloaded. Open the booking and try again.`);
    }
  };
  const go = (inv: Target, how: "download" | "share") => {
    setSharing(null);
    void run(inv, how);
  };
  const shown = sharing;
  return {
    isBusy: (id) => busy.has(id),
    download: (inv) => void run(inv),
    pick: (inv) => (mobile ? setSharing(inv) : void run(inv)),
    dialog: (
      <>
        <BottomSheet open={!!sharing} onClose={() => setSharing(null)} title={`Share ${shown?.number ?? "invoice"}`}>
          <div className="flex flex-col gap-control">
            <MenuItem icon="share" onClick={() => shown && go(shown, "share")}>
              Share PDF… (WhatsApp, email, files)
            </MenuItem>
            <MenuItem icon="download" onClick={() => shown && go(shown, "download")}>
              Download PDF
            </MenuItem>
          </div>
          <p className="text-caption text-text-secondary">
            {[shown?.amount !== undefined ? formatIDR(shown.amount) : null, shown?.type ? TYPE_LABEL[shown.type] : null, shown?.issuedAt ? `issued ${formatDate(isoToLocalDate(shown.issuedAt))}` : null].filter(Boolean).join(" · ")}
            {". The PDF is generated from the invoice snapshot; sharing uses your phone’s share sheet."}
          </p>
        </BottomSheet>
        <PdfFailedDialog target={failed} onCancel={() => failed && dismiss(failed.id)} onRetry={() => failed && run(failed)} />
      </>
    ),
  };
}

/** Figma 37: 440 wide, 260 from the top; 40 danger circle with circle-x · title Heading/Section · body Text/Body
 *  secondary; footer (surface/subtle, top border) Cancel · Try again (default focus). */
function PdfFailedDialog({ target, onCancel, onRetry }: { target: Target | null; onCancel: () => void; onRetry: () => void }) {
  const titleId = useId();
  const [last, setLast] = useState(target);
  if (target && target !== last) setLast(target);
  const shown = target ?? last;
  return (
    <Dialog open={!!target} onClose={onCancel} role="alertdialog" labelledBy={titleId} top="guard" width="w-[calc(var(--spacing-64)*7-var(--spacing-8))]" initialFocus="[data-retry]">
      <div className="flex gap-base p-group">
        <span className="flex size-[calc(var(--spacing-32)+var(--spacing-8))] shrink-0 items-center justify-center rounded-pill bg-surface-danger text-status-danger">
          <Icon name="circle-x" className="size-icon-md" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-tight">
          <h2 id={titleId} className="text-heading-section text-text-primary">
            Couldn’t generate the invoice PDF
          </h2>
          <p className="text-body text-text-secondary">{`${shown?.number ?? "The invoice"} is saved — only the PDF file couldn’t be created. Try again, or cancel and download it later from the invoice card.`}</p>
        </div>
      </div>
      <footer className="flex justify-end gap-compact border-t border-border-default bg-surface-subtle px-group py-base">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button data-retry onClick={onRetry}>
          Try again
        </Button>
      </footer>
    </Dialog>
  );
}
