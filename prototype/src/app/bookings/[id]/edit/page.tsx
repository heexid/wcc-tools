"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { BookingForm } from "@/components/booking-form/BookingForm";
import { AppShell } from "@/components/shell/AppShell";
import { bookingToValues } from "@/lib/booking/form";
import { getBooking } from "@/lib/data/repo";
import { formatPhone } from "@/lib/format";

// /bookings/[id]/edit — the booking form in edit mode (breadcrumb = ref, title = booking name, Figma 05 / 07 / 08 /
// 12 / 38; PRD US-4, US-5). F10 lands here after "Save booking" (INTERACTIONS 2.2); F13 completes it (diff strip,
// updated totals, total below paid, follow-up invoices, archived package).

type Initial = NonNullable<ComponentProps<typeof BookingForm>["initial"]>;

// cacheComponents keeps the route's React state alive after you leave (as /new). Every visit reloads the booking
// and remounts the form, so edit A → leave → edit B (or A again) never shows stale values.
function EditBooking({ id }: { id: string }) {
  const router = useRouter();
  const [visit, setVisit] = useState(0);
  const seen = useRef(false);
  useLayoutEffect(() => {
    if (seen.current) setVisit((v) => v + 1);
    seen.current = true;
  }, []);
  const key = `${id}#${visit}`;
  const [state, setState] = useState<{ key: string; data: Initial | "missing" } | null>(null);
  useEffect(() => {
    let live = true;
    getBooking(id).then((b) => {
      if (!live) return;
      // Canceled is read-only (US-12): /edit goes to the read-only full page (Figma H5) instead.
      if (b?.status === "canceled") return router.replace(`/bookings/${b.id}`);
      setState({
        key,
        data: b
          ? {
              id: b.id,
              values: bookingToValues(b, formatPhone),
              createdAt: b.createdAt,
              ref: b.ref,
              bookingName: b.bookingName,
              status: b.status,
              invoices: b.invoices,
              packagePrice: b.packagePriceSnapshot,
              total: b.total,
              totalPaid: b.totalPaid,
            }
          : "missing",
      });
    });
    return () => {
      live = false;
    };
  }, [id, key, router]);
  if (!state || state.key !== key) return <div className="flex-1" aria-busy="true" />;
  if (state.data === "missing") return <p className="p-section text-body text-text-secondary">This booking doesn’t exist.</p>;
  return <BookingForm key={key} date={null} initial={state.data} />;
}

function EditRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell module="booking" page="Edit booking" editor>
      <EditBooking id={id} />
    </AppShell>
  );
}

// The route is dynamic ([id]), so the shell's own pathname read must sit inside the Suspense boundary too.
export default function EditBookingPage() {
  return (
    <Suspense>
      <EditRoute />
    </Suspense>
  );
}
