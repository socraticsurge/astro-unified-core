'use client'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import posthog from 'posthog-js'
import { signIn } from 'next-auth/react'
import dynamic from 'next/dynamic'
import styles from './CosmicLanding.module.css'
import { LANDING_FALLBACK_ASCENDANTS } from '@/lib/content/landing-fallback'
import { ZODIAC, DARK_PALETTE, LIGHT_PALETTE } from './cosmic-shared'
import type { SignKey } from './cosmic-shared'

// Canvas + zodiac wheel — loaded lazily so they don't block the initial paint
// of the glass panel (brand, snippet, CTA). The panel is what users need to
// see first; the animations are progressive enhancement.
const CosmicAnimations = dynamic(() => import('./CosmicAnimations'), { ssr: false })

type LandingData = {
  ist_date: string
  sky: { moon_nakshatra: string; sun_sign: string; retrogrades: string[] }
  ascendants: Record<SignKey, string>
  is_stale: boolean
}

const STORAGE_KEY = 'astrochaganti.ascendant'
const AUTO_CYCLE_MS = 6500
const SNIPPET_FADE_OUT_MS = 700
const SNIPPET_FADE_IN_MS = 900
const RESUME_AUTOCYCLE_MS = 25_000
const SNIPPET_MAX_CHARS = 360

function truncateSnippet(s: string): string {
  if (s.length <= SNIPPET_MAX_CHARS) return s
  return s.slice(0, SNIPPET_MAX_CHARS - 1).trimEnd() + '…'
}

const SIGN_INDEX_BY_KEY: Record<SignKey, number> = ZODIAC.reduce(
  (acc, z, i) => { acc[z.key] = i; return acc },
  {} as Record<SignKey, number>,
)

function readStoredSign(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as SignKey | null
    if (stored && stored in SIGN_INDEX_BY_KEY) return SIGN_INDEX_BY_KEY[stored]
  } catch { /* ignore */ }
  return null
}

type SkyTile = { label: string; value: string }

const dashIfBlank = (v: string | undefined | null): string =>
  v && v.trim() ? v : '—'

function buildSkyTiles(d: LandingData | null): SkyTile[] {
  if (!d) {
    return [
      { label: 'Moon', value: '—' },
      { label: 'Sun',  value: '—' },
    ]
  }
  const tiles: SkyTile[] = [
    { label: 'Moon', value: dashIfBlank(d.sky?.moon_nakshatra) },
    { label: 'Sun',  value: dashIfBlank(d.sky?.sun_sign) },
  ]
  const retros = d.sky?.retrogrades?.filter(p => p && p.trim()) ?? []
  if (retros.length > 0) {
    tiles.push({ label: 'Retrograde', value: retros.join(', ') })
  }
  return tiles
}

export function CosmicLanding() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setMounted(true)
  }, [])
  const isDark = !mounted || resolvedTheme !== 'light'
  const P = isDark ? DARK_PALETTE : LIGHT_PALETTE
  const A = (op: number) => `rgba(${P.accent},${op})`

  const [data, setData] = useState<LandingData | null>(null)

  const initialRestored = readStoredSign()
  const [activeIndex, setActiveIndex] = useState(initialRestored ?? 0)
  const [isPinned, setIsPinned] = useState(initialRestored != null)

  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isStale = data?.is_stale ?? false
  function pinSign(idx: number, source: 'click' | 'tap' | 'restored') {
    if (idx < 0 || idx >= ZODIAC.length) return
    setActiveIndex(idx)
    setIsPinned(true)
    const sign = ZODIAC[idx].key
    try { window.localStorage.setItem(STORAGE_KEY, sign) } catch { /* private mode */ }
    try {
      posthog.capture('landing_ascendant_pinned', { sign, source, is_stale: isStale })
    } catch { /* posthog may not be initialized in dev without keys */ }
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    if (source !== 'restored') {
      resumeTimerRef.current = setTimeout(() => {
        setIsPinned(false)
        resumeTimerRef.current = null
      }, RESUME_AUTOCYCLE_MS)
    }
  }

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/landing/today', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as LandingData
      })
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { /* fall back to static per-sign snippets */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (isPinned) return
    const handle = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % ZODIAC.length)
    }, AUTO_CYCLE_MS)
    return () => clearInterval(handle)
  }, [isPinned])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const activeSign = ZODIAC[activeIndex]
  const targetSnippet = truncateSnippet(
    data?.ascendants?.[activeSign.key] || LANDING_FALLBACK_ASCENDANTS[activeSign.key],
  )
  const skyTiles = buildSkyTiles(data)
  const skyDayLabel = data?.is_stale ? 'Yesterday' : 'Today'

  const [displayedKey, setDisplayedKey] = useState<SignKey>(activeSign.key)
  const [displayedSnippet, setDisplayedSnippet] = useState(targetSnippet)
  const [fadePhase, setFadePhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    if (targetSnippet === displayedSnippet) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setFadePhase('out')
    const handle = setTimeout(() => {
      setDisplayedKey(activeSign.key)
      setDisplayedSnippet(targetSnippet)
      setFadePhase('in')
    }, SNIPPET_FADE_OUT_MS)
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => clearTimeout(handle)
  }, [targetSnippet, displayedSnippet, activeSign.key])

  const displayedSignName = ZODIAC[SIGN_INDEX_BY_KEY[displayedKey]]?.name ?? ''

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: P.bg,
      overflow: 'hidden',
    }}>
      {/* Canvas + zodiac wheel — deferred so they don't compete with LCP */}
      <CosmicAnimations
        isDark={isDark}
        onSignPick={(i) => pinSign(i, 'click')}
      />

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '-20%', left: '0%', width: 560, height: 440, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(50px)', zIndex: 1, background: P.blobTL }} />
      <div style={{ position: 'fixed', bottom: '-15%', right: '0%', width: 480, height: 480, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(55px)', zIndex: 1, background: P.blobBR }} />

      <div className={styles.mobileFade} />

      {/* Glass panel */}
      <div className={styles.panel}>
        <div className={styles.todaySection}>
          <div className={styles.skyRow} aria-label={`${skyDayLabel}'s transits`}>
            <span className={styles.skyDayLabel}>{skyDayLabel}</span>
            <div className={styles.skyTiles}>
              {skyTiles.map((t) => (
                <div key={t.label} className={styles.skyTile}>
                  <span className={styles.skyTileLabel}>{t.label}</span>
                  <span className={styles.skyTileValue}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.snippetText}>
            <span className={styles.cosmosEyebrow}>
              The cosmos speaks for{' '}
              <span
                className={`${styles.cosmosEyebrowSign} ${fadePhase === 'in' ? styles.snippetCopyIn : styles.snippetCopyOut}`}
                style={{
                  transitionDuration: `${fadePhase === 'in' ? SNIPPET_FADE_IN_MS : SNIPPET_FADE_OUT_MS}ms`,
                }}
              >
                {displayedSignName}
              </span>
            </span>
            <p
              className={fadePhase === 'in' ? styles.snippetCopyIn : styles.snippetCopyOut}
              style={{
                transitionDuration: `${fadePhase === 'in' ? SNIPPET_FADE_IN_MS : SNIPPET_FADE_OUT_MS}ms`,
              }}
            >
              {displayedSnippet}
            </p>
          </div>
        </div>

        <div className={styles.panelDivider} />

        <div className={styles.brandRow}>
          <div className={styles.glyphWrap}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ position: 'relative', zIndex: 1 }}>
              <ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-8 24 24)" stroke={A(0.82)} strokeWidth="1.4" fill="none" />
              <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)" stroke={A(0.6)} strokeWidth="1.1" fill="none" />
              <circle cx="13.5" cy="16" r="1.5" fill={A(0.8)} />
              <circle cx="34.5" cy="32" r="1.5" fill={A(0.8)} />
              <circle cx="24" cy="24" r="2.6" fill={A(1)} />
            </svg>
          </div>
          <div>
            <p className={styles.brandName}>Astro <em>Chaganti</em></p>
            <p className={styles.brandSub}>Vedic Astrology Readings</p>
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.featureItem}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.65 }}>
              <circle cx="14" cy="14" r="12" stroke={A(0.8)} strokeWidth="0.8" />
              <circle cx="14" cy="14" r="6" stroke={A(0.5)} strokeWidth="0.6" />
              <circle cx="14" cy="14" r="1.5" fill={A(0.9)} />
              <line x1="14" y1="2" x2="14" y2="8" stroke={A(0.55)} strokeWidth="0.7" />
              <line x1="14" y1="20" x2="14" y2="26" stroke={A(0.55)} strokeWidth="0.7" />
              <line x1="2" y1="14" x2="8" y2="14" stroke={A(0.55)} strokeWidth="0.7" />
              <line x1="20" y1="14" x2="26" y2="14" stroke={A(0.55)} strokeWidth="0.7" />
              <line x1="5.5" y1="5.5" x2="9.3" y2="9.3" stroke={A(0.28)} strokeWidth="0.6" />
              <line x1="18.7" y1="18.7" x2="22.5" y2="22.5" stroke={A(0.28)} strokeWidth="0.6" />
              <line x1="22.5" y1="5.5" x2="18.7" y2="9.3" stroke={A(0.28)} strokeWidth="0.6" />
              <line x1="9.3" y1="18.7" x2="5.5" y2="22.5" stroke={A(0.28)} strokeWidth="0.6" />
            </svg>
            <div className={styles.featureName}>Natal<br />Charts</div>
          </div>
          <div className={styles.featureSep} />
          <div className={styles.featureItem}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.65 }}>
              <circle cx="10" cy="14" r="9" stroke={A(0.8)} strokeWidth="0.8" fill={A(0.03)} />
              <circle cx="18" cy="14" r="9" stroke={A(0.8)} strokeWidth="0.8" fill={A(0.03)} />
              <path d="M14 6.6 C16.5 8.8 16.5 19.2 14 21.4 C11.5 19.2 11.5 8.8 14 6.6Z" fill={A(0.22)} />
            </svg>
            <div className={styles.featureName}>Kundali<br />Matching</div>
          </div>
          <div className={styles.featureSep} />
          <div className={styles.featureItem}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.65 }}>
              <circle cx="14" cy="9" r="4.5" stroke={A(0.8)} strokeWidth="0.8" />
              <path d="M5 24 C5 18.5 8.5 15 14 15 C19.5 15 23 18.5 23 24" stroke={A(0.8)} strokeWidth="0.8" strokeLinecap="round" fill="none" />
              <circle cx="14" cy="9" r="1.5" fill={A(0.7)} />
            </svg>
            <div className={styles.featureName}>Personal<br />Consultations</div>
          </div>
        </div>

        <div className={styles.siderealRow}>
          <div className={styles.siderealLine} />
          <span>Sidereal · Lahiri · Swiss Ephemeris</span>
          <div className={styles.siderealLine} />
        </div>

        <button
          className={styles.ctaBtn}
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill={P.googleIcon} />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill={P.googleIcon} />
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill={P.googleIcon} />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill={P.googleIcon} />
          </svg>
          Continue with Google
        </button>
        <a
          href="https://github.com/socraticsurge/astro-unified-core"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            marginTop: 10,
            color: A(0.72),
            fontSize: 11,
            letterSpacing: '0.04em',
            textAlign: 'center',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Source &amp; AGPL license
        </a>
      </div>

      {/* Mobile pill strip — sits above the panel against the sky */}
      <div className={styles.pillDock}>
        <div className={styles.pillStrip} role="tablist" aria-label="Choose your ascendant">
          {ZODIAC.map((z, i) => (
            <button
              key={z.key}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? `${styles.pill} ${styles.pillActive}` : styles.pill}
              onClick={() => pinSign(i, 'tap')}
              title={z.name}
            >
              <span aria-hidden>{z.symbol}</span>
              <span className={styles.srOnly}>{z.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
