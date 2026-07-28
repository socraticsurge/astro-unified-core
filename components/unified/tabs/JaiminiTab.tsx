"use client";

import { Network } from "lucide-react";

import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./JaiminiTab.module.css";

const KARAKA_ORDER = [
  "Atmakaraka",
  "Amatyakaraka",
  "Bhratrikaraka",
  "Matrikaraka",
  "Putrakaraka",
  "Gnatikaraka",
  "Darakaraka",
];

const KARAKA_ABBREVIATIONS: Record<string, string> = {
  Atmakaraka: "AK",
  Amatyakaraka: "Am",
  Bhratrikaraka: "Br",
  Matrikaraka: "Ma",
  Putrakaraka: "Pu",
  Gnatikaraka: "Gn",
  Darakaraka: "Da",
};

type KarakaEntry = {
  planet?: string;
  description?: string;
};

type ArudhaPada = {
  name?: string;
  sign?: string;
};

type Karakamsha = {
  atmakaraka?: string;
  karakamsha_sign?: string;
  karakamsha_house_from_lagna?: number;
  ishta_devata?: string;
  ishta_devata_sign?: string;
  ishta_devata_lord?: string;
  planets_in_karakamsha?: string[];
};

type Upapada = {
  sign?: string;
  lord?: string;
  second_from_ul?: string;
  description?: string;
};

function padaCode(key: string, pada: ArudhaPada) {
  if (pada.name?.includes("(AL)")) return "AL";
  if (pada.name?.includes("(UL)")) return "UL";
  return `A${key}`;
}

export function JaiminiTab({
  chartOutput,
}: {
  chartOutput: Record<string, unknown>;
}) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const jaiminiKarakas = data?.jaimini_karakas as
    | Record<string, KarakaEntry>
    | undefined;
  const karakamsha = data?.karakamsha as Karakamsha | undefined;
  const arudhaPadas = data?.arudha_padas as
    | Record<string, ArudhaPada>
    | undefined;
  const upapada = data?.upapada as Upapada | undefined;

  const orderedKarakas = KARAKA_ORDER.flatMap((name) => {
    const entry = jaiminiKarakas?.[name];
    return entry ? [{ name, ...entry }] : [];
  });
  const padas = arudhaPadas ? Object.entries(arudhaPadas) : [];
  const karakamshaOccupants = karakamsha?.planets_in_karakamsha ?? [];
  const ishtaValue =
    karakamsha?.ishta_devata ?? karakamsha?.ishta_devata_sign;
  const ishtaMeta = karakamsha?.ishta_devata_lord
    ? `Lord ${karakamsha.ishta_devata_lord}`
    : "Devata lord not returned";

  if (!jaiminiKarakas && !karakamsha && !arudhaPadas && !upapada) {
    return <p className={styles.empty}>Jaimini data not available.</p>;
  }

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <Network size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Jaimini framework</p>
            <h2 className={toolStyles.leadTitle}>
              Inner purpose and outward reflection
            </h2>
            <p className={toolStyles.leadText}>
              Begin with Atmakaraka and Karakamsha, then read the Chara
              Karakas, Arudha Padas, and Upapada as connected specialist
              indicators rather than standalone verdicts.
            </p>
          </div>
        </div>
        <span className={styles.sourcePill}>DashaFlow · Jaimini</span>
      </section>

      {karakamsha && (
        <section
          className={toolStyles.section}
          aria-labelledby="karakamsha-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2 id="karakamsha-heading" className={toolStyles.sectionTitle}>
              Atmakaraka &amp; Karakamsha
            </h2>
            <p className={toolStyles.sectionHint}>
              The calculated starting points for this Jaimini reading.
            </p>
          </div>

          <div className={styles.anchorGrid}>
            <article className={styles.anchorCard}>
              <span className={styles.anchorMark} aria-hidden="true">AK</span>
              <div>
                <p className={styles.anchorLabel}>Atmakaraka</p>
                <p className={styles.anchorValue}>
                  {karakamsha.atmakaraka ?? "Not returned"}
                </p>
                <p className={styles.anchorMeta}>Primary Chara Karaka</p>
              </div>
            </article>

            <article className={styles.anchorCard}>
              <span className={styles.anchorMark} aria-hidden="true">K</span>
              <div>
                <p className={styles.anchorLabel}>Karakamsha</p>
                <p className={styles.anchorValue}>
                  {karakamsha.karakamsha_sign ?? "Not returned"}
                </p>
                <p className={styles.anchorMeta}>
                  {karakamsha.karakamsha_house_from_lagna !== undefined
                    ? `House ${karakamsha.karakamsha_house_from_lagna} from Lagna`
                    : "House from Lagna not returned"}
                </p>
                {karakamshaOccupants.length > 0 && (
                  <ul
                    className={styles.anchorPlanets}
                    aria-label="Planets in Karakamsha"
                  >
                    {karakamshaOccupants.map((planet) => (
                      <li key={planet}>{planet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </article>

            <article className={styles.anchorCard}>
              <span className={styles.anchorMark} aria-hidden="true">ID</span>
              <div>
                <p className={styles.anchorLabel}>Ishta Devata</p>
                <p className={styles.anchorValue}>
                  {ishtaValue ?? "Not returned"}
                </p>
                <p className={styles.anchorMeta}>{ishtaMeta}</p>
              </div>
            </article>
          </div>
        </section>
      )}

      {orderedKarakas.length > 0 && (
        <section
          className={toolStyles.section}
          aria-labelledby="chara-karakas-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2
              id="chara-karakas-heading"
              className={toolStyles.sectionTitle}
            >
              Chara Karakas
            </h2>
            <p className={toolStyles.sectionHint}>
              Seven significators, kept in their traditional reading order.
            </p>
          </div>

          <div className={styles.desktopTable}>
            <div className={styles.tableFrame}>
              <table className={styles.dataTable}>
                <caption className="sr-only">Chara Karakas</caption>
                <thead>
                  <tr>
                    <th scope="col">Karaka</th>
                    <th scope="col">Planet</th>
                    <th scope="col">What it signifies</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedKarakas.map((karaka) => (
                    <tr key={karaka.name}>
                      <th scope="row">
                        <span className={styles.identity}>
                          <span className={styles.dataMark} aria-hidden="true">
                            {KARAKA_ABBREVIATIONS[karaka.name]}
                          </span>
                          <strong>{karaka.name}</strong>
                        </span>
                      </th>
                      <td>
                        <strong className={styles.primaryValue}>
                          {karaka.planet ?? "Not returned"}
                        </strong>
                      </td>
                      <td>
                        <span className={styles.secondaryValue}>
                          {karaka.description ?? "No description returned."}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {orderedKarakas.map((karaka) => (
              <article key={karaka.name} className={styles.dataCard}>
                <div className={styles.cardHeading}>
                  <span className={styles.dataMark} aria-hidden="true">
                    {KARAKA_ABBREVIATIONS[karaka.name]}
                  </span>
                  <div>
                    <h3>{karaka.name}</h3>
                    <p>{karaka.planet ?? "Not returned"}</p>
                  </div>
                </div>
                <p className={styles.cardDescription}>
                  {karaka.description ?? "No description returned."}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {padas.length > 0 && (
        <section
          className={toolStyles.section}
          aria-labelledby="arudha-padas-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2 id="arudha-padas-heading" className={toolStyles.sectionTitle}>
              Arudha Padas
            </h2>
            <p className={toolStyles.sectionHint}>
              The projected or outwardly encountered sign for each house.
            </p>
          </div>

          <div className={styles.desktopTable}>
            <div className={styles.tableFrame}>
              <table className={styles.dataTable}>
                <caption className="sr-only">Arudha Padas</caption>
                <thead>
                  <tr>
                    <th scope="col">Pada</th>
                    <th scope="col">Projected sign</th>
                  </tr>
                </thead>
                <tbody>
                  {padas.map(([key, pada]) => (
                    <tr key={key}>
                      <th scope="row">
                        <span className={styles.identity}>
                          <span className={styles.dataMark} aria-hidden="true">
                            {padaCode(key, pada)}
                          </span>
                          <strong>
                            {pada.name ?? `Arudha Pada ${key}`}
                          </strong>
                        </span>
                      </th>
                      <td>
                        <strong className={styles.primaryValue}>
                          {pada.sign ?? "Not returned"}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.mobileList}>
            {padas.map(([key, pada]) => (
              <article key={key} className={styles.padaCard}>
                <span className={styles.dataMark} aria-hidden="true">
                  {padaCode(key, pada)}
                </span>
                <div>
                  <h3>{pada.name ?? `Arudha Pada ${key}`}</h3>
                  <p>{pada.sign ?? "Not returned"}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {upapada && (
        <section
          className={toolStyles.section}
          aria-labelledby="upapada-heading"
        >
          <div className={toolStyles.sectionHeader}>
            <h2 id="upapada-heading" className={toolStyles.sectionTitle}>
              Upapada (A12)
            </h2>
            <p className={toolStyles.sectionHint}>
              A relationship indicator to read with the wider chart.
            </p>
          </div>

          <article className={styles.upapadaPanel}>
            <dl className={styles.contextGrid}>
              <div>
                <dt>Upapada sign</dt>
                <dd>{upapada.sign ?? "Not returned"}</dd>
              </div>
              <div>
                <dt>Lord</dt>
                <dd>{upapada.lord ?? "Not returned"}</dd>
              </div>
              <div>
                <dt>Second from UL</dt>
                <dd>{upapada.second_from_ul ?? "Not returned"}</dd>
              </div>
            </dl>
            {upapada.description && (
              <p className={styles.upapadaDescription}>
                {upapada.description}
              </p>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
