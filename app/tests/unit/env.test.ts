import { describe, expect, it } from "vitest";
import { parseEnv, resolveAppEnv } from "@/env";

const hosted = {
  APP_ENV: "production",
  DATA_SOURCE: "supabase",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
};

describe("env contract (P0)", () => {
  it("defaults APP_ENV from NODE_ENV: production for builds, development otherwise", () => {
    expect(resolveAppEnv({ NODE_ENV: "production" })).toBe("production");
    expect(resolveAppEnv({ NODE_ENV: "development" })).toBe("development");
    expect(resolveAppEnv({})).toBe("development");
    expect(resolveAppEnv({ NODE_ENV: "production", APP_ENV: "test" })).toBe("test");
  });

  it("accepts a complete production env", () => {
    expect(parseEnv(hosted).DATA_SOURCE).toBe("supabase");
  });

  it("fails a hosted build with a missing Supabase variable", () => {
    expect(() => parseEnv({ ...hosted, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(() => parseEnv({ ...hosted, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("refuses the mock data source in staging and production", () => {
    expect(() => parseEnv({ ...hosted, DATA_SOURCE: "mock" })).toThrow(/mock/);
    expect(() => parseEnv({ ...hosted, APP_ENV: "staging", DATA_SOURCE: "mock" })).toThrow(/mock/);
    expect(parseEnv({ APP_ENV: "test", DATA_SOURCE: "mock" }).DATA_SOURCE).toBe("mock");
  });

  it("allows the frozen clock only in test", () => {
    expect(parseEnv({ APP_ENV: "test", NEXT_PUBLIC_TODAY: "2026-11-10" }).NEXT_PUBLIC_TODAY).toBe("2026-11-10");
    expect(() => parseEnv({ APP_ENV: "development", NEXT_PUBLIC_TODAY: "2026-11-10" })).toThrow(/NEXT_PUBLIC_TODAY/);
    expect(() => parseEnv({ ...hosted, NEXT_PUBLIC_TODAY: "2026-11-10" })).toThrow(/NEXT_PUBLIC_TODAY/);
  });

  it("rejects simulated latency when hosted", () => {
    expect(() => parseEnv({ ...hosted, NEXT_PUBLIC_LATENCY: "500" })).toThrow(/NEXT_PUBLIC_LATENCY/);
  });

  it("refuses any NEXT_PUBLIC_ variable that looks like a secret", () => {
    expect(() => parseEnv({ APP_ENV: "test", NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: "x" })).toThrow(/exposed to the browser/);
  });

  it("defaults DATA_SOURCE: supabase when hosted, mock for local dev and tests", () => {
    const { DATA_SOURCE: _omit, ...noSource } = hosted;
    expect(parseEnv(noSource).DATA_SOURCE).toBe("supabase");
    expect(parseEnv({ APP_ENV: "development" }).DATA_SOURCE).toBe("mock");
    expect(parseEnv({ APP_ENV: "test" }).DATA_SOURCE).toBe("mock");
  });

  it("choosing supabase locally still needs the URL and anon key (not the service key)", () => {
    expect(() => parseEnv({ APP_ENV: "development", DATA_SOURCE: "supabase" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(parseEnv({ APP_ENV: "development", DATA_SOURCE: "supabase", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" }).DATA_SOURCE).toBe("supabase");
  });

  it("rejects a malformed Supabase URL", () => {
    expect(() => parseEnv({ ...hosted, NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
