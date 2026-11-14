"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { getInvoiceSnapshot } from "@/lib/data/repo";
import { renderInvoicePdf } from "@/lib/pdf/download";

// Dev only — F15 gate. Renders an invoice's PDF (?invoice=INV-2026-0187, with ?fixture=…) exactly as the download
// does, then rasterises page 1 (then any further pages, stacked below) with pdf.js at 96 dpi (794 × 1123, the Figma A4 frame) into a canvas at (0, 0), so
// Playwright can compare it with Bookings 11 / 11b / 11c (G3) and /dev/overlay can lay it over the frame (G4).
function PdfPreview() {
  const params = useSearchParams();
  const number = params.get("invoice") ?? "INV-2026-0187";
  const canvas = useRef<HTMLCanvasElement>(null);
  const more = useRef<HTMLDivElement>(null); // pages 2+ of long invoices, stacked below page 1
  const [state, setState] = useState("rendering");
  useEffect(() => {
    let live = true;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const blob = await renderInvoicePdf(await getInvoiceSnapshot(number));
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
      if (!live) return;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 96 / 72 });
      const el = canvas.current!;
      el.width = Math.round(viewport.width);
      el.height = Math.round(viewport.height);
      task = page.render({ canvas: el, canvasContext: el.getContext("2d")!, viewport });
      await task.promise;
      more.current?.replaceChildren();
      for (let n = 2; n <= doc.numPages && live; n++) {
        const pg = await doc.getPage(n);
        const vp = pg.getViewport({ scale: 96 / 72 });
        const c = document.createElement("canvas");
        c.width = Math.round(vp.width);
        c.height = Math.round(vp.height);
        c.className = "mt-24 block";
        c.setAttribute("aria-label", `Page ${n}`);
        more.current?.appendChild(c);
        task = pg.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp });
        await task.promise;
      }
      if (live) setState(`ready ${doc.numPages}`);
    })().catch((e) => live && setState(`error ${String(e)}`));
    return () => {
      live = false;
      task?.cancel(); // dev strict mode runs this effect twice — one render per canvas at a time
    };
  }, [number]);
  return (
    <>
      <canvas ref={canvas} data-state={state} aria-label={`Invoice PDF ${number}`} className="block" />
      <div ref={more} />
      <output className="sr-only">{state}</output>
    </>
  );
}

export default function DevPdfPage() {
  return (
    <Suspense>
      <PdfPreview />
    </Suspense>
  );
}
