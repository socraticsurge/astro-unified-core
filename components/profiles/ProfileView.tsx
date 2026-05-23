"use client"
import { useState } from 'react'
import { Sparkles, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatName } from '@/lib/display'
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
import { ShadabalaTab }      from '@/components/unified/tabs/ShadabalaTab'
import { NatalTab }          from '@/components/tabs/NatalTab'
import { MuhurthaView }      from '@/components/engines/MuhurthaView'
import { TarabalamView }     from '@/components/engines/TarabalamView'
import type { AskContext }   from '@/components/panels/AskPanel'

export type ChartTabId =
  | 'today' | 'natal' | 'planets' | 'divisional'
  | 'yogas' | 'jaimini' | 'ashtakavarga'
  | 'dasha' | 'transits' | 'career' | 'compare'
  | 'muhurtha' | 'tarabalam' | 'shadbala'


const CHART_TABS: { id: ChartTabId; label: string; adminOnly?: boolean }[] = [
  { id: 'today',        label: 'Current Period' },
  { id: 'natal',        label: 'Natal Chart'    },
  { id: 'planets',      label: 'Planets'        },
  { id: 'divisional',   label: 'Divisional',    adminOnly: true },
  { id: 'yogas',        label: 'Yogas',         adminOnly: true },
  { id: 'jaimini',      label: 'Jaimini',       adminOnly: true },
  { id: 'ashtakavarga', label: 'Ashtakavarga',  adminOnly: true },
  { id: 'dasha',        label: 'Dashas',        adminOnly: true },
  { id: 'transits',     label: 'Transits',      adminOnly: true },
  { id: 'career',       label: 'Career'         },
  { id: 'compare',      label: 'Marriage Compatibility' },
  { id: 'shadbala',     label: 'Shadbala',      adminOnly: true },
  { id: 'muhurtha',     label: 'Muhurtha',      adminOnly: true },
  { id: 'tarabalam',    label: 'Tarabalam',     adminOnly: true },
]

export interface AIOpenPayload {
  activeTab:      ChartTabId
  tabLabel:       string
  compareCheckId: string | null
  partnerName:    string | null
}

interface TodayReadingOutput {
  dasha_reading: string
  chart_reading: string
}

interface ProfileViewProps {
  profile: Profile
  allProfiles: Profile[]
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  careerOutput: Record<string, unknown> | null
  todayReadingOutput?: TodayReadingOutput | null
  isTodayReadingLoading?: boolean
  isTransitLoading: boolean
  isCareerLoading: boolean
  transitError?: string | null
  careerError?: string | null
  onFetchTransit: (force?: boolean) => void
  onFetchCareer: (force?: boolean) => void
  onAskOpen: (context?: Partial<AskContext>) => void
  onAIOpen?: (payload: AIOpenPayload) => void
  onOpenSidebar?: () => void
  isAdmin?: boolean
  defaultTab?: ChartTabId
  initialCompareCheck?: CompatibilityCheck
}

export function ProfileView({
  profile,
  allProfiles,
  chartOutput,
  transitOutput,
  careerOutput,
  todayReadingOutput,
  isTodayReadingLoading = false,
  isTransitLoading,
  isCareerLoading,
  transitError,
  careerError,
  onFetchTransit,
  onFetchCareer,
  onAskOpen,
  onAIOpen,
  onOpenSidebar,
  isAdmin = false,
  defaultTab = 'today',
  initialCompareCheck,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ChartTabId>(defaultTab)
  const [compareSelectedId, setCompareSelectedId] = useState<string>(() => {
    if (!initialCompareCheck) return ""
    return initialCompareCheck.profile_id_1 === profile.id
      ? initialCompareCheck.profile_id_2
      : initialCompareCheck.profile_id_1
  })
  const [compareResult, setCompareResult] = useState<CompatibilityCheck | null>(
    initialCompareCheck ?? null
  )

  const handleAIOpen = () => {
    if (!onAIOpen) return
    const tabEntry = CHART_TABS.find(t => t.id === activeTab)
    if (activeTab === 'compare') {
      const partnerId = compareResult
        ? (compareResult.profile_id_1 === profile.id ? compareResult.profile_id_2 : compareResult.profile_id_1)
        : null
      const partner = partnerId ? allProfiles.find(p => p.id === partnerId) : null
      onAIOpen({ activeTab, tabLabel: tabEntry?.label ?? 'Compare', compareCheckId: compareResult?.id ?? null, partnerName: partner?.name ?? null })
    } else {
      onAIOpen({ activeTab, tabLabel: tabEntry?.label ?? activeTab, compareCheckId: null, partnerName: null })
    }
  }

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

  const needsChart = activeTab !== 'today' && activeTab !== 'natal' && activeTab !== 'transits' && activeTab !== 'compare' && activeTab !== 'muhurtha' && activeTab !== 'tarabalam'

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Mobile-only profile header — sidebar toggle + Ask */}
      <div className="flex-shrink-0 md:hidden flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            title="View birth charts & profile details"
            className="p-2 rounded text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors shrink-0"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--color-ink-1)] truncate">{formatName(profile.name)}</p>
            {(profile.relationship || profile.gender) && (
              <p className="text-xs text-muted-foreground">
                {[profile.relationship, profile.gender].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => handleAskFromInsight()}
          title="Ask Dr Chaganti"
          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-faint)] transition-colors shrink-0 ml-2"
        >
          <span aria-hidden="true">✦</span>
          Ask
        </button>
      </div>

      {/* Tab bar — kept visible while scrolling the active tab's content.
          `flex-shrink-0` pins it in the flex column; the background ensures
          tab content scrolling beneath doesn't bleed through. */}
      <div className="flex-shrink-0 flex items-stretch border-b border-[var(--color-border)] bg-[var(--color-background)] z-10">
        {/* overflow-x-auto means the strip horizontally scrolls when the
           tab labels are wider than the viewport — which is every mobile
           viewport. We previously hid the scrollbar unconditionally with
           `[scrollbar-width:none]`, so mobile users saw "Jaimi…" clipped
           at the right edge with no visual cue they could swipe.
           Now the scrollbar shows below `sm` (mobile) as the swipe
           affordance, and stays hidden from `sm` and up where the strip
           usually fits without scrolling. */}
        <div
          role="tablist"
          className="flex-1 overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
        >
          <div className="flex min-w-max">
            {CHART_TABS.filter(t => !t.adminOnly || isAdmin).map(t => (
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
        {isAdmin && (
          <button
            type="button"
            onClick={handleAIOpen}
            title="Open AI Assistant"
            className="shrink-0 flex items-center gap-1 px-3 border-l border-[var(--color-border)] text-[11px] font-medium text-muted-foreground hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <Sparkles className="h-3 w-3 text-[var(--color-accent)]" />
            AI
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'today' && (
          <div id="profileview-panel-today" role="tabpanel" aria-labelledby="profileview-tab-today">
            <TodayTab
              chartOutput={chartOutput}
              transitOutput={transitOutput}
              todayReadingOutput={todayReadingOutput ?? null}
              isTodayReadingLoading={isTodayReadingLoading}
              onAsk={handleAskFromInsight}
              onExplore={() => setActiveTab('planets')}
            />
          </div>
        )}
        {activeTab === 'natal' && (
          <div id="profileview-panel-natal" role="tabpanel" aria-labelledby="profileview-tab-natal">
            <NatalTab
              todayReadingOutput={todayReadingOutput ?? null}
              isTodayReadingLoading={isTodayReadingLoading}
              chartOutput={chartOutput}
            />
          </div>
        )}
        {activeTab === 'planets' && chartOutput && (
          <div id="profileview-panel-planets" role="tabpanel" aria-labelledby="profileview-tab-planets">
            <PlanetsTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'divisional' && isAdmin && chartOutput && (
          <div id="profileview-panel-divisional" role="tabpanel" aria-labelledby="profileview-tab-divisional">
            <HousesVargasTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'yogas' && isAdmin && chartOutput && (
          <div id="profileview-panel-yogas" role="tabpanel" aria-labelledby="profileview-tab-yogas">
            <YogasTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'jaimini' && isAdmin && chartOutput && (
          <div id="profileview-panel-jaimini" role="tabpanel" aria-labelledby="profileview-tab-jaimini">
            <JaiminiTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'ashtakavarga' && isAdmin && chartOutput && (
          <div id="profileview-panel-ashtakavarga" role="tabpanel" aria-labelledby="profileview-tab-ashtakavarga">
            <AshtakavargaTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'dasha' && isAdmin && chartOutput && (
          <div id="profileview-panel-dasha" role="tabpanel" aria-labelledby="profileview-tab-dasha">
            <DashaTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'transits' && isAdmin && (
          <div id="profileview-panel-transits" role="tabpanel" aria-labelledby="profileview-tab-transits">
            <TransitsTab
              chartOutput={chartOutput}
              transitOutput={transitOutput}
              isTransitLoading={isTransitLoading}
              transitError={transitError}
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
              careerError={careerError}
              onFetchCareer={onFetchCareer}
            />
          </div>
        )}
        {activeTab === 'shadbala' && isAdmin && chartOutput && (
          <div id="profileview-panel-shadbala" role="tabpanel" aria-labelledby="profileview-tab-shadbala">
            <ShadabalaTab chartOutput={chartOutput} />
          </div>
        )}
        {activeTab === 'muhurtha' && isAdmin && (
          <div id="profileview-panel-muhurtha" role="tabpanel" aria-labelledby="profileview-tab-muhurtha">
            <MuhurthaView profileId={profile.id} />
          </div>
        )}
        {activeTab === 'tarabalam' && isAdmin && (
          <div id="profileview-panel-tarabalam" role="tabpanel" aria-labelledby="profileview-tab-tarabalam">
            <TarabalamView profileId={profile.id} profiles={allProfiles} />
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
