"use client"
import { generateInsights } from '@/lib/insights'
import { TodayInsightCard, type TodayInsight } from './TodayInsightCard'

interface TodayTabProps {
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  onAsk: (insight?: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
}

export function TodayTab({ chartOutput, transitOutput, onAsk, onExplore }: TodayTabProps) {
  const data    = chartOutput?.data as Record<string, unknown> | undefined
  const dashas  = data?.dashas as {
    maha?:  { planet?: string; start?: string; end?: string }
    antar?: { planet?: string; start?: string; end?: string }
  } | undefined

  const insights = chartOutput ? generateInsights(chartOutput, transitOutput) : []

  if (!chartOutput) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Loading your chart…</p>
      </div>
    )
  }

  const mahaPlanet  = dashas?.maha?.planet  ?? '—'
  const antarPlanet = dashas?.antar?.planet ?? '—'
  const mahaEnd     = dashas?.maha?.end
  const antarEnd    = dashas?.antar?.end

  let shiftPill: string | null = null
  if (antarEnd) {
    const ms = new Date(antarEnd).getTime()
    if (!isNaN(ms)) {
      const weeksLeft = Math.round((ms - Date.now()) / (7 * 24 * 60 * 60 * 1000))
      if (weeksLeft >= 0 && weeksLeft <= 8) {
        shiftPill = `Antardasha shifts in ${weeksLeft} week${weeksLeft === 1 ? '' : 's'}`
      }
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Hero card — current dasha */}
      <div className="p-4 rounded-xl border border-[var(--color-today-hero-border)] bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)]">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current dasha period</p>
        <h2 className="text-xl font-bold text-[var(--color-ink-1)] leading-tight">
          {mahaPlanet} · {antarPlanet}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2 text-xs text-muted-foreground">
          {dashas?.maha?.start && (
            <span>{dashas.maha.start} – {mahaEnd ?? '…'}</span>
          )}
        </div>
        {shiftPill && (
          <div className="mt-2">
            <span className="px-2 py-0.5 rounded-full border border-[var(--color-nav-alert)] text-[var(--color-nav-alert)] text-xs">
              ● {shiftPill}
            </span>
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
    </div>
  )
}
