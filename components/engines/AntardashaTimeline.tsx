"use client";
import { useState } from "react";
import { SectionShell } from "./SectionShell";
import { ChevronDown, ChevronRight } from "lucide-react";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type DashaSlice = {
  planet?: string;
  start?: string;
  end?: string;
  years?: number;
  days?: number;
};

type DashasData = {
  maha?: DashaSlice;
  antar?: DashaSlice;
  pratyantar?: DashaSlice;
  timeline?: Array<{ planet?: string; start?: string; end?: string }>;
};

type Props = {
  dashas: DashasData | undefined;
  explainer: SectionExplainer | null;
};

// Vimshottari period lengths in years (fixed, per Parasara)
const VIMSHOTTARI_YEARS: Record<string, number> = {
  Sun: 6, Moon: 10, Mars: 7, Rahu: 18,
  Jupiter: 16, Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20,
};

// Fixed Vimshottari sequence
const SEQUENCE = ["Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus"];

function addYearFraction(dateStr: string, years: number): string {
  try {
    const d = new Date(dateStr);
    const totalMs = years * 365.25 * 24 * 60 * 60 * 1000;
    const end = new Date(d.getTime() + totalMs);
    return end.toISOString().slice(0, 10);
  } catch {
    return "?";
  }
}

function computeAntardashas(mahaStart: string, mahaPlanet: string): Array<{ planet: string; start: string; end: string; durationYears: number }> {
  const mahaYears = VIMSHOTTARI_YEARS[mahaPlanet] ?? 0;
  const seqIdx = SEQUENCE.indexOf(mahaPlanet);
  if (seqIdx === -1) return [];

  const antardashas: Array<{ planet: string; start: string; end: string; durationYears: number }> = [];
  let cursor = mahaStart;

  for (let i = 0; i < 9; i++) {
    const antarPlanet = SEQUENCE[(seqIdx + i) % 9];
    const antarYears = (mahaYears * VIMSHOTTARI_YEARS[antarPlanet]) / 120;
    const end = addYearFraction(cursor, antarYears);
    antardashas.push({ planet: antarPlanet, start: cursor, end, durationYears: antarYears });
    cursor = end;
  }
  return antardashas;
}

function isCurrent(start: string, end: string): boolean {
  const now = new Date().toISOString().slice(0, 10);
  return now >= start && now <= end;
}

export function AntardashaTimeline({ dashas, explainer }: Props) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const accent = "text-amber-400";
  const row = "border-b border-white/10";

  const timeline = dashas?.timeline ?? [];
  const currentMaha = dashas?.maha;
  const currentAntar = dashas?.antar;

  return (
    <SectionShell
      sectionInView="Antardasha Timeline (Full Dasha Tree)"
      explainer={explainer}
      accent={accent}
      defaultOpen={true}
    >
      <p className="text-xs text-muted-foreground mt-2 mb-3">
        Click any Mahadasha row to expand its 9 Antardasha sub-periods. Highlighted rows are currently active.
      </p>

      {timeline.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No dasha timeline data available.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground w-6"></th>
              <th className="text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground">Planet</th>
              <th className="text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground">Start</th>
              <th className="text-left py-1.5 font-medium text-xs text-muted-foreground">End</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((t, i) => {
              const mahaStart = t.start ?? "";
              const mahaEnd = t.end ?? "";
              const planet = t.planet ?? "";
              const active = currentMaha?.planet === planet && currentMaha?.start === t.start;
              const isExpanded = expandedIdx === i;
              const antardashas = isExpanded ? computeAntardashas(mahaStart, planet) : [];

              return [
                // Mahadasha row
                <tr
                  key={`maha-${i}`}
                  className={`${row} cursor-pointer transition-colors ${active ? "bg-amber-950/30 hover:bg-amber-950/40" : "hover:bg-white/5"}`}
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                >
                  <td className="py-2 pr-2 text-muted-foreground">
                    {isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 inline" />
                      : <ChevronRight className="h-3.5 w-3.5 inline" />}
                  </td>
                  <td className={`py-2 pr-3 font-bold ${active ? "text-amber-300" : "text-amber-400/80"}`}>
                    {planet}{active ? " ●" : ""}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{mahaStart}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{mahaEnd}</td>
                </tr>,

                // Antardasha rows (expanded)
                ...(isExpanded
                  ? antardashas.map((ad, ai) => {
                      const adActive =
                        active &&
                        currentAntar?.planet === ad.planet &&
                        isCurrent(ad.start, ad.end);
                      return (
                        <tr
                          key={`antar-${i}-${ai}`}
                          className={`${row} ${adActive ? "bg-amber-950/20" : "bg-white/[0.02]"}`}
                        >
                          <td></td>
                          <td className={`py-1.5 pr-3 text-xs pl-5 ${adActive ? "font-bold text-amber-200" : "text-amber-400/60"}`}>
                            {adActive && "→ "}{ad.planet}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">{ad.start}</td>
                          <td className="py-1.5 font-mono text-xs text-muted-foreground">
                            {ad.end}
                            <span className="ml-2 text-[10px] text-muted-foreground/50">
                              ({(ad.durationYears * 12).toFixed(1)} mo)
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </SectionShell>
  );
}
