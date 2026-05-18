"use client";
import {
  PLANET_ORDER, DIGNITY_COLORS, VARGA_KEYS, formatAspects, TABLE_STYLES,
} from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

export function ChartTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const panchang = data?.panchang as {
    tithi?:     { number?: number; name?: string; paksha?: string };
    vara?:      { name?: string; lord?: string };
    nakshatra?: { name?: string; pada?: number; lord?: string };
    yoga?:      { index?: number; name?: string };
    karana?:    string;
  } | undefined;
  const lagna   = data?.lagna   as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, Planet>  | undefined;

  const lagnaSign   = lagna?.sign       as SignName | undefined;
  const lagnaD9Sign = lagna?.d9_sign    as SignName | undefined;

  return (
    <div className="space-y-8">

      {/* Natal charts — D1 + D9 side by side */}
      {planets && (
        <section>
          <SectionHeading>Birth Chart</SectionHeading>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-xl">
            <NatalChartGrid
              planets={planets}
              lagnaSign={lagnaSign}
              signKey="sign"
              label="D1 — Rasi"
            />
            <NatalChartGrid
              planets={planets}
              lagnaSign={lagnaD9Sign}
              signKey="d9_sign"
              label="D9 — Navamsa"
            />
          </div>
        </section>
      )}

      {/* Panchang */}
      {panchang && (
        <section>
          <SectionHeading>Panchang at Birth</SectionHeading>
          <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] flex flex-wrap gap-x-6 gap-y-2 items-center text-sm">
            {[
              { label: "Tithi",     value: `${panchang.tithi?.name ?? ""}${panchang.tithi?.paksha ? ` · ${panchang.tithi.paksha}` : ""}` },
              { label: "Vara",      value: `${panchang.vara?.name ?? ""} · ${panchang.vara?.lord ?? ""}` },
              { label: "Nakshatra", value: `${panchang.nakshatra?.name ?? ""} P${panchang.nakshatra?.pada ?? ""}` },
              { label: "Yoga",      value: panchang.yoga?.name ?? "" },
              { label: "Karana",    value: panchang.karana ?? "" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
                <span className="font-semibold text-[var(--color-ink-1)]">{value || "—"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Divisional lagna strip */}
      {lagna && (
        <section>
          <SectionHeading>Lagna across Vargas</SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-1)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-ink-1)]">
              D1: {String(lagna.sign ?? "—")}
            </span>
            {VARGA_KEYS.map(({ label, key }) => {
              const val = (lagna as Record<string, unknown>)[key];
              return val ? (
                <span key={label} className="px-2 py-0.5 rounded bg-[var(--color-surface-1)] border border-[var(--color-border)] text-xs text-[var(--color-ink-3)]">
                  {label}: {String(val)}
                </span>
              ) : null;
            })}
          </div>
        </section>
      )}

      {/* Planet table */}
      {planets && (
        <section>
          <SectionHeading>Planetary Positions</SectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Planet","Sign","Deg","House","Nakshatra · Pada","Dignity","Retro","Combust","Aspects"].map(h => (
                    <th key={h} className={TABLE_STYLES.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const p = planets[name];
                  if (!p) return null;
                  return (
                    <tr key={name} className={TABLE_STYLES.row}>
                      <td className="py-2 px-2 font-semibold text-[var(--color-ink-1)]">{name}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-2)]">{p.sign ?? "—"}</td>
                      <td className="py-2 px-2 font-mono text-[var(--color-ink-3)]">{p.degree != null ? `${p.degree.toFixed(1)}°` : "—"}</td>
                      <td className="py-2 px-2 text-center text-[var(--color-ink-2)]">{p.house ?? "—"}</td>
                      <td className="py-2 px-2 text-[var(--color-ink-3)]">{p.nakshatra ?? "—"} · P{p.pada ?? "—"}</td>
                      <td className={`py-2 px-2 text-sm ${DIGNITY_COLORS[p.dignity ?? ""] ?? "text-dignity-neutral"}`}>
                        {p.dignity ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {p.is_retrograde
                          ? <span className="text-planet-retrograde font-semibold">℞</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {p.is_combust
                          ? <span className="text-planet-combust font-semibold">●</span>
                          : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground font-mono text-xs">
                        {formatAspects(p.aspects)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
