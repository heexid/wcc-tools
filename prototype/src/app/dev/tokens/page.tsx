import manifest from "@/styles/tokens.manifest.json";
import textMetrics from "../../../../public/__figma__/specs/F00-text-metrics.json";

// Token gallery — every CIR variable, text style, effect and paint, rendered from the
// generated CSS vars. Used by the F0 G2 checks (tests/visual/F00.spec.ts).
export const metadata = { title: "Tokens · dev" };

const textVar = (css: string) => ({
  fontSize: `var(${css})`,
  lineHeight: `var(${css}--line-height)`,
  fontWeight: `var(${css}--font-weight)`,
  letterSpacing: `var(${css}--letter-spacing)`,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-base">
      <h2 className="text-heading-section">{title}</h2>
      {children}
    </section>
  );
}

export default function TokensPage() {
  const colors = manifest.variables.filter((v) => v.type === "color");
  const dims = manifest.variables.filter((v) => v.type === "dimension");
  return (
    <main className="flex flex-col gap-section p-section bg-surface-subtle min-h-screen">
      <h1 className="text-heading-page">CIR tokens</h1>

      <Section title={`Colors (${colors.length})`}>
        <div className="grid grid-cols-6 gap-base">
          {colors.map((c) => (
            <div key={c.css} data-token={c.css} className="flex flex-col gap-micro rounded-card bg-surface-default p-compact shadow-card">
              <div className="h-48 rounded-control border border-border-default" style={{ background: `var(${c.css})` }} />
              <span className="text-caption-strong">{c.figma}</span>
              <span className="text-micro text-text-secondary">{c.css}</span>
              <span className="text-micro text-text-secondary">{c.alias ?? c.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Dimensions (${dims.length})`}>
        <div className="grid grid-cols-3 gap-compact">
          {dims.map((d) => (
            <div key={d.css} data-token={d.css} className="flex items-center gap-compact text-caption">
              <span className="w-[var(--spacing-template-thumb-width)] shrink-0">{d.figma}</span>
              <span className="text-text-secondary">{String(d.value)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Text styles">
        <div className="flex flex-col gap-compact">
          {manifest.text.map((t) => (
            <div key={t.css} data-token={t.css} className="flex items-baseline gap-base">
              <span className="w-[var(--spacing-template-thumb-width)] shrink-0 text-caption text-text-secondary">{t.figma}</span>
              <span style={textVar(t.css)}>The quick brown fox · Rp 1.250.000</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Text metrics vs Figma (Bookings 01)">
        <div className="flex flex-col items-start gap-compact">
          {textMetrics.specs.map((s, i) => {
            const t = manifest.text.find((x) => x.figma === s.style)!;
            return (
              <span key={i} data-metric={i} className="whitespace-nowrap" style={textVar(t.css)}>
                {s.text}
              </span>
            );
          })}
        </div>
      </Section>

      <Section title="Effects & paints">
        <div className="flex gap-group">
          {manifest.effects.map((e) => (
            <div key={e.css} data-token={e.css} className="flex h-48 w-[var(--spacing-template-thumb-width)] items-center justify-center rounded-card bg-surface-default text-caption" style={{ boxShadow: `var(${e.css})` }}>
              {e.figma}
            </div>
          ))}
          {manifest.paints.map((p) => (
            <div key={p.css} data-token={p.css} className="flex h-48 w-[var(--spacing-template-thumb-width)] items-center justify-center rounded-card text-caption" style={{ background: `var(${p.css})` }}>
              {p.figma}
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
