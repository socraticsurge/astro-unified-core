"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Profile, CompatibilityCheck } from '@/lib/db'
import { TodayTab }          from '@/components/tabs/TodayTab'
import type { TodayInsight } from '@/components/tabs/TodayInsightCard'
import { CompareTab }        from '@/components/tabs/CompareTab'
import { PlanetsTab }        from '@/components/unified/tabs/PlanetsTab'
import { HousesVargasTab }   from '@/components/unified/tabs/HousesVargasTab'
import { YogasTab }          from '@/components/unified/tabs/YogasTab'
import { JaiminiTab }        from '@/components/unified/tabs/JaiminiTab'
import { AshtakavargaTab }   from '@/components/unified/tabs/AshtakavargaTab'
import { DashaTab }          from '@/components/unified/tabs/DashaTab'
import { TransitsTab }       from '@/components/unified/tabs/TransitsTab'
import { CareerTab }         from '@/components/unified/tabs/CareerTab'
import type { AskContext }   from '@/components/panels/AskPanel'

type ChartTabId =
  | 'today' | 'planets' | 'divisional'
  | 'yogas' | 'jaimini' | 'ashtakavarga'
  | 'dasha' | 'transits' | 'career' | 'compare'

const CHART_TABS: { id: ChartTabId; label: string }[] = [
  { id: 'today',        label: 'Today'        },
  { id: 'planets',      label: 'Planets'      },
  { id: 'divisional',   label: 'Divisional'   },
  { id: 'yogas',        label: 'Yogas'        },
  { id: 'jaimini',      label: 'Jaimini'      },
  { id: 'ashtakavarga', label: 'Ashtakavarga' },
  { id: 'dasha',        label: 'Dasha'        },
  { id: 'transits',     label: 'Transits'     },
  { id: 'career',       label: 'Career'       },
  { id: 'compare',      label: 'Marriage Compatibility' },
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
  const [compareSelectedId, setCompareSelectedId] = useState<string>("")
  const [compareResult, setCompareResult] = useState<CompatibilityCheck | null>(null)

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

  const needsChart = activeTab !== 'today' && activeTab !== 'transits' && activeTab !== 'compare'

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Tab bar */}
      <div
        role="tablist"
        className="flex-shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-[var(--color-border)]"
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
              onExplore={() => setActiveTab('planets')}
            />
          </div>
        )}
        {activeTab === 'planets' && chartOutput && (
          <div id="profileview-panel-planets" role="tabpanel" aria-labelledby="profileview-tab-planets">
            <PlanetsTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'divisional' && chartOutput && (
          <div id="profileview-panel-divisional" role="tabpanel" aria-labelledby="profileview-tab-divisional">
            <HousesVargasTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'yogas' && chartOutput && (
          <div id="profileview-panel-yogas" role="tabpanel" aria-labelledby="profileview-tab-yogas">
            <YogasTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'jaimini' && chartOutput && (
          <div id="profileview-panel-jaimini" role="tabpanel" aria-labelledby="profileview-tab-jaimini">
            <JaiminiTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'ashtakavarga' && chartOutput && (
          <div id="profileview-panel-ashtakavarga" role="tabpanel" aria-labelledby="profileview-tab-ashtakavarga">
            <AshtakavargaTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'dasha' && chartOutput && (
          <div id="profileview-panel-dasha" role="tabpanel" aria-labelledby="profileview-tab-dasha">
            <DashaTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'transits' && (
          <div id="profileview-panel-transits" role="tabpanel" aria-labelledby="profileview-tab-transits">
            <TransitsTab
              transitOutput={transitOutput}
              isTransitLoading={isTransitLoading}
              onFetchTransit={onFetchTransit}
            />
          </div>
        )}
        {activeTab === 'career' && chartOutput && (
          <div id="profileview-panel-career" role="tabpanel" aria-labelledby="profileview-tab-career">
            <CareerTab
              chartOutput={chartOutput}
              careerOutput={careerOutput}
              isCareerLoading={isCareerLoading}
              onFetchCareer={onFetchCareer}
            />
          </div>
        )}
        {activeTab === 'compare' && (
          <div id="profileview-panel-compare" role="tabpanel" aria-labelledby="profileview-tab-compare">
            <CompareTab
            activeProfile={profile}
            allProfiles={allProfiles}
            selectedId={compareSelectedId}
            onSelectedId={setCompareSelectedId}
            result={compareResult}
            onResult={setCompareResult}
          />
          </div>
        )}
        {needsChart && !chartOutput && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading chart data…</p>
          </div>
        )}
      </div>
    </div>
  )
}
