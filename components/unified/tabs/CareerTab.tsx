"use client";

import { useEffect } from "react";
import {
  BriefcaseBusiness,
  RefreshCw,
} from "lucide-react";

import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { TabLoadingSkeleton } from "@/components/unified/TabLoadingSkeleton";
import {
  PLANET_ABBR,
  PLANET_ORDER,
} from "@/components/unified/types";
import type {
  Planet,
  SignName,
} from "@/components/unified/types";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./CareerTab.module.css";

type TenthHouse = {
  sign?: string;
  lord?: string;
  lord_house?: number;
  lord_sign?: string;
  lord_d10?: string;
  lord_dignity?: string;
  occupants?: string[];
};

type D10Indicator = {
  d10_sign?: string;
  d10_lord?: string;
  d10_strong?: boolean;
};

type CareerData = {
  tenth_house?: TenthHouse;
  d10_indicators?: Record<string, D10Indicator>;
  career_themes?: string[];
  primary_planets?: string[];
  strength_factors?: string[];
  d10_strong_planets?: string[];
};

type FactorTone = "support" | "complexity" | "context";

function formatTerm(value?: string) {
  return value?.replaceAll("_", " ") ?? "Not returned";
}

function factorTone(factor: string): FactorTone {
  if (
    /challenge|retrograde|unconventional|obstacle|delay|setback|difficulty/i
      .test(factor)
  ) {
    return "complexity";
  }
  if (
    /strong|prominence|fortune|success|powerful|foundation/i
      .test(factor)
  ) {
    return "support";
  }
  return "context";
}

function professionalRoles(
  planet: string,
  tenth: TenthHouse | undefined,
  primary: Set<string>,
  indicator: D10Indicator | undefined,
) {
  const roles: string[] = [];
  if (tenth?.lord === planet) roles.push("10th lord");
  if (tenth?.occupants?.includes(planet)) roles.push("10th occupant");
  if (
    primary.has(planet)
    && !roles.includes("10th lord")
    && !roles.includes("10th occupant")
  ) {
    roles.push("Primary");
  }
  if (indicator?.d10_strong) roles.push("Strong-sign flag");
  return roles;
}

function factorLabel(tone: FactorTone) {
  if (tone === "support") return "Supportive factor";
  if (tone === "complexity") return "Complexity returned";
  return "Context factor";
}

export function CareerTab({
  chartOutput,
  careerOutput,
  isCareerLoading,
  careerError,
  onFetchCareer,
}: {
  chartOutput: Record<string, unknown>;
  careerOutput: Record<string, unknown> | null;
  isCareerLoading: boolean;
  careerError?: string | null;
  onFetchCareer: (force?: boolean) => void;
}) {
  useEffect(() => {
    if (!careerOutput && !isCareerLoading) onFetchCareer();
  }, [careerOutput, isCareerLoading, onFetchCareer]);

  const chartData = chartOutput?.data as
    | Record<string, unknown>
    | undefined;
  const planets = chartData?.planets as
    | Record<string, Planet>
    | undefined;
  const lagna = chartData?.lagna as
    | Record<string, unknown>
    | undefined;
  const lagnaD10 = lagna?.d10_sign as SignName | undefined;

  const careerPayload = (
    (careerOutput as Record<string, unknown> | null)?.data
    ?? careerOutput
  ) as CareerData | null;
  const career = careerPayload
    && Object.keys(careerPayload).length > 0
    ? careerPayload
    : null;
  const tenth = career?.tenth_house;
  const indicators = career?.d10_indicators ?? {};
  const primary = new Set(career?.primary_planets ?? []);
  const factors = (career?.strength_factors ?? []).map((factor) => ({
    factor,
    tone: factorTone(factor),
  }));
  const supportiveFactors = factors.filter(
    ({ tone }) => tone === "support",
  );
  const complexityFactors = factors.filter(
    ({ tone }) => tone === "complexity",
  );
  const contextFactors = factors.filter(
    ({ tone }) => tone === "context",
  );

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <BriefcaseBusiness size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>
              Vocation and contribution
            </p>
            <h2 className={toolStyles.leadTitle}>
              Read the career foundation before the job titles
            </h2>
            <p className={toolStyles.leadText}>
              Begin with Karma Bhava and its lord, then read the complete
              Dashamsha map. The returned domains are a vocabulary of possible
              expression—not ranked recommendations or a fixed profession.
            </p>
          </div>
        </div>
        <div className={styles.leadTools}>
          <span className={styles.sourcePill}>
            DashaFlow · D1 + D10
          </span>
          <button
            type="button"
            onClick={() => onFetchCareer(true)}
            disabled={isCareerLoading}
            className={toolStyles.leadAction}
          >
            <RefreshCw
              size={14}
              className={isCareerLoading ? styles.spinning : undefined}
              aria-hidden="true"
            />
            Recalculate
          </button>
        </div>
      </section>

      {isCareerLoading && (
        <TabLoadingSkeleton lines={5} cards={2} />
      )}

      {!isCareerLoading && careerError && (
        <div className={styles.errorCard} role="alert">
          <div>
            <h3>Couldn&apos;t load career analysis</h3>
            <p>{careerError}</p>
          </div>
          <button
            type="button"
            onClick={() => onFetchCareer(true)}
            className={toolStyles.secondaryButton}
          >
            Retry
          </button>
        </div>
      )}

      {!isCareerLoading && !careerError && !career && (
        <p className={styles.empty}>
          Career analysis has not been returned yet.
        </p>
      )}

      {career && (
        <>
          <section
            className={toolStyles.section}
            aria-labelledby="career-foundation-heading"
          >
            <div className={toolStyles.sectionHeader}>
              <h2
                id="career-foundation-heading"
                className={toolStyles.sectionTitle}
              >
                Career foundation
              </h2>
              <p className={toolStyles.sectionHint}>
                The natal 10th house describes visible contribution; D10
                refines professional expression.
              </p>
            </div>

            <div className={styles.foundationGrid}>
              {tenth && (
                <article className={styles.tenthCard}>
                  <div className={styles.tenthHeading}>
                    <div>
                      <p className={styles.cardEyebrow}>
                        10th house · Karma Bhava
                      </p>
                      <h3>{tenth.sign ?? "Not returned"}</h3>
                    </div>
                    {tenth.lord_dignity && (
                      <span className={styles.dignityTag}>
                        {formatTerm(tenth.lord_dignity)}
                      </span>
                    )}
                  </div>

                  <dl className={styles.foundationFacts}>
                    <div>
                      <dt>House lord</dt>
                      <dd>{tenth.lord ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Lord placement</dt>
                      <dd>
                        {tenth.lord_house == null
                          ? "Not returned"
                          : `House ${tenth.lord_house}`}
                        {tenth.lord_sign
                          ? ` · ${tenth.lord_sign}`
                          : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Occupants</dt>
                      <dd>
                        {tenth.occupants?.length
                          ? tenth.occupants.join(", ")
                          : "None returned"}
                      </dd>
                    </div>
                    <div>
                      <dt>Lord in D10</dt>
                      <dd>{tenth.lord_d10 ?? "Not returned"}</dd>
                    </div>
                  </dl>
                </article>
              )}

              {planets && (
                <div className={styles.chartCard}>
                  <NatalChartGrid
                    planets={planets}
                    lagnaSign={lagnaD10}
                    signKey="d10_sign"
                    label="D10 — Dashamsha"
                  />
                </div>
              )}
            </div>
          </section>

          {Object.keys(indicators).length > 0 && (
            <section
              className={toolStyles.section}
              aria-labelledby="career-map-heading"
            >
              <div className={toolStyles.sectionHeader}>
                <h2
                  id="career-map-heading"
                  className={toolStyles.sectionTitle}
                >
                  Professional emphasis map
                </h2>
                <p className={toolStyles.sectionHint}>
                  All nine grahas remain visible; absence of a strong-sign flag
                  is not a weakness verdict.
                </p>
              </div>

              <div className={styles.desktopTable}>
                <div className={styles.tableFrame}>
                  <table className={styles.indicatorTable}>
                    <caption className="sr-only">
                      Complete D10 professional emphasis map
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Graha</th>
                        <th scope="col">Calculated role</th>
                        <th scope="col">D10 placement</th>
                        <th scope="col">D10 sign lord</th>
                        <th scope="col">Strong-sign check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PLANET_ORDER.map((planet) => {
                        const indicator = indicators[planet];
                        if (!indicator) return null;
                        const roles = professionalRoles(
                          planet,
                          tenth,
                          primary,
                          indicator,
                        );
                        return (
                          <tr key={planet}>
                            <th scope="row">
                              <span className={styles.planetIdentity}>
                                <span
                                  className={styles.planetMark}
                                  aria-hidden="true"
                                >
                                  {PLANET_ABBR[planet]}
                                </span>
                                <strong>{planet}</strong>
                              </span>
                            </th>
                            <td>
                              {roles.length > 0
                                ? (
                                    <span className={styles.roleList}>
                                      {roles.map((role) => (
                                        <span key={role}>{role}</span>
                                      ))}
                                    </span>
                                  )
                                : (
                                    <span className={styles.quietValue}>
                                      D10 context
                                    </span>
                                  )}
                            </td>
                            <td>
                              <strong className={styles.primaryValue}>
                                {indicator.d10_sign ?? "—"}
                              </strong>
                            </td>
                            <td>
                              <span className={styles.quietValue}>
                                {indicator.d10_lord ?? "—"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={styles.strengthState}
                                data-strong={
                                  indicator.d10_strong ? "true" : "false"
                                }
                              >
                                {indicator.d10_strong
                                  ? "Strong sign returned"
                                  : "No strong-sign flag"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.mobileList}>
                {PLANET_ORDER.map((planet) => {
                  const indicator = indicators[planet];
                  if (!indicator) return null;
                  const roles = professionalRoles(
                    planet,
                    tenth,
                    primary,
                    indicator,
                  );
                  return (
                    <article
                      key={planet}
                      className={styles.indicatorCard}
                      aria-label={`${planet}: ${indicator.d10_sign ?? "D10 sign not returned"}, ${indicator.d10_strong ? "strong sign returned" : "no strong-sign flag"}`}
                    >
                      <div className={styles.indicatorHeading}>
                        <span className={styles.planetIdentity}>
                          <span
                            className={styles.planetMark}
                            aria-hidden="true"
                          >
                            {PLANET_ABBR[planet]}
                          </span>
                          <strong>{planet}</strong>
                        </span>
                        <span
                          className={styles.strengthState}
                          data-strong={
                            indicator.d10_strong ? "true" : "false"
                          }
                        >
                          {indicator.d10_strong
                            ? "Strong sign"
                            : "No flag"}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>D10 placement</dt>
                          <dd>{indicator.d10_sign ?? "—"}</dd>
                        </div>
                        <div>
                          <dt>Sign lord</dt>
                          <dd>{indicator.d10_lord ?? "—"}</dd>
                        </div>
                      </dl>
                      <p className={styles.mobileRoles}>
                        {roles.length > 0
                          ? roles.join(" · ")
                          : "D10 context"}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {factors.length > 0 && (
            <section
              className={toolStyles.section}
              aria-labelledby="career-evidence-heading"
            >
              <div className={toolStyles.sectionHeader}>
                <h2
                  id="career-evidence-heading"
                  className={toolStyles.sectionTitle}
                >
                  Calculated career evidence
                </h2>
                <p className={toolStyles.sectionHint}>
                  Exact DashaFlow statements, separated by what the engine
                  actually returned.
                </p>
              </div>

              <div className={styles.evidenceGrid}>
                <article className={styles.evidencePanel}>
                  <div className={styles.evidenceHeading}>
                    <p>Supportive factors</p>
                    <span>{supportiveFactors.length}</span>
                  </div>
                  {supportiveFactors.length > 0
                    ? (
                        <ul className={styles.factorList}>
                          {supportiveFactors.map(({ factor, tone }) => (
                            <li key={factor} data-tone={tone}>
                              <span aria-hidden="true">✦</span>
                              <div>
                                <small>{factorLabel(tone)}</small>
                                <p>{factor}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    : (
                        <p className={styles.factorEmpty}>
                          No explicitly supportive factor was returned.
                        </p>
                      )}
                </article>

                <article className={styles.evidencePanel}>
                  <div className={styles.evidenceHeading}>
                    <p>Complexities returned</p>
                    <span>{complexityFactors.length}</span>
                  </div>
                  {complexityFactors.length > 0
                    ? (
                        <ul className={styles.factorList}>
                          {complexityFactors.map(({ factor, tone }) => (
                            <li key={factor} data-tone={tone}>
                              <span aria-hidden="true">◆</span>
                              <div>
                                <small>{factorLabel(tone)}</small>
                                <p>{factor}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )
                    : (
                        <div className={styles.factorEmpty}>
                          <strong>
                            No explicit career challenge was returned for this
                            chart.
                          </strong>
                          <p>
                            This is not proof that professional life has no
                            challenges; it reflects the current engine&apos;s
                            limited career-factor checks.
                          </p>
                        </div>
                      )}
                </article>
              </div>

              {contextFactors.length > 0 && (
                <div className={styles.contextFactors}>
                  <p>Additional context</p>
                  <ul>
                    {contextFactors.map(({ factor }) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {!!career.career_themes?.length && (
            <section
              className={toolStyles.section}
              aria-labelledby="career-domains-heading"
            >
              <div className={toolStyles.sectionHeader}>
                <h2
                  id="career-domains-heading"
                  className={toolStyles.sectionTitle}
                >
                  Returned domain vocabulary
                </h2>
                <p className={toolStyles.sectionHint}>
                  {career.career_themes.length} alphabetical domains from the
                  10th house, its lord, occupants, and D10—not a ranking.
                </p>
              </div>
              <div className={styles.themePanel}>
                <ul className={styles.themeGrid}>
                  {career.career_themes.map((theme) => (
                    <li key={theme}>
                      <span aria-hidden="true" />
                      {formatTerm(theme)}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className={styles.readingBoundary}>
            <p className={styles.cardEyebrow}>Reading boundary</p>
            <h2>Career is larger than one divisional chart</h2>
            <p>
              Use these calculated anchors with the natal chart, active
              Dashas, lived experience, aptitude, opportunity, and practical
              constraints. The page does not produce a job-title prediction.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
