"use client";
import { SIGNS_ORDER, PLANET_ORDER, PLANET_ABBR } from "@/components/unified/types";
import type { SignName } from "@/components/unified/types";

function signToHouse(planetSign: string, lagnaSign: string): number {
  const lagnaIdx = SIGNS_ORDER.indexOf(lagnaSign as SignName);
  const planetIdx = SIGNS_ORDER.indexOf(planetSign as SignName);
  if (lagnaIdx < 0 || planetIdx < 0) return 0;
  return ((planetIdx - lagnaIdx + 12) % 12) + 1;
}

function Grid({
  title,
  houseMap,
  testPrefix,
}: {
  title: string;
  houseMap: Record<number, string[]>;
  testPrefix: string;
}) {
  return (
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <div className="grid grid-cols-4 gap-px bg-[var(--color-border)] rounded-md overflow-hidden text-[10px]">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
          <div
            key={h}
            data-testid={`house-${testPrefix}-${h}`}
            className="bg-[var(--color-surface-1)] p-1 min-h-[2.2rem] flex flex-col"
          >
            <span className="text-[9px] text-muted-foreground/50 leading-none mb-0.5">{h}</span>
            <span className="text-[10px] leading-tight font-medium text-[var(--color-ink-2)]">
              {houseMap[h]?.join(" ") ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HouseGrid({
  planets,
  d9LagnaSign,
}: {
  planets: Record<string, { house?: number; sign?: string; d9_sign?: string }>;
  lagnaSign: string;
  d9LagnaSign: string;
}) {
  // D1 house map — use planet.house directly
  const d1Map: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) d1Map[i] = [];
  PLANET_ORDER.forEach(name => {
    const h = planets[name]?.house;
    if (h && h >= 1 && h <= 12) d1Map[h].push(PLANET_ABBR[name]);
  });

  // D9 house map — compute from d9_sign relative to d9LagnaSign
  const d9Map: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) d9Map[i] = [];
  PLANET_ORDER.forEach(name => {
    const d9Sign = planets[name]?.d9_sign;
    if (!d9Sign) return;
    const h = signToHouse(d9Sign, d9LagnaSign);
    if (h >= 1 && h <= 12) d9Map[h].push(PLANET_ABBR[name]);
  });

  return (
    <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <Grid title="D1 — Rasi" houseMap={d1Map} testPrefix="d1" />
      <Grid title="D9 — Navamsa" houseMap={d9Map} testPrefix="d9" />
    </div>
  );
}
