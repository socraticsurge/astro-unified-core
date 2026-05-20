import { generateInsights } from '../insights'

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

  it('falls back to upcoming pratyantar when no urgent transit is imminent', () => {
    // antar ends 2026-01-15 (~19 weeks away → outside the 8-week imminent
    // window), pratyantar ends 2026-01-01 (~17 weeks away → outside the
    // 4-week imminent window). Per the design decision, "What's active
    // now" should never be empty — the fallback surfaces the upcoming
    // pratyantar shift with id "pratyantar-upcoming".
    const farDashas = {
      maha:       { planet: 'Sun',  start: '2020-04-15', end: '2026-04-15' },
      antar:      { planet: 'Mars', start: '2025-09-01', end: '2026-01-15' },
      pratyantar: { planet: 'Rahu', start: '2025-12-01', end: '2026-01-01' },
    }
    const today = new Date('2025-09-02')
    const insights = generateInsights({ dashas: farDashas }, null, today)
    const fallback = insights.find(i => i.id === 'pratyantar-upcoming')
    expect(fallback).toBeDefined()
    expect(fallback!.title).toMatch(/next.*pratyantar/i)
  })

  it('skips the upcoming-pratyantar fallback when an imminent insight already fired', () => {
    // antar ends within 8 weeks → imminent dasha-transition fires; the
    // fallback should NOT add a duplicate pratyantar-upcoming entry.
    const today = new Date('2025-12-01')
    const insights = generateInsights({ dashas: baseDashas }, null, today)
    expect(insights.find(i => i.id === 'pratyantar-upcoming')).toBeUndefined()
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
