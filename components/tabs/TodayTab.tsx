"use client"
import { generateInsights } from '@/lib/insights'
import { TodayInsightCard, type TodayInsight } from './TodayInsightCard'
import { TwoColumnTabGrid, TabColumn, TabSection } from '@/components/unified/TabGrid'

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

  const mahaPlanet = dashas?.maha?.planet
  const antarPlanet = dashas?.antar?.planet
  const pratyantarPlanet = dashas?.pratyantar?.planet

  return (
    <TwoColumnTabGrid>
      {/* Left column — current period, what's active now, current reading */}
      <TabColumn>
        <TabSection when={insights.length > 0} title="What's active now">
          <div className="space-y-2">
            {insights.map((insight) => (
              <TodayInsightCard
                key={insight.id}
                insight={insight}
                onAsk={(i) => onAsk(i)}
                onExplore={onExplore}
              />
            ))}
          </div>
        </TabSection>

        <TabSection title="Current dasha period">
          <div className="ac-card ac-card-pad">
            {DASHA_LEVELS.map(({ key, label }) => {
              const d = dashas?.[key]
              if (!d?.planet) return null
              return (
                <div key={key} className="ac-dasha-row">
                  <span className="level">{label}</span>
                  <span className="planet-name">{d.planet}</span>
                  {d.start && (
                    <span className="range">{d.start} – {d.end ?? '…'}</span>
                  )}
                </div>
              )
            })}
          </div>
        </TabSection>

        {isTodayReadingLoading && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-ink-3)] py-2">
            <span className="animate-pulse">●</span>
            <span>Generating your reading…</span>
          </div>
        )}

        <TabSection
          when={!isTodayReadingLoading && !!todayReadingOutput?.dasha_reading}
          title={`Current period — ${[mahaPlanet, antarPlanet, pratyantarPlanet].filter(Boolean).join(' / ')}`}
        >
          <div className="ac-card ac-card-pad">
            <p style={{ fontSize: 13, color: "var(--color-ink-2)", lineHeight: 1.6 }}>
              {todayReadingOutput?.dasha_reading}
            </p>
          </div>
        </TabSection>
      </TabColumn>

      {/* Right column — natal chart reading */}
      <TabColumn>
        <TabSection
          when={!isTodayReadingLoading && !!todayReadingOutput?.chart_reading}
          title="Your natal chart"
        >
          <div className="ac-card ac-card-pad">
            <p style={{ fontSize: 13, color: "var(--color-ink-2)", lineHeight: 1.65 }}>
              {todayReadingOutput?.chart_reading}
            </p>
          </div>
        </TabSection>
      </TabColumn>
    </TwoColumnTabGrid>
  )
}
