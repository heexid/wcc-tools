"use client";

import { useIsViewer, setRole } from "@/lib/role";

// Switches the mock profile between admin and viewer (INTERACTIONS 6.4). Persists until /dev/reset.
export default function RolePage() {
  const viewer = useIsViewer();
  return (
    <main className="flex flex-col items-start gap-base p-section text-body">
      <h1 className="text-heading-page">Role</h1>
      <p role="status" className="text-text-secondary">Current role: {viewer ? "Viewer" : "Admin"}</p>
      <div className="flex gap-compact">
        <button type="button" onClick={() => setRole("admin")} aria-pressed={!viewer} className="rounded-control bg-accent-primary px-control py-micro text-ui-button text-text-on-accent">
          Admin
        </button>
        <button type="button" onClick={() => setRole("viewer")} aria-pressed={viewer} className="rounded-control bg-accent-primary px-control py-micro text-ui-button text-text-on-accent">
          Viewer
        </button>
      </div>
    </main>
  );
}
