"use client"
import { ReadingActions } from './ReadingActions'
import { TabSection } from '@/components/unified/TabGrid'

interface NatalReadingMeta {
  natal: { id: string | null; rating: 1 | -1 | null }
}

interface NatalTabProps {
  todayReadingOutput?: {
    chart_reading?: string
    meta?: NatalReadingMeta
  } | null
  isTodayReadingLoading?: boolean
}

export function NatalTab({ todayReadingOutput, isTodayReadingLoading = false }: NatalTabProps) {
  if (isTodayReadingLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-3)] py-6">
        <span className="animate-pulse">●</span>
        <span>Generating your natal chart reading…</span>
      </div>
    )
  }

  if (!todayReadingOutput?.chart_reading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
        <p style={{ fontSize: 13, color: "var(--color-ink-3)", fontStyle: "italic" }}>
          Natal chart reading not yet available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <TabSection title="Your natal chart">
        <div className="ac-card ac-card-pad">
          <p style={{ fontSize: 13, color: "var(--color-ink-2)", lineHeight: 1.65 }}>
            {todayReadingOutput.chart_reading}
          </p>
          <ReadingActions
            text={todayReadingOutput.chart_reading}
            readingId={todayReadingOutput.meta?.natal.id ?? null}
            initialRating={todayReadingOutput.meta?.natal.rating ?? null}
            engine="today-natal"
            shareTitle="My natal chart reading — Astro Chaganti"
          />
        </div>
      </TabSection>
    </div>
  )
}
