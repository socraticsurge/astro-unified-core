"use client"

import { useState } from "react"
import {
  ArrowRight,
  HeartHandshake,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"

import type { CompatibilityCheck, Profile } from "@/lib/db"
import type {
  AdditionalKuta,
  CompatResult,
  KujaDosha,
} from "@/lib/compatibility"
import { KOOTA_MAX, scoreLabel } from "@/lib/compatibility"
import { formatName } from "@/lib/display"
import toolStyles from "@/components/profiles/ToolPage.module.css"
import styles from "./CompareTab.module.css"

type Role = "groom" | "bride" | "person"
type ResultTone = "supportive" | "mixed" | "caution" | "neutral"

const KUTA_LABELS: Record<string, string> = {
  GrahaMaitri: "Graha Maitri",
  StreeDeergha: "Stree Deergha",
  BadConstellations: "Bad Constellations",
  LagnaHouse7: "Lagna / 7th House",
  SexEnergy: "Sex Energy",
}

const MOON_FIELDS = [
  ["moon_sign", "Moon sign"],
  ["nakshatra", "Nakshatra"],
  ["gana", "Gana"],
  ["nadi", "Nadi"],
  ["yoni", "Yoni"],
] as const

function resolveRole(gender: string | null | undefined): Role {
  const normalized = gender?.toLowerCase()
  if (normalized === "male") return "groom"
  if (normalized === "female") return "bride"
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
  const others = allProfiles.filter((profile) => profile.id !== active.id)
  if (role === "groom") {
    return others.filter((profile) => resolveRole(profile.gender) === "bride")
  }
  if (role === "bride") {
    return others.filter((profile) => resolveRole(profile.gender) === "groom")
  }
  return others
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?"
}

function parseResult(check: CompatibilityCheck): CompatResult | null {
  try {
    return JSON.parse(check.result_json) as CompatResult
  } catch {
    return null
  }
}

function kutaLabel(name: string): string {
  if (KUTA_LABELS[name]) return KUTA_LABELS[name]
  return name.replace(/([a-z])([A-Z])/g, "$1 $2")
}

function resultTone(result: string | undefined): ResultTone {
  const normalized = result?.toLowerCase()
  if (normalized === "good" || normalized === "auspicious") return "supportive"
  if (normalized === "acceptable" || normalized === "moderate") return "mixed"
  if (normalized === "bad" || normalized === "inauspicious") return "caution"
  return "neutral"
}

function resultLabel(result: string | undefined): string {
  const tone = resultTone(result)
  if (tone === "supportive") return "Supportive"
  if (tone === "mixed") return "Mixed"
  if (tone === "caution") return "Caution"
  return "Neutral"
}

function scoreTone(score: number): Exclude<ResultTone, "neutral"> {
  if (score >= 26) return "supportive"
  if (score >= 18) return "mixed"
  return "caution"
}

function scoreStatement(score: number): string {
  if (score >= 26) {
    return "The classical Guna score is comfortably above the customary 18-point threshold."
  }
  if (score >= 18) {
    return "The classical Guna score meets the customary 18-point threshold."
  }
  return "The classical Guna score is below the customary 18-point threshold."
}

function ProfileChoice({
  profile,
  role,
  selected = false,
  fixed = false,
  onClick,
}: {
  profile: Profile
  role: Role
  selected?: boolean
  fixed?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className={styles.profileMonogram} aria-hidden="true">
        {initials(profile.name)}
      </span>
      <span className={styles.profileCopy}>
        <strong>{formatName(profile.name)}</strong>
        <small>
          {roleLabel(role)}
          {profile.relationship ? ` · ${profile.relationship}` : ""}
        </small>
      </span>
      <span className={styles.profileState}>
        {fixed ? "Current" : selected ? "Selected" : "Choose"}
      </span>
    </>
  )

  if (fixed) {
    return (
      <div className={styles.profileChoice} data-selected="true">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={styles.profileChoice}
      data-selected={selected}
      aria-pressed={selected}
      aria-label={`${formatName(profile.name)}, ${roleLabel(role)}${
        profile.relationship ? `, ${profile.relationship}` : ""
      }`}
      onClick={onClick}
    >
      {content}
    </button>
  )
}

function SectionIntro({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <div className={toolStyles.sectionHeader}>
      <h3 id={id} className={toolStyles.sectionTitle}>{title}</h3>
      <p className={toolStyles.sectionHint}>{description}</p>
    </div>
  )
}

function MoonProfiles({
  result,
  groomProfile,
  brideProfile,
}: {
  result: CompatResult
  groomProfile: Profile
  brideProfile: Profile
}) {
  if (!result.male_details && !result.female_details) return null

  return (
    <section
      className={toolStyles.section}
      aria-labelledby="compatibility-moon-heading"
    >
      <div className={toolStyles.sectionHeader}>
        <h3 id="compatibility-moon-heading" className={toolStyles.sectionTitle}>
          Natal Moon context
        </h3>
        <p className={toolStyles.sectionHint}>
          The birth-star qualities used by the classical comparison.
        </p>
      </div>
      <div className={styles.moonGrid}>
        {[
          {
            profile: groomProfile,
            role: "Groom",
            details: result.male_details,
          },
          {
            profile: brideProfile,
            role: "Bride",
            details: result.female_details,
          },
        ].map(({ profile, role, details }) => (
          <article className={styles.moonCard} key={profile.id}>
            <header className={styles.moonHeader}>
              <span className={styles.profileMonogram} aria-hidden="true">
                {initials(profile.name)}
              </span>
              <span>
                <strong>{formatName(profile.name)}</strong>
                <small>{role}</small>
              </span>
            </header>
            <dl className={styles.moonFacts}>
              {MOON_FIELDS.map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{details?.[key] ?? "Not returned"}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}

function DoshaSummary({
  scores,
  kujaDosha,
  groomProfile,
  brideProfile,
}: {
  scores: Record<string, number>
  kujaDosha: KujaDosha | undefined
  groomProfile: Profile
  brideProfile: Profile
}) {
  const groomManglik = Boolean(kujaDosha?.male?.is_manglik)
  const brideManglik = Boolean(kujaDosha?.female?.is_manglik)
  const hasKujaData = Boolean(kujaDosha?.male || kujaDosha?.female)
  const kujaBalanced =
    hasKujaData && groomManglik === brideManglik
  const bhakootScore = scores.Bhakoot ?? scores.Rashi
  const hasBhakootData = typeof bhakootScore === "number"
  const hasBhakootDosha = hasBhakootData && bhakootScore === 0

  return (
    <section
      className={toolStyles.section}
      aria-labelledby="compatibility-dosha-heading"
    >
      <div className={toolStyles.sectionHeader}>
        <h3 id="compatibility-dosha-heading" className={toolStyles.sectionTitle}>
          Dosha checks
        </h3>
        <p className={toolStyles.sectionHint}>
          Conditions to read alongside—not replace—the Guna score.
        </p>
      </div>
      <div className={styles.doshaGrid}>
        <article className={styles.doshaCard}>
          <div className={styles.doshaHeading}>
            <div>
              <p>Mangal / Kuja Dosha</p>
              <strong>
                {!hasKujaData
                  ? "Not returned"
                  : kujaBalanced
                    ? "Balanced between profiles"
                    : "Needs individual review"}
              </strong>
            </div>
            <span
              className={styles.statusPill}
              data-tone={
                !hasKujaData
                  ? "neutral"
                  : kujaBalanced
                    ? "supportive"
                    : "caution"
              }
            >
              {!hasKujaData
                ? "Unavailable"
                : groomManglik && brideManglik
                  ? "Present in both"
                  : !groomManglik && !brideManglik
                    ? "Absent in both"
                    : "Uneven"}
            </span>
          </div>
          <p className={styles.doshaDescription}>
            {kujaDosha?.compatibility?.description ??
              `${formatName(groomProfile.name)}: ${
                groomManglik ? "present" : "not present"
              } · ${formatName(brideProfile.name)}: ${
                brideManglik ? "present" : "not present"
              }`}
          </p>
        </article>

        <article className={styles.doshaCard}>
          <div className={styles.doshaHeading}>
            <div>
              <p>Bhakoot Dosha</p>
              <strong>
                {!hasBhakootData
                  ? "Not returned"
                  : hasBhakootDosha
                    ? "Condition identified"
                    : "No condition identified"}
              </strong>
            </div>
            <span
              className={styles.statusPill}
              data-tone={
                !hasBhakootData
                  ? "neutral"
                  : hasBhakootDosha
                    ? "caution"
                    : "supportive"
              }
            >
              {hasBhakootData ? `${bhakootScore} / 7` : "Unavailable"}
            </span>
          </div>
          <p className={styles.doshaDescription}>
            This status follows the Bhakoot score returned by the compatibility
            engine.
          </p>
        </article>
      </div>
    </section>
  )
}

function KujaDetails({
  kujaDosha,
  groomProfile,
  brideProfile,
}: {
  kujaDosha: KujaDosha | undefined
  groomProfile: Profile
  brideProfile: Profile
}) {
  if (!kujaDosha?.male?.breakdown && !kujaDosha?.female?.breakdown) return null

  const rows = [
    {
      profile: groomProfile,
      breakdown: kujaDosha.male?.breakdown ?? {},
    },
    {
      profile: brideProfile,
      breakdown: kujaDosha.female?.breakdown ?? {},
    },
  ].flatMap(({ profile, breakdown }) =>
    Object.entries(breakdown).map(([planet, entry]) => ({
      profile,
      planet,
      ...entry,
    })),
  )

  return (
    <section
      className={toolStyles.section}
      aria-labelledby="compatibility-kuja-heading"
    >
      <SectionIntro
        id="compatibility-kuja-heading"
        title="Kuja Dosha detail"
        description="Exact contributing placements returned by the engine."
      />
      <div className={styles.tableFrame}>
        <table
          className={styles.dataTable}
          aria-label="Kuja Dosha contributing placements"
        >
          <thead>
            <tr>
              <th>Profile</th>
              <th>Graha</th>
              <th>Placement</th>
              <th className={styles.numeric}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={`${row.profile.id}-${row.planet}`}>
                  <th scope="row">{formatName(row.profile.name)}</th>
                  <td>{row.planet}</td>
                  <td>
                    House {row.house} · {row.sign}
                  </td>
                  <td className={styles.numeric}>+{row.score}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No contributing placements were returned.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AdditionalKutas({
  additionalKutas,
}: {
  additionalKutas: Record<string, string | AdditionalKuta>
}) {
  const entries = Object.entries(additionalKutas)
  if (entries.length === 0) return null

  return (
    <section
      className={toolStyles.section}
      aria-labelledby="compatibility-additional-heading"
    >
      <SectionIntro
        id="compatibility-additional-heading"
        title="Additional Kutas"
        description="Supplementary traditional checks returned by the engine."
      />
      <div className={styles.tableFrame}>
        <table
          className={styles.dataTable}
          aria-label="Additional Kuta results"
        >
          <thead>
            <tr>
              <th>Check</th>
              <th>Result</th>
              <th>Returned detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => {
              const kuta: AdditionalKuta =
                typeof value === "string" ? { result: value } : value
              const details = [
                kuta.description,
                kuta.effect,
                ...(kuta.issues ?? []),
              ].filter(Boolean)
              return (
                <tr key={key}>
                  <th scope="row">{kutaLabel(key)}</th>
                  <td>
                    <span
                      className={styles.statusPill}
                      data-tone={resultTone(kuta.result)}
                    >
                      {resultLabel(kuta.result)}
                    </span>
                  </td>
                  <td className={styles.detailCell}>
                    {details.length > 0 ? details.join(" · ") : "No detail returned"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function FullResult({
  check,
  groomProfile,
  brideProfile,
}: {
  check: CompatibilityCheck
  groomProfile: Profile
  brideProfile: Profile
}) {
  const result = parseResult(check)
  if (!result) {
    return (
      <div className={styles.errorCard} role="alert">
        The saved result could not be read. Reset the comparison and calculate
        it again.
      </div>
    )
  }

  const score = result.total_score ?? check.score
  const scores = result.scores ?? {}
  const additionalKutas = result.additional_kutas ?? {}
  const exceptions = result.exceptions ?? []

  return (
    <div className={styles.results}>
      <section
        className={styles.overviewCard}
        aria-labelledby="compatibility-overview-heading"
      >
        <div className={styles.pairHeading}>
          <span className={styles.pairMark} aria-hidden="true">
            {initials(groomProfile.name)}
          </span>
          <HeartHandshake size={22} aria-hidden="true" />
          <span className={styles.pairMark} aria-hidden="true">
            {initials(brideProfile.name)}
          </span>
          <div>
            <p>Calculated comparison</p>
            <h3 id="compatibility-overview-heading">
              {formatName(groomProfile.name)} &amp;{" "}
              {formatName(brideProfile.name)}
            </h3>
          </div>
        </div>

        <div className={styles.scoreLayout}>
          <div className={styles.scoreBlock} data-tone={scoreTone(score)}>
            <span className={styles.scoreValue}>{score}</span>
            <span className={styles.scoreMax}>out of 36</span>
            <strong>{scoreLabel(score)}</strong>
          </div>
          <div className={styles.scoreReading}>
            <p className={styles.scoreEyebrow}>Classical Ashtakoota Milan</p>
            <h4>{scoreStatement(score)}</h4>
            <progress
              className={styles.scoreProgress}
              max={36}
              value={score}
              aria-label={`${score} of 36 Guna points`}
            />
            <p>
              This is one traditional compatibility lens. Read the eight Kootas,
              Dosha conditions, exceptions, both full charts, and lived context
              before reaching a conclusion.
            </p>
          </div>
        </div>
      </section>

      {Object.keys(scores).length > 0 && (
        <section
          className={toolStyles.section}
          aria-labelledby="compatibility-guna-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h3
              id="compatibility-guna-heading"
              className={toolStyles.sectionTitle}
            >
              Eight-Koota score
            </h3>
            <p className={toolStyles.sectionHint}>
              Every point returned by the classical 36-point calculation.
            </p>
          </div>
          <div className={styles.tableFrame}>
            <table
              className={styles.dataTable}
              aria-label="Eight-Koota compatibility score"
            >
              <thead>
                <tr>
                  <th>Koota</th>
                  <th className={styles.numeric}>Earned</th>
                  <th className={styles.numeric}>Maximum</th>
                  <th>Reading</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(scores).map(([name, points]) => {
                  const maximum = KOOTA_MAX[name]
                  const state =
                    typeof maximum !== "number"
                      ? "Returned"
                      : points >= maximum
                        ? "Full points"
                        : points === 0
                          ? "No points"
                          : "Partial points"
                  return (
                    <tr key={name}>
                      <th scope="row">{kutaLabel(name)}</th>
                      <td className={styles.numeric}>{points}</td>
                      <td className={styles.numeric}>{maximum ?? "—"}</td>
                      <td>
                        <span
                          className={styles.statusPill}
                          data-tone={
                            state === "Full points"
                              ? "supportive"
                              : state === "No points"
                                ? "caution"
                                : "mixed"
                          }
                        >
                          {state}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <MoonProfiles
        result={result}
        groomProfile={groomProfile}
        brideProfile={brideProfile}
      />

      <DoshaSummary
        scores={scores}
        kujaDosha={result.kuja_dosha}
        groomProfile={groomProfile}
        brideProfile={brideProfile}
      />

      <KujaDetails
        kujaDosha={result.kuja_dosha}
        groomProfile={groomProfile}
        brideProfile={brideProfile}
      />

      <AdditionalKutas additionalKutas={additionalKutas} />

      {exceptions.length > 0 && (
        <section
          className={styles.exceptionCard}
          aria-labelledby="compatibility-exceptions-heading"
        >
          <span>
            <ShieldCheck size={18} aria-hidden="true" />
          </span>
          <div>
            <p className={styles.cardEyebrow}>Returned exceptions</p>
            <h3 id="compatibility-exceptions-heading">
              Dosha mitigations identified by the engine
            </h3>
            <ul>
              {exceptions.map((exception) => (
                <li key={exception}>{exception}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={styles.readingBoundary}>
        <p className={styles.cardEyebrow}>Reading boundary</p>
        <h3>A compatibility score is a starting point, not a decision.</h3>
        <p>
          Classical matching does not assess consent, values, communication,
          health, safety, or the practical realities of a relationship. Use it
          as structured astrological evidence within a much broader judgment.
        </p>
      </section>
    </div>
  )
}

interface CompareTabProps {
  activeProfile: Profile
  allProfiles: Profile[]
  selectedId: string
  onSelectedId: (id: string) => void
  result: CompatibilityCheck | null
  onResult: (result: CompatibilityCheck | null) => void
}

export function CompareTab({
  activeProfile,
  allProfiles,
  selectedId,
  onSelectedId,
  result,
  onResult,
}: CompareTabProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = filterCandidates(allProfiles, activeProfile)
  const activeRole = resolveRole(activeProfile.gender)
  const partnerRole = oppositeRole(activeRole)
  const selected = candidates.find((profile) => profile.id === selectedId) ?? null

  function chooseProfile(id: string) {
    onSelectedId(id)
    onResult(null)
    setError(null)
  }

  async function calculate() {
    if (!selected || loading) return
    setLoading(true)
    setError(null)
    onResult(null)
    try {
      const [profileId1, profileId2] =
        activeRole === "bride"
          ? [selected.id, activeProfile.id]
          : [activeProfile.id, selected.id]
      const response = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id_1: profileId1,
          profile_id_2: profileId2,
        }),
      })
      const data = (await response.json()) as CompatibilityCheck & {
        error?: string
      }
      if (!response.ok) {
        throw new Error(data.error ?? "The comparison could not be calculated.")
      }
      onResult(data)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The comparison could not be calculated.",
      )
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    onSelectedId("")
    onResult(null)
    setError(null)
  }

  const groomProfile = activeRole === "groom" ? activeProfile : selected
  const brideProfile = activeRole === "bride" ? activeProfile : selected

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <HeartHandshake size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Marriage compatibility</p>
            <h2 className={toolStyles.leadTitle}>
              Compare the charts, then read the conditions.
            </h2>
            <p className={toolStyles.leadText}>
              Start with the classical Ashtakoota calculation, then examine Moon
              context, Doshas, additional Kutas, and returned exceptions. The
              score is evidence—not a verdict about a relationship.
            </p>
          </div>
        </div>
        <span className={styles.enginePill}>DashaFlow · private profiles</span>
      </section>

      <section
        className={styles.selectionCard}
        aria-labelledby="compatibility-selection-heading"
      >
        <div className={styles.selectionHeading}>
          <div>
            <p className={styles.cardEyebrow}>Profiles</p>
            <h3 id="compatibility-selection-heading">
              Choose the second birth chart
            </h3>
            <p>
              The current profile stays fixed. Select one other saved profile,
              then run the comparison when you are ready.
            </p>
          </div>
          {selectedId && (
            <button
              type="button"
              className={toolStyles.secondaryButton}
              onClick={reset}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Reset
            </button>
          )}
        </div>

        <div className={styles.profileColumns}>
          <fieldset>
            <legend>Current profile</legend>
            <ProfileChoice
              profile={activeProfile}
              role={activeRole}
              fixed
            />
          </fieldset>

          <span className={styles.profileConnector} aria-hidden="true">
            <HeartHandshake size={18} />
          </span>

          <fieldset>
            <legend>{roleLabel(partnerRole)} profile</legend>
            {candidates.length > 0 ? (
              <div className={styles.candidateList}>
                {candidates.map((profile) => (
                  <ProfileChoice
                    key={profile.id}
                    profile={profile}
                    role={partnerRole}
                    selected={profile.id === selectedId}
                    onClick={() => chooseProfile(profile.id)}
                  />
                ))}
              </div>
            ) : (
              <a className={styles.addProfile} href="/dashboard?create=1">
                Add a {roleLabel(partnerRole).toLowerCase()} profile
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            )}
          </fieldset>
        </div>

        {selected && (
          <div className={styles.actionRow}>
            <p>
              Ready to compare {formatName(activeProfile.name)} and{" "}
              {formatName(selected.name)}.
            </p>
            <button
              type="button"
              className={toolStyles.primaryButton}
              disabled={loading}
              onClick={calculate}
            >
              {loading ? (
                <>
                  <Loader2
                    className={styles.spinning}
                    size={14}
                    aria-hidden="true"
                  />
                  Calculating…
                </>
              ) : (
                <>
                  {result ? "Recalculate compatibility" : "Calculate compatibility"}
                  <ArrowRight size={14} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {error && (
        <div className={styles.errorCard} role="alert">
          {error}
        </div>
      )}

      {!loading && result && groomProfile && brideProfile && (
        <FullResult
          check={result}
          groomProfile={groomProfile}
          brideProfile={brideProfile}
        />
      )}

      {!loading && !result && !error && candidates.length > 0 && !selected && (
        <section className={toolStyles.helpCard}>
          <p className={toolStyles.helpTitle}>No comparison selected yet</p>
          <p className={toolStyles.helpText}>
            Choose the second saved profile above. Nothing is calculated or
            stored until you press Calculate compatibility.
          </p>
        </section>
      )}
    </div>
  )
}
