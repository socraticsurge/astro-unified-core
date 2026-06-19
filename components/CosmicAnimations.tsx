'use client'
// Loaded lazily via dynamic() in CosmicLanding — NOT part of the initial JS
// bundle. Contains the canvas star/meteor animation and the SVG zodiac wheel,
// which together account for the bulk of the animation code weight.
import { useEffect, useRef } from 'react'
import { ZODIAC, DARK_PALETTE, LIGHT_PALETTE } from './cosmic-shared'
import type { Palette } from './cosmic-shared'
import styles from './CosmicLanding.module.css'

interface Props {
  isDark: boolean
  onSignPick: (idx: number) => void
}

export default function CosmicAnimations({ isDark, onSignPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const zodiacGRef = useRef<SVGGElement>(null)

  const P: Palette = isDark ? DARK_PALETTE : LIGHT_PALETTE
  const paletteRef = useRef<Palette>(DARK_PALETTE)
  // eslint-disable-next-line react-hooks/refs
  paletteRef.current = P

  // Keep the click callback fresh without restarting the zodiac effect.
  const onSignPickRef = useRef(onSignPick)
  useEffect(() => { onSignPickRef.current = onSignPick })

  // Build the zodiac wheel imperatively once, and rebuild when the theme flips
  // so stroke/fill colours match the current palette.
  useEffect(() => {
    const g = zodiacGRef.current
    if (!g) return
    const pal = isDark ? DARK_PALETTE : LIGHT_PALETTE
    const ns = 'http://www.w3.org/2000/svg'
    const R = 300, r1 = 262, r2 = 228
    const SYM = (R + r1) / 2, NAM = (r1 + r2) / 2

    const tickRing = document.createElementNS(ns, 'circle')
    tickRing.setAttribute('r', String(R + 17))
    tickRing.setAttribute('fill', 'none')
    tickRing.setAttribute('stroke', pal.tickRing)
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
      l.setAttribute('stroke', major ? pal.majorTick : pal.minorTick)
      l.setAttribute('stroke-width', major ? '1.3' : '0.5')
      g.appendChild(l)
    }

    const outerRing = document.createElementNS(ns, 'circle')
    outerRing.setAttribute('r', String(R))
    outerRing.setAttribute('fill', 'none')
    outerRing.setAttribute('stroke', pal.outerRing)
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

      const outer = `M${c0*r1} ${s0*r1} L${c0*R} ${s0*R} A${R} ${R} 0 0 1 ${c1*R} ${s1*R} L${c1*r1} ${s1*r1} A${r1} ${r1} 0 0 0 ${c0*r1} ${s0*r1}Z`
      const inner = `M${c0*r2} ${s0*r2} L${c0*r1} ${s0*r1} A${r1} ${r1} 0 0 1 ${c1*r1} ${s1*r1} L${c1*r2} ${s1*r2} A${r2} ${r2} 0 0 0 ${c0*r2} ${s0*r2}Z`

      const outerPath = document.createElementNS(ns, 'path')
      outerPath.setAttribute('d', outer)
      outerPath.setAttribute('fill', i % 2 === 0 ? pal.wedgeOutEven : pal.wedgeOutOdd)
      outerPath.setAttribute('stroke', pal.wedgeOutStroke)
      outerPath.setAttribute('stroke-width', '0.8')
      outerPath.setAttribute('style', 'pointer-events: auto; cursor: pointer;')
      outerPath.addEventListener('click', () => onSignPickRef.current(i))
      g.appendChild(outerPath)

      const innerPath = document.createElementNS(ns, 'path')
      innerPath.setAttribute('d', inner)
      innerPath.setAttribute('fill', i % 2 === 0 ? pal.wedgeInEven : pal.wedgeInOdd)
      innerPath.setAttribute('stroke', pal.wedgeInStroke)
      innerPath.setAttribute('stroke-width', '0.5')
      g.appendChild(innerPath)

      const sym = document.createElementNS(ns, 'text')
      sym.setAttribute('x', String(sx)); sym.setAttribute('y', String(sy))
      sym.setAttribute('text-anchor', 'middle'); sym.setAttribute('dominant-baseline', 'central')
      sym.setAttribute('font-size', '22'); sym.setAttribute('fill', pal.zodiacText)
      sym.setAttribute('transform', `rotate(${deg},${sx},${sy})`)
      sym.textContent = z.symbol
      g.appendChild(sym)

      const nam = document.createElementNS(ns, 'text')
      nam.setAttribute('x', String(nx)); nam.setAttribute('y', String(ny))
      nam.setAttribute('text-anchor', 'middle'); nam.setAttribute('dominant-baseline', 'central')
      nam.setAttribute('font-size', '7'); nam.setAttribute('fill', pal.zodiacText)
      nam.setAttribute('letter-spacing', '0.1em')
      nam.setAttribute('transform', `rotate(${deg + 90},${nx},${ny})`)
      nam.textContent = z.name.toUpperCase()
      g.appendChild(nam)
    })

    ;([
      [r2,      pal.ring1, '1.2'],
      [r2 - 10, pal.ring2, '0.7'],
      [r2 - 22, pal.ring3, '0.4'],
    ] as [number, string, string][]).forEach(([r, stroke, sw]) => {
      const c = document.createElementNS(ns, 'circle')
      c.setAttribute('r', String(r)); c.setAttribute('fill', 'none')
      c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', sw)
      g.appendChild(c)
    })

    return () => { while (g.firstChild) g.removeChild(g.firstChild) }
  }, [isDark])

  // Canvas star/meteor animation. Uses requestIdleCallback (with setTimeout
  // fallback for Safari) so it starts after the panel has had a chance to
  // paint — avoids competing with LCP on the initial frame.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
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
    let milkyWayDark: CanvasGradient | null = null
    let milkyWayLight: CanvasGradient | null = null
    let resizeTimer: ReturnType<typeof setTimeout> | null = null

    function buildStars() {
      const angle = (Math.PI / 4)
      stars = Array.from({ length: 260 }, (_, i) => {
        const a = angle + ((i % 17) / 17 - 0.5) * 0.8
        const spd = 0.08 + (i % 9) * 0.02
        return {
          x: (i * 137.5 % cv.width + cv.width) % cv.width,
          y: (i * 89.3 % cv.height + cv.height) % cv.height,
          r: (i % 6) * 0.22 + 0.2,
          baseOp: (i % 7) * 0.07 + 0.1,
          sp: (i % 5) * 0.12 + 0.2,
          ph: (i * 1.618) % (Math.PI * 2),
          warm: i % 7 === 0,
          vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        }
      })
      milkyWayDark = ctx.createLinearGradient(0, 0, cv.width, cv.height)
      milkyWayDark.addColorStop(0,   DARK_PALETTE.mwA)
      milkyWayDark.addColorStop(0.4, DARK_PALETTE.mwB)
      milkyWayDark.addColorStop(0.5, DARK_PALETTE.mwC)
      milkyWayDark.addColorStop(0.6, DARK_PALETTE.mwB)
      milkyWayDark.addColorStop(1,   DARK_PALETTE.mwA)
      milkyWayLight = ctx.createLinearGradient(0, 0, cv.width, cv.height)
      milkyWayLight.addColorStop(0,   LIGHT_PALETTE.mwA)
      milkyWayLight.addColorStop(0.4, LIGHT_PALETTE.mwB)
      milkyWayLight.addColorStop(0.5, LIGHT_PALETTE.mwC)
      milkyWayLight.addColorStop(0.6, LIGHT_PALETTE.mwB)
      milkyWayLight.addColorStop(1,   LIGHT_PALETTE.mwA)
    }

    function resize() {
      cv.width = window.innerWidth
      cv.height = window.innerHeight
      buildStars()
    }

    function spawnMeteor() {
      const angle = (Math.PI / 8)
      const speed = 10
      meteors.push({
        x: (meteors.length * 137 % (cv.width * 0.75) + cv.width * 0.1),
        y: (meteors.length * 89 % (cv.height * 0.45)),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        len: 110, life: 0, maxLife: 40,
      })
    }

    function draw() {
      if (paused) { rafId = null; return }
      rafId = requestAnimationFrame(draw)
      t += 0.008
      const W = cv.width, H = cv.height
      const cp = paletteRef.current
      const isDarkNow = cp === DARK_PALETTE
      ctx.clearRect(0, 0, W, H)
      const milkyWay = isDarkNow ? milkyWayDark : milkyWayLight
      if (milkyWay) { ctx.fillStyle = milkyWay; ctx.fillRect(0, 0, W, H) }

      for (const s of stars) {
        const burst = Math.sin(t * s.sp * 3 + s.ph) > 0.93 ? 2 : 1
        const op = Math.min(s.baseOp * burst * (0.3 + 0.7 * Math.abs(Math.sin(t * s.sp + s.ph))), 0.92)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * (burst > 1 ? 1.5 : 1), 0, Math.PI * 2)
        ctx.fillStyle = s.warm ? `${cp.starWarm}${op.toFixed(3)})` : `${cp.starCool}${op.toFixed(3)})`
        ctx.fill()
        if (burst > 1 && s.r > 0.8) {
          ctx.strokeStyle = s.warm ? `${cp.starWarm}${op.toFixed(3)})` : `${cp.starCool}${op.toFixed(3)})`
          ctx.lineWidth = 0.4
          ctx.beginPath(); ctx.moveTo(s.x - 5, s.y); ctx.lineTo(s.x + 5, s.y); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x, s.y + 5); ctx.stroke()
        }
        s.x += s.vx; s.y += s.vy
        if (s.x < 0) s.x += W; else if (s.x > W) s.x -= W
        if (s.y < 0) s.y += H; else if (s.y > H) s.y -= H
      }

      if (t > nextMeteor) { spawnMeteor(); nextMeteor = t + 7 }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i], p = m.life / m.maxLife
        const a = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75
        const mag = Math.hypot(m.vx, m.vy)
        const nx = m.vx / mag, ny = m.vy / mag
        const grad = ctx.createLinearGradient(m.x - nx * m.len, m.y - ny * m.len, m.x, m.y)
        grad.addColorStop(0, `${cp.meteor}0)`)
        grad.addColorStop(1, `${cp.meteor}${(a * 0.85).toFixed(3)})`)
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

    let startHandle: number | ReturnType<typeof setTimeout>
    const startCanvas = () => { resize(); draw() }
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
    if (typeof win.requestIdleCallback === 'function') {
      startHandle = win.requestIdleCallback(startCanvas, { timeout: 400 })
    } else {
      startHandle = setTimeout(startCanvas, 80)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (resizeTimer) clearTimeout(resizeTimer)
      if (typeof startHandle === 'number' && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(startHandle)
      } else if (startHandle) {
        clearTimeout(startHandle as ReturnType<typeof setTimeout>)
      }
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />
      <div className={styles.zodiacWrap}>
        <svg
          viewBox="-320 -320 640 640"
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor={P.rimGlow0} />
              <stop offset="100%" stopColor={P.rimGlow1} />
            </radialGradient>
          </defs>
          <circle r={320} fill="url(#rimGlow)" />
          <g
            ref={zodiacGRef}
            style={{
              transformOrigin: '0px 0px',
              animation: 'spinZodiac 160s linear infinite',
            }}
          />
        </svg>
      </div>
    </>
  )
}
