"use client";
import { useEffect } from "react";
import { Moon, RefreshCw, Telescope } from "lucide-react";
import {
  PLANET_ABBR,
  PLANET_ORDER,
  type Planet,
  type SignName,
} from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { TabLoadingSkeleton } from "@/components/unified/TabLoadingSkeleton";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./TransitsTab.module.css";

type TransitPlanet = {
  sign?: string;
  is_retrograde?: boolean;
  house_from_lagna?: number;
  house_from_moon?: number;
  sav_points?: number;
};

type SadeSati = {
  active?: boolean;
  phase?: string | null;
};

type RahuKetuAxis = {
  rahu_sign?: string;
  rahu_house_from_lagna?: number;
  ketu_sign?: string;
  ketu_house_from_lagna?: number;
};

function formatTransitDate(value?: string) {
  if (!value) return "Today";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function savBand(points?: number) {
  if (points === undefined) {
    return { label: "Not available", tone: "neutral" };
  }
  if (points >= 28) {
    return { label: "Higher support", tone: "higher" };
  }
  if (points < 22) {
    return { label: "Lower support", tone: "lower" };
  }
  return { label: "Middle range", tone: "middle" };
}

function titleCasePhase(value?: string | null) {
  if (!value) return "Current phase";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function TransitsTab({
  chartOutput,
  transitOutput,
  isTransitLoading,
  transitError,
  onFetchTransit,
}: {
  chartOutput: Record<string, unknown> | null;
  transitOutput: Record<string, unknown> | null;
  isTransitLoading: boolean;
  transitError?: string | null;
  onFetchTransit: (force?: boolean) => void;
}) {
  useEffect(() => {
    if (!transitOutput && !isTransitLoading) onFetchTransit();
  }, [transitOutput, isTransitLoading, onFetchTransit]);

  const transitEnvelope = transitOutput as Record<string, unknown> | null;
  const transit = (transitEnvelope?.data ?? transitOutput) as Record<string, unknown> | null;
  const transitDate = transitEnvelope?.transit_date as string | undefined;
  const chart = (chartOutput?.data ?? chartOutput) as Record<string, unknown> | undefined;

  const natalLagna = chart?.lagna as Record<string, unknown> | undefined;
  const natalLagnaSign = natalLagna?.sign as SignName | undefined;
  const natalAshtakavarga = chart?.ashtakavarga as Record<string, unknown> | undefined;
  const natalSav = natalAshtakavarga?.sarvashtakavarga as Record<string, number> | undefined;

  const transitPlanetsRaw = transit?.planets as Record<string, TransitPlanet> | undefined;
  const transitPlanets = PLANET_ORDER.flatMap(name => {
    const planet = transitPlanetsRaw?.[name];
    return planet ? [{ name, ...planet }] : [];
  });
  const sadeSati = transit?.sade_sati as SadeSati | undefined;
  const rahuKetu = transit?.rahu_ketu_axis as RahuKetuAxis | undefined;

  const transitPlanetsForChart: Record<string, Planet> | undefined = transitPlanetsRaw
    ? Object.fromEntries(
        Object.entries(transitPlanetsRaw).map(([name, p]) => [
          name,
          { sign: p.sign as SignName | undefined, is_retrograde: p.is_retrograde } as Planet,
        ]),
      )
    : undefined;

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}><Telescope size={19} aria-hidden="true" /></span>
          <div>
            <p className={toolStyles.leadEyebrow}>Current sky</p>
            <h2 className={toolStyles.leadTitle}>Today&apos;s planets over your natal chart</h2>
            <p className={toolStyles.leadText}>
              See where today&apos;s planets fall from the natal ascendant and
              Moon, with the profile&apos;s Sarvashtakavarga support beside each
              placement.
            </p>
          </div>
        </div>
        <div className={styles.leadTools}>
          <span className={styles.datePill}>{formatTransitDate(transitDate)}</span>
          <button
            type="button"
            onClick={() => onFetchTransit(true)}
            disabled={isTransitLoading}
            className={toolStyles.leadAction}
          >
            <RefreshCw
              size={14}
              className={isTransitLoading ? "animate-spin" : undefined}
              aria-hidden="true"
            />
            Refresh
          </button>
        </div>
      </section>

      {isTransitLoading && <TabLoadingSkeleton lines={4} cards={2} />}

      {!isTransitLoading && transitError && (
        <div className={toolStyles.helpCard} style={{ color: "var(--color-danger)" }}>
          <span>Couldn&apos;t load transits — {transitError}</span>
          <button type="button" onClick={() => onFetchTransit(true)} className={toolStyles.secondaryButton}>Retry</button>
        </div>
      )}

      {transit && (
        <>
          <section className={toolStyles.section}>
            <div className={toolStyles.sectionHeader}>
              <h3 className={toolStyles.sectionTitle}>Current context</h3>
              <p className={toolStyles.sectionHint}>
                The Moon changes the immediate tone; Saturn and Jupiter describe
                the slower backdrop.
              </p>
            </div>
            <div className={styles.contextGrid}>
              <article className={styles.contextCard}>
                <p className={styles.contextLabel}>
                  <span>Moon today</span>
                  <Moon size={13} aria-hidden="true" />
                </p>
                <strong className={styles.contextValue}>
                  {transitPlanetsRaw?.Moon?.sign ?? "Unavailable"}
                </strong>
                <p className={styles.contextMeta}>
                  {transitPlanetsRaw?.Moon?.house_from_lagna
                    ? `House ${transitPlanetsRaw.Moon.house_from_lagna} from Lagna`
                    : "House from Lagna unavailable"}
                </p>
              </article>
              <article className={styles.contextCard}>
                <p className={styles.contextLabel}>Saturn</p>
                <strong className={styles.contextValue}>
                  {transitPlanetsRaw?.Saturn?.sign ?? "Unavailable"}
                </strong>
                <p className={styles.contextMeta}>
                  {transitPlanetsRaw?.Saturn?.is_retrograde
                    ? "Retrograde · long-cycle context"
                    : "Long-cycle context"}
                </p>
              </article>
              <article className={styles.contextCard}>
                <p className={styles.contextLabel}>Jupiter</p>
                <strong className={styles.contextValue}>
                  {transitPlanetsRaw?.Jupiter?.sign ?? "Unavailable"}
                </strong>
                <p className={styles.contextMeta}>
                  {transitPlanetsRaw?.Jupiter?.is_retrograde
                    ? "Retrograde · slower backdrop"
                    : "Slower backdrop"}
                </p>
              </article>
              <article
                className={styles.contextCard}
                aria-label={`Sade Sati status: ${sadeSati?.active ? "active" : "not active"}`}
              >
                <p className={styles.contextLabel}>Sade Sati</p>
                <strong className={styles.contextValue}>
                  {sadeSati?.active ? "Active" : "Not active"}
                </strong>
                <p className={styles.contextMeta}>
                  {sadeSati?.active
                    ? titleCasePhase(sadeSati.phase)
                    : "Based on Saturn from the natal Moon"}
                </p>
              </article>
            </div>

            {rahuKetu && (
              <div className={styles.axisStrip} aria-label="Rahu Ketu transit axis">
                <span className={styles.axisLabel}>Nodal axis</span>
                <span>
                  <strong>Rahu</strong> {rahuKetu.rahu_sign ?? "—"}
                  {rahuKetu.rahu_house_from_lagna ? ` · H${rahuKetu.rahu_house_from_lagna}` : ""}
                </span>
                <span className={styles.axisLine} aria-hidden="true" />
                <span>
                  <strong>Ketu</strong> {rahuKetu.ketu_sign ?? "—"}
                  {rahuKetu.ketu_house_from_lagna ? ` · H${rahuKetu.ketu_house_from_lagna}` : ""}
                </span>
              </div>
            )}
          </section>

          <section className={toolStyles.section}>
            <div className={toolStyles.sectionHeader}>
              <h3 className={toolStyles.sectionTitle}>Every planet, one scan</h3>
              <p className={toolStyles.sectionHint}>
                Position, house context and natal SAV support for the sign being
                transited.
              </p>
            </div>
            {transitPlanets.length > 0 ? (
              <div className={styles.planetGrid} aria-label="Transit planet positions and SAV points">
                {transitPlanets.map(planet => {
                  const band = savBand(planet.sav_points);
                  return (
                    <article key={planet.name} className={styles.planetCard}>
                      <div className={styles.planetHeading}>
                        <span className={styles.planetMark}>
                          {PLANET_ABBR[planet.name] ?? planet.name.slice(0, 2)}
                        </span>
                        <div className={styles.planetIdentity}>
                          <strong>{planet.name}</strong>
                          <span>
                            {planet.sign ?? "Sign unavailable"}
                            {planet.is_retrograde ? " · Retrograde" : ""}
                          </span>
                        </div>
                        <div
                          className={styles.savMetric}
                          data-tone={band.tone}
                          aria-label={`${planet.name} SAV support: ${planet.sav_points ?? "not available"} points, ${band.label}`}
                        >
                          <span>SAV</span>
                          <strong>{planet.sav_points ?? "—"}</strong>
                          <small>{band.label}</small>
                        </div>
                      </div>
                      <dl className={styles.houseGrid}>
                        <div>
                          <dt>From Lagna</dt>
                          <dd>{planet.house_from_lagna ? `House ${planet.house_from_lagna}` : "—"}</dd>
                        </div>
                        <div>
                          <dt>From Moon</dt>
                          <dd>{planet.house_from_moon ? `House ${planet.house_from_moon}` : "—"}</dd>
                        </div>
                      </dl>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState} role="status">
                Planet positions were not returned for this transit date.
              </div>
            )}
            <p className={styles.pointsNote}>
              <strong>Reading SAV points:</strong> 28 or more is shown as higher
              support, 22–27 as the middle range, and below 22 as lower support.
              This is natal sign support context—not a complete prediction or a
              score for the planet itself.
            </p>
          </section>

          {transitPlanetsForChart && (
            <section className={toolStyles.section}>
              <div className={toolStyles.sectionHeader}>
                <h3 className={toolStyles.sectionTitle}>Transit chart</h3>
                <p className={toolStyles.sectionHint}>Today&apos;s planets placed on your natal SAV support lattice.</p>
              </div>
              <div className={toolStyles.chartCard}>
              <NatalChartGrid
                planets={transitPlanetsForChart}
                lagnaSign={natalLagnaSign}
                signKey="sign"
                label="Today — transit on natal SAV lattice"
                savScores={natalSav}
              />
              </div>
              <p className={toolStyles.sectionHint} style={{ textAlign: "left" }}>
                Bindus shown per sign are from the natal Sarvashtakavarga.
                Transit placements move with the sky; the natal bindu lattice
                remains fixed for this profile.
              </p>
            </section>
          )}

          <section className={toolStyles.helpCard}>
            <h3 className={toolStyles.helpTitle}>How to use this page</h3>
            <p className={toolStyles.helpText}>
              Begin with the Moon for the immediate day. Then compare Saturn and
              Jupiter for the longer backdrop, using each planet&apos;s houses
              from Lagna and Moon before considering its SAV support. No single
              transit indicator should be read in isolation.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
