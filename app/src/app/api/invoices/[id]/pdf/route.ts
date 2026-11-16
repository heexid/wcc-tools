// GET /api/invoices/<id or INV-number>/pdf → { url, fileName }: a 10-minute signed URL to the invoice PDF
// (P9, PRD US-10, §4.3 Storage). Rules:
//   - Who: the invoice is read through the CALLER's session, so RLS decides (staff only; sessions end at 00:00 WIB).
//   - What: figures come from the invoice SNAPSHOT only, verified against its stored hash; the brand row / From block
//     use the CURRENT business information (US-14, decided 2026-11-14).
//   - Storage: `invoices/<number>/<business fingerprint>.pdf`. The same business → the stored file is reused; a
//     changed business → a new fingerprint → re-rendered once. A missing file is regenerated from the snapshot.
//   - The invoice is never touched except `pdf_path` (append-only rule, P1).
import { NextResponse, type NextRequest } from "next/server";
import { invoiceFileName, PDF_TEMPLATE_VERSION } from "@/components/pdf/InvoiceDocument";
import { sha256, stableStringify } from "@/lib/data/sha256";
import type { Business, InvoiceSnapshot } from "@/lib/data/types";
import { renderInvoicePdfBuffer } from "@/lib/pdf/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { scrub, scrubError } from "@/lib/scrub";

const SIGNED_SECONDS = 600; // PRD §4.3: signed URLs expire after 10 min
/** A generation failure is logged with its stage (no snapshot contents, no PII) and answered generically. */
const logged = (stage: string, e: { message?: string }) => {
  console.error(`invoice pdf: ${stage} failed: ${scrub(e.message ?? String(e))}`);
  return fail(500, "generate_failed");
};
const fail = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sb = await supabaseServer();

  // 1 · The caller's own read (RLS). Not staff / not signed in / unknown → 404 (no existence oracle).
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  // The invoice and the current business are independent reads (P9 review #9): run them together.
  const [{ data: inv, error }, settings] = await Promise.all([
    sb.from("invoices").select("id, number, snapshot, snapshot_hash, pdf_path").eq(isUuid ? "id" : "number", id).maybeSingle(),
    sb.rpc("get_settings"),
  ]);
  if (error) return fail(503, "unavailable");
  if (!inv) return fail(404, "not_found");

  // 2 · Integrity: the snapshot is exactly what was issued (rule 4). The same canonical form the DB hashes.
  const snapshot = inv.snapshot as unknown as InvoiceSnapshot;
  if (sha256(stableStringify(snapshot)) !== inv.snapshot_hash) return fail(500, "snapshot_mismatch");

  // 3 · Current business (staff-only settings read, as the caller). The cache key covers the business AND the
  // template version, so a layout fix re-renders stored files too.
  if (settings.error || !settings.data) return fail(503, "unavailable");
  const business = (settings.data as { business: Business }).business;
  const fingerprint = sha256(stableStringify({ business, template: PDF_TEMPLATE_VERSION })).slice(0, 16);
  const path = `${inv.number}/${fingerprint}.pdf`;
  const fileName = invoiceFileName(snapshot);

  try {
    const admin = supabaseAdmin();
    const sign = () => admin.storage.from("invoices").createSignedUrl(path, SIGNED_SECONDS, { download: fileName });

    // 4 · Reuse the stored file when it was made for this business.
    if (inv.pdf_path === path) {
      const s = await sign();
      if (!s.error) return NextResponse.json({ url: s.data.signedUrl, fileName }, { headers: { "Cache-Control": "private, no-store" } });
      // missing in Storage → regenerate below
    }

    // 5 · Render from the snapshot + current business. The logo goes in as a short-lived signed URL.
    let logo: string | null = null;
    if (business.logo && !business.logo.startsWith("data:")) {
      const l = await admin.storage.from("branding").createSignedUrl(business.logo, 120);
      // Never store a logo-less PDF under this business's key because of a one-off Storage error (review #3).
      if (l.error) return logged("logo", l.error);
      logo = l.data.signedUrl;
    } else logo = business.logo ?? null;
    const pdf = await renderInvoicePdfBuffer({ ...snapshot, business: { ...business, logo } });

    const up = await admin.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) return logged("upload", up.error);
    const set = await admin.from("invoices").update({ pdf_path: path }).eq("id", inv.id);
    if (set.error) return logged("pdf_path", set.error);
    // The previous file (another business / template) is no longer referenced: remove it, best effort (review #10).
    if (inv.pdf_path && inv.pdf_path !== path) await admin.storage.from("invoices").remove([inv.pdf_path]).catch(() => {});

    const s = await sign();
    if (s.error) return logged("sign", s.error);
    return NextResponse.json({ url: s.data.signedUrl, fileName }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(`invoice pdf: generation failed: ${scrubError(e)}`);
    return fail(500, "generate_failed");
  }
}
