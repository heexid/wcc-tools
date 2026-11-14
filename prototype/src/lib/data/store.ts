// In-memory database with localStorage persistence (browser) — the prototype's "Supabase".
// Keys are prefixed "proto:" so /dev/reset can clear them. Node/Vitest: memory only.
import { DB_VERSION, seedDb } from "./seed";
import { applyFixture } from "./fixtures";
import type { Db } from "./types";

const KEY = "proto:db";
const VERSION = DB_VERSION; // one source with seedDb() — older saved data reseeds
let db: Db | null = null;

const storage = (): Storage | null => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

/** ?fixture=screen-06 on any page loads that Figma screen's data (and stays until /dev/reset). */
function fixtureFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("fixture");
}

export function getDb(): Db {
  const wanted = fixtureFromUrl();
  if (db && (!wanted || db.fixture === wanted)) return db;
  const s = storage();
  if (!wanted && s) {
    try {
      const raw = s.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Db;
        if (parsed.version === VERSION) return (db = parsed);
      }
    } catch {}
  }
  return loadFixture(wanted ?? "seed");
}

export function loadFixture(name: string): Db {
  db = applyFixture(seedDb(), name);
  persist();
  return db;
}

export function persist() {
  try {
    storage()?.setItem(KEY, JSON.stringify(db));
  } catch {}
}

/** Run a mutation as one "transaction": on throw, the previous state is restored (no partial writes). */
export function transaction<T>(fn: (d: Db) => T): T {
  const d = getDb();
  const before = JSON.stringify(d);
  try {
    const out = fn(d);
    persist();
    return out;
  } catch (e) {
    db = JSON.parse(before) as Db;
    throw e;
  }
}

export function resetDb() {
  db = null;
  try {
    const s = storage();
    if (s) for (const k of Object.keys(s)) if (k.startsWith("proto:")) s.removeItem(k);
  } catch {}
}
