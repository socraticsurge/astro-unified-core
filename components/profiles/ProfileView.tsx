"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/db'
import { TodayTab } from '@/components/tabs/TodayTab'
import type { TodayInsight } from '@/components/tabs/TodayInsightCard'
import { CompareTab } from '@/components/tabs/CompareTab'
import { ChartTab }    from '@/components/unified/tabs/ChartTab'
import { PlanetsTab }  from '@/components/unified/tabs/PlanetsTab'
import { HousesVargasTab } from '@/components/unified/tabs/HousesVargasTab'
import { PatternsTab } from '@/components/unified/tabs/PatternsTab'
import { TimeTab }     from '@/components/unified/tabs/TimeTab'
import type { AskContext } from '@/components/panels/AskPanel'

type ChartTabId = 'today' | 'chart' | 'planets' | 'houses' | 'patterns' | 'time' | 'compare'

const CHART_TABS: { id: ChartTabId; label: string }[] = [
  { id: 'today',    label: '◎ Today' },
  { id: 'chart',    label: 'Chart' },
  { id: 'planets',  label: 'Planets' },
  { id: 'houses',   label: 'Houses' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'time',     label: 'Time' },
  { id: 'compare',  label: 'Compare' },
]

interface ProfileViewProps {
  profile: Profile
  allProfiles: Profile[]
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  careerOutput: Record<string, unknown> | null
  isTransitLoading: boolean
  isCareerLoading: boolean
  onFetchTransit: (force?: boolean) => void
  onFetchCareer: (force?: boolean) => void
  onAskOpen: (context?: Partial<AskContext>) => void
  defaultTab?: ChartTabId
}

export function ProfileView({
  profile,
  allProfiles,
  chartOutput,
  transitOutput,
  careerOutput,
  isTransitLoading,
  isCareerLoading,
  onFetchTransit,
  onFetchCareer,
  onAskOpen,
  defaultTab = 'today',
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ChartTabId>(defaultTab)

  const handleAskFromInsight = (insight?: TodayInsight) => {
    const data = chartOutput?.data as Record<string, unknown> | undefined
    const dashas = data?.dashas as { maha?: { planet?: string }; antar?: { planet?: string } } | undefined
    onAskOpen({
      tab: activeTab,
      insightTitle: insight?.title,
      mahadasha: dashas?.maha?.planet ?? '',
      antardasha: dashas?.antar?.planet ?? '',
    })
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Tab bar */}
      <div
        role="tablist"
        className="overflow-x-auto border-b border-[var(--color-border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex min-w-max">
          {CHART_TABS.map(t => (
            <button
              key={t.id}
              id={`profileview-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={activeTab === t.id}
              aria-controls={`profileview-panel-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-[var(--color-nav-chip-active-text)] text-[var(--color-ink-1)]'
                  : 'border-transparent text-muted-foreground hover:text-[var(--color-ink-2)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'today' && (
          <div id="profileview-panel-today" role="tabpanel" aria-labelledby="profileview-tab-today">
            <TodayTab
              chartOutput={chartOutput}
              transitOutput={transitOutput}
              onAsk={handleAskFromInsight}
              onExplore={() => setActiveTab('chart')}
            />
          </div>
        )}
        {activeTab === 'chart' && chartOutput && (
          <div id="profileview-panel-chart" role="tabpanel" aria-labelledby="profileview-tab-chart">
            <ChartTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'planets' && chartOutput && (
          <div id="profileview-panel-planets" role="tabpanel" aria-labelledby="profileview-tab-planets">
            <PlanetsTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'houses' && chartOutput && (
          <div id="profileview-panel-houses" role="tabpanel" aria-labelledby="profileview-tab-houses">
            <HousesVargasTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'patterns' && chartOutput && (
          <div id="profileview-panel-patterns" role="tabpanel" aria-labelledby="profileview-tab-patterns">
            <PatternsTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'time' && chartOutput && (
          <div id="profileview-panel-time" role="tabpanel" aria-labelledby="profileview-tab-time">
            <TimeTab
              chartOutput={chartOutput}
              transitOutput={transitOutput}
              careerOutput={careerOutput}
              isTransitLoading={isTransitLoading}
              isCareerLoading={isCareerLoading}
              onFetchTransit={onFetchTransit}
              onFetchCareer={onFetchCareer}
            />
          </div>
        )}
        {activeTab === 'compare' && (
          <div id="profileview-panel-compare" role="tabpanel" aria-labelledby="profileview-tab-compare">
            <CompareTab activeProfile={profile} allProfiles={allProfiles} />
          </div>
        )}
        {!chartOutput && activeTab !== 'today' && activeTab !== 'compare' && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading chart data…</p>
          </div>
        )}
      </div>
    </div>
  )
}
