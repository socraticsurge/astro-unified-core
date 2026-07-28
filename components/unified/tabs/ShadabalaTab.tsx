"use client";

import { Activity } from "lucide-react";

import toolStyles from "@/components/profiles/ToolPage.module.css";
import {
  PLANET_ABBR,
  PLANET_ORDER,
} from "@/components/unified/types";
import type { ShadbalaPlanet } from "@/components/unified/types";
import styles from "./ShadabalaTab.module.css";

const SHADBALA_COMPONENTS = [
  {
    key: "sthana_bala",
    label: "Sthana",
    meaning: "Positional",
  },
  {
    key: "dig_bala",
    label: "Dig",
    meaning: "Directional",
  },
  {
    key: "kala_bala",
    label: "Kala",
    meaning: "Temporal",
  },
  {
    key: "chesta_bala",
    label: "Chesta",
    meaning: "Motional",
  },
  {
    key: "naisargika_bala",
    label: "Naisargika",
    meaning: "Natural",
  },
  {
    key: "drik_bala",
    label: "Drik",
    meaning: "Aspectual",
  },
] as const;

interface BhavaShift {
  rashi_house?: number;
  bhava_house?: number;
  shifted?: boolean;
}

function componentValue(
  shadbala: ShadbalaPlanet,
  key: (typeof SHADBALA_COMPONENTS)[number]["key"],
) {
  if (key === "sthana_bala") {
    return shadbala.sthana_bala?.total;
  }
  return shadbala[key];
}

function formatNumber(value?: number, digits = 2) {
  return value == null ? "—" : value.toFixed(digits);
}

function strengthRatio(shadbala: ShadbalaPlanet) {
  if (
    shadbala.total_rupas == null
    || shadbala.required_rupas == null
    || shadbala.required_rupas === 0
  ) {
    return undefined;
  }
  return shadbala.total_rupas / shadbala.required_rupas;
}

function meetsRequirement(shadbala: ShadbalaPlanet) {
  if (typeof shadbala.is_strong === "boolean") {
    return shadbala.is_strong;
  }
  if (
    shadbala.total_rupas == null
    || shadbala.required_rupas == null
  ) {
    return undefined;
  }
  return shadbala.total_rupas >= shadbala.required_rupas;
}

function strengthLabel(meets?: boolean) {
  if (meets === undefined) return "Threshold unavailable";
  return meets ? "Meets requirement" : "Below requirement";
}

function orderedShadbalaRows(shadbala: Record<string, ShadbalaPlanet>) {
  return PLANET_ORDER.flatMap((planet) => {
    const values = shadbala[planet];
    return values ? [{ planet, values }] : [];
  });
}

function orderedShifts(bhavaChalit?: Record<string, BhavaShift>) {
  if (!bhavaChalit) return [];
  return PLANET_ORDER.flatMap((planet) => {
    const shift = bhavaChalit[planet];
    return shift?.shifted ? [{ planet, shift }] : [];
  });
}

export function ShadabalaTab({
  chartOutput,
}: {
  chartOutput: Record<string, unknown>;
}) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const shadbala = data?.shadbala as
    | Record<string, ShadbalaPlanet>
    | undefined;
  const bhavaChalit = data?.bhava_chalit as
    | Record<string, BhavaShift>
    | undefined;

  if (!shadbala || Object.keys(shadbala).length === 0) {
    return (
      <p className={styles.empty}>
        Shadbala data not available.
      </p>
    );
  }

  const rows = orderedShadbalaRows(shadbala);
  const shifts = orderedShifts(bhavaChalit);

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <Activity size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>
              Six-fold planetary strength
            </p>
            <h2 className={toolStyles.leadTitle}>
              Compare strength before interpreting results
            </h2>
            <p className={toolStyles.leadText}>
              Shadbala measures a graha&apos;s capacity to deliver its
              results. Start with total Rupas against the traditional
              requirement, then inspect the six contributors and the separate
              Ishta–Kashta balance.
            </p>
          </div>
        </div>
        <span className={styles.sourcePill}>
          DashaFlow · Shadbala
        </span>
      </section>

      <section
        className={toolStyles.section}
        aria-labelledby="shadbala-standing-heading"
      >
        <div className={toolStyles.sectionHeader}>
          <h2
            id="shadbala-standing-heading"
            className={toolStyles.sectionTitle}
          >
            Strength against requirement
          </h2>
          <p className={toolStyles.sectionHint}>
            Total Rupas compared with each graha&apos;s own required Rupas.
          </p>
        </div>

        <div className={styles.desktopTable}>
          <div className={styles.tableFrame}>
            <table className={styles.strengthTable}>
              <caption className="sr-only">
                Planetary Shadbala strength compared with required Rupas
              </caption>
              <thead>
                <tr>
                  <th scope="col">Graha</th>
                  <th scope="col">Total Rupas</th>
                  <th scope="col">Required</th>
                  <th scope="col">Requirement reached</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ planet, values }) => {
                  const ratio = strengthRatio(values);
                  const meets = meetsRequirement(values);
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
                        <strong className={styles.rupaValue}>
                          {formatNumber(values.total_rupas)}
                        </strong>
                      </td>
                      <td>
                        <span className={styles.requiredValue}>
                          {formatNumber(values.required_rupas)}
                        </span>
                      </td>
                      <td>
                        <div
                          className={styles.requirementCell}
                          data-state={
                            meets === undefined
                              ? "unknown"
                              : meets
                                ? "met"
                                : "below"
                          }
                          aria-label={`${planet}: ${strengthLabel(meets)}${ratio == null ? "" : ` at ${Math.round(ratio * 100)} percent of required strength`}`}
                        >
                          <div className={styles.requirementLabel}>
                            <strong>{strengthLabel(meets)}</strong>
                            <span>
                              {ratio == null
                                ? "—"
                                : `${Math.round(ratio * 100)}%`}
                            </span>
                          </div>
                          <span className={styles.requirementTrack}>
                            <span
                              style={{
                                width: `${Math.min(
                                  (ratio ?? 0) * 100,
                                  100,
                                )}%`,
                              }}
                            />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.mobileList}>
          {rows.map(({ planet, values }) => {
            const ratio = strengthRatio(values);
            const meets = meetsRequirement(values);
            return (
              <article
                key={planet}
                className={styles.strengthCard}
                data-state={
                  meets === undefined
                    ? "unknown"
                    : meets
                      ? "met"
                      : "below"
                }
                aria-label={`${planet}: ${formatNumber(values.total_rupas)} total Rupas, ${formatNumber(values.required_rupas)} required, ${strengthLabel(meets)}`}
              >
                <div className={styles.cardHeading}>
                  <span className={styles.planetIdentity}>
                    <span
                      className={styles.planetMark}
                      aria-hidden="true"
                    >
                      {PLANET_ABBR[planet]}
                    </span>
                    <strong>{planet}</strong>
                  </span>
                  <span className={styles.mobileStatus}>
                    {strengthLabel(meets)}
                  </span>
                </div>
                <div className={styles.mobileRupas}>
                  <div>
                    <span>Total Rupas</span>
                    <strong>{formatNumber(values.total_rupas)}</strong>
                  </div>
                  <div>
                    <span>Required</span>
                    <strong>{formatNumber(values.required_rupas)}</strong>
                  </div>
                  <div>
                    <span>Reached</span>
                    <strong>
                      {ratio == null ? "—" : `${Math.round(ratio * 100)}%`}
                    </strong>
                  </div>
                </div>
                <span className={styles.requirementTrack}>
                  <span
                    style={{
                      width: `${Math.min((ratio ?? 0) * 100, 100)}%`,
                    }}
                  />
                </span>
              </article>
            );
          })}
        </div>

        <p className={styles.boundaryNote}>
          <strong>Strength is not beneficence.</strong> Reaching the required
          Rupas describes capacity, not whether a graha&apos;s eventual results
          are favourable. Placement, lordship, dignity, aspects, and timing
          still matter.
        </p>
      </section>

      <section
        className={toolStyles.section}
        aria-labelledby="shadbala-components-heading"
      >
        <div className={toolStyles.sectionHeader}>
          <h2
            id="shadbala-components-heading"
            className={toolStyles.sectionTitle}
          >
            Six sources of strength
          </h2>
          <p className={toolStyles.sectionHint}>
            Exact component values in Virupas; sixty Virupas equal one Rupa.
          </p>
        </div>

        <div className={styles.desktopTable}>
          <div className={styles.tableFrame}>
            <table className={styles.componentTable}>
              <caption className="sr-only">
                Six Shadbala component values in Virupas
              </caption>
              <thead>
                <tr>
                  <th scope="col">Graha</th>
                  {SHADBALA_COMPONENTS.map((component) => (
                    <th key={component.key} scope="col">
                      <strong>{component.label}</strong>
                      <span>{component.meaning}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ planet, values }) => (
                  <tr key={planet}>
                    <th scope="row">{planet}</th>
                    {SHADBALA_COMPONENTS.map((component) => (
                      <td key={component.key}>
                        {formatNumber(
                          componentValue(values, component.key),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.mobileList}>
          {rows.map(({ planet, values }) => (
            <article key={planet} className={styles.componentCard}>
              <h3>{planet}</h3>
              <dl>
                {SHADBALA_COMPONENTS.map((component) => (
                  <div key={component.key}>
                    <dt>
                      {component.label}
                      <span>{component.meaning}</span>
                    </dt>
                    <dd>
                      {formatNumber(
                        componentValue(values, component.key),
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section
        className={toolStyles.section}
        aria-labelledby="shadbala-phala-heading"
      >
        <div className={toolStyles.sectionHeader}>
          <h2
            id="shadbala-phala-heading"
            className={toolStyles.sectionTitle}
          >
            Ishta–Kashta balance
          </h2>
          <p className={toolStyles.sectionHint}>
            Separate engine-returned phala measures; not another strength
            threshold.
          </p>
        </div>

        <div className={styles.phalaPanel}>
          <div className={styles.phalaLegend} aria-hidden="true">
            <span data-kind="ishta">Ishta Phala</span>
            <span data-kind="kashta">Kashta Phala</span>
          </div>
          <div className={styles.phalaRows}>
            {rows.map(({ planet, values }) => (
              <article
                key={planet}
                className={styles.phalaRow}
                aria-label={`${planet}: Ishta Phala ${formatNumber(values.ishta_phala)}, Kashta Phala ${formatNumber(values.kashta_phala)}`}
              >
                <strong>{planet}</strong>
                <div className={styles.phalaMeasure}>
                  <span className={styles.phalaTrack} data-kind="ishta">
                    <span
                      style={{
                        width: `${Math.min(
                          ((values.ishta_phala ?? 0) / 60) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </span>
                  <span>{formatNumber(values.ishta_phala)}</span>
                </div>
                <div className={styles.phalaMeasure}>
                  <span className={styles.phalaTrack} data-kind="kashta">
                    <span
                      style={{
                        width: `${Math.min(
                          ((values.kashta_phala ?? 0) / 60) * 100,
                          100,
                        )}%`,
                      }}
                    />
                  </span>
                  <span>{formatNumber(values.kashta_phala)}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {shifts.length > 0 && (
        <section
          className={toolStyles.section}
          aria-labelledby="bhava-shifts-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2
              id="bhava-shifts-heading"
              className={toolStyles.sectionTitle}
            >
              House delivery context
            </h2>
            <p className={toolStyles.sectionHint}>
              Only planets whose Bhava Chalit house differs from their
              whole-sign Rasi house.
            </p>
          </div>
          <div className={styles.shiftPanel}>
            {shifts.map(({ planet, shift }) => (
              <div
                key={planet}
                className={styles.shiftRow}
                aria-label={`${planet}: Rasi house ${shift.rashi_house ?? "not returned"}, Bhava Chalit house ${shift.bhava_house ?? "not returned"}`}
              >
                <span className={styles.planetIdentity}>
                  <span
                    className={styles.planetMark}
                    aria-hidden="true"
                  >
                    {PLANET_ABBR[planet]}
                  </span>
                  <strong>{planet}</strong>
                </span>
                <span className={styles.houseMove}>
                  <span>
                    <small>Rasi</small>
                    <strong>
                      {shift.rashi_house == null
                        ? "—"
                        : `H${shift.rashi_house}`}
                    </strong>
                  </span>
                  <b aria-hidden="true">→</b>
                  <span>
                    <small>Bhava</small>
                    <strong>
                      {shift.bhava_house == null
                        ? "—"
                        : `H${shift.bhava_house}`}
                    </strong>
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className={styles.boundaryNote}>
            Bhava Chalit changes house context, not the Shadbala total shown
            above.
          </p>
        </section>
      )}
    </div>
  );
}
