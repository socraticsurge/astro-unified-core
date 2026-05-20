import type { TodayInsight } from '@/components/tabs/TodayInsightCard'

type DashaInfo = { planet: string; start: string; end: string }
type ChartDashas = { maha: DashaInfo; antar: DashaInfo; pratyantar?: DashaInfo; sukshma?: DashaInfo; prana?: DashaInfo }

const CATEGORY_COLORS = {
  dasha:   '#c084fc',
  transit: '#38bdf8',
  dosha:   '#f97316',
  yoga:    '#fbbf24',
}

function weeksUntil(dateStr: string, from: Date): number {
  const ts = new Date(dateStr).getTime()
  if (isNaN(ts)) return Infinity
  return (ts - from.getTime()) / (7 * 24 * 60 * 60 * 1000)
}

export function generateInsights(
  chartOutput: Record<string, unknown> | null,
  transitOutput: Record<string, unknown> | null,
  today: Date = new Date()
): TodayInsight[] {
  const results: TodayInsight[] = []
  // Handle both { data: { dashas } } and { dashas } shapes
  const rawData = (chartOutput?.data as Record<string, unknown> | undefined) ?? chartOutput ?? {}
  const data = rawData as Record<string, unknown>
  const dashas = data.dashas as ChartDashas | undefined
  const transit = ((transitOutput as Record<string, unknown> | null)?.data ?? transitOutput) as Record<string, unknown> | null

  // 1a. Imminent antardasha transition (within 8 weeks)
  if (dashas?.antar?.end) {
    const weeksLeft = weeksUntil(dashas.antar.end, today)
    if (weeksLeft >= 0 && weeksLeft <= 8) {
      const weeksDisplay = Math.round(weeksLeft)
      results.push({
        id: 'dasha-transition',
        category: 'dasha',
        categoryColor: CATEGORY_COLORS.dasha,
        title: `${dashas.antar.planet} antardasha shift in ~${weeksDisplay} week${weeksDisplay === 1 ? '' : 's'}`,
        body: `A new antardasha period begins within the ${dashas.maha.planet} mahadasha. Transitions are important moments for reflection and intention.`,
        cta: { label: 'Ask Dr Chaganti →', action: 'ask' },
      })
    }
  }

  // 1b. Imminent pratyantar transition (within 4 weeks)
  if (dashas?.pratyantar?.end) {
    const weeksLeft = weeksUntil(dashas.pratyantar.end, today)
    if (weeksLeft >= 0 && weeksLeft <= 4) {
      const weeksDisplay = Math.round(weeksLeft)
      results.push({
        id: 'pratyantar-transition',
        category: 'dasha',
        categoryColor: CATEGORY_COLORS.dasha,
        title: `${dashas.pratyantar.planet} pratyantar shift in ~${weeksDisplay} week${weeksDisplay === 1 ? '' : 's'}`,
        body: `A short sub-period transition is approaching within your current dasha. A good time to notice subtle shifts in energy and focus.`,
        cta: { label: 'Ask Dr Chaganti →', action: 'ask' },
      })
    }
  }

  // 2. Active Sade Sati
  const sadeSati = transit?.sade_sati as { active?: boolean; phase?: string } | undefined
  if (sadeSati?.active) {
    results.push({
      id: 'sade-sati',
      category: 'dosha',
      categoryColor: CATEGORY_COLORS.dosha,
      title: `Sade Sati active — ${sadeSati.phase ?? ''} phase`.trim(),
      body: 'Saturn transits the sign before, on, or after your natal Moon. A 7.5-year period of lessons, restructuring, and spiritual growth.',
      cta: { label: 'Ask Dr Chaganti →', action: 'ask' },
    })
  }

  // 3. Kaal Sarpa in natal chart
  const kaalSarpa = data.kaal_sarpa as { type?: string } | undefined
  if (kaalSarpa?.type) {
    results.push({
      id: 'kaal-sarpa',
      category: 'dosha',
      categoryColor: CATEGORY_COLORS.dosha,
      title: `Kaal Sarpa Yoga — ${kaalSarpa.type}`,
      body: 'All planets are hemmed between Rahu and Ketu in your natal chart. A powerful karmic signature that amplifies focus and intensity.',
    })
  }

  // Jupiter transit and major yogas are surfaced via the AI reading on the Today tab.
  // Keeping the data available here for future re-enablement if needed.

  return results.slice(0, 5)
}
