"use client";

import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ds/Button";
import { Avatar } from "@/components/ds/Feedback";
import { Checkbox } from "@/components/ds/Checkbox";
import { CrewChip } from "@/components/ds/Editor";
import { FieldBox, FieldHelper, FieldLabel } from "@/components/ds/InputField";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { useDismiss } from "@/components/shell/useDismiss";
import type { Crew, Package } from "@/lib/data/types";
import { addDays, formatDate, formatIDR, initials, parseISODate, toISODate, type ISODate } from "@/lib/format";

// Popover fields of the booking form (Figma Bookings 13 / 39 / 40 package, 14 date, 03b crew). Each popover
// sits 6 px from its box: below (package) or above (date, crew — both near the end of the form in Figma).
// Popover shell: pad popover/inset, gap micro, surface/default, 1px border, radius card, Shadow/Floating.

function usePopover() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const { mounted, presence } = usePresence(open);
  useDismiss(open, () => setOpen(false), { panel, trigger: box });
  return { open, setOpen, box, panel, mounted, presence };
}

const shell = "motion-popover absolute z-30 flex flex-col rounded-card border border-border-default bg-surface-default shadow-floating";

/** Search row (Figma "Search", h 38, pad compact/10, gap compact, surface/subtle, radius control). */
function MenuSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-[calc(var(--spacing-32)+var(--spacing-6))] shrink-0 items-center gap-compact rounded-control bg-surface-subtle px-[calc(var(--spacing-12)-var(--spacing-2))]">
      <Icon name="search" className="size-icon-sm text-text-tertiary" />
      <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="min-w-0 flex-1 bg-transparent text-ui-input text-text-primary outline-none placeholder:text-text-placeholder" />
    </label>
  );
}

/** Popover footer link (top border, pad 10/10/tight/10, gap tight, external-link 14 + Caption text/accent). */
function MenuFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <div className="flex shrink-0 border-t border-border-default px-[calc(var(--spacing-12)-var(--spacing-2))] pt-[calc(var(--spacing-12)-var(--spacing-2))] pb-tight">
      <a href={href} target="_blank" rel="noopener" className="flex items-center gap-tight rounded-small text-caption text-text-accent outline-none hover:underline focus-visible:shadow-focus-ring">
        <Icon name="external-link" className="size-[calc(var(--spacing-12)+var(--spacing-2))]" />
        <Txt>{children}</Txt>
      </a>
    </div>
  );
}

/**
 * Package select (US-0 / US-1, INTERACTIONS 2.5, 2.6, 2.17): trigger = DS Select field; dropdown 624 wide with
 * search, options (pad compact/10, gap 10, radius 6: name Caption Strong / summary Timestamp · price Caption
 * Strong · ✓ 16 text/accent; selected surface/accent + price text/accent), archived note, footer "Manage
 * package library (opens in new tab)". Empty library (40): asset 40 · "No packages yet" · hint.
 */
export function PackageSelect({ value, onChange, packages, error, helper, onRefresh }: { value: string; onChange: (id: string) => void; packages: Package[]; error?: string; helper?: string; onRefresh?: () => void }) {
  const { open, setOpen, box, panel, mounted, presence } = usePopover();
  const id = useId();
  const [q, setQ] = useState("");
  const active = packages.filter((x) => x.isActive);
  const archived = packages.filter((x) => !x.isActive);
  const shown = active.filter((x) => `${x.name} ${x.summary}`.toLowerCase().includes(q.trim().toLowerCase()));
  const selected = packages.find((x) => x.id === value);
  return (
    <div className="flex w-full flex-col gap-micro">
      <FieldLabel required htmlFor={id}>
        Package
      </FieldLabel>
      <div ref={box} className="relative w-full">
        <FieldBox error={!!error} forceFocus={open}>
          <button
            id={id}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            data-invalid={!!error || undefined}
            aria-describedby={error || helper ? `${id}-msg` : undefined}
            onClick={() => {
              if (!open) {
                setQ("");
                onRefresh?.();
              }
              setOpen(!open);
            }}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-tight text-left outline-none"
          >
            <span className={cn("min-w-0 flex-1 truncate text-ui-input", selected ? "text-text-primary" : "text-text-placeholder")}>{selected?.name ?? "Select a package"}</span>
            <Icon name="chevron-down" className="size-icon-sm text-text-secondary" />
          </button>
        </FieldBox>
        {mounted && (
          <div ref={panel} role="dialog" aria-label="Package" {...presence} className={cn(shell, "top-[calc(100%+var(--spacing-6))] left-0 w-full gap-micro p-popover-inset [--transform-origin:top_left]")}>
            {active.length === 0 ? (
              <>
                <div className="flex flex-col items-center gap-compact px-group py-[calc(var(--spacing-24)+var(--spacing-4))] text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/assets/package-lib-40.png" srcSet="/assets/package-lib-40.png 1x, /assets/package-lib-40@2x.png 2x" alt="" className="block size-[calc(var(--spacing-32)+var(--spacing-8))]" />
                  <p className="flex text-heading-subsection text-text-primary">
                    <Txt>No packages yet</Txt>
                  </p>
                  <p className="max-w-[calc(var(--spacing-64)*6+var(--spacing-32)+var(--spacing-4))] text-caption text-text-secondary">
                    Create a package in Package Library first, then come back to pick it. Your booking details stay here.
                  </p>
                </div>
                <MenuFooterLink href="/packages">Create a package in Package Library (opens in new tab)</MenuFooterLink>
              </>
            ) : (
              <>
                <MenuSearch value={q} onChange={setQ} placeholder="Search package" />
                <ul role="listbox" aria-label="Packages" className="flex max-h-[calc(var(--spacing-64)*6)] flex-col gap-micro overflow-y-auto">
                  {shown.map((x) => {
                    const on = x.id === value;
                    return (
                      <li key={x.id} role="option" aria-selected={on}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(x.id);
                            setOpen(false);
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-6 px-[calc(var(--spacing-12)-var(--spacing-2))] py-compact text-left outline-none focus-visible:shadow-focus-ring",
                            "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover)",
                            on ? "bg-surface-accent" : "hover:bg-surface-subtle",
                          )}
                        >
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-caption-strong text-text-primary">{x.name}</span>
                            <span className="truncate text-timestamp text-text-secondary">{x.summary}</span>
                          </span>
                          <Txt className={cn("text-caption-strong", on ? "text-text-accent" : "text-text-primary")}>{formatIDR(x.price)}</Txt>
                          <Icon name="check" className={cn("size-icon-sm text-text-accent", !on && "opacity-0")} />
                        </button>
                      </li>
                    );
                  })}
                  {!shown.length && <li className="p-compact text-caption text-text-tertiary">No packages match “{q}”</li>}
                </ul>
                {archived.length > 0 && (
                  <p className="flex items-center gap-tight bg-surface-subtle px-base py-[calc(var(--spacing-12)-var(--spacing-2))] text-caption text-text-secondary">
                    <Icon name="archive" className="size-[calc(var(--spacing-12)+var(--spacing-2))] shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1">
                      {`${archived.length} archived ${archived.length === 1 ? "package isn’t" : "packages aren’t"} listed (${archived.map((a) => a.name).join(", ")}). Restore ${archived.length === 1 ? "it" : "them"} in Package Library to use ${archived.length === 1 ? "it" : "them"} again.`}
                    </span>
                  </p>
                )}
                <MenuFooterLink href="/packages">Manage package library (opens in new tab)</MenuFooterLink>
              </>
            )}
          </div>
        )}
      </div>
      {(error || helper) && (
        <FieldHelper id={`${id}-msg`} error={!!error}>
          {error ?? helper}
        </FieldHelper>
      )}
    </div>
  );
}

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Booking date (INTERACTIONS 2.7, Figma 14): DS Date field; month picker 300 wide above the field (pad 12,
 * gap 8): ‹ month › header (Body Strong), Mo–Su Timestamp text/tertiary, 34-tall day pills (Caption; outside
 * month text/tertiary; today 1px border/accent ring; selected accent/primary + Caption Strong on-accent),
 * footer (top border): ghost Today · "Past dates allowed with a warning". Past date → warning helper.
 */
export function DateField({ value, onChange, today, error, helper }: { value: string; onChange: (d: ISODate) => void; today: ISODate; error?: string; helper?: string }) {
  const { open, setOpen, box, panel, mounted, presence } = usePopover();
  const id = useId();
  const [month, setMonth] = useState(() => (value || today).slice(0, 7));
  const { y, m } = parseISODate(`${month}-01`);
  const first = toISODate(y, m, 1);
  const lead = (parseISODate(first).dow + 6) % 7;
  const days = useMemo(() => {
    const total = Math.ceil((lead + parseISODate(toISODate(y, m + 1, 0)).day) / 7) * 7;
    return Array.from({ length: total }, (_, i) => addDays(first, i - lead));
  }, [first, lead, y, m]);
  const pick = (d: ISODate) => {
    onChange(d);
    setOpen(false);
  };
  const past = !!value && value < today;
  const msg = error ?? (past ? "This date is in the past" : helper);
  return (
    <div className="flex w-full flex-col gap-micro">
      <FieldLabel required htmlFor={id}>
        Booking date
      </FieldLabel>
      <div ref={box} className="relative w-full">
        <FieldBox error={!!error} forceFocus={open}>
          <button
            id={id}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            data-invalid={!!error || undefined}
            aria-describedby={msg ? `${id}-msg` : undefined}
            onClick={() => {
              if (!open) setMonth((value || today).slice(0, 7));
              setOpen(!open);
            }}
            className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-tight text-left outline-none"
          >
            <Icon name="calendar" className="size-icon-sm text-text-secondary" />
            <span className={cn("min-w-0 flex-1 truncate text-ui-input", value ? "text-text-primary" : "text-text-placeholder")}>{value ? formatDate(value) : "Pick a date"}</span>
          </button>
        </FieldBox>
        {mounted && (
          <div
            ref={panel}
            role="dialog"
            aria-label="Choose booking date"
            {...presence}
            className={cn(shell, "bottom-[calc(100%+var(--spacing-6))] left-0 w-[calc(var(--spacing-64)*5-var(--spacing-20))] gap-compact p-control [--transform-origin:bottom_left]")}
          >
            <div className="flex h-[calc(var(--spacing-20)+var(--spacing-2))] items-center">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(toISODate(y, m - 1, 1).slice(0, 7))} className="flex cursor-pointer rounded-small text-text-secondary outline-none hover:text-text-primary focus-visible:shadow-focus-ring">
                <Icon name="chevron-left" className="size-icon-sm" />
              </button>
              <span className="flex flex-1 justify-center text-body-strong text-text-primary" aria-live="polite">
                <Txt>{`${MONTHS_LONG[m - 1]} ${y}`}</Txt>
              </span>
              <button type="button" aria-label="Next month" onClick={() => setMonth(toISODate(y, m + 1, 1).slice(0, 7))} className="flex cursor-pointer rounded-small text-text-secondary outline-none hover:text-text-primary focus-visible:shadow-focus-ring">
                <Icon name="chevron-right" className="size-icon-sm" />
              </button>
            </div>
            <div role="grid" aria-label={`${MONTHS_LONG[m - 1]} ${y}`} className="flex flex-col gap-compact">
              <div role="row" className="grid grid-cols-7">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <span key={d} role="columnheader" className="flex justify-center text-timestamp text-text-tertiary">
                    <Txt>{d}</Txt>
                  </span>
                ))}
              </div>
              {Array.from({ length: days.length / 7 }, (_, w) => (
                <div key={w} role="row" className="grid h-[calc(var(--spacing-32)+var(--spacing-2))] grid-cols-7">
                  {days.slice(w * 7, w * 7 + 7).map((d) => {
                    const on = d === value, isToday = d === today, outside = d.slice(0, 7) !== month;
                    return (
                      <button
                        key={d}
                        type="button"
                        role="gridcell"
                        aria-selected={on}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={formatDate(d)}
                        onClick={() => pick(d)}
                        className={cn(
                          "flex cursor-pointer items-center justify-center rounded-pill outline-none focus-visible:shadow-focus-ring",
                          on ? "bg-accent-primary text-caption-strong text-text-on-accent" : cn("text-caption hover:bg-surface-subtle", outside ? "text-text-tertiary" : "text-text-primary", isToday && "border border-border-accent"),
                        )}
                      >
                        <Txt>{String(parseISODate(d).day)}</Txt>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center border-t border-border-default pt-compact">
              <Button variant="ghost" onClick={() => pick(today)}>
                Today
              </Button>
              <span className="flex-1" />
              <Txt className="text-timestamp text-text-secondary">Past dates allowed with a warning</Txt>
            </div>
          </div>
        )}
      </div>
      {msg && (
        <FieldHelper id={`${id}-msg`} error={!!error} warning={!error && past}>
          {msg}
        </FieldHelper>
      )}
    </div>
  );
}

/**
 * Crew select (US-1, INTERACTIONS 2.9, Figma 03 / 03b): box (pad micro/compact, gap tight) with removable Crew chips
 * + chevron; dropdown above the box (search "Search crew by name or role", Crew options — checkbox · avatar 32 ·
 * name / role), instant apply, no footer. Helper "3 crew assigned" / "Who is handling this booking — select one or more".
 */
export function CrewSelect({ value, onChange, crew }: { value: string[]; onChange: (ids: string[]) => void; crew: Crew[] }) {
  const { open, setOpen, box, panel, mounted, presence } = usePopover();
  const id = useId();
  const [q, setQ] = useState("");
  const options = crew.filter((c) => c.isActive || value.includes(c.id));
  const shown = options.filter((c) => `${c.name} ${c.role}`.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (cid: string) => onChange(value.includes(cid) ? value.filter((x) => x !== cid) : [...value, cid]);
  const picked = value.map((v) => crew.find((c) => c.id === v)).filter((c): c is Crew => !!c);
  const [initial] = useState(() => new Set(value)); // chips present on load don't animate in
  return (
    <div className="flex w-full flex-col gap-tight">
      <FieldLabel htmlFor={id}>Assigned crew</FieldLabel>
      <div ref={box} className="relative w-full">
        <div
          className={cn(
            "flex min-h-[calc(var(--spacing-32)+var(--spacing-6))] w-full items-center gap-tight rounded-control border bg-surface-default px-compact py-micro",
            "transition-[border-color,box-shadow] duration-(--dur-hover) ease-(--ease-hover)",
            // Rest border/default · hover border/hover (~6:1, WCAG 1.4.11) · open accent + focus ring (Figma Crew select).
            open ? "border-border-accent shadow-focus-ring" : "border-border-default hover:border-border-hover",
          )}
        >
          {/* The whole field (same width × height as the box) opens the list: the chevron button's ::after covers
              the box, and the chip row lets pointer events through to it — only the chips' × buttons take clicks. */}
          <span className="pointer-events-none relative z-1 flex min-w-0 flex-1 flex-wrap gap-tight [&_button]:pointer-events-auto">
            {picked.map((c) => (
              <CrewChip key={c.id} className={initial.has(c.id) ? undefined : "motion-chip"} name={c.name} initials={initials(c.name)} onRemove={() => onChange(value.filter((x) => x !== c.id))} />
            ))}
            {!picked.length && <span className="flex h-[calc(var(--spacing-24)+var(--spacing-4))] items-center px-micro text-ui-input text-text-placeholder">Select crew</span>}
          </span>
          <button
            id={id}
            type="button"
            aria-label={picked.length ? `Assigned crew: ${picked.map((c) => c.name).join(", ")}. Change crew` : "Select crew"}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => {
              if (!open) setQ("");
              setOpen(!open);
            }}
            className="flex cursor-pointer self-stretch items-center text-text-secondary outline-none after:absolute after:inset-0 after:content-['']"
          >
            <Icon name="chevron-down" className="size-icon-sm" />
          </button>
        </div>
        {mounted && (
          <div ref={panel} role="dialog" aria-label="Crew" {...presence} className={cn(shell, "bottom-[calc(100%+var(--spacing-6))] left-0 w-full gap-micro p-popover-inset [--transform-origin:bottom_left]")}>
            <MenuSearch value={q} onChange={setQ} placeholder="Search crew by name or role" />
            <ul role="listbox" aria-label="Crew" aria-multiselectable className="flex max-h-[calc(var(--spacing-64)*5)] flex-col gap-2 overflow-y-auto">
              {shown.map((c) => {
                const on = value.includes(c.id);
                return (
                  <li key={c.id} role="option" aria-selected={on}>
                    <label className={cn("flex cursor-pointer items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-6 p-compact", "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover)", on ? "bg-surface-accent" : "hover:bg-surface-subtle")}>
                      <Checkbox checked={on} onChange={() => toggle(c.id)} />
                      <Avatar initials={initials(c.name)} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-caption-strong text-text-primary">{c.name}</span>
                        <span className="truncate text-timestamp text-text-secondary">{c.role}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
              {!shown.length && <li className="p-compact text-caption text-text-tertiary">No crew match “{q}”</li>}
            </ul>
          </div>
        )}
      </div>
      <FieldHelper>{picked.length ? `${picked.length} crew assigned` : "Who is handling this booking — select one or more"}</FieldHelper>
    </div>
  );
}
