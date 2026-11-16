// Single source of "now" for the app. Visual tests freeze it to the date shown in
// Figma Bookings screen 01 (Today cell = Tue 10 Nov 2026) via NEXT_PUBLIC_TODAY — honoured only
// when APP_ENV=test (src/env.ts also rejects NEXT_PUBLIC_TODAY in any other environment).
export const FIGMA_TODAY = "2026-11-10";

// Compile-time flag (next.config.ts); per-module so the frozen-clock branch is dropped from other builds.
const IS_TEST = process.env.NEXT_PUBLIC_APP_ENV === "test";

export function now(): Date {
  const frozen = IS_TEST ? process.env.NEXT_PUBLIC_TODAY : undefined;
  if (frozen) return new Date(`${frozen}T09:00:00+07:00`);
  return new Date();
}
