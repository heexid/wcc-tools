import { Icon } from "./Icon";
import { Txt } from "./Txt";
import { cn } from "./cn";

// Figma: Password rules › Rule (Change password, Reset password RP1/RP2). Row: 14 icon · Caption, gap 6.
// Met: circle-check status/positive + text/secondary · unmet: circle-x text/tertiary + text/tertiary.
// Motion (better-motion, contextual icon swap): both icons stay in the DOM on one grid cell and cross-fade
// (.motion-icon-swap) — a rule flips a few times per password, so it's an infrequent state change; the colour of
// the label is the static cue, the "(met)" text the screen-reader one.

const cell = "col-start-1 row-start-1 motion-icon-swap";
const icon = "size-[calc(var(--spacing-12)+var(--spacing-2))]";

/** One password rule (`<li>`); put inside a `<ul aria-label="Password rules">`. */
export function PasswordRule({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className="flex items-center gap-6">
      <span aria-hidden className="grid shrink-0">
        <span data-on={ok || undefined} className={cell}>
          <Icon name="circle-check" className={cn(icon, "text-status-positive")} />
        </span>
        <span data-on={!ok || undefined} className={cell}>
          <Icon name="circle-x" className={cn(icon, "text-text-tertiary")} />
        </span>
      </span>
      <Txt className={cn("text-caption transition-colors duration-(--dur-hover) ease-(--ease-hover)", ok ? "text-text-secondary" : "text-text-tertiary")}>
        {children}
      </Txt>
      <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
    </li>
  );
}
