"use client"
import { useState } from "react"
import { CheckCircle2, XCircle, MinusCircle, Loader2 } from "lucide-react"
import type { Profile, CompatibilityCheck } from "@/lib/db"
import type { CompatResult, AdditionalKuta } from "@/lib/compatibility"
import { KOOTA_MAX, scoreColor, scoreLabel } from "@/lib/compatibility"
import { ProfileAvatar } from "@/components/profile/ProfileAvatar"
import { SectionHeading } from "@/components/unified/SectionHeading"
import { TABLE_STYLES } from "@/components/unified/types"

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

function roleLabel(role: Role): string {
  if (role === "groom") return "Groom"
  if (role === "bride") return "Bride"
  return "Person"
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
  const r = 36
  const circ = 2 * Math.PI * r
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
      <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${(score / 36) * circ} ${circ}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="41" textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="system-ui">{score}</text>
      <text x="44" y="54" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="system-ui">/36</text>
    </svg>
  )
}

// ── Result pill ───────────────────────────────────────────────────────────────

function ResultPill({ result }: { result?: string }) {
  if (result === "good")       return <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Auspicious</span>
  if (result === "bad")        return <span className="text-xs font-semibold text-red-400 flex items-center gap-1"><XCircle className="h-3 w-3" />Inauspicious</span>
  if (result === "acceptable") return <span className="text-xs font-semibold text-amber-400 flex items-center gap-1"><MinusCircle className="h-3 w-3" />Moderate</span>
  return <span className="text-xs text-muted-foreground flex items-center gap-1"><MinusCircle className="h-3 w-3" />Neutral</span>
}

// ── Full inline result ────────────────────────────────────────────────────────

function FullResult({ check, groomProfile, brideProfile }: {
  check: CompatibilityCheck
  groomProfile: Profile
  brideProfile: Profile
}) {
  let result: CompatResult | null = null
  try { result = JSON.parse(check.result_json) } catch {}

  const { th, td, row } = TABLE_STYLES
  const score = result?.total_score ?? check.score
  const color = scoreColor(score)
  const scores = result?.scores ?? {}
  const kujaDosha = result?.kuja_dosha
  const additionalKutas = result?.additional_kutas ?? {}
  const exceptions = result?.exceptions ?? []
  const hasManglik = kujaDosha?.male?.is_manglik || kujaDosha?.female?.is_manglik
  const hasBhakoot = (scores.Bhakoot ?? -1) === 0

  const KUTA_LABELS: Record<string, string> = {
    Mahendra: "Mahendra", StreeDeergha: "Stree Deergha", Vedha: "Vedha",
    Rajju: "Rajju", BadConstellations: "Bad Constellations",
    LagnaHouse7: "Lagna / 7th House", SexEnergy: "Sex Energy",
  }

  if (!result) return (
    <div className="p-6 text-center text-xs text-muted-foreground rounded-lg border border-[var(--color-border)]">
      Result data unavailable.
    </div>
  )

  return (
    <div className="space-y-4">

      {/* Score + verdict */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[var(--color-surface-1)] border border-[var(--color-border)]">
        <ScoreArc score={score} />
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold" style={{ color }}>{scoreLabel(score)}</p>
          <p className="text-xs text-[var(--color-ink-3)] leading-snug">
            {score >= 26 ? "Highly auspicious for marriage."
              : score >= 18 ? "Above the auspicious threshold of 18 gunas."
              : score >= 12 ? "Below 18 gunas — worth careful deliberation."
              : "Significant incompatibilities identified."}
          </p>
          <p className="text-[10px] text-muted-foreground/50">Ashtakoota Milan · {score}/36 gunas</p>
        </div>
      </div>

      {/* Guna breakdown */}
      {Object.keys(scores).length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <SectionHeading>Guna Breakdown</SectionHeading>
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2)]">
              <tr>
                <th className={th}>Koota</th>
                <th className={`${th} text-right`}>Score</th>
                <th className={`${th} text-right`}>Max</th>
                <th className={`${th} text-center`}></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores).map(([name, pts]) => {
                const max = KOOTA_MAX[name]
                const full = typeof max === "number" && pts >= max
                const zero = pts === 0
                return (
                  <tr key={name} className={row}>
                    <td className={td}>{name}</td>
                    <td className={`${td} text-right font-semibold`}
                      style={{ color: full ? "#34d399" : zero ? "#f87171" : "#fbbf24" }}>{pts}</td>
                    <td className={`${td} text-right text-muted-foreground`}>{max ?? "—"}</td>
                    <td className={`${td} text-center`}>
                      {full  && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline" />}
                      {zero  && <XCircle      className="h-3.5 w-3.5 text-red-400 inline" />}
                      {!full && !zero && <MinusCircle className="h-3.5 w-3.5 text-amber-400 inline" />}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Natal Moon Profiles */}
      {(result.male_details || result.female_details) && (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <SectionHeading>Natal Moon Profiles</SectionHeading>
          <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
            {([
              { label: groomProfile.name ?? "Groom", details: result.male_details,   color: "rgba(196,180,255,0.85)" },
              { label: brideProfile.name  ?? "Bride", details: result.female_details, color: "rgba(251,191,200,0.85)" },
            ] as const).map(({ label, details, color: c }) => (
              <div key={label} className="p-3 space-y-1.5">
                <p className="text-xs font-semibold truncate" style={{ color: c }}>{label}</p>
                {(["Moon Sign", "Nakshatra", "Gana", "Nadi", "Yoni"] as const).map(k => {
                  const val = details?.[k.toLowerCase().replace(" ", "_") as keyof typeof details]
                  return val ? (
                    <div key={k} className="flex justify-between text-xs gap-2">
                      <span className="text-muted-foreground shrink-0">{k}</span>
                      <span className="text-[var(--color-ink-2)] font-medium capitalize truncate">{val}</span>
                    </div>
                  ) : null
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dosha summary row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 space-y-1"
          style={{
            borderColor: hasManglik ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.25)",
            background:  hasManglik ? "rgba(127,29,29,0.10)" : "rgba(4,120,87,0.07)",
          }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mangal Dosha</p>
          <p className="text-sm font-semibold" style={{ color: hasManglik ? "#fca5a5" : "#6ee7b7" }}>
            {hasManglik ? "Present" : "Not Present"}
          </p>
          {kujaDosha?.male?.is_manglik   && <p className="text-[10px] text-muted-foreground">{groomProfile.name} is Manglik</p>}
          {kujaDosha?.female?.is_manglik && <p className="text-[10px] text-muted-foreground">{brideProfile.name} is Manglik</p>}
          {kujaDosha?.compatibility?.description && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">{kujaDosha.compatibility.description}</p>
          )}
        </div>
        <div className="rounded-lg border p-3 space-y-1"
          style={{
            borderColor: hasBhakoot ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.25)",
            background:  hasBhakoot ? "rgba(127,29,29,0.10)" : "rgba(4,120,87,0.07)",
          }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bhakoot Dosha</p>
          <p className="text-sm font-semibold" style={{ color: hasBhakoot ? "#fca5a5" : "#6ee7b7" }}>
            {hasBhakoot ? "Present" : "Not Present"}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hasBhakoot ? "Unfavourable lunar alignment" : "Auspicious"}
          </p>
        </div>
      </div>

      {/* Kuja Dosha per-person detail */}
      {kujaDosha && (kujaDosha.male?.breakdown || kujaDosha.female?.breakdown) && (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <SectionHeading>Kuja Dosha Detail</SectionHeading>
          <p className="px-3 pt-1 pb-2 text-[10px] text-muted-foreground">Mars · Saturn · Rahu · Ketu · Sun in houses 2 · 4 · 7 · 8 · 12</p>
          <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
            {([
              { label: groomProfile.name ?? "Groom", dosha: kujaDosha.male,   color: "rgba(196,180,255,0.85)" },
              { label: brideProfile.name  ?? "Bride", dosha: kujaDosha.female, color: "rgba(251,191,200,0.85)" },
            ] as const).map(({ label, dosha, color: c }) => (
              <div key={label} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold truncate" style={{ color: c }}>{label}</span>
                  <span className={`text-[10px] font-semibold ${dosha?.is_manglik ? "text-red-400" : "text-emerald-400"}`}>
                    {dosha?.is_manglik ? "Manglik" : "Not Manglik"}
                  </span>
                </div>
                {dosha?.breakdown && Object.keys(dosha.breakdown).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(dosha.breakdown).map(([planet, entry]) => (
                      <div key={planet} className="flex items-center justify-between text-[10px] bg-red-950/20 rounded px-2 py-1 border border-red-900/25">
                        <span className="font-medium text-red-300">{planet}</span>
                        <span className="text-muted-foreground">H{entry.house} · {entry.sign}</span>
                        <span className="text-red-400 font-semibold">+{entry.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 italic">No contributing planets</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Kutas */}
      {Object.keys(additionalKutas).length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <SectionHeading>Additional Kutas</SectionHeading>
          <div className="divide-y divide-[var(--color-border)]/50">
            {Object.entries(additionalKutas).map(([key, val]) => {
              const label = KUTA_LABELS[key] ?? key
              const kuta: AdditionalKuta = typeof val === "string" ? { result: val } : val
              return (
                <div key={key} className="px-3 py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--color-ink-2)]">{label}</span>
                    <ResultPill result={kuta.result} />
                  </div>
                  {(kuta.male || kuta.female) && (
                    <p className="text-[10px] text-muted-foreground">
                      <span style={{ color: "rgba(196,180,255,0.8)" }}>{groomProfile.name}: {kuta.male}</span>
                      <span className="mx-1.5 text-muted-foreground/30">·</span>
                      <span style={{ color: "rgba(251,191,200,0.8)" }}>{brideProfile.name}: {kuta.female}</span>
                    </p>
                  )}
                  {kuta.description && <p className="text-[10px] text-muted-foreground">{kuta.description}</p>}
                  {kuta.issues?.map((issue, i) => (
                    <p key={i} className="text-[10px] text-red-400">· {issue}</p>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dosha exceptions */}
      {exceptions.length > 0 && (
        <div className="rounded-lg border overflow-hidden"
          style={{ borderColor: "rgba(217,119,6,0.3)", background: "rgba(120,53,15,0.08)" }}>
          <SectionHeading>Dosha Mitigations</SectionHeading>
          <ul className="divide-y divide-amber-900/20">
            {exceptions.map((ex, i) => (
              <li key={i} className="px-3 py-2 flex items-start gap-2 text-xs text-amber-200/80">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />{ex}
              </li>
            ))}
          </ul>
        </div>
      )}

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

  const handleSelect = async (profile: Profile) => {
    if (selected?.id === profile.id && result) return   // already loaded
    setSelected(profile)
    setResult(null)
    setError(null)
    setLoading(true)
    try {
      const [id1, id2] = activeRole === "bride"
        ? [profile.id, activeProfile.id]
        : [activeProfile.id, profile.id]
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

  const groomProfile = activeRole === "groom" ? activeProfile : selected
  const brideProfile = activeRole === "bride" ? activeProfile : selected

  return (
    <div className="space-y-4">

      {/* Persistent picker — always visible */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Active profile — fixed chip */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-nav-chip-active-border)] text-xs font-medium text-[var(--color-ink-1)] shrink-0">
          <ProfileAvatar name={activeProfile.name ?? "?"} size="xs" />
          <span>{activeProfile.name?.split(" ")[0]}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide ml-0.5">{roleLabel(activeRole)}</span>
        </div>

        <span className="text-muted-foreground/40 text-sm">×</span>

        {/* Candidate chips */}
        {candidates.length === 0 ? (
          <a href="/profiles/new"
            className="text-xs text-muted-foreground border border-dashed border-[var(--color-border)] rounded-full px-2.5 py-1.5 hover:border-[var(--color-nav-chip-active-border)] transition-colors">
            + Add {roleLabel(partnerRole).toLowerCase()}
          </a>
        ) : (
          candidates.map(p => {
            const isActive = selected?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                disabled={loading}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-[var(--color-surface-hover)] border-[var(--color-nav-chip-active-border)] text-[var(--color-ink-1)]"
                    : "bg-[var(--color-surface-1)] border-[var(--color-border)] text-[var(--color-ink-3)] hover:border-[var(--color-nav-chip-active-border)] hover:text-[var(--color-ink-2)]"
                }`}
              >
                <ProfileAvatar name={p.name ?? "?"} size="xs" />
                <span>{p.name?.split(" ")[0]}</span>
              </button>
            )
          })
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg border border-red-900/40 bg-red-950/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && selected && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculating…
        </div>
      )}

      {/* Full result */}
      {!loading && result && selected && groomProfile && brideProfile && (
        <FullResult check={result} groomProfile={groomProfile} brideProfile={brideProfile} />
      )}

      {/* Empty state */}
      {!loading && !result && !error && candidates.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">
          Select a {roleLabel(partnerRole).toLowerCase()} above to run the compatibility check.
        </p>
      )}

    </div>
  )
}
