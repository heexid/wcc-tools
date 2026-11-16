"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// G4 overlay: /dev/overlay?frame=bookings-01&route=/bookings&fixture=screen-01
// Renders the route in a 1440-wide iframe with the Figma PNG on top at adjustable opacity.
function Overlay() {
  const q = useSearchParams();
  const frame = q.get("frame") ?? "bookings-01";
  const route = q.get("route") ?? "/dev/tokens";
  const fixture = q.get("fixture");
  const [opacity, setOpacity] = useState(Number(q.get("opacity") ?? 0.5));
  const [diff, setDiff] = useState(false);
  const [frameH, setFrameH] = useState<number | null>(null); // iframe = Figma frame height, so centred layouts line up
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = img.current; // a cached image can finish loading before hydration attaches onLoad
    if (el?.complete && el.naturalHeight) setFrameH(el.naturalHeight);
  }, [frame]);
  const src = fixture ? `${route}${route.includes("?") ? "&" : "?"}fixture=${fixture}` : route;
  return (
    <div className="flex flex-col bg-surface-header min-h-screen">
      <div className="sticky top-0 z-10 flex items-center gap-base bg-surface-default p-compact text-caption shadow-navbar">
        <strong className="text-caption-strong">{frame}</strong>
        <span className="text-text-secondary">{src}</span>
        <label className="flex items-center gap-micro">
          Opacity
          <input type="range" min={0} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
          {Math.round(opacity * 100)}%
        </label>
        <label className="flex items-center gap-micro">
          <input type="checkbox" checked={diff} onChange={(e) => setDiff(e.target.checked)} /> Difference blend
        </label>
      </div>
      <div className="relative w-[var(--spacing-desktop-width)]">
        <iframe src={src} className="block w-[var(--spacing-desktop-width)] h-screen border-0" style={frameH ? { height: frameH } : undefined} title="route" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          src={`/__figma__/${frame}.png`}
          alt=""
          onLoad={(e) => setFrameH(e.currentTarget.naturalHeight)}
          className="pointer-events-none absolute left-0 top-0 block"
          style={{ opacity, mixBlendMode: diff ? "difference" : "normal" }}
        />
      </div>
    </div>
  );
}

export default function OverlayPage() {
  return (
    <Suspense>
      <Overlay />
    </Suspense>
  );
}
