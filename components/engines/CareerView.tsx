"use client";
import { SectionShell } from "./SectionShell";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type CareerData = {
  tenth_house?: {
    sign?: string;
    lord?: string;
    lord_house?: number;
    lord_sign?: string;
    lord_d10?: string;
    lord_dignity?: string;
    occupants?: string[];
  };
  d10_indicators?: Record<string, { d10_sign?: string; d10_lord?: string; d10_strong?: boolean }>;
  career_themes?: string[];
  primary_planets?: string[];
  strength_factors?: string[];
  d10_strong_planets?: string[];
};

type Props = {
  output: Record<string, unknown> | undefined;
  explainer: SectionExplainer | null;
};

export function CareerView({ output, explainer }: Props) {
  if (!output) {
    return (
      <SectionShell sectionInView="Career Analysis (D10 Dashamsha)" explainer={explainer} accent="text-[var(--color-accent)]">
        <p style={{ fontSize: 13, color: "var(--color-ink-3)", padding: "8px 0" }}>Career analysis data not available.</p>
      </SectionShell>
    );
  }

  const raw = (output.data ?? output) as CareerData;
  const tenth        = raw.tenth_house;
  const d10Indicators = raw.d10_indicators ?? {};
  const themes       = raw.career_themes ?? [];
  const primary      = raw.primary_planets ?? [];
  const strongD10    = raw.d10_strong_planets ?? [];
  const strengths    = raw.strength_factors ?? [];

  return (
    <SectionShell
      sectionInView="Career Analysis (D10 Dashamsha)"
      explainer={explainer}
      accent="text-[var(--color-accent)]"
      defaultOpen={true}
    >
      {/* 10th House */}
      {tenth && (
        <div className="ac-card ac-card-pad" style={{ marginBottom: 16, borderColor: "var(--color-accent-dim)", background: "var(--color-accent-faint)" }}>
          <div className="ac-eyebrow" style={{ marginBottom: 10 }}>10th House — Karma Bhava</div>
          <div className="ac-kv">
            <div className="k">Sign</div><div className="v">{tenth.sign ?? "—"}</div>
            <div className="k">Lord</div><div className="v cool">{tenth.lord ?? "—"}</div>
            {tenth.lord_house && (<>
              <div className="k">Lord placement</div>
              <div className="v">H{tenth.lord_house} · {tenth.lord_sign}{tenth.lord_dignity ? ` — ${tenth.lord_dignity.replace(/_/g," ")}` : ""}</div>
            </>)}
            {tenth.lord_d10 && (<>
              <div className="k">Lord in D10</div><div className="v">{tenth.lord_d10}</div>
            </>)}
          </div>
        </div>
      )}

      {/* Career Themes */}
      {themes.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Suggested Career Themes</div>
          <div className="ac-pills">
            {themes.map((t, i) => (
              <span key={i} className="ac-pill cool">{t.replace(/_/g, " ")}</span>
            ))}
          </div>
        </div>
      )}

      {/* Key Significators */}
      {(primary.length > 0 || strongD10.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Key Professional Significators</div>
          <div className="ac-pills">
            {Array.from(new Set([...primary, ...strongD10])).map((p, i) => (
              <span key={i} className="ac-tag cool" style={{ display: "inline-flex", flexDirection: "column", gap: 2, alignItems: "flex-start", padding: "4px 10px" }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{p}</span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>
                  {primary.includes(p) && "Primary"}
                  {primary.includes(p) && strongD10.includes(p) && " · "}
                  {strongD10.includes(p) && "Strong D10"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Strength Factors */}
      {strengths.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Astrological Indicators</div>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {strengths.map((s, i) => (
              <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--color-ink-2)" }}>
                <span style={{ color: "var(--color-accent)", flexShrink: 0 }}>→</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* D10 Details (collapsible) */}
      {Object.keys(d10Indicators).length > 0 && (
        <details className="ac-card" style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer", padding: "8px 14px", fontSize: 11, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            View D10 Planetary Details
          </summary>
          <div style={{ padding: "0 0 4px" }} className="overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>{["Planet","D10 Sign","D10 Lord","Strong"].map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(d10Indicators).map(([planet, d]) => (
                  <tr key={planet}>
                    <td className="planet">{planet}</td>
                    <td>{d.d10_sign ?? "—"}</td>
                    <td className="planet">{d.d10_lord ?? "—"}</td>
                    <td>{d.d10_strong ? <span style={{ color: "var(--color-success)" }}>Yes</span> : <span className="ac-dash">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Raw Data */}
      <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 10, color: "var(--color-ink-4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            View Raw Career Data
          </summary>
          <pre style={{ marginTop: 12, padding: 12, borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-ink-3)", overflowX: "auto", whiteSpace: "pre-wrap", background: "var(--color-surface-sunk)" }}>
            {JSON.stringify(output, null, 2)}
          </pre>
        </details>
      </div>
    </SectionShell>
  );
}
