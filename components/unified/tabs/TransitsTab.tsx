"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { PLANET_ORDER } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { TabLoadingSkeleton } from "@/components/unified/TabLoadingSkeleton";

// PR-8: per user direction — Transits should render as a chart (D1-style) with
// the transiting planet positions placed on the natal SAV-bindu lattice, not
// as a wide planet-attribute table. The classical professional reading is
// "Saturn transiting Pisces, which has 24 natal bindus" — chart + bindus give
// that at a glance. We keep a compact detail strip below for retrograde
// indicators and house-from-lagna / house-from-moon callouts.

export function TransitsTab({
  chartOutput,
  transitOutput,
  isTransitLoading,
  transitError,
  onFetchTransit,
}: {
  chartOutput: Record<string, unknown> | null;
  transitOutput: Record<string, unknown> | null;
  isTransitLoading: boolean;
  transitError?: string | null;
  onFetchTransit: (force?: boolean) => void;
}) {
  useEffect(() => {
    if (!transitOutput && !isTransitLoading) onFetchTransit();
  }, [transitOutput, isTransitLoading, onFetchTransit]);

  const transit = ((transitOutput as Record<string, unknown> | null)?.data ?? transitOutput) as Record<string, unknown> | null;
  const chart = (chartOutput?.data ?? chartOutput) as Record<string, unknown> | undefined;

  // Natal context for the chart frame (lagna sign + per-sign SAV bindus).
  // These don't change with the transit; they describe the chart that the
  // transit is *moving through*.
  const natalLagna = chart?.lagna as Record<string, unknown> | undefined;
  const natalLagnaSign = natalLagna?.sign as SignName | undefined;
  const natalAshtakavarga = chart?.ashtakavarga as Record<string, unknown> | undefined;
  const natalSav = natalAshtakavarga?.sarvashtakavarga as Record<string, number> | undefined;

  // Transit planets — `sign` gives the current sign per planet. We pass these
  // to NatalChartGrid via signKey="sign" so it places them on the chart.
  const transitPlanetsRaw = transit?.planets as Record<string, {
    sign?: string;
    is_retrograde?: boolean;
    house_from_lagna?: number;
    house_from_moon?: number;
    sav_points?: number;
  }> | undefined;
  const sadeSati = transit?.sade_sati as { active?: boolean; phase?: string } | undefined;

  // Shape transit planets for NatalChartGrid (it expects `Record<PlanetName, Planet>`).
  const transitPlanetsForChart: Record<string, Planet> | undefined = transitPlanetsRaw
    ? Object.fromEntries(
        Object.entries(transitPlanetsRaw).map(([name, p]) => [
          name,
          { sign: p.sign as SignName | undefined, is_retrograde: p.is_retrograde } as Planet,
        ]),
      )
    : undefined;

  return (
    <div className="space-y-5">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <SectionHeading>Today&apos;s Transits</SectionHeading>
        <button
          type="button"
          onClick={() => onFetchTransit(true)}
          disabled={isTransitLoading}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 11, color: "var(--color-ink-3)",
            background: "none", border: "none", cursor: "pointer", padding: "4px 8px",
          }}
        >
          <RefreshCw style={{ width: 11, height: 11, animation: isTransitLoading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {isTransitLoading && <TabLoadingSkeleton lines={4} cards={2} />}

      {!isTransitLoading && transitError && (
        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-danger)" }}>
          <span>Couldn&apos;t load transits — {transitError}</span>
          <button type="button" onClick={() => onFetchTransit(true)} style={{ textDecoration: "underline", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>Retry</button>
        </div>
      )}

      {transit && (
        <>
          {sadeSati?.active && (
            <div className="ac-banner warn">
              Sade Sati active · {sadeSati.phase} phase
            </div>
          )}

          {/* D1-style transit chart on the natal SAV lattice. Each sign shows
              the natal SAV bindu count (favorability) and the transit planets
              currently in it. */}
          {transitPlanetsForChart && (
            <section>
              <NatalChartGrid
                planets={transitPlanetsForChart}
                lagnaSign={natalLagnaSign}
                signKey="sign"
                label="Today — transit on natal SAV lattice"
                savScores={natalSav}
              />
              <p style={{ marginTop: 6, fontSize: 10, color: "var(--color-ink-4)" }}>
                Bindus shown per sign are from the natal Sarvashtakavarga (≥28 favourable · &lt;22 challenging). Transit planet placements move daily; bindus do not.
              </p>
            </section>
          )}

          {/* Compact strip below the chart — gives the per-planet details a
              quick reader still wants (retrograde marker + house-from-lagna /
              house-from-moon / planet SAV points), without taking over the tab. */}
          {transitPlanetsRaw && (
            <section>
              <div className="ac-eyebrow" style={{ marginBottom: 8 }}>Transit detail</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {PLANET_ORDER.map((name) => {
                  const p = transitPlanetsRaw[name];
                  if (!p) return null;
                  const savVal = p.sav_points ?? 0;
                  const savCls = savVal >= 30 ? "ac-cell-good" : savVal <= 22 ? "ac-cell-bad" : "";
                  return (
                    <div key={name} className="ac-card ac-card-pad-sm">
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--color-ink-1)" }}>
                          {name}
                          {p.is_retrograde && <span className="ac-retro" style={{ marginLeft: 3 }}>℞</span>}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--color-ink-3)" }}>{p.sign ?? "—"}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[var(--color-border-subtle)]">
                        <div className="text-center">
                          <div className="ac-eyebrow" style={{ fontSize: 9 }}>H/Lag</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-2)" }}>{p.house_from_lagna ?? "—"}</div>
                        </div>
                        <div className="text-center">
                          <div className="ac-eyebrow" style={{ fontSize: 9 }}>H/Moon</div>
                          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-2)" }}>{p.house_from_moon ?? "—"}</div>
                        </div>
                        <div className="text-center">
                          <div className="ac-eyebrow" style={{ fontSize: 9 }}>SAV</div>
                          <div className={savCls} style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{savVal}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
