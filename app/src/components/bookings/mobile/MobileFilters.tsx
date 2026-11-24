"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ds/BottomSheet";
import { Button } from "@/components/ds/Button";
import { Avatar } from "@/components/ds/Feedback";
import { Icon } from "@/components/ds/Icon";
import { SelectField } from "@/components/ds/InputField";
import { SearchField } from "@/components/ds/SearchField";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { CrewChip } from "@/components/ds/Editor";
import { DATE_PRESETS, rangeChip, rangeLabel, toQuery, type BookingFilters, type DatePreset } from "@/lib/booking/filters";
import { listBookings } from "@/lib/data/repo";
import { crewOptions } from "@/lib/booking/crew";
import { useMyId } from "@/lib/role";
import type { Crew, Package } from "@/lib/data/types";
import { initials, type ISODate } from "@/lib/format";

// Figma: Bookings › Booking · Mobile (390) › M02 · Bookings — Filters sheet. Date, crew and package move into a sheet
// (status stays as chips on the page). Fields: Booking date (Select), Crew (chips), Package (Select). Reset all /
// "Show n bookings" (44, equal). Tapping a field opens a picker sheet over it (option rows 44, check on the right;
// crew is searchable and multi-select). Custom date ranges stay on desktop (the presets cover the phone use case).

type Draft = Pick<BookingFilters, "range" | "from" | "to" | "crew" | "pkg">;

export function MobileFiltersSheet({
  open,
  onClose,
  filters,
  update,
  today,
  crew,
  packages,
  view,
}: {
  open: boolean;
  onClose: () => void;
  filters: BookingFilters;
  update: (p: Partial<BookingFilters>) => void;
  today: ISODate;
  crew: Crew[];
  packages: Package[];
  view: "calendar" | "table";
}) {
  const myId = useMyId();
  const [draft, setDraft] = useState<Draft>(() => pick(filters));
  const [picker, setPicker] = useState<"date" | "crew" | "pkg" | null>(null);
  const [count, setCount] = useState<number | null>(null);
  // Re-seed from the page's filters each time the sheet opens (an unapplied draft is discarded on close).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(pick(filters));
  }
  // Live result count for the apply button.
  useEffect(() => {
    if (!open) return;
    let live = true;
    void listBookings({ ...toQuery({ ...filters, ...draft }, today, view), page: 1, pageSize: 10 }).then((r) => live && setCount(r.total), () => {});
    return () => {
      live = false;
    };
  }, [open, draft, filters, today, view]);

  const pickedCrew = draft.crew.map((id) => crew.find((c) => c.id === id)).filter((c): c is Crew => !!c);
  const pkgLabel = !draft.pkg.length ? "All packages" : draft.pkg.length === 1 ? (packages.find((p) => p.id === draft.pkg[0])?.name ?? "1 package") : `${draft.pkg.length} packages`;

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="Filters">
        {view === "table" && (
          <SelectField label="Booking date" value={dateValue(draft, today)} onClick={() => setPicker("date")} expanded={picker === "date"} />
        )}
        <div className="flex w-full flex-col gap-tight">
          <span className="text-caption text-text-secondary">Crew</span>
          <button
            type="button"
            onClick={() => setPicker("crew")}
            aria-label={pickedCrew.length ? `Crew: ${pickedCrew.map((c) => c.name).join(", ")}. Change crew` : "Crew: all crew. Choose crew"}
            className="flex min-h-input-height w-full cursor-pointer items-center gap-tight rounded-control border border-border-default bg-surface-default px-compact py-micro text-left outline-none focus-visible:border-border-accent focus-visible:shadow-focus-ring"
          >
            <span className="flex min-w-0 flex-1 flex-wrap gap-tight">
              {pickedCrew.map((c) => (
                <CrewChip key={c.id} name={c.name} initials={initials(c.name)} />
              ))}
              {!pickedCrew.length && <span className="text-ui-input text-text-placeholder">All crew</span>}
            </span>
            <Icon name="chevron-down" className="size-icon-sm text-text-secondary" />
          </button>
          {!!pickedCrew.length && <Txt className="text-caption text-text-secondary">{pickedCrew.length} crew assigned</Txt>}
        </div>
        <SelectField label="Package" value={pkgLabel} onClick={() => setPicker("pkg")} expanded={picker === "pkg"} />
        <div className="flex gap-compact pt-8 *:flex-1">
          <Button variant="secondary" onClick={() => setDraft({ range: null, from: null, to: null, crew: [], pkg: [] })}>
            Reset all
          </Button>
          <Button
            onClick={() => {
              update(draft);
              onClose();
            }}
          >
            {count === null ? "Show bookings" : `Show ${count} ${count === 1 ? "booking" : "bookings"}`}
          </Button>
        </div>
      </BottomSheet>

      <PickerSheet
        open={picker === "date"}
        onClose={() => setPicker(null)}
        title="Booking date"
        options={[{ value: "", label: "All dates" }, ...DATE_PRESETS.filter((d) => d.value !== "custom")]}
        selected={[draft.range ?? ""]}
        onPick={(v) => {
          setDraft((d) => ({ ...d, range: (v || null) as DatePreset | null, from: null, to: null }));
          setPicker(null);
        }}
      />
      <PickerSheet
        open={picker === "crew"}
        onClose={() => setPicker(null)}
        title="Crew"
        multiple
        search="Search crew by name or role"
        options={crewOptions(crew, draft.crew, myId).map((c) => ({ value: c.id, label: c.label, sub: c.role, avatar: initials(c.name) }))}
        selected={draft.crew}
        onPick={(v) => setDraft((d) => ({ ...d, crew: d.crew.includes(v) ? d.crew.filter((x) => x !== v) : [...d.crew, v] }))}
      />
      <PickerSheet
        open={picker === "pkg"}
        onClose={() => setPicker(null)}
        title="Package"
        multiple
        options={packages.map((p) => ({ value: p.id, label: p.name }))}
        selected={draft.pkg}
        onPick={(v) => setDraft((d) => ({ ...d, pkg: d.pkg.includes(v) ? d.pkg.filter((x) => x !== v) : [...d.pkg, v] }))}
      />
    </>
  );
}

/** "This month · Nov 2026" (Figma M02) — month presets name the month too; the rest as on desktop. */
const dateValue = (d: Draft, today: ISODate) =>
  d.range === "this-month" || d.range === "last-month" ? `${rangeLabel(d)} · ${rangeChip(d, today)}` : rangeLabel(d);

const pick = (f: BookingFilters): Draft => ({ range: f.range === "custom" ? null : f.range, from: null, to: null, crew: f.crew, pkg: f.pkg });

/** Option list in a sheet (mobile replacement for a desktop dropdown / listbox). Rows 44 (control-height): optional
 *  avatar · label (+ sub) · check (text/accent) when selected. Multi-select stays open with a Done button. */
export function PickerSheet({
  open,
  onClose,
  title,
  options,
  selected,
  onPick,
  multiple,
  search,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: { value: string; label: string; sub?: string; avatar?: string }[];
  selected: string[];
  onPick: (value: string) => void;
  multiple?: boolean;
  search?: string;
}) {
  const [q, setQ] = useState("");
  const shown = options.filter((o) => `${o.label} ${o.sub ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      initialFocus={search ? "input" : "[aria-selected=true], [role=option]"}
      actions={
        multiple ? (
          <Button onClick={onClose} className="h-control-height">
            Done
          </Button>
        ) : undefined
      }
    >
      {search && <SearchField value={q} onValueChange={setQ} placeholder={search} aria-label={search} />}
      <ul role="listbox" aria-label={title} aria-multiselectable={multiple || undefined} className="flex flex-col gap-2">
        {shown.map((o) => {
          const on = selected.includes(o.value);
          return (
            <li key={o.value || "all"} role="option" aria-selected={on} tabIndex={0} onClick={() => onPick(o.value)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(o.value))} className={cn("flex min-h-control-height cursor-pointer items-center gap-control rounded-control px-compact outline-none transition-[background-color] duration-(--dur-hover) ease-(--ease-hover) focus-visible:shadow-focus-ring", on ? "bg-surface-accent" : "active:bg-surface-subtle")}>
              {o.avatar && <Avatar initials={o.avatar} />}
              <span className="flex min-w-0 flex-1 flex-col">
                <Txt className="truncate text-body text-text-primary">{o.label}</Txt>
                {o.sub && <Txt className="truncate text-caption text-text-secondary">{o.sub}</Txt>}
              </span>
              {on && <Icon name="check" className="size-icon-md shrink-0 text-text-accent" />}
            </li>
          );
        })}
        {!shown.length && <li className="p-compact text-caption text-text-tertiary">No match for “{q}”</li>}
      </ul>
    </BottomSheet>
  );
}
