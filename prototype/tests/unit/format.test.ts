import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  formatDateLongDay,
  formatDateTime,
  formatDateWithDay,
  formatDayMonth,
  formatDowUpper,
  formatIDR,
  formatMonthYear,
  formatPhone,
  formatWeekRange,
  initials,
  normalizePhone,
  parseIDR,
  slug,
  waLink,
} from "@/lib/format";

describe("money (Figma strings)", () => {
  it("formats IDR", () => {
    expect(formatIDR(12_500_000)).toBe("Rp 12.500.000");
    expect(formatIDR(0)).toBe("Rp 0");
    expect(formatIDR(750)).toBe("Rp 750");
    expect(formatIDR(-1_500)).toBe("−Rp 1.500");
  });
  it("rejects non-integers", () => expect(() => formatIDR(1.5)).toThrow());
  it("parses IDR", () => {
    expect(parseIDR("Rp 1.250.000")).toBe(1_250_000);
    expect(parseIDR("500.000")).toBe(500_000);
    expect(parseIDR("1250000")).toBe(1_250_000);
    expect(parseIDR("1.25")).toBeNull();
    expect(parseIDR("abc")).toBeNull();
    expect(parseIDR("-5")).toBeNull();
  });
});

describe("dates (Figma strings)", () => {
  it("table / card date", () => expect(formatDate("2026-10-02")).toBe("02 Oct 2026"));
  it("detail date", () => expect(formatDateWithDay("2026-11-12")).toBe("Thu, 12 Nov 2026"));
  it("day view title", () => expect(formatDateLongDay("2026-11-14")).toBe("Saturday, 14 Nov 2026"));
  it("popover / button dates", () => {
    expect(formatDayMonth("2026-11-14")).toBe("14 Nov");
    expect(formatDayMonth("2026-11-14", true)).toBe("Sat, 14 Nov");
  });
  it("rail weekday", () => expect(formatDowUpper("2026-11-12")).toBe("THU"));
  it("month title", () => expect(formatMonthYear(2026, 11)).toBe("November 2026"));
  it("week ranges", () => {
    expect(formatWeekRange("2026-11-09", "2026-11-15")).toBe("9 – 15 Nov 2026");
    expect(formatWeekRange("2026-11-30", "2026-12-06")).toBe("30 Nov – 6 Dec 2026");
    expect(formatWeekRange("2026-12-28", "2027-01-03")).toBe("28 Dec 2026 – 3 Jan 2027");
  });
  it("issued timestamp in Asia/Jakarta", () => expect(formatDateTime("2026-11-02T06:20:00.000Z")).toBe("02 Nov 2026, 13:20"));
  it("addDays crosses months", () => expect(addDays("2026-11-28", 7)).toBe("2026-12-05"));
});

describe("phone (PRD US-1)", () => {
  it("normalises local / national / international input", () => {
    expect(normalizePhone("0812 3456 7890")).toBe("+6281234567890");
    expect(normalizePhone("812-3456-7890")).toBe("+6281234567890");
    expect(normalizePhone("+62 812-3456-7890")).toBe("+6281234567890");
    expect(normalizePhone("6281234567890")).toBe("+6281234567890");
  });
  it("rejects too short / too long / non-numeric", () => {
    expect(normalizePhone("0812345")).toBeNull();
    expect(normalizePhone("0812345678901234567")).toBeNull();
    expect(normalizePhone("phone")).toBeNull();
  });
  it("displays as in Figma", () => {
    expect(formatPhone("+6281234567890")).toBe("+62 812-3456-7890");
    expect(formatPhone("+628165550192")).toBe("+62 816-555-0192");
    expect(formatPhone("+622155501234")).toBe("+62 21-5550-1234");
  });
  it("wa.me link", () => expect(waLink("+6281234567890")).toBe("https://wa.me/6281234567890"));
});

describe("misc", () => {
  it("initials", () => {
    expect(initials("Raka Pratama")).toBe("RP");
    expect(initials("bs.moment")).toBe("BS");
  });
  it("PDF slug", () => expect(slug("Sari Wulandari")).toBe("sari-wulandari"));
});
