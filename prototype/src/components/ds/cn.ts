import { extendTailwindMerge } from "tailwind-merge";
import manifest from "@/styles/tokens.manifest.json";

// tailwind-merge needs the CIR theme names, otherwise it can't tell `text-body` (font size)
// from `text-text-primary` (colour), or know that `w-control-height` is a width.
const strip = (css: string, prefix: string) => css.replace(`--${prefix}-`, "");
const names = (prefix: string) => manifest.variables.filter((v) => v.css.startsWith(`--${prefix}-`)).map((v) => strip(v.css, prefix));

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: names("color"),
      spacing: names("spacing"),
      radius: names("radius"),
      text: manifest.text.map((t) => strip(t.css, "text")),
      shadow: manifest.effects.filter((e) => e.css.startsWith("--shadow-")).map((e) => strip(e.css, "shadow")),
      "inset-shadow": manifest.effects.filter((e) => e.css.startsWith("--inset-shadow-")).map((e) => strip(e.css, "inset-shadow")),
    },
  },
});

/** Joins class names; later classes win over conflicting earlier ones (caller overrides component defaults). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(" "));
}

/** Gallery-only: force a visual state (hover / pressed / focus) so /dev/components can render every Figma variant. */
export type ForceState = "hover" | "pressed" | "focus";
