"use client";

import { useEffect, useState } from "react";
import { computeKpis, saveBooking } from "@/lib/data/repo";
import { getDb } from "@/lib/data/store";
import { FIXTURES } from "@/lib/data/fixtures";
import { formatIDR } from "@/lib/format";

// Dev inspector for the mock data layer: active fixture, counts, KPIs. ?fixture=screen-31 switches.
export default function DataPage() {
  const [snap, setSnap] = useState<null | { fixture: string; bookings: number; invoices: number; packages: number; kpis: ReturnType<typeof computeKpis>; sari: string }>(null);
  const read = () => {
    const d = getDb();
    const sari = d.bookings.find((b) => b.ref === "BK-2026-0142");
    setSnap({ fixture: d.fixture, bookings: d.bookings.length, invoices: d.invoices.length, packages: d.packages.length, kpis: computeKpis(d, "2026-11"), sari: sari ? `${sari.clientName} · ${sari.status}` : "—" });
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after mount
  useEffect(read, []);
  if (!snap) return <main className="p-section text-body">Loading…</main>;
  return (
    <main className="flex flex-col gap-base p-section text-body">
      <h1 className="text-heading-page">Mock data</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-group gap-y-micro">
        <dt>Fixture</dt><dd data-testid="fixture">{snap.fixture}</dd>
        <dt>Bookings</dt><dd data-testid="bookings">{snap.bookings}</dd>
        <dt>Invoices</dt><dd data-testid="invoices">{snap.invoices}</dd>
        <dt>Packages</dt><dd data-testid="packages">{snap.packages}</dd>
        <dt>Sari & Dimas</dt><dd data-testid="sari">{snap.sari}</dd>
        <dt>Outstanding (Nov)</dt><dd data-testid="outstanding">{formatIDR(snap.kpis.outstanding)}</dd>
        <dt>Collected (Nov)</dt><dd data-testid="collected">{formatIDR(snap.kpis.collectedThisMonth)}</dd>
      </dl>
      <button
        type="button"
        className="w-fit cursor-pointer rounded-control border border-border-default px-control py-micro text-ui-button"
        onClick={async () => {
          await saveBooking({ clientName: "Test Client", clientPhone: "081211110000", packageId: "pkg_basic", bookingDate: "2026-11-20", items: [], crewIds: [], terms: "" });
          read();
        }}
      >
        Add test booking
      </button>
      <p className="text-caption text-text-secondary">Fixtures: {Object.keys(FIXTURES).length} — e.g. ?fixture=screen-31</p>
    </main>
  );
}
