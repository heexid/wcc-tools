"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { BookingReadOnly } from "@/components/bookings/BookingReadOnly";
import { AppShell } from "@/components/shell/AppShell";
import { getBooking, type BookingDetail } from "@/lib/data/repo";

// /bookings/[id] — the full booking page. An editable booking's full page is the Edit booking screen (decision
// 2026-11-11), so it redirects to /bookings/[id]/edit. A canceled booking can't be edited (PRD US-12): it renders the
// read-only full page here instead (Figma Hi-fi flow H5) — the sheet's ↗ "Open full page" and /edit both land here.
// Unknown ids go to the sheet, which says the booking doesn't exist.

function FullPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<{ id: string; b: BookingDetail } | null>(null);
  useEffect(() => {
    let live = true;
    getBooking(id).then((b) => {
      if (!live) return;
      if (b?.status === "canceled") return setState({ id, b });
      router.replace(b ? `/bookings/${id}/edit` : `/bookings?booking=${encodeURIComponent(id)}`);
    });
    return () => {
      live = false;
    };
  }, [id, router]);
  const b = state?.id === id ? state.b : null;
  // ‹ / Esc → back to Bookings with the detail sheet closed (H5 note).
  const back = useCallback(() => router.push("/bookings"), [router]);
  if (!b) return <div className="min-h-screen bg-surface-header" aria-busy="true" />;
  return (
    <AppShell module="booking" page={b.ref} editor>
      <BookingReadOnly key={b.id} b={b} onBack={back} />
    </AppShell>
  );
}

// Dynamic route: the params read sits inside the Suspense boundary (cacheComponents, as /edit).
export default function BookingDetailPage() {
  return (
    <Suspense>
      <FullPage />
    </Suspense>
  );
}
