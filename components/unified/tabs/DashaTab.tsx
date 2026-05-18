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

// Fixed Vimshottari period lengths (years) per Parasara
const VIMSHOTTARI_YEARS: Record<string, number> = {
  Sun: 6, Moon: 10, Mars: 7, Rahu: 18,
  Jupiter: 16, Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20,
};
const SEQUENCE = ["Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury", "Ketu", "Venus"];

type RawEntry = { planet?: string; start?: string; end?: string };
type SubDasha = { planet: string; start: string; end: string; years: number };

function addYears(dateStr: string, years: number): string {
  try {
    return new Date(new Date(dateStr).getTime() + years * 365.25 * 86400000)
      .toISOString().slice(0, 10);
  } catch { return "?"; }
}

function computeSubDashas(parentStart: string, parentPlanet: string, parentYears: number): SubDasha[] {
  const seqIdx = SEQUENCE.indexOf(parentPlanet);
  if (seqIdx === -1 || !parentStart || parentStart === "?") return [];
  let cursor = parentStart;
  return SEQUENCE.map((_, i) => {
    const planet = SEQUENCE[(seqIdx + i) % 9];
    const years  = (parentYears * VIMSHOTTARI_YEARS[planet]) / 120;
    const end    = addYears(cursor, years);
    const entry: SubDasha = { planet, start: cursor, end, years };
    cursor = end;
    return entry;
  });
}

function formatDuration(years: number): string {
  if (years >= 1)   return `${years.toFixed(1)} yr`;
  if (years * 12 >= 1) return `${(years * 12).toFixed(1)} mo`;
  return `${Math.round(years * 365)} d`;
}

function dkey(planet: string, start: string) { return `${planet}|${start}`; }

const TODAY = new Date().toISOString().slice(0, 10);
function isNow(start: string, end: string) { return TODAY >= start && TODAY < end; }

const MAX_DEPTH = 4;
const LEVEL_LABELS = ["Maha", "Antar", "Pratyantar", "Sookshma", "Prana"];
// Static Tailwind classes for each depth level (depth * 14 + 10 px)
const ROWS_PL = ["pl-[10px]", "pl-6", "pl-[38px]", "pl-[52px]", "pl-[66px]"] as const;
// Static Tailwind classes for current period indent (depth * 16 px)
const PERIOD_PL = ["pl-0", "pl-4", "pl-8", "pl-12", "pl-16"] as const;

interface RowsProps {
  entries:  SubDasha[];
  depth:    number;
  expanded: string[];
  onToggle: (depth: number, key: string) => void;
}

function DashaRows({ entries, depth, expanded, onToggle }: RowsProps) {
  if (depth > MAX_DEPTH) return null;
  const isLeaf = depth === MAX_DEPTH;

  return (
    <>
      {entries.map(e => {
        const key    = dkey(e.planet, e.start);
        const isOpen = !isLeaf && expanded[depth] === key;
        const active = isNow(e.start, e.end);
        const sub    = isOpen ? computeSubDashas(e.start, e.planet, e.years) : [];

        return (
          <div key={key}>
            <button
              type="button"
              disabled={isLeaf}
              onClick={() => !isLeaf && onToggle(depth, key)}
              className={cn(
                ROWS_PL[depth],
                "w-full flex items-center gap-2 py-1 pr-3 text-left border-b border-[var(--color-border)] transition-colors",
                active
                  ? "bg-[var(--color-nav-chip-active-bg)]/70"
                  : depth === 0
                    ? "bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-hover)]/20"
                    : "hover:bg-[var(--color-surface-hover)]/10",
                isLeaf && "cursor-default"
              )}
            >
              <span className="w-3 shrink-0 text-muted-foreground/40">
                {!isLeaf && (isOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />
                )}
              </span>
              <span className="text-[10px] uppercase tracking-wider w-16 shrink-0 text-muted-foreground/50">
                {LEVEL_LABELS[depth]}
              </span>
              <span className={cn(
                "font-semibold w-20 shrink-0",
                depth === 0 ? "text-sm" : "text-xs",
                active
                  ? "text-[var(--color-nav-chip-active-text)]"
                  : depth === 0 ? "text-[var(--color-ink-1)]" : "text-[var(--color-ink-2)]"
              )}>
                {e.planet}
                {active && <span className="ml-1 text-[9px] opacity-60">← now</span>}
              </span>
              <span className="font-mono text-xs text-[var(--color-ink-3)] w-24 shrink-0">{e.start}</span>
              <span className="font-mono text-xs text-muted-foreground/40 w-24 shrink-0">{e.end}</span>
              <span className="text-xs text-muted-foreground/40 ml-auto shrink-0">
                {formatDuration(e.years)}
              </span>
            </button>

            {isOpen && sub.length > 0 && (
              <DashaRows
                entries={sub}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

export function DashaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data   = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as (Record<string, RawEntry> & { timeline?: RawEntry[] }) | undefined;

  // Enrich flat timeline entries with Vimshottari year lengths
  const mahaTimeline: SubDasha[] = (dashas?.timeline ?? [])
    .map(t => ({
      planet: t.planet ?? "",
      start:  t.start  ?? "",
      end:    t.end    ?? "",
      years:  VIMSHOTTARI_YEARS[t.planet ?? ""] ?? 0,
    }))
    .filter(t => t.planet && t.start);

  // Auto-expand current Maha on mount
  const currentMahaKey = dashas?.maha?.planet && dashas?.maha?.start
    ? dkey(dashas.maha.planet, dashas.maha.start)
    : undefined;

  const [expanded, setExpanded] = useState<string[]>(() =>
    currentMahaKey ? [currentMahaKey] : []
  );

  function onToggle(depth: number, key: string) {
    setExpanded(prev => {
      const next = [...prev];
      if (next[depth] === key) {
        return next.slice(0, depth);         // collapse this level + all deeper
      }
      next[depth] = key;
      return next.slice(0, depth + 1);       // open this level, clear deeper
    });
  }

  return (
    <div className="space-y-8">

      {/* Current dasha period — 5-level stack from sidecar */}
      {dashas && (
        <section>
          <SectionHeading>Current Dasha Period (Vimshottari)</SectionHeading>
          <div className="space-y-1">
            {DASHA_LEVELS.map(({ key, label }, depth) => {
              const d = dashas[key] as RawEntry | undefined;
              if (!d?.planet) return null;
              return (
                <div
                  key={key}
                  className={cn("flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]", PERIOD_PL[depth])}
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

      {/* 5-level expandable Maha Dasha timeline */}
      <section>
        <SectionHeading>Vimshottari Maha Dasha Timeline</SectionHeading>
        <p className="text-[11px] text-muted-foreground/60 mb-3">
          Click any row to expand its sub-periods down to Prana level. Sub-dasha dates computed from Vimshottari proportions.
        </p>
        {mahaTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Timeline data not available.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="border border-[var(--color-border)] rounded-lg overflow-hidden min-w-[560px]">
              <DashaRows
                entries={mahaTimeline}
                depth={0}
                expanded={expanded}
                onToggle={onToggle}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
