import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCached, invalidateAll, peek, setCacheScope } from "@/lib/data/cache";
import { accountIdFromCookies } from "@/lib/supabase/cookie";

const URL_ = "https://abc.supabase.co";
const b64 = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const session = (sub: string, extra = "") => `base64-${b64(JSON.stringify({ access_token: `h.${b64(JSON.stringify({ sub, pad: extra }))}.s`, user: { id: "other" } }))}`;

describe("accountIdFromCookies", () => {
  it("reads the token's account, also from chunks in any order", () => {
    const v = session("user-1", "x".repeat(50));
    expect(accountIdFromCookies(`a=1; sb-abc-auth-token=${v}; b=2`, URL_)).toBe("user-1");
    expect(accountIdFromCookies(`sb-abc-auth-token.1=${v.slice(40)}; sb-abc-auth-token.0=${v.slice(0, 40)}`, URL_)).toBe("user-1");
  });
  it("is null when signed out, for another project, or unreadable", () => {
    expect(accountIdFromCookies("", URL_)).toBeNull();
    expect(accountIdFromCookies(`sb-other-auth-token=${session("x")}`, URL_)).toBeNull();
    expect(accountIdFromCookies("sb-abc-auth-token=base64-!!!", URL_)).toBeNull();
  });
});

describe("cache per account", () => {
  afterEach(() => {
    setCacheScope(() => "");
    invalidateAll();
    vi.unstubAllGlobals();
  });
  it("never shows one account's result to another, even one that lands after the switch", async () => {
    vi.stubGlobal("window", {});
    let who = "a";
    setCacheScope(() => who);
    await fetchCached("k", async () => "A's");
    let land!: (v: string) => void;
    const slow = fetchCached("slow", () => new Promise<string>((r) => (land = r)));
    who = "b";
    expect(peek("k")).toBeUndefined();
    land("A's late");
    await slow;
    expect(peek("slow")).toBeUndefined();
    expect(await fetchCached("k", async () => "B's")).toBe("B's");
    who = "a";
    expect(peek("k")?.value).toBe("A's");
    expect(peek("slow")?.value).toBe("A's late");
  });
});
