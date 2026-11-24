"use client";

import { useSyncExternalStore } from "react";
import { peekProfile } from "@/lib/data/repo";
import { PROFILE_CHANGED } from "@/lib/data/shared";

// Account type (admin | crew, INTERACTIONS 6.4) comes from the signed-in profile, whichever data source the build uses.
// The UI hides write controls; the server enforces the same rule (RPC require_admin, RLS).
// /dev/role flips the mock profile (app/dev/role/setRole.ts).
export const ROLE_EVENT = PROFILE_CHANGED;

const subscribe = (cb: () => void) => {
  window.addEventListener(PROFILE_CHANGED, cb);
  return () => window.removeEventListener(PROFILE_CHANGED, cb);
};

/** True for the read-only type (crew). Server render and first paint assume admin, so hydration matches. */
export function useIsReadOnly(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const p = peekProfile();
      return !!p && p.role !== "admin"; // any other role, including a pre-migration "viewer", is read-only
    },
    () => false,
  );
}

/** True once an admin profile is known (gates admin-only sections such as Cancel booking). */
export function useIsAdmin(): boolean {
  const read = () => peekProfile()?.role === "admin";
  return useSyncExternalStore(subscribe, read, read);
}

/** The signed-in account's id once its profile is known ("You" in the crew pickers). */
export function useMyId(): string | null {
  return useSyncExternalStore(subscribe, () => peekProfile()?.id ?? null, () => null);
}
