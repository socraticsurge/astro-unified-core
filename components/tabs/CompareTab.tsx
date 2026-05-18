"use client"
import { useState } from "react"
import { CheckCircle2, XCircle, MinusCircle, Loader2, RotateCcw } from "lucide-react"
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
  if (result === "good")       return <span className="text-xs font-semibold text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Auspicious</span>
  if (result === "bad")        return <span className="text-xs font-semibold text-danger flex items-center gap-1"><XCircle className="h-3 w-3" />Inauspicious</span>
  if (result === "acceptable") return <span className="text-xs font-semibold text-warning flex items-center gap-1"><MinusCircle className="h-3 w-3" />Moderate</span>
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
    <p className="text-xs text-muted-foreground italic py-4">Result data unavailable.</p>
  )

  return (
    <div className="space-y-8">

      {/* Score + verdict */}
      <section className="flex items-center gap-4">
        <ScoreArc score={score} />
        <div className="space-y-1">
          <p className="text-sm font-semibold" style={{ color }}>{scoreLabel(score)}</p>
          <p className="text-xs text-[var(--color-ink-3)] leading-snug">
            {score >= 26 ? "Highly auspicious for marriage."
              : score >= 18 ? "Above the auspicious threshold of 18 gunas."
              : score >= 12 ? "Below 18 gunas — worth careful deliberation."
              : "Significant incompatibilities identified."}
          </p>
          <p className="text-[10px] text-muted-foreground/50">{score}/36 gunas · Classical Ashtakoota Milan</p>
        </div>
      </section>

      {/* Guna breakdown */}
      {Object.keys(scores).length > 0 && (
        <section>
          <SectionHeading>Guna Breakdown</SectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
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
                        style={{ color: full ? "var(--color-success)" : zero ? "var(--color-danger)" : "var(--color-warning)" }}>
                        {pts}
                      </td>
                      <td className={`${td} text-right text-muted-foreground`}>{max ?? "—"}</td>
                      <td className={`${td} text-center`}>
                        {full  && <CheckCircle2 className="h-3.5 w-3.5 text-success inline" />}
                        {zero  && <XCircle      className="h-3.5 w-3.5 text-danger  inline" />}
                        {!full && !zero && <MinusCircle className="h-3.5 w-3.5 text-warning inline" />}
                      </td>
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
          <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
            {([
              { label: groomProfile.name ?? "Groom", details: result.male_details,   tokenColor: "var(--color-compat-groom)" },
              { label: brideProfile.name  ?? "Bride", details: result.female_details, tokenColor: "var(--color-compat-bride)" },
            ] as const).map(({ label, details, tokenColor }) => (
              <div key={label} className="pr-4 pl-1 first:pl-0 space-y-1.5 py-2">
                <p className="text-xs font-semibold" style={{ color: tokenColor }}>{label}</p>
                {(["moon_sign", "nakshatra", "gana", "nadi", "yoni"] as const).map(k => {
                  const val = details?.[k]
                  const labelMap: Record<string, string> = { moon_sign: "Moon Sign", nakshatra: "Nakshatra", gana: "Gana", nadi: "Nadi", yoni: "Yoni" }
                  return val ? (
                    <div key={k} className="flex justify-between text-xs gap-2">
                      <span className="text-muted-foreground shrink-0">{labelMap[k]}</span>
                      <span className="text-[var(--color-ink-2)] font-medium capitalize">{val}</span>
                    </div>
                  ) : null
                })}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dosha summary */}
      <section>
        <SectionHeading>Doshas</SectionHeading>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1"
            style={{
              borderColor: hasManglik ? "var(--color-danger-border)"  : "var(--color-success-border)",
              background:  hasManglik ? "var(--color-danger-faint)"   : "var(--color-success-faint)",
            }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mangal Dosha</p>
            <p className="text-sm font-semibold" style={{ color: hasManglik ? "var(--color-danger)" : "var(--color-success)" }}>
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
              borderColor: hasBhakoot ? "var(--color-danger-border)"  : "var(--color-success-border)",
              background:  hasBhakoot ? "var(--color-danger-faint)"   : "var(--color-success-faint)",
            }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bhakoot Dosha</p>
            <p className="text-sm font-semibold" style={{ color: hasBhakoot ? "var(--color-danger)" : "var(--color-success)" }}>
              {hasBhakoot ? "Present" : "Not Present"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {hasBhakoot ? "Unfavourable lunar alignment" : "Auspicious"}
            </p>
          </div>
        </div>
      </section>

      {/* Kuja Dosha detail */}
      {kujaDosha && (kujaDosha.male?.breakdown || kujaDosha.female?.breakdown) && (
        <section>
          <SectionHeading>Kuja Dosha Detail</SectionHeading>
          <p className="text-[10px] text-muted-foreground mb-2">Mars · Saturn · Rahu · Ketu · Sun in houses 2 · 4 · 7 · 8 · 12</p>
          <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
            {([
              { label: groomProfile.name ?? "Groom", dosha: kujaDosha.male,   tokenColor: "var(--color-compat-groom)" },
              { label: brideProfile.name  ?? "Bride", dosha: kujaDosha.female, tokenColor: "var(--color-compat-bride)" },
            ] as const).map(({ label, dosha, tokenColor }) => (
              <div key={label} className="pr-4 pl-1 first:pl-0 py-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: tokenColor }}>{label}</span>
                  <span className="text-[10px] font-semibold" style={{ color: dosha?.is_manglik ? "var(--color-danger)" : "var(--color-success)" }}>
                    {dosha?.is_manglik ? "Manglik" : "Not Manglik"}
                  </span>
                </div>
                {dosha?.breakdown && Object.keys(dosha.breakdown).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(dosha.breakdown).map(([planet, entry]) => (
                      <div key={planet} className="flex items-center justify-between text-[10px] rounded px-2 py-1"
                        style={{ background: "var(--color-danger-faint)", border: "1px solid var(--color-danger-border)" }}>
                        <span className="font-medium text-danger">{planet}</span>
                        <span className="text-muted-foreground">H{entry.house} · {entry.sign}</span>
                        <span className="text-danger font-semibold">+{entry.score}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground/50 italic">No contributing planets</p>
                )}
              </div>
            ))}
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
                      <span style={{ color: "var(--color-compat-groom)" }}>{groomProfile.name}: {kuta.male}</span>
                      <span className="mx-1.5 text-muted-foreground/30">·</span>
                      <span style={{ color: "var(--color-compat-bride)" }}>{brideProfile.name}: {kuta.female}</span>
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
              <li key={i} className="flex items-start gap-2 text-xs text-[var(--color-ink-3)]">
                <CheckCircle2 className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />{ex}
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
      <div className="flex items-center gap-3 flex-wrap">
        {/* Active profile pill */}
        <ProfilePill profile={activeProfile} role={activeRole} />

        {/* Separator */}
        <span className="text-muted-foreground/40 text-base shrink-0 select-none">♡</span>

        {/* Candidate: dropdown until selected, then profile pill */}
        {candidates.length === 0 ? (
          <a href="/profiles/new"
            className="text-xs text-muted-foreground border border-dashed border-[var(--color-border)] rounded-lg px-3 py-1.5 hover:border-[var(--color-nav-chip-active-border)] transition-colors">
            + Add {roleLabel(partnerRole).toLowerCase()} profile
          </a>
        ) : selected ? (
          <>
            <ProfilePill profile={selected} role={partnerRole} />
            <button
              onClick={handleClear}
              aria-label="Reset compatibility check"
              title="Reset"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </>
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

      {/* ── Error ── */}
      {error && (
        <div className="px-3 py-2 rounded-lg border text-xs text-danger"
          style={{ borderColor: "var(--color-danger-border)", background: "var(--color-danger-faint)" }}>
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
