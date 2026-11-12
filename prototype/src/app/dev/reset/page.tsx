"use client";

import { useState } from "react";

// Clears the mock data layer's persisted state (localStorage keys prefixed "proto:").
// Seed data loads again on the next visit to any app page.
export default function ResetPage() {
  const [cleared, setCleared] = useState<number | null>(null);
  const reset = () => {
    let n = 0;
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("proto:")) {
          localStorage.removeItem(key);
          n++;
        }
      }
    } catch {}
    setCleared(n);
  };
  return (
    <main className="flex flex-col items-start gap-base p-section text-body">
      <button type="button" onClick={reset} className="rounded-control bg-accent-primary px-control py-micro text-ui-button text-text-on-accent">
        Reset prototype data
      </button>
      <p role="status" className="text-text-secondary">
        {cleared === null ? "Clears bookings, packages and invoices created in this browser." : `Reset done — ${cleared} keys cleared.`}
      </p>
    </main>
  );
}
