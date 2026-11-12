// Single source of "now" for the app. Visual tests freeze it to the date shown in
// Figma Bookings screen 01 (Today cell = Tue 10 Nov 2026) via NEXT_PUBLIC_TODAY.
export const FIGMA_TODAY = "2026-11-10";

export function now(): Date {
  const frozen = process.env.NEXT_PUBLIC_TODAY;
  if (frozen) return new Date(`${frozen}T09:00:00+07:00`);
  return new Date();
}
