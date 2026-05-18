"use client";
import { cn } from "@/lib/utils";

const DASHA_LEVELS = [
  { key: "maha",       label: "Maha Dasha" },
  { key: "antar",      label: "Antar"      },
  { key: "pratyantar", label: "Pratyantar" },
  { key: "sukshma",    label: "Sukshma"    },
  { key: "prana",      label: "Prana"      },
];

type DashaEntry = { planet?: string; start?: string; end?: string };

export function DashaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data   = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as (Record<string, DashaEntry> & { timeline?: DashaEntry[] }) | undefined;

  return (
    <div className="space-y-8">

      {/* Current dasha period */}
      {dashas && (
        <section>
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
        </section>
      )}

      {/* Maha Dasha timeline */}
      <section>
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
                  {["Planet", "Start", "End", "Duration"].map(h => (
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
    </div>
  );
}
