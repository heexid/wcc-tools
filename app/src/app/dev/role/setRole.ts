// Dev only (next to /dev/role, compiled only in dev / test builds): flips the mock profile's role.
import { getDb, persist } from "@/lib/data/store";
import { PROFILE_CHANGED } from "@/lib/data/shared";
import type { Role } from "@/lib/data/types";

/** Read-only workspace: admins lose every write control. */
export function setWorkspaceStatus(status: "active" | "read_only") {
  getDb().profile.workspaceStatus = status;
  persist();
  window.dispatchEvent(new Event(PROFILE_CHANGED));
}

export function setRole(role: Role) {
  getDb().profile.role = role;
  persist();
  window.dispatchEvent(new Event(PROFILE_CHANGED));
}

/** Expired subscription (migration 019): paid until yesterday, so the workspace reads as read_only, as the database does. */
export function setSubscriptionExpired(expired: boolean) {
  const p = getDb().profile;
  p.subscription = expired ? { months: 3, start: "2026-08-01", paidUntil: "2026-10-31" } : { months: 6, start: "2026-09-01", paidUntil: "2027-02-28" };
  p.workspaceStatus = expired ? "read_only" : "active";
  persist();
  window.dispatchEvent(new Event(PROFILE_CHANGED));
}
