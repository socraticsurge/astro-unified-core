"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { PLANET_ORDER, dignityTone } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { TabSection } from "@/components/unified/TabGrid";
import { TabLoadingSkeleton } from "@/components/unified/TabLoadingSkeleton";


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

  // chartOutput retained for future D10 chart rendering
  const career     = ((careerOutput as Record<string, unknown> | null)?.data ?? careerOutput) as CareerData | null;
  const tenth      = career?.tenth_house;
  const indicators = career?.d10_indicators ?? {};
  const primary    = new Set(career?.primary_planets ?? []);
  const significators = PLANET_ORDER.filter((p) => primary.has(p) || indicators[p]?.d10_strong);

  return (
    <div className="space-y-6">

      {/* Header with refresh */}
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

      {isCareerLoading && <TabLoadingSkeleton lines={5} cards={2} />}

      {!isCareerLoading && careerError && (
        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-danger)" }}>
          <span>Couldn&apos;t load career analysis — {careerError}</span>
          <button type="button" onClick={() => onFetchCareer(true)} style={{ textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Retry</button>
        </div>
      )}

      {career && (
        <>
          {/* 1 — Key professional significators as cards */}
          <TabSection when={significators.length > 0} title="Key professional significators">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {significators.map((p) => {
                const ind = indicators[p];
                const isPrimary = primary.has(p);
                return (
                  <div key={p} className="ac-card ac-card-pad" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="planet" style={{ fontSize: 14, fontWeight: 700 }}>{p}</span>
                      {isPrimary && (
                        <span style={{ fontSize: 9, fontWeight: 600, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary</span>
                      )}
                    </div>
                    {ind?.d10_sign && (
                      <div style={{ fontSize: 11, color: "var(--color-ink-3)" }}>
                        D10 · {ind.d10_sign}
                        {ind.d10_lord ? <span style={{ color: "var(--color-ink-4)" }}> · {ind.d10_lord}</span> : null}
                      </div>
                    )}
                    {ind?.d10_strong && (
                      <span style={{ fontSize: 10, color: "var(--color-success)", fontWeight: 600 }}>Strong in D10</span>
                    )}
                  </div>
                );
              })}
            </div>
          </TabSection>

          {/* 2 — Career themes */}
          <TabSection
            when={!!career.career_themes && career.career_themes.length > 0}
            title="Career themes"
          >
            <div className="ac-pills">
              {career.career_themes?.map((t) => (
                <span key={t} className="ac-pill cool">{t.replace(/_/g, " ")}</span>
              ))}
            </div>
          </TabSection>

          {/* 3 — Astrological indicators */}
          <TabSection
            when={!!career.strength_factors && career.strength_factors.length > 0}
            title="Astrological indicators"
          >
            <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {career.strength_factors?.map((f) => (
                <li key={f} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-ink-3)" }}>
                  <span style={{ color: "var(--color-ink-4)", flexShrink: 0 }}>·</span>
                  {f}
                </li>
              ))}
            </ul>
          </TabSection>

          {/* 4 — Karma Bhava (10th house) */}
          <TabSection when={!!tenth} title="10th house — Karma Bhava">
            <div className="ac-card ac-card-pad">
              <div className="ac-kv">
                <div className="k">Sign</div><div className="v">{tenth?.sign ?? "—"}</div>
                {tenth?.occupants && tenth.occupants.length > 0 && (
                  <>
                    <div className="k">Occupants</div><div className="v cool">{tenth.occupants.join(", ")}</div>
                  </>
                )}
                <div className="k">Lord</div><div className="v cool">{tenth?.lord ?? "—"}</div>
                <div className="k">Lord placed in</div>
                <div className="v">H{tenth?.lord_house ?? "—"}{tenth?.lord_sign ? ` · ${tenth.lord_sign}` : ""}</div>
                {tenth?.lord_dignity && (
                  <>
                    <div className="k">Lord dignity</div>
                    <div className="v">
                      <span className={`ac-tag ${dignityTone(tenth.lord_dignity)}`}>
                        {tenth.lord_dignity.replace(/_/g, " ")}
                      </span>
                    </div>
                  </>
                )}
                <div className="k">Lord in D10</div><div className="v">{tenth?.lord_d10 ?? "—"}</div>
              </div>
            </div>
          </TabSection>
        </>
      )}
    </div>
  );
}
