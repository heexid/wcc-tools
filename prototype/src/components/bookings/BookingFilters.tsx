"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ds/Feedback";
import { Button } from "@/components/ds/Button";
import { Checkbox } from "@/components/ds/Checkbox";
import { Icon } from "@/components/ds/Icon";
import { SearchField } from "@/components/ds/SearchField";
import { SelectField } from "@/components/ds/InputField";
import { Tab } from "@/components/ds/Tabs";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { usePresence } from "@/components/ds/usePresence";
import { useDismiss } from "@/components/shell/useDismiss";
import {
  DATE_PRESETS,
  STATUS_OPTIONS,
  filterChips,
  formatRange,
  multiLabel,
  presetRange,
  rangeLabel,
  type BookingFilters,
  type Chip,
  type DatePreset,
} from "@/lib/booking/filters";
import type { Crew, Package } from "@/lib/data/types";
import { initials, parseISODate, toISODate, type ISODate } from "@/lib/format";

// Figma Bookings 01 / 02 / 02b / 16 / 18 / 25 / 26 / 36 — toolbar (view tabs; search + filter triggers),
// filter dropdowns (02b Crew dropdown pattern, reused for Status / Package — INTERACTIONS
// 1.6–1.8), date range popover (16, 1.9) and the active filter chips row (1.10).

export type View = "calendar" | "table";

const W = {
  // Calendar view widths (Figma 01): search fills (it took up the invoice-type filter's space when that was removed
  // 2026-11-11) · status 128 · crew 112 · package 140.
  calendar: {
    search: "min-w-0 flex-1",
    status: "w-[calc(var(--spacing-64)*2)]",
    crew: "w-[calc(var(--spacing-64)+var(--spacing-48))]",
    pkg: "w-[calc(var(--spacing-64)*2+var(--spacing-12))]",
  },
  // Table view widths (Figma 02 / 25 / 26): search fills · date 176 · status 136 · crew 110 · package 128.
  table: {
    search: "min-w-0 flex-1",
    range: "w-[calc(var(--spacing-64)*2+var(--spacing-48))]",
    status: "w-[calc(var(--spacing-64)*2+var(--spacing-8))]",
    crew: "w-[calc(var(--spacing-64)+var(--spacing-48)-var(--spacing-2))]",
    pkg: "w-[calc(var(--spacing-64)*2)]",
  },
};

/** Popover shell shared by the filter dropdowns: pad popover/inset, surface/default, 1px border, radius card, Shadow/Floating. */
function Menu({ open, onClose, trigger, children, className, label }: { open: boolean; onClose: () => void; trigger: (ref: React.RefObject<HTMLDivElement | null>) => ReactNode; children: ReactNode; className?: string; label: string }) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { mounted, presence } = usePresence(open);
  useDismiss(open, onClose, { panel: panelRef, trigger: triggerRef });
  return (
    <div ref={triggerRef} className="relative flex">
      {trigger(triggerRef)}
      {mounted && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          {...presence}
          className={cn(
            "motion-popover absolute top-[calc(100%+var(--spacing-6))] z-30 flex flex-col gap-micro rounded-card border border-border-default bg-surface-default p-popover-inset shadow-floating [--transform-origin:top_left]",
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

type Option = { value: string; label: string; sub?: string; avatar?: string };

/**
 * Multi-select dropdown (Figma DS "Crew dropdown" / "Crew option", 02b): optional search (h 38, surface/subtle,
 * radius control, search 16 text/tertiary); options (gap 2) — pad compact, gap 10, radius 6, Checked
 * surface/accent; checkbox · [avatar 32] · name Caption Strong / role Timestamp; footer (top border, pad
 * compact/tight/micro/tight): "n selected" · ghost Clear · primary Apply. Changes apply on Apply.
 */
function MultiSelectMenu({
  label,
  value,
  options,
  selected,
  onApply,
  searchable,
  width,
  menuWidth,
}: {
  label: string;
  value: ReactNode;
  options: Option[];
  selected: string[];
  onApply: (v: string[]) => void;
  searchable?: string;
  width: string;
  menuWidth: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const shown = useMemo(() => options.filter((o) => !q.trim() || `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())), [options, q]);
  const toggle = (v: string) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  const openMenu = () => {
    setDraft(selected);
    setQ("");
    setOpen(true);
  };
  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      label={label}
      className={menuWidth}
      trigger={() => <SelectField hideLabel label={label} value={value} className={width} expanded={open} onClick={() => (open ? setOpen(false) : openMenu())} />}
    >
      {searchable && (
        <label className="flex h-[calc(var(--spacing-32)+var(--spacing-6))] items-center gap-compact rounded-control bg-surface-subtle px-[calc(var(--spacing-12)-var(--spacing-2))]">
          <Icon name="search" className="size-icon-sm text-text-tertiary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={searchable}
            aria-label={searchable}
            className="min-w-0 flex-1 bg-transparent text-ui-input text-text-primary outline-none placeholder:text-text-placeholder"
          />
        </label>
      )}
      <ul className="flex max-h-[calc(var(--spacing-64)*5)] flex-col gap-2 overflow-y-auto">
        {shown.map((o) => {
          const on = draft.includes(o.value);
          return (
            <li key={o.value}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-[calc(var(--spacing-12)-var(--spacing-2))] rounded-6 p-compact",
                  "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover)",
                  on ? "bg-surface-accent" : "bg-surface-default hover:bg-surface-subtle",
                )}
              >
                <Checkbox checked={on} onChange={() => toggle(o.value)} autoFocus={!searchable && o === shown[0]} />
                {o.avatar && <Avatar initials={o.avatar} />}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-caption-strong text-text-primary">{o.label}</span>
                  {o.sub && <span className="truncate text-timestamp text-text-secondary">{o.sub}</span>}
                </span>
              </label>
            </li>
          );
        })}
        {!shown.length && <li className="p-compact text-caption text-text-tertiary">No matches</li>}
      </ul>
      <div className="flex items-center gap-compact border-t border-border-default pt-compact pr-tight pb-micro pl-tight">
        <Txt className="text-caption text-text-secondary">{`${draft.length} selected`}</Txt>
        <span className="flex-1" />
        <Button variant="ghost" onClick={() => setDraft([])}>
          Clear
        </Button>
        <Button
          onClick={() => {
            onApply(draft);
            setOpen(false);
          }}
        >
          Apply
        </Button>
      </div>
    </Menu>
  );
}

const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** One month of the range calendar (Figma 16): title Caption Strong, Mo–Su Timestamp text/tertiary, 26-tall day rows, gap micro. */
function RangeMonth({ y, m, from, to, onPick }: { y: number; m: number; from: ISODate | null; to: ISODate | null; onPick: (d: ISODate) => void }) {
  const first = toISODate(y, m, 1);
  const lead = (parseISODate(first).dow + 6) % 7;
  const days = parseISODate(toISODate(y, m + 1, 0)).day;
  const cells: (ISODate | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => toISODate(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  return (
    <div role="grid" aria-label={`${MONTHS_LONG[m - 1]} ${y}`} className="flex min-w-0 flex-1 flex-col gap-micro">
      <div className="flex h-20 justify-center">
        <Txt className="text-caption-strong text-text-primary">{`${MONTHS_LONG[m - 1]} ${y}`}</Txt>
      </div>
      <div role="row" className="grid grid-cols-7">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <span key={d} role="columnheader" className="flex justify-center text-timestamp text-text-tertiary">
            <Txt>{d}</Txt>
          </span>
        ))}
      </div>
      {weeks.map((w, i) => (
        <div key={i} role="row" className="grid h-[calc(var(--spacing-24)+var(--spacing-2))] grid-cols-7">
          {w.map((d, j) => {
            if (!d) return <span key={j} role="gridcell" />;
            const end = d === from || d === to;
            const inside = !!from && !!to && d > from && d < to;
            return (
              <button
                key={d}
                type="button"
                role="gridcell"
                aria-selected={end || inside}
                aria-label={d}
                onClick={() => onPick(d)}
                className={cn(
                  "flex cursor-pointer items-center justify-center text-timestamp outline-none focus-visible:shadow-focus-ring",
                  end ? "rounded-pill bg-accent-primary text-text-on-accent" : inside ? "bg-surface-accent text-text-primary" : "rounded-pill text-text-primary hover:bg-surface-subtle",
                )}
              >
                <Txt>{String(parseISODate(d).day)}</Txt>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Date filter (Figma 16 · "Date range popover", 600 wide): presets (150, rows h 36, pad compact/10, radius 6;
 * selected surface/accent + Caption Strong text/accent) | two months (pad micro/compact/micro/control, gap
 * base, left border) ; footer (top border, pad 10/compact/micro/compact): range Caption Strong · Clear · Apply.
 * Opens so the months sit under the trigger (x −160). Picking days makes a Custom range.
 */
function DateRangeMenu({ filters, today, onApply, width }: { filters: BookingFilters; today: ISODate; onApply: (p: Pick<BookingFilters, "range" | "from" | "to">) => void; width: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ range: DatePreset | null; from: ISODate | null; to: ISODate | null }>({ range: null, from: null, to: null });
  const openMenu = () => {
    const r = filters.range ? presetRange(filters.range, today, filters) : null;
    setDraft({ range: filters.range, from: r?.from ?? null, to: r?.to ?? null });
    setOpen(true);
  };
  const pickPreset = (p: DatePreset) => {
    const r = presetRange(p, today, draft);
    setDraft({ range: p, from: r?.from ?? draft.from, to: r?.to ?? draft.to });
  };
  const pickDay = (d: ISODate) =>
    setDraft((s) => (s.range !== "custom" || !s.from || s.to ? { range: "custom", from: d, to: null } : d < s.from ? { range: "custom", from: d, to: s.from } : { range: "custom", from: s.from, to: d }));
  const base = parseISODate(draft.from ?? today);
  const next = parseISODate(toISODate(base.y, base.m + 1, 1));
  const ready = draft.range && draft.range !== "custom" ? true : !!(draft.from && draft.to);
  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      label="Booking date"
      className="-left-[calc(var(--spacing-64)*2+var(--spacing-32))] w-[calc(var(--spacing-64)*9+var(--spacing-24))] [--transform-origin:top_center]"
      trigger={() => <SelectField hideLabel label="Booking date" value={rangeLabel(filters)} className={width} expanded={open} onClick={() => (open ? setOpen(false) : openMenu())} />}
    >
      <div className="flex gap-control">
        <ul aria-label="Presets" className="flex w-[calc(var(--spacing-64)*2+var(--spacing-24)-var(--spacing-2))] shrink-0 flex-col gap-2">
          {DATE_PRESETS.map((p) => {
            const on = draft.range === p.value;
            return (
              <li key={p.value}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickPreset(p.value)}
                  className={cn(
                    "flex w-full cursor-pointer rounded-6 px-[calc(var(--spacing-12)-var(--spacing-2))] py-compact text-left outline-none focus-visible:shadow-focus-ring",
                    "transition-[background-color] duration-(--dur-hover) ease-(--ease-hover)",
                    on ? "bg-surface-accent text-caption-strong text-text-accent" : "text-caption text-text-primary hover:bg-surface-subtle",
                  )}
                >
                  <Txt>{p.label}</Txt>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex min-w-0 flex-1 items-start gap-base border-l border-border-default py-micro pr-compact pl-control">
          <RangeMonth y={base.y} m={base.m} from={draft.from} to={draft.to} onPick={pickDay} />
          <RangeMonth y={next.y} m={next.m} from={draft.from} to={draft.to} onPick={pickDay} />
        </div>
      </div>
      <div className="flex items-center gap-compact border-t border-border-default px-compact pt-[calc(var(--spacing-12)-var(--spacing-2))] pb-micro">
        <Txt className="text-caption-strong text-text-primary">{draft.from ? formatRange(draft.from, draft.to ?? draft.from) : "Pick a preset or two dates"}</Txt>
        <span className="flex-1" />
        <Button variant="ghost" onClick={() => setDraft({ range: null, from: null, to: null })}>
          Clear
        </Button>
        <Button
          disabled={!!draft.range && !ready}
          onClick={() => {
            onApply(draft.range === "custom" ? draft : { range: draft.range, from: null, to: null });
            setOpen(false);
          }}
        >
          Apply
        </Button>
      </div>
    </Menu>
  );
}

/** Search debounced 250 ms into the URL (INTERACTIONS 1.4); × clears at once. */
function DebouncedSearch({ value, onChange, className }: { value: string; onChange: (v: string) => void; className: string }) {
  const [q, setQ] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value); // reset / chip removal from outside
    setQ(value);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return (
    <SearchField
      aria-label="Search bookings"
      placeholder="Search booking, client or phone"
      value={q}
      onValueChange={(v) => {
        setQ(v);
        if (timer.current) clearTimeout(timer.current);
        if (!v) return onChange("");
        timer.current = setTimeout(() => onChange(v), 250);
      }}
      className={className}
    />
  );
}

export function BookingToolbar({
  view,
  onView,
  filters,
  update,
  today,
  crew,
  packages,
}: {
  view: View;
  onView: (v: View) => void;
  filters: BookingFilters;
  update: (p: Partial<BookingFilters>) => void;
  today: ISODate;
  crew: Crew[];
  packages: Package[];
}) {
  const w = view === "calendar" ? W.calendar : W.table;
  const pkgName = (id: string) => packages.find((p) => p.id === id)?.name ?? id;
  return (
    <div className="flex flex-col gap-base">
      <div role="tablist" aria-label="View" className="flex border-b border-border-default">
        <Tab active={view === "calendar"} onClick={() => onView("calendar")}>
          Calendar
        </Tab>
        <Tab active={view === "table"} onClick={() => onView("table")}>
          Table
        </Tab>
      </div>
      <div className="flex items-center gap-compact">
        <DebouncedSearch value={filters.q} onChange={(q) => update({ q })} className={w.search} />
        {view === "table" && <DateRangeMenu filters={filters} today={today} width={W.table.range} onApply={(r) => update(r)} />}
        <MultiSelectMenu
          label="Status"
          width={w.status}
          menuWidth="w-[calc(var(--spacing-64)*4-var(--spacing-16))]"
          value={multiLabel(filters.status, "All status", (v) => STATUS_OPTIONS.find((o) => o.value === v)!.label, "status")}
          options={STATUS_OPTIONS}
          selected={filters.status}
          onApply={(v) => update({ status: v as BookingFilters["status"] })}
        />
        <MultiSelectMenu
          label="Crew"
          width={w.crew}
          menuWidth="w-[calc(var(--spacing-64)*5)]"
          searchable="Search crew"
          value={multiLabel(filters.crew, "All crew", () => "1 crew", "crew")}
          options={crew.filter((c) => c.isActive || filters.crew.includes(c.id)).map((c) => ({ value: c.id, label: c.name, sub: c.role, avatar: initials(c.name) }))}
          selected={filters.crew}
          onApply={(v) => update({ crew: v })}
        />
        <MultiSelectMenu
          label="Package"
          width={w.pkg}
          menuWidth="w-[calc(var(--spacing-64)*5)]"
          searchable="Search packages"
          value={multiLabel(filters.pkg, "All packages", pkgName, "packages")}
          options={packages.map((p) => ({ value: p.id, label: p.name }))}
          selected={filters.pkg}
          onApply={(v) => update({ pkg: v })}
        />
      </div>
    </div>
  );
}

/**
 * Active filters row (Figma 02 / 18 / 25 / 26): "4 filters ·" Caption text/secondary · chips (h 24, pad
 * 2/tight/2/10, gap micro, surface/accent, radius pill, Caption text/accent + × 14) · "Reset all" Caption
 * Strong text/accent · spacer · "Showing 4 of 24 bookings" (Table). Gap compact.
 */
export function ActiveFilters({
  filters,
  update,
  reset,
  today,
  crew,
  packages,
  summary,
}: {
  filters: BookingFilters;
  update: (p: Partial<BookingFilters>) => void;
  reset: () => void;
  today: ISODate;
  crew: Crew[];
  packages: Package[];
  summary?: string;
}) {
  const chips = filterChips(filters, {
    today,
    crewName: (id) => crew.find((c) => c.id === id)?.name ?? id,
    packageName: (id) => packages.find((p) => p.id === id)?.name ?? id,
  });
  const clear: Record<Chip["key"], Partial<BookingFilters>> = { range: { range: null, from: null, to: null }, status: { status: [] }, package: { pkg: [] }, crew: { crew: [] } };
  if (!chips.length && !filters.q) return null;
  return (
    // Many chips wrap onto more lines (instead of running off screen) and "Reset all" flows right after the last
    // chip, so it's always visible. The summary stays on the right of the first line.
    <div className="flex min-h-24 items-start gap-compact">
      {chips.length > 0 && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-compact gap-y-tight">
          <Txt className="flex h-24 items-center text-caption text-text-secondary">{`${chips.length} ${chips.length === 1 ? "filter" : "filters"} ·`}</Txt>
          {/* `contents` lets the chips wrap with the label and Reset all as one line of text; role keeps the list. */}
          <ul role="list" aria-label="Active filters" className="contents">
            {chips.map((c) => (
              <li key={c.key} title={c.label} className="motion-chip flex h-24 max-w-full min-w-0 items-center gap-micro rounded-pill bg-surface-accent py-2 pr-tight pl-[calc(var(--spacing-12)-var(--spacing-2))] text-caption text-text-accent">
                <span className="min-w-0 truncate">{c.label}</span>
                <button type="button" aria-label={`Remove filter ${c.label}`} onClick={() => update(clear[c.key])} className="flex shrink-0 cursor-pointer rounded-pill outline-none hover:text-accent-strong focus-visible:shadow-focus-ring">
                  <Icon name="x" className="size-[calc(var(--spacing-12)+var(--spacing-2))]" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={reset} className="flex h-24 shrink-0 cursor-pointer items-center text-caption-strong text-text-accent outline-none hover:underline focus-visible:underline">
            <Txt>Reset all</Txt>
          </button>
        </div>
      )}
      {!chips.length && <span className="flex-1" />}
      {summary && <Txt className="flex h-24 shrink-0 items-center text-caption text-text-secondary">{summary}</Txt>}
    </div>
  );
}

