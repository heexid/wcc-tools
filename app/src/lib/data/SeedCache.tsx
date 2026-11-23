"use client";

import type { ReactNode } from "react";
import { seedCache, type Seed } from "./cache";

/** Hands the server's streamed reads to the read cache. Registers while rendering — before any effect below it
 *  starts a read — and renders its children unchanged. */
export function SeedCache({ seed, children }: { seed: Seed | null; children: ReactNode }) {
  seedCache(seed);
  return children;
}
