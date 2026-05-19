"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import type { Planet, SignName } from "@/components/unified/types";
import { PLANET_ORDER, dignityTone } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";

type TenthHouse = {
  sign?: string;
  lord?: string;
  lord_house?: number;
  lord_sign?: string;
  lord_d10?: string;
  lord_dignity?: string;
  occupants?: string[];
};

type D10Indicator = {
  d10_sign?: string;
  d10_lord?: string;
  d10_strong?: boolean;
};

type CareerData = {
  tenth_house?: TenthHouse;
  d10_indicators?: Record<string, D10Indicator>;
  career_themes?: string[];
  primary_planets?: string[];
  strength_factors?: string[];
  d10_strong_planets?: string[];
};

export function CareerTab({
  chartOutput,
  careerOutput,
  isCareerLoading,
  careerError,
  onFetchCareer,
}: {
  chartOutput: Record<string, unknown>;
  careerOutput: Record<string, unknown> | null;
  isCareerLoading: boolean;
  careerError?: string | null;
  onFetchCareer: (force?: boolean) => void;
}) {
  useEffect(() => {
    if (!careerOutput && !isCareerLoading) onFetchCareer();
  }, [careerOutput, isCareerLoading, onFetchCareer]);

  const chartData = chartOutput?.data as Record<string, unknown> | undefined;
  const planets   = chartData?.planets as Record<string, Planet> | undefined;
  const lagna     = chartData?.lagna   as Record<string, unknown> | undefined;
  const lagnaD10  = lagna?.d10_sign as SignName | undefined;

  const career     = ((careerOutput as Record<string, unknown> | null)?.data ?? careerOutput) as CareerData | null;
  const tenth      = career?.tenth_house;
  const indicators = career?.d10_indicators ?? {};
  const primary    = new Set(career?.primary_planets ?? []);
  const significators = PLANET_ORDER.filter(p => primary.has(p) || indicators[p]?.d10_strong);

  return (
    <div className="space-y-8 max-w-2xl">

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeading>Career Analysis</SectionHeading>
        <button
          type="button"
          onClick={() => onFetchCareer(true)}
          disabled={isCareerLoading}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "var(--color-ink-3)",
            background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
          }}
        >
          <RefreshCw style={{ width: 11, height: 11, animation: isCareerLoading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {isCareerLoading && (
        <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>Loading career analysis…</p>
      )}

      {!isCareerLoading && careerError && (
        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-danger)" }}>
          <span>Couldn&apos;t load career analysis — {careerError}</span>
          <button type="button" onClick={() => onFetchCareer(true)} style={{ textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Retry</button>
        </div>
      )}

      {career && (
        <>
          {/* Key Professional Significators */}
          {significators.length > 0 && (
            <section>
              <SectionHeading>Key Professional Significators</SectionHeading>
              <div className="ac-card overflow-x-auto">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Planet</th>
                      <th className="right">Primary</th>
                      <th>D10 Sign</th>
                      <th>D10 Lord</th>
                      <th className="right">Strong in D10</th>
                    </tr>
                  </thead>
                  <tbody>
                    {significators.map(p => {
                      const ind = indicators[p];
                      const isPrimary = primary.has(p);
                      return (
                        <tr key={p}>
                          <td className="planet">{p}</td>
                          <td className="right">
                            {isPrimary
                              ? <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>✓</span>
                              : <span className="ac-dash">—</span>}
                          </td>
                          <td>{ind?.d10_sign ?? "—"}</td>
                          <td className="planet">{ind?.d10_lord ?? "—"}</td>
                          <td className="right">
                            {ind?.d10_strong
                              ? <span style={{ color: "var(--color-success)", fontWeight: 600 }}>✓</span>
                              : <span className="ac-dash">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Career Themes */}
          {career.career_themes && career.career_themes.length > 0 && (
            <section>
              <SectionHeading>Career Themes</SectionHeading>
              <div className="ac-pills">
                {career.career_themes.map(t => (
                  <span key={t} className="ac-pill cool">{t.replace(/_/g, " ")}</span>
                ))}
              </div>
            </section>
          )}

          {/* 10th House */}
          {tenth && (
            <section>
              <SectionHeading>10th House — Karma Bhava</SectionHeading>
              <div className="ac-card ac-card-pad">
                <div className="ac-kv">
                  <div><span className="k">Sign</span><span className="v">{tenth.sign ?? "—"}</span></div>
                  {tenth.occupants && tenth.occupants.length > 0 && (
                    <div><span className="k">Occupants</span><span className="v cool">{tenth.occupants.join(", ")}</span></div>
                  )}
                  <div><span className="k">Lord</span><span className="v cool">{tenth.lord ?? "—"}</span></div>
                  <div>
                    <span className="k">Lord placed in</span>
                    <span className="v">H{tenth.lord_house ?? "—"}{tenth.lord_sign ? ` · ${tenth.lord_sign}` : ""}</span>
                  </div>
                  {tenth.lord_dignity && (
                    <div>
                      <span className="k">Lord dignity</span>
                      <span className={`ac-tag ${dignityTone(tenth.lord_dignity)}`} style={{ marginLeft: 0 }}>
                        {tenth.lord_dignity.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                  <div><span className="k">Lord in D10</span><span className="v">{tenth.lord_d10 ?? "—"}</span></div>
                </div>
              </div>
            </section>
          )}

          {/* D10 Chart */}
          {planets && (
            <section>
              <SectionHeading>D10 — Dashamsha</SectionHeading>
              <NatalChartGrid planets={planets} lagnaSign={lagnaD10} signKey="d10_sign" label="" />
            </section>
          )}

          {/* Indicators */}
          {career.strength_factors && career.strength_factors.length > 0 && (
            <section>
              <SectionHeading>Astrological Indicators</SectionHeading>
              <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {career.strength_factors.map(f => (
                  <li key={f} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-ink-3)" }}>
                    <span style={{ color: "var(--color-ink-4)", flexShrink: 0 }}>·</span>{f}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
