// CIR tokens for the invoice PDF (F15). @react-pdf can't read CSS variables, so the PDF reads the same Figma
// variables / text styles from the generated manifest (npm run tokens) — no raw colours or sizes live in PDF code.
// The PDF is laid out in Figma px (A4 at 96 dpi = 794 × 1123, Bookings 11) and converted to PDF points (× 0.75).
import manifest from "@/styles/tokens.manifest.json";

type Variable = { figma: string; value: string | number };
type TextStyle = { figma: string; fontSize: number; lineHeight: number; fontWeight: number; letterSpacing: number };

const vars = manifest.variables as Variable[];
const texts = manifest.text as TextStyle[];

/** Figma px → PDF points. */
export const pt = (px: number) => px * 0.75;

function variable(path: string): string | number {
  const v = vars.find((x) => x.figma === `semantic/${path}` || x.figma === `primitives/${path}` || x.figma === path);
  if (!v) throw new Error(`pdf tokens: no variable "${path}"`);
  return v.value;
}

/** Colour by Figma semantic path, e.g. color("text/primary"). */
export const color = (path: string) => variable(path) as string;
/** Spacing in points by Figma path, e.g. space("region") → semantic/space/region. */
export const space = (name: string) => pt(variable(`space/${name}`) as number);
/** Radius in points, e.g. radius("control"). */
export const radius = (name: string) => pt(variable(`radius/${name}`) as number);

// react-pdf sets glyphs higher in the line box than Figma (measured against Bookings 11b at 96 dpi): 2 px for the
// 1.4–1.7 line-height styles, 1 px for Display/Metric (1.29), none for the centred avatar initials. Shifted back
// with a relative `top`, so line boxes — and therefore layout — stay exactly Figma's.
const BASELINE_FIX: Record<string, number> = { "Display/Metric": 1, "UI/Avatar": 0 };

/** Text style by Figma name ("Text/Body Strong", "Display/Metric") → react-pdf style (points). */
export function text(name: string) {
  const t = texts.find((x) => x.figma === name);
  if (!t) throw new Error(`pdf tokens: no text style "${name}"`);
  return {
    fontFamily: "Inter",
    fontSize: pt(t.fontSize),
    lineHeight: t.lineHeight / t.fontSize,
    fontWeight: t.fontWeight,
    letterSpacing: pt(t.letterSpacing),
    position: "relative" as const,
    top: pt(BASELINE_FIX[name] ?? 2),
  };
}
