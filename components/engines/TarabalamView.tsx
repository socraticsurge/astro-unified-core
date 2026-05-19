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

  const currentProfile = profiles.find(p => p.id === profileId);

  return (
    <SectionShell sectionInView="Tarabalam" explainer={explainer ?? null}>
      <div className="space-y-6">

        {/* Controls */}
        <div className="space-y-4 bg-[var(--color-surface-1)] p-4 rounded-xl border border-[var(--color-border)]">
          {/* Profile selector */}
          {profiles.length > 1 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" />
                Profiles
              </div>
              <div className="flex flex-wrap gap-2">
                {profiles.map(p => {
                  const checked = selectedIds.has(p.id);
                  const isCurrent = p.id === profileId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProfile(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        checked
                          ? "bg-violet-900/40 border-violet-600/60 text-violet-200"
                          : "bg-[var(--color-surface-1)] border-[var(--color-border)] text-muted-foreground hover:border-[var(--color-border)] hover:text-foreground"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-violet-500 border-violet-500" : "border-[var(--color-ink-3)]"}`}>
                        {checked && <span className="text-[var(--color-button-fg)] text-[8px] leading-none">✓</span>}
                      </span>
                      {p.name}
                      {isCurrent && <span className="text-violet-400/70 text-[10px]">(you)</span>}
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
          <div className="p-4 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-emerald-800/60 border border-emerald-700/40" />
                Auspicious (2,4,6,8,9 — Sampat, Kshema, Sadhana, Mitra, Parama Mitra)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-red-900/40 border border-red-700/30" />
                Inauspicious (1,3,5,7 — Janma, Vipat, Pratyak, Naidana)
              </span>
            </div>

            {/* Missing chart notice */}
            {result.profiles.some(p => p.birth_moon_nakshatra === null) && (
              <div className="text-xs text-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] border border-[var(--color-accent-dim)] rounded-lg px-3 py-2">
                Some profiles have no chart yet — open their profile page to generate a chart, then return here.
              </div>
            )}

            {/* Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium whitespace-nowrap">Date</th>
                    <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium whitespace-nowrap">Moon in</th>
                    <th className="text-left py-2 pr-4 text-xs text-muted-foreground font-medium whitespace-nowrap">Tithi</th>
                    {resultProfiles.map(p => (
                      <th key={p.id} className="text-left py-2 pr-3 text-xs text-muted-foreground font-medium whitespace-nowrap">
                        {p.name}
                        {p.id === profileId && <span className="text-violet-400/70 text-[10px] ml-1">(you)</span>}
                        {p.birth_moon_nakshatra && (
                          <div className="font-normal text-[10px] text-muted-foreground/60">
                            born: {p.birth_moon_nakshatra}
                          </div>
                        )}
                      </th>
                    ))}
                    {resultProfiles.length > 1 && (
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium whitespace-nowrap">All ✦</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.taras.map((row) => {
                    const allGood = isAllAuspicious(row);
                    return (
                      <tr
                        key={row.date}
                        className={`border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-1)] ${allGood ? "bg-emerald-950/10" : ""}`}
                      >
                        <td className="py-2 pr-4 whitespace-nowrap text-foreground/80 text-xs">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                          {row.transit_moon_nakshatra}
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap">
                          {row.tithi ? (
                            <span
                              title={`Tithi ${row.tithi.number} — ${row.tithi.paksha ? row.tithi.paksha + " " : ""}${row.tithi.name}`}
                              className={`text-[11px] font-medium ${
                                row.tithi.number === 15 ? "text-amber-300" :
                                row.tithi.number === 30 ? "text-zinc-400" :
                                "text-sky-300/80"
                              }`}
                            >
                              {row.tithi.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-[10px]">–</span>
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
                              <span className="text-emerald-400 text-sm">✦</span>
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
          <div className="py-10 text-center text-sm text-muted-foreground italic border border-dashed border-[var(--color-border)] rounded-lg">
            Select profiles and a date range, then click Calculate.
          </div>
        )}
      </div>
    </SectionShell>
  );
}
