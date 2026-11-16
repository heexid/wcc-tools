import { describe, expect, it } from "vitest";
import { authenticatedAt, lastStudioMidnight, nextStudioMidnight, sessionEndedAtMidnight } from "@/lib/session-day";

const wib = (s: string) => new Date(`${s}+07:00`);
const sec = (s: string) => wib(s).getTime() / 1000;

describe("sessions end at 00:00 WIB", () => {
  it("finds today's and the next midnight in WIB, whatever the machine's timezone", () => {
    expect(new Date(lastStudioMidnight(wib("2026-11-16T11:30:00"))).toISOString()).toBe("2026-11-15T17:00:00.000Z");
    expect(new Date(nextStudioMidnight(wib("2026-11-16T11:30:00"))).toISOString()).toBe("2026-11-16T17:00:00.000Z");
    expect(lastStudioMidnight(wib("2026-11-16T00:00:00"))).toBe(wib("2026-11-16T00:00:00").getTime()); // exactly 00:00 is the new day
    expect(new Date(lastStudioMidnight(wib("2026-11-16T06:59:59"))).toISOString()).toBe("2026-11-15T17:00:00.000Z"); // still 15 Nov in UTC
  });
  it("a session from yesterday has ended; one from today hasn't", () => {
    const now = wib("2026-11-16T08:00:00");
    expect(sessionEndedAtMidnight(sec("2026-11-15T23:59:59"), now)).toBe(true);
    expect(sessionEndedAtMidnight(sec("2026-11-16T00:00:00"), now)).toBe(false);
    expect(sessionEndedAtMidnight(sec("2026-11-16T07:59:00"), now)).toBe(false);
  });
  it("just after midnight, last night's session is over", () => {
    expect(sessionEndedAtMidnight(sec("2026-11-15T23:50:00"), wib("2026-11-16T00:00:01"))).toBe(true);
  });
  it("no amr → not expired (the database applies the same rule)", () => {
    expect(sessionEndedAtMidnight(null)).toBe(false);
  });
  it("reads the earliest amr timestamp", () => {
    expect(authenticatedAt({ amr: [{ method: "password", timestamp: 200 }, { method: "otp", timestamp: 100 }] })).toBe(100);
    expect(authenticatedAt({ amr: "nope" })).toBeNull();
    expect(authenticatedAt(null)).toBeNull();
  });
});

describe("amr from an access token (proxy, review P4 #7/#8)", () => {
  const token = (payload: object) => `h.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.sig`;
  it("reads the sign-in time the proxy uses", async () => {
    const { authenticatedAtFromToken } = await import("@/lib/session-day");
    expect(authenticatedAtFromToken(token({ amr: [{ method: "password", timestamp: 1763251200 }] }))).toBe(1763251200);
    expect(authenticatedAtFromToken(token({ sub: "x" }))).toBeNull();
    expect(authenticatedAtFromToken("garbage")).toBeNull();
    expect(authenticatedAtFromToken(undefined)).toBeNull();
  });
  it("a token signed in yesterday makes the proxy end the session", async () => {
    const { authenticatedAtFromToken, sessionEndedAtMidnight } = await import("@/lib/session-day");
    const yesterday = new Date("2026-11-15T23:00:00+07:00").getTime() / 1000;
    expect(sessionEndedAtMidnight(authenticatedAtFromToken(token({ amr: [{ timestamp: yesterday }] })), new Date("2026-11-16T08:00:00+07:00"))).toBe(true);
  });
});
