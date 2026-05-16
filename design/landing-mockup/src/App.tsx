import { useEffect, useRef } from 'react'; // useRef used by CosmicCanvas

// ─── Zodiac data ──────────────────────────────────────────────────────────────
const ZODIAC = [
  { symbol: '♈', name: 'Aries' },
  { symbol: '♉', name: 'Taurus' },
  { symbol: '♊', name: 'Gemini' },
  { symbol: '♋', name: 'Cancer' },
  { symbol: '♌', name: 'Leo' },
  { symbol: '♍', name: 'Virgo' },
  { symbol: '♎', name: 'Libra' },
  { symbol: '♏', name: 'Scorpio' },
  { symbol: '♐', name: 'Sagittarius' },
  { symbol: '♑', name: 'Capricorn' },
  { symbol: '♒', name: 'Aquarius' },
  { symbol: '♓', name: 'Pisces' },
];

// ─── Star canvas ──────────────────────────────────────────────────────────────
function CosmicCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf: number;
    let t = 0;

    type Star = { x: number; y: number; r: number; baseOp: number; sp: number; ph: number; warm: boolean };
    let stars: Star[] = [];

    type Meteor = { x: number; y: number; vx: number; vy: number; len: number; life: number; maxLife: number };
    let meteors: Meteor[] = [];
    let nextMeteor = 0;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 260 }, () => ({
        x:      Math.random() * canvas.width,
        y:      Math.random() * canvas.height,
        r:      Math.random() * 1.3 + 0.2,
        baseOp: Math.random() * 0.5 + 0.1,
        sp:     Math.random() * 0.6 + 0.2,
        ph:     Math.random() * Math.PI * 2,
        warm:   Math.random() < 0.15,
      }));
    }
    resize();
    window.addEventListener('resize', resize);

    function spawnMeteor() {
      const angle = (Math.random() * 30 + 15) * (Math.PI / 180);
      const speed = Math.random() * 9 + 6;
      meteors.push({
        x:       Math.random() * canvas.width * 0.75,
        y:       Math.random() * canvas.height * 0.45,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        len:     Math.random() * 110 + 55,
        life:    0,
        maxLife: Math.random() * 35 + 25,
      });
    }

    function draw() {
      t += 0.008;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Milky Way diagonal band
      const mw = ctx.createLinearGradient(0, 0, W, H);
      mw.addColorStop(0,   'rgba(80,60,140,0)');
      mw.addColorStop(0.4, 'rgba(80,60,140,0.05)');
      mw.addColorStop(0.5, 'rgba(100,80,160,0.08)');
      mw.addColorStop(0.6, 'rgba(80,60,140,0.05)');
      mw.addColorStop(1,   'rgba(80,60,140,0)');
      ctx.fillStyle = mw;
      ctx.fillRect(0, 0, W, H);

      // Stars
      for (const s of stars) {
        const burst = Math.sin(t * s.sp * 3 + s.ph) > 0.93 ? 2.0 : 1;
        const op    = Math.min(s.baseOp * burst * (0.3 + 0.7 * Math.abs(Math.sin(t * s.sp + s.ph))), 0.92);
        const col   = s.warm ? `rgba(255,230,180,${op.toFixed(3)})` : `rgba(210,225,255,${op.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (burst > 1 ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        if (burst > 1 && s.r > 0.8) {
          ctx.strokeStyle = col;
          ctx.lineWidth = 0.4;
          ctx.beginPath(); ctx.moveTo(s.x - 5, s.y); ctx.lineTo(s.x + 5, s.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.x, s.y - 5); ctx.lineTo(s.x, s.y + 5); ctx.stroke();
        }
      }

      // Meteors
      if (t > nextMeteor) { spawnMeteor(); nextMeteor = t + Math.random() * 9 + 4; }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const p = m.life / m.maxLife;
        const a = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
        const nx = m.vx / Math.hypot(m.vx, m.vy), ny = m.vy / Math.hypot(m.vx, m.vy);
        const grad = ctx.createLinearGradient(m.x - nx * m.len, m.y - ny * m.len, m.x, m.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(1, `rgba(255,255,255,${(a * 0.85).toFixed(3)})`);
        ctx.beginPath();
        ctx.moveTo(m.x - nx * m.len, m.y - ny * m.len);
        ctx.lineTo(m.x, m.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        m.x += m.vx; m.y += m.vy; m.life++;
        if (m.life >= m.maxLife) meteors.splice(i, 1);
      }

      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

// ─── Rotating Earth ───────────────────────────────────────────────────────────
// Uses a real NASA Blue Marble equirectangular texture (2:1 ratio) scrolled
// horizontally inside a clipped circle. CSS background-position percentage
// formula: offset = pct × (element_w − tile_w). With element=35vh, tile=70vh:
//   0%   → 0 offset
//   200% → 200% × (35vh−70vh) = −70vh = one full texture width = 360°
// No canvas pixel access needed → no CORS issues when opened from file://.
// A CSS overlay fakes the 3-D sphere lighting (specular + limb darkening).
function EarthGlobe() {
  // jsDelivr CDN — reliable, CORS-open, no auth needed
  const TEX = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-day.jpg';

  return (
    <>
      <style>{`
        @keyframes earthSpin {
          from { background-position-x: 0%; }
          to   { background-position-x: 200%; }
        }
        .earth-surface {
          position: absolute; inset: 0;
          border-radius: 50%; overflow: hidden;
          /* tile height = 100% of circle, width = auto (2:1 texture → 2× height = 70vh) */
          background: url('${TEX}') repeat-x 0% center;
          background-size: auto 100%;
          animation: earthSpin 28s linear infinite;
          /* fallback ocean colour while texture loads */
          background-color: #0d3b6e;
        }
      `}</style>

      <div style={{
        position: 'fixed',
        left: '-17.5vh', top: 'calc(50vh - 17.5vh)',
        width: '35vh', height: '35vh',
        zIndex: 6, pointerEvents: 'none',
      }}>
        {/* Outer atmosphere glow */}
        <div style={{
          position: 'absolute', inset: '-10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, transparent 52%, rgba(70,160,255,0.55) 78%, rgba(70,160,255,0) 100%)',
          filter: 'blur(4px)',
        }} />

        {/* Scrolling Earth texture */}
        <div className="earth-surface" />

        {/* Sphere lighting overlay: specular top-left + limb darkening edge */}
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: `
            radial-gradient(circle at 34% 28%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 46%),
            radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,18,0.75) 100%)
          `,
          pointerEvents: 'none',
        }} />
      </div>
    </>
  );
}

// ─── Zodiac wheel ─────────────────────────────────────────────────────────────
// All 12 signs are drawn on a full-circle SVG (viewBox covers the full diameter).
// An inner <g> rotates in SVG-space so all 12 segments render correctly.
// The container is 100vh × 100vh, shifted left by 50vh so the wheel centre
// sits exactly at the left edge of the viewport. overflow:hidden clips the left half.
function ZodiacWheel() {
  const R   = 300;   // outer radius (SVG units — full circle = 600×600)
  const r1  = 218;   // inner edge of symbol band (narrower band vs before)
  const r2  = 158;   // inner hole edge (larger hole — Earth sits inside with gap)
  const SYM = (R + r1) / 2;
  const NAM = (r1 + r2) / 2;

  const segs = ZODIAC.map((z, i) => {
    const a0 = (i * 30 - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * 30 - 90) * (Math.PI / 180);
    const am = ((i + 0.5) * 30 - 90) * (Math.PI / 180);
    const [c0, s0] = [Math.cos(a0), Math.sin(a0)];
    const [c1, s1] = [Math.cos(a1), Math.sin(a1)];
    const [cm, sm] = [Math.cos(am), Math.sin(am)];
    const outer = `M${c0*r1} ${s0*r1} L${c0*R} ${s0*R} A${R} ${R} 0 0 1 ${c1*R} ${s1*R} L${c1*r1} ${s1*r1} A${r1} ${r1} 0 0 0 ${c0*r1} ${s0*r1}Z`;
    const inner = `M${c0*r2} ${s0*r2} L${c0*r1} ${s0*r1} A${r1} ${r1} 0 0 1 ${c1*r1} ${s1*r1} L${c1*r2} ${s1*r2} A${r2} ${r2} 0 0 0 ${c0*r2} ${s0*r2}Z`;
    return { z, i, outer, inner, sx: cm*SYM, sy: sm*SYM, nx: cm*NAM, ny: sm*NAM, deg: (i+0.5)*30 - 90 };
  });

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = i * 5 * (Math.PI / 180);
    const major = i % 6 === 0;
    return { x1: Math.cos(a)*(major ? R+2 : R+6), y1: Math.sin(a)*(major ? R+2 : R+6),
             x2: Math.cos(a)*(R+16),              y2: Math.sin(a)*(R+16), major };
  });

  const PAD = 20;
  const VB  = R + PAD; // half-size of viewBox

  return (
    // 100vh × 100vh square, shifted left by 50vh so wheel centre = left edge of viewport
    <div style={{
      position: 'fixed',
      left: '-50vh', top: '0', bottom: '0',
      width: '100vh', height: '100vh',
      zIndex: 5, pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spinZodiac { to { transform: rotate(360deg); } }
        .zodiac-g {
          transform-origin: 0px 0px;   /* SVG origin = wheel centre */
          animation: spinZodiac 80s linear infinite;
        }
      `}</style>

      {/* Full-circle SVG centred in the 100vh square */}
      <svg
        viewBox={`${-VB} ${-VB} ${VB*2} ${VB*2}`}
        width="100%" height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="sglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
            <stop offset="60%"  stopColor="rgba(100,60,200,0)"    />
            <stop offset="100%" stopColor="rgba(100,60,200,0.18)" />
          </radialGradient>
        </defs>

        {/* Static rim glow (doesn't spin) */}
        <circle r={R + PAD} fill="url(#rimGlow)" />

        {/* ── Everything below spins ── */}
        <g className="zodiac-g">

          {/* Outer tick ring */}
          <circle r={R+17} fill="none" stroke="rgba(251,191,36,0.15)" strokeWidth="1"/>
          {ticks.map((tk, i) => (
            <line key={i} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2}
              stroke={tk.major ? 'rgba(251,191,36,0.6)' : 'rgba(180,160,255,0.22)'}
              strokeWidth={tk.major ? 1.3 : 0.5}/>
          ))}
          <circle r={R}  fill="none" stroke="rgba(180,160,255,0.32)" strokeWidth="0.8"/>

          {/* 12 segments — all rendered in SVG space */}
          {segs.map(({ z, i, outer, inner, sx, sy, nx, ny, deg }) => (
            <g key={z.name}>
              <path d={outer}
                fill={i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(140,100,255,0.05)'}
                stroke="rgba(180,160,255,0.22)" strokeWidth="0.8"/>
              <path d={inner}
                fill={i % 2 === 0 ? 'rgba(10,5,28,0.78)' : 'rgba(18,9,40,0.78)'}
                stroke="rgba(180,160,255,0.15)" strokeWidth="0.5"/>
              <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central"
                fontSize="32" fill="rgba(251,191,36,0.93)" filter="url(#sglow)"
                transform={`rotate(${deg},${sx},${sy})`}>
                {z.symbol}
              </text>
              <text x={nx} y={ny} textAnchor="middle" dominantBaseline="central"
                fontSize="9" fill="rgba(255,255,255,0.4)" letterSpacing="0.1em"
                transform={`rotate(${deg+90},${nx},${ny})`}>
                {z.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Inner hole rings — decorative border around the Earth */}
          <circle r={r2}      fill="rgba(5,2,16,0.0)"   stroke="rgba(180,160,255,0.35)" strokeWidth="1.2"/>
          <circle r={r2-10}   fill="none"               stroke="rgba(251,191,36,0.22)"  strokeWidth="0.7"/>
          <circle r={r2-22}   fill="none"               stroke="rgba(180,160,255,0.12)" strokeWidth="0.4"/>
        </g>
      </svg>
    </div>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────
function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 15px', borderRadius: 40,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 400, letterSpacing: '0.03em' }}>{label}</span>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      background: 'radial-gradient(ellipse 100% 80% at 50% -5%, #0e0730 0%, #060318 55%, #020110 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <style>{`
        @keyframes floatGlyph { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
        @keyframes pulseRing {
          0%  {transform:scale(1);   opacity:0.45}
          80% {transform:scale(1.9); opacity:0}
          100%{transform:scale(1.9); opacity:0}
        }
        @keyframes shimmerBtn {
          0%  {background-position:-200% center}
          100%{background-position: 200% center}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(18px)}
          to  {opacity:1;transform:translateY(0)}
        }
        .glyph{animation:floatGlyph 5s ease-in-out infinite}
        .ring1{position:absolute;inset:-16px;border-radius:50%;border:1px solid rgba(251,191,36,0.3);animation:pulseRing 3.4s ease-out infinite}
        .ring2{position:absolute;inset:-16px;border-radius:50%;border:1px solid rgba(251,191,36,0.14);animation:pulseRing 3.4s 1.7s ease-out infinite}
        .shimmer-btn{
          background:linear-gradient(105deg,#92400e 0%,#d97706 35%,#fcd34d 50%,#d97706 65%,#92400e 100%);
          background-size:200% auto;
          animation:shimmerBtn 3.2s linear infinite
        }
        .card{animation:fadeUp 0.9s ease-out both}
      `}</style>

      {/* Ambient blobs */}
      <div style={{ position:'fixed', top:'-20%', left:'0%', width:560, height:440, borderRadius:'50%', background:'radial-gradient(circle,rgba(70,40,180,0.22) 0%,transparent 70%)', pointerEvents:'none', filter:'blur(50px)', zIndex:1 }} />
      <div style={{ position:'fixed', bottom:'-15%', right:'0%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(100,40,200,0.15) 0%,transparent 70%)', pointerEvents:'none', filter:'blur(55px)', zIndex:1 }} />

      <CosmicCanvas />
      <ZodiacWheel />
      <EarthGlobe />

      {/* Card */}
      <div className="card" style={{
        position: 'relative', zIndex: 10,
        backdropFilter: 'blur(24px) saturate(1.6)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
        background: 'rgba(255,255,255,0.038)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 26, padding: '46px 42px',
        maxWidth: 420, width: 'calc(100% - 32px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
        boxShadow: '0 28px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}>

        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="ring1" /><div className="ring2" />
          <div className="glyph" style={{ fontSize:38, color:'#fbbf24', filter:'drop-shadow(0 0 18px rgba(251,191,36,0.6))', lineHeight:1, userSelect:'none' }}>✦</div>
        </div>

        <div style={{ textAlign:'center', display:'flex', flexDirection:'column', gap:5 }}>
          <h1 style={{
            margin:0,
            fontFamily:'"Didot","Bodoni MT","Playfair Display",Georgia,serif',
            fontSize:34, fontWeight:400, letterSpacing:'0.05em',
            background:'linear-gradient(135deg,#fde68a 0%,#fbbf24 40%,#f59e0b 70%,#fde68a 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            filter:'drop-shadow(0 0 20px rgba(251,191,36,0.28))',
          }}>Astro Chaganti</h1>
          <p style={{ margin:0, fontSize:10, color:'rgba(255,255,255,0.28)', letterSpacing:'0.24em', textTransform:'uppercase', fontWeight:300 }}>
            Vedic Astrology Platform
          </p>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
          <Pill icon="🪐" label="Natal Charts" />
          <Pill icon="💫" label="Kundali Match" />
          <Pill icon="🔭" label="Consultations" />
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:10, width:'100%' }}>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
          <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:'0.2em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
            Sidereal · Lahiri · Swiss Ephemeris
          </span>
          <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
        </div>

        <button className="shimmer-btn" style={{
          width:'100%', padding:'13px 0', borderRadius:14, border:'none', cursor:'pointer',
          color:'#3b1a00', fontWeight:600, fontSize:14, letterSpacing:'0.02em',
          boxShadow:'0 4px 28px rgba(217,119,6,0.4)',
        }}>
          Sign in with Google — Free
        </button>

        <p style={{ margin:0, fontSize:11, color:'rgba(255,255,255,0.18)', letterSpacing:'0.04em' }}>
          Up to 10 family profiles · No credit card required
        </p>
      </div>
    </div>
  );
}
