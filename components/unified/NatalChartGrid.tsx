"use client";
import { cn } from "@/lib/utils";
import {
  SIGNS_ORDER, PLANET_ORDER, PLANET_ABBR, DIGNITY_COLORS,
} from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";

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

  const lagnaIdx = lagnaSign ? SIGNS_ORDER.indexOf(lagnaSign) : -1;
  function houseNum(sign: SignName): number {
    if (lagnaIdx < 0) return 0;
    return ((SIGNS_ORDER.indexOf(sign) - lagnaIdx + 12) % 12) + 1;
  }

  const textBase  = compact ? "text-[8px]"  : "text-[10px]";
  const textSmall = compact ? "text-[7px]"  : "text-[9px]";
  const pad       = compact ? "p-0.5"       : "p-1";

  return (
    <div className="w-full">
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
        {/* Center 2×2 — empty, just shows the chart label */}
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
          const h        = houseNum(sign);

          return (
            <div
              key={sign}
              style={{ gridArea }}
              className={cn(
                "border-r border-b border-[var(--color-border)] flex flex-col overflow-hidden",
                pad,
                isLagna
                  ? "bg-[var(--color-surface-2)]"
                  : "bg-transparent"
              )}
            >
              {/* House number + Lg tag */}
              <div className="flex items-start justify-between leading-none mb-px">
                <span className={cn(
                  "font-semibold leading-none",
                  textSmall,
                  isLagna
                    ? "text-[var(--color-accent)]"
                    : "text-muted-foreground/35"
                )}>
                  {h > 0 ? h : ""}
                </span>
                {isLagna && (
                  <span className={cn(
                    "font-bold leading-none text-[var(--color-accent)]",
                    textSmall
                  )}>
                    Lg
                  </span>
                )}
              </div>

              {/* Planet abbreviations */}
              <div className="flex flex-wrap gap-x-px leading-tight">
                {cellPlts.map((pl, i) => (
                  <span
                    key={i}
                    className={cn(
                      "leading-tight font-medium",
                      textBase,
                      pl.retro
                        ? "text-orange-400"
                        : pl.dignityClass ?? "text-[var(--color-ink-1)]"
                    )}
                  >
                    {pl.abbr}{pl.retro ? "℞" : ""}
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
