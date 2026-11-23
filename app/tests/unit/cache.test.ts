import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCached, invalidateAll, peek, prefetch } from "@/lib/data/cache";

// The cache only stores in a browser; pretend to be one.
beforeAll(() => vi.stubGlobal("window", {}));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => invalidateAll());

const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

describe("read cache (stale-while-revalidate)", () => {
  it("stores a result and shares a read in flight", async () => {
    const d = deferred<number>();
    const run = vi.fn(() => d.promise);
    const a = fetchCached("k", run);
    const b = fetchCached("k", run);
    expect(run).toHaveBeenCalledTimes(1);
    d.resolve(7);
    expect(await a).toBe(7);
    expect(await b).toBe(7);
    expect(peek<number>("k")?.value).toBe(7);
  });

  it("prefetch skips a fresh result", async () => {
    await fetchCached("k", async () => 1);
    const run = vi.fn(async () => 2);
    prefetch("k", run);
    expect(run).not.toHaveBeenCalled();
  });

  it("a write clears everything, and a read that lands after it is not stored", async () => {
    await fetchCached("a", async () => 1);
    const d = deferred<number>();
    const late = fetchCached("b", () => d.promise);
    invalidateAll();
    expect(peek("a")).toBeUndefined();
    d.resolve(2);
    expect(await late).toBe(2);
    expect(peek("b")).toBeUndefined();
  });

  it("a failed refresh keeps the last good result", async () => {
    await fetchCached("k", async () => 1);
    await expect(fetchCached("k", async () => Promise.reject(new Error("offline")))).rejects.toThrow("offline");
    expect(peek<number>("k")?.value).toBe(1);
  });

  it("stores nothing on the server", async () => {
    vi.unstubAllGlobals();
    await fetchCached("server", async () => 1);
    expect(peek("server")).toBeUndefined();
    vi.stubGlobal("window", {});
  });
});
