"use client";

import { useSyncExternalStore } from "react";
import { peekProfile } from "@/lib/data/repo";
import { PROFILE_CHANGED } from "@/lib/data/shared";

// Viewer role (INTERACTIONS 6.4) comes from the signed-in profile, whichever data source the build uses.
// The UI hides write controls; the server enforces the same rule (RPC require_admin, RLS).
// /dev/role flips the mock profile (app/dev/role/setRole.ts).
export const ROLE_EVENT = PROFILE_CHANGED;

const subscribe = (cb: () => void) => {
  window.addEventListener(PROFILE_CHANGED, cb);
  return () => window.removeEventListener(PROFILE_CHANGED, cb);
};

/** True for the read-only role. Server render and first paint assume admin, so hydration matches. */
export function useIsViewer(): boolean {
  return useSyncExternalStore(subscribe, () => peekProfile()?.role === "viewer", () => false);
}

/** True once an admin profile is known (gates admin-only sections such as Cancel booking). */
export function useIsAdmin(): boolean {
  const read = () => peekProfile()?.role === "admin";
  return useSyncExternalStore(subscribe, read, read);
}
