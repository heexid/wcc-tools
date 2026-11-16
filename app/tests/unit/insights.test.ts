import { describe, expect, it } from "vitest";
import { seedDb } from "@/lib/data/seed";
import { applyFixture } from "@/lib/data/fixtures";
import { filterBookings } from "@/lib/data/repo";
import { buildInsights, countTrend, percentTrend, weekStart } from "@/lib/booking/insights";

const at9 = new Date("2026-11-10T09:00:00+07:00");
describe("Needs attention insights (Figma 01)", () => {
  it("weeks run Mon–Sun", () => {
    expect(weekStart("2026-11-10")).toBe("2026-11-09");
    expect(weekStart("2026-11-15")).toBe("2026-11-09");
  });
  it("seed produces exactly Figma's two cards", () => {
    const ins = buildInsights(filterBookings(seedDb(), {}), "2026-11-10", at9);
    expect(ins.map((i) => [i.tone, i.title, i.time, i.message, i.action.label])).toEqual([
      ["danger", "Balance due today", "2h ago", "Graduation · Aulia is today and still has Rp 1.750.000 outstanding.", "View booking"],
      ["warning", "Balance before event", "today", "3 bookings this week are still on DP — Rp 12.400.000 outstanding.", "View bookings"],
    ]);
  });
  it("Hartono (Draft, today) is not 'due' — only bookings with an invoice and a balance", () => {
    const ins = buildInsights(filterBookings(seedDb(), {}), "2026-11-10", at9);
    expect(ins.some((i) => i.message.includes("Hartono"))).toBe(false);
  });
  it("no bookings → no insights", () => expect(buildInsights(filterBookings(applyFixture(seedDb(), "screen-36"), {}), "2026-11-10", at9)).toEqual([]));
});

describe("KPI trends", () => {
  it("count trend: real data gives 18 vs 20 → −2 (down, negative)", () => expect(countTrend(18, 20)).toEqual({ value: "−2", direction: "down", tone: "negative", changed: true }));
  it("count trend: +4", () => expect(countTrend(24, 20).value).toBe("+4"));
  it("percent trend: 61,2 vs 54,45 → 12,4% up", () => expect(percentTrend(61_200_000, 54_450_000)).toEqual({ value: "12,4%", direction: "up", tone: "positive" }));
  it("percent trend: no previous month → none", () => expect(percentTrend(1, 0)).toBeNull());
});
