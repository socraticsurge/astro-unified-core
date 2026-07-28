"use client"

import { useEffect, useState } from 'react'
import {
  Activity,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  ChevronRight,
  Clock3,
  Grid2X2,
  HeartHandshake,
  House,
  Menu,
  Network,
  Orbit,
  Pencil,
  Sparkles,
  Star,
  Telescope,
  Waypoints,
  X,
  type LucideIcon,
} from 'lucide-react'
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
import styles from './ProfileView.module.css'

export type ChartTabId =
  | 'today' | 'natal' | 'planets' | 'divisional'
  | 'yogas' | 'jaimini' | 'ashtakavarga'
  | 'dasha' | 'transits' | 'career' | 'compare'
  | 'muhurtha' | 'tarabalam' | 'shadbala'

type ChartGroupId = 'overview' | 'birth' | 'timing' | 'patterns' | 'life' | 'compare'

interface ChartTab {
  id: ChartTabId
  label: string
  description: string
  icon: LucideIcon
  adminOnly?: boolean
}

interface ChartGroup {
  id: ChartGroupId
  label: string
  tabs: ChartTabId[]
}

const CHART_TABS: ChartTab[] = [
  {
    id: 'today',
    label: 'Today',
    description: 'Start with what matters now in this personal chart.',
    icon: House,
  },
  {
    id: 'natal',
    label: 'Natal chart',
    description: 'The foundation of this birth chart and its written synthesis.',
    icon: ChartPie,
  },
  {
    id: 'planets',
    label: 'Planets',
    description: 'Planetary placements, dignity, and house relationships.',
    icon: Orbit,
  },
  {
    id: 'divisional',
    label: 'Divisional charts',
    description: 'Specialized Vargas for deeper chart analysis.',
    icon: Grid2X2,
    adminOnly: true,
  },
  {
    id: 'dasha',
    label: 'Dashas',
    description: 'The life-period timeline from Maha Dasha to its sub-periods.',
    icon: Clock3,
  },
  {
    id: 'transits',
    label: 'Transits',
    description: 'How the current sky interacts with the natal chart.',
    icon: Telescope,
  },
  {
    id: 'muhurtha',
    label: 'Muhurtam',
    description: 'Choose supportive timings, with personal chart validation.',
    icon: CalendarClock,
  },
  {
    id: 'tarabalam',
    label: 'Tarabalam',
    description: 'Check how a day supports the selected person.',
    icon: Waypoints,
  },
  {
    id: 'yogas',
    label: 'Yogas',
    description: 'Notable combinations and chart patterns.',
    icon: Star,
    adminOnly: true,
  },
  {
    id: 'jaimini',
    label: 'Jaimini',
    description: 'Jaimini indicators for specialist interpretation.',
    icon: Network,
    adminOnly: true,
  },
  {
    id: 'ashtakavarga',
    label: 'Ashtakavarga',
    description: 'Sign and house strength through bindu analysis.',
    icon: ChartNoAxesColumnIncreasing,
    adminOnly: true,
  },
  {
    id: 'shadbala',
    label: 'Shadbala',
    description: 'Six-fold measures of planetary strength.',
    icon: Activity,
    adminOnly: true,
  },
  {
    id: 'career',
    label: 'Career',
    description: 'Career themes and professional strengths in the chart.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'compare',
    label: 'Marriage compatibility',
    description: 'Compare two profiles through traditional compatibility measures.',
    icon: HeartHandshake,
  },
]

const CHART_GROUPS: ChartGroup[] = [
  { id: 'overview', label: 'Overview', tabs: ['today'] },
  { id: 'birth', label: 'Birth chart', tabs: ['natal', 'planets', 'divisional'] },
  { id: 'timing', label: 'Timing & decisions', tabs: ['dasha', 'transits', 'muhurtha', 'tarabalam'] },
  { id: 'patterns', label: 'Specialist analysis', tabs: ['yogas', 'jaimini', 'ashtakavarga', 'shadbala'] },
  { id: 'life', label: 'Life areas', tabs: ['career'] },
  { id: 'compare', label: 'Relationships', tabs: ['compare'] },
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
  todayReadingError?: string | null
  isTransitLoading: boolean
  isCareerLoading: boolean
  transitError?: string | null
  careerError?: string | null
  onFetchTransit: (force?: boolean) => void
  onFetchCareer: (force?: boolean) => void
  onRetryTodayReading: () => void
  onAskOpen: (context?: Partial<AskContext>) => void
  onAIOpen?: (payload: AIOpenPayload) => void
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
  todayReadingError,
  isTransitLoading,
  isCareerLoading,
  transitError,
  careerError,
  onFetchTransit,
  onFetchCareer,
  onRetryTodayReading,
  onAskOpen,
  onAIOpen,
  isAdmin = false,
  defaultTab = 'today',
  initialCompareCheck,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ChartTabId>(defaultTab)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [natalEditRequest, setNatalEditRequest] = useState(0)
  const [compareSelectedId, setCompareSelectedId] = useState<string>(() => {
    if (!initialCompareCheck) return ""
    return initialCompareCheck.profile_id_1 === profile.id
      ? initialCompareCheck.profile_id_2
      : initialCompareCheck.profile_id_1
  })
  const [compareResult, setCompareResult] = useState<CompatibilityCheck | null>(
    initialCompareCheck ?? null
  )

  useEffect(() => {
    if (!mobileNavOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileNavOpen])

  const visibleTabs = CHART_TABS.filter(tab => !tab.adminOnly || isAdmin)
  const visibleTabIds = new Set(visibleTabs.map(tab => tab.id))
  const visibleGroups = CHART_GROUPS.filter(group => group.tabs.some(tab => visibleTabIds.has(tab)))
  const activeTabEntry = visibleTabs.find(tab => tab.id === activeTab) ?? visibleTabs[0]
  const activeGroup = visibleGroups.find(group => group.tabs.includes(activeTab)) ?? visibleGroups[0]

  function activateTab(tabId: ChartTabId) {
    if (!visibleTabIds.has(tabId)) return
    setActiveTab(tabId)
    setMobileNavOpen(false)
  }

  function requestProfileEdit() {
    setActiveTab("natal")
    setMobileNavOpen(false)
    setNatalEditRequest(current => current + 1)
  }

  const handleAIOpen = () => {
    if (!onAIOpen) return
    if (activeTab === 'compare') {
      const partnerId = compareResult
        ? (compareResult.profile_id_1 === profile.id ? compareResult.profile_id_2 : compareResult.profile_id_1)
        : null
      const partner = partnerId ? allProfiles.find(candidate => candidate.id === partnerId) : null
      onAIOpen({
        activeTab,
        tabLabel: activeTabEntry?.label ?? 'Compare',
        compareCheckId: compareResult?.id ?? null,
        partnerName: partner?.name ?? null,
      })
      return
    }
    onAIOpen({
      activeTab,
      tabLabel: activeTabEntry?.label ?? activeTab,
      compareCheckId: null,
      partnerName: null,
    })
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

  const needsChart =
    activeTab !== 'today'
    && activeTab !== 'natal'
    && activeTab !== 'transits'
    && activeTab !== 'compare'
    && activeTab !== 'muhurtha'
    && activeTab !== 'tarabalam'

  const navigation = (mobile: boolean) => (
    <>
      {visibleGroups.map(group => (
        <div key={group.id} className={styles.navGroup}>
          <p className={styles.navGroupLabel}>{group.label}</p>
          {group.tabs.map(tabId => {
            const tab = visibleTabs.find(candidate => candidate.id === tabId)
            if (!tab) return null
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                id={mobile ? undefined : `profileview-tab-${tab.id}`}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                onClick={() => activateTab(tab.id)}
                className={cn(styles.navItem, activeTab === tab.id && styles.navItemActive)}
              >
                <span className={styles.navIcon}><Icon size={14} aria-hidden="true" /></span>
                <span className={styles.navLabel}>{tab.label}</span>
                <ChevronRight className={styles.navChevron} size={13} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      ))}
    </>
  )

  const panelLabelId = 'profileview-active-title'

  return (
    <div className={styles.root}>
      <aside className={styles.desktopRail}>
        <div className={styles.railProfile}>
          <div className={styles.profileIdentity} aria-label={`Current profile: ${formatName(profile.name)}`}>
            <span className={styles.profileMonogram} aria-hidden="true">
              {formatName(profile.name).charAt(0).toUpperCase()}
            </span>
            <span className={styles.profileCopy}>
              <span className={styles.profileEyebrow}>Current profile</span>
              <span className={styles.profileName}>{formatName(profile.name)}</span>
              {(profile.relationship || profile.gender) && (
                <span className={styles.profileMeta}>
                  {[profile.relationship, profile.gender].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
          </div>
          <button type="button" onClick={requestProfileEdit} className={styles.railEditButton}>
            <Pencil size={13} aria-hidden="true" />
            Edit profile
          </button>
        </div>

        <nav className={styles.railNavigation} aria-label="Profile astrology tools">
          {navigation(false)}
        </nav>

        {onAIOpen && (
          <div className={styles.railFooter}>
            <button type="button" onClick={handleAIOpen} className={styles.aiButton}>
              <span className={styles.aiIcon}><Sparkles size={15} aria-hidden="true" /></span>
              <span>
                <strong>Explore with AI</strong>
                <small>Ask about {activeTabEntry?.label.toLowerCase()}</small>
              </span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileWorkspaceHeader}>
          <div className={styles.mobileProfileRow}>
            <div className={styles.profileIdentity} aria-label={`Current profile: ${formatName(profile.name)}`}>
              <span className={styles.profileMonogram} aria-hidden="true">
                {formatName(profile.name).charAt(0).toUpperCase()}
              </span>
              <span className={styles.profileCopy}>
                <span className={styles.profileEyebrow}>Current profile</span>
                <span className={styles.profileName}>{formatName(profile.name)}</span>
              </span>
            </div>
            <div className={styles.workspaceActions}>
              <button type="button" onClick={requestProfileEdit} className={styles.editButton}>
                <Pencil size={13} aria-hidden="true" />
                <span>Edit profile</span>
              </button>
              {onAIOpen && (
                <button type="button" className={styles.headerAiButton} onClick={handleAIOpen}>
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Explore with AI</span>
                </button>
              )}
            </div>
          </div>
          <div className={styles.mobileToolRow}>
          <button
            type="button"
            className={styles.exploreButton}
            onClick={() => setMobileNavOpen(true)}
            aria-haspopup="dialog"
          >
            <Menu size={15} aria-hidden="true" />
            Explore tools
          </button>

          <p className={styles.activeToolMobile}>
            <span>{activeGroup?.label ?? 'Profile'}</span>
            {activeTabEntry?.label}
          </p>
          </div>
        </header>

        <main className={styles.content}>
          <header className={styles.contentHeader}>
            <div className={styles.contentHeading}>
              <p className={styles.contentEyebrow}>
                {formatName(profile.name)} · {activeGroup?.label ?? 'Profile'}
              </p>
              <h1 id={panelLabelId} className={styles.contentTitle}>{activeTabEntry?.label}</h1>
              <p className={styles.contentDescription}>{activeTabEntry?.description}</p>
            </div>
          </header>

          <div className={styles.scroller}>
            <div className={styles.contentInner}>
              {activeTab === 'today' && (
                <div id="profileview-panel-today" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <TodayTab
                    profileName={formatName(profile.name)}
                    chartOutput={chartOutput}
                    transitOutput={transitOutput}
                    todayReadingOutput={todayReadingOutput ?? null}
                    isTodayReadingLoading={isTodayReadingLoading}
                    todayReadingError={todayReadingError ?? null}
                    onRetryTodayReading={onRetryTodayReading}
                    onAsk={handleAskFromInsight}
                    onExplore={() => activateTab('planets')}
                    onNavigate={activateTab}
                    currentLocation={profile.current_location}
                  />
                </div>
              )}
              {activeTab === 'natal' && (
                <div id="profileview-panel-natal" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <NatalTab
                    key={`natal-${natalEditRequest}`}
                    profile={profile}
                    todayReadingOutput={todayReadingOutput ?? null}
                    isTodayReadingLoading={isTodayReadingLoading}
                    onExploreWithAI={onAIOpen ? handleAIOpen : undefined}
                    initiallyEditing={natalEditRequest > 0}
                    chartOutput={chartOutput}
                  />
                </div>
              )}
              {activeTab === 'planets' && chartOutput && (
                <div id="profileview-panel-planets" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <PlanetsTab chartOutput={chartOutput} />
                </div>
              )}
              {activeTab === 'divisional' && isAdmin && chartOutput && (
                <div id="profileview-panel-divisional" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <HousesVargasTab chartOutput={chartOutput} />
                </div>
              )}
              {activeTab === 'yogas' && isAdmin && chartOutput && (
                <div id="profileview-panel-yogas" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <YogasTab chartOutput={chartOutput} />
                </div>
              )}
              {activeTab === 'jaimini' && isAdmin && chartOutput && (
                <div id="profileview-panel-jaimini" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <JaiminiTab chartOutput={chartOutput} />
                </div>
              )}
              {activeTab === 'ashtakavarga' && isAdmin && chartOutput && (
                <div id="profileview-panel-ashtakavarga" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <AshtakavargaTab chartOutput={chartOutput} />
                </div>
              )}
              {activeTab === 'dasha' && chartOutput && (
                <div id="profileview-panel-dasha" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <DashaTab chartOutput={chartOutput} profileId={profile.id} />
                </div>
              )}
              {activeTab === 'transits' && (
                <div id="profileview-panel-transits" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
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
                <div id="profileview-panel-career" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
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
                <div id="profileview-panel-shadbala" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <ShadabalaTab chartOutput={chartOutput} />
                </div>
              )}
              {activeTab === 'muhurtha' && (
                <div id="profileview-panel-muhurtha" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <MuhurthaView profileId={profile.id} profiles={allProfiles} />
                </div>
              )}
              {activeTab === 'tarabalam' && (
                <div id="profileview-panel-tarabalam" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
                  <TarabalamView profileId={profile.id} profiles={allProfiles} />
                </div>
              )}
              {activeTab === 'compare' && (
                <div id="profileview-panel-compare" role="tabpanel" aria-labelledby={panelLabelId} className={styles.panel}>
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
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Loading chart data…</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className={styles.mobileNavBackdrop}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close tool navigation"
          />
          <aside
            className={styles.mobileNavSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-tools-title"
          >
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.railEyebrow}>Profile workspace</p>
                <h2 id="profile-tools-title" className={styles.sheetTitle}>Explore tools</h2>
                <p className={styles.sheetDescription}>
                  Everything for {formatName(profile.name)}, organized for today and deeper study.
                </p>
              </div>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close"
                autoFocus
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.sheetNavigation} aria-label="Astrology tools">
              {navigation(true)}
            </nav>
            {onAIOpen && (
              <div className={styles.sheetFooter}>
                <button type="button" onClick={handleAIOpen} className={styles.aiButton}>
                  <span className={styles.aiIcon}><Sparkles size={15} aria-hidden="true" /></span>
                  <span>
                    <strong>Explore with AI</strong>
                    <small>Ask about {activeTabEntry?.label.toLowerCase()}</small>
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  )
}
