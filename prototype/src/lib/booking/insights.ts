// "Needs attention" rail insights (PRD §3: rule-based, no LLM) — Figma Bookings 01.
import { addDays, formatIDR, parseISODate, type ISODate } from "@/lib/format";
import type { BookingRow } from "@/lib/data/repo";

export type Insight = {
  id: string;
  tone: "danger" | "warning";
  title: string;
  time: string;
  message: string;
  action: { label: string; href: string };
};

/** Monday of the week containing `d` (weeks run Mon–Sun, PRD US-6). */
export function weekStart(d: ISODate): ISODate {
  const dow = parseISODate(d).dow; // 0 = Sun
  return addDays(d, dow === 0 ? -6 : 1 - dow);
}

/**
 * Daily digest generated at 07:00 Asia/Jakarta:
 *  • danger — a Partially paid booking happening today ("Balance due today"), one per booking — Drafts have
 *    no payment arrangement yet, so they aren't "due" (Figma 01 flags Aulia, not Hartono);
 *  • warning — bookings this week (Mon–Sun) that are Partially paid and have a DP invoice
 *    ("Balance before event"), with their total outstanding.
 */
export function buildInsights(rows: BookingRow[], today: ISODate, now: Date): Insight[] {
  const live = rows.filter((r) => r.status !== "canceled");
  const hoursSince7 = Math.max(0, Math.floor((now.getTime() - new Date(`${today}T07:00:00+07:00`).getTime()) / 3_600_000));
  const out: Insight[] = [];
  for (const r of live.filter((r) => r.bookingDate === today && r.status === "partially_paid"))
    out.push({
      id: `due-${r.id}`,
      tone: "danger",
      title: "Balance due today",
      time: hoursSince7 === 0 ? "just now" : `${hoursSince7}h ago`,
      message: `${r.bookingName} is today and still has ${formatIDR(r.remaining)} outstanding.`,
      action: { label: "View booking", href: `/bookings?booking=${r.id}` },
    });
  const from = weekStart(today), to = addDays(from, 6);
  // Partially paid ⇒ still on DP (the first invoice is DP or Full, and Full makes it Paid) — so the link only needs
  // the status filter (the invoice-type filter was removed 2026-11-11).
  const onDp = live.filter((r) => r.bookingDate >= from && r.bookingDate <= to && r.status === "partially_paid");
  if (onDp.length)
    out.push({
      id: "dp-this-week",
      tone: "warning",
      title: "Balance before event",
      time: "today",
      message: `${onDp.length} ${onDp.length === 1 ? "booking" : "bookings"} this week ${onDp.length === 1 ? "is" : "are"} still on DP — ${formatIDR(onDp.reduce((s, r) => s + r.remaining, 0))} outstanding.`,
      action: { label: "View bookings", href: "/bookings?tab=table&range=this-week&status=partially_paid" },
    });
  return out;
}

/** "+4" / "−2" / "0" and the trend badge direction + tone for "Bookings this month". */
export function countTrend(now: number, prev: number) {
  const d = now - prev;
  return { value: d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0", direction: d < 0 ? ("down" as const) : ("up" as const), tone: d < 0 ? ("negative" as const) : ("positive" as const), changed: d !== 0 };
}

/** "12,4%" (id-ID decimal comma) for "Collected this month" vs last month; null when last month is 0. */
export function percentTrend(now: number, prev: number) {
  if (prev <= 0) return null;
  const pct = ((now - prev) / prev) * 100;
  const text = `${Math.abs(pct).toFixed(1).replace(".", ",")}%`;
  return { value: pct < 0 ? `−${text}` : text, direction: pct < 0 ? ("down" as const) : ("up" as const), tone: pct < 0 ? ("negative" as const) : ("positive" as const) };
}
