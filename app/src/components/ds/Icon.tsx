import type { CSSProperties } from "react";
import { iconPaths, type IconName } from "./icon-paths";
import { cn } from "./cn";

export type { IconName };

/**
 * CIR icon (Figma "Icons" section). Figma instances scale the geometry (constraints SCALE)
 * but keep the stroke at `icon/stroke` (1.5) — so geometry scales via viewBox and the stroke
 * is non-scaling. Size with token classes (size-icon-sm = 16, -md = 20, -lg = 24).
 * `stroke` overrides the width with another token var (Checkbox uses --spacing-2).
 */
export function Icon({
  name,
  className,
  label,
  stroke,
}: {
  name: IconName;
  className?: string;
  label?: string;
  stroke?: `var(--${string})`;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn(
        "block shrink-0 [&_*]:[vector-effect:non-scaling-stroke] [&_*]:[stroke-width:var(--icon-sw,var(--spacing-icon-stroke))]",
        className ?? "size-icon-md",
      )}
      style={stroke ? ({ "--icon-sw": stroke } as CSSProperties) : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: iconPaths[name] }}
    />
  );
}
