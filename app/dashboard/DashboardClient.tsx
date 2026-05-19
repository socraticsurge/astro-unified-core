"use client"
import { useState, useEffect, useCallback } from "react"
import { NavBar } from "@/components/NavBar"
import { ProfileView } from "@/components/profiles/ProfileView"
import type { AIOpenPayload } from "@/components/profiles/ProfileView"
import { ProfileSidebar } from "@/components/profiles/ProfileSidebar"
import { AskPanel } from "@/components/panels/AskPanel"
import type { AskContext } from "@/components/panels/AskPanel"
import { AIAdminPanel } from "@/components/panels/AIAdminPanel"
import type { AIPanelContext } from "@/components/panels/AIAdminPanel"
import type { Profile, CompatibilityCheck } from "@/lib/db"

export interface AppSettings {
  writtenEnabled: boolean
  liveEnabled: boolean
  writtenFeePaise: number
  liveFeePaise: number
}

interface DashboardClientProps {
  profiles: Profile[]
  initialProfileId?: string
  isAdmin?: boolean
  initialCompareCheck?: CompatibilityCheck
  appSettings: AppSettings
}

type EngineState<T> = { data: T | null; loading: boolean; error: string | null }

function initState<T>(): EngineState<T> {
  return { data: null, loading: false, error: null }
}

export function DashboardClient({
  profiles,
  initialProfileId,
  isAdmin = false,
  initialCompareCheck,
  appSettings,
}: DashboardClientProps) {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    initialProfileId ?? profiles[0]?.id ?? null
  )
  const [chart,   setChart]   = useState(initState<Record<string, unknown>>())
  const [transit, setTransit] = useState(initState<Record<string, unknown>>())
  const [career,  setCareer]  = useState(initState<Record<string, unknown>>())
  const [askOpen, setAskOpen] = useState(false)
  const [askCtx,  setAskCtx]  = useState<Partial<AskContext>>({})
  const [aiOpen,  setAiOpen]  = useState(false)
  const [aiCtx,   setAiCtx]   = useState<AIPanelContext | null>(null)

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null

  useEffect(() => {
    if (!activeProfileId) return
    setChart({ data: null, loading: true, error: null })
    setTransit(initState())
    setCareer(initState())
    setAiOpen(false)

    fetch(`/api/readings/dashaflow?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => setChart({ data: data.output ?? null, loading: false, error: data.error ?? null }))
      .catch(e => setChart({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId])

  const fetchTransit = useCallback((force = false) => {
    if (!activeProfileId) return
    if (transit.data && !force) return
    setTransit(s => ({ ...s, loading: true }))

    fetch(`/api/readings/transit?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => setTransit({ data: data.output ?? null, loading: false, error: data.error ?? null }))
      .catch(e => setTransit({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId, transit.data])

  const fetchCareer = useCallback((force = false) => {
    if (!activeProfileId) return
    if (career.data && !force) return
    setCareer(s => ({ ...s, loading: true }))

    fetch(`/api/readings/career?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => setCareer({ data: data.output ?? null, loading: false, error: data.error ?? null }))
      .catch(e => setCareer({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId, career.data])

  const handleAIOpen = useCallback((payload: AIOpenPayload) => {
    if (!activeProfile) return
    setAiCtx({
      profileId:      activeProfile.id,
      profileName:    activeProfile.name,
      activeTab:      payload.activeTab,
      tabLabel:       payload.tabLabel,
      compareCheckId: payload.compareCheckId,
      partnerName:    payload.partnerName,
    })
    setAiOpen(true)
  }, [activeProfile])

  const handleAskOpen = useCallback((ctx?: Partial<AskContext>) => {
    const data = chart.data?.data as Record<string, unknown> | undefined
    const dashas = data?.dashas as { maha?: { planet?: string }; antar?: { planet?: string } } | undefined
    setAskCtx({
      profileName:  activeProfile?.name ?? '',
      relationship: activeProfile?.relationship ?? 'Other',
      mahadasha:    dashas?.maha?.planet ?? '—',
      antardasha:   dashas?.antar?.planet ?? '—',
      tab:          'Today',
      ...ctx,
    })
    setAskOpen(true)
  }, [activeProfile, chart.data])

  const handleAskSubmit = useCallback(async (question: string) => {
    if (!activeProfile) return
    const res = await fetch('/api/consultation-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        profile_ids: [activeProfile.id],
        delivery_mode: 'written',
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error((data as { error?: string }).error ?? 'Failed to submit')
    }
  }, [activeProfile])

  // Open compare tab pre-loaded when an admin-viewed compatibility check is passed
  const defaultTab = initialCompareCheck ? 'compare' : undefined

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-ink-1)]">Your cosmic story starts here</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Enter your birth details — everything else flows from there.
          </p>
          <a
            href="/profiles/new"
            className="px-6 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Create your first profile
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <NavBar
        profiles={profiles.map(p => ({
          id: p.id,
          name: p.name,
          relationship: p.relationship ?? null,
        }))}
        activeProfileId={activeProfileId}
        onProfileChange={setActiveProfileId}
        onAskOpen={() => handleAskOpen()}
      />

      <div className="flex-1 overflow-hidden flex">
        {activeProfile && (
          <ProfileSidebar profile={activeProfile} chartOutput={chart.data} />
        )}
        <div className="flex-1 overflow-hidden">
          {activeProfile ? (
            <div key={activeProfileId} className="animate-profile-enter h-full">
              <ProfileView
                profile={activeProfile}
                allProfiles={profiles}
                chartOutput={chart.data}
                transitOutput={transit.data}
                careerOutput={career.data}
                isTransitLoading={transit.loading}
                isCareerLoading={career.loading}
                onFetchTransit={fetchTransit}
                onFetchCareer={fetchCareer}
                onAskOpen={handleAskOpen}
                onAIOpen={handleAIOpen}
                isAdmin={isAdmin}
                defaultTab={defaultTab}
                initialCompareCheck={initialCompareCheck}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a profile above.</p>
            </div>
          )}
        </div>
      </div>

      <AskPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        context={{
          profileName:  askCtx.profileName  ?? '',
          relationship: askCtx.relationship ?? 'Other',
          mahadasha:    askCtx.mahadasha    ?? '—',
          antardasha:   askCtx.antardasha   ?? '—',
          tab:          askCtx.tab          ?? 'Today',
          insightTitle: askCtx.insightTitle,
        }}
        writtenEnabled={appSettings.writtenEnabled}
        liveEnabled={appSettings.liveEnabled}
        writtenFeePaise={appSettings.writtenFeePaise}
        liveFeePaise={appSettings.liveFeePaise}
        onSubmit={handleAskSubmit}
      />

      {isAdmin && (
        <AIAdminPanel
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          context={aiCtx}
        />
      )}
    </div>
  )
}
