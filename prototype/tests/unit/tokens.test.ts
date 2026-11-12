import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../src/styles/tokens.manifest.json";
import figma from "../../tokens/figma.tokens.json";

const css = readFileSync(join(__dirname, "../../src/styles/tokens.css"), "utf8");

describe("F0 · token generation", () => {
  it("emits one CSS var per Figma variable, with unique names", () => {
    const count = (function walk(n: Record<string, unknown>): number {
      if ("$value" in n) return 1;
      return Object.entries(n).filter(([k]) => !k.startsWith("$")).reduce((s, [, v]) => s + walk(v as Record<string, unknown>), 0);
    })(figma as Record<string, unknown>);
    expect(manifest.variables).toHaveLength(count);
    expect(new Set(manifest.variables.map((v) => v.css)).size).toBe(count);
    for (const v of manifest.variables) expect(css).toContain(`${v.css}:`);
  });

  it("keeps semantic tokens as aliases of primitives (not copied values)", () => {
    const surface = manifest.variables.find((v) => v.css === "--color-surface-default")!;
    expect(surface.alias).toBe("--color-neutral-0");
    expect(css).toContain("--color-surface-default: var(--color-neutral-0);");
  });

  it("clears Tailwind's default theme so only CIR tokens exist", () => {
    expect(css).toMatch(/@theme static \{\n\s+--\*: initial;/);
  });

  it("emits all 20 text styles, 5 effects and 3 paints", () => {
    expect(manifest.text).toHaveLength(20);
    expect(manifest.effects).toHaveLength(5);
    expect(manifest.paints).toHaveLength(3);
    for (const t of manifest.text) expect(css).toContain(`${t.css}--line-height: ${t.lineHeight}px;`);
  });
});
