"use client";
import { SIGNS_ORDER, TABLE_STYLES } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

const { th } = TABLE_STYLES;

export function AshtakavargaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data         = chartOutput?.data as Record<string, unknown> | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown> | undefined;
  const lagna        = data?.lagna as Record<string, unknown> | undefined;
  const planets      = data?.planets as Record<string, Planet> | undefined;

  const sav = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga as Record<string, Record<string, number>> | undefined;

  const lagnaSign = lagna?.sign as SignName | undefined;

  if (!sav && !bav) {
    return <p className="text-xs text-muted-foreground italic">Ashtakavarga data not available.</p>;
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
          <p className="mt-2 text-[10px] text-muted-foreground/50">
            SAV Bindus per sign: ≥28 favorable · &lt;22 challenging
          </p>
        </section>
      )}

      {/* BAV per planet */}
      {bav && (
        <section>
          <SectionHeading>Bhinnashtakavarga (BAV) — per planet</SectionHeading>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className={th}>Planet</th>
                  {SIGNS_ORDER.map(s => (
                    <th key={s} className={`${th} text-center px-1.5`}>
                      {s.slice(0, 3)}
                    </th>
                  ))}
                  <th className={`${th} text-center`}>Σ</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bav).map(([planet, scores]) => {
                  const total = SIGNS_ORDER.reduce((acc, sign) => acc + (scores[sign] ?? 0), 0);
                  return (
                    <tr key={planet} className={TABLE_STYLES.row}>
                      <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-2)]">{planet}</td>
                      {SIGNS_ORDER.map(sign => {
                        const val = scores[sign] ?? 0;
                        return (
                          <td
                            key={sign}
                            className={`py-1.5 px-1.5 text-center font-mono ${
                              val >= 6 ? "text-success font-bold" : val <= 2 ? "text-danger" : "text-muted-foreground"
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-2 text-center font-bold text-[var(--color-ink-2)]">{total}</td>
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
