"use client"

export interface TodayInsight {
  id: string
  category: 'dasha' | 'transit' | 'dosha' | 'yoga'
  categoryColor: string
  title: string
  body: string
  cta?: {
    label: string
    action: 'ask' | 'explore'
  }
}

const CATEGORY_TAGS: Record<string, string> = {
  dasha:   "cool",
  transit: "cool",
  dosha:   "unf",
  yoga:    "fav",
}

interface TodayInsightCardProps {
  insight: TodayInsight
  onAsk: (insight: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
}

export function TodayInsightCard({ insight, onAsk, onExplore }: TodayInsightCardProps) {
  const tagClass = CATEGORY_TAGS[insight.category] ?? "neu"

  return (
    <div className="ac-card ac-card-pad-sm" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span className={`ac-tag ${tagClass}`} style={{ fontSize: 9, padding: "1px 6px", textTransform: "capitalize", flexShrink: 0, marginTop: 1 }}>
          {insight.category}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-1)", lineHeight: 1.35 }}>{insight.title}</p>
          <p style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 3, lineHeight: 1.5 }}>{insight.body}</p>
          {insight.cta && (
            <button
              type="button"
              onClick={() => insight.cta?.action === 'ask' ? onAsk(insight) : onExplore(insight)}
              className="ac-btn-ask"
              style={{ marginTop: 8 }}
            >
              {insight.cta.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
