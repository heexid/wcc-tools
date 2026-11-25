"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ds/BottomSheet";
import { Button } from "@/components/ds/Button";
import { Avatar } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { MenuItem } from "@/components/ds/Surfaces";
import { PaymentStatusBadge } from "@/components/ds/Badges";
import { Txt } from "@/components/ds/Txt";
import { initials } from "@/lib/format";
import { LauncherTiles, type ModuleId } from "./AppLauncher";
import { useLeaveGuard } from "./LeaveGuard";

// Figma: Pattern · Responsive › Mobile/Top bar Type=Module (20:7890) + R02b MS1–MS3 (Shell & Account · Mobile).
// Replaces Global header + Page header below 768: h mobile/header-height (56), pad mobile/margin (16), gap control,
// surface/header. 44 launcher (grid 20) · module asset 20 · Heading/Module title (fills) · 32 avatar (44 tap target).
// Grid → App launcher sheet (MS1) · avatar → Account sheet (MS2) → Log out sheet (MS3). No language row: the app is
// English-only (desktop shows a static label).

const MODULES: Record<ModuleId, { name: string; href: string; art: string | null }> = {
  booking: { name: "Booking", href: "/bookings", art: "bookings" },
  packages: { name: "Packages", href: "/packages", art: "package-lib" },
  workspace: { name: "Workspace & Crew", href: "/workspace", art: null }, // icon comes with the illustration
};

export function MobileTopBar({
  module,
  title,
  name,
  role,
  onAccount,
  onLogout,
  className,
}: {
  module?: ModuleId;
  /** Standalone screen title (Account settings); module screens show the module name. */
  title?: string;
  name: string;
  role: string;
  onAccount: () => void;
  onLogout: () => void;
  className?: string;
}) {
  const { navigate } = useLeaveGuard();
  const [sheet, setSheet] = useState<"launcher" | "account" | null>(null);
  const m = module ? MODULES[module] : undefined;
  const close = () => setSheet(null);

  return (
    <header className={`sticky top-0 z-35 flex h-layout-header-height w-full shrink-0 items-center gap-control bg-surface-header px-layout-gutter ${className ?? ""}`}>
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={sheet === "launcher"}
        onClick={() => setSheet("launcher")}
        className="flex size-control-height shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-primary outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) focus-visible:shadow-focus-ring active:bg-surface-accent"
      >
        <Icon name="grid" className="size-icon-md" />
      </button>
      {m?.art && !title && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/assets/module-${m.art}.png`} srcSet={`/assets/module-${m.art}.png 1x, /assets/module-${m.art}@2x.png 2x`} alt="" className="block size-icon-md shrink-0" />
      )}
      <Txt className="min-w-0 flex-1 truncate text-heading-module text-text-primary">{title ?? m?.name ?? ""}</Txt>
      <button
        type="button"
        aria-label={`${name}, ${role} — account menu`}
        aria-haspopup="dialog"
        aria-expanded={sheet === "account"}
        onClick={() => setSheet("account")}
        // 44 tap target around the 32 avatar; the negative margin keeps the avatar 16 from the edge (Figma).
        className="-mr-6 flex size-control-height shrink-0 cursor-pointer items-center justify-center rounded-pill outline-none focus-visible:shadow-focus-ring"
      >
        <Avatar initials={initials(name)} size={32} />
      </button>

      <BottomSheet open={sheet === "launcher"} onClose={close} title="App launcher" initialFocus="[aria-current=page], button:not([data-close]):not(:disabled)">
        <section aria-labelledby="m-launcher-management" className="flex flex-col gap-control">
          <h3 id="m-launcher-management" className="text-heading-module text-text-primary">
            <Txt>Management</Txt>
          </h3>
          <LauncherTiles
            fluid
            current={module}
            onChoose={(t) => {
              if (!t.href) return;
              close();
              if (t.id !== module) navigate(t.href);
            }}
          />
        </section>
      </BottomSheet>

      <BottomSheet open={sheet === "account"} onClose={close} title="Account">
        {/* Workspace selector (identity), Figma MS2 (updated): full width, no switch chevrons — one workspace in this
            release, so it isn't a control. */}
        <div className="flex w-full items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-pill bg-surface-default py-micro pr-base pl-compact">
          <Avatar initials={initials(name)} size={38} />
          <span className="flex min-w-0 flex-col">
            <Txt className="text-body-strong text-text-primary">{name}</Txt>
            <Txt className="text-caption text-text-primary">{role}</Txt>
          </span>
        </div>
        <div role="menu" aria-label="Account" className="flex flex-col gap-control">
          <MenuItem
            icon="settings"
            onClick={() => {
              close();
              onAccount();
            }}
          >
            Account Setting
          </MenuItem>
          <MenuItem
            icon="log-out"
            tone="danger"
            onClick={() => {
              close();
              onLogout();
            }}
          >
            Log out
          </MenuItem>
        </div>
      </BottomSheet>
    </header>
  );
}

/** Log out confirmation on mobile (Figma MS3): sheet "Log out?" · body Text/Body secondary · Cancel / Log out (44, equal). */
export function MobileLogoutSheet({ open, busy, onCancel, onConfirm }: { open: boolean; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <BottomSheet open={open} locked={busy} onClose={onCancel} title="Log out?" role="alertdialog" initialFocus="[data-cancel]">
      <p className="text-body text-text-secondary">You’ll need to log in again to use Booking and Package Library.</p>
      <div className="flex gap-compact pt-8 *:flex-1">
        <Button variant="secondary" data-cancel disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
        <Button loading={busy} onClick={onConfirm}>
          {busy ? "Logging out…" : "Log out"}
        </Button>
      </div>
    </BottomSheet>
  );
}

/** Figma Mobile/Top bar Type=Child (20:7906): back 44 (chevron-left 20) · Heading/Module title (fills, truncates) ·
 *  status badge · autosave 44 (history 20; its text is the accessible status). Sticky; replaces the Editor page header
 *  and the module bar on child screens (New / Edit booking, booking detail) below 768. */
export function MobileChildBar({
  title,
  status,
  onBack,
  backLabel = "Back",
  saveState,
  className,
}: {
  title: string;
  status?: import("@/components/ds/Badges").BookingStatus;
  onBack: () => void;
  backLabel?: string;
  /** "Draft · not saved" / "All changes saved" … — shown as the autosave icon's status text. */
  saveState?: string;
  className?: string;
}) {
  return (
    <header className={`sticky top-0 z-35 flex h-layout-header-height w-full shrink-0 items-center gap-control bg-surface-header px-layout-gutter ${className ?? ""}`}>
      <button
        type="button"
        aria-label={backLabel}
        onClick={onBack}
        className="flex size-control-height shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-primary outline-none focus-visible:shadow-focus-ring active:bg-surface-accent"
      >
        <Icon name="chevron-left" className="size-icon-md" />
      </button>
      <h1 tabIndex={-1} className="flex min-w-0 flex-1 text-heading-module text-text-primary outline-none">
        <span className="min-w-0 truncate">{title}</span>
      </h1>
      {status && <PaymentStatusBadge status={status} info={false} />}
      {saveState && (
        <span role="status" aria-label={saveState} title={saveState} className="flex size-control-height shrink-0 items-center justify-center text-text-accent">
          <Icon name="history" className="size-icon-md" />
        </span>
      )}
    </header>
  );
}
