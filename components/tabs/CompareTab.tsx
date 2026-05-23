"use client"
import { useState } from "react"
import { Loader2, RotateCcw } from "lucide-react"
import type { Profile, CompatibilityCheck } from "@/lib/db"
import type { CompatResult, AdditionalKuta } from "@/lib/compatibility"
import { KOOTA_MAX, scoreLabel } from "@/lib/compatibility"
import { ProfileAvatar } from "@/components/profile/ProfileAvatar"
import { SectionHeading } from "@/components/unified/SectionHeading"
import { formatName } from "@/lib/display"

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
        <p className="text-sm font-medium text-[var(--color-ink-1)] leading-tight">{formatName(profile.name ?? "")}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{roleLabel(role)}</p>
      </div>
    </div>
  )
}

// ── Result pill ───────────────────────────────────────────────────────────────

function ResultPill({ result }: { result?: string }) {
  if (result === "good")       return <span className="ac-tag fav">Auspicious</span>
  if (result === "bad")        return <span className="ac-tag unf">Inauspicious</span>
  if (result === "acceptable") return <span className="ac-tag warn">Moderate</span>
  return <span className="ac-tag neu">Neutral</span>
}

// ── Full inline result ────────────────────────────────────────────────────────

function FullResult({ check, groomProfile, brideProfile }: {
  check: CompatibilityCheck
  groomProfile: Profile
  brideProfile: Profile
}) {
  let result: CompatResult | null = null
  try { result = JSON.parse(check.result_json) } catch {}

  const score = result?.total_score ?? check.score
  const scoreColor = score >= 26 ? "var(--color-success)" : score >= 18 ? "var(--color-warning)" : "var(--color-danger)"
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
    // Removed the prior `max-w-2xl`. The compare result fits the dashboard
    // content area naturally now, and the dense kuta / dosha tables get more
    // breathing room on wide screens.
    <div className="space-y-8">

      {/* Score + verdict */}
      <section className="pb-2 mb-2 border-b border-[var(--color-border)]">
        <div className="flex items-baseline gap-2 flex-wrap mb-1">
          <span style={{ fontSize: "1.5rem", fontWeight: 600, tabularNums: true, color: scoreColor } as React.CSSProperties}>{score}</span>
          <span className="text-xs text-[var(--color-ink-3)]">/ 36 gunas</span>
          <span className="text-xs font-medium" style={{ color: scoreColor }}>{scoreLabel(score)}</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>
          {score >= 26 ? "Highly auspicious for marriage."
            : score >= 18 ? "Above the auspicious threshold of 18 gunas."
            : score >= 12 ? "Below 18 gunas — worth careful deliberation."
            : "Significant incompatibilities identified."}
        </p>
        <p style={{ fontSize: 10, color: "var(--color-ink-4)", marginTop: 2 }}>Classical Ashtakoota Milan</p>
      </section>

      {/* Guna breakdown */}
      {Object.keys(scores).length > 0 && (
        <section>
          <SectionHeading>Guna Breakdown</SectionHeading>
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Koota</th>
                  <th className="right">Score</th>
                  <th className="right">Max</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(scores).map(([name, pts]) => {
                  const max = KOOTA_MAX[name]
                  const full = typeof max === "number" && pts >= max
                  const zero = pts === 0
                  return (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="num right" style={{ fontWeight: 600, color: full ? "var(--color-success)" : zero ? "var(--color-danger)" : "var(--color-warning)" }}>
                        {pts}
                      </td>
                      <td className="num right muted">{max ?? "—"}</td>
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
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  <th></th>
                  <th className="right">{formatName(groomProfile.name)}</th>
                  <th className="right">{formatName(brideProfile.name)}</th>
                </tr>
              </thead>
              <tbody>
                {(["moon_sign", "nakshatra", "gana", "nadi", "yoni"] as const).map(k => {
                  const gVal = result.male_details?.[k]
                  const bVal = result.female_details?.[k]
                  if (!gVal && !bVal) return null
                  const labelMap: Record<string, string> = { moon_sign: "Moon Sign", nakshatra: "Nakshatra", gana: "Gana", nadi: "Nadi", yoni: "Yoni" }
                  return (
                    <tr key={k}>
                      <td className="muted">{labelMap[k]}</td>
                      <td className="right" style={{ textTransform: "capitalize" }}>{gVal ?? "—"}</td>
                      <td className="right" style={{ textTransform: "capitalize" }}>{bVal ?? "—"}</td>
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
        <div className="ac-card ac-card-pad">
          <div className="flex items-start justify-between gap-4 pb-2.5 mb-2.5 border-b border-[var(--color-border)]">
            <div className="min-w-0">
              <div className="text-xs text-[var(--color-ink-2)] font-medium mb-0.5">Mangal Dosha</div>
              {kujaDosha?.male?.is_manglik   && <p className="text-xs text-[var(--color-ink-3)]">{formatName(groomProfile.name)} is Manglik</p>}
              {kujaDosha?.female?.is_manglik && <p className="text-xs text-[var(--color-ink-3)]">{formatName(brideProfile.name)} is Manglik</p>}
              {kujaDosha?.compatibility?.description && <p className="text-xs text-[var(--color-ink-3)] leading-relaxed">{kujaDosha.compatibility.description}</p>}
            </div>
            <span className={hasManglik ? "ac-tag unf shrink-0" : "ac-tag fav shrink-0"}>
              {hasManglik ? "Present" : "Not Present"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-[var(--color-ink-2)] font-medium">Bhakoot Dosha</span>
            <span className={hasBhakoot ? "ac-tag unf" : "ac-tag fav"}>
              {hasBhakoot ? "Present" : "Not Present"}
            </span>
          </div>
        </div>
      </section>

      {/* Kuja Dosha detail */}
      {kujaDosha && (kujaDosha.male?.breakdown || kujaDosha.female?.breakdown) && (
        <section>
          <SectionHeading>Kuja Dosha Detail</SectionHeading>
          <p style={{ fontSize: 10, color: "var(--color-ink-4)", marginBottom: 8 }}>Mars · Saturn · Rahu · Ketu · Sun in houses 2 · 4 · 7 · 8 · 12</p>
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Person</th><th>Planet</th><th>House · Sign</th><th className="right">Score</th>
                </tr>
              </thead>
              <tbody>
                {([
                  { label: formatName(groomProfile.name ?? "Groom"), dosha: kujaDosha.male },
                  { label: formatName(brideProfile.name  ?? "Bride"), dosha: kujaDosha.female },
                ] as const).map(({ label, dosha }) =>
                  dosha?.breakdown && Object.keys(dosha.breakdown).length > 0
                    ? Object.entries(dosha.breakdown).map(([planet, entry], i) => (
                      <tr key={`${label}-${planet}`}>
                        <td className="muted">{i === 0 ? label : ""}</td>
                        <td className="planet">{planet}</td>
                        <td>H{entry.house} · {entry.sign}</td>
                        <td className="num right" style={{ color: "var(--color-danger)", fontWeight: 600 }}>+{entry.score}</td>
                      </tr>
                    ))
                    : [(
                      <tr key={label}>
                        <td className="muted">{label}</td>
                        <td colSpan={3} style={{ fontStyle: "italic", color: "var(--color-ink-4)" }}>No contributing planets</td>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {Object.entries(additionalKutas).map(([key, val]) => {
              const label = KUTA_LABELS[key] ?? key
              const kuta: AdditionalKuta = typeof val === "string" ? { result: val } : val
              return (
                <div key={key} style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-ink-2)" }}>{label}</span>
                    <ResultPill result={kuta.result} />
                  </div>
                  {(kuta.male || kuta.female) && (
                    <p style={{ fontSize: 10, color: "var(--color-ink-3)" }}>
                      <span>{formatName(groomProfile.name ?? "")}: {kuta.male}</span>
                      <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
                      <span>{formatName(brideProfile.name ?? "")}: {kuta.female}</span>
                    </p>
                  )}
                  {kuta.description && <p style={{ fontSize: 10, color: "var(--color-ink-3)" }}>{kuta.description}</p>}
                  {kuta.issues?.map((issue, i) => (
                    <p key={i} style={{ fontSize: 10, color: "var(--color-danger)" }}>· {issue}</p>
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
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {exceptions.map((ex, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--color-ink-3)", display: "flex", gap: 8 }}>
                <span style={{ color: "var(--color-ink-4)", flexShrink: 0 }}>·</span>{ex}
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
            <a href="/dashboard?create=1"
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
                <option key={p.id} value={p.id}>{formatName(p.name)}</option>
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
      {error && <div className="ac-banner warn">{error}</div>}

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
