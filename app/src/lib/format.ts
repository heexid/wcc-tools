// Formatting used across the prototype, matching the strings in Figma "bs internal tools".
// Money: IDR, id-ID grouping, no decimals ("Rp 12.500.000"). Dates: English month names as in
// Figma ("02 Nov 2026", "Tue, 10 Nov 2026", "9 – 15 Nov 2026"), local time Asia/Jakarta.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 12500000 → "Rp 12.500.000"; −1500 → "−Rp 1.500" */
export function formatIDR(n: number): string {
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`formatIDR expects an integer, got ${n}`);
  const abs = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}Rp ${abs}`;
}

/** Digits only, thousands with "." — for inline price inputs ("500.000"). */
export function formatThousands(n: number): string {
  return Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "Rp 1.250.000" / "1.250.000" / "1250000" → 1250000. Decimals or other characters → null. */
export function parseIDR(input: string): number | null {
  const s = input.replace(/^\s*Rp\s*/i, "").trim();
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(s)) return null;
  const n = Number(s.replace(/\./g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

// ── Dates ─────────────────────────────────────────────────────────────────────────
// Booking dates are calendar dates ("2026-11-12"), never shifted by time zone.
export type ISODate = `${number}-${number}-${number}`;

export function parseISODate(d: string): { y: number; m: number; day: number; dow: number } {
  const [y, m, day] = d.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
  return { y, m, day, dow };
}

export function toISODate(y: number, m: number, day: number): ISODate {
  const dt = new Date(Date.UTC(y, m - 1, day));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}` as ISODate;
}

export function addDays(d: string, n: number): ISODate {
  const { y, m, day } = parseISODate(d);
  return toISODate(y, m, day + n);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "12 Nov 2026" (table, cards) — two-digit day as in Figma ("02 Oct 2026"). */
export const formatDate = (d: string) => {
  const { y, m, day } = parseISODate(d);
  return `${pad(day)} ${MONTHS[m - 1]} ${y}`;
};
/** "Thu, 12 Nov 2026" (detail panel) */
export const formatDateWithDay = (d: string) => {
  const { y, m, day, dow } = parseISODate(d);
  return `${DAYS[dow]}, ${day} ${MONTHS[m - 1]} ${y}`;
};
/** "Saturday, 14 Nov 2026" (day view title) */
export const formatDateLongDay = (d: string) => {
  const { y, m, day, dow } = parseISODate(d);
  return `${DAYS_LONG[dow]}, ${day} ${MONTHS[m - 1]} ${y}`;
};
/** "14 Nov" / "Sat, 14 Nov" */
export const formatDayMonth = (d: string, withDay = false) => {
  const { m, day, dow } = parseISODate(d);
  return `${withDay ? `${DAYS[dow]}, ` : ""}${day} ${MONTHS[m - 1]}`;
};
/** "TUE" (rail) */
export const formatDowUpper = (d: string) => DAYS[parseISODate(d).dow].toUpperCase();
/** "November 2026" */
export const formatMonthYear = (y: number, m: number) => `${MONTHS_LONG[m - 1]} ${y}`;
/** "9 – 15 Nov 2026" (same month) · "30 Nov – 6 Dec 2026" · "28 Dec 2026 – 3 Jan 2027" */
export function formatWeekRange(start: string, end: string): string {
  const a = parseISODate(start), b = parseISODate(end);
  if (a.y !== b.y) return `${a.day} ${MONTHS[a.m - 1]} ${a.y} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.m !== b.m) return `${a.day} ${MONTHS[a.m - 1]} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${a.day} – ${b.day} ${MONTHS[b.m - 1]} ${b.y}`;
}

/** ISO timestamp → "02 Nov 2026, 13:20" in Asia/Jakarta (UTC+7, no DST). */
export function formatDateTime(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return `${pad(t.getUTCDate())} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}, ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`;
}
/** ISO timestamp → calendar date in Asia/Jakarta. */
export function isoToLocalDate(iso: string): ISODate {
  const t = new Date(new Date(iso).getTime() + 7 * 3600_000);
  return toISODate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

// ── Phone (PRD US-1: Indonesian format, normalised to +62…, 9–15 digits) ─────────────
/** "0812 3456 7890" / "812-3456-7890" / "+62 812…" → "+6281234567890"; invalid → null. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+62")) d = d.slice(3);
  else if (d.startsWith("62")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  // National number (after +62, no trunk 0) must be 9–15 digits (PRD US-1).
  if (!/^[1-9]\d{8,14}$/.test(d)) return null;
  return `+62${d}`;
}

/** "+6281234567890" → "+62 812-3456-7890" (mobile 3-x-4; area code 21/22/… 2-x-4). */
export function formatPhone(e164: string): string {
  const d = e164.replace(/^\+62/, "");
  const area = d.startsWith("8") ? 3 : 2;
  const head = d.slice(0, area), rest = d.slice(area);
  return `+62 ${head}-${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}

/** wa.me link (PRD US-9). */
export const waLink = (e164: string) => `https://wa.me/${e164.replace(/^\+/, "")}`;

/** Initials for avatars: "Raka Pratama" → "RP", "bs.moment" → "BS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean); // "bs.moment" is one word → "BS" (Figma)
  if (!parts.length) return ""; // an empty business-name draft (Business information modal) has no initials yet
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
}

/** "booking-name" slug for PDF file names (PRD US-10). */
export const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
