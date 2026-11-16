import type { ReactNode } from "react";
import type { Presence } from "./usePresence";
import { Icon, type IconName } from "./Icon";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Badges & avatar → Avatar (20:1470), Alert (20:10958), Toast (20:10968).

/** Avatar 24 / 32 / 38: brand/avatar, radius pill. Initials UI/Avatar (12/16 Bold); size 24 uses 10/16 Bold. */
export function Avatar({ initials, size = 32, className }: { initials: string; size?: 24 | 32 | 38; className?: string }) {
  const dims = {
    24: "size-24 text-[length:var(--text-timestamp)] leading-[var(--text-micro--line-height)] font-bold",
    32: "size-32 text-ui-avatar",
    38: "size-[calc(var(--spacing-32)+var(--spacing-6))] text-ui-avatar",
  }[size];
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-pill bg-brand-avatar text-text-on-accent select-none", dims, className)}>
      <Txt>{initials}</Txt>
    </span>
  );
}

type Tone = "danger" | "warning" | "info" | "success";
const tones: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  danger: { bg: "bg-surface-danger", fg: "text-status-danger", icon: "triangle-alert" },
  warning: { bg: "bg-surface-warning", fg: "text-status-warning", icon: "triangle-alert" },
  info: { bg: "bg-surface-info", fg: "text-status-info", icon: "info" },
  success: { bg: "bg-surface-positive", fg: "text-status-positive", icon: "circle-check" },
};

/** Alert: pad control (12), gap control, radius control, 20px tone icon, title Body Strong, message Caption secondary. */
export function Alert({ tone, title, children, className }: { tone: Tone; title: ReactNode; children?: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex w-full items-start gap-control rounded-control p-control", t.bg, className)}>
      <Icon name={t.icon} className={cn("size-icon-md", t.fg)} />
      <div className="flex min-w-0 flex-1 flex-col gap-micro">
        <p className="text-body-strong text-text-primary">{title}</p>
        {children && <div className="text-caption text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}

// Toast tones (Figma Toast 20:10968, Tone=Success/Info/Error): solid status fill + same-colour 1px border
// (keeps the 1px footprint), text + icon text/inverse.
export type ToastTone = "success" | "info" | "danger";
const toastTones: Record<ToastTone, { surface: string; icon: IconName }> = {
  success: { surface: "border-status-positive bg-status-positive", icon: "circle-check" },
  info: { surface: "border-status-info bg-status-info", icon: "info" },
  danger: { surface: "border-status-danger bg-status-danger", icon: "triangle-alert" },
};

/** Toast: pad control/base/control/control, gap control, 1px border, radius card, Shadow/Floating, Body Strong. */
export function Toast({
  tone = "success",
  children,
  className,
  presence,
}: {
  tone?: ToastTone;
  children: ReactNode;
  className?: string;
  /** From usePresence() — enables the enter/exit motion (motion.css .motion-toast). */
  presence?: Presence;
}) {
  const t = toastTones[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      {...presence}
      className={cn(
        presence && "motion-toast",
        "inline-flex items-center gap-control rounded-card border py-control pr-base pl-control text-text-inverse shadow-floating",
        t.surface,
        className,
      )}
    >
      <Icon name={t.icon} className="size-icon-md" />
      <Txt className="text-body-strong">{children}</Txt>
    </div>
  );
}

/** Where toasts live: top-centre, base (16) below the global header — or 32 from the top on screens without one
 *  (`at="page"`: Login, Figma LO2 / O3). Enter/exit through the top edge (motion.css). */
export function ToastRegion({ children, at = "header" }: { children: ReactNode; at?: "header" | "page" }) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-50 flex justify-center",
        at === "header" ? "top-[calc(var(--spacing-layout-header-height)+var(--spacing-base))]" : "top-section",
      )}
    >
      {children}
    </div>
  );
}
