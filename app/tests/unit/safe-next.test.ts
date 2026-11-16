import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext (login ?next=, P4 open-redirect guard)", () => {
  it("keeps same-site paths with query and hash", () => {
    expect(safeNext("/packages")).toBe("/packages");
    expect(safeNext("/bookings?tab=table&booking=BK-2026-0142")).toBe("/bookings?tab=table&booking=BK-2026-0142");
    expect(safeNext("/account#security")).toBe("/account#security");
  });
  it("falls back when missing", () => {
    expect(safeNext(null)).toBe("/bookings");
    expect(safeNext("")).toBe("/bookings");
  });
  it.each(["https://evil.example", "//evil.example/x", "/\\evil.example", "javascript:alert(1)", "evil.example", "/%0d%0aSet-Cookie:x", "/\t/evil.example", "\\\\evil.example"])(
    "rejects %s",
    (raw) => {
      const out = safeNext(raw);
      expect(out.startsWith("/")).toBe(true);
      expect(out.startsWith("//")).toBe(false);
      expect(new URL(out, "http://same.origin").origin).toBe("http://same.origin");
    },
  );
  it("never sends you back to /login", () => {
    expect(safeNext("/login?next=/x")).toBe("/bookings");
  });
});
