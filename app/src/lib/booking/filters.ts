// Booking search + filters ↔ URL (PRD US-8, PLAN §6 useBookingFilters, INTERACTIONS 1.4–1.10, 1.20–1.21).
// One state shared by Calendar and Table. URL keys:
//   q        search text
//   range    today | this-week | this-month | next-7-days | last-month | custom (+ from, to)  — Table only
//   status   draft,partially_paid,paid,canceled
//   crew     crew ids · package  package ids
//   (no invoice-type filter — removed 2026-11-11; an old `type=` key is ignored)
//   sort     bookingDate | total | remaining | status (absent = upcoming first) · dir asc | desc
//   page     1-based · size 10 | 25 | 50
// (`date` stays the calendar's anchor, `view` its range, `tab` the Calendar / Table switch.)
import type { BookingStatus } from "@/components/ds/Badges";
import type { BookingQuery } from "@/lib/data/repo";
import { addDays, parseISODate, toISODate, type ISODate } from "@/lib/format";

export type DatePreset = "today" | "this-week" | "this-month" | "next-7-days" | "last-month" | "custom";
export type SortKey = "bookingDate" | "total" | "remaining" | "status";
export type PageSize = 10 | 25 | 50;

export type BookingFilters = {
  q: string;
  range: DatePreset | null;
  from: ISODate | null;
  to: ISODate | null;
  status: BookingStatus[];
  crew: string[];
  pkg: string[];
  sort: SortKey | null;
  dir: "asc" | "desc";
  page: number;
  size: PageSize;
};

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "next-7-days", label: "Next 7 days" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];
export const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "canceled", label: "Canceled" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const isISO = (v: string | null): v is ISODate => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const list = <T extends string>(v: string | null, allowed?: readonly T[]) =>
  (v?.split(",").filter(Boolean) ?? []).filter((x): x is T => !allowed || allowed.includes(x as T));

export function parseFilters(p: URLSearchParams): BookingFilters {
  const range = DATE_PRESETS.find((d) => d.value === p.get("range"))?.value ?? null;
  const from = p.get("from"), to = p.get("to");
  const sort = (["bookingDate", "total", "remaining", "status"] as const).find((k) => k === p.get("sort")) ?? null;
  const size = Number(p.get("size"));
  return {
    q: p.get("q") ?? "",
    range: range === "custom" && !(isISO(from) && isISO(to)) ? null : range,
    from: isISO(from) ? from : null,
    to: isISO(to) ? to : null,
    status: list(p.get("status"), STATUS_OPTIONS.map((s) => s.value)),
    crew: list(p.get("crew")),
    pkg: list(p.get("package")),
    sort,
    dir: p.get("dir") === "desc" ? "desc" : "asc",
    page: Math.max(1, Math.floor(Number(p.get("page")) || 1)),
    size: size === 25 || size === 50 ? size : 10,
  };
}

/** Writes the filter keys onto a copy of `base` (other params — tab, view, date, booking — are kept). */
export function writeFilters(f: BookingFilters, base: URLSearchParams): URLSearchParams {
  const p = new URLSearchParams(base);
  const set = (k: string, v: string | null | undefined) => (v ? p.set(k, v) : p.delete(k));
  set("q", f.q.trim() || null);
  set("range", f.range);
  set("from", f.range === "custom" ? f.from : null);
  set("to", f.range === "custom" ? f.to : null);
  set("status", f.status.join(","));
  set("crew", f.crew.join(","));
  set("package", f.pkg.join(","));
  p.delete("type"); // retired invoice-type filter: drop it from old links
  set("sort", f.sort);
  set("dir", f.sort && f.dir === "desc" ? "desc" : null);
  set("page", f.page > 1 ? String(f.page) : null);
  set("size", f.size !== 10 ? String(f.size) : null);
  return p;
}

/** Monday–Sunday week containing `d`. */
const weekOf = (d: ISODate) => {
  const mon = addDays(d, -((parseISODate(d).dow + 6) % 7));
  return { from: mon, to: addDays(mon, 6) };
};
const monthOf = (y: number, m: number) => ({ from: toISODate(y, m, 1), to: toISODate(y, m + 1, 0) });

export function presetRange(preset: DatePreset, today: ISODate, custom?: { from: ISODate | null; to: ISODate | null }): { from: ISODate; to: ISODate } | null {
  const { y, m } = parseISODate(today);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "this-week":
      return weekOf(today);
    case "this-month":
      return monthOf(y, m);
    case "next-7-days":
      return { from: today, to: addDays(today, 6) };
    case "last-month":
      return monthOf(y, m - 1);
    case "custom":
      return custom?.from && custom.to ? { from: custom.from, to: custom.to } : null;
  }
}

/** "1 Nov – 30 Nov 2026" (same year) · "28 Dec 2026 – 3 Jan 2027". */
export function formatRange(from: ISODate, to: ISODate): string {
  const a = parseISODate(from), b = parseISODate(to);
  if (from === to) return `${a.day} ${MONTHS[a.m - 1]} ${a.y}`;
  return a.y === b.y ? `${a.day} ${MONTHS[a.m - 1]} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}` : `${a.day} ${MONTHS[a.m - 1]} ${a.y} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`;
}

/** Trigger value (Figma 02 / 16 / 25 / 26): "All dates" · "This month" · "1 Nov – 15 Nov 2026". */
export function rangeLabel(f: Pick<BookingFilters, "range" | "from" | "to">): string {
  if (!f.range) return "All dates";
  if (f.range === "custom") return f.from && f.to ? formatRange(f.from, f.to) : "Custom range";
  return DATE_PRESETS.find((d) => d.value === f.range)!.label;
}

/** Chip text: month presets read as the month ("Nov 2026", Figma 02); the rest as the trigger. */
export function rangeChip(f: Pick<BookingFilters, "range" | "from" | "to">, today: ISODate): string {
  if (f.range === "this-month" || f.range === "last-month") {
    const r = presetRange(f.range, today)!;
    const { y, m } = parseISODate(r.from);
    return `${MONTHS[m - 1]} ${y}`;
  }
  return rangeLabel(f);
}

/** Trigger values for the multi-selects: "All status" · "Partially paid" · "2 status". */
export function multiLabel(values: string[], all: string, one: (v: string) => string, many: string): string {
  if (!values.length) return all;
  if (values.length === 1) return one(values[0]);
  return `${values.length} ${many}`;
}

export type Chip = { key: "range" | "status" | "package" | "crew"; label: string };

/** Active filter chips in Figma 02's order: date · status · package · crew. Search isn't a chip. */
export function filterChips(f: BookingFilters, ctx: { today: ISODate; crewName: (id: string) => string; packageName: (id: string) => string }): Chip[] {
  const chips: Chip[] = [];
  if (f.range) chips.push({ key: "range", label: rangeChip(f, ctx.today) });
  if (f.status.length) chips.push({ key: "status", label: `Status: ${f.status.map((s) => STATUS_OPTIONS.find((o) => o.value === s)!.label).join(", ")}` });
  if (f.pkg.length) chips.push({ key: "package", label: `Package: ${f.pkg.map(ctx.packageName).join(", ")}` });
  if (f.crew.length) chips.push({ key: "crew", label: `Crew: ${f.crew.map(ctx.crewName).join(", ")}` });
  return chips;
}

/** Repository query for the Table (date range applies) or Calendar (the calendar navigates by itself). */
export function toQuery(f: BookingFilters, today: ISODate, view: "table" | "calendar"): BookingQuery {
  const r = view === "table" && f.range ? presetRange(f.range, today, f) : null;
  return {
    search: f.q || undefined,
    status: f.status.length ? f.status : undefined,
    crewIds: f.crew.length ? f.crew : undefined,
    packageIds: f.pkg.length ? f.pkg : undefined,
    from: r?.from,
    to: r?.to,
    view,
    sort: f.sort ? { key: f.sort, dir: f.dir } : undefined,
    today: view === "table" ? today : undefined,
  };
}

export const hasFilters = (f: BookingFilters) => !!(f.q.trim() || f.range || f.status.length || f.crew.length || f.pkg.length);

