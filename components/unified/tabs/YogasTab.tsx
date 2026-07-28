"use client";
import { ArrowRight, ShieldAlert, Star } from "lucide-react";
import styles from "./YogasTab.module.css";

const MAJOR_YOGAS = new Set([
  "Malavya Yoga", "Shasha Yoga", "Bhadra Yoga", "Hamsa Yoga", "Ruchaka Yoga",
  "Gajakesari Yoga", "Raj Yoga", "Lakshmi Yoga", "Adhi Yoga",
]);

type Yoga        = { name: string; formed_by?: string[]; description?: string };
type GrahaYuddha = { winner?: string; loser?: string; description?: string };
type Gandanta    = { planet?: string; sign?: string; degree?: number; nakshatra?: string; description?: string };

function YogaCard({ yoga, major }: { yoga: Yoga; major: boolean }) {
  return (
    <article className={styles.yogaCard} data-major={major}>
      <div className={styles.yogaTitle}>
        <h4>{yoga.name}</h4>
        {major && <span className={styles.majorBadge}>Major yoga</span>}
      </div>

      {yoga.formed_by && yoga.formed_by.length > 0 && (
        <div className={styles.formedBy}>
          <span>Formed by</span>
          <ul aria-label={`${yoga.name} forming planets`}>
            {yoga.formed_by.map((planet) => (
              <li key={planet}>{planet}</li>
            ))}
          </ul>
        </div>
      )}

      {yoga.description && <p>{yoga.description}</p>}
    </article>
  );
}

export function YogasTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const yogas       = (data?.yogas       as Yoga[]        | undefined) ?? [];
  const kaalSarpa   = data?.kaal_sarpa   as { type?: string; direction?: string; description?: string } | undefined;
  const grahaYuddha = (data?.graha_yuddha as GrahaYuddha[] | undefined) ?? [];
  const gandanta    = (data?.gandanta    as Gandanta[]     | undefined) ?? [];

  const hasDoshas = !!kaalSarpa || grahaYuddha.length > 0 || gandanta.length > 0;
  const majorYogas = yogas.filter((yoga) => MAJOR_YOGAS.has(yoga.name));
  const otherYogas = yogas.filter((yoga) => !MAJOR_YOGAS.has(yoga.name));
  const conditionCount =
    (kaalSarpa ? 1 : 0) + grahaYuddha.length + gandanta.length;

  if (yogas.length === 0 && !hasDoshas) {
    return (
      <p className={styles.empty}>
        Yoga and dosha data not available.
      </p>
    );
  }

  return (
    <div className={styles.root}>
      <section className={styles.intro}>
        <span className={styles.introIcon}><Star size={18} aria-hidden="true" /></span>
        <div>
          <p className={styles.eyebrow}>Chart combinations</p>
          <h2>See the patterns formed by planets working together.</h2>
          <p>
            Begin with the major combinations, then read the supporting
            patterns and conditions that require wider chart context.
          </p>
        </div>
        <dl className={styles.summary}>
          <div>
            <dt>Detected</dt>
            <dd>{yogas.length}</dd>
          </div>
          <div>
            <dt>Major</dt>
            <dd>{majorYogas.length}</dd>
          </div>
          <div>
            <dt>Conditions</dt>
            <dd>{conditionCount}</dd>
          </div>
        </dl>
      </section>

      <div className={styles.content}>
        {majorYogas.length > 0 && (
          <section aria-labelledby="major-yogas-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Begin here</p>
                <h3 id="major-yogas-heading">Major yogas</h3>
              </div>
              <p>
                {majorYogas.length} prominent{" "}
                {majorYogas.length === 1 ? "combination" : "combinations"}
              </p>
            </div>
            <div className={styles.yogaGrid}>
              {majorYogas.map((yoga, index) => (
                <YogaCard
                  key={`${yoga.name}-${index}`}
                  yoga={yoga}
                  major
                />
              ))}
            </div>
          </section>
        )}

        {otherYogas.length > 0 && (
          <section aria-labelledby="supporting-yogas-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Complete pattern set</p>
                <h3 id="supporting-yogas-heading">Other chart combinations</h3>
              </div>
              <p>
                {otherYogas.length} additional{" "}
                {otherYogas.length === 1 ? "pattern" : "patterns"}
              </p>
            </div>
            <div className={styles.yogaGrid}>
              {otherYogas.map((yoga, index) => (
                <YogaCard
                  key={`${yoga.name}-${index}`}
                  yoga={yoga}
                  major={false}
                />
              ))}
            </div>
          </section>
        )}

        {hasDoshas && (
          <section aria-labelledby="chart-conditions-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Read with context</p>
                <h3 id="chart-conditions-heading">
                  Doshas and junction conditions
                </h3>
              </div>
              <p>Presence is not a standalone prediction.</p>
            </div>

            <div className={styles.contextNote}>
              <ShieldAlert size={17} aria-hidden="true" />
              <p>
                These conditions need dignity, aspects, house ownership,
                cancellation rules, and the rest of the chart before drawing
                a conclusion.
              </p>
            </div>

            <div className={styles.conditionGrid}>
              {kaalSarpa && (
                <article
                  className={styles.conditionCard}
                  data-tone="danger"
                  aria-label="Kaal Sarpa"
                >
                  <div>
                    <span className={styles.conditionIcon}>
                      <ShieldAlert size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p className={styles.conditionType}>Dosha</p>
                      <h4>Kaal Sarpa</h4>
                    </div>
                  </div>
                  <p className={styles.conditionResult}>
                    {[kaalSarpa.type, kaalSarpa.direction]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {kaalSarpa.description && <p>{kaalSarpa.description}</p>}
                </article>
              )}

              {grahaYuddha.length > 0 && (
                <article
                  className={styles.conditionCard}
                  data-tone="warning"
                  aria-label="Graha Yuddha"
                >
                  <div>
                    <span className={styles.conditionIcon}>
                      <ShieldAlert size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p className={styles.conditionType}>Planetary condition</p>
                      <h4>
                        Graha Yuddha{" "}
                        <small>{grahaYuddha.length}</small>
                      </h4>
                    </div>
                  </div>
                  <ul className={styles.conditionList}>
                    {grahaYuddha.map((war, index) => (
                      <li key={`${war.winner}-${war.loser}-${index}`}>
                        <p className={styles.warResult}>
                          <strong>{war.winner ?? "Winner unavailable"}</strong>
                          <ArrowRight size={13} aria-hidden="true" />
                          <span>{war.loser ?? "Loser unavailable"}</span>
                        </p>
                        {war.description && <p>{war.description}</p>}
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              {gandanta.length > 0 && (
                <article
                  className={styles.conditionCard}
                  data-tone="accent"
                  aria-label="Gandanta"
                >
                  <div>
                    <span className={styles.conditionIcon}>
                      <Star size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <p className={styles.conditionType}>Junction condition</p>
                      <h4>
                        Gandanta <small>{gandanta.length}</small>
                      </h4>
                    </div>
                  </div>
                  <ul className={styles.conditionList}>
                    {gandanta.map((junction, index) => (
                      <li
                        key={`${junction.planet}-${junction.sign}-${junction.degree}-${index}`}
                      >
                        <p className={styles.junctionResult}>
                          <strong>{junction.planet ?? "Planet unavailable"}</strong>
                          <span>
                            {[junction.sign, junction.degree !== undefined
                              ? `${junction.degree.toFixed(2)}°`
                              : undefined, junction.nakshatra]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </p>
                        {junction.description && <p>{junction.description}</p>}
                      </li>
                    ))}
                  </ul>
                </article>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
