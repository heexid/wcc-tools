"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { BookingForm } from "@/components/booking-form/BookingForm";
import { AppShell } from "@/components/shell/AppShell";
import type { ISODate } from "@/lib/format";

// /bookings/new — New booking (Figma Bookings 03 …, PRD US-1). `?date=YYYY-MM-DD` prefills the booking date
// (calendar quick add, INTERACTIONS 1.15 / 1.26 / 1.31).

// cacheComponents keeps this route's React state alive (hidden) after you leave. Coming back must give a blank form,
// not the booking saved last time (after Save the form had become that booking's editor), so every visit
// remounts the form with a new key. useLayoutEffect re-runs each time the route is shown again, before paint.
function NewBooking() {
  const d = useSearchParams().get("date");
  const [visit, setVisit] = useState(0);
  const seen = useRef(false);
  useLayoutEffect(() => {
    if (seen.current) setVisit((v) => v + 1);
    seen.current = true;
  }, []);
  return <BookingForm key={`${visit}-${d ?? ""}`} date={d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? (d as ISODate) : null} />;
}

export default function NewBookingPage() {
  return (
    <AppShell module="booking" page="New booking" editor>
      <Suspense>
        <NewBooking />
      </Suspense>
    </AppShell>
  );
}
