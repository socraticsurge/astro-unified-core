"use client";
import { cn } from "@/lib/utils";
import {
  PLANET_ORDER, PLANET_ABBR, DIGNITY_COLORS, SIGNS_ORDER,
} from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import styles from "./NatalChartGrid.module.css";

// Single source-of-truth for chart dimensions.
// Change CHART_SIZE_PX here and all charts in the app resize together.
export const CHART_SIZE_PX = 440;

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

const SIGN_ABBR: Record<SignName, string> = {
  Aries: "Ar",
  Taurus: "Ta",
  Gemini: "Ge",
  Cancer: "Cn",
  Leo: "Le",
  Virgo: "Vi",
  Libra: "Li",
  Scorpio: "Sc",
  Sagittarius: "Sg",
  Capricorn: "Cp",
  Aquarius: "Aq",
  Pisces: "Pi",
};

interface CellPlanet {
  name: string;
  abbr: string;
  retro: boolean;
  dignityClass?: string;
  dignity?: string;
}

interface NatalChartGridProps {
  planets: Record<string, Planet>;
  lagnaSign: SignName | undefined;
  signKey?: keyof Planet;
  label?: string;
  compact?: boolean;
  expanded?: boolean;
  showLegend?: boolean;
  // Optional SAV bindu scores per sign — shown as a small number in each cell
  savScores?: Record<string, number>;
}

export function NatalChartGrid({
  planets,
  lagnaSign,
  signKey = "sign",
  label = "D1",
  compact = false,
  expanded = false,
  showLegend = true,
  savScores,
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
      name,
      abbr: PLANET_ABBR[name] ?? name.slice(0, 2),
      retro: p.is_retrograde ?? false,
      // Show dignity colour only in D1 (natal chart)
      dignityClass: signKey === "sign" && p.dignity
        ? (DIGNITY_COLORS[p.dignity] ?? undefined)
        : undefined,
      dignity: signKey === "sign" ? p.dignity : undefined,
    });
  }

  const lagnaIndex = lagnaSign ? SIGNS_ORDER.indexOf(lagnaSign) : -1;
  const [chartCode, chartName] = label.includes("—")
    ? label.split("—").map(part => part.trim())
    : [label, signKey === "sign" ? "Rasi" : "Varga"];

  return (
    <figure
      style={{ maxWidth: compact ? 280 : CHART_SIZE_PX }}
      className={cn(styles.figure, compact && styles.compact, expanded && styles.expanded)}
      aria-label={`${label || "Vedic"} South Indian chart`}
    >
      {label ? <span className="sr-only">{label}</span> : null}
      <div
        className={styles.chart}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(4, 1fr)",
          aspectRatio: "1 / 1",
        }}
      >
        <div
          className={styles.centre}
          style={{ gridArea: "2 / 2 / 4 / 4" }}
        >
          <span className={styles.centreCode}>{chartCode || "Chart"}</span>
          <strong>{chartName || "Vedic chart"}</strong>
          {lagnaSign && (
            <span className={styles.centreMeta}>
              Ascendant · {lagnaSign}
            </span>
          )}
        </div>

        {(Object.entries(SIGN_GRID_AREA) as [SignName, string][]).map(([sign, gridArea]) => {
          const isLagna  = sign === lagnaSign;
          const cellPlts = signPlanets[sign] ?? [];
          const signIndex = SIGNS_ORDER.indexOf(sign);
          const house = lagnaIndex >= 0
            ? ((signIndex - lagnaIndex + 12) % 12) + 1
            : undefined;
          const planetSummary = cellPlts.length > 0
            ? cellPlts.map(planet => `${planet.name}${planet.retro ? " retrograde" : ""}`).join(", ")
            : "No planets";

          return (
            <div
              key={sign}
              style={{ gridArea }}
              aria-label={`${sign}${house ? `, house ${house}` : ""}. ${planetSummary}`}
              className={cn(
                styles.cell,
                isLagna && styles.lagnaCell
              )}
            >
              <span className={styles.cellContext} title={sign}>
                <span>{SIGN_ABBR[sign]}</span>
                {house && <span>H{house}</span>}
              </span>
              {isLagna && <span className={styles.lagnaBadge}>Lg</span>}
              {savScores && savScores[sign] !== undefined && (
                <span className={cn(
                  styles.savScore,
                  savScores[sign] >= 28
                    ? "text-success"
                    : savScores[sign] < 22
                      ? "text-danger"
                      : "text-muted-foreground/40"
                )}>
                  {savScores[sign]}
                </span>
              )}

              <div className={styles.planets}>
                {cellPlts.map(pl => (
                  <span
                    key={pl.name}
                    title={[
                      pl.name,
                      pl.dignity?.replaceAll("_", " "),
                      pl.retro ? "retrograde" : "",
                    ].filter(Boolean).join(" · ")}
                    className={cn(
                      styles.planet,
                      pl.retro
                        ? "text-planet-retrograde"
                        : pl.dignityClass ?? "text-[var(--color-ink-1)]"
                    )}
                  >
                    {pl.abbr}
                    {pl.retro && <sup>r</sup>}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {showLegend && (
        <figcaption className={styles.legend}>
          <span><b className={styles.legendLagna}>Lg</b> Ascendant</span>
          <span><b className={styles.legendRetro}>r</b> Retrograde</span>
          {signKey === "sign" && (
            <>
              <span><i className={styles.legendSupportive} /> Supportive dignity</span>
              <span><i className={styles.legendChallenging} /> Challenging dignity</span>
            </>
          )}
          {savScores && <span><b className={styles.legendScore}>28</b> SAV support</span>}
        </figcaption>
      )}
    </figure>
  );
}
