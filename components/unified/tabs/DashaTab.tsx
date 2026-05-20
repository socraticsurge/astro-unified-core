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
  if (years >= 1)      return `${years.toFixed(1)} yr`;
  if (years * 12 >= 1) return `${(years * 12).toFixed(1)} mo`;
  return `${Math.round(years * 365)} d`;
}

function dkey(planet: string, start: string) { return `${planet}|${start}`; }

const TODAY = new Date().toISOString().slice(0, 10);
function isNow(start: string, end: string) { return TODAY >= start && TODAY < end; }

const MAX_DEPTH = 4;
const LEVEL_LABELS = ["Maha", "Antar", "Pratyantar", "Sookshma", "Prana"];
const ROWS_PL = ["pl-[10px]", "pl-6", "pl-[38px]", "pl-[52px]", "pl-[66px]"] as const;
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
                // CSS grid prevents the "PRATYANTARRahu" overlap — each column has
                // its own track and can't bleed into the next.
                "w-full grid items-center gap-2 py-1 pr-3 text-left border-b border-[var(--color-border)] transition-colors",
                "grid-cols-[16px_104px_1fr_96px_96px_auto]",
                active
                  ? "bg-[var(--color-accent-faint)]"
                  : depth === 0
                    ? "bg-[var(--color-surface-sunk)] hover:bg-[var(--color-accent-faint)]"
                    : "hover:bg-[var(--color-accent-faint)]/50",
                isLeaf && "cursor-default"
              )}
            >
              <span className="shrink-0" style={{ color: "var(--color-ink-4)" }}>
                {!isLeaf && (isOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />
                )}
              </span>
              <span className="ac-eyebrow truncate">
                {LEVEL_LABELS[depth]}
              </span>
              <span className="min-w-0 truncate" style={{
                fontWeight: 600,
                fontSize: depth === 0 ? 14 : 12,
                color: active
                  ? "var(--color-accent)"
                  : depth === 0 ? "var(--color-ink-1)" : "var(--color-ink-2)",
              }}>
                {e.planet}
                {active && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.6 }}>← now</span>}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-3)" }}>
                {e.start}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-ink-4)" }}>
                {e.end}
              </span>
              <span style={{ fontSize: 11, color: "var(--color-ink-4)" }}>
                {formatDuration(e.years)}
              </span>
            </button>

            {isOpen && sub.length > 0 && (
              <DashaRows entries={sub} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
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

  const mahaTimeline: SubDasha[] = (dashas?.timeline ?? [])
    .map(t => ({
      planet: t.planet ?? "",
      start:  t.start  ?? "",
      end:    t.end    ?? "",
      years:  VIMSHOTTARI_YEARS[t.planet ?? ""] ?? 0,
    }))
    .filter(t => t.planet && t.start);

  const currentMahaKey = dashas?.maha?.planet && dashas?.maha?.start
    ? dkey(dashas.maha.planet, dashas.maha.start)
    : undefined;

  const [expanded, setExpanded] = useState<string[]>(() =>
    currentMahaKey ? [currentMahaKey] : []
  );

  function onToggle(depth: number, key: string) {
    setExpanded(prev => {
      const next = [...prev];
      if (next[depth] === key) return next.slice(0, depth);
      next[depth] = key;
      return next.slice(0, depth + 1);
    });
  }

  return (
    <div className="space-y-8">

      {/* Current dasha period */}
      {dashas && (
        <section>
          <SectionHeading>Current Dasha Period (Vimshottari)</SectionHeading>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DASHA_LEVELS.map(({ key, label }, depth) => {
              const d = dashas[key] as RawEntry | undefined;
              if (!d?.planet) return null;
              return (
                <div
                  key={key}
                  className={cn("ac-dasha-row current", PERIOD_PL[depth])}
                >
                  <span className="level">{label}</span>
                  <span className="planet-name">{d.planet}</span>
                  <span className="range">{d.start} → {d.end}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5-level expandable Maha Dasha timeline */}
      <section>
        <SectionHeading>Vimshottari Maha Dasha Timeline</SectionHeading>
        <p style={{ fontSize: 11, color: "var(--color-ink-4)", marginBottom: 10 }}>
          Click any row to expand sub-periods down to Prana level.
        </p>
        {mahaTimeline.length === 0 ? (
          <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--color-ink-3)" }}>Timeline data not available.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="ac-card overflow-hidden" style={{ minWidth: 560 }}>
              <DashaRows entries={mahaTimeline} depth={0} expanded={expanded} onToggle={onToggle} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
