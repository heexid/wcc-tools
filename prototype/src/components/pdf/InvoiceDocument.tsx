// Invoice PDF (Figma Bookings 11 / 11b / 11c, PRD US-10, PLAN §8). Rendered by @react-pdf from the invoice
// SNAPSHOT ONLY — never from the live booking — so regenerating an old invoice always gives the same figures.
// A4 portrait, laid out in Figma px (794 × 1123) via the token helper (pt = px × 0.75). The PDF never animates.
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceSnapshot, InvoiceType } from "@/lib/data/types";
import { color, pt, radius, space, text } from "@/lib/pdf/tokens";
import { formatDate, formatDateTime, formatDateWithDay, formatIDR, formatPhone, initials, isoToLocalDate } from "@/lib/format";

let registered = false;
/** Inter 3.19 static weights (react-pdf takes TTF / WOFF only, not the variable woff2 the app uses). */
export function registerInvoiceFonts(base = "") {
  if (registered) return;
  registered = true;
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${base}/fonts/pdf/Inter-Regular.woff`, fontWeight: 400 },
      { src: `${base}/fonts/pdf/Inter-Medium.woff`, fontWeight: 500 },
      { src: `${base}/fonts/pdf/Inter-SemiBold.woff`, fontWeight: 600 },
      { src: `${base}/fonts/pdf/Inter-Bold.woff`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]); // wrap on spaces only, like the app
}

const TYPE_TAG: Record<InvoiceType, { label: string; bg: string; fg: string }> = {
  dp: { label: "Partially paid", bg: "surface/warning", fg: "status/warning" }, // Figma A5: DP tag removed
  full: { label: "Paid", bg: "surface/positive", fg: "status/positive" }, // Figma A5b
  partial: { label: "Partially paid", bg: "surface/warning", fg: "status/warning" },
  paid: { label: "Paid", bg: "surface/positive", fg: "status/positive" },
};

export function invoiceTypeLabel(s: Pick<InvoiceSnapshot, "type" | "dpPercentage">): string {
  switch (s.type) {
    case "dp":
      return s.dpPercentage !== null ? `Down payment (${String(s.dpPercentage).replace(".", ",")}%)` : "Down payment";
    case "full":
      return "Full payment";
    case "partial":
      return "Partial payment";
    case "paid":
      return "Final payment";
  }
}

/** `INV-2026-0187_sari-wulandari.pdf` (US-10). */
export function invoiceFileName(s: Pick<InvoiceSnapshot, "invoiceNumber" | "booking">) {
  const slug = s.booking.clientName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${s.invoiceNumber}_${slug || "client"}.pdf`;
}

/** Width of `str` in Figma px for a text style — supplied by the caller (the browser measures with the app's Inter). */
export type Measure = (str: string, style: { fontSize: number; fontWeight: number }) => number;

/** Greedy word wrap, like Figma and the browser. react-pdf's own breaker (Knuth–Plass with shrinkable spaces) fits
 *  lines Figma wraps — so paragraphs arrive pre-broken with "\n" when a measure is available. */
function wrapGreedy(str: string, widthPx: number, styleName: string, measure?: Measure): string {
  if (!measure) return str;
  const t = text(styleName);
  const style = { fontSize: t.fontSize / 0.75, fontWeight: t.fontWeight };
  const lines: string[] = [];
  let line = "";
  for (const word of str.split(/ +/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, style) > widthPx) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

const body = text("Text/Body");
const { position: _p, top: _t, ...bodyFont } = body; // eslint-disable-line @typescript-eslint/no-unused-vars
/** Footer band (Figma 11: pad base, Timestamp line, top hairline) — pinned to the bottom of every page. */
const FOOTER_H = 47;
const COL = { no: pt(40), qty: pt(60), price: pt(140), subtotal: pt(140) };

const s = StyleSheet.create({
  // Page carries the Text/Body font only (no baseline nudge — that belongs on Text nodes).
  // Multi-page invoices (many items): every page keeps a top margin (region) and room for the pinned footer, so
  // content flows onto page 2+ instead of being cut. Page 1's header cancels the top margin to stay full-bleed (Figma 11).
  page: { backgroundColor: color("surface/default"), color: color("text/primary"), ...bodyFont, paddingTop: space("region"), paddingBottom: pt(FOOTER_H) },
  header: { marginTop: -space("region"), backgroundColor: color("surface/accent"), paddingTop: pt(40), paddingBottom: pt(40), paddingHorizontal: space("region"), gap: space("group") },
  row: { flexDirection: "row" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: space("control"), height: pt(44) },
  avatar: { width: pt(38), height: pt(38), borderRadius: pt(19), backgroundColor: color("brand/avatar"), alignItems: "center", justifyContent: "center" },
  tag: { paddingVertical: pt(2), paddingHorizontal: space("tight"), borderRadius: radius("small") },
  titleRow: { flexDirection: "row", alignItems: "flex-end", gap: space("control") },
  metaRow: { flexDirection: "row", gap: space("control") },
  // Figma's dashed LINE has no height: the 1px border is pulled back out of the flow.
  dash: { borderTopWidth: pt(1), borderTopColor: color("border/strong"), borderStyle: "dashed", marginBottom: -pt(1) },
  parties: { flexDirection: "row", gap: space("group") },
  party: { flex: 1, gap: space("micro") },
  body: { paddingVertical: space("section"), paddingHorizontal: space("region"), gap: space("inset") },
  tr: { flexDirection: "row", alignItems: "center", paddingVertical: pt(10), borderBottomWidth: pt(1), borderBottomColor: color("border/default") },
  th: { ...text("Text/Caption"), color: color("text/secondary") },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  thisPayment: { backgroundColor: color("surface/accent"), borderRadius: radius("control"), padding: space("control") },
  box: { flexDirection: "row", gap: space("group"), padding: space("base"), backgroundColor: color("surface/subtle"), borderWidth: pt(1), borderColor: color("border/default"), borderRadius: radius("control") },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, height: pt(FOOTER_H), flexDirection: "row", alignItems: "center", paddingVertical: space("base"), paddingHorizontal: space("region"), borderTopWidth: pt(1), borderTopColor: color("border/default") },
});

const Caption = ({ children, c = "text/secondary", strong }: { children: string; c?: string; strong?: boolean }) => (
  <Text style={[text(strong ? "Text/Caption Strong" : "Text/Caption"), { color: color(c) }]}>{children}</Text>
);

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={[text("Text/Caption"), { color: color("text/secondary"), width: pt(96) }]}>{label}</Text>
      <Caption c="text/primary" strong>
        {value}
      </Caption>
    </View>
  );
}

function Sum({ label, value, kind = "default" }: { label: string; value: string; kind?: "default" | "emphasis" | "total" }) {
  return (
    <View style={s.sumRow}>
      <Text style={[text(kind === "default" ? "Text/Caption" : "Text/Body Strong"), { color: color(kind === "default" ? "text/secondary" : "text/primary") }]}>{label}</Text>
      <Text style={[text(kind === "total" ? "Heading/Panel" : kind === "emphasis" ? "Text/Body Strong" : "Text/Body"), { color: color("text/primary") }]}>{value}</Text>
    </View>
  );
}

export function InvoiceDocument({ snapshot: sn, measure }: { snapshot: InvoiceSnapshot; measure?: Measure }) {
  const wrap = (str: string, widthPx: number, styleName: string) => wrapGreedy(str, widthPx, styleName, measure);
  const b = sn.booking;
  const biz = sn.business;
  const tag = TYPE_TAG[sn.type];
  const pay = b.paymentInstruction;
  const rows = [
    { name: b.packageSummary ? `${b.packageName} — ${b.packageSummary}` : b.packageName, qty: 1, price: b.packagePrice, subtotal: b.packagePrice, strong: true },
    ...b.items.map((i) => ({ ...i, strong: false })),
  ];
  return (
    <Document title={`${sn.invoiceNumber} · ${b.bookingName}`} author={biz.name} creator={biz.name} producer={biz.name} creationDate={new Date(sn.issuedAt)} modificationDate={new Date(sn.issuedAt)}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brandRow}>
            <View style={s.avatar}>
              <Text style={[text("UI/Avatar"), { color: color("text/on-accent") }]}>{initials(biz.name)}</Text>
            </View>
            <View style={{ flexGrow: 1 }}>
              <Text style={text("Heading/Section")}>{biz.name}</Text>
              <Caption>{`${biz.address} · ${biz.phone}`}</Caption>
            </View>
            <View style={[s.tag, { backgroundColor: color(tag.bg) }]}>
              <Text style={[text("Text/Caption Strong"), { color: color(tag.fg) }]}>{tag.label}</Text>
            </View>
          </View>
          <View style={s.titleRow}>
            <View style={{ flexGrow: 1, gap: space("micro") }}>
              <Caption c="text/accent" strong>
                INVOICE
              </Caption>
              <Text style={text("Display/Metric")}>{sn.invoiceNumber}</Text>
            </View>
            <View style={{ gap: space("micro") }}>
              <Meta label="Invoice date" value={formatDate(isoToLocalDate(sn.issuedAt))} />
              <Meta label="Booking ref" value={b.ref} />
              <Meta label="Booking date" value={formatDateWithDay(b.bookingDate)} />
            </View>
          </View>
          <View style={s.dash} />
          <View style={s.parties}>
            <View style={s.party}>
              <Caption>From</Caption>
              <Text style={text("Text/Body Strong")}>{biz.name}</Text>
              <Caption c="text/primary">{biz.email}</Caption>
              <Caption c="text/primary">{biz.phone}</Caption>
            </View>
            <View style={s.party}>
              <Caption>Bill to</Caption>
              <Text style={text("Text/Body Strong")}>{b.clientName}</Text>
              <Caption c="text/primary">{formatPhone(b.clientPhone)}</Caption>
              <Caption c="text/primary">{b.bookingName}</Caption>
            </View>
          </View>
        </View>

        <View style={s.body}>
          <View>
            <View style={[s.tr, { borderBottomColor: color("border/strong") }]}>
              <Text style={[s.th, { width: COL.no }]}>NO</Text>
              <Text style={[s.th, { flex: 1 }]}>ITEM</Text>
              <Text style={[s.th, { width: COL.qty, textAlign: "right" }]}>QTY</Text>
              <Text style={[s.th, { width: COL.price, textAlign: "right" }]}>PRICE</Text>
              <Text style={[s.th, { width: COL.subtotal, textAlign: "right" }]}>SUBTOTAL</Text>
            </View>
            {rows.map((r, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={[body, { width: COL.no }]}>{String(i + 1)}</Text>
                <Text style={[r.strong ? text("Text/Body Strong") : body, { flex: 1 }]}>{wrap(r.name, 318, r.strong ? "Text/Body Strong" : "Text/Body")}</Text>
                <Text style={[body, { width: COL.qty, textAlign: "right" }]}>{String(r.qty)}</Text>
                <Text style={[body, { width: COL.price, textAlign: "right" }]}>{formatIDR(r.price)}</Text>
                <Text style={[body, { width: COL.subtotal, textAlign: "right" }]}>{formatIDR(r.subtotal)}</Text>
              </View>
            ))}
          </View>

          <View style={s.row} wrap={false}>
            <View style={{ flexGrow: 1 }} />
            <View style={{ width: pt(340), gap: space("compact") }}>
              <Sum kind="emphasis" label="Total booking" value={formatIDR(sn.total)} />
              <Sum label="Previously paid" value={formatIDR(sn.paidBefore)} />
              <Sum label="Invoice type" value={invoiceTypeLabel(sn)} />
              <View style={s.thisPayment}>
                <View style={s.sumRow}>
                  <Text style={[text("Text/Body Strong"), { color: color("text/accent") }]}>This payment</Text>
                  <Text style={[text("Heading/Panel"), { color: color("text/accent") }]}>{formatIDR(sn.amount)}</Text>
                </View>
              </View>
              <Sum label="Total paid (incl. this invoice)" value={formatIDR(sn.paidAfter)} />
              <Sum kind="total" label="Remaining balance" value={formatIDR(sn.remainingAfter)} />
            </View>
          </View>

          <View style={s.box} wrap={false}>
            <View style={{ width: pt(320), gap: space("micro") }}>
              <Caption c="text/primary" strong>
                Payment instructions
              </Caption>
              <Caption>{wrap(`Transfer to ${pay.receiptName} ${pay.accountNumber} a.n. ${pay.accountName}. Include ${sn.invoiceNumber} in the transfer note.`, 320, "Text/Caption")}</Caption>
            </View>
            <View style={{ width: pt(320), gap: space("micro") }}>
              <Caption c="text/primary" strong>
                Terms
              </Caption>
              <Caption>{b.terms ? wrap(b.terms, 320, "Text/Caption") : "—"}</Caption>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={[text("Text/Timestamp"), { color: color("text/tertiary"), flexGrow: 1 }]}>{`Snapshot · generated ${formatDateTime(sn.issuedAt)} — figures are fixed at issue time`}</Text>
          <Text style={[text("Text/Timestamp"), { color: color("text/tertiary") }]} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
