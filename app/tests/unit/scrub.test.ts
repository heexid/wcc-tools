import { describe, expect, it } from "vitest";
import { scrub, scrubError } from "@/lib/scrub";

describe("scrub (PRD §4.4: no phone numbers, emails or tokens in logs / error reports)", () => {
  it.each([
    ["call +62 812-3456-7890 now", "call [phone] now"],
    ["phone 081234567890", "phone [phone]"],
    ["raw 6281234567890 here", "raw [phone] here"],
    ["office +62 21-555-0100", "office [phone]"],
  ])("phone: %s", (input, out) => expect(scrub(input)).toBe(out));
  it("emails", () => expect(scrub("from finance@bs-moment.com")).toBe("from [email]"));
  it("signed-URL tokens and JWTs", () => {
    expect(scrub("GET http://127.0.0.1:54321/storage/v1/object/sign/branding/logo/a.png?token=abc.def.ghi failed")).toBe(
      "GET http://127.0.0.1:54321/storage/v1/object/sign/branding/logo/a.png?token=[redacted] failed",
    );
    expect(scrub("Authorization: Bearer eyJhbGciOi.xyz")).toBe("Authorization: Bearer [token]");
    expect(scrub("jwt eyJhbGciOiJIUzI1Ni.eyJzdWIiOiIxMjM0NTY3.SflKxwRJSMeKKF2QT4f")).toBe("jwt [jwt]");
  });
  it("keeps ordinary text, money and references", () => {
    const s = "INV-2026-0187 · BK-2026-0142 · Rp 12.500.000 · 2026-11-10";
    expect(scrub(s)).toBe(s);
  });
  it("errors become one safe line", () => {
    expect(scrubError(new Error("fetch ?token=secret for +6281234567890"))).toBe("Error: fetch ?token=[redacted] for [phone]");
    expect(scrubError({ phone: "081234567890" })).toBe('{"phone":"[phone]"}');
  });
});
