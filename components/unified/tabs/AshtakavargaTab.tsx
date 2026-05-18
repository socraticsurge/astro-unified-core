"use client";
import { SIGNS_ORDER, TABLE_STYLES } from "@/components/unified/types";
import type { SignName } from "@/components/unified/types";
import { SavChartGrid } from "@/components/unified/SavChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

const th = TABLE_STYLES.th;

export function AshtakavargaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data         = chartOutput?.data as Record<string, unknown> | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown> | undefined;
  const lagna        = data?.lagna as Record<string, unknown> | undefined;

  const sav = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga as Record<string, Record<string, number>> | undefined;

  const lagnaSign = lagna?.sign as SignName | undefined;

  if (!sav && !bav) {
    return <p className="text-xs text-muted-foreground italic">Ashtakavarga data not available.</p>;
  }

  return (
    <div className="space-y-8">

      {/* SAV chart */}
      {sav && (
        <section>
          <SectionHeading>Sarvashtakavarga (SAV)</SectionHeading>
          <SavChartGrid sav={sav} lagnaSign={lagnaSign} />
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
                    <th key={s} className="py-1.5 px-1.5 text-center text-xs font-medium text-muted-foreground">
                      {s.slice(0, 3)}
                    </th>
                  ))}
                  <th className="py-1.5 px-2 text-center text-xs font-medium text-muted-foreground">Σ</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(bav).map(([planet, scores]) => {
                  const total = SIGNS_ORDER.reduce((acc, sign) => acc + (scores[sign] ?? 0), 0);
                  return (
                    <tr key={planet} className="border-b border-[var(--color-border)]/40">
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
