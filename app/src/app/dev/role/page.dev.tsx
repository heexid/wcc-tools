"use client";

import { useIsReadOnly } from "@/lib/role";
import { setRole } from "./setRole";

// Switches the mock profile between admin and crew (INTERACTIONS 6.4). Persists until /dev/reset.
export default function RolePage() {
  const readOnly = useIsReadOnly();
  return (
    <main className="flex flex-col items-start gap-base p-section text-body">
      <h1 className="text-heading-page">Role</h1>
      <p role="status" className="text-text-secondary">Current role: {readOnly ? "Crew" : "Admin"}</p>
      <div className="flex gap-compact">
        <button type="button" onClick={() => setRole("admin")} aria-pressed={!readOnly} className="rounded-control bg-accent-primary px-control py-micro text-ui-button text-text-on-accent">
          Admin
        </button>
        <button type="button" onClick={() => setRole("crew")} aria-pressed={readOnly} className="rounded-control bg-accent-primary px-control py-micro text-ui-button text-text-on-accent">
          Crew
        </button>
      </div>
    </main>
  );
}
