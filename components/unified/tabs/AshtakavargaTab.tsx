"use client";
import { SIGNS_ORDER } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

export function AshtakavargaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data         = chartOutput?.data as Record<string, unknown> | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown> | undefined;
  const lagna        = data?.lagna as Record<string, unknown> | undefined;
  const planets      = data?.planets as Record<string, Planet> | undefined;

  const sav = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga as Record<string, Record<string, number>> | undefined;

  const lagnaSign = lagna?.sign as SignName | undefined;

  if (!sav && !bav) {
    return <p style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-3)" }}>Ashtakavarga data not available.</p>;
  }

  return (
    <div className="space-y-8">

      {/* D1 chart with SAV bindus per sign */}
      {planets && sav && (
        <section>
          <SectionHeading>D1 — Occupants &amp; SAV Bindus</SectionHeading>
          <NatalChartGrid
            planets={planets}
            lagnaSign={lagnaSign}
            signKey="sign"
            label="D1 — Rasi"
            savScores={sav}
          />
          <p style={{ marginTop: 6, fontSize: 10, color: "var(--color-ink-4)" }}>
            SAV Bindus per sign: ≥28 favorable · &lt;22 challenging
          </p>
        </section>
      )}

      {/* BAV per planet */}
      {bav && (
        <section>
          <SectionHeading>Bhinnashtakavarga (BAV) — per planet</SectionHeading>
          <div className="ac-card overflow-x-auto">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>Planet</th>
                  {SIGNS_ORDER.map(s => (
                    <th key={s} className="right" style={{ minWidth: 26 }}>{s.slice(0, 3)}</th>
                  ))}
                  <th className="right">Σ</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bav).map(([planet, scores]) => {
                  const total = SIGNS_ORDER.reduce((acc, sign) => acc + (scores[sign] ?? 0), 0);
                  return (
                    <tr key={planet}>
                      <td className="planet">{planet}</td>
                      {SIGNS_ORDER.map(sign => {
                        const val = scores[sign] ?? 0;
                        const cls = val >= 6 ? "ac-cell-good" : val <= 2 ? "ac-cell-bad" : "";
                        return (
                          <td key={sign} className={`num right ${cls}`}>{val}</td>
                        );
                      })}
                      <td className="num right" style={{ fontWeight: 700 }}>{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
