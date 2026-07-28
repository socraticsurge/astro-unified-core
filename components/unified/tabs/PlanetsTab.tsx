"use client"

import { Orbit } from "lucide-react"
import {
  PLANET_ABBR,
  PLANET_ORDER,
  dignityTone,
  formatAspects,
} from "@/components/unified/types"
import type { Planet } from "@/components/unified/types"
import toolStyles from "@/components/profiles/ToolPage.module.css"
import styles from "./PlanetsTab.module.css"

interface Avastha {
  avastha?: string
}

interface Yoga {
  name: string
  formed_by?: string[]
}

interface Lagna {
  sign?: string
  degree?: number
  nakshatra?: string
  pada?: number
}

function formatDignity(dignity?: string): string {
  return dignity?.replaceAll("_", " ") ?? "Not returned"
}

function placementMeta(planet?: Planet): string {
  if (!planet) return "Not returned"
  const parts = [
    planet.house != null ? `House ${planet.house}` : null,
    planet.nakshatra
      ? `${planet.nakshatra}${planet.pada != null ? ` · Pada ${planet.pada}` : ""}`
      : null,
  ].filter(Boolean)
  return parts.join(" · ") || "Placement details unavailable"
}

function conditionLabels(planet: Planet): string[] {
  const labels = [planet.is_retrograde ? "Retrograde" : "Direct"]
  if (planet.is_combust) labels.push("Combust")
  if (planet.has_digbala) labels.push("Directional strength")
  return labels
}

export function PlanetsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined
  const planets = data?.planets as Record<string, Planet> | undefined
  const lagna = data?.lagna as Lagna | undefined
  const avasthas = data?.avasthas as Record<string, Avastha> | undefined
  const yogas = data?.yogas as Yoga[] | undefined

  if (!planets) return null

  const anchors = [
    {
      label: "Ascendant",
      abbreviation: "Lg",
      sign: lagna?.sign,
      meta: [
        lagna?.degree != null ? `${lagna.degree.toFixed(1)}°` : null,
        lagna?.nakshatra
          ? `${lagna.nakshatra}${lagna.pada != null ? ` · Pada ${lagna.pada}` : ""}`
          : null,
      ].filter(Boolean).join(" · ") || "First-house orientation",
    },
    {
      label: "Sun",
      abbreviation: PLANET_ABBR.Sun,
      sign: planets.Sun?.sign,
      meta: placementMeta(planets.Sun),
    },
    {
      label: "Moon",
      abbreviation: PLANET_ABBR.Moon,
      sign: planets.Moon?.sign,
      meta: placementMeta(planets.Moon),
    },
  ]

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <Orbit size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Natal placements</p>
            <h2 className={toolStyles.leadTitle}>The grahas, placed in context</h2>
            <p className={toolStyles.leadText}>
              Start with the Ascendant, Sun, and Moon, then scan every graha by
              sign, house, Nakshatra, condition, and influence. These values come
              directly from the calculated sidereal D1 chart.
            </p>
          </div>
        </div>
        <span className={styles.sourcePill}>DashaFlow · Sidereal D1</span>
      </section>

      <section className={toolStyles.section} aria-labelledby="planet-anchors-title">
        <div className={toolStyles.sectionHeader}>
          <h2 id="planet-anchors-title" className={toolStyles.sectionTitle}>Chart anchors</h2>
          <p className={toolStyles.sectionHint}>
            Orientation anchors, not a ranking of planetary importance.
          </p>
        </div>
        <div className={styles.anchorGrid}>
          {anchors.map(anchor => (
            <article key={anchor.label} className={styles.anchorCard}>
              <span className={styles.anchorMark} aria-hidden="true">{anchor.abbreviation}</span>
              <div>
                <p className={styles.anchorLabel}>{anchor.label}</p>
                <p className={styles.anchorSign}>{anchor.sign ?? "Not returned"}</p>
                <p className={styles.anchorMeta}>{anchor.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={toolStyles.section} aria-labelledby="planet-positions-title">
        <div className={toolStyles.sectionHeader}>
          <h2 id="planet-positions-title" className={toolStyles.sectionTitle}>
            Complete planetary positions
          </h2>
          <p className={toolStyles.sectionHint}>
            Nine grahas, with calculated condition and influence kept together.
          </p>
        </div>

        <div className={styles.desktopTable}>
          <div className={styles.tableFrame}>
            <table className={styles.positionTable}>
              <caption className="sr-only">
                Sidereal D1 positions for the nine Vedic grahas
              </caption>
              <thead>
                <tr>
                  <th scope="col">Graha</th>
                  <th scope="col">Placement</th>
                  <th scope="col">House</th>
                  <th scope="col">Nakshatra</th>
                  <th scope="col">Dignity</th>
                  <th scope="col">Condition</th>
                  <th scope="col">Influence</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const planet = planets[name]
                  if (!planet) return null
                  const planetYogas = yogas?.filter(yoga => yoga.formed_by?.includes(name)) ?? []
                  const aspects = formatAspects(planet.aspects)
                  const avastha = avasthas?.[name]?.avastha

                  return (
                    <tr key={name}>
                      <th scope="row" className={styles.grahaCell}>
                        <span className={styles.grahaIdentity}>
                          <span className={styles.planetMark} aria-hidden="true">
                            {PLANET_ABBR[name]}
                          </span>
                          <span>
                            <strong>{name}</strong>
                            {planetYogas.length > 0 && (
                              <span
                                className={styles.yogaNote}
                                title={planetYogas.map(yoga => yoga.name).join(", ")}
                                aria-label={`${planetYogas.length} yoga${planetYogas.length === 1 ? "" : "s"}: ${planetYogas.map(yoga => yoga.name).join(", ")}`}
                              >
                                ✦ {planetYogas.length} yoga{planetYogas.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </span>
                        </span>
                      </th>
                      <td>
                        <strong className={styles.primaryValue}>{planet.sign ?? "—"}</strong>
                        <span className={styles.secondaryValue}>
                          {planet.degree != null ? `${planet.degree.toFixed(1)}°` : "Degree unavailable"}
                        </span>
                      </td>
                      <td>
                        <span className={styles.houseValue}>
                          {planet.house != null ? `H${planet.house}` : "—"}
                        </span>
                      </td>
                      <td>
                        <strong className={styles.primaryValue}>{planet.nakshatra ?? "—"}</strong>
                        <span className={styles.secondaryValue}>
                          {planet.pada != null ? `Pada ${planet.pada}` : "Pada unavailable"}
                          {planet.nakshatra_lord ? ` · ${planet.nakshatra_lord}` : ""}
                        </span>
                      </td>
                      <td>
                        <span
                          className={styles.dignityTag}
                          data-tone={dignityTone(planet.dignity ?? "")}
                        >
                          {formatDignity(planet.dignity)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.conditionList}>
                          {conditionLabels(planet).map(label => (
                            <span key={label} data-emphasis={label === "Direct" ? "quiet" : "visible"}>
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <strong className={styles.primaryValue}>{avastha ?? "Avastha unavailable"}</strong>
                        <span className={styles.secondaryValue}>
                          {aspects === "—" ? "No aspects returned" : `Aspects ${aspects}`}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.mobileList}>
          {PLANET_ORDER.map(name => {
            const planet = planets[name]
            if (!planet) return null
            const planetYogas = yogas?.filter(yoga => yoga.formed_by?.includes(name)) ?? []
            const aspects = formatAspects(planet.aspects)

            return (
              <article key={name} className={styles.planetCard}>
                <div className={styles.planetCardHeading}>
                  <div className={styles.planetIdentity}>
                    <span className={styles.planetMark} aria-hidden="true">{PLANET_ABBR[name]}</span>
                    <div>
                      <h3 className={styles.planetName}>{name}</h3>
                      <p className={styles.planetPosition}>
                        {planet.sign ?? "—"} · {planet.degree != null ? `${planet.degree.toFixed(1)}°` : "—"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={styles.dignityTag}
                    data-tone={dignityTone(planet.dignity ?? "")}
                  >
                    {formatDignity(planet.dignity)}
                  </span>
                </div>

                <dl className={styles.planetFacts}>
                  <div>
                    <dt>House</dt>
                    <dd>{planet.house != null ? `House ${planet.house}` : "—"}</dd>
                  </div>
                  <div>
                    <dt>Nakshatra</dt>
                    <dd>
                      {planet.nakshatra ?? "—"}
                      {planet.pada != null ? ` · Pada ${planet.pada}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Condition</dt>
                    <dd>{conditionLabels(planet).join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>Avastha</dt>
                    <dd>{avasthas?.[name]?.avastha ?? "—"}</dd>
                  </div>
                  <div className={styles.wideFact}>
                    <dt>Influence</dt>
                    <dd>{aspects === "—" ? "No aspects returned" : `Aspects ${aspects}`}</dd>
                  </div>
                </dl>

                {planetYogas.length > 0 && (
                  <p className={styles.mobileYoga}>
                    <span>Yogas</span>
                    {planetYogas.map(yoga => yoga.name).join(" · ")}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className={styles.readingNotes} aria-label="How to interpret planetary data">
        <article>
          <p className={styles.noteEyebrow}>Reading sequence</p>
          <h2>Placement first, modifiers second</h2>
          <p>
            Sign describes expression, house describes the life area, and
            Nakshatra refines the mode. Dignity, motion, Avastha, and aspects
            modify that placement; no single field should be read alone.
          </p>
        </article>
        <article>
          <p className={styles.noteEyebrow}>Classification boundary</p>
          <h2>Benefic and malefic labels are not inferred</h2>
          <p>
            Dignity is not the same as a chart-specific functional benefic or
            malefic classification. The current calculation does not return that
            classification, so this page does not manufacture one.
          </p>
        </article>
      </section>
    </div>
  )
}
