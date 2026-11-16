// Server-side invoice PDF (P9, PLAN §8): the same InvoiceDocument the prototype rendered in the browser, rendered in
// Node from the snapshot. Text is measured with the PDF's own Inter files (fontkit), so greedy wrapping breaks lines
// where the browser's canvas measure did (tests/e2e-supabase/pdf.spec.ts compares the two).
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { openSync, type Font } from "fontkit";
import { join } from "node:path";
import { createElement } from "react";
import { InvoiceDocument, registerInvoiceFonts, type Measure } from "@/components/pdf/InvoiceDocument";
import type { InvoiceSnapshot } from "@/lib/data/types";

const FONT_DIR = join(process.cwd(), "public", "fonts", "pdf");
const FILES: Record<number, string> = { 400: "Inter-Regular.woff", 500: "Inter-Medium.woff", 600: "Inter-SemiBold.woff", 700: "Inter-Bold.woff" };
const fonts = new Map<number, Font>();

/** Width in Figma px — same contract as the browser measure in lib/pdf/download.ts. */
export const serverMeasure: Measure = (str, style) => {
  const weight = FILES[style.fontWeight] ? style.fontWeight : 400;
  let f = fonts.get(weight);
  if (!f) {
    f = openSync(join(FONT_DIR, FILES[weight]));
    fonts.set(weight, f);
  }
  return (f.layout(str).advanceWidth / f.unitsPerEm) * style.fontSize;
};

export async function renderInvoicePdfBuffer(snapshot: InvoiceSnapshot): Promise<Buffer> {
  registerInvoiceFonts(FONT_DIR.replace(/\/fonts\/pdf$/, "")); // file paths: <public>/fonts/pdf/Inter-*.woff
  return renderToBuffer(createElement(InvoiceDocument, { snapshot, measure: serverMeasure }) as never);
}
