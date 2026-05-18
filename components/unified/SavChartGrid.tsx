"use client";
import { cn } from "@/lib/utils";
import { SIGNS_ORDER } from "@/components/unified/types";
import type { SignName } from "@/components/unified/types";
import { CHART_SIZE_PX } from "@/components/unified/NatalChartGrid";

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

interface SavChartGridProps {
  // SAV bindus per sign name
  sav: Record<string, number>;
  // Lagna sign for house number overlay
  lagnaSign?: SignName;
}

export function SavChartGrid({ sav, lagnaSign }: SavChartGridProps) {
  const lagnaIdx = lagnaSign ? SIGNS_ORDER.indexOf(lagnaSign) : -1;

  function houseNum(sign: SignName): number {
    if (lagnaIdx < 0) return 0;
    return ((SIGNS_ORDER.indexOf(sign) - lagnaIdx + 12) % 12) + 1;
  }

  return (
    <div style={{ width: CHART_SIZE_PX }} className="flex-shrink-0">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">
        SAV — Sarvashtakavarga
      </p>
      <div
        className="border-t border-l border-[var(--color-border)] w-full"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(4, 1fr)",
          aspectRatio: "1 / 1",
        }}
      >
        {/* Center label */}
        <div
          className="border-r border-b border-[var(--color-border)] flex items-center justify-center"
          style={{ gridArea: "2 / 2 / 4 / 4" }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/20">SAV</span>
        </div>

        {(Object.entries(SIGN_GRID_AREA) as [SignName, string][]).map(([sign, gridArea]) => {
          const val = sav[sign] ?? 0;
          const isLagna = sign === lagnaSign;
          const h = houseNum(sign);
          const colorClass =
            val >= 28 ? "text-emerald-400 font-bold" :
            val < 22  ? "text-red-400 font-semibold" :
                        "text-[var(--color-ink-2)]";
          const bgClass =
            val >= 28 ? "bg-emerald-500/8" :
            val < 22  ? "bg-red-500/8" :
                        isLagna ? "bg-[var(--color-surface-2)]" : "bg-transparent";

          return (
            <div
              key={sign}
              style={{ gridArea }}
              className={cn(
                "border-r border-b border-[var(--color-border)] flex flex-col p-1 overflow-hidden",
                bgClass
              )}
            >
              <span className={cn(
                "text-[7px] font-semibold leading-none mb-auto",
                isLagna ? "text-[var(--color-accent)]" : "text-muted-foreground/30"
              )}>
                {h > 0 ? h : ""}
              </span>
              <span className={cn("text-[11px] leading-none self-center mt-auto", colorClass)}>
                {val > 0 ? val : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-muted-foreground/40 mt-1">
        <span className="text-emerald-400">≥28</span> favorable · <span className="text-red-400">&lt;22</span> challenging
      </p>
    </div>
  );
}
