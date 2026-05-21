"use client"
import { DashaRow, DashaPeriodEntry } from './DashaRow'

interface DashaTimelineProps {
  timeline: DashaPeriodEntry[]
  currentMahaDasha: string
}

export function DashaTimeline({ timeline, currentMahaDasha }: DashaTimelineProps) {
  if (timeline.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Timeline data not available.
      </p>
    )
  }

  const hasNesting = timeline.some(e =>
    (e.antardashas?.length ?? 0) > 0 ||
    (e.pratyantardashas?.length ?? 0) > 0 ||
    (e.sukshmadhashas?.length ?? 0) > 0 ||
    (e.pranadashas?.length ?? 0) > 0
  )

  if (!hasNesting) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground mb-3">
          Antardasha drill-down not yet available from the chart engine.
        </p>
        {timeline.map((entry, i) => (
          <DashaRow
            key={`${entry.planet}-${i}`}
            entry={entry}
            level={0}
            defaultExpanded={false}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {timeline.map((entry, i) => (
        <DashaRow
          key={`${entry.planet}-${i}`}
          entry={entry}
          level={0}
          defaultExpanded={entry.planet === currentMahaDasha}
        />
      ))}
    </div>
  )
}
