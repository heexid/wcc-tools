"use client";

import { useSyncExternalStore } from "react";
import { getDb, persist } from "./data/store";
import type { Role } from "./data/types";

// Viewer role (INTERACTIONS 6.4): the role lives on the profile in the mock db. /dev/role flips it.
export const ROLE_EVENT = "proto:role";

export function setRole(role: Role) {
  getDb().profile.role = role;
  persist();
  window.dispatchEvent(new Event(ROLE_EVENT));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(ROLE_EVENT, cb);
  return () => window.removeEventListener(ROLE_EVENT, cb);
};

/** True for the read-only role. Server render and first paint assume admin, so hydration matches. */
export function useIsViewer(): boolean {
  return useSyncExternalStore(subscribe, () => getDb().profile.role === "viewer", () => false);
}
