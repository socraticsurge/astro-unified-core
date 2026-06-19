"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import posthog from "posthog-js"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { NavBar } from "@/components/NavBar"
import { ProfileView } from "@/components/profiles/ProfileView"
import type { AIOpenPayload } from "@/components/profiles/ProfileView"
import { ProfileSidebar, ProfileSidebarCreate } from "@/components/profiles/ProfileSidebar"
import { ProfileLoadingScreen } from "@/components/ProfileLoadingScreen"
import { AskPanel } from "@/components/panels/AskPanel"
import type { AskContext } from "@/components/panels/AskPanel"
import { AIAdminPanel } from "@/components/panels/AIAdminPanel"
import type { AIPanelContext } from "@/components/panels/AIAdminPanel"
import type { Profile, CompatibilityCheck } from "@/lib/db"
import { formatName } from "@/lib/display"

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
  isNewProfile?: boolean
  isCreating?: boolean
  initialCompareCheck?: CompatibilityCheck
  viewingUserLabel?: string
  appSettings: AppSettings
}

type EngineState<T> = { data: T | null; loading: boolean; error: string | null }

function initState<T>(): EngineState<T> {
  return { data: null, loading: false, error: null }
}

// In-memory cache of fetched engine output, keyed by profile id. Avoids
// refetching chart/transit/career/today-reading every time the user toggles
// between profile pills in the NavBar. Refresh via the existing
// fetchTransit/fetchCareer(force=true) paths still bypasses this.
// Today reading shape carries `meta` alongside the two strings so the Today
// tab can wire copy / share / thumbs feedback per reading row.
type TodayReadingMeta = {
  current: { id: string | null; rating: 1 | -1 | null }
  natal:   { id: string | null; rating: 1 | -1 | null }
}
type TodayReadingData = {
  dasha_reading: string
  chart_reading: string
  meta?: TodayReadingMeta
}

type ProfileCache = {
  chart: Record<string, unknown> | null
  transit: Record<string, unknown> | null
  career: Record<string, unknown> | null
  todayReading: TodayReadingData | null
}

export function DashboardClient({
  profiles,
  initialProfileId,
  isAdmin = false,
  isNewProfile = false,
  isCreating = false,
  initialCompareCheck,
  viewingUserLabel,
  appSettings,
}: DashboardClientProps) {
  const router = useRouter();
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    initialProfileId ?? profiles[0]?.id ?? null
  )
  const [chart,        setChart]        = useState(initState<Record<string, unknown>>())
  const [transit,      setTransit]      = useState(initState<Record<string, unknown>>())
  const [career,       setCareer]       = useState(initState<Record<string, unknown>>())
  const [todayReading, setTodayReading] = useState(initState<TodayReadingData>())
  const [askOpen, setAskOpen] = useState(false)
  const [askCtx,  setAskCtx]  = useState<Partial<AskContext>>({})
  const [aiOpen,  setAiOpen]  = useState(false)
  const [aiCtx,   setAiCtx]   = useState<AIPanelContext | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Loading screen state — only shown once for new profiles
  const [showLoadingScreen, setShowLoadingScreen] = useState(isNewProfile)
  const minTimeReachedRef = useRef(!isNewProfile)
  const fetchesDoneRef    = useRef(!isNewProfile)

  const profileCacheRef = useRef<Map<string, ProfileCache>>(new Map())

  function updateCache(profileId: string, patch: Partial<ProfileCache>) {
    const prev = profileCacheRef.current.get(profileId) ?? {
      chart: null, transit: null, career: null, todayReading: null,
    }
    profileCacheRef.current.set(profileId, { ...prev, ...patch })
  }

  function tryDismissLoading() {
    if (minTimeReachedRef.current && fetchesDoneRef.current) {
      setShowLoadingScreen(false)
    }
  }

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null

  // New profile: parallel prefetch of all engines, loading screen waits for completion
  useEffect(() => {
    if (!isNewProfile || !activeProfileId) return

    minTimeReachedRef.current = false
    fetchesDoneRef.current    = false

    // Minimum 1.4s for the animation — long enough to feel deliberate,
    // short enough not to feel like waiting. (Was 2s; dropped because the
    // loader was the slowest part of the flow.)
    const timer = setTimeout(() => {
      minTimeReachedRef.current = true
      tryDismissLoading()
    }, 1400)

    // Dismiss the loader as soon as the CHART is ready. Transit, career and
    // today-reading load in the background; ProfileView shows their own
    // per-engine loading states. Gating on today-reading (an LLM call) was
    // the main culprit — it could keep the loader up for 5-10s on cold
    // starts.
    function onChartSettled() {
      fetchesDoneRef.current = true
      tryDismissLoading()
    }

    // Reset engine states to loading before fetches begin. setState-in-effect
    // is the right shape here — the rule is meant to flag derivable state,
    // but these are fetch-driven and have no synchronous derivation.
    /* eslint-disable react-hooks/set-state-in-effect */
    setChart({ data: null, loading: true, error: null })
    setTransit({ data: null, loading: true, error: null })
    setCareer({ data: null, loading: true, error: null })
    setTodayReading({ data: null, loading: true, error: null })
    /* eslint-enable react-hooks/set-state-in-effect */

    // Chart — then chain today-reading since it needs chart in DB first
    fetch(`/api/readings/dashaflow?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => {
        const output = data.output ?? null
        setChart({ data: output, loading: false, error: data.error ?? null })
        if (output) updateCache(activeProfileId, { chart: output })
        // Chart is ready — dismiss the loader. The rest fills in behind it.
        onChartSettled()

        // today-reading needs chart cached first; loader doesn't wait
        fetch(`/api/readings/today-reading?profile_id=${activeProfileId}`)
          .then(r => r.json())
          .then(d => {
            const tr: TodayReadingData | null = d.output
              ? { ...d.output, meta: d.meta as TodayReadingMeta | undefined }
              : null
            setTodayReading({ data: tr, loading: false, error: d.error ?? null })
            if (tr) updateCache(activeProfileId, { todayReading: tr })
          })
          .catch(() => setTodayReading(initState()))
      })
      .catch(e => {
        setChart({ data: null, loading: false, error: String(e) })
        // Chart failed — still dismiss the loader so the user sees the
        // error state on the dashboard rather than spinning forever.
        onChartSettled()
        setTodayReading(initState())
      })

    // Transit — independent of chart, loader doesn't wait
    fetch(`/api/readings/transit?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => {
        const output = data.output ?? null
        setTransit({ data: output, loading: false, error: data.error ?? null })
        if (output) updateCache(activeProfileId, { transit: output })
      })
      .catch(() => setTransit(initState()))

    // Career — independent of chart, loader doesn't wait
    fetch(`/api/readings/career?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => {
        const output = data.output ?? null
        setCareer({ data: output, loading: false, error: data.error ?? null })
        if (output) updateCache(activeProfileId, { career: output })
      })
      .catch(() => setCareer(initState()))

    return () => clearTimeout(timer)
  }, [isNewProfile, activeProfileId])

  // Returning user: chart + transit in parallel; career loads on tab open.
  // Hits the in-memory cache first so toggling profile pills doesn't refetch.
  useEffect(() => {
    if (isNewProfile || !activeProfileId) return

    // Close the AI panel and restore engine states from cache (hit) or
    // reset to loading (miss) when the active profile changes. Fetch-driven
    // state; no synchronous derivation possible.
    /* eslint-disable react-hooks/set-state-in-effect */
    setAiOpen(false)

    const cached = profileCacheRef.current.get(activeProfileId)
    if (cached) {
      setChart({ data: cached.chart, loading: false, error: null })
      setTransit({ data: cached.transit, loading: cached.transit === null, error: null })
      setCareer({ data: cached.career, loading: false, error: null })
      setTodayReading({ data: cached.todayReading, loading: false, error: null })
      // If transit was never fetched for this profile, fall through to fetch it.
      if (cached.transit !== null) return
    } else {
      setChart({ data: null, loading: true, error: null })
      setTransit({ data: null, loading: true, error: null })
      setCareer(initState())
      setTodayReading(initState())
    }
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!cached) {
      fetch(`/api/readings/dashaflow?profile_id=${activeProfileId}`)
        .then(r => r.json())
        .then(data => {
          const output = data.output ?? null
          setChart({ data: output, loading: false, error: data.error ?? null })
          if (output) {
            updateCache(activeProfileId, { chart: output })
            setTodayReading(s => ({ ...s, loading: true }))
            fetch(`/api/readings/today-reading?profile_id=${activeProfileId}`)
              .then(r => r.json())
              .then(d => {
                const tr: TodayReadingData | null = d.output
                  ? { ...d.output, meta: d.meta as TodayReadingMeta | undefined }
                  : null
                setTodayReading({ data: tr, loading: false, error: d.error ?? null })
                if (tr) updateCache(activeProfileId, { todayReading: tr })
              })
              .catch(() => setTodayReading(initState()))
          }
        })
        .catch(e => setChart({ data: null, loading: false, error: String(e) }))
    }

    fetch(`/api/readings/transit?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => {
        const output = data.output ?? null
        setTransit({ data: output, loading: false, error: data.error ?? null })
        if (output) updateCache(activeProfileId, { transit: output })
      })
      .catch(() => setTransit(initState()))
  }, [isNewProfile, activeProfileId])

  const fetchTransit = useCallback((force = false) => {
    if (!activeProfileId) return
    if (transit.data && !force) return
    setTransit(s => ({ ...s, loading: true }))

    fetch(`/api/readings/transit?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => {
        const output = data.output ?? null
        setTransit({ data: output, loading: false, error: data.error ?? null })
        if (output) updateCache(activeProfileId, { transit: output })
      })
      .catch(e => setTransit({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId, transit.data])

  const fetchCareer = useCallback((force = false) => {
    if (!activeProfileId) return
    if (career.data && !force) return
    setCareer(s => ({ ...s, loading: true }))

    fetch(`/api/readings/career?profile_id=${activeProfileId}`)
      .then(r => r.json())
      .then(data => {
        const output = data.output ?? null
        setCareer({ data: output, loading: false, error: data.error ?? null })
        if (output) updateCache(activeProfileId, { career: output })
      })
      .catch(e => setCareer({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId, career.data])

  const handleAIOpen = useCallback((payload: AIOpenPayload) => {
    if (!activeProfile) return
    posthog.capture("ai_insight_panel_opened", {
      tab: payload.activeTab,
      tab_label: payload.tabLabel,
    })
    setAiCtx({
      profileId:      activeProfile.id,
      profileName:    formatName(activeProfile.name),
      activeTab:      payload.activeTab,
      tabLabel:       payload.tabLabel,
      compareCheckId: payload.compareCheckId,
      partnerName:    payload.partnerName ? formatName(payload.partnerName) : payload.partnerName,
    })
    setAiOpen(true)
  }, [activeProfile])

  const handleAskOpen = useCallback((ctx?: Partial<AskContext>) => {
    const data = chart.data?.data as Record<string, unknown> | undefined
    const dashas = data?.dashas as { maha?: { planet?: string }; antar?: { planet?: string } } | undefined
    posthog.capture("ask_panel_opened", {
      tab: ctx?.tab ?? 'Current Period',
    })
    setAskCtx({
      profileName:  formatName(activeProfile?.name ?? ''),
      relationship: activeProfile?.relationship ?? 'Other',
      mahadasha:    dashas?.maha?.planet ?? '—',
      antardasha:   dashas?.antar?.planet ?? '—',
      tab:          'Current Period',
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

  const defaultTab = initialCompareCheck ? 'compare' : undefined

  // Cancel "create" mode → return to existing profile (or home if none).
  const cancelCreate = () => {
    if (profiles.length > 0) {
      router.push(`/dashboard?profile=${profiles[0].id}`)
    } else {
      router.push("/")
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {showLoadingScreen && activeProfile && (
        <ProfileLoadingScreen profileName={activeProfile.name} />
      )}

      <NavBar
        profiles={profiles.map(p => ({
          id: p.id,
          name: p.name,
          relationship: p.relationship ?? null,
        }))}
        activeProfileId={activeProfileId}
        onProfileChange={(id) => { setActiveProfileId(id); setMobileSidebarOpen(false) }}
        onAskOpen={() => handleAskOpen()}
      />

      {/* Admin context banner — shown when admin is browsing another user's account */}
      {viewingUserLabel && (
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-1.5 bg-[var(--color-accent)] text-[var(--color-button-fg)] text-xs font-medium">
          <span>
            👁 Viewing <strong>{viewingUserLabel}</strong>&apos;s account
          </span>
          <Link
            href="/admin"
            className="underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
          >
            ← Back to admin
          </Link>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {isCreating ? (
          <ProfileSidebarCreate onCancel={profiles.length > 0 ? cancelCreate : undefined} />
        ) : (
          activeProfile && (
            <ProfileSidebar
              profile={activeProfile}
              chartOutput={chart.data}
              mobileOpen={mobileSidebarOpen}
              onMobileClose={() => setMobileSidebarOpen(false)}
            />
          )
        )}
        <div className="flex-1 overflow-hidden">
          {/* isCreating takes precedence: even if an activeProfile is set
              (e.g. user navigated from /dashboard?profile=A to
              /dashboard?create=1), we must NOT render the previous
              profile's chart underneath the create form. */}
          {isCreating ? (
            <div className="flex items-center justify-center h-full px-4 text-center">
              <div className="space-y-2 max-w-sm">
                <p className="text-sm text-[var(--color-ink-2)]">
                  {profiles.length === 0 ? "Your cosmic story starts here." : "Add another profile"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Enter the birth details in the sidebar. Everything else flows from there.
                </p>
              </div>
            </div>
          ) : activeProfile ? (
            <div key={activeProfileId} className="animate-profile-enter h-full">
              <ProfileView
                profile={activeProfile}
                allProfiles={profiles}
                chartOutput={chart.data}
                transitOutput={transit.data}
                careerOutput={career.data}
                todayReadingOutput={todayReading.data}
                isTodayReadingLoading={todayReading.loading}
                isTransitLoading={transit.loading}
                isCareerLoading={career.loading}
                transitError={transit.error}
                careerError={career.error}
                onFetchTransit={fetchTransit}
                onFetchCareer={fetchCareer}
                onAskOpen={handleAskOpen}
                onAIOpen={handleAIOpen}
                onOpenSidebar={() => setMobileSidebarOpen(true)}
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
          tab:          askCtx.tab          ?? 'Current Period',
          insightTitle: askCtx.insightTitle,
        }}
        writtenEnabled={appSettings.writtenEnabled}
        liveEnabled={appSettings.liveEnabled}
        writtenFeePaise={appSettings.writtenFeePaise}
        liveFeePaise={appSettings.liveFeePaise}
        onSubmit={handleAskSubmit}
      />

      <AIAdminPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        context={aiCtx}
        isAdmin={isAdmin}
      />
    </div>
  )
}
