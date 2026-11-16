import { cn } from "./cn";

// F17 — loading primitives (INTERACTIONS 6.3).
// Loader: Figma Loader (20:4977) — 5×5 accent/primary dots, 12 px, 20 px pitch. (The Figma frame is 100 wide, which wraps
// the grid to 4 columns; the intended 5×5 is built here.) Skeleton: no Figma source — surface/header bars, radius 6.

/** Placeholder block. Size it with className (h-*, w-*); decorative, so hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("motion-skeleton block rounded-6 bg-surface-header", className)} />;
}

/** Orchid dot-grid loader; `label` is the accessible name (visually hidden under reduced motion too). */
export function Loader({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn("motion-loader flex items-center justify-center", className)}>
      <span aria-hidden className="grid grid-cols-5 gap-8">
        {Array.from({ length: 25 }, (_, k) => {
          const r = Math.floor(k / 5);
          const c = k % 5;
          return <span key={k} style={{ "--i": r + c } as React.CSSProperties} className="motion-loader-dot size-12 rounded-pill bg-accent-primary" />;
        })}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
