'use client'
import { useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import styles from './CosmicLanding.module.css'

const QUOTES_DESKTOP = [
  "The moon in your seventh house pulls at every bond you hold dear.",
  "Saturn's return brings the lessons you were born to learn.",
  "Your rising sign shapes every first impression you'll ever make.",
  "Jupiter's light in your tenth house opens doors you've only dreamed of.",
  "The stars do not compel — they illuminate the path already within you.",
]

const QUOTES_MOBILE = [
  "The moon pulls at every bond you hold dear.",
  "Saturn's return brings lessons you were born to learn.",
  "Your rising sign shapes every first impression.",
  "Jupiter opens doors you've only dreamed of.",
  "The stars illuminate the path within you.",
]

const ZODIAC = [
  { symbol: '♈', name: 'Aries' }, { symbol: '♉', name: 'Taurus' },
  { symbol: '♊', name: 'Gemini' }, { symbol: '♋', name: 'Cancer' },
  { symbol: '♌', name: 'Leo' }, { symbol: '♍', name: 'Virgo' },
  { symbol: '♎', name: 'Libra' }, { symbol: '♏', name: 'Scorpio' },
  { symbol: '♐', name: 'Sagittarius' }, { symbol: '♑', name: 'Capricorn' },
  { symbol: '♒', name: 'Aquarius' }, { symbol: '♓', name: 'Pisces' },
]

export function CosmicLanding() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zodiacGRef = useRef<SVGGElement>(null)
  const quoteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const g = zodiacGRef.current
    if (!g) return
    const ns = 'http://www.w3.org/2000/svg'
    const R = 300, r1 = 262, r2 = 228
    const SYM = (R + r1) / 2, NAM = (r1 + r2) / 2

    const tickRing = document.createElementNS(ns, 'circle')
    tickRing.setAttribute('r', String(R + 17))
    tickRing.setAttribute('fill', 'none')
    tickRing.setAttribute('stroke', 'rgba(251,191,36,0.15)')
    tickRing.setAttribute('stroke-width', '1')
    g.appendChild(tickRing)

    for (let i = 0; i < 72; i++) {
      const a = i * 5 * Math.PI / 180
      const major = i % 6 === 0
      const l = document.createElementNS(ns, 'line')
      l.setAttribute('x1', String(Math.cos(a) * (major ? R + 2 : R + 6)))
      l.setAttribute('y1', String(Math.sin(a) * (major ? R + 2 : R + 6)))
      l.setAttribute('x2', String(Math.cos(a) * (R + 16)))
      l.setAttribute('y2', String(Math.sin(a) * (R + 16)))
      l.setAttribute('stroke', major ? 'rgba(251,191,36,0.6)' : 'rgba(180,160,255,0.22)')
      l.setAttribute('stroke-width', major ? '1.3' : '0.5')
      g.appendChild(l)
    }

    const outerRing = document.createElementNS(ns, 'circle')
    outerRing.setAttribute('r', String(R))
    outerRing.setAttribute('fill', 'none')
    outerRing.setAttribute('stroke', 'rgba(180,160,255,0.32)')
    outerRing.setAttribute('stroke-width', '0.8')
    g.appendChild(outerRing)

    ZODIAC.forEach((z, i) => {
      const a0 = (i * 30 - 90) * Math.PI / 180
      const a1 = ((i + 1) * 30 - 90) * Math.PI / 180
      const am = ((i + 0.5) * 30 - 90) * Math.PI / 180
      const c0 = Math.cos(a0), s0 = Math.sin(a0)
      const c1 = Math.cos(a1), s1 = Math.sin(a1)
      const cm = Math.cos(am), sm = Math.sin(am)
      const deg = (i + 0.5) * 30 - 90
      const sx = cm * SYM, sy = sm * SYM
      const nx = cm * NAM, ny = sm * NAM

      const outer = `M${c0 * r1} ${s0 * r1} L${c0 * R} ${s0 * R} A${R} ${R} 0 0 1 ${c1 * R} ${s1 * R} L${c1 * r1} ${s1 * r1} A${r1} ${r1} 0 0 0 ${c0 * r1} ${s0 * r1}Z`
      const inner = `M${c0 * r2} ${s0 * r2} L${c0 * r1} ${s0 * r1} A${r1} ${r1} 0 0 1 ${c1 * r1} ${s1 * r1} L${c1 * r2} ${s1 * r2} A${r2} ${r2} 0 0 0 ${c0 * r2} ${s0 * r2}Z`

      const outerPath = document.createElementNS(ns, 'path')
      outerPath.setAttribute('d', outer)
      outerPath.setAttribute('fill', i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(140,100,255,0.05)')
      outerPath.setAttribute('stroke', 'rgba(180,160,255,0.22)')
      outerPath.setAttribute('stroke-width', '0.8')
      g.appendChild(outerPath)

      const innerPath = document.createElementNS(ns, 'path')
      innerPath.setAttribute('d', inner)
      innerPath.setAttribute('fill', i % 2 === 0 ? 'rgba(10,5,28,0.78)' : 'rgba(18,9,40,0.78)')
      innerPath.setAttribute('stroke', 'rgba(180,160,255,0.15)')
      innerPath.setAttribute('stroke-width', '0.5')
      g.appendChild(innerPath)

      const sym = document.createElementNS(ns, 'text')
      sym.setAttribute('x', String(sx)); sym.setAttribute('y', String(sy))
      sym.setAttribute('text-anchor', 'middle'); sym.setAttribute('dominant-baseline', 'central')
      sym.setAttribute('font-size', '22'); sym.setAttribute('fill', 'rgba(255,255,255,0.4)')
      sym.setAttribute('transform', `rotate(${deg},${sx},${sy})`)
      sym.textContent = z.symbol
      g.appendChild(sym)

      const nam = document.createElementNS(ns, 'text')
      nam.setAttribute('x', String(nx)); nam.setAttribute('y', String(ny))
      nam.setAttribute('text-anchor', 'middle'); nam.setAttribute('dominant-baseline', 'central')
      nam.setAttribute('font-size', '7'); nam.setAttribute('fill', 'rgba(255,255,255,0.4)')
      nam.setAttribute('letter-spacing', '0.1em')
      nam.setAttribute('transform', `rotate(${deg + 90},${nx},${ny})`)
      nam.textContent = z.name.toUpperCase()
      g.appendChild(nam)
    })

    ;([
      [r2, 'rgba(180,160,255,0.35)', '1.2'],
      [r2 - 10, 'rgba(251,191,36,0.22)', '0.7'],
      [r2 - 22, 'rgba(180,160,255,0.12)', '0.4'],
    ] as [number, string, string][]).forEach(([r, stroke, sw]) => {
      const c = document.createElementNS(ns, 'circle')
      c.setAttribute('r', String(r)); c.setAttribute('fill', 'none')
      c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', sw)
      g.appendChild(c)
    })

    return () => { while (g.firstChild) g.removeChild(g.firstChild) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Explicit typed alias so TypeScript preserves the non-null type inside closures
    const cv: HTMLCanvasElement = canvas
    const ctx = cv.getContext('2d')!

    type Star = { x: number; y: number; r: number; baseOp: number; sp: number; ph: number; warm: boolean; vx: number; vy: number }
    type Meteor = { x: number; y: number; vx: number; vy: number; len: number; life: number; maxLife: number }

    let t = 0
    let stars: Star[] = []
    const meteors: Meteor[] = []
    let nextMeteor = 0
    let rafId: number | null = null
    let paused = false
    let milkyWay: CanvasGradient | null = null
    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    function buildStars() {
      const angle = Math.random() * Math.PI * 2
      stars = Array.from({ length: 260 }, () => {
        const a = angle + (Math.random() - 0.5) * 0.8
        const spd = 0.08 + Math.random() * 0.18
        return {
          x: Math.random() * cv.width, y: Math.random() * cv.height,
          r: Math.random() * 1.3 + 0.2, baseOp: Math.random() * 0.5 + 0.1,
          sp: Math.random() * 0.6 + 0.2, ph: Math.random() * Math.PI * 2,
          warm: Math.random() < 0.15,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        }
      })
      milkyWay = ctx.createLinearGradient(0, 0, cv.width, cv.height)
      milkyWay.addColorStop(0, 'rgba(80,60,140,0)')
      milkyWay.addColorStop(0.4, 'rgba(80,60,140,0.05)')
      milkyWay.addColorStop(0.5, 'rgba(100,80,160,0.08)')
      milkyWay.addColorStop(0.6, 'rgba(80,60,140,0.05)')
      milkyWay.addColorStop(1, 'rgba(80,60,140,0)')
    }

    function resize() {
      cv.width = window.innerWidth
      cv.height = window.innerHeight
      buildStars()
    }

    function spawnMeteor() {
      const angle = (Math.random() * 30 + 15) * Math.PI / 180
      const speed = Math.random() * 9 + 6
      meteors.push({
        x: Math.random() * cv.width * 0.75, y: Math.random() * cv.height * 0.45,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        len: Math.random() * 110 + 55, life: 0, maxLife: Math.random() * 35 + 25,
      })
    }

    function draw() {
      if (paused) { rafId = null; return }
      rafId = requestAnimationFrame(draw)
      t += 0.008
      const W = cv.width, H = cv.height
      ctx.clearRect(0, 0, W, H)
      if (milkyWay) { ctx.fillStyle = milkyWay; ctx.fillRect(0, 0, W, H) }

      for (const s of stars) {
        const burst = Math.sin(t * s.sp * 3 + s.ph) > 0.93 ? 2 : 1
        const op = Math.min(s.baseOp * burst * (0.3 + 0.7 * Math.abs(Math.sin(t * s.sp + s.ph))), 0.92)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * (burst > 1 ? 1.5 : 1), 0, Math.PI * 2)
        ctx.fillStyle = s.warm ? `rgba(255,230,180,${op.toFixed(3)})` : `rgba(210,225,255,${op.toFixed(3)})`
        ctx.fill()
        if (burst > 1 && s.r > 0.8) {
          ctx.strokeStyle = s.warm ? `rgba(255,230,180,${op.toFixed(3)})` : `rgba(210,225,255,${op.toFixed(3)})`
          ctx.lineWidth = 0.4
          ctx.beginPath(); ctx.moveTo(s.x - 5, s.y); ctx.lineTo(s.x + 5, s.y); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x, s.y + 5); ctx.stroke()
        }
        s.x += s.vx; s.y += s.vy
        if (s.x < 0) s.x += W; else if (s.x > W) s.x -= W
        if (s.y < 0) s.y += H; else if (s.y > H) s.y -= H
      }

      if (t > nextMeteor) { spawnMeteor(); nextMeteor = t + Math.random() * 9 + 4 }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i], p = m.life / m.maxLife
        const a = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75
        const mag = Math.hypot(m.vx, m.vy)
        const nx = m.vx / mag, ny = m.vy / mag
        const grad = ctx.createLinearGradient(m.x - nx * m.len, m.y - ny * m.len, m.x, m.y)
        grad.addColorStop(0, 'rgba(255,255,255,0)')
        grad.addColorStop(1, `rgba(255,255,255,${(a * 0.85).toFixed(3)})`)
        ctx.beginPath(); ctx.moveTo(m.x - nx * m.len, m.y - ny * m.len); ctx.lineTo(m.x, m.y)
        ctx.strokeStyle = grad; ctx.lineWidth = 1.4; ctx.stroke()
        m.x += m.vx; m.y += m.vy; m.life++
        if (m.life >= m.maxLife) meteors.splice(i, 1)
      }
    }

    const onVisibility = () => { paused = document.hidden; if (!paused && !rafId) draw() }
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 120)
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)
    resize()
    draw()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (resizeTimer) clearTimeout(resizeTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    const el = quoteRef.current
    if (!el) return
    // Explicit typed alias so TypeScript preserves the non-null type inside closures
    const qel: HTMLDivElement = el
    const FADE_MS = 1200, HOLD_MS = 5000
    let qi = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    const getQuotes = () => window.innerWidth <= 700 ? QUOTES_MOBILE : QUOTES_DESKTOP

    function showQuote(idx: number) {
      qel.style.opacity = '0'
      qel.style.transform = 'translate(12px, 8px)'
      const t1 = setTimeout(() => {
        qel.textContent = getQuotes()[idx]
        qel.style.transition = 'none'
        qel.style.opacity = '0'
        qel.style.transform = 'translate(-12px, -8px)'
        void qel.offsetHeight
        qel.style.transition = `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`
        qel.style.opacity = '1'
        qel.style.transform = 'translate(0, 0)'
        const t2 = setTimeout(() => { qi = (qi + 1) % getQuotes().length; showQuote(qi) }, HOLD_MS + FADE_MS)
        timers.push(t2)
      }, FADE_MS)
      timers.push(t1)
    }

    qel.textContent = getQuotes()[0]
    qel.style.opacity = '0'
    qel.style.transform = 'translate(-12px, -8px)'
    void qel.offsetHeight
    qel.style.transition = `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`
    qel.style.opacity = '1'
    qel.style.transform = 'translate(0, 0)'
    const t0 = setTimeout(() => { qi = 1; showQuote(1) }, HOLD_MS + FADE_MS)
    timers.push(t0)

    return () => { timers.forEach(clearTimeout) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse 100% 80% at 50% -5%, #0e0730 0%, #060318 55%, #020110 100%)',
      overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '-20%', left: '0%', width: 560, height: 440, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(50px)', zIndex: 1, background: 'radial-gradient(circle, rgba(70,40,180,0.22) 0%, transparent 70%)' }} />
      <div style={{ position: 'fixed', bottom: '-15%', right: '0%', width: 480, height: 480, borderRadius: '50%', pointerEvents: 'none', filter: 'blur(55px)', zIndex: 1, background: 'radial-gradient(circle, rgba(100,40,200,0.15) 0%, transparent 70%)' }} />

      <div className={styles.mobileFade} />

      {/* Zodiac wheel */}
      <div className={styles.zodiacWrap}>
        <svg viewBox="-320 -320 640 640" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          <defs>
            <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="rgba(100,60,200,0)" />
              <stop offset="100%" stopColor="rgba(100,60,200,0.18)" />
            </radialGradient>
          </defs>
          <circle r={320} fill="url(#rimGlow)" />
          <g ref={zodiacGRef} style={{ transformOrigin: '0px 0px', animation: 'spinZodiac 160s linear infinite' }} />
        </svg>
      </div>

      {/* Glass panel */}
      <div className={styles.panel}>
        <div className={styles.quoteSection}>
          <div className={styles.quoteEyebrow}>The cosmos speaks</div>
          <div ref={quoteRef} className={styles.quoteText} />
        </div>

        <div className={styles.panelDivider} />

        <div className={styles.brandRow}>
          <div className={styles.glyphWrap}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ position: 'relative', zIndex: 1 }}>
              <ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-8 24 24)" stroke="rgba(251,191,36,0.82)" strokeWidth="1.4" fill="none" />
              <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)" stroke="rgba(251,191,36,0.6)" strokeWidth="1.1" fill="none" />
              <circle cx="13.5" cy="16" r="1.5" fill="rgba(251,191,36,0.8)" />
              <circle cx="34.5" cy="32" r="1.5" fill="rgba(251,191,36,0.8)" />
              <circle cx="24" cy="24" r="2.6" fill="rgba(251,191,36,1)" />
            </svg>
          </div>
          <div>
            <p className={styles.brandName}>Astro <em>Chaganti</em></p>
            <p className={styles.brandSub}>Vedic Astrology Platform</p>
          </div>
        </div>

        <div className={styles.features}>
          <div className={styles.featureItem}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.65 }}>
              <circle cx="14" cy="14" r="12" stroke="rgba(251,191,36,0.8)" strokeWidth="0.8" />
              <circle cx="14" cy="14" r="6" stroke="rgba(251,191,36,0.5)" strokeWidth="0.6" />
              <circle cx="14" cy="14" r="1.5" fill="rgba(251,191,36,0.9)" />
              <line x1="14" y1="2" x2="14" y2="8" stroke="rgba(251,191,36,0.55)" strokeWidth="0.7" />
              <line x1="14" y1="20" x2="14" y2="26" stroke="rgba(251,191,36,0.55)" strokeWidth="0.7" />
              <line x1="2" y1="14" x2="8" y2="14" stroke="rgba(251,191,36,0.55)" strokeWidth="0.7" />
              <line x1="20" y1="14" x2="26" y2="14" stroke="rgba(251,191,36,0.55)" strokeWidth="0.7" />
              <line x1="5.5" y1="5.5" x2="9.3" y2="9.3" stroke="rgba(251,191,36,0.28)" strokeWidth="0.6" />
              <line x1="18.7" y1="18.7" x2="22.5" y2="22.5" stroke="rgba(251,191,36,0.28)" strokeWidth="0.6" />
              <line x1="22.5" y1="5.5" x2="18.7" y2="9.3" stroke="rgba(251,191,36,0.28)" strokeWidth="0.6" />
              <line x1="9.3" y1="18.7" x2="5.5" y2="22.5" stroke="rgba(251,191,36,0.28)" strokeWidth="0.6" />
            </svg>
            <div className={styles.featureName}>Natal<br />Charts</div>
          </div>
          <div className={styles.featureSep} />
          <div className={styles.featureItem}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.65 }}>
              <circle cx="10" cy="14" r="9" stroke="rgba(251,191,36,0.8)" strokeWidth="0.8" fill="rgba(251,191,36,0.03)" />
              <circle cx="18" cy="14" r="9" stroke="rgba(251,191,36,0.8)" strokeWidth="0.8" fill="rgba(251,191,36,0.03)" />
              <path d="M14 6.6 C16.5 8.8 16.5 19.2 14 21.4 C11.5 19.2 11.5 8.8 14 6.6Z" fill="rgba(251,191,36,0.22)" />
            </svg>
            <div className={styles.featureName}>Kundali<br />Matching</div>
          </div>
          <div className={styles.featureSep} />
          <div className={styles.featureItem}>
            <svg width="32" height="32" viewBox="0 0 28 28" fill="none" style={{ opacity: 0.65 }}>
              <circle cx="14" cy="9" r="4.5" stroke="rgba(251,191,36,0.8)" strokeWidth="0.8" />
              <path d="M5 24 C5 18.5 8.5 15 14 15 C19.5 15 23 18.5 23 24" stroke="rgba(251,191,36,0.8)" strokeWidth="0.8" strokeLinecap="round" fill="none" />
              <circle cx="14" cy="9" r="1.5" fill="rgba(251,191,36,0.7)" />
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
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#1a0800" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#1a0800" />
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#1a0800" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#1a0800" />
          </svg>
          Continue with Google
        </button>
        <p className={styles.ctaFootnote}>Free · Up to 10 Natal Charts and 6 Kundali Matches</p>
      </div>
    </div>
  )
}
