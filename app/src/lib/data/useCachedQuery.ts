"use client";

import { useEffect, useState } from "react";
import { fetchCached, peek } from "./cache";
import { withRetry } from "./retry";

/** A result this young is not read again on mount (e.g. the hover prefetch that just landed). */
const REVALIDATE_AFTER_MS = 5_000;

/**
 * One query-shaped read, cached (./cache.ts) and re-run when `key` changes. Opens on the cached result when there
 * is one, then refreshes it in the background; while a new key loads, the last result stays on screen. Returns
 * null only while nothing is known for any key yet, or after this key's read failed (back to the skeleton — never
 * the previous query's rows as this one's result). A failed read tries again 10 s after it failed. `key` must
 * be unique across the app for what `run` returns; null `run` = no read.
 */
export function useCachedQuery<T>(run: (() => Promise<T>) | null, key: string): T | null {
  const [state, setState] = useState<{ key: string; value: T | null; failed?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const cached = run ? peek<T>(key) : undefined;
  useEffect(() => {
    if (!run) return;
    const hit = peek<T>(key);
    if (hit && attempt === 0 && Date.now() - hit.at < REVALIDATE_AFTER_MS) return;
    let live = true;
    void withRetry(() => fetchCached(key, run)).then(
      (value) => live && setState({ key, value }),
      (e) => {
        if (live) setState({ key, value: null, failed: true });
        console.error(`Data source unavailable (${key.split(":")[0]})`, e);
      },
    );
    return () => {
      live = false;
    };
  }, [key, attempt]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` identifies what `run` reads
  // The retry timer starts from the failure, so a slow attempt is never cut short.
  const failedAt = state?.failed && state.key === key ? state : null;
  useEffect(() => {
    if (!failedAt) return;
    const t = setTimeout(() => setAttempt((n) => n + 1), 10_000);
    return () => clearTimeout(t);
  }, [failedAt]);
  if (state?.key === key) return state.value;
  if (cached) return cached.value;
  return state?.value ?? null;
}
