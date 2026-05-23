import { generateInsights } from '../insights'
import type { TodayInsight } from '@/components/tabs/TodayInsightCard'

const baseDashas = {
  maha:       { planet: 'Sun',  start: '2020-04-15', end: '2026-04-15' },
  antar:      { planet: 'Mars', start: '2025-09-01', end: '2026-01-15' },
  pratyantar: { planet: 'Rahu', start: '2025-12-01', end: '2026-01-01' },
}

describe('generateInsights', () => {
  it('returns an imminent-dasha insight when antardasha ends within 8 weeks', () => {
    const today = new Date('2025-12-01')
    const insights = generateInsights({ dashas: baseDashas }, null, today)
    const dashaInsight = insights.find(i => i.category === 'dasha')
    expect(dashaInsight).toBeDefined()
    expect(dashaInsight!.title).toMatch(/dasha|shift/i)
  })

  it('falls back to upcoming pratyantar when no urgent insight fires and pratyantar not yet started', () => {
    // antar ends 2026-01-15 (~19 weeks away → outside 8-week window)
    // pratyantar starts 2025-12-01 → today (2025-09-02) is before start
    const today = new Date('2025-09-02')
    const insights = generateInsights({ dashas: baseDashas }, null, today)
    const fallback = insights.find(i => i.id === 'pratyantar-upcoming')
    expect(fallback).toBeDefined()
    expect(fallback!.title).toMatch(/next.*pratyantar/i)
  })

  it('shows active pratyantar (not "next") when today is inside the pratyantar period', () => {
    const dashas = {
      maha:       { planet: 'Jupiter', start: '2019-09-08', end: '2035-09-08' },
      antar:      { planet: 'Mercury', start: '2024-05-08', end: '2026-08-14' },
      pratyantar: { planet: 'Saturn',  start: '2026-04-04', end: '2026-08-13' },
    }
    // today is well inside the Saturn pratyantar period (exact dates from bug report)
    const today = new Date('2026-05-22')
    const insights = generateInsights({ dashas }, null, today)
    const active   = insights.find(i => i.id === 'pratyantar-active')
    const upcoming = insights.find(i => i.id === 'pratyantar-upcoming')
    expect(active).toBeDefined()
    expect(active!.title).toMatch(/active.*saturn/i)
    expect(upcoming).toBeUndefined()
  })

  it('skips fallback when an imminent insight already fired', () => {
    // antar ends within 8 weeks → dasha-transition fires; fallback must not duplicate
    const today = new Date('2025-12-01')
    const insights = generateInsights({ dashas: baseDashas }, null, today)
    expect(insights.find(i => i.id === 'pratyantar-upcoming')).toBeUndefined()
    expect(insights.find(i => i.id === 'pratyantar-active')).toBeUndefined()
  })

  it('returns sade sati insight when transit data says active', () => {
    const transitOutput = { data: { sade_sati: { active: true, phase: 'peak' } } }
    const insights = generateInsights({ dashas: baseDashas }, transitOutput, new Date('2025-09-02'))
    expect(insights.find(i => i.category === 'dosha')).toBeDefined()
  })

  it('returns kaal sarpa insight when present in chart', () => {
    const chartOutput = { data: { dashas: baseDashas, kaal_sarpa: { type: 'Vasuki' } } }
    const insights = generateInsights(chartOutput, null, new Date('2025-09-02'))
    expect(insights.find(i => i.category === 'dosha' && i.title.toLowerCase().includes('kaal'))).toBeDefined()
  })

  it('returns no more than 5 insights', () => {
    const chartOutput = { data: { dashas: baseDashas, kaal_sarpa: { type: 'Vasuki' }, yogas: [
      { name: 'Gajakesari' }, { name: 'Raj Yoga' }, { name: 'Hamsa' }, { name: 'Malavya' },
    ]}}
    const today = new Date('2025-12-01')
    const insights = generateInsights(chartOutput, null, today)
    expect(insights.length).toBeLessThanOrEqual(5)
  })
})
