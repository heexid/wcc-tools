import { describe, expect, it } from "vitest";
import { newPasswordRules } from "@/lib/data/shared";
import { isRecoverySession, RECOVERY_WINDOW_S } from "@/lib/recovery";

// PASSWORD-RESET-PLAN: only a session made by a reset link in the last hour may set a password without the current one.
const token = (amr: unknown) => `h.${btoa(JSON.stringify({ amr })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.s`;
const now = 1_800_000_000_000;
const sec = now / 1000;

describe("isRecoverySession", () => {
  it("accepts a reset-link session opened just now", () => {
    expect(isRecoverySession(token([{ method: "recovery", timestamp: sec - 5 }]), now)).toBe(true);
    expect(isRecoverySession(token([{ method: "otp", timestamp: sec - 5 }]), now)).toBe(true);
  });
  it("refuses an ordinary password session (no skipping Current password)", () => {
    expect(isRecoverySession(token([{ method: "password", timestamp: sec - 5 }]), now)).toBe(false);
  });
  it("refuses a reset-link session older than the link's lifetime", () => {
    expect(isRecoverySession(token([{ method: "recovery", timestamp: sec - RECOVERY_WINDOW_S - 1 }]), now)).toBe(false);
  });
  it("refuses missing or malformed tokens", () => {
    for (const t of [null, undefined, "", "a.b.c", token("nope"), token([{ method: "recovery" }])]) expect(isRecoverySession(t, now)).toBe(false);
  });
});

describe("newPasswordRules", () => {
  it("needs 8+ characters with a letter and a number", () => {
    expect(newPasswordRules("abc")).toEqual({ length: false, letterAndNumber: false });
    expect(newPasswordRules("abcdefgh")).toEqual({ length: true, letterAndNumber: false });
    expect(newPasswordRules("abcdefg1")).toEqual({ length: true, letterAndNumber: true });
  });
});
