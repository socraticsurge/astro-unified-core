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
  onAsk: (insight?: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
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
  onAsk,
  onExplore,
}: TodayTabProps) {
  const data   = chartOutput?.data as Record<string, unknown> | undefined
  const dashas = data?.dashas as Record<string, DashaLevel> | undefined

  const insights = chartOutput ? generateInsights(chartOutput, transitOutput) : []

  if (!chartOutput) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
        <p style={{ fontSize: 13, color: "var(--color-ink-3)" }}>Loading your chart…</p>
      </div>
    )
  }

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
      {/* Current dasha hero */}
      <div className="ac-card ac-card-pad">
        <div className="ac-eyebrow" style={{ marginBottom: 10 }}>Current dasha period</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DASHA_LEVELS.map(({ key, label }) => {
            const d = dashas?.[key]
            if (!d?.planet) return null
            return (
              <div key={key} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="ac-eyebrow" style={{ width: 80, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink-1)" }}>{d.planet}</span>
                {d.start && (
                  <span style={{ fontSize: 11, color: "var(--color-ink-3)", marginLeft: "auto" }}>{d.start} – {d.end ?? '…'}</span>
                )}
              </div>
            )
          })}
        </div>
        {shiftPills.length > 0 && (
          <div className="ac-pills" style={{ marginTop: 12, gap: 6 }}>
            {shiftPills.map(pill => (
              <span key={pill} className="ac-tag warn">● {pill}</span>
            ))}
          </div>
        )}
      </div>

      {/* Insight cards */}
      {insights.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="ac-eyebrow">What&apos;s active now</div>
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
        <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--color-ink-3)" }}>No significant patterns active right now.</p>
      )}

      {/* Loading reading */}
      {isTodayReadingLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-ink-3)", padding: "8px 0" }}>
          <span className="animate-pulse">●</span>
          <span>Generating your reading…</span>
        </div>
      )}

      {/* AI reading */}
      {!isTodayReadingLoading && todayReadingOutput && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="ac-eyebrow">Your reading</div>

          {todayReadingOutput.dasha_reading && (
            <div className="ac-card ac-card-pad">
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>
                Current period — {dashas?.maha?.planet} / {dashas?.antar?.planet}{dashas?.pratyantar?.planet ? ` / ${dashas.pratyantar.planet}` : ''}
              </div>
              <p style={{ fontSize: 13, color: "var(--color-ink-2)", lineHeight: 1.6 }}>
                {todayReadingOutput.dasha_reading}
              </p>
            </div>
          )}

          {todayReadingOutput.chart_reading && (
            <div className="ac-card ac-card-pad">
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Your natal chart</div>
              <p style={{ fontSize: 13, color: "var(--color-ink-2)", lineHeight: 1.6 }}>
                {todayReadingOutput.chart_reading}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
