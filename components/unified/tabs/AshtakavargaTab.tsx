"use client";

import { ChartNoAxesColumnIncreasing } from "lucide-react";

import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SIGNS_ORDER } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./AshtakavargaTab.module.css";

const HOUSE_LENSES: Record<number, string> = {
  1: "Self & vitality",
  2: "Family, speech & resources",
  3: "Courage, skills & siblings",
  4: "Home, mother & inner peace",
  5: "Learning, children & creativity",
  6: "Health, service & obstacles",
  7: "Partnerships & agreements",
  8: "Transformation & shared matters",
  9: "Dharma, teachers & fortune",
  10: "Career, status & public action",
  11: "Gains, networks & aspirations",
  12: "Retreat, expenses & liberation",
};

function savBand(points?: number) {
  if (points === undefined) {
    return { label: "Not returned", tone: "unknown" };
  }
  if (points >= 28) {
    return { label: "Higher support", tone: "higher" };
  }
  if (points < 22) {
    return { label: "Lower support", tone: "lower" };
  }
  return { label: "Middle range", tone: "middle" };
}

function houseForSign(sign: SignName, lagnaSign?: SignName) {
  if (!lagnaSign) return undefined;
  const lagnaIndex = SIGNS_ORDER.indexOf(lagnaSign);
  const signIndex = SIGNS_ORDER.indexOf(sign);
  return ((signIndex - lagnaIndex + 12) % 12) + 1;
}

export function AshtakavargaTab({
  chartOutput,
}: {
  chartOutput: Record<string, unknown>;
}) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const ashtakavarga = data?.ashtakavarga as
    | Record<string, unknown>
    | undefined;
  const lagna = data?.lagna as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, Planet> | undefined;

  const sav = ashtakavarga?.sarvashtakavarga as
    | Record<string, number>
    | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga as
    | Record<string, Record<string, number>>
    | undefined;
  const lagnaSign = lagna?.sign as SignName | undefined;

  if (!sav && !bav) {
    return <p className={styles.empty}>Ashtakavarga data not available.</p>;
  }

  const houseRows = sav
    ? SIGNS_ORDER.map((sign) => ({
        sign,
        house: houseForSign(sign, lagnaSign),
        points: sav[sign],
      })).sort((a, b) => (a.house ?? 99) - (b.house ?? 99))
    : [];

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <ChartNoAxesColumnIncreasing size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Bindu strength map</p>
            <h2 className={toolStyles.leadTitle}>
              See where the natal chart carries more support
            </h2>
            <p className={toolStyles.leadText}>
              Start with Sarvashtakavarga across the twelve houses. Then use
              the natal chart for placement context and Bhinnashtakavarga to
              inspect the planetary contributions behind each total.
            </p>
          </div>
        </div>
        <span className={styles.sourcePill}>DashaFlow · SAV &amp; BAV</span>
      </section>

      {houseRows.length > 0 && (
        <section
          className={toolStyles.section}
          aria-labelledby="sav-house-map-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2 id="sav-house-map-heading" className={toolStyles.sectionTitle}>
              House support map
            </h2>
            <p className={toolStyles.sectionHint}>
              SAV bindus paired with each house&apos;s traditional life-area
              lens.
            </p>
          </div>

          <div className={styles.desktopTable}>
            <div className={styles.tableFrame}>
              <table className={styles.houseTable}>
                <caption className="sr-only">
                  Sarvashtakavarga house support
                </caption>
                <thead>
                  <tr>
                    <th scope="col">House</th>
                    <th scope="col">Traditional lens</th>
                    <th scope="col">Sign</th>
                    <th scope="col">SAV support</th>
                  </tr>
                </thead>
                <tbody>
                  {houseRows.map(({ sign, house, points }) => {
                    const band = savBand(points);
                    return (
                      <tr key={sign}>
                        <th scope="row">
                          <span className={styles.houseMark}>
                            {house ? `H${house}` : "—"}
                          </span>
                        </th>
                        <td>
                          <strong className={styles.lifeArea}>
                            {house
                              ? HOUSE_LENSES[house]
                              : "House unavailable"}
                          </strong>
                        </td>
                        <td>
                          <strong className={styles.signValue}>{sign}</strong>
                        </td>
                        <td>
                          <div
                            className={styles.scoreCell}
                            data-tone={band.tone}
                            aria-label={`${house ? `House ${house}, ${HOUSE_LENSES[house]}` : sign}: ${points ?? "not returned"} SAV bindus, ${band.label}`}
                          >
                            <strong>{points ?? "—"}</strong>
                            <div>
                              <span>{band.label}</span>
                              <span className={styles.scoreTrack}>
                                <span
                                  style={{
                                    width: `${Math.min(
                                      ((points ?? 0) / 56) * 100,
                                      100,
                                    )}%`,
                                  }}
                                />
                              </span>
                            </div>
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
            {houseRows.map(({ sign, house, points }) => {
              const band = savBand(points);
              return (
                <article
                  key={sign}
                  className={styles.houseCard}
                  data-tone={band.tone}
                  aria-label={`${house ? `House ${house}, ${HOUSE_LENSES[house]}` : sign}: ${points ?? "not returned"} SAV bindus, ${band.label}`}
                >
                  <span className={styles.houseMark}>
                    {house ? `H${house}` : "—"}
                  </span>
                  <div className={styles.houseCardText}>
                    <h3>
                      {house ? HOUSE_LENSES[house] : "House unavailable"}
                    </h3>
                    <p>{sign}</p>
                  </div>
                  <div className={styles.mobileScore}>
                    <strong>{points ?? "—"}</strong>
                    <span>{band.label}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <p className={styles.pointsNote}>
            <strong>Reading SAV points:</strong> 28 or more is shown as higher
            support, 22–27 as the middle range, and below 22 as lower support.
            This is comparison context—not a complete prediction for a house.
          </p>
        </section>
      )}

      {planets && sav && (
        <section
          className={toolStyles.section}
          aria-labelledby="sav-chart-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2 id="sav-chart-heading" className={toolStyles.sectionTitle}>
              Natal chart context
            </h2>
            <p className={toolStyles.sectionHint}>
              D1 occupants placed on the same fixed SAV lattice.
            </p>
          </div>
          <div className={toolStyles.chartCard}>
            <NatalChartGrid
              planets={planets}
              lagnaSign={lagnaSign}
              signKey="sign"
              label="D1 — Rasi with SAV"
              savScores={sav}
            />
          </div>
        </section>
      )}

      {bav && (
        <section
          className={toolStyles.section}
          aria-labelledby="bav-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2 id="bav-heading" className={toolStyles.sectionTitle}>
              Bhinnashtakavarga contributions
            </h2>
            <p className={toolStyles.sectionHint}>
              Exact per-planet bindus behind the combined SAV picture.
            </p>
          </div>
          <div className={styles.matrixFrame}>
            <table className={styles.bavTable}>
              <caption className="sr-only">
                Bhinnashtakavarga contributions
              </caption>
              <thead>
                <tr>
                  <th scope="col">Planet</th>
                  {SIGNS_ORDER.map((sign) => (
                    <th key={sign} scope="col" title={sign}>
                      {sign.slice(0, 3)}
                    </th>
                  ))}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bav).map(([planet, scores]) => {
                  const total = SIGNS_ORDER.reduce(
                    (sum, sign) => sum + (scores[sign] ?? 0),
                    0,
                  );
                  return (
                    <tr key={planet}>
                      <th scope="row">{planet}</th>
                      {SIGNS_ORDER.map((sign) => {
                        const value = scores[sign] ?? 0;
                        const tone =
                          value >= 6 ? "higher" : value <= 2 ? "lower" : "middle";
                        return (
                          <td
                            key={sign}
                            data-tone={tone}
                            aria-label={`${planet} in ${sign}: ${value} bindus`}
                          >
                            {value}
                          </td>
                        );
                      })}
                      <td className={styles.totalCell}>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.matrixNote}>
            Each number is preserved from the calculated BAV response. Cell
            shading helps scanning; the printed value remains authoritative.
          </p>
        </section>
      )}
    </div>
  );
}
