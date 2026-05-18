"use client";
import { useState } from "react";
import { SectionHeading } from "@/components/unified/SectionHeading";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DASHA_LEVELS = [
  { key: "maha",       label: "Maha Dasha" },
  { key: "antar",      label: "Antar"      },
  { key: "pratyantar", label: "Pratyantar" },
  { key: "sukshma",    label: "Sukshma"    },
  { key: "prana",      label: "Prana"      },
];

type DashaEntry = { planet?: string; start?: string; end?: string };
type MahaEntry  = DashaEntry & { antardashas?: DashaEntry[] };

function dashaYears(start?: string, end?: string): string {
  const s = start ? new Date(start).getTime() : NaN;
  const e = end   ? new Date(end).getTime()   : NaN;
  if (isNaN(s) || isNaN(e)) return "—";
  return ((e - s) / (365.25 * 24 * 3600 * 1000)).toFixed(1);
}

export function DashaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data   = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as (Record<string, DashaEntry> & { timeline?: MahaEntry[] }) | undefined;

  const [expandedMaha, setExpandedMaha] = useState<string | null>(() => {
    // Auto-expand the current maha dasha on first render
    return dashas?.maha?.planet && dashas?.maha?.start
      ? `${dashas.maha.planet}-${dashas.maha.start}`
      : null;
  });

  const toggleMaha = (key: string) =>
    setExpandedMaha(prev => (prev === key ? null : key));

  return (
    <div className="space-y-8">

      {/* Current dasha period — 5-level stack */}
      {dashas && (
        <section>
          <SectionHeading>Current Dasha Period (Vimshottari)</SectionHeading>
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
        </section>
      )}

      {/* Maha Dasha timeline with antardasha accordion */}
      <section>
        <SectionHeading>Vimshottari Maha Dasha Timeline</SectionHeading>
        {!dashas?.timeline || dashas.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Timeline data not available.</p>
        ) : (
          <div className="space-y-0.5">
            {dashas.timeline.map((t, i) => {
              const isCurrent = dashas.maha?.planet === t.planet && dashas.maha?.start === t.start;
              const rowKey = `${t.planet}-${t.start}`;
              const isOpen = expandedMaha === rowKey;
              const hasAntar = t.antardashas && t.antardashas.length > 0;

              return (
                <div key={i} className="rounded-lg overflow-hidden border border-[var(--color-border)]/50">
                  {/* Maha row */}
                  <button
                    type="button"
                    onClick={() => hasAntar && toggleMaha(rowKey)}
                    className={cn(
                      "w-full flex items-center gap-3 py-2 px-3 text-left transition-colors",
                      isCurrent
                        ? "bg-[var(--color-nav-chip-active-bg)]"
                        : "bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-hover)]/20",
                      !hasAntar && "cursor-default"
                    )}
                  >
                    {/* Expand icon */}
                    <span className="text-muted-foreground/40 w-3 shrink-0">
                      {hasAntar
                        ? isOpen
                          ? <ChevronDown className="h-3 w-3" />
                          : <ChevronRight className="h-3 w-3" />
                        : null}
                    </span>
                    <span className={cn(
                      "font-semibold text-sm w-24",
                      isCurrent ? "text-[var(--color-nav-chip-active-text)]" : "text-[var(--color-ink-1)]"
                    )}>
                      {t.planet ?? "—"}
                      {isCurrent && <span className="ml-1.5 text-xs opacity-70">← now</span>}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-ink-3)] w-28">{t.start ?? "—"}</span>
                    <span className="font-mono text-xs text-[var(--color-ink-3)] w-28">{t.end ?? "—"}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{dashaYears(t.start, t.end)} yr</span>
                  </button>

                  {/* Antardasha rows */}
                  {isOpen && hasAntar && (
                    <div className="border-t border-[var(--color-border)]/30">
                      {t.antardashas!.map((a, j) => {
                        const isCurrentAntar =
                          isCurrent &&
                          dashas.antar?.planet === a.planet &&
                          dashas.antar?.start === a.start;
                        return (
                          <div
                            key={j}
                            className={cn(
                              "flex items-center gap-3 py-1.5 px-3 pl-8 text-xs border-b border-[var(--color-border)]/20 last:border-0",
                              isCurrentAntar
                                ? "bg-[var(--color-nav-chip-active-bg)]/60 text-[var(--color-nav-chip-active-text)]"
                                : "text-[var(--color-ink-3)]"
                            )}
                          >
                            <span className="font-medium w-24">
                              {a.planet ?? "—"}
                              {isCurrentAntar && <span className="ml-1 opacity-70">← now</span>}
                            </span>
                            <span className="font-mono w-28">{a.start ?? "—"}</span>
                            <span className="font-mono w-28">{a.end ?? "—"}</span>
                            <span className="text-muted-foreground ml-auto">{dashaYears(a.start, a.end)} yr</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
