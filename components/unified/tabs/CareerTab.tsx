"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import type { Planet, SignName } from "@/components/unified/types";
import { SectionHeading } from "@/components/unified/SectionHeading";

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

  const career = ((careerOutput as Record<string, unknown> | null)?.data ?? careerOutput) as {
    tenth_house?: { sign?: string; lord?: string; lord_house?: number; lord_d10?: string };
    career_themes?: string[];
    strength_factors?: string[];
  } | null;

  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start">

      {/* D10 chart — left column */}
      {planets && (
        <div className="flex-shrink-0">
          <SectionHeading>D10 — Dashamsha</SectionHeading>
          <NatalChartGrid
            planets={planets}
            lagnaSign={lagnaD10}
            signKey="d10_sign"
            label="D10"
          />
        </div>
      )}

      {/* Career analysis — right column */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <SectionHeading>Career Analysis</SectionHeading>
          {!career && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFetchCareer(true)}
              disabled={isCareerLoading}
              className="h-6 text-xs gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isCareerLoading ? "animate-spin" : ""}`} />
              {isCareerLoading ? "Loading…" : "Load"}
            </Button>
          )}
        </div>

        {isCareerLoading && <p className="text-xs text-muted-foreground">Loading career analysis…</p>}

        {career && (
          <div className="space-y-4">
            {career.tenth_house && (
              <div className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">10th House (Karma Bhava)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>Sign: <strong className="text-[var(--color-ink-1)]">{career.tenth_house.sign}</strong></span>
                  <span>Lord: <strong className="text-planet-name">{career.tenth_house.lord}</strong></span>
                  <span>Lord&apos;s house: <strong className="text-[var(--color-ink-2)]">{career.tenth_house.lord_house}</strong></span>
                  <span>Lord&apos;s D10: <strong className="text-[var(--color-ink-2)]">{career.tenth_house.lord_d10 ?? "—"}</strong></span>
                </div>
              </div>
            )}

            {career.career_themes && career.career_themes.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Career Themes</p>
                <div className="flex flex-wrap gap-1.5">
                  {career.career_themes.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-ink-2)]">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {career.strength_factors && career.strength_factors.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Indicators</p>
                <ul className="space-y-0.5">
                  {career.strength_factors.map(f => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-success mt-0.5">·</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
