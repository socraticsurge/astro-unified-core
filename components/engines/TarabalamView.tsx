"use client";
import { useState, useEffect, useCallback } from "react";
import { SectionShell } from "./SectionShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Users, RefreshCw } from "lucide-react";
import type { Profile } from "@/lib/db";
import { taraColor, type Tara, type Tithi } from "@/lib/tarabalam";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type TaraRow = {
  date: string;
  transit_moon_nakshatra: string;
  tithi: Tithi | null;
  profile_taras: Record<string, Tara | null>;
};

type ApiResult = {
  profiles: { id: string; name: string; birth_moon_nakshatra: string | null }[];
  taras: TaraRow[];
};

type Props = {
  profileId: string;
  profiles: Profile[];
  explainer?: SectionExplainer | null;
};

function isoToday() {
  return new Date().toISOString().split("T")[0];
}
function isoPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function TarabalamView({ profileId, profiles, explainer }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([profileId]));
  const [startDate, setStartDate] = useState(isoToday());
  const [endDate, setEndDate] = useState(isoPlus(13));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResult | null>(null);

  const fetchTaras = useCallback(async (ids: string[], start: string, end: string) => {
    if (ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/readings/tarabalam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: ids,
          start_date: start,
          end_date: end,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Tarabalam");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount for the default selection
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTaras([profileId], startDate, endDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleProfile(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Don't allow deselecting the current profile if it's the only one
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSearch() {
    fetchTaras(Array.from(selectedIds), startDate, endDate);
  }

  // Profiles with result data (preserving API order)
  const resultProfiles = result?.profiles ?? [];

  // Determine which days are "all auspicious" for selected profiles with loaded charts
  function isAllAuspicious(row: TaraRow): boolean {
    const loaded = resultProfiles.filter(p => p.birth_moon_nakshatra !== null);
    if (loaded.length === 0) return false;
    return loaded.every(p => row.profile_taras[p.id]?.quality === "auspicious");
  }

  return (
    <SectionShell sectionInView="Tarabalam" explainer={explainer ?? null}>
      <div className="space-y-6">

        {/* Controls */}
        <div className="ac-card ac-card-pad space-y-4">
          {/* Profile selector */}
          {profiles.length > 1 && (
            <div className="space-y-2">
              <div className="ac-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Users className="h-3.5 w-3.5" />
                Profiles
              </div>
              <div className="ac-pills">
                {profiles.map(p => {
                  const checked = selectedIds.has(p.id);
                  const isCurrent = p.id === profileId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProfile(p.id)}
                      className={`ac-pill ${checked ? "cool" : ""}`}
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{
                        width: 14, height: 14, borderRadius: 3,
                        border: `1px solid ${checked ? "var(--color-cool)" : "var(--color-ink-3)"}`,
                        background: checked ? "var(--color-cool)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {checked && <span style={{ color: "var(--color-bg)", fontSize: 8, lineHeight: 1 }}>✓</span>}
                      </span>
                      {p.name}
                      {isCurrent && <span style={{ opacity: 0.6, fontSize: 10 }}>(you)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date range + Search */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-[var(--color-surface-1)] border-[var(--color-border)] h-9 text-sm w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-[var(--color-surface-1)] border-[var(--color-border)] h-9 text-sm w-40"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              size="sm"
              className="h-9 bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-button-fg)] gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {loading ? "Calculating…" : "Calculate"}
            </Button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="ac-banner warn">{error}</div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-[var(--color-success-faint)] border border-[var(--color-success-border)]" />
                Auspicious (2,4,6,8,9 — Sampat, Kshema, Sadhana, Mitra, Parama Mitra)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-[var(--color-danger-faint)] border border-[var(--color-danger-border)]" />
                Inauspicious (1,3,5,7 — Janma, Vipat, Pratyak, Naidana)
              </span>
            </div>

            {/* Missing chart notice */}
            {result.profiles.some(p => p.birth_moon_nakshatra === null) && (
              <div className="ac-banner accent">
                Some profiles have no chart yet — open their profile page to generate a chart, then return here.
              </div>
            )}

            {/* Grid */}
            <div className="ac-card overflow-x-auto">
              <table className="ac-table">
                <thead>
                  <tr>
                    <th style={{ whiteSpace: "nowrap" }}>Date</th>
                    <th style={{ whiteSpace: "nowrap" }}>Moon in</th>
                    <th style={{ whiteSpace: "nowrap" }}>Tithi</th>
                    {resultProfiles.map(p => (
                      <th key={p.id} style={{ whiteSpace: "nowrap" }}>
                        {p.name}
                        {p.id === profileId && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>(you)</span>}
                        {p.birth_moon_nakshatra && (
                          <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.6 }}>
                            born: {p.birth_moon_nakshatra}
                          </div>
                        )}
                      </th>
                    ))}
                    {resultProfiles.length > 1 && (
                      <th style={{ whiteSpace: "nowrap" }}>All ✦</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.taras.map((row) => {
                    const allGood = isAllAuspicious(row);
                    return (
                      <tr
                        key={row.date}
                        style={allGood ? { background: "var(--color-success-faint)" } : {}}
                      >
                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(row.date)}</td>
                        <td className="muted" style={{ whiteSpace: "nowrap" }}>{row.transit_moon_nakshatra}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {row.tithi ? (
                            <span
                              title={`Tithi ${row.tithi.number} — ${row.tithi.paksha ? row.tithi.paksha + " " : ""}${row.tithi.name}`}
                              style={{
                                fontSize: 11, fontWeight: 500,
                                color: row.tithi.number === 15 ? "var(--color-warning)"
                                  : row.tithi.number === 30 ? "var(--color-ink-4)"
                                  : "var(--color-cool)",
                              }}
                            >
                              {row.tithi.label}
                            </span>
                          ) : (
                            <span className="ac-dash" style={{ fontSize: 10 }}>–</span>
                          )}
                        </td>
                        {resultProfiles.map(p => {
                          const tara = row.profile_taras[p.id];
                          if (!tara) {
                            return (
                              <td key={p.id} className="py-2 pr-3">
                                <span className="text-[10px] text-muted-foreground/40 italic">–</span>
                              </td>
                            );
                          }
                          return (
                            <td key={p.id} className="py-2 pr-3">
                              <span
                                title={tara.description}
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${taraColor(tara.quality)}`}
                              >
                                <span className="text-[9px] opacity-70">{tara.number}</span>
                                {tara.name}
                              </span>
                            </td>
                          );
                        })}
                        {resultProfiles.length > 1 && (
                          <td className="py-2">
                            {allGood ? (
                              <span className="text-[var(--color-success)] text-sm">✦</span>
                            ) : (
                              <span className="text-muted-foreground/20 text-sm">·</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-muted-foreground/50">
              Moon position extrapolated from today&apos;s transit using mean daily motion (13.18°/day). Consult an ephemeris for precision timings.
            </p>
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 13, fontStyle: "italic", color: "var(--color-ink-3)", border: "1px dashed var(--color-border)", borderRadius: 10 }}>
            Select profiles and a date range, then click Calculate.
          </div>
        )}
      </div>
    </SectionShell>
  );
}
