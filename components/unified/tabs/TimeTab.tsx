"use client";
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANET_ORDER } from "@/components/unified/types";
import { cn } from "@/lib/utils";

const DASHA_LEVELS = [
  { key: "maha",       label: "Maha Dasha" },
  { key: "antar",      label: "Antar"      },
  { key: "pratyantar", label: "Pratyantar" },
  { key: "sukshma",    label: "Sukshma"    },
  { key: "prana",      label: "Prana"      },
];

type DashaEntry = { planet?: string; start?: string; end?: string };

type TimeSubTab = 'current' | 'timeline' | 'transits' | 'career';

const TIME_TABS: { id: TimeSubTab; label: string }[] = [
  { id: 'current',  label: 'Current Period' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'transits', label: 'Transits' },
  { id: 'career',   label: 'Career' },
];

export function TimeTab({
  chartOutput,
  transitOutput,
  careerOutput,
  isTransitLoading,
  isCareerLoading,
  onFetchTransit,
  onFetchCareer,
}: {
  chartOutput: Record<string, unknown>;
  transitOutput: Record<string, unknown> | null;
  careerOutput: Record<string, unknown> | null;
  isTransitLoading: boolean;
  isCareerLoading: boolean;
  onFetchTransit: (force?: boolean) => void;
  onFetchCareer: (force?: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<TimeSubTab>('current');

  const data   = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as (Record<string, DashaEntry> & { timeline?: DashaEntry[] }) | undefined;

  // transit/career may be wrapped or not — handle both
  const transit = ((transitOutput as Record<string, unknown> | null)?.data ?? transitOutput) as Record<string, unknown> | null;
  const career  = ((careerOutput  as Record<string, unknown> | null)?.data ?? careerOutput)  as Record<string, unknown> | null;

  useEffect(() => {
    if (activeTab === 'transits' && !transitOutput && !isTransitLoading) onFetchTransit();
    if (activeTab === 'career'   && !careerOutput  && !isCareerLoading)  onFetchCareer();
  }, [activeTab, transitOutput, isTransitLoading, careerOutput, isCareerLoading, onFetchTransit, onFetchCareer]);

  const transitPlanets = transit?.planets as Record<string, { sign?: string; is_retrograde?: boolean; house_from_lagna?: number; house_from_moon?: number; sav_points?: number }> | undefined;
  const sadeSati       = transit?.sade_sati as { active?: boolean; phase?: string } | undefined;
  const rahuKetu       = transit?.rahu_ketu_axis as { rahu_sign?: string; rahu_house_from_lagna?: number; ketu_sign?: string; ketu_house_from_lagna?: number } | undefined;

  const careerData     = career as { tenth_house?: { sign?: string; lord?: string; lord_house?: number; lord_d10?: string }; career_themes?: string[]; strength_factors?: string[] } | null;

  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div role="tablist" className="flex gap-1.5 mb-5">
        {TIME_TABS.map(t => (
          <button
            key={t.id}
            id={`timetab-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            aria-controls={`timetab-panel-${t.id}`}
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

      {/* Current Period sub-tab */}
      {activeTab === 'current' && (
        <section id="timetab-panel-current" role="tabpanel" aria-labelledby="timetab-tab-current" tabIndex={0}>
          {dashas && (
            <>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Current Dasha Period (Vimshottari)
              </h3>
              <div className="space-y-1">
                {DASHA_LEVELS.map(({ key, label }, depth) => {
                  const d = dashas[key];
                  if (!d) return null;
                  return (
                    <div
                      key={key}
                      style={{ paddingLeft: `${depth * 16}px` }}
                      className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]"
                    >
                      <span className="text-xs uppercase tracking-wider text-muted-foreground w-20">{label}</span>
                      <span className="font-semibold text-sm text-[var(--color-ink-1)] w-20">{d.planet}</span>
                      <span className="text-xs text-muted-foreground">{d.start} → {d.end}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* Timeline sub-tab */}
      {activeTab === 'timeline' && (
        <section id="timetab-panel-timeline" role="tabpanel" aria-labelledby="timetab-tab-timeline" tabIndex={0}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Vimshottari Maha Dasha Timeline
          </h3>
          {!dashas?.timeline || dashas.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Timeline data not available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {["Planet","Start","End","Duration"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashas.timeline.map((t, i) => {
                    const isCurrent = dashas.maha?.planet === t.planet && dashas.maha?.start === t.start;
                    const startMs = t.start ? new Date(t.start).getTime() : NaN;
                    const endMs   = t.end   ? new Date(t.end).getTime()   : NaN;
                    const years   = !isNaN(startMs) && !isNaN(endMs)
                      ? ((endMs - startMs) / (365.25 * 24 * 3600 * 1000)).toFixed(1)
                      : "—";
                    return (
                      <tr
                        key={i}
                        className={cn(
                          "border-b border-[var(--color-border)]/50 transition-colors",
                          isCurrent
                            ? "bg-[var(--color-nav-chip-active-bg)]"
                            : "hover:bg-[var(--color-surface-hover)]/20"
                        )}
                      >
                        <td className={cn("py-2 px-3 font-semibold", isCurrent ? "text-[var(--color-nav-chip-active-text)]" : "text-[var(--color-ink-1)]")}>
                          {t.planet ?? "—"}
                          {isCurrent && <span className="ml-1.5 text-xs opacity-70">← now</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-xs text-[var(--color-ink-3)]">{t.start ?? "—"}</td>
                        <td className="py-2 px-3 font-mono text-xs text-[var(--color-ink-3)]">{t.end ?? "—"}</td>
                        <td className="py-2 px-3 text-xs text-muted-foreground">{years} yr</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Transits sub-tab */}
      {activeTab === 'transits' && (
        <section id="timetab-panel-transits" role="tabpanel" aria-labelledby="timetab-tab-transits" tabIndex={0}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Transits
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFetchTransit(true)}
              disabled={isTransitLoading}
              className="h-6 text-xs gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isTransitLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isTransitLoading && <p className="text-xs text-muted-foreground">Loading transits…</p>}

          {transit && (
            <>
              {sadeSati?.active && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs">
                  Sade Sati active · {sadeSati.phase} phase
                </div>
              )}

              {rahuKetu && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)] text-xs flex gap-6">
                  <span>Rahu: {rahuKetu.rahu_sign} (H{rahuKetu.rahu_house_from_lagna})</span>
                  <span>Ketu: {rahuKetu.ketu_sign} (H{rahuKetu.ketu_house_from_lagna})</span>
                </div>
              )}

              {transitPlanets && (
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        {["Planet", "Transit Sign", "H/Lagna", "H/Moon", "SAV"].map(h => (
                          <th key={h} className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PLANET_ORDER.map(name => {
                        const t = transitPlanets[name];
                        if (!t) return null;
                        const savVal = t.sav_points ?? 0;
                        return (
                          <tr key={name} className="border-b border-[var(--color-border)]/40">
                            <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-1)]">
                              {name}
                              {t.is_retrograde && <span className="ml-1 text-orange-400">℞</span>}
                            </td>
                            <td className="py-1.5 px-2 text-[var(--color-ink-2)]">{t.sign}</td>
                            <td className="py-1.5 px-2 text-center text-muted-foreground">{t.house_from_lagna}</td>
                            <td className="py-1.5 px-2 text-center text-muted-foreground">{t.house_from_moon}</td>
                            <td className={`py-1.5 px-2 text-center font-bold font-mono ${savVal >= 30 ? "text-emerald-400" : savVal <= 22 ? "text-red-400" : "text-muted-foreground"}`}>
                              {savVal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Career sub-tab */}
      {activeTab === 'career' && (
        <section id="timetab-panel-career" role="tabpanel" aria-labelledby="timetab-tab-career" tabIndex={0}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Career — D10 Dashamsha
            </h3>
            {!careerData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFetchCareer(true)}
                disabled={isCareerLoading}
                className="h-6 text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isCareerLoading ? "animate-spin" : ""}`} />
                Load
              </Button>
            )}
          </div>

          {isCareerLoading && <p className="text-xs text-muted-foreground">Loading career analysis…</p>}

          {careerData && (
            <div className="space-y-3">
              {careerData.tenth_house && (
                <div className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">10th House (Karma Bhava)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>Sign: <strong className="text-[var(--color-ink-1)]">{careerData.tenth_house.sign}</strong></span>
                    <span>Lord: <strong className="text-sky-300">{careerData.tenth_house.lord}</strong></span>
                    <span>Lord&apos;s house: <strong className="text-[var(--color-ink-2)]">{careerData.tenth_house.lord_house}</strong></span>
                    <span>Lord&apos;s D10: <strong className="text-[var(--color-ink-2)]">{careerData.tenth_house.lord_d10 ?? "—"}</strong></span>
                  </div>
                </div>
              )}

              {careerData.career_themes && careerData.career_themes.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Career Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {careerData.career_themes.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-ink-2)]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {careerData.strength_factors && careerData.strength_factors.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Indicators</p>
                  <ul className="space-y-0.5">
                    {careerData.strength_factors.map(f => (
                      <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">·</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
