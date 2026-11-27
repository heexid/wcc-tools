import type { ReactNode } from "react";
import { Icon } from "@/components/ds/Icon";
import { Txt } from "@/components/ds/Txt";
import { cn } from "@/components/ds/cn";

/** Settings card (Figma AC2 / WS1): surface/default, hairline border, radius card, pad 20/24/8/24 (16 sides on mobile).
 *  Head: title Heading/Section + caption (gap 2, pad-bottom 12) and an optional action at the end (Edit). Rows follow. */
export function SettingsCard({ title, caption, action, children, busy }: { title: string; caption: string; action?: ReactNode; children: ReactNode; busy?: boolean }) {
  return (
    <section aria-label={title} aria-busy={busy || undefined} className="flex flex-col rounded-card border border-border-default bg-surface-default px-24 pt-20 pb-8 max-tablet:px-16">
      <div className="flex items-start gap-16 pb-12">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="flex text-heading-section text-text-primary">
            <Txt>{title}</Txt>
          </h2>
          <Txt className="text-caption text-text-secondary max-tablet:w-auto! max-tablet:shrink max-tablet:whitespace-normal">{caption}</Txt>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Settings page frame shared by Account settings and Workspace settings (Figma AC2 / WS1): content 760 centred,
 *  pad 40 top / 80 bottom, gap section; mobile full width with 16 margins, gap base. */
export const SETTINGS_PAGE =
  "flex flex-1 flex-col items-center pt-[calc(var(--spacing-32)+var(--spacing-8))] pb-[calc(var(--spacing-64)+var(--spacing-16))] max-tablet:px-layout-gutter max-tablet:pt-20 max-tablet:pb-group";
export const SETTINGS_MAIN = "flex w-[calc(var(--spacing-64)*12-var(--spacing-8))] flex-col gap-section max-tablet:w-full max-tablet:gap-base";

/** Settings row (Figma AC2 / WS1): pad 16/0, top border, gap 16, centred: label 160 Body secondary · value (Body Strong
 *  + caption tertiary, gap 2, fills) · action (Secondary button) or a 16 lock when the value is set elsewhere.
 *  Below 768 the label sits above the value. `short`: the Password row's value column is 360. `wrap`: a long note wraps. */
export function SettingsRow({ label, value, note, locked, short, wrap, children }: { label: string; value: ReactNode; note: string; locked?: boolean; short?: boolean; wrap?: boolean; children?: ReactNode }) {
  return (
    <div className="flex w-full items-center gap-16 border-t border-border-default py-16 max-tablet:flex-wrap max-tablet:gap-x-12 max-tablet:gap-y-6 max-tablet:py-12">
      <span className="w-[calc(var(--spacing-64)*2+var(--spacing-32))] shrink-0 text-body text-text-secondary max-tablet:w-full">{label}</span>
      <span className={cn("flex min-w-0 flex-1 flex-col gap-2", short && "max-w-[calc(var(--spacing-64)*6-var(--spacing-24))] max-tablet:max-w-none")}>
        {typeof value === "string" ? <Txt className="text-body-strong text-text-primary max-tablet:w-auto! max-tablet:shrink max-tablet:whitespace-normal">{value}</Txt> : value}
        {wrap ? (
          <span className="text-caption text-text-tertiary">{note}</span>
        ) : (
          <Txt className="text-caption text-text-tertiary max-tablet:w-auto! max-tablet:shrink max-tablet:whitespace-normal">{note}</Txt>
        )}
      </span>
      {short && <span className="flex-1 max-tablet:hidden" />}
      {locked ? <Icon name="lock" label="Locked" className="size-icon-sm shrink-0 text-text-tertiary" /> : children}
    </div>
  );
}
