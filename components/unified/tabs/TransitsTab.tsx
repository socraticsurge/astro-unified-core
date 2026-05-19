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

          {transitPlanets && (
            <div className="ac-card overflow-x-auto">
              <table className="ac-table">
                <thead>
                  <tr>
                    {["Planet", "Transit Sign", "H / Lagna", "H / Moon", "SAV"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLANET_ORDER.map(name => {
                    const p = transitPlanets[name];
                    if (!p) return null;
                    const savVal = p.sav_points ?? 0;
                    const savCls = savVal >= 30 ? "ac-cell-good" : savVal <= 22 ? "ac-cell-bad" : "";
                    return (
                      <tr key={name}>
                        <td className="planet">
                          {name}
                          {p.is_retrograde && <span className="ac-retro" style={{ marginLeft: 4 }}>℞</span>}
                        </td>
                        <td>{p.sign ?? "—"}</td>
                        <td className="num right">{p.house_from_lagna ?? "—"}</td>
                        <td className="num right">{p.house_from_moon ?? "—"}</td>
                        <td className={`num right ${savCls}`}>{savVal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
