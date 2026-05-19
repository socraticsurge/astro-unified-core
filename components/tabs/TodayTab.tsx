"use client"
import { generateInsights } from '@/lib/insights'
import { TodayInsightCard, type TodayInsight } from './TodayInsightCard'

type DashaLevel = { planet?: string; start?: string; end?: string }

interface TodayReadingOutput {
  dasha_reading: string
  chart_reading: string
}

interface TodayTabProps {
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  todayReadingOutput: TodayReadingOutput | null
  isTodayReadingLoading: boolean
  todayReadingError?: string | null
  onAsk: (insight?: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
  onRefetchTodayReading?: () => void
}

const DASHA_LEVELS: { key: string; label: string }[] = [
  { key: 'maha',       label: 'Maha Dasha'  },
  { key: 'antar',      label: 'Antar'       },
  { key: 'pratyantar', label: 'Pratyantar'  },
  { key: 'sukshma',    label: 'Sukshma'     },
  { key: 'prana',      label: 'Prana'       },
]

function weeksUntil(dateStr: string): number {
  const ms = new Date(dateStr).getTime()
  if (isNaN(ms)) return Infinity
  return (ms - Date.now()) / (7 * 24 * 60 * 60 * 1000)
}

export function TodayTab({
  chartOutput,
  transitOutput,
  todayReadingOutput,
  isTodayReadingLoading,
  todayReadingError,
  onAsk,
  onExplore,
  onRefetchTodayReading,
}: TodayTabProps) {
  const data   = chartOutput?.data as Record<string, unknown> | undefined
  const dashas = data?.dashas as Record<string, DashaLevel> | undefined

  const insights = chartOutput ? generateInsights(chartOutput, transitOutput) : []

  if (!chartOutput) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Loading your chart…</p>
      </div>
    )
  }

  // Shift pills — antardasha within 8w, pratyantar within 4w
  const shiftPills: string[] = []
  if (dashas?.antar?.end) {
    const w = Math.round(weeksUntil(dashas.antar.end))
    if (w >= 0 && w <= 8)
      shiftPills.push(`Antardasha shifts in ${w} week${w === 1 ? '' : 's'}`)
  }
  if (dashas?.pratyantar?.end) {
    const w = Math.round(weeksUntil(dashas.pratyantar.end))
    if (w >= 0 && w <= 4)
      shiftPills.push(`Pratyantar shifts in ${w} week${w === 1 ? '' : 's'}`)
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Hero card — all 5 dasha levels */}
      <div className="p-4 rounded-xl border border-[var(--color-today-hero-border)] bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)]">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Current dasha period</p>
        <div className="space-y-1">
          {DASHA_LEVELS.map(({ key, label }) => {
            const d = dashas?.[key]
            if (!d?.planet) return null
            return (
              <div key={key} className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 w-20 shrink-0">{label}</span>
                <span className="text-sm font-medium text-[var(--color-ink-1)]">{d.planet}</span>
                {d.start && (
                  <span className="text-[11px] text-muted-foreground/70 ml-auto">{d.start} – {d.end ?? '…'}</span>
                )}
              </div>
            )
          })}
        </div>
        {shiftPills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shiftPills.map(pill => (
              <span
                key={pill}
                className="px-2 py-0.5 rounded-full border border-[var(--color-nav-alert)] text-[var(--color-nav-alert)] text-xs"
              >
                ● {pill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Insight cards */}
      {insights.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">What&apos;s active now</p>
          {insights.map(insight => (
            <TodayInsightCard
              key={insight.id}
              insight={insight}
              onAsk={i => onAsk(i)}
              onExplore={onExplore}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No significant patterns active right now.</p>
      )}

      {/* AI-generated reading */}
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Your reading</p>

        {isTodayReadingLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
            <span className="animate-pulse">●</span>
            <span>Generating your personalised reading…</span>
          </div>
        )}

        {!isTodayReadingLoading && todayReadingError && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-danger)]">
            <span>Couldn&apos;t load reading — {todayReadingError}</span>
            {onRefetchTodayReading && (
              <button
                type="button"
                onClick={onRefetchTodayReading}
                className="underline underline-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {!isTodayReadingLoading && todayReadingOutput && (
          <div className="space-y-4">
            {todayReadingOutput.dasha_reading && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-ink-3,var(--color-muted))] font-medium">
                  Current period — {dashas?.maha?.planet} / {dashas?.antar?.planet}{dashas?.pratyantar?.planet ? ` / ${dashas.pratyantar.planet}` : ''}
                </p>
                <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
                  {todayReadingOutput.dasha_reading}
                </p>
              </div>
            )}

            {todayReadingOutput.chart_reading && (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-ink-3,var(--color-muted))] font-medium">
                  Your natal chart
                </p>
                <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
                  {todayReadingOutput.chart_reading}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
