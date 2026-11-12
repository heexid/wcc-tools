import { expect, type Page, test } from "@playwright/test";

// G2 — measurements. A spec lists Figma node values (exported via figma_execute into
// public/__figma__/specs/<slice>.json); each is compared with the browser's box + computed style.
export type NodeSpec = {
  name: string; // Figma layer path, for messages
  selector: string; // CSS selector in the app
  box?: { x?: number; y?: number; w?: number; h?: number }; // relative to `root`
  style?: Record<string, string>; // computed style props that must match exactly (e.g. "font-size": "14px")
};

export const G2 = { boxTolerance: 0, textTolerance: 0.5 };

export async function measure(page: Page, selector: string, root?: string) {
  return page.evaluate(
    ([sel, rootSel]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const o = rootSel ? document.querySelector(rootSel)!.getBoundingClientRect() : { x: 0, y: 0 };
      return { x: r.x - o.x, y: r.y - o.y, w: r.width, h: r.height };
    },
    [selector, root ?? ""] as const,
  );
}

export async function computed(page: Page, selector: string, props: string[]) {
  return page.evaluate(
    ([sel, ps]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p).trim()]));
    },
    [selector, props] as const,
  );
}

/** Collects every mismatch, then fails once with the full list (G2 = 0 mismatches). */
export async function expectMatchesSpec(page: Page, specs: NodeSpec[], opts: { root?: string; tolerance?: number } = {}) {
  const tol = opts.tolerance ?? G2.boxTolerance;
  const misses: string[] = [];
  for (const s of specs) {
    if (s.box) {
      const b = await measure(page, s.selector, opts.root);
      if (!b) { misses.push(`${s.name}: ${s.selector} not found`); continue; }
      for (const k of ["x", "y", "w", "h"] as const) {
        const want = s.box[k];
        if (want !== undefined && Math.abs(b[k] - want) > tol) misses.push(`${s.name}.${k}: ${b[k].toFixed(2)} ≠ Figma ${want}`);
      }
    }
    if (s.style) {
      const c = await computed(page, s.selector, Object.keys(s.style));
      if (!c) { misses.push(`${s.name}: ${s.selector} not found`); continue; }
      for (const [k, want] of Object.entries(s.style)) if (c[k] !== want) misses.push(`${s.name}.${k}: ${c[k]} ≠ Figma ${want}`);
    }
  }
  test.info().annotations.push({ type: "G2", description: `${specs.length} nodes, ${misses.length} mismatches` });
  expect(misses, misses.join("\n")).toEqual([]);
}
