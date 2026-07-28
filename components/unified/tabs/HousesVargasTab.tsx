"use client";
import { PLANET_ORDER } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { Grid2X2 } from "lucide-react";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./HousesVargasTab.module.css";

const DIVISIONAL_CHARTS: {
  code: string;
  name: string;
  label: string;
  purpose: string;
  signKey: keyof Planet;
  lagnaKey: string;
}[] = [
  { code: "D2", name: "Hora", label: "D2 — Hora", purpose: "Resources, wealth, and material stewardship", signKey: "d2_sign", lagnaKey: "d2_sign" },
  { code: "D3", name: "Drekkana", label: "D3 — Drekkana", purpose: "Courage, initiative, and sibling relationships", signKey: "d3_sign", lagnaKey: "d3_sign" },
  { code: "D4", name: "Chaturthamsha", label: "D4 — Chaturthamsha", purpose: "Home, property, settled fortune, and foundations", signKey: "d4_sign", lagnaKey: "d4_sign" },
  { code: "D7", name: "Saptamsha", label: "D7 — Saptamsha", purpose: "Children, continuity, and creative legacy", signKey: "d7_sign", lagnaKey: "d7_sign" },
  { code: "D12", name: "Dvadashamsha", label: "D12 — Dvadashamsha", purpose: "Parents, ancestry, and inherited patterns", signKey: "d12_sign", lagnaKey: "d12_sign" },
  { code: "D16", name: "Shodashamsha", label: "D16 — Shodashamsha", purpose: "Comforts, vehicles, and lived ease", signKey: "d16_sign", lagnaKey: "d16_sign" },
  { code: "D20", name: "Vimshamsha", label: "D20 — Vimshamsha", purpose: "Spiritual practice, devotion, and inner discipline", signKey: "d20_sign", lagnaKey: "d20_sign" },
  { code: "D24", name: "Chaturvimshamsha", label: "D24 — Chaturvimshamsha", purpose: "Learning, education, and mastery of knowledge", signKey: "d24_sign", lagnaKey: "d24_sign" },
  { code: "D27", name: "Nakshatramsha", label: "D27 — Nakshatramsha", purpose: "Strengths, vulnerabilities, and resilience", signKey: "d27_sign", lagnaKey: "d27_sign" },
  { code: "D30", name: "Trimshamsha", label: "D30 — Trimshamsha", purpose: "Adversity, difficult patterns, and recovery", signKey: "d30_sign", lagnaKey: "d30_sign" },
  { code: "D40", name: "Khavedamsha", label: "D40 — Khavedamsha", purpose: "Maternal lineage and subtle auspicious influences", signKey: "d40_sign", lagnaKey: "d40_sign" },
  { code: "D60", name: "Shashtiamsha", label: "D60 — Shashtiamsha", purpose: "Deep karmic patterns; highly birth-time sensitive", signKey: "d60_sign", lagnaKey: "d60_sign" },
];

export function HousesVargasTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data    = chartOutput?.data as Record<string, unknown> | undefined;
  const planets = data?.planets     as Record<string, Planet>  | undefined;
  const lagna   = data?.lagna as Record<string, unknown> | undefined;
  const availableCharts = planets
    ? DIVISIONAL_CHARTS.filter(({ signKey }) =>
        PLANET_ORDER.some(name => planets[name]?.[signKey])
      )
    : [];

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <Grid2X2 size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Specialist chart lenses</p>
            <h2 className={toolStyles.leadTitle}>Read one life area at a time through the Vargas</h2>
            <p className={toolStyles.leadText}>
              Each divisional chart refines one dimension of the natal promise.
              Read it with the D1 chart—not as an isolated verdict.
            </p>
          </div>
        </div>
        <span className={styles.sourcePill}>
          DashaFlow · {availableCharts.length} Vargas
        </span>
      </section>

      {availableCharts.length > 0 && planets ? (
        <section className={toolStyles.section} aria-labelledby="varga-library-title">
          <div className={toolStyles.sectionHeader}>
            <h2 id="varga-library-title" className={toolStyles.sectionTitle}>
              Divisional chart library
            </h2>
            <p className={toolStyles.sectionHint}>
              Traditional life-area lenses, in divisional order.
            </p>
          </div>
          <div className={styles.libraryContext}>
            <p className={styles.navamshaNote}>
              D9 Navamsha remains beside D1 in the Natal Chart tab.
            </p>
            <div className={styles.legend} aria-label="Divisional chart key">
              <span><b data-kind="lagna">Lg</b> Ascendant</span>
              <span><b data-kind="retrograde">r</b> Retrograde</span>
            </div>
          </div>
          <div className={styles.vargaGrid}>
              {availableCharts.map(({ code, name, label, purpose, signKey, lagnaKey }) => {
                const divLagnaSign = lagna?.[lagnaKey] as SignName | undefined;
                const titleId = `varga-${code.toLowerCase()}-title`;
                return (
                  <article key={label} className={styles.vargaCard} aria-labelledby={titleId}>
                    <header className={styles.vargaHeader}>
                      <div>
                        <p>{code}</p>
                        <h3 id={titleId}>{name}</h3>
                      </div>
                      <p className={styles.vargaPurpose}>{purpose}</p>
                    </header>
                  <NatalChartGrid
                    planets={planets}
                    lagnaSign={divLagnaSign}
                    signKey={signKey}
                    label={label}
                    showLegend={false}
                  />
                  </article>
                );
              })}
          </div>
        </section>
      ) : (
        <section className={styles.emptyState} role="status">
          <h2>Divisional charts are unavailable</h2>
          <p>
            The current chart response did not include Varga placements. Return
            to Natal Chart and retry the calculation before using this section.
          </p>
        </section>
      )}
    </div>
  );
}
