"use client"

import { useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  ChartPie,
  GitCompareArrows,
  Orbit,
  Waypoints,
} from 'lucide-react'
import { generateInsights } from '@/lib/insights'
import { TodayInsightCard, type TodayInsight } from './TodayInsightCard'
import { ReadingActions } from './ReadingActions'
import { DailyCommons } from '@/components/daily/DailyCommons'
import { canonicalRasi } from '@/lib/panchangam/participant-context'
import { RASIS, type Rasi } from '@/lib/panchangam/contracts'
import styles from './TodayTab.module.css'

type DashaLevel = { planet?: string; start?: string; end?: string }

interface TodayReadingMeta {
  current: { id: string | null; rating: 1 | -1 | null }
  natal:   { id: string | null; rating: 1 | -1 | null }
}

interface TodayReadingOutput {
  dasha_reading: string
  chart_reading: string
  meta?: TodayReadingMeta
}

export type TodayDestination =
  | 'natal'
  | 'dasha'
  | 'transits'
  | 'muhurtha'
  | 'tarabalam'
  | 'compare'

interface TodayTabProps {
  profileName: string
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  todayReadingOutput: TodayReadingOutput | null
  isTodayReadingLoading: boolean
  todayReadingError: string | null
  onRetryTodayReading: () => void
  onAsk: (insight?: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
  onNavigate: (destination: TodayDestination) => void
  currentLocation?: string | null
}

const SUMMARY_DASHA_LEVELS: { key: string; label: string }[] = [
  { key: 'maha',       label: 'Maha Dasha' },
  { key: 'antar',      label: 'Antar' },
  { key: 'pratyantar', label: 'Pratyantar' },
]

const QUICK_ACTIONS: {
  id: TodayDestination
  label: string
  hint: string
  icon: typeof CalendarClock
}[] = [
  {
    id: 'muhurtha',
    label: 'Choose a time',
    hint: 'Find a supportive Muhurtam',
    icon: CalendarClock,
  },
  {
    id: 'tarabalam',
    label: 'Check a day',
    hint: 'See personal day suitability',
    icon: Waypoints,
  },
  {
    id: 'natal',
    label: 'Birth chart',
    hint: 'Open your D1 and D9 natal charts',
    icon: ChartPie,
  },
  {
    id: 'compare',
    label: 'Compare profiles',
    hint: 'Explore marriage compatibility',
    icon: GitCompareArrows,
  },
]

export function TodayTab({
  profileName,
  chartOutput,
  transitOutput,
  todayReadingOutput,
  isTodayReadingLoading,
  todayReadingError,
  onRetryTodayReading,
  onAsk,
  onExplore,
  onNavigate,
  currentLocation,
}: TodayTabProps) {
  const [expandedReadingKey, setExpandedReadingKey] = useState<string | null>(null)
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
  const periodLabel = [mahaPlanet, antarPlanet, pratyantarPlanet].filter(Boolean).join(' / ')
  const planets = data?.planets as Record<string, Record<string, unknown>> | undefined
  const moon = planets?.Moon ?? planets?.moon
  const canonicalMoonSign = canonicalRasi(moon?.sign)
  const janmaRasi = RASIS.includes(canonicalMoonSign as Rasi)
    ? canonicalMoonSign as Rasi
    : null
  const readingKey = todayReadingOutput?.meta?.current.id ?? `${profileName}:${periodLabel}`
  const readingExpanded = expandedReadingKey === readingKey

  return (
    <div className={styles.root}>
      <section className={styles.overview} aria-labelledby="today-overview-title">
        <div className={styles.overviewCopy}>
          <p className={styles.eyebrow}>Your chart now</p>
          <h2 id="today-overview-title" className={styles.overviewTitle}>
            {profileName}, here is what your current period means.
          </h2>
          {periodLabel && <p className={styles.periodBadge}>{periodLabel}</p>}

          {isTodayReadingLoading && (
            <div className={styles.heroLoading} aria-live="polite">
              <span className={styles.pulse} aria-hidden="true">●</span>
              <span>Preparing your personal reading…</span>
            </div>
          )}

          {!isTodayReadingLoading && todayReadingError && (
            <div className={styles.heroError} role="alert">
              <div>
                <p className={styles.errorTitle}>Personal reading temporarily unavailable</p>
                <p className={styles.errorBody}>
                  Your calculated chart and current periods remain available.
                </p>
              </div>
              <button
                type="button"
                onClick={onRetryTodayReading}
                className={styles.retryButton}
              >
                Try again
              </button>
            </div>
          )}

          {!isTodayReadingLoading && todayReadingOutput?.dasha_reading ? (
            <div className={styles.heroReading}>
              <p className={`ac-reading ${styles.readingText} ${readingExpanded ? '' : styles.readingTextCollapsed}`}>
                {todayReadingOutput.dasha_reading}
              </p>
              <button
                type="button"
                className={styles.readingToggle}
                aria-expanded={readingExpanded}
                onClick={() => setExpandedReadingKey(readingExpanded ? null : readingKey)}
              >
                {readingExpanded ? 'Show less' : 'Read full interpretation'}
              </button>
              <ReadingActions
                text={todayReadingOutput.dasha_reading}
                readingId={todayReadingOutput.meta?.current.id ?? null}
                initialRating={todayReadingOutput.meta?.current.rating ?? null}
                engine="today-current"
                shareTitle="My current dasha period — Astro Chaganti"
              />
            </div>
          ) : (
            !isTodayReadingLoading && !todayReadingError && (
              <p className={styles.overviewDescription}>
                Begin with the current period, then explore the shifts and
                decisions that matter most now.
              </p>
            )
          )}
        </div>
        <div className={styles.overviewActions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={() => onNavigate('dasha')}
          >
            <CalendarClock size={15} aria-hidden="true" />
            Explore Dashas
          </button>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={() => onNavigate('transits')}
          >
            <Orbit size={15} aria-hidden="true" />
            View current transits
          </button>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={styles.section} aria-labelledby="active-now-title">
            <div className={styles.sectionHeader}>
              <h3 id="active-now-title" className={styles.sectionTitle}>What is active now</h3>
              <span className={styles.sectionHint}>Priorities from your chart</span>
            </div>
            {insights.length > 0 ? (
              <div className={styles.insightList}>
                {insights.map((insight) => (
                  <TodayInsightCard
                    key={insight.id}
                    insight={insight}
                    onAsk={onAsk}
                    onExplore={onExplore}
                  />
                ))}
              </div>
            ) : (
              <div className={styles.quietCard}>
                A quiet stretch in your chart — no imminent transits or
                sub-period shifts need your attention.
              </div>
            )}
          </section>

        </div>

        <aside className={styles.column} aria-label="Current astrological period">
          <section className={styles.section} aria-labelledby="current-period-title">
            <div className={styles.sectionHeader}>
              <h3 id="current-period-title" className={styles.sectionTitle}>Current period</h3>
              {periodLabel && <span className={styles.sectionHint}>{periodLabel}</span>}
            </div>
            <div className={styles.periodCard}>
              {SUMMARY_DASHA_LEVELS.map(({ key, label }) => {
                const dasha = dashas?.[key]
                if (!dasha?.planet) return null
                return (
                  <div key={key} className={styles.periodRow}>
                    <span className={styles.periodLevel}>{label}</span>
                    <span className={styles.periodPlanet}>{dasha.planet}</span>
                    {dasha.start && (
                      <span className={styles.periodRange}>
                        {dasha.start} – {dasha.end ?? '…'}
                      </span>
                    )}
                  </div>
                )
              })}
              <div className={styles.periodFooter}>
                <button
                  type="button"
                  className={styles.textAction}
                  onClick={() => onNavigate('dasha')}
                >
                  See the full Dasha timeline
                  <ArrowRight size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className={styles.section} aria-labelledby="quick-actions-title">
        <div className={styles.sectionHeader}>
          <h3 id="quick-actions-title" className={styles.sectionTitle}>What would you like to do next?</h3>
          <span className={styles.sectionHint}>Practical tools for this profile</span>
        </div>
        <div className={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                className={styles.quickAction}
                onClick={() => onNavigate(action.id)}
              >
                <Icon className={styles.quickActionIcon} size={17} aria-hidden="true" />
                <span className={styles.quickActionLabel}>
                  {action.label}
                  <span className={styles.quickActionHint}>{action.hint}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <DailyCommons
        currentLocation={currentLocation}
        janmaRasi={janmaRasi}
        profileName={profileName}
      />
    </div>
  )
}
