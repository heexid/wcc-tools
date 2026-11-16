"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ds/Button";
import { Dialog } from "@/components/ds/Dialog";
import { Icon } from "@/components/ds/Icon";
import { InputField } from "@/components/ds/InputField";
import { TextArea } from "@/components/ds/TextArea";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";
import { BUSINESS_HELPER, LOGO_ACCEPT, maskPhone, readLogo, validateBusiness, type BusinessErrors } from "@/lib/booking/business";
import { LIMITS } from "@/lib/booking/calc";
import { updateBusiness } from "@/lib/data/repo";
import type { Business } from "@/lib/data/types";
import { initials } from "@/lib/format";

// Account settings → "Business information" (PRD US-14, INTERACTIONS 6.11–6.12; Figma Launchpad & Profile → AC8–AC10, lane E).

/** Logo tile [Size=56 | 38]: the uploaded image (contained, hairline border, radius control) or, with no logo, the
 *  business-name initials on the brand avatar fill. */
export function BusinessLogo({ business, size = 56 }: { business: Business; size?: 56 | 38 }) {
  const dim = size === 56 ? "size-[calc(var(--spacing-64)-var(--spacing-8))]" : "size-[calc(var(--spacing-32)+var(--spacing-6))]";
  if (business.logo)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={business.logo} alt="" className={cn("shrink-0 rounded-control border border-border-default bg-surface-default object-contain", dim)} />;
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-pill bg-brand-avatar text-text-on-accent select-none", dim, size === 56 ? "text-heading-section" : "text-ui-avatar")}>
      <Txt>{initials(business.name)}</Txt>
    </span>
  );
}

/** Card body rows (label 160 · value · nothing at the end — the Edit button sits in the card head). */
export function BusinessRows({ business }: { business: Business }) {
  return (
    <>
      <Row label="Logo">
        <span className="flex items-center gap-control">
          <BusinessLogo business={business} />
          <Txt className="text-caption text-text-tertiary">{business.logo ? "Shown in the invoice PDF header." : "No logo — the PDF shows your initials."}</Txt>
        </span>
      </Row>
      <Row label="Business name">
        <Txt className="text-body-strong text-text-primary">{business.name}</Txt>
      </Row>
      <Row label="Address">
        <span className="whitespace-pre-line text-body-strong text-text-primary">{business.address}</span>
      </Row>
      <Row label="Email">
        <Txt className="text-body-strong text-text-primary">{business.email}</Txt>
      </Row>
      <Row label="Phone">
        <Txt className="text-body-strong text-text-primary">{business.phone}</Txt>
      </Row>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-16 border-t border-border-default py-16">
      <span className="w-[calc(var(--spacing-64)*2+var(--spacing-32))] shrink-0 text-body text-text-secondary">{label}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">{children}</span>
    </div>
  );
}

/** Logo upload field: UI/Field Label "Business logo" · row (gap control): 56 logo tile · column (gap tight): Secondary
 *  "Upload logo" (arrow-up) or "Replace logo" + ghost "Remove" · helper Caption / error Caption danger. */
function LogoField({ draft, error, onChange, onError }: { draft: Business; error?: string; onChange: (logo: string | null) => void; onError: (m: string) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    const r = await readLogo(file);
    setBusy(false);
    if (input.current) input.current.value = ""; // the same file can be picked again
    if (r.ok) onChange(r.dataUrl);
    else onError(r.error);
  };
  return (
    <div role="group" aria-labelledby={id} className="flex w-full flex-col gap-tight">
      <span id={id} className="flex text-ui-field-label text-text-secondary">
        <Txt>Business logo</Txt>
      </span>
      <div className="flex items-center gap-control">
        <BusinessLogo business={draft} />
        <div className="flex flex-col gap-micro">
          <div className="flex items-center gap-tight">
            <Button type="button" variant="secondary" icon="arrow-up" loading={busy} onClick={() => input.current?.click()}>
              {draft.logo ? "Replace logo" : "Upload logo"}
            </Button>
            {draft.logo && (
              <Button type="button" variant="ghost" onClick={() => onChange(null)}>
                Remove
              </Button>
            )}
          </div>
          <p className={cn("text-caption", error ? "text-text-danger" : "text-text-secondary")} role={error ? "alert" : undefined}>
            {error ?? BUSINESS_HELPER.logo}
          </p>
        </div>
      </div>
      <input ref={input} type="file" accept={LOGO_ACCEPT} aria-label="Logo file" tabIndex={-1} className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
    </div>
  );
}

/**
 * Edit business information modal — the DS Modal like Payment instruction (640 wide, surface/header, header × · divider ·
 * Heading/Module title; body surface/default, pad group/group/section/group, gap base; footer Cancel · Save changes).
 * Opens prefilled with the saved business; Cancel / Esc / × drop the draft. Save validates everything, shows the errors
 * inline and keeps the modal open; on success it closes and the page shows the toast "Business information updated".
 */
export function BusinessModal({ open, value, onClose, onSaved }: { open: boolean; value: Business; onClose: () => void; onSaved: (b: Business) => void }) {
  const titleId = useId();
  const [draft, setDraft] = useState<Business>(value);
  const [errors, setErrors] = useState<BusinessErrors>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(value);
      setErrors({});
      setTried(false);
    }
  }
  const set = (k: keyof Business, v: string | null) => {
    const next = { ...draft, [k]: v };
    setDraft(next);
    if (tried) setErrors((e) => ({ ...validateBusiness(next), logo: e.logo && k !== "logo" ? e.logo : undefined })); // errors clear as fields are fixed
  };
  const save = async () => {
    const e = validateBusiness(draft);
    setTried(true);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const r = await updateBusiness(draft).catch(() => null);
    setBusy(false);
    if (!r) return setErrors({ name: "Couldn’t save. Check your connection and try again." });
    if (!r.ok) return setErrors(r.errors);
    onSaved(r.business);
  };
  return (
    <Dialog open={open} onClose={onClose} locked={busy} labelledBy={titleId} width="w-[calc(var(--spacing-64)*10)]" className="bg-surface-header" initialFocus="[data-business-modal] input[type=text]">
      <form
        data-business-modal
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col"
      >
        <header className="flex items-center gap-control px-group py-base">
          <button type="button" aria-label="Close" data-close disabled={busy} onClick={onClose} className="flex cursor-pointer rounded-small text-text-primary outline-none focus-visible:shadow-focus-ring">
            <Icon name="x" className="size-icon-md" />
          </button>
          <span aria-hidden className="h-20 w-px bg-border-default" />
          <h2 id={titleId} className="flex text-heading-module text-text-primary">
            <Txt>Business information</Txt>
          </h2>
        </header>
        <div className="flex flex-col gap-base rounded-t-card border border-border-default bg-surface-default px-group pt-group pb-section">
          <LogoField draft={draft} error={errors.logo} onChange={(l) => set("logo", l)} onError={(m) => setErrors((e) => ({ ...e, logo: m }))} />
          <InputField label="Business name" required type="text" value={draft.name} onChange={(e) => set("name", e.target.value)} error={errors.name} helper={BUSINESS_HELPER.name} />
          <TextArea label={<>Address<span aria-hidden className="ml-micro text-text-danger">*</span></>} maxLength={LIMITS.businessAddressMax} value={draft.address} onValueChange={(v) => set("address", v)} error={errors.address} placeholder="Street, city" />
          <InputField label="Email" required type="email" inputMode="email" autoComplete="off" value={draft.email} onChange={(e) => set("email", e.target.value)} error={errors.email} helper={BUSINESS_HELPER.email} />
          <InputField label="Phone number" required type="tel" inputMode="tel" autoComplete="off" value={draft.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} error={errors.phone} helper={BUSINESS_HELPER.phone} />
        </div>
        <footer className="flex justify-end gap-tight border-t border-border-default bg-surface-default px-group py-base">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Save changes
          </Button>
        </footer>
      </form>
    </Dialog>
  );
}
