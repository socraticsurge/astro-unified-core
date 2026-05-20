"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { PLANET_ORDER } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";

export function TransitsTab({
  transitOutput,
  isTransitLoading,
  transitError,
  onFetchTransit,
}: {
  transitOutput: Record<string, unknown> | null;
  isTransitLoading: boolean;
  transitError?: string | null;
  onFetchTransit: (force?: boolean) => void;
}) {
  useEffect(() => {
    if (!transitOutput && !isTransitLoading) onFetchTransit();
  }, [transitOutput, isTransitLoading, onFetchTransit]);

  const transit = ((transitOutput as Record<string, unknown> | null)?.data ?? transitOutput) as Record<string, unknown> | null;

  const transitPlanets = transit?.planets as Record<string, {
    sign?: string;
    is_retrograde?: boolean;
    house_from_lagna?: number;
    house_from_moon?: number;
    sav_points?: number;
  }> | undefined;
  const sadeSati = transit?.sade_sati as { active?: boolean; phase?: string } | undefined;

  return (
    <div className="space-y-4">
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

      {isTransitLoading && (
        <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>Loading transits…</p>
      )}

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

          {/*
            Compact card grid (PDF observation #6): the previous full-width
            5-column table wasted screen real estate (3 of 5 cols were single
            numbers). One card per planet, 2-up on small screens, 3-up at md,
            4-up at lg. Sign + retro on top; the three numeric metrics share a
            tight 3-col footer with stable column widths so the grid stays neat.
          */}
          {transitPlanets && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {PLANET_ORDER.map((name) => {
                const p = transitPlanets[name];
                if (!p) return null;
                const savVal  = p.sav_points ?? 0;
                const savCls  = savVal >= 30 ? "ac-cell-good" : savVal <= 22 ? "ac-cell-bad" : "";
                return (
                  <div key={name} className="ac-card ac-card-pad-sm">
                    <div className="flex items-baseline justify-between mb-2">
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--color-ink-1)" }}>
                        {name}
                        {p.is_retrograde && <span className="ac-retro" style={{ marginLeft: 4 }}>℞</span>}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--color-ink-3)" }}>{p.sign ?? "—"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[var(--color-border-subtle)]">
                      <div className="text-center">
                        <div className="ac-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>H/Lag</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-ink-2)" }}>{p.house_from_lagna ?? "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="ac-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>H/Moon</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-ink-2)" }}>{p.house_from_moon ?? "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="ac-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>SAV</div>
                        <div className={`${savCls}`} style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{savVal}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
