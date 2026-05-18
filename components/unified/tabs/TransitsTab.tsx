"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANET_ORDER, TABLE_STYLES } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";

export function TransitsTab({
  transitOutput,
  isTransitLoading,
  onFetchTransit,
}: {
  transitOutput: Record<string, unknown> | null;
  isTransitLoading: boolean;
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
      <div className="flex items-center justify-between">
        <SectionHeading>Today&apos;s Transits</SectionHeading>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFetchTransit(true)}
          disabled={isTransitLoading}
          className="h-6 text-xs gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isTransitLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isTransitLoading && <p className="text-xs text-muted-foreground">Loading transits…</p>}

      {transit && (
        <>
          {sadeSati?.active && (
            <div className="px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs">
              Sade Sati active · {sadeSati.phase} phase
            </div>
          )}

          {transitPlanets && (
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {["Planet", "Transit Sign", "H/Lagna", "H/Moon", "SAV"].map(h => (
                      <th key={h} className={TABLE_STYLES.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLANET_ORDER.map(name => {
                    const p = transitPlanets[name];
                    if (!p) return null;
                    const savVal = p.sav_points ?? 0;
                    return (
                      <tr key={name} className={TABLE_STYLES.row}>
                        <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-1)]">
                          {name}
                          {p.is_retrograde && <span className="ml-1 text-planet-retrograde">℞</span>}
                        </td>
                        <td className="py-1.5 px-2 text-[var(--color-ink-2)]">{p.sign}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{p.house_from_lagna}</td>
                        <td className="py-1.5 px-2 text-center text-muted-foreground">{p.house_from_moon}</td>
                        <td className={`py-1.5 px-2 text-center font-bold font-mono ${savVal >= 30 ? "text-success" : savVal <= 22 ? "text-danger" : "text-muted-foreground"}`}>
                          {savVal}
                        </td>
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
