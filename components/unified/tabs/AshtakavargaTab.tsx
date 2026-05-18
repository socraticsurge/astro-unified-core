"use client";
import { SIGNS_ORDER, PLANET_ORDER, TABLE_STYLES } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { SavChartGrid } from "@/components/unified/SavChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

const { th, td } = TABLE_STYLES;

function houseToSign(lagnaSign: string, house: number): string | undefined {
  const idx = SIGNS_ORDER.indexOf(lagnaSign as (typeof SIGNS_ORDER)[number]);
  if (idx < 0) return undefined;
  return SIGNS_ORDER[(idx + house - 1) % 12];
}

export function AshtakavargaTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data         = chartOutput?.data as Record<string, unknown> | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown> | undefined;
  const lagna        = data?.lagna as Record<string, unknown> | undefined;
  const planets      = data?.planets as Record<string, Planet> | undefined;

  const sav = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;
  const bav = ashtakavarga?.bhinnashtakavarga as Record<string, Record<string, number>> | undefined;

  const lagnaSign = lagna?.sign as SignName | undefined;

  const houseMap: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) houseMap[i] = [];
  if (planets) {
    PLANET_ORDER.forEach(name => {
      const h = planets[name]?.house;
      if (h != null && h >= 1 && h <= 12) houseMap[h].push(name);
    });
  }

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

      {/* Houses — Occupants & SAV */}
      {(planets || sav) && (
        <section>
          <SectionHeading>Houses — Occupants &amp; SAV</SectionHeading>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full max-w-lg">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["House", "Occupants", "SAV Bindus"].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                  const sign   = lagnaSign ? houseToSign(lagnaSign, h) : undefined;
                  const savVal = sav && sign ? sav[sign] : undefined;
                  return (
                    <tr key={h} className={TABLE_STYLES.row}>
                      <td className={`${td} font-bold text-[var(--color-ink-1)]`}>{h}</td>
                      <td className={td}>
                        {(houseMap[h]?.length ?? 0) > 0
                          ? houseMap[h].join(", ")
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className={td}>
                        {savVal !== undefined
                          ? (
                            <span className={savVal >= 28 ? "text-success font-bold" : savVal < 22 ? "text-danger" : ""}>
                              {savVal}
                            </span>
                          ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-[10px] text-muted-foreground/50">
              SAV Bindus: ≥28 favorable · &lt;22 challenging
            </p>
          </div>
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
