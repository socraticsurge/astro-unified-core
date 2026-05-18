"use client";
import {
  PLANET_ORDER, DIGNITY_COLORS, VARGA_KEYS, formatAspects,
} from "@/components/unified/types";
import type { Planet } from "@/components/unified/types";

const th = "text-left py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const row = "border-b border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)]/30 transition-colors";

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

  return (
    <div className="space-y-6">
      {/* Panchang */}
      {panchang && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Panchang</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: "Tithi",     value: `${panchang.tithi?.name ?? ""}${panchang.tithi?.paksha ? ` (${panchang.tithi.paksha})` : ""}` },
              { label: "Vara",      value: `${panchang.vara?.name ?? ""} · ${panchang.vara?.lord ?? ""}` },
              { label: "Nakshatra", value: `${panchang.nakshatra?.name ?? ""} P${panchang.nakshatra?.pada ?? ""}` },
              { label: "Yoga",      value: panchang.yoga?.name ?? "" },
              { label: "Karana",    value: panchang.karana ?? "" },
            ].map(({ label, value }) => (
              <div key={label} className="p-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                <p className="text-sm font-medium text-[var(--color-ink-1)]">{value || "—"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Divisional lagna strip */}
      {lagna && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Lagna across Vargas</h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 rounded bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 text-xs font-semibold text-[var(--color-accent)]">
              D1: {String(lagna.sign ?? "—")}
            </span>
            {VARGA_KEYS.map(({ label, key }) => {
              const val = (lagna as Record<string, unknown>)[key as string];
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Planetary Positions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Planet","Sign","Deg","House","Nakshatra / Pada","Dignity","Aspects"].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const p = planets[name];
                  if (!p) return null;
                  return (
                    <tr key={name} className={row}>
                      <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-1)]">
                        {name}
                        {p.is_retrograde && <span className="ml-1 text-orange-400 text-[10px]">℞</span>}
                        {p.is_combust   && <span className="ml-1 text-red-400 text-[10px]">●</span>}
                      </td>
                      <td className="py-1.5 px-2 text-[var(--color-ink-2)]">{p.sign ?? "—"}</td>
                      <td className="py-1.5 px-2 font-mono text-[var(--color-ink-3)]">{p.degree != null ? `${p.degree.toFixed(1)}°` : "—"}</td>
                      <td className="py-1.5 px-2 text-center text-[var(--color-ink-2)]">{p.house ?? "—"}</td>
                      <td className="py-1.5 px-2 text-[var(--color-ink-3)]">{p.nakshatra ?? "—"} P{p.pada ?? "—"}</td>
                      <td className={`py-1.5 px-2 text-xs ${DIGNITY_COLORS[p.dignity ?? ""] ?? "text-slate-300"}`}>
                        {p.dignity ?? "—"}
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground font-mono text-[10px]">
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
