"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// Renders a Figma reference PNG at 1×, top-left, no margins. Used to prove the G3
// capture pipeline is pixel-exact (screenshot of this page must equal the PNG).
function Frame() {
  const frame = useSearchParams().get("frame") ?? "bookings-01";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/__figma__/${frame}.png`} alt={frame} className="block" />;
}

export default function FramePage() {
  return (
    <Suspense>
      <Frame />
    </Suspense>
  );
}
