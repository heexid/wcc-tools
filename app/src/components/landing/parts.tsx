import Image from "next/image";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ds/Icon";
import { cn } from "@/components/ds/cn";

// Shared landing pieces (Figma "Landing Page" › LP-D / LP-T / LP-M).

export const LOGIN_HREF = "/login";
/** Placeholder until the Get started flow (Figma "Get started · Desktop 1440") is built. */
export const GET_STARTED_HREF = "/get-started";

/** Section links, in page order (navbar, fullscreen menu, footer). Labels match each section's chip. */
export const SECTION_LINKS = [
  { href: "#why-cir", label: "Why CIR" },
  { href: "#bookings", label: "Bookings" },
  { href: "#invoices", label: "Invoices" },
  { href: "#trust", label: "Trust" },
  { href: "#faq", label: "FAQ" },
];

/** A section's content column: 1280 max, on the landing gutter (80 · 24 · 16). */
export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[calc(var(--lp-content)+var(--lp-gutter)*2)] px-(--lp-gutter)", className)}>{children}</div>;
}

/** Figma "Chip": pill, border/strong, pad 6/14/6/12, gap 8, 20 icon + Text/Caption Strong. */
export function Chip({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-8 rounded-pill border border-border-strong bg-surface-default py-6 pr-[calc(var(--spacing-12)+var(--spacing-2))] pl-12 text-caption-strong text-text-primary">
      <Icon name={icon} className="size-icon-md" />
      {children}
    </span>
  );
}

/** Centred section intro: chip · 16 · Marketing/Heading · 24 · Mobile/Text · Body (secondary). */
export function SectionIntro({ chip, icon, title, children, id }: { chip?: string; icon?: IconName; title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      {chip && icon && (
        <div data-reveal className="mb-16">
          <Chip icon={icon}>{chip}</Chip>
        </div>
      )}
      <h2 id={id} data-reveal className="text-marketing-heading text-balance text-text-primary">
        {title}
      </h2>
      {children && (
        <p data-reveal className="mt-24 max-w-[calc(var(--spacing-64)*10+var(--spacing-32)+var(--spacing-8))] text-mobile-body text-balance text-text-secondary">
          {children}
        </p>
      )}
    </div>
  );
}

/** Blurred colour ellipse (Figma "Glow · brand/glow" / "Glow · accent/primary", layer blur 160–200). Decorative. */
export function Glow({ className, tone = "brand" }: { className?: string; tone?: "brand" | "accent" }) {
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute rounded-full", tone === "brand" ? "bg-brand-glow" : "bg-accent-primary", className)}
    />
  );
}

/** Product screenshot exported from Figma (public/assets/landing). Decorative copies of real app screens.
 *  `tilt` makes it tilt toward the pointer on desktop (tilt.ts). */
export function Shot({ src, alt, width, height, className, sizes, eager, tilt }: { src: string; alt: string; width: number; height: number; className?: string; sizes: string; eager?: boolean; tilt?: boolean }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      className={cn("block h-auto max-w-none select-none", className)}
      draggable={false}
      data-tilt={tilt || undefined}
    />
  );
}

/** Figma "Icon tile": 36 square, radius 8, border/default, 20 icon. */
export function IconTile({ icon, className }: { icon: IconName; className?: string }) {
  return (
    <span className={cn("flex size-[calc(var(--spacing-32)+var(--spacing-4))] shrink-0 items-center justify-center rounded-control border border-border-default bg-surface-default", className)}>
      <Icon name={icon} className="size-icon-md" />
    </span>
  );
}
