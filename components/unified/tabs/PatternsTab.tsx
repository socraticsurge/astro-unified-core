"use client";
import { useState } from "react";
import { SIGNS_ORDER } from "@/components/unified/types";
import type { SignName } from "@/components/unified/types";
import { SavChartGrid } from "@/components/unified/SavChartGrid";
import { cn } from "@/lib/utils";

const MAJOR_YOGAS = new Set([
  "Malavya Yoga", "Shasha Yoga", "Bhadra Yoga", "Hamsa Yoga", "Ruchaka Yoga",
  "Gajakesari Yoga", "Raj Yoga", "Lakshmi Yoga", "Adhi Yoga",
]);

const KARAKA_ORDER = [
  "Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka",
  "Putrakaraka", "Gnatikaraka", "Darakaraka",
];

const th = "text-left py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const td = "py-1.5 px-2 text-xs text-[var(--color-ink-2)]";

type Yoga = { name: string; formed_by?: string[]; description?: string };
type GrahaYuddha = { winner?: string; loser?: string; description?: string };
type Gandanta = { planet?: string; sign?: string; degree?: number; nakshatra?: string; description?: string };
type KarakaEntry = { planet?: string; description?: string };
type ArudhaPada = { name?: string; sign?: string };

type PatternsSubTab = 'yogas' | 'doshas' | 'jaimini' | 'ashtakavarga';

const PATTERNS_TABS: { id: PatternsSubTab; label: string }[] = [
  { id: 'yogas',        label: 'Yogas' },
  { id: 'doshas',       label: 'Doshas' },
  { id: 'jaimini',      label: 'Jaimini' },
  { id: 'ashtakavarga', label: 'Ashtakavarga' },
];

export function PatternsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<PatternsSubTab>('yogas');
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const yogas        = (data?.yogas        as Yoga[]                           | undefined) ?? [];
  const kaalSarpa    = data?.kaal_sarpa    as { type?: string; direction?: string; description?: string } | undefined;
  const grahaYuddha  = (data?.graha_yuddha as GrahaYuddha[]                    | undefined) ?? [];
  const gandanta     = (data?.gandanta     as Gandanta[]                        | undefined) ?? [];
  const jaiminiKarakas = data?.jaimini_karakas as Record<string, KarakaEntry>  | undefined;
  const karakamsha   = data?.karakamsha   as {
    atmakaraka?: string; karakamsha_sign?: string; ishta_devata?: string;
    planets_in_karakamsha?: string[];
  } | undefined;
  const arudhaPadas  = data?.arudha_padas as Record<string, ArudhaPada>        | undefined;
  const upapada      = data?.upapada      as { sign?: string; lord?: string; second_from_ul?: string; description?: string } | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown>           | undefined;

  const sav = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga as Record<string, Record<string, number>> | undefined;

  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div role="tablist" className="flex gap-1.5 mb-5">
        {PATTERNS_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-3 py-1.5 rounded text-xs border transition-colors',
              activeTab === t.id
                ? 'text-[var(--color-ink-1)] border-[var(--color-border-strong,#2a2a3e)] bg-[var(--color-surface-2)]'
                : 'text-muted-foreground border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong,#2a2a3e)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'yogas' && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Yogas ({yogas.length})
          </h3>
          {yogas.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No yoga data available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {yogas.map((y, i) => (
                <div
                  key={`${y.name}-${i}`}
                  className={`p-3 rounded-lg border ${
                    MAJOR_YOGAS.has(y.name)
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-semibold text-sm ${MAJOR_YOGAS.has(y.name) ? "text-amber-300" : "text-[var(--color-ink-1)]"}`}>
                      {y.name}
                      {MAJOR_YOGAS.has(y.name) && (
                        <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wide">
                          Major
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1 flex-wrap">
                      {y.formed_by?.map(p => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-xs text-[var(--color-ink-3)] font-medium">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {y.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{y.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'doshas' && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Doshas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border ${kaalSarpa ? "border-red-500/40 bg-red-500/5" : "border-[var(--color-border)] bg-[var(--color-surface-1)]"}`}>
              <p className="font-semibold text-sm text-[var(--color-ink-1)]">Kaal Sarpa</p>
              {kaalSarpa ? (
                <>
                  <p className="text-xs text-red-300 mt-0.5">{kaalSarpa.type} · {kaalSarpa.direction}</p>
                  {kaalSarpa.description && (
                    <p className="text-xs text-muted-foreground mt-1">{kaalSarpa.description}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-emerald-400 mt-0.5">Not detected</p>
              )}
            </div>

            {grahaYuddha.length > 0 && (
              <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                <p className="font-semibold text-sm text-[var(--color-ink-1)] mb-2">
                  Graha Yuddha — Planetary Wars ({grahaYuddha.length})
                </p>
                {grahaYuddha.map((gw, i) => (
                  <div key={i} className="text-xs text-muted-foreground mb-1">
                    <span className="text-orange-300 font-semibold">{gw.winner}</span>
                    <span className="mx-1">defeats</span>
                    <span className="text-red-400">{gw.loser}</span>
                    {gw.description && (
                      <span className="ml-2 text-muted-foreground/60">({gw.description})</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {gandanta.length > 0 && (
              <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
                <p className="font-semibold text-sm text-[var(--color-ink-1)] mb-2">
                  Gandanta — Karmic Junctions ({gandanta.length})
                </p>
                {gandanta.map((g, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <span className="text-purple-300 font-semibold">{g.planet}</span>
                    {" "}{g.sign} {g.degree?.toFixed(2)}° · {g.nakshatra}
                    {g.description && (
                      <span className="ml-2 text-muted-foreground/60">({g.description})</span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'jaimini' && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Jaimini — Soul Indicators
          </h3>

          {jaiminiKarakas && (
            <div className="overflow-x-auto mb-4">
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {["Karaka", "Planet", "Description"].map(h => (
                      <th key={h} className={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KARAKA_ORDER.map(k => {
                    const entry = jaiminiKarakas[k];
                    if (!entry) return null;
                    return (
                      <tr key={k} className="border-b border-[var(--color-border)]/40">
                        <td className="py-1.5 px-2 text-xs font-semibold text-[var(--color-ink-2)]">{k}</td>
                        <td className={`${td} text-sky-300 font-semibold`}>{entry.planet}</td>
                        <td className={`${td} text-muted-foreground`}>{entry.description ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {karakamsha && (
            <div className="p-4 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5 mb-4">
              <p className="text-xs uppercase tracking-wider text-[var(--color-accent-dim)] font-bold mb-2">
                Karakamsha — Soul&apos;s Direction
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Atmakaraka</p>
                  <p className="font-semibold text-[var(--color-ink-1)]">{karakamsha.atmakaraka}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Karakamsha sign</p>
                  <p className="font-semibold text-[var(--color-ink-1)]">{karakamsha.karakamsha_sign}</p>
                </div>
                {karakamsha.ishta_devata && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Ishta Devata</p>
                    <p className="font-semibold text-amber-300 text-base">{karakamsha.ishta_devata}</p>
                  </div>
                )}
                {karakamsha.planets_in_karakamsha && karakamsha.planets_in_karakamsha.length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Planets in Karakamsha</p>
                    <div className="flex gap-1 flex-wrap">
                      {karakamsha.planets_in_karakamsha.map(p => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-ink-2)]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {arudhaPadas && (
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Arudha Padas</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {Object.entries(arudhaPadas).map(([num, v]) => (
                  <div key={num} className="p-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)] text-center">
                    <p className="text-xs text-muted-foreground">{v.name ?? `A${num}`}</p>
                    <p className="text-xs font-semibold text-[var(--color-ink-1)]">{v.sign}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upapada && (
            <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Upapada (A12) — Spouse Indicator
              </p>
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">UL sign</p>
                  <p className="font-semibold text-[var(--color-ink-1)]">{upapada.sign}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lord</p>
                  <p className="font-semibold text-sky-300">{upapada.lord}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">2nd from UL</p>
                  <p className="font-semibold text-[var(--color-ink-2)]">{upapada.second_from_ul}</p>
                </div>
              </div>
              {upapada.description && (
                <p className="text-xs text-muted-foreground mt-2">{upapada.description}</p>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'ashtakavarga' && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Ashtakavarga
          </h3>

          {sav && (
            <div className="mb-6">
              <SavChartGrid
                sav={sav}
                lagnaSign={
                  ((chartOutput?.data as Record<string, unknown> | undefined)
                    ?.lagna as Record<string, unknown> | undefined)
                    ?.sign as SignName | undefined
                }
              />
            </div>
          )}

          {bav && (
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-2">
                Bhinnashtakavarga (BAV) — per planet
              </p>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className={th}>Planet</th>
                      {SIGNS_ORDER.map(s => (
                        <th key={s} className="py-1.5 px-1.5 text-center text-xs font-medium text-muted-foreground">
                          {s.slice(0, 3)}
                        </th>
                      ))}
                      <th className="py-1.5 px-2 text-center text-xs font-medium text-muted-foreground">Σ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(bav).map(([planet, scores]) => {
                      const total = SIGNS_ORDER.reduce((acc, sign) => acc + (scores[sign] ?? 0), 0);
                      return (
                        <tr key={planet} className="border-b border-[var(--color-border)]/40">
                          <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-2)]">{planet}</td>
                          {SIGNS_ORDER.map(sign => {
                            const val = scores[sign] ?? 0;
                            return (
                              <td
                                key={sign}
                                className={`py-1.5 px-1.5 text-center font-mono ${
                                  val >= 6 ? "text-emerald-400 font-bold" : val <= 2 ? "text-red-400" : "text-muted-foreground"
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}
                          <td className="py-1.5 px-2 text-center font-bold text-[var(--color-ink-2)]">{total}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!sav && !bav && (
            <p className="text-xs text-muted-foreground italic">Ashtakavarga data not available.</p>
          )}
        </section>
      )}

    </div>
  );
}
