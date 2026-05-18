"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import type { Planet, SignName } from "@/components/unified/types";
import { PLANET_ORDER, DIGNITY_COLORS, TABLE_STYLES } from "@/components/unified/types";
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

const { th, td, row } = TABLE_STYLES;

export function CareerTab({
  chartOutput,
  careerOutput,
  isCareerLoading,
  onFetchCareer,
}: {
  chartOutput: Record<string, unknown>;
  careerOutput: Record<string, unknown> | null;
  isCareerLoading: boolean;
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
  const primary    = career?.primary_planets ?? [];
  const allRows    = PLANET_ORDER.filter(p => indicators[p]);

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">

      {/* ── Left column: chart + supporting context ─────────────────── */}
      <div className="shrink-0 space-y-6">
        {planets && (
          <NatalChartGrid
            planets={planets}
            lagnaSign={lagnaD10}
            signKey="d10_sign"
            label="D10 — Dashamsha"
          />
        )}

        {career && primary.length > 0 && (
          <section>
            <SectionHeading>Key Significators</SectionHeading>
            <div className="flex flex-wrap gap-2 pt-1">
              {primary.map(p => {
                const strong = indicators[p]?.d10_strong;
                return (
                  <div key={p} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-xs">
                    <span className="text-planet-name font-semibold">{p}</span>
                    {strong && (
                      <span className="text-[10px] text-dignity-exalted font-medium uppercase tracking-wide">strong in D10</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {career?.career_themes && career.career_themes.length > 0 && (
          <section>
            <SectionHeading>Career Themes</SectionHeading>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {career.career_themes.map(t => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-ink-2)] capitalize">
                  {t.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Right column: analysis data ──────────────────────────────── */}
      <div className="flex-1 space-y-8 min-w-0">

        {/* Refresh sits quietly at the top right, no heading above it */}
        <div className="flex justify-end -mt-1">
          <button
            onClick={() => onFetchCareer(true)}
            disabled={isCareerLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--color-ink-2)] transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`h-3 w-3 ${isCareerLoading ? "animate-spin" : ""}`} />
            {isCareerLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {isCareerLoading && (
          <p className="text-xs text-muted-foreground">Loading career analysis…</p>
        )}

        {career && (
          <>
            {/* 10th House */}
            {tenth && (
              <section>
                <SectionHeading>10th House — Karma Bhava</SectionHeading>
                <div className="divide-y divide-[var(--color-border)]/40">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Sign</span>
                    <span className="text-[var(--color-ink-1)] font-medium">{tenth.sign ?? "—"}</span>
                  </div>
                  {tenth.occupants && tenth.occupants.length > 0 && (
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-muted-foreground">Occupants</span>
                      <span className="text-planet-name font-medium">{tenth.occupants.join(", ")}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Lord</span>
                    <span className="text-planet-name font-medium">{tenth.lord ?? "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Lord placed in</span>
                    <span className="text-[var(--color-ink-2)]">
                      House {tenth.lord_house ?? "—"}{tenth.lord_sign ? ` · ${tenth.lord_sign}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Lord dignity</span>
                    <span className={`font-semibold capitalize ${DIGNITY_COLORS[tenth.lord_dignity ?? ""] ?? "text-dignity-neutral"}`}>
                      {tenth.lord_dignity?.replace(/_/g, " ") ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground">Lord in D10</span>
                    <span className="text-[var(--color-ink-2)]">{tenth.lord_d10 ?? "—"}</span>
                  </div>
                </div>
              </section>
            )}

            {/* D10 planetary table */}
            {allRows.length > 0 && (
              <section>
                <SectionHeading>D10 Planetary Positions</SectionHeading>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        <th className={th}>Planet</th>
                        <th className={th}>D10 Sign</th>
                        <th className={th}>D10 Lord</th>
                        <th className={`${th} text-center`}>Strong</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allRows.map(p => {
                        const ind = indicators[p];
                        const isPrimary = primary.includes(p);
                        return (
                          <tr key={p} className={row}>
                            <td className={`${td} ${isPrimary ? "text-planet-name font-semibold" : "text-[var(--color-ink-2)]"}`}>{p}</td>
                            <td className={td}>{ind?.d10_sign ?? "—"}</td>
                            <td className={`${td} text-planet-name`}>{ind?.d10_lord ?? "—"}</td>
                            <td className={`${td} text-center`}>
                              {ind?.d10_strong
                                ? <span className="text-dignity-exalted font-semibold">✓</span>
                                : <span className="text-muted-foreground/30">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Indicators */}
            {career.strength_factors && career.strength_factors.length > 0 && (
              <section>
                <SectionHeading>Indicators</SectionHeading>
                <ul className="space-y-2 pt-1">
                  {career.strength_factors.map(f => (
                    <li key={f} className="text-xs text-[var(--color-ink-3)] flex items-start gap-2">
                      <span className="text-dignity-exalted mt-0.5 shrink-0">·</span>{f}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
