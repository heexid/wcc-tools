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

/** True when nothing can be changed: crew, or a read-only workspace (SHARED-DATABASE-PLAN §1 G). Server render and first paint assume admin, so hydration matches. */
export function useIsReadOnly(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => {
      const p = peekProfile();
      // Any other role, including a pre-migration "viewer", is read-only. A database before migration 018 sends no status.
      return !!p && (p.role !== "admin" || (p.workspaceStatus ?? "active") !== "active");
    },
    () => false,
  );
}

/** True once an admin profile is known (gates admin-only sections such as Cancel booking). */
export function useIsAdmin(): boolean {
  const read = () => {
    const p = peekProfile();
    return p?.role === "admin" && (p.workspaceStatus ?? "active") === "active";
  };
  return useSyncExternalStore(subscribe, read, read);
}

/** The signed-in account's id once its profile is known ("You" in the crew pickers). */
export function useMyId(): string | null {
  return useSyncExternalStore(subscribe, () => peekProfile()?.id ?? null, () => null);
}
