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
