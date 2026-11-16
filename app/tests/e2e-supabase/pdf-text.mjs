// Prints a PDF's text (all pages, joined) — used by business.spec.ts to read a downloaded invoice.
//   node tests/e2e-supabase/pdf-text.mjs file.pdf
import { readFileSync } from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const doc = await getDocument({ data: new Uint8Array(readFileSync(process.argv[2])), useSystemFonts: false }).promise;
const parts = [];
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  parts.push((await page.getTextContent()).items.map((it) => ("str" in it ? it.str : "")).join(" "));
}
process.stdout.write(parts.join("\n"));
