"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { getDb } from "@/lib/data/store";
import { hasSession, logout } from "@/lib/data/repo";
import { AccountMenu } from "./AccountMenu";
import { AppLauncher, type ModuleId } from "./AppLauncher";
import { LeaveGuardProvider, useLeaveGuard } from "./LeaveGuard";

// Figma: DS Global header [Type=Module] + Breadcrumb (Launchpad L1/L3, Bookings 01).
// Page surface/header. Header h layout/header-height (78), pad base/gutter, space-between.
// Breadcrumb (gap base): ⋮⋮ App launcher 24 · divider 1×22 border/control · module (24 icon box surface/default
// radius control with an 18px asset, Heading/Module name, gap micro) · › chevron 12 text/secondary + page
// Text/Caption (gap base). Actions (gap inset): language (globe 20 + Body Strong, gap micro) · divider ·
// workspace/account pill. Workspace: surface/default, 1px border, radius card on top corners.
// Sticky at the top (z 35: above page popovers z-30, under dialogs z-40) so it stays put while the page scrolls.

const MODULES: Record<ModuleId, { name: string; href: string; art: string }> = {
  booking: { name: "Booking", href: "/bookings", art: "bookings" },
  packages: { name: "Packages", href: "/packages", art: "package-lib" },
};

function Divider() {
  return <span aria-hidden className="h-[calc(var(--spacing-20)+var(--spacing-2))] w-px shrink-0 bg-border-control" />;
}

function Header({ module, page, standalone, editor, onSlot }: { module: ModuleId; page?: string; standalone?: boolean; editor?: boolean; onSlot: (el: HTMLDivElement | null) => void }) {
  const { navigate, confirmLeave } = useLeaveGuard();
  const router = useRouter();
  const m = MODULES[module];
  const [profile, setProfile] = useState(() => getDb().profile);
  // The name updates in place after "Save name" on Account settings (US-13, 6.8).
  useEffect(() => {
    const refresh = () => setProfile({ ...getDb().profile }); // the store mutates in place — copy so React re-renders
    window.addEventListener(PROFILE_EVENT, refresh);
    return () => window.removeEventListener(PROFILE_EVENT, refresh);
  }, []);
  const [loggingOut, setLoggingOut] = useState(false);
  return (
    <header className="sticky top-0 z-35 flex h-layout-header-height w-full shrink-0 items-center bg-surface-header justify-between gap-base px-layout-gutter py-base">
      <nav aria-label="Breadcrumb" className="flex items-center gap-base">
        <AppLauncher current={module} />
        <Divider />
        {/* A standalone screen outside any module (Account settings) shows only its own name. */}
        {!standalone && (
          <a
            href={m.href}
            onClick={(e) => {
              e.preventDefault();
              navigate(m.href);
            }}
            aria-current={page ? undefined : "page"}
            className="flex items-center gap-micro rounded-small outline-none focus-visible:shadow-focus-ring"
          >
            <span className="flex size-24 items-center justify-center rounded-control bg-surface-default">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/assets/module-${m.art}.png`}
                srcSet={`/assets/module-${m.art}.png 1x, /assets/module-${m.art}@2x.png 2x`}
                alt=""
                className="block size-[calc(var(--spacing-16)+var(--spacing-2))]"
              />
            </span>
            <Txt className="text-heading-module text-text-primary">{m.name}</Txt>
          </a>
        )}
        {/* Parent (module root) screens show only the module; child screens add "› Page" (e.g. Booking › New booking). */}
        {page && (
          <span className="flex items-center gap-base" aria-current="page">
            {!standalone && <Icon name="chevron-right" className="size-12 text-text-secondary" />}
            <Txt className="text-caption text-text-primary">{page}</Txt>
          </span>
        )}
      </nav>
      {editor ? (
        // Global header [Type=Editor] (Bookings 03): the page portals its save status · divider · Cancel / Save
        // into this slot (<EditorActions>), gap inset.
        <div ref={onSlot} className="flex items-center gap-inset" />
      ) : (
        <div className="flex items-center gap-inset">
          {/* Language: English only in this release (existing CIR shell, INTERACTIONS 6.1) */}
          <span className="flex items-center gap-micro text-text-primary">
            <Icon name="globe" className="size-icon-md" />
            <Txt className="text-body-strong">English</Txt>
          </span>
          <Divider />
          <AccountMenu
            name={profile.displayName}
            role={profile.role === "admin" ? "Admin" : "Viewer"}
            onAccount={() => navigate("/account")}
            // 6.10: an unsaved booking asks first (leave guard), then "Log out?" (LO1).
            onLogout={() => confirmLeave("/login?loggedOut=1", () => setLoggingOut(true))}
          />
          <LogoutDialog
            open={loggingOut}
            onCancel={() => setLoggingOut(false)}
            onConfirm={async () => {
              await logout();
              router.push("/login?loggedOut=1");
            }}
          />
        </div>
      )}
    </header>
  );
}

/** Route guard: no session → /login?next=<this page>. Renders nothing until checked (client-only session). */
function useSessionGate() {
  const router = useRouter();
  const path = usePathname();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (hasSession())
      setOk(true); // eslint-disable-line react-hooks/set-state-in-effect -- session lives in localStorage
    else router.replace(`/login?next=${encodeURIComponent(path + window.location.search)}`);
  }, [router, path]);
  return ok;
}

export { Divider as HeaderDivider };

/** Fired after the profile changes (Account settings) so the header re-reads the name. */
export const PROFILE_EVENT = "proto:profile";

/** Log out confirmation (Figma LO1, INTERACTIONS 6.10): 440 wide, 260 from the top; 40 danger circle with log-out ·
 *  "Log out?" Heading/Section · body Text/Body secondary; footer (surface/subtle, top border) Cancel · Log out.
 *  Cancel / Esc / scrim keep the session. */
function LogoutDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onCancel} role="alertdialog" labelledBy={titleId} top="guard" width="w-[calc(var(--spacing-64)*7-var(--spacing-8))]" initialFocus="[data-cancel]">
      <div className="flex gap-base p-group">
        <span className="flex size-[calc(var(--spacing-32)+var(--spacing-8))] shrink-0 items-center justify-center rounded-pill bg-surface-danger text-status-danger">
          <Icon name="log-out" className="size-icon-md" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-tight">
          <h2 id={titleId} className="text-heading-section text-text-primary">
            Log out?
          </h2>
          <p className="text-body text-text-secondary">You’ll need to log in again to use Booking and Package Library.</p>
        </div>
      </div>
      <footer className="flex justify-end gap-compact border-t border-border-default bg-surface-subtle px-group py-base">
        <Button variant="secondary" data-cancel onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Log out</Button>
      </footer>
    </Dialog>
  );
}

const EditorSlot = createContext<HTMLDivElement | null>(null);
const CrumbSetter = createContext<(label: string | null) => void>(() => {});

/** Replaces the breadcrumb's page label while mounted (a saved booking shows its ref, Bookings 05 / 07). */
export function useShellCrumb(label: string | null) {
  const set = useContext(CrumbSetter);
  useEffect(() => {
    set(label);
    return () => set(null);
  }, [label, set]);
}

/** Renders the page's header actions (save status, Cancel, Save) into the Editor header slot. */
export function EditorActions({ children }: { children: ReactNode }) {
  const slot = useContext(EditorSlot);
  return slot ? createPortal(children, slot) : null;
}

/** `editor` switches the global header to the Editor variant (New / Edit booking): language + account give
 *  way to the page's own save status and buttons, rendered through <EditorActions>.
 *  `page` is the child screen's crumb (Booking › New booking); leave it out on a module's root screen
 *  (Bookings, Package library). `standalone`: a screen outside the modules (Account settings) — the
 *  breadcrumb is just `page`. */
export function AppShell({ module, page, standalone, editor, children }: { module: ModuleId; page?: string; standalone?: boolean; editor?: boolean; children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const [crumb, setCrumb] = useState<string | null>(null);
  const ok = useSessionGate();
  if (!ok) return <div className="min-h-screen bg-surface-header" aria-busy="true" />;
  return (
    <LeaveGuardProvider>
      <div className="flex min-h-screen flex-col bg-surface-header">
        <Header module={module} page={crumb ?? page} standalone={standalone} editor={editor} onSlot={setSlot} />
        <CrumbSetter.Provider value={setCrumb}>
          <EditorSlot.Provider value={slot}>
            {standalone ? (
              // Standalone screen (Account settings, Figma AC2): no module workspace — the page sits on surface/subtle.
              <div className="flex flex-1 flex-col bg-surface-subtle">{children}</div>
            ) : (
              <div className="flex flex-1 flex-col rounded-t-card border border-border-default bg-surface-default">{children}</div>
            )}
          </EditorSlot.Provider>
        </CrumbSetter.Provider>
      </div>
    </LeaveGuardProvider>
  );
}
