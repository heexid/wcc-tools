// In-memory read cache for the browser (stale-while-revalidate). A screen opens on the last result it saw for a
// query — no skeleton when coming back — and refreshes it in the background. Any write, sign-in or sign-out
// clears everything, so a screen never shows data from before the user's own change (or another user's data).
// Lives only in this tab's memory: a reload starts empty. On the server nothing is stored (one module serves
// every request there).
//
// Server seed (DATA_SOURCE=supabase): the server can start a screen's first reads itself and stream them with the
// page (seedCache). A read for a seeded key then waits for the server's answer instead of making its own request;
// a key the server didn't read, a failed server read, or a seed older than SEED_TTL_MS reads as usual.

type Entry = { value?: { v: unknown }; at: number; pending?: Promise<unknown> };

const MAX_ENTRIES = 100;
const entries = new Map<string, Entry>();
let generation = 0;
const inBrowser = () => typeof window !== "undefined";

/** What the server streams: per key, its result ({ v }) or null when that read failed there. */
export type Seed = Promise<Record<string, Promise<{ v: unknown } | null>> | null>;
const SEED_TTL_MS = 30_000;
let seed: { values: Seed; taken: Set<string>; at: number; gen: number } | null = null;
const seen = new WeakSet<object>();

/** Register the server's streamed reads (call while rendering, before the screen's effects run). Idempotent per
 *  seed: a re-render with the same one does nothing, a new server render brings a new one. */
export function seedCache(values: Seed | null | undefined) {
  if (!values || !inBrowser() || seen.has(values)) return;
  seen.add(values);
  seed = { values, taken: new Set(), at: Date.now(), gen: generation };
}

/** The server's answer for `key` if it streamed one (each key is used once), else `run()`. */
async function fromSeed<T>(key: string, run: () => Promise<T>): Promise<T> {
  const s = seed;
  if (!s || s.gen !== generation || s.taken.has(key) || Date.now() - s.at > SEED_TTL_MS) return run();
  s.taken.add(key);
  try {
    const values = await s.values;
    const entry = values?.[key];
    const hit = entry ? await entry : null;
    if (hit) return hit.v as T;
  } catch {}
  return run();
}

/** The cached result for `key`, or undefined when there is none. */
export function peek<T>(key: string): { value: T; at: number } | undefined {
  const e = entries.get(key);
  return e?.value ? { value: e.value.v as T, at: e.at } : undefined;
}

/** Run `run` for `key` and cache its result. A read already in flight for the same key is shared (a hover
 *  prefetch and the click that follows make one request). A result that lands after a write is not stored. */
export function fetchCached<T>(key: string, run: () => Promise<T>): Promise<T> {
  if (!inBrowser()) return run();
  const existing = entries.get(key);
  if (existing?.pending) return existing.pending as Promise<T>;
  const gen = generation;
  const pending = fromSeed(key, run).then(
    (v) => {
      if (gen === generation) store(key, { value: { v }, at: Date.now() });
      return v;
    },
    (e) => {
      const cur = entries.get(key);
      if (gen === generation && cur?.pending === pending) {
        if (cur.value) store(key, { value: cur.value, at: cur.at });
        else entries.delete(key);
      }
      throw e;
    },
  );
  store(key, { ...existing, at: existing?.at ?? 0, pending });
  return pending;
}

/** Warm the cache for `key` unless it already holds a result younger than `freshMs` (or a read is in flight). */
export function prefetch<T>(key: string, run: () => Promise<T>, freshMs = 30_000) {
  if (!inBrowser()) return;
  const e = entries.get(key);
  if (e?.pending || (e?.value && Date.now() - e.at < freshMs)) return;
  fetchCached(key, run).catch(() => {});
}

/** Drop every cached result (after a write, sign-in or sign-out). Reads in flight finish but are not stored. */
export function invalidateAll() {
  entries.clear();
  generation++;
  seed = null;
}

function store(key: string, e: Entry) {
  entries.delete(key); // re-insert so Map order is least → most recently written
  entries.set(key, e);
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
}
