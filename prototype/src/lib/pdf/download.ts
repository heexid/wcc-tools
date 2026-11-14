"use client";

// Invoice PDF download (PRD US-10, INTERACTIONS 2.14 / 4.2 / 4.6 / 4.12). The PDF is generated in the browser from
// the invoice snapshot (prototype — the production plan renders it server-side and stores it, PLAN §8). react-pdf is
// loaded on first use so it stays out of the page bundles.
import { createElement } from "react";
import { getInvoiceSnapshot } from "@/lib/data/repo";
import type { InvoiceSnapshot } from "@/lib/data/types";

export async function renderInvoicePdf(snapshot: InvoiceSnapshot): Promise<Blob> {
  const [{ pdf }, { InvoiceDocument, registerInvoiceFonts }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/pdf/InvoiceDocument")]);
  registerInvoiceFonts(window.location.origin);
  return pdf(createElement(InvoiceDocument, { snapshot, measure: browserMeasure() }) as never).toBlob();
}

/** Text widths in the app's own Inter 3.19 (same design as the PDF's static weights), for greedy wrapping. */
function browserMeasure() {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const family = getComputedStyle(document.body).fontFamily;
  return (str: string, style: { fontSize: number; fontWeight: number }) => {
    ctx.font = `${style.fontWeight} ${style.fontSize}px ${family}`;
    return ctx.measureText(str).width;
  };
}

/** Generates and downloads one invoice's PDF. Throws on failure (the caller shows the 37 dialog). */
export async function downloadInvoicePdf(invoiceId: string): Promise<string> {
  const snapshot = await getInvoiceSnapshot(invoiceId); // op "generatePdf" — ?fail=generatePdf makes it fail once
  const blob = await renderInvoicePdf(snapshot);
  const { invoiceFileName } = await import("@/components/pdf/InvoiceDocument");
  const name = invoiceFileName(snapshot);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return name;
}
