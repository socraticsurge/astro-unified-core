"use client"
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { ReadingActions } from './ReadingActions'
import { TabSection } from '@/components/unified/TabGrid'
import { NatalChartGrid } from '@/components/unified/NatalChartGrid'
import type { Planet, SignName } from '@/components/unified/types'

interface NatalReadingMeta {
  natal: { id: string | null; rating: 1 | -1 | null }
}

interface NatalTabProps {
  todayReadingOutput?: {
    chart_reading?: string
    meta?: NatalReadingMeta
  } | null
  isTodayReadingLoading?: boolean
  chartOutput?: Record<string, unknown> | null
}

export function NatalTab({
  todayReadingOutput,
  isTodayReadingLoading = false,
  chartOutput,
}: NatalTabProps) {
  const [chartsOpen, setChartsOpen] = useState(false)

  const data       = chartOutput?.data as Record<string, unknown> | undefined
  const planets    = data?.planets    as Record<string, Planet>  | undefined
  const lagna      = data?.lagna      as Record<string, unknown> | undefined
  const lagnaSign  = lagna?.sign      as SignName | undefined
  const lagnaD9Sign = lagna?.d9_sign  as SignName | undefined

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

      {/* Reading — primary content */}
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

      {/* Birth charts — collapsible reference, mobile only */}
      {planets && (
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setChartsOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-medium text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] transition-colors py-1"
          >
            {chartsOpen
              ? <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
            Birth charts
          </button>

          {chartsOpen && (
            <div className="mt-3 space-y-4">
              <NatalChartGrid
                planets={planets}
                lagnaSign={lagnaSign}
                signKey="sign"
                label="D1 — Rasi"
              />
              <NatalChartGrid
                planets={planets}
                lagnaSign={lagnaD9Sign}
                signKey="d9_sign"
                label="D9 — Navamsa"
              />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
