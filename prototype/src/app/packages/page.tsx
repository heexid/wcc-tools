"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Alert, Toast, ToastRegion, type ToastTone } from "@/components/ds/Feedback";
import { Button } from "@/components/ds/Button";
import { Dialog, FormModal } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { InputField } from "@/components/ds/InputField";
import { Pagination } from "@/components/ds/Pagination";
import { SearchField } from "@/components/ds/SearchField";
import { StatusPill } from "@/components/ds/Badges";
import { Tab, TabList } from "@/components/ds/Tabs";
import { TextArea } from "@/components/ds/TextArea";
import { Txt } from "@/components/ds/Txt";
import { usePresence } from "@/components/ds/usePresence";
import { AppShell } from "@/components/shell/AppShell";
import { archivePackage, listPackages, NetworkError, restorePackage, savePackage, type PackageErrors, type PackageRow } from "@/lib/data/repo";
import { formatDate, formatIDR } from "@/lib/format";

// Figma: Package Lib 01–08 (PRD US-0, INTERACTIONS §5). Layout/List: title + "New package", toolbar
// (Active / Archived tabs · 280 search), table card (header 36, rows 62, columns 644 / 180 / 140 / 160 /
// 120 / 96, footer 52). Empty (07) and no-results (08) states live inside the table card.

const COLS = {
  package: "min-w-0 flex-1",
  price: "w-[calc(var(--spacing-64)*2+var(--spacing-48)+var(--spacing-4))]", // 180
  bookings: "w-[calc(var(--spacing-64)*2+var(--spacing-12))]", // 140
  updated: "w-[calc(var(--spacing-64)*2+var(--spacing-32))]", // 160
  status: "w-[calc(var(--spacing-64)+var(--spacing-48)+var(--spacing-8))]", // 120
  actions: "w-[calc(var(--spacing-64)+var(--spacing-32))]", // 96
};
const PAGE_SIZE = 10;

type Draft = { id?: string; name: string; price: number | null; summary?: string; description: string; bookings: number };
const EMPTY: Draft = { name: "", price: null, description: "", bookings: 0 };

function errorText(e: PackageErrors, name: string) {
  return {
    name: e.name === "duplicate" ? `A package named “${name.trim()}” already exists. Use a different name.` : e.name === "required" ? "Enter a package name." : undefined,
    price: e.price ? "Enter a price — whole Rupiah, 0 or more." : undefined,
    description: e.description ? "Max 1000 characters" : undefined,
  };
}

function PackageModal({ draft, onClose, onSaved, onArchive }: { draft: Draft | null; onClose: () => void; onSaved: (msg: string) => void; onArchive: (d: Draft) => void }) {
  const [form, setForm] = useState<Draft>(draft ?? EMPTY);
  const [errors, setErrors] = useState<PackageErrors>({});
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const editing = !!form.id;
  const msg = errorText(errors, form.name);

  const submit = async () => {
    setSaving(true);
    try {
      const r = await savePackage({ id: form.id, name: form.name, price: form.price, summary: form.summary, description: form.description });
      setFailed(false);
      if (!r.ok) {
        setErrors(r.errors);
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[role=dialog] [aria-invalid=true]")?.focus());
        return;
      }
      onSaved(editing ? "Package saved" : "Package created");
    } catch (e) {
      if (!(e instanceof NetworkError)) throw e;
      setFailed(true); // entries kept, primary becomes "Try again" (Package 06)
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal
      open={!!draft}
      onClose={onClose}
      title={editing ? "Edit package" : "New package"}
      onSubmit={submit}
      footerStart={
        editing ? (
          <Button variant="ghost" onClick={() => onArchive(form)}>
            Archive
          </Button>
        ) : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {failed ? "Try again" : editing ? "Save package" : "Create package"}
          </Button>
        </>
      }
    >
      {failed && (
        <Alert tone="danger" title="Couldn’t save the package" className="motion-notice">
          Check your connection and try again. Your changes are still here.
        </Alert>
      )}
      <InputField
        label="Package name"
        required
        placeholder="e.g. Gold Package"
        value={form.name}
        error={msg.name}
        onChange={(e) => (setForm((f) => ({ ...f, name: e.target.value })), errors.name && setErrors((x) => ({ ...x, name: undefined })))}
      />
      <InputField
        label="Price"
        required
        inputMode="numeric"
        placeholder="Rp 0"
        value={form.price === null ? "" : formatIDR(form.price)}
        helper="Whole Rupiah, ≥ 0. Existing bookings keep their snapshot price."
        error={msg.price}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "");
          setForm((f) => ({ ...f, price: digits ? Math.min(Number(digits), Number.MAX_SAFE_INTEGER) : null }));
          if (errors.price) setErrors((x) => ({ ...x, price: undefined }));
        }}
      />
      <TextArea
        label="Description"
        maxLength={1000}
        pasteOverflow="cut"
        placeholder="What the package includes, e.g. coverage hours, crew, deliverables"
        helper="Shown in the package picker and on the booking"
        value={form.description}
        error={msg.description}
        onValueChange={(v) => setForm((f) => ({ ...f, description: v }))}
      />
      {editing && form.bookings > 0 && (
        <Alert tone="info" title={`Used in ${form.bookings} bookings`}>
          Changing the price only applies to new bookings or when a booking re-selects this package.
        </Alert>
      )}
    </FormModal>
  );
}

function ArchiveDialog({ pkg, onCancel, onConfirm }: { pkg: Draft | null; onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId();
  const [shown, setShown] = useState(pkg); // keep content while the exit animation runs
  if (pkg && pkg !== shown) setShown(pkg);
  const p = pkg ?? shown;
  return (
    <Dialog open={!!pkg} onClose={onCancel} role="alertdialog" labelledBy={titleId} top="confirm" width="w-[calc(var(--spacing-64)*7-var(--spacing-8))]" initialFocus="[data-cancel]">
      <div className="flex gap-base p-group">
        <span className="flex size-[calc(var(--spacing-32)+var(--spacing-8))] shrink-0 items-center justify-center rounded-pill bg-surface-warning text-status-warning">
          <Icon name="archive" className="size-icon-md" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-tight">
          <h2 id={titleId} className="text-heading-section text-text-primary">
            Archive “{p?.name}”?
          </h2>
          <p className="text-body text-text-secondary">
            It will no longer appear when creating bookings. The {p?.bookings} bookings that use it keep their package and price. You can restore it from the Archived tab.
          </p>
        </div>
      </div>
      <footer className="flex justify-end gap-compact border-t border-border-default bg-surface-subtle px-group py-base">
        <Button variant="secondary" data-cancel onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Archive package</Button>
      </footer>
    </Dialog>
  );
}

function PackageLibrary() {
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<PackageRow[] | null>(null);
  const [counts, setCounts] = useState({ active: 0, archived: 0 });
  const [editing, setEditing] = useState<Draft | null>(null);
  const [archiving, setArchiving] = useState<Draft | null>(null);
  // Content stays while the toast animates out; only `open` flips (else an Error toast would turn Success mid-exit).
  const [toast, setToastState] = useState<{ text: string; tone: ToastTone; open: boolean } | null>(null);
  const setToast = (text: string, tone: ToastTone = "success") => setToastState({ text, tone, open: true });
  const t = usePresence(!!toast?.open);

  const load = useCallback(async () => {
    const [all, a, b] = await Promise.all([listPackages({ tab, search }), listPackages({ tab: "active" }), listPackages({ tab: "archived" })]);
    setRows(all);
    setCounts({ active: a.length, archived: b.length });
  }, [tab, search]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- data loads from the client-side mock store
  useEffect(() => void load(), [load]);
  // Package lists refresh when the tab regains focus (PRD US-0) — e.g. after editing in another tab.
  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);
  useEffect(() => {
    if (!toast?.open) return;
    const id = setTimeout(() => setToastState((v) => v && { ...v, open: false }), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const pages = Math.max(1, Math.ceil((rows?.length ?? 0) / PAGE_SIZE));
  const visible = useMemo(() => (rows ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  const toDraft = (p: PackageRow): Draft => ({ id: p.id, name: p.name, price: p.price, summary: p.summary, description: p.description, bookings: p.bookings });

  const confirmArchive = async () => {
    if (!archiving?.id) return;
    await archivePackage(archiving.id);
    setArchiving(null);
    setEditing(null);
    setToast(`“${archiving.name}” archived`);
    await load();
    // The row (and the button that opened the dialog) is gone — park focus on the page heading.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true }));
  };
  const restore = async (p: PackageRow) => {
    const r = await restorePackage(p.id);
    if (r.ok) setToast(`“${p.name}” restored`);
    else setToast(`An active package is already named “${p.name}” — rename it first`, "danger");
    void load();
  };

  const nothingAtAll = rows !== null && !search && counts.active + counts.archived === 0;
  const noMatch = rows !== null && rows.length === 0 && !!search;

  return (
    <main className="flex flex-col gap-inset px-section py-section">
      <div className="flex items-center gap-compact">
        <div className="flex flex-col gap-2">
          <h1 tabIndex={-1} className="flex text-heading-page text-text-primary outline-none">
            <Txt>Package library</Txt>
          </h1>
          <p className="text-caption text-text-secondary">Packages used when creating bookings. Price changes never alter existing bookings.</p>
        </div>
        <span className="flex-1" />
        <Button icon="plus" onClick={() => setEditing(EMPTY)}>
          New package
        </Button>
      </div>

      <div className="flex items-center gap-compact">
        <TabList label="Package status" className="flex">
          <Tab active={tab === "active"} onClick={() => (setTab("active"), setPage(1))}>
            Active ({counts.active})
          </Tab>
          <Tab active={tab === "archived"} onClick={() => (setTab("archived"), setPage(1))}>
            Archived ({counts.archived})
          </Tab>
        </TabList>
        <span className="flex-1" />
        <SearchField
          aria-label="Search package"
          placeholder="Search package"
          value={search}
          onValueChange={(v) => (setSearch(v), setPage(1))}
          className="w-[calc(var(--spacing-64)*4+var(--spacing-24))]"
        />
      </div>

      <section aria-label={tab === "active" ? "Active packages" : "Archived packages"} className="flex flex-col overflow-hidden rounded-card border border-border-default bg-surface-default">
        {nothingAtAll ? (
          <div className="flex flex-col items-center gap-base py-region">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/tile-package-lib.png" srcSet="/assets/tile-package-lib.png 1x, /assets/tile-package-lib@2x.png 2x" alt="" className="block size-[calc(var(--spacing-48)+var(--spacing-8))]" />
            <h2 className="flex text-heading-section text-text-primary">
              <Txt>No packages yet</Txt>
            </h2>
            <p className="w-[calc(var(--spacing-64)*6+var(--spacing-32)+var(--spacing-4))] text-center text-body text-text-secondary">
              Create the packages your team sells. They appear in the package picker when you add a booking, and their price is copied into each booking.
            </p>
            <Button icon="plus" onClick={() => setEditing(EMPTY)}>
              Create first package
            </Button>
          </div>
        ) : (
          <>
            <div role="row" className="flex h-table-header-height items-center bg-surface-header px-base text-caption text-text-secondary">
              <span role="columnheader" className={COLS.package}>Package</span>
              <span role="columnheader" className={COLS.price}>Price</span>
              <span role="columnheader" className={COLS.bookings}>Bookings</span>
              <span role="columnheader" className={COLS.updated}>{tab === "active" ? "Last updated" : "Archived"}</span>
              <span role="columnheader" className={COLS.status}>Status</span>
              <span role="columnheader" className={COLS.actions}>
                <span className="sr-only">Actions</span>
              </span>
            </div>
            {noMatch ? (
              <div className="flex flex-col items-center gap-base py-region">
                <Icon name="search" className="size-32 text-text-tertiary" />
                <h2 className="flex text-heading-section text-text-primary">
                  <Txt>{`No packages match “${search.trim()}”`}</Txt>
                </h2>
                <p className="w-[calc(var(--spacing-64)*6+var(--spacing-32)+var(--spacing-4))] text-center text-body text-text-secondary">Try another name, or check the Archived tab.</p>
                <Button variant="secondary" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              visible.map((p) => (
                <div key={p.id} role="row" className="flex h-table-row-height items-center border-b border-border-default px-base">
                  <div role="cell" className={`${COLS.package} flex flex-col gap-2`}>
                    <span className="text-caption-strong text-text-primary">{p.name}</span>
                    <span className="truncate text-caption text-text-secondary">{p.summary}</span>
                  </div>
                  <div role="cell" className={`${COLS.price} flex h-20 items-start`}>
                    <span className="text-body-strong text-text-primary">{formatIDR(p.price)}</span>
                  </div>
                  <div role="cell" className={`${COLS.bookings} text-caption text-text-primary`}>
                    {p.bookings} bookings
                  </div>
                  <div role="cell" className={`${COLS.updated} text-caption text-text-secondary`}>
                    {p.isActive ? formatDate(p.updatedAt) : `Archived ${formatDate(p.archivedAt!)}`}
                  </div>
                  <div role="cell" className={`${COLS.status} flex h-20 items-start`}>
                    <StatusPill tone={p.isActive ? "positive" : "neutral"}>{p.isActive ? "Active" : "Archived"}</StatusPill>
                  </div>
                  <div role="cell" className={`${COLS.actions} flex h-20 items-start justify-end gap-micro`}>
                    {p.isActive ? (
                      <>
                        <Button variant="ghost" onClick={() => setEditing(toDraft(p))} aria-label={`Edit ${p.name}`}>
                          Edit
                        </Button>
                        <Button variant="ghost" iconOnly icon="archive" aria-label={`Archive ${p.name}`} onClick={() => setArchiving(toDraft(p))} />
                      </>
                    ) : (
                      <Button variant="secondary" onClick={() => restore(p)} aria-label={`Restore ${p.name}`}>
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
            {!noMatch && (
              <div className="flex h-[calc(var(--spacing-48)+var(--spacing-4))] items-center justify-between px-base">
                <p className="text-ui-input text-text-secondary">
                  {search ? `Showing ${rows?.length ?? 0} of ${tab === "active" ? counts.active : counts.archived} ${tab} packages` : `Showing ${rows?.length ?? 0} ${tab} packages`}
                </p>
                <Pagination page={page} pages={pages} onPage={setPage} />
              </div>
            )}
          </>
        )}
      </section>

      <PackageModal
        key={editing ? (editing.id ?? "new") : "closed"}
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={(m) => (setEditing(null), setToast(m), void load())}
        onArchive={(d) => setArchiving(d)}
      />
      <ArchiveDialog pkg={archiving} onCancel={() => setArchiving(null)} onConfirm={confirmArchive} />
      {t.mounted && (
        <ToastRegion>
          <Toast presence={t.presence} tone={toast?.tone}>
            {toast?.text}
          </Toast>
        </ToastRegion>
      )}
    </main>
  );
}

export default function PackagesPage() {
  return (
    <AppShell module="packages">
      <PackageLibrary />
    </AppShell>
  );
}
