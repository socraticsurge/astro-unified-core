"use client"
import { useState } from "react"
import { CheckCircle2, XCircle, MinusCircle, Loader2, ArrowLeft } from "lucide-react"
import type { Profile, CompatibilityCheck } from "@/lib/db"
import type { CompatResult } from "@/lib/compatibility"
import { KOOTA_MAX, scoreColor, scoreLabel } from "@/lib/compatibility"
import { ProfileAvatar } from "@/components/profile/ProfileAvatar"
import { SectionHeading } from "@/components/unified/SectionHeading"

// ── Gender helpers ────────────────────────────────────────────────────────────

type Role = "groom" | "bride" | "person"

function resolveRole(gender: string | null | undefined): Role {
  const g = gender?.toLowerCase()
  if (g === "male") return "groom"
  if (g === "female") return "bride"
  return "person"
}

function oppositeRole(role: Role): Role {
  if (role === "groom") return "bride"
  if (role === "bride") return "groom"
  return "person"
}

function filterCandidates(allProfiles: Profile[], active: Profile): Profile[] {
  const role = resolveRole(active.gender)
  const others = allProfiles.filter(p => p.id !== active.id)
  if (role === "groom") return others.filter(p => resolveRole(p.gender) === "bride")
  if (role === "bride") return others.filter(p => resolveRole(p.gender) === "groom")
  return others
}

// ── Score arc ─────────────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const color = scoreColor(score)
  const label = scoreLabel(score)
  const r = 44
  const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
        <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle cx="54" cy="54" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${(score / 36) * circ} ${circ}`}
          transform="rotate(-90 54 54)"
        />
        <text x="54" y="50" textAnchor="middle" fill={color} fontSize="22" fontWeight="700" fontFamily="system-ui">{score}</text>
        <text x="54" y="65" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" fontFamily="system-ui">/36 gunas</text>
      </svg>
      <span className="text-xs font-semibold tracking-wider" style={{ color }}>{label}</span>
    </div>
  )
}

// ── Inline result ─────────────────────────────────────────────────────────────

function InlineResult({
  check,
  active,
  partner,
  onReset,
}: {
  check: CompatibilityCheck
  active: Profile
  partner: Profile
  onReset: () => void
}) {
  let result: CompatResult | null = null
  try { result = JSON.parse(check.result_json) } catch {}

  const score = result?.total_score ?? check.score
  const scores = result?.scores ?? {}
  const kujaDosha = result?.kuja_dosha
  const activeRole = resolveRole(active.gender)
  const groomProfile = activeRole === "groom" ? active : partner
  const brideProfile = activeRole === "bride" ? active : partner
  const hasManglik = kujaDosha?.male?.is_manglik || kujaDosha?.female?.is_manglik
  const hasBhakoot = (scores.Bhakoot ?? -1) === 0

  if (!result) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground rounded-lg border border-[var(--color-border)]">
        Result data unavailable.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={onReset}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--color-ink-2)] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Compare another
      </button>

      {/* Hero row */}
      <div className="flex items-center justify-between gap-3 px-2 py-4 rounded-xl bg-[var(--color-surface-1)] border border-[var(--color-border)]">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <ProfileAvatar name={groomProfile.name ?? "?"} size="md" color="rgba(139,92,246,0.18)" textColor="rgba(196,180,255,0.9)" />
          <p className="text-xs font-semibold text-[var(--color-ink-2)] truncate max-w-[80px] text-center">{groomProfile.name}</p>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Groom</span>
        </div>
        <ScoreArc score={score} />
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <ProfileAvatar name={brideProfile.name ?? "?"} size="md" color="rgba(244,114,182,0.16)" textColor="rgba(251,191,200,0.9)" />
          <p className="text-xs font-semibold text-[var(--color-ink-2)] truncate max-w-[80px] text-center">{brideProfile.name}</p>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Bride</span>
        </div>
      </div>

      {/* Verdict */}
      <div
        className="px-4 py-3 rounded-xl border text-sm leading-snug"
        style={{
          borderColor: score >= 18 ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)",
          background: score >= 18 ? "rgba(4,120,87,0.10)" : "rgba(120,53,15,0.12)",
          color: score >= 18 ? "rgba(167,243,208,0.9)" : "#fca5a5",
        }}
      >
        {score >= 26
          ? "An excellent match — highly auspicious for marriage."
          : score >= 18
          ? "A good match — above the auspicious threshold of 18 gunas."
          : score >= 12
          ? "A moderate match — below 18 gunas, worth careful deliberation."
          : "A challenging match — significant incompatibilities identified."}
      </div>

      {/* Guna breakdown */}
      <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-1)]">
        <SectionHeading>Guna Breakdown</SectionHeading>
        <div className="divide-y divide-[var(--color-border)]">
          {Object.entries(scores).map(([name, pts]) => {
            const max = KOOTA_MAX[name]
            const full = typeof max === "number" && pts >= max
            const zero = pts === 0
            const partial = !full && !zero
            return (
              <div key={name} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-[var(--color-ink-2)]">{name}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontWeight: 600, color: full ? "#34d399" : partial ? "#fbbf24" : "#f87171", fontSize: "0.9rem" }}>{pts}</span>
                  <span className="text-[var(--color-ink-4)] text-xs">/{max ?? "—"}</span>
                  {full   && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  {zero   && <XCircle      className="h-3.5 w-3.5 text-red-400" />}
                  {partial && <MinusCircle  className="h-3.5 w-3.5 text-amber-400" />}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dosha cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl border p-3 space-y-1"
          style={{
            borderColor: hasManglik ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.25)",
            background:  hasManglik ? "rgba(127,29,29,0.12)" : "rgba(4,120,87,0.08)",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mangal Dosha</p>
          <p className="text-sm font-semibold" style={{ color: hasManglik ? "#fca5a5" : "#6ee7b7" }}>
            {hasManglik ? "Present" : "Not Present"}
          </p>
          {kujaDosha?.male?.is_manglik   && <p className="text-[10px] text-muted-foreground">{groomProfile.name} is Manglik</p>}
          {kujaDosha?.female?.is_manglik && <p className="text-[10px] text-muted-foreground">{brideProfile.name} is Manglik</p>}
        </div>
        <div
          className="rounded-xl border p-3 space-y-1"
          style={{
            borderColor: hasBhakoot ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.25)",
            background:  hasBhakoot ? "rgba(127,29,29,0.12)" : "rgba(4,120,87,0.08)",
          }}
        >
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bhakoot Dosha</p>
          <p className="text-sm font-semibold" style={{ color: hasBhakoot ? "#fca5a5" : "#6ee7b7" }}>
            {hasBhakoot ? "Present" : "Not Present"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hasBhakoot ? "Unfavourable lunar alignment" : "Auspicious"}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/40 text-center pt-1">
        Classical Ashtakoota Milan · 18+ gunas is the traditional threshold
      </p>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface CompareTabProps {
  activeProfile: Profile
  allProfiles: Profile[]
}

export function CompareTab({ activeProfile, allProfiles }: CompareTabProps) {
  const [selected, setSelected] = useState<Profile | null>(null)
  const [result, setResult] = useState<CompatibilityCheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = filterCandidates(allProfiles, activeProfile)
  const activeRole = resolveRole(activeProfile.gender)
  const partnerRole = oppositeRole(activeRole)
  const activeRoleLabel = activeRole === "groom" ? "Groom" : activeRole === "bride" ? "Bride" : "Person A"
  const partnerRoleLabel = partnerRole === "groom" ? "Groom" : partnerRole === "bride" ? "Bride" : "Person B"

  const handleSelect = async (profile: Profile) => {
    setSelected(profile)
    setResult(null)
    setError(null)
    setLoading(true)
    try {
      const [id1, id2] = activeRole === "groom" || activeRole === "person"
        ? [activeProfile.id, profile.id]
        : [profile.id, activeProfile.id]
      const res = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id_1: id1, profile_id_2: id2 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Calculation failed")
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelected(null)
    setResult(null)
    setError(null)
  }

  // ── Inline result view ────────────────────────────────────────────────────
  if (result && selected) {
    return (
      <InlineResult
        check={result}
        active={activeProfile}
        partner={selected}
        onReset={handleReset}
      />
    )
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading && selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface-1)] border border-[var(--color-border)]">
          <ProfileAvatar name={activeProfile.name ?? "?"} size="sm" />
          <span className="text-xs text-muted-foreground">×</span>
          <ProfileAvatar name={selected.name ?? "?"} size="sm" />
          <span className="flex-1 text-sm text-[var(--color-ink-2)] truncate">
            {activeProfile.name?.split(" ")[0]} &amp; {selected.name?.split(" ")[0]}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculating…
        </div>
      </div>
    )
  }

  // ── Profile picker ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Active profile role badge */}
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
        <ProfileAvatar name={activeProfile.name ?? "?"} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-ink-1)] truncate">{activeProfile.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{activeRoleLabel}</p>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg border border-red-900/40 bg-red-950/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-[var(--color-border)] text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            No {partnerRoleLabel.toLowerCase()} profiles found.
          </p>
          <a href="/profiles/new" className="text-xs text-[var(--color-today-ask-cta-text)] hover:underline">
            Add a profile →
          </a>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
            Select {partnerRoleLabel}
          </p>
          {candidates.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-[var(--color-nav-chip-active-border)] hover:bg-[var(--color-surface-hover)] transition-colors text-left"
            >
              <ProfileAvatar name={p.name ?? "?"} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-ink-1)] truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.relationship ?? partnerRoleLabel}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">Check →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
