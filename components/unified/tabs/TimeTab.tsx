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
type TimeSubTab = "current" | "timeline" | "transits" | "career";

const TIME_TABS: { id: TimeSubTab; label: string }[] = [
  { id: "current",  label: "Current Period" },
  { id: "timeline", label: "Timeline"       },
  { id: "transits", label: "Transits"       },
  { id: "career",   label: "Career"         },
];

const PERIOD_PL = ["pl-0", "pl-4", "pl-8", "pl-12", "pl-16"] as const;

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
  const [activeTab, setActiveTab] = useState<TimeSubTab>("current");

  const data   = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as (Record<string, DashaEntry> & { timeline?: DashaEntry[] }) | undefined;

  const transit    = ((transitOutput as Record<string, unknown> | null)?.data ?? transitOutput) as Record<string, unknown> | null;
  const career     = ((careerOutput  as Record<string, unknown> | null)?.data ?? careerOutput)  as Record<string, unknown> | null;

  useEffect(() => {
    if (activeTab === "transits" && !transitOutput && !isTransitLoading) onFetchTransit();
    if (activeTab === "career"   && !careerOutput  && !isCareerLoading)  onFetchCareer();
  }, [activeTab, transitOutput, isTransitLoading, careerOutput, isCareerLoading, onFetchTransit, onFetchCareer]);

  const transitPlanets = transit?.planets as Record<string, {
    sign?: string; is_retrograde?: boolean;
    house_from_lagna?: number; house_from_moon?: number; sav_points?: number;
  }> | undefined;
  const sadeSati   = transit?.sade_sati as { active?: boolean; phase?: string } | undefined;
  const rahuKetu   = transit?.rahu_ketu_axis as { rahu_sign?: string; rahu_house_from_lagna?: number; ketu_sign?: string; ketu_house_from_lagna?: number } | undefined;
  const careerData = career as { tenth_house?: { sign?: string; lord?: string; lord_house?: number; lord_d10?: string }; career_themes?: string[]; strength_factors?: string[] } | null;

  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div role="tablist" className="flex gap-1.5 mb-5">
        {TIME_TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={activeTab === t.id}
            aria-controls={`timetab-panel-${t.id}`}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded text-xs border transition-colors",
              activeTab === t.id
                ? "text-[var(--color-ink-1)] border-[var(--color-border-strong,var(--color-border))] bg-[var(--color-surface-2)]"
                : "text-[var(--color-ink-3)] border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong,var(--color-border))]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Current Period */}
      {activeTab === "current" && (
        <section id="timetab-panel-current" role="tabpanel" tabIndex={0}>
          {dashas ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {DASHA_LEVELS.map(({ key, label }, depth) => {
                const d = dashas[key];
                if (!d?.planet) return null;
                return (
                  <div key={key} className={cn("ac-dasha-row current", PERIOD_PL[depth])}>
                    <span className="level">{label}</span>
                    <span className="planet-name">{d.planet}</span>
                    <span className="range">{d.start} → {d.end}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>No dasha data.</p>
          )}
        </section>
      )}

      {/* Timeline */}
      {activeTab === "timeline" && (
        <section id="timetab-panel-timeline" role="tabpanel" tabIndex={0}>
          <div className="ac-eyebrow" style={{ marginBottom: 10 }}>Vimshottari Maha Dasha Timeline</div>
          {!dashas?.timeline || dashas.timeline.length === 0 ? (
            <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--color-ink-3)" }}>Timeline data not available.</p>
          ) : (
            <div className="ac-card overflow-x-auto">
              <table className="ac-table">
                <thead>
                  <tr>{["Planet","Start","End","Duration"].map(h => <th key={h}>{h}</th>)}</tr>
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
                      <tr key={i} style={isCurrent ? { background: "var(--color-accent-faint)" } : {}}>
                        <td className="planet" style={isCurrent ? { color: "var(--color-accent)" } : {}}>
                          {t.planet ?? "—"}
                          {isCurrent && <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.6 }}>← now</span>}
                        </td>
                        <td className="num">{t.start ?? "—"}</td>
                        <td className="num">{t.end ?? "—"}</td>
                        <td className="muted">{years} yr</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Transits */}
      {activeTab === "transits" && (
        <section id="timetab-panel-transits" role="tabpanel" tabIndex={0}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="ac-eyebrow">Today&apos;s Transits</div>
            <Button variant="ghost" size="sm" onClick={() => onFetchTransit(true)} disabled={isTransitLoading} className="h-6 text-xs gap-1">
              <RefreshCw className={`h-3 w-3 ${isTransitLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isTransitLoading && <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>Loading transits…</p>}

          {transit && (
            <>
              {sadeSati?.active && (
                <div className="ac-banner warn" style={{ marginBottom: 10 }}>
                  Sade Sati active · {sadeSati.phase} phase
                </div>
              )}

              {rahuKetu && (
                <div className="ac-card ac-card-pad-sm" style={{ marginBottom: 10, fontSize: 12, display: "flex", gap: 20 }}>
                  <span style={{ color: "var(--color-ink-2)" }}>Rahu: <strong style={{ color: "var(--color-cool)" }}>{rahuKetu.rahu_sign}</strong> H{rahuKetu.rahu_house_from_lagna}</span>
                  <span style={{ color: "var(--color-ink-2)" }}>Ketu: <strong style={{ color: "var(--color-cool)" }}>{rahuKetu.ketu_sign}</strong> H{rahuKetu.ketu_house_from_lagna}</span>
                </div>
              )}

              {transitPlanets && (
                <div className="ac-card overflow-x-auto">
                  <table className="ac-table">
                    <thead>
                      <tr>{["Planet","Sign","H/Lagna","H/Moon","SAV"].map(h => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {PLANET_ORDER.map(name => {
                        const p = transitPlanets[name];
                        if (!p) return null;
                        const savVal = p.sav_points ?? 0;
                        const savCls = savVal >= 30 ? "ac-cell-good" : savVal <= 22 ? "ac-cell-bad" : "";
                        return (
                          <tr key={name}>
                            <td className="planet">
                              {name}
                              {p.is_retrograde && <span className="ac-retro" style={{ marginLeft: 4 }}>℞</span>}
                            </td>
                            <td>{p.sign ?? "—"}</td>
                            <td className="num right">{p.house_from_lagna ?? "—"}</td>
                            <td className="num right">{p.house_from_moon ?? "—"}</td>
                            <td className={`num right ${savCls}`}>{savVal}</td>
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

      {/* Career */}
      {activeTab === "career" && (
        <section id="timetab-panel-career" role="tabpanel" tabIndex={0}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div className="ac-eyebrow">Career — D10 Dashamsha</div>
            {!careerData && (
              <Button variant="ghost" size="sm" onClick={() => onFetchCareer(true)} disabled={isCareerLoading} className="h-6 text-xs gap-1">
                <RefreshCw className={`h-3 w-3 ${isCareerLoading ? "animate-spin" : ""}`} />
                Load
              </Button>
            )}
          </div>

          {isCareerLoading && <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>Loading career analysis…</p>}

          {careerData && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {careerData.tenth_house && (
                <div className="ac-card ac-card-pad">
                  <div className="ac-eyebrow" style={{ marginBottom: 8 }}>10th House (Karma Bhava)</div>
                  <div className="ac-kv">
                    <div><span className="k">Sign</span><span className="v">{careerData.tenth_house.sign ?? "—"}</span></div>
                    <div><span className="k">Lord</span><span className="v cool">{careerData.tenth_house.lord ?? "—"}</span></div>
                    <div><span className="k">Lord&apos;s house</span><span className="v">{careerData.tenth_house.lord_house ?? "—"}</span></div>
                    <div><span className="k">Lord&apos;s D10</span><span className="v">{careerData.tenth_house.lord_d10 ?? "—"}</span></div>
                  </div>
                </div>
              )}

              {careerData.career_themes && careerData.career_themes.length > 0 && (
                <div>
                  <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Career Themes</div>
                  <div className="ac-pills">
                    {careerData.career_themes.map(t => (
                      <span key={t} className="ac-pill cool">{t.replace(/_/g, " ")}</span>
                    ))}
                  </div>
                </div>
              )}

              {careerData.strength_factors && careerData.strength_factors.length > 0 && (
                <div>
                  <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Indicators</div>
                  <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {careerData.strength_factors.map(f => (
                      <li key={f} style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--color-ink-3)" }}>
                        <span style={{ color: "var(--color-success)", flexShrink: 0 }}>·</span>{f}
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
