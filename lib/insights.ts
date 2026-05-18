import type { TodayInsight } from '@/components/tabs/TodayInsightCard'

type DashaInfo = { planet: string; start: string; end: string }
type ChartDashas = { maha: DashaInfo; antar: DashaInfo; pratyantar?: DashaInfo }

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

  // 1. Imminent antardasha transition (within 8 weeks)
  if (dashas?.antar?.end) {
    const weeksLeft = weeksUntil(dashas.antar.end, today)
    if (weeksLeft >= 0 && weeksLeft <= 8) {
      const weeksDisplay = Math.round(weeksLeft)
      results.push({
        id: 'dasha-transition',
        category: 'dasha',
        categoryColor: CATEGORY_COLORS.dasha,
        title: `${dashas.antar.planet} antardasha dasha shift in ~${weeksDisplay} week${weeksDisplay === 1 ? '' : 's'}`,
        body: `A new antardasha period begins within the ${dashas.maha.planet} mahadasha. Transitions are important moments for reflection and intention.`,
        cta: { label: 'Ask an expert about this →', action: 'ask' },
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
      cta: { label: 'Ask an expert about this →', action: 'ask' },
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

  // 4. Significant Jupiter transit
  const transitPlanets = transit?.planets as Record<string, { house_from_lagna?: number; sign?: string }> | undefined
  if (transitPlanets) {
    const jupiter = transitPlanets['Jupiter']
    if (jupiter?.house_from_lagna && [1, 5, 9, 10, 11].includes(jupiter.house_from_lagna)) {
      results.push({
        id: 'jupiter-transit',
        category: 'transit',
        categoryColor: CATEGORY_COLORS.transit,
        title: `Jupiter transiting your ${jupiter.house_from_lagna}th house`,
        body: `Jupiter in ${jupiter.sign ?? 'transit'} brings expansion and opportunity to the matters of this house.`,
        cta: { label: 'Explore in Chart →', action: 'explore' },
      })
    }
  }

  // 5. Major yogas (up to 2)
  type Yoga = { name: string }
  const MAJOR_YOGA_NAMES = new Set(['Malavya', 'Shasha', 'Bhadra', 'Hamsa', 'Ruchaka', 'Gajakesari', 'Raj Yoga'])
  const yogas = (data.yogas as Yoga[] | undefined) ?? []
  const majorYogas = yogas.filter(y => MAJOR_YOGA_NAMES.has(y.name)).slice(0, 2)
  for (const yoga of majorYogas) {
    if (results.length >= 5) break
    results.push({
      id: `yoga-${yoga.name}`,
      category: 'yoga',
      categoryColor: CATEGORY_COLORS.yoga,
      title: `${yoga.name} in your natal chart`,
      body: 'A significant planetary combination that shapes your life themes and natural strengths.',
    })
  }

  return results.slice(0, 5)
}
