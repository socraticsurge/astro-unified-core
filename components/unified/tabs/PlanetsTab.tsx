"use client";
import { useState } from "react";
import { PLANET_ORDER, DIGNITY_COLORS, formatAspects } from "@/components/unified/types";
import type { Planet, ShadbalaPlanet } from "@/components/unified/types";

const SHADBALA_LABELS = [
  { key: "sthana_bala",     label: "Sthana (Positional)",    max: 3.0 },
  { key: "dig_bala",        label: "Dig (Directional)",      max: 1.0 },
  { key: "kala_bala",       label: "Kala (Temporal)",        max: 1.0 },
  { key: "chesta_bala",     label: "Chesta (Motional)",      max: 1.0 },
  { key: "naisargika_bala", label: "Naisargika (Natural)",   max: 1.0 },
  { key: "drik_bala",       label: "Drik (Aspectual)",       max: 1.0 },
];

function barColor(pct: number): string {
  if (pct >= 0.6) return "bg-emerald-500";
  if (pct >= 0.35) return "bg-amber-400";
  return "bg-red-500";
}

function getShadbalaValue(sb: ShadbalaPlanet, key: string): number | undefined {
  if (key === "sthana_bala") return sb.sthana_bala?.total;
  return (sb as unknown as Record<string, number>)[key];
}

type Yoga = { name: string; formed_by: string[]; description?: string };

export function PlanetsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const planets  = data?.planets  as Record<string, Planet>         | undefined;
  const shadbala = data?.shadbala as Record<string, ShadbalaPlanet> | undefined;
  const avasthas = data?.avasthas as Record<string, { avastha?: string; description?: string }> | undefined;
  const yogas    = data?.yogas    as Yoga[] | undefined;

  if (!planets) return null;

  const toggle = (name: string) =>
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="space-y-2">
      {PLANET_ORDER.map(name => {
        const p = planets[name];
        if (!p) return null;
        const isOpen = !!expanded[name];
        const sb = shadbala?.[name];
        const av = avasthas?.[name];
        const planetYogas = yogas?.filter(y => y.formed_by?.includes(name)) ?? [];

        return (
          <div
            key={name}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] overflow-hidden"
          >
            <button
              data-testid={`planet-card-${name}`}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-[var(--color-surface-hover)]/30 transition-colors"
              onClick={() => toggle(name)}
              aria-expanded={isOpen}
            >
              <span className="w-16 font-semibold text-sm text-[var(--color-ink-1)] shrink-0">
                {name}
                {p.is_retrograde && <span className="ml-1 text-orange-400 text-[10px]">℞</span>}
                {p.is_combust    && <span className="ml-1 text-red-400 text-[10px]">●</span>}
              </span>

              <span className="text-xs text-[var(--color-ink-2)] shrink-0">
                {p.sign ?? "—"} · H{p.house ?? "—"}
              </span>

              <span className={`text-xs shrink-0 ${DIGNITY_COLORS[p.dignity ?? ""] ?? "text-slate-300"}`}>
                {p.dignity ?? "—"}
              </span>

              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {p.nakshatra ?? "—"} P{p.pada ?? "—"}
              </span>

              <span className="text-muted-foreground text-xs shrink-0 ml-1">
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {isOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-[var(--color-border)]/50 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Aspects</p>
                  <p className="text-xs font-mono text-[var(--color-ink-3)]">{formatAspects(p.aspects)}</p>
                </div>

                {sb && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Shadbala</p>
                    <div className="space-y-1">
                      {SHADBALA_LABELS.map(({ key, label, max }) => {
                        const val = getShadbalaValue(sb, key);
                        const pct = val != null ? Math.min(val / max, 1) : 0;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-36 shrink-0">{label}</span>
                            <div className="flex-1 h-1.5 rounded bg-[var(--color-surface-2)] overflow-hidden">
                              <div className={`h-full rounded ${barColor(pct)}`} style={{ width: `${pct * 100}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-[var(--color-ink-3)] w-8 text-right">
                              {val != null ? val.toFixed(1) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex gap-4 text-xs text-[var(--color-ink-3)]">
                      <span>
                        Total:{" "}
                        <strong className="text-[var(--color-ink-1)]">
                          {sb.total_rupas != null ? sb.total_rupas.toFixed(1) : "—"}
                        </strong>
                        {sb.required_rupas != null && ` / ${sb.required_rupas.toFixed(1)} req`}
                      </span>
                      {sb.ishta_phala != null && (
                        <span>Ishta: <strong className="text-emerald-400">{sb.ishta_phala}</strong></span>
                      )}
                      {sb.kashta_phala != null && (
                        <span>Kashta: <strong className="text-red-400">{sb.kashta_phala}</strong></span>
                      )}
                    </div>
                  </div>
                )}

                {av && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Avastha</p>
                    <p className="text-xs text-[var(--color-ink-2)]">
                      <strong>{av.avastha}</strong>
                      {av.description && (
                        <span className="text-muted-foreground ml-1">— {av.description}</span>
                      )}
                    </p>
                  </div>
                )}

                {planetYogas.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Yogas</p>
                    <div className="flex flex-wrap gap-1">
                      {planetYogas.map(y => (
                        <span
                          key={y.name}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-accent)]/15 border border-[var(--color-accent)]/25 text-[var(--color-accent)]"
                        >
                          {y.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
