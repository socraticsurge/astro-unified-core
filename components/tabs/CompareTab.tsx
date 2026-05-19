"use client"
import { useState } from "react"
import { CheckCircle2, XCircle, MinusCircle, Loader2, RotateCcw } from "lucide-react"
import type { Profile, CompatibilityCheck } from "@/lib/db"
import type { CompatResult, AdditionalKuta } from "@/lib/compatibility"
import { KOOTA_MAX, scoreLabel } from "@/lib/compatibility"
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

// ── Profile pill (shared display for both parties) ───────────────────────────

function ProfilePill({ profile, role }: { profile: Profile; role: Role }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <ProfileAvatar name={profile.name ?? "?"} size="sm" />
      <div>
        <p className="text-sm font-medium text-[var(--color-ink-1)] leading-tight">{profile.name}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{roleLabel(role)}</p>
      </div>
    </div>
  )
}

// ── Result pill ───────────────────────────────────────────────────────────────

function ResultPill({ result }: { result?: string }) {
  if (result === "good")       return <span className="text-xs font-medium text-success">Auspicious</span>
  if (result === "bad")        return <span className="text-xs font-medium text-danger">Inauspicious</span>
  if (result === "acceptable") return <span className="text-xs font-medium text-warning">Moderate</span>
  return <span className="text-xs text-muted-foreground">Neutral</span>
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
  const scoreClass = score >= 26 ? "text-success" : score >= 18 ? "text-warning" : "text-danger"
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
    <p className="text-xs text-muted-foreground italic py-4">Result data unavailable.</p>
  )

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Score + verdict */}
      <section className="space-y-1 pb-2 border-b border-[var(--color-border)]/40">
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-semibold tabular-nums ${scoreClass}`}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 36 gunas</span>
          <span className={`text-xs font-medium ${scoreClass}`}>{scoreLabel(score)}</span>
        </div>
        <p className="text-xs text-[var(--color-ink-3)]">
          {score >= 26 ? "Highly auspicious for marriage."
            : score >= 18 ? "Above the auspicious threshold of 18 gunas."
            : score >= 12 ? "Below 18 gunas — worth careful deliberation."
            : "Significant incompatibilities identified."}
        </p>
        <p className="text-[10px] text-muted-foreground/40">Classical Ashtakoota Milan</p>
      </section>

      {/* Guna breakdown */}
      {Object.keys(scores).length > 0 && (
        <section>
          <SectionHeading>Guna Breakdown</SectionHeading>
          <div className="overflow-x-auto">
            <table className="max-w-xs text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className={th}>Koota</th>
                  <th className={`${th} text-right`}>Score</th>
                  <th className={`${th} text-right`}>Max</th>
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
                      <td className={`${td} text-right font-semibold ${full ? "text-success" : zero ? "text-danger" : "text-warning"}`}>
                        {pts}
                      </td>
                      <td className={`${td} text-right text-muted-foreground`}>{max ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Natal Moon Profiles */}
      {(result.male_details || result.female_details) && (
        <section>
          <SectionHeading>Natal Moon Profiles</SectionHeading>
          <div className="overflow-x-auto">
          <table className="max-w-sm text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className={th}></th>
                <th className={`${th} text-right`}>{groomProfile.name}</th>
                <th className={`${th} text-right`}>{brideProfile.name}</th>
              </tr>
            </thead>
            <tbody>
              {(["moon_sign", "nakshatra", "gana", "nadi", "yoni"] as const).map(k => {
                const gVal = result.male_details?.[k]
                const bVal = result.female_details?.[k]
                if (!gVal && !bVal) return null
                const labelMap: Record<string, string> = { moon_sign: "Moon Sign", nakshatra: "Nakshatra", gana: "Gana", nadi: "Nadi", yoni: "Yoni" }
                return (
                  <tr key={k} className={row}>
                    <td className={`${td} text-muted-foreground`}>{labelMap[k]}</td>
                    <td className={`${td} text-right capitalize`}>{gVal ?? "—"}</td>
                    <td className={`${td} text-right capitalize`}>{bVal ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </section>
      )}

      {/* Dosha summary */}
      <section>
        <SectionHeading>Doshas</SectionHeading>
        <div className="divide-y divide-[var(--color-border)]/40">
          <div className="flex items-start justify-between gap-4 py-2.5 text-xs">
            <div className="space-y-0.5">
              <span className="text-[var(--color-ink-2)]">Mangal Dosha</span>
              {kujaDosha?.male?.is_manglik   && <p className="text-muted-foreground">{groomProfile.name} is Manglik</p>}
              {kujaDosha?.female?.is_manglik && <p className="text-muted-foreground">{brideProfile.name} is Manglik</p>}
              {kujaDosha?.compatibility?.description && (
                <p className="text-muted-foreground leading-relaxed">{kujaDosha.compatibility.description}</p>
              )}
            </div>
            <span className={`font-semibold shrink-0 ${hasManglik ? "text-danger" : "text-success"}`}>
              {hasManglik ? "Present" : "Not Present"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 py-2.5 text-xs">
            <span className="text-[var(--color-ink-2)]">Bhakoot Dosha</span>
            <span className={`font-semibold ${hasBhakoot ? "text-danger" : "text-success"}`}>
              {hasBhakoot ? "Present" : "Not Present"}
            </span>
          </div>
        </div>
      </section>

      {/* Kuja Dosha detail */}
      {kujaDosha && (kujaDosha.male?.breakdown || kujaDosha.female?.breakdown) && (
        <section>
          <SectionHeading>Kuja Dosha Detail</SectionHeading>
          <p className="text-[10px] text-muted-foreground mb-3">Mars · Saturn · Rahu · Ketu · Sun in houses 2 · 4 · 7 · 8 · 12</p>
          <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className={th}>Person</th>
                <th className={th}>Planet</th>
                <th className={th}>House · Sign</th>
                <th className={`${th} text-right`}>Score</th>
              </tr>
            </thead>
            <tbody>
              {([
                { label: groomProfile.name ?? "Groom", dosha: kujaDosha.male },
                { label: brideProfile.name  ?? "Bride", dosha: kujaDosha.female },
              ] as const).map(({ label, dosha }) =>
                dosha?.breakdown && Object.keys(dosha.breakdown).length > 0
                  ? Object.entries(dosha.breakdown).map(([planet, entry], i) => (
                    <tr key={`${label}-${planet}`} className={row}>
                      <td className={`${td} text-muted-foreground`}>{i === 0 ? label : ""}</td>
                      <td className={`${td} text-planet-name`}>{planet}</td>
                      <td className={td}>H{entry.house} · {entry.sign}</td>
                      <td className={`${td} text-right text-danger font-semibold`}>+{entry.score}</td>
                    </tr>
                  ))
                  : [(
                    <tr key={label} className={row}>
                      <td className={`${td} text-muted-foreground`}>{label}</td>
                      <td colSpan={3} className={`${td} text-muted-foreground/50 italic`}>No contributing planets</td>
                    </tr>
                  )]
              )}
            </tbody>
          </table>
          </div>
        </section>
      )}

      {/* Additional Kutas */}
      {Object.keys(additionalKutas).length > 0 && (
        <section>
          <SectionHeading>Additional Kutas</SectionHeading>
          <div className="divide-y divide-[var(--color-border)]/50">
            {Object.entries(additionalKutas).map(([key, val]) => {
              const label = KUTA_LABELS[key] ?? key
              const kuta: AdditionalKuta = typeof val === "string" ? { result: val } : val
              return (
                <div key={key} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--color-ink-2)]">{label}</span>
                    <ResultPill result={kuta.result} />
                  </div>
                  {(kuta.male || kuta.female) && (
                    <p className="text-[10px] text-muted-foreground">
                      <span>{groomProfile.name}: {kuta.male}</span>
                      <span className="mx-1.5 text-muted-foreground/30">·</span>
                      <span>{brideProfile.name}: {kuta.female}</span>
                    </p>
                  )}
                  {kuta.description && <p className="text-[10px] text-muted-foreground">{kuta.description}</p>}
                  {kuta.issues?.map((issue, i) => (
                    <p key={i} className="text-[10px] text-danger">· {issue}</p>
                  ))}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Dosha mitigations */}
      {exceptions.length > 0 && (
        <section>
          <SectionHeading>Dosha Mitigations</SectionHeading>
          <ul className="space-y-2 pt-1">
            {exceptions.map((ex, i) => (
              <li key={i} className="text-xs text-[var(--color-ink-3)] flex gap-2">
                <span className="text-muted-foreground/50 shrink-0">·</span>{ex}
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface CompareTabProps {
  activeProfile: Profile
  allProfiles: Profile[]
  selectedId: string
  onSelectedId: (id: string) => void
  result: CompatibilityCheck | null
  onResult: (r: CompatibilityCheck | null) => void
}

export function CompareTab({ activeProfile, allProfiles, selectedId, onSelectedId, result, onResult }: CompareTabProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = filterCandidates(allProfiles, activeProfile)
  const activeRole = resolveRole(activeProfile.gender)
  const partnerRole = oppositeRole(activeRole)
  const selected = candidates.find(p => p.id === selectedId) ?? null

  const handleSelect = async (id: string) => {
    if (!id) { handleClear(); return }
    const profile = candidates.find(p => p.id === id)
    if (!profile) return
    onSelectedId(id)
    onResult(null)
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
      onResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    onSelectedId("")
    onResult(null)
    setError(null)
  }

  const groomProfile = activeRole === "groom" ? activeProfile : selected
  const brideProfile = activeRole === "bride" ? activeProfile : selected

  return (
    <div className="space-y-6">

      {/* ── Selector row ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <ProfilePill profile={activeProfile} role={activeRole} />
          <span className="text-muted-foreground/40 text-base shrink-0 select-none">♡</span>
          {candidates.length === 0 ? (
            <a href="/profiles/new"
              className="text-xs text-muted-foreground border border-dashed border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-nav-chip-active-border)] transition-colors">
              + Add {roleLabel(partnerRole).toLowerCase()} profile
            </a>
          ) : selected ? (
            <ProfilePill profile={selected} role={partnerRole} />
          ) : (
            <select
              value={selectedId}
              onChange={e => handleSelect(e.target.value)}
              disabled={loading}
              className="text-sm bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[var(--color-ink-2)] hover:border-[var(--color-nav-chip-active-border)] focus:outline-none focus:border-[var(--color-nav-chip-active-border)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <option value="">Select {roleLabel(partnerRole).toLowerCase()}…</option>
              {candidates.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
        {selected && (
          <button
            onClick={handleClear}
            aria-label="Reset compatibility check"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] transition-colors shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="px-3 py-2 rounded-lg border border-danger/40 bg-danger/5 text-xs text-danger">
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Calculating…
        </div>
      )}

      {/* ── Result ── */}
      {!loading && result && groomProfile && brideProfile && (
        <FullResult check={result} groomProfile={groomProfile} brideProfile={brideProfile} />
      )}

      {/* ── Empty state ── */}
      {!loading && !result && !error && candidates.length > 0 && !selectedId && (
        <p className="text-xs text-muted-foreground text-center py-12">
          Select a {roleLabel(partnerRole).toLowerCase()} above to run the compatibility check.
        </p>
      )}

    </div>
  )
}
