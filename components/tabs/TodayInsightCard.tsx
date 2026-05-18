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

interface TodayInsightCardProps {
  insight: TodayInsight
  onAsk: (insight: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
}

export function TodayInsightCard({ insight, onAsk, onExplore }: TodayInsightCardProps) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: insight.categoryColor }}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink-1)] leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</p>
          {insight.cta && (
            <button
              type="button"
              onClick={() => insight.cta?.action === 'ask' ? onAsk(insight) : onExplore(insight)}
              className="mt-1.5 text-xs text-[var(--color-today-ask-cta-text)] hover:underline transition-colors"
            >
              {insight.cta.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
