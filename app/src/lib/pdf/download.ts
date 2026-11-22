"use client";

// Invoice PDF download (PRD US-10, INTERACTIONS 2.14 / 4.2 / 4.6 / 4.12). The PDF is generated in the browser from
// the invoice snapshot plus the current business information. Mock source: rendered in the browser (prototype). Supabase
// source: rendered, stored and signed by /api/invoices/[id]/pdf (P9, PLAN §8). react-pdf is
// loaded on first use so it stays out of the page bundles.
import { createElement } from "react";
import { getBusiness, getInvoiceSnapshot } from "@/lib/data/repo";
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

/** Supabase source (P9): the server renders, stores and signs the PDF; the browser only fetches it. */
async function fetchFromServer(invoiceId: string): Promise<{ blob: Blob; name: string }> {
  const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/pdf`, { cache: "no-store" });
  if (!res.ok) throw new Error(`pdf ${res.status}`);
  const { url, fileName } = (await res.json()) as { url: string; fileName: string };
  const file = await fetch(url);
  if (!file.ok) throw new Error(`pdf file ${file.status}`);
  return { blob: await file.blob(), name: fileName };
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Generates and downloads one invoice's PDF. Throws on failure (the caller shows the 37 dialog). */
export async function downloadInvoicePdf(invoiceId: string): Promise<string> {
  const { blob, name } = await invoicePdf(invoiceId);
  save(blob, name);
  return name;
}

async function invoicePdf(invoiceId: string): Promise<{ blob: Blob; name: string }> {
  if (process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase") return fetchFromServer(invoiceId);
  const issued = await getInvoiceSnapshot(invoiceId); // op "generatePdf" — ?fail=generatePdf makes it fail once
  // Brand row + From block always show the CURRENT business information (Account settings, PRD US-14); every money
  // figure and the booking details stay exactly as issued.
  const snapshot = { ...issued, business: await getBusiness() };
  const blob = await renderInvoicePdf(snapshot);
  const { invoiceFileName } = await import("@/components/pdf/InvoiceDocument");
  return { blob, name: invoiceFileName(snapshot) };
}

/**
 * Mobile "Share PDF…" (Figma M07, DS Mobile rules › Share natively): hands the PDF file to the OS share sheet (WhatsApp,
 * email, files…) through the Web Share API. Where files can't be shared (desktop browsers, older WebViews) it falls back
 * to a normal download. Resolves "shared" | "downloaded" | "dismissed" (the person closed the share sheet).
 */
export async function shareInvoicePdf(invoiceId: string, title: string): Promise<"shared" | "downloaded" | "dismissed"> {
  const { blob, name } = await invoicePdf(invoiceId);
  const file = new File([blob], name, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "dismissed";
      throw e;
    }
  }
  save(blob, name);
  return "downloaded";
}
