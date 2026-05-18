"use client";
import { cn } from "@/lib/utils";
import {
  SIGNS_ORDER, PLANET_ORDER, PLANET_ABBR, DIGNITY_COLORS,
} from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";

// Single source-of-truth for chart dimensions.
// Change CHART_SIZE_PX here and all charts in the app resize together.
export const CHART_SIZE_PX = 240;

// Fixed positions in the South Indian 4×4 grid.
// CSS grid-area: "row-start / col-start / row-end / col-end" (1-indexed)
const SIGN_GRID_AREA: Record<SignName, string> = {
  Pisces:       "1 / 1 / 2 / 2",
  Aries:        "1 / 2 / 2 / 3",
  Taurus:       "1 / 3 / 2 / 4",
  Gemini:       "1 / 4 / 2 / 5",
  Cancer:       "2 / 4 / 3 / 5",
  Leo:          "3 / 4 / 4 / 5",
  Virgo:        "4 / 4 / 5 / 5",
  Libra:        "4 / 3 / 5 / 4",
  Scorpio:      "4 / 2 / 5 / 3",
  Sagittarius:  "4 / 1 / 5 / 2",
  Capricorn:    "3 / 1 / 4 / 2",
  Aquarius:     "2 / 1 / 3 / 2",
};

interface CellPlanet {
  abbr: string;
  retro: boolean;
  dignityClass?: string;
}

interface NatalChartGridProps {
  planets: Record<string, Planet>;
  // Sign of the ascendant in this chart (D1 lagna for D1, d9_sign for D9, etc.)
  lagnaSign: SignName | undefined;
  // Which field on Planet holds this chart's sign ("sign" for D1, "d9_sign" for D9, …)
  signKey?: keyof Planet;
  // Displayed above the grid and in the center cell
  label?: string;
  // Reduce text/padding for thumbnail grids
  compact?: boolean;
}

export function NatalChartGrid({
  planets,
  lagnaSign,
  signKey = "sign",
  label = "D1",
  compact = false,
}: NatalChartGridProps) {
  // Map sign → planet abbreviation list
  const signPlanets: Record<string, CellPlanet[]> = {};
  for (const name of PLANET_ORDER) {
    const p = planets[name];
    if (!p) continue;
    const sign = (signKey === "sign" ? p.sign : p[signKey]) as SignName | undefined;
    if (!sign) continue;
    if (!signPlanets[sign]) signPlanets[sign] = [];
    signPlanets[sign].push({
      abbr: PLANET_ABBR[name] ?? name.slice(0, 2),
      retro: p.is_retrograde ?? false,
      // Show dignity colour only in D1 (natal chart)
      dignityClass: signKey === "sign" && p.dignity
        ? (DIGNITY_COLORS[p.dignity] ?? undefined)
        : undefined,
    });
  }

  const textBase  = compact ? "text-[8px]"  : "text-[10px]";
  const textSmall = compact ? "text-[7px]"  : "text-[9px]";
  const pad       = compact ? "p-0.5"       : "p-1";

  return (
    <div style={{ width: CHART_SIZE_PX }} className="flex-shrink-0">
      {label && (
        <p className={cn(
          "font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5",
          textSmall
        )}>
          {label}
        </p>
      )}
      <div
        className="border-t border-l border-[var(--color-border)] w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(4, 1fr)",
          aspectRatio: "1 / 1",
        }}
      >
        {/* Center 2×2 — shows the chart label as a watermark */}
        <div
          className="border-r border-b border-[var(--color-border)] flex items-center justify-center"
          style={{ gridArea: "2 / 2 / 4 / 4" }}
        >
          <span className={cn(
            "font-bold uppercase tracking-widest text-muted-foreground/20",
            compact ? "text-[8px]" : "text-[11px]"
          )}>
            {label}
          </span>
        </div>

        {/* 12 sign cells */}
        {(Object.entries(SIGN_GRID_AREA) as [SignName, string][]).map(([sign, gridArea]) => {
          const isLagna  = sign === lagnaSign;
          const cellPlts = signPlanets[sign] ?? [];

          return (
            <div
              key={sign}
              style={{ gridArea }}
              className={cn(
                "border-r border-b border-[var(--color-border)] flex flex-col overflow-hidden relative",
                pad,
                isLagna ? "bg-[var(--color-surface-2)]" : "bg-transparent"
              )}
            >
              {/* Lagna indicator — top-right corner, only on lagna cell */}
              {isLagna && (
                <span className={cn(
                  "absolute top-0.5 right-0.5 font-bold leading-none text-[var(--color-accent)]",
                  textSmall
                )}>
                  Lg
                </span>
              )}

              {/* Planet abbreviations — centered */}
              <div className="flex-1 flex items-center justify-center flex-wrap gap-0.5 leading-tight">
                {cellPlts.map((pl, i) => (
                  <span
                    key={i}
                    className={cn(
                      "leading-tight font-medium",
                      textBase,
                      pl.retro
                        ? "text-planet-retrograde"
                        : pl.dignityClass ?? "text-[var(--color-ink-1)]"
                    )}
                  >
                    {pl.abbr}
                    {pl.retro && (
                      <span className="align-super leading-none" style={{ fontSize: "0.55em" }}>r</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
