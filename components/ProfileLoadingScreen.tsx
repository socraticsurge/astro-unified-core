"use client"
import { useState, useEffect } from "react"

const MESSAGES = [
  "Reading your birth chart…",
  "Mapping today's transits…",
  "Analysing your career path…",
  "Generating your reading…",
  "Almost ready…",
]

export function ProfileLoadingScreen({ profileName }: { profileName: string }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % MESSAGES.length), 750)
    return () => clearInterval(t)
  }, [])

  // Soft fade-in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-background transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Celestial orbital */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-[var(--color-accent)]/15" />
        {/* Inner ring */}
        <div
          className="absolute rounded-full border border-[var(--color-accent)]/20"
          style={{ inset: "16px" }}
        />
        {/* Central glow */}
        <div className="w-3 h-3 rounded-full bg-[var(--color-accent)] shadow-[0_0_16px_4px_var(--color-accent)] opacity-80" />
        {/* Orbiting planet 1 — accent-dim for a warm-cool contrast against
            the central glow. Theme tokens, not raw palette. */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "pl-orbit1 2.4s linear infinite" }}>
          <div className="w-2 h-2 rounded-full bg-[var(--color-accent-dim)] shadow-[0_0_6px_2px_var(--color-accent-dim)]" style={{ transform: "translateY(-46px)" }} />
        </div>
        {/* Orbiting planet 2 — cooler tone */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "pl-orbit2 3.8s linear infinite", animationDelay: "-1.4s" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-cool)] opacity-70" style={{ transform: "translateY(-56px)" }} />
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-[var(--color-ink-1)]">
          Preparing {profileName}&apos;s chart
        </p>
        <p
          key={msgIdx}
          className="text-xs text-muted-foreground"
          style={{ animation: "pl-fadein 0.3s ease" }}
        >
          {MESSAGES[msgIdx]}
        </p>
      </div>

      <style>{`
        @keyframes pl-orbit1 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pl-orbit2 {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pl-fadein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
