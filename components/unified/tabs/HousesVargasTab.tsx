"use client";
import { PLANET_ORDER, SIGNS_ORDER } from "@/components/unified/types";
import type { Planet } from "@/components/unified/types";

const VARGA_DEFS: { label: string; key: keyof Planet | "sign" }[] = [
  { label: "D1",  key: "sign"      }, { label: "D2",  key: "d2_sign"  },
  { label: "D3",  key: "d3_sign"   }, { label: "D4",  key: "d4_sign"  },
  { label: "D7",  key: "d7_sign"   }, { label: "D9",  key: "d9_sign"  },
  { label: "D10", key: "d10_sign"  }, { label: "D12", key: "d12_sign" },
  { label: "D16", key: "d16_sign"  }, { label: "D20", key: "d20_sign" },
  { label: "D24", key: "d24_sign"  }, { label: "D27", key: "d27_sign" },
  { label: "D30", key: "d30_sign"  }, { label: "D40", key: "d40_sign" },
  { label: "D60", key: "d60_sign"  },
];

const th = "text-left py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const td = "py-1.5 px-2 text-xs text-[var(--color-ink-2)]";

function houseToSign(lagnaSign: string, house: number): string | undefined {
  const idx = SIGNS_ORDER.indexOf(lagnaSign as (typeof SIGNS_ORDER)[number]);
  if (idx < 0) return undefined;
  return SIGNS_ORDER[(idx + house - 1) % 12];
}

export function HousesVargasTab({
  chartOutput,
  lagnaSign,
}: {
  chartOutput: Record<string, unknown>;
  lagnaSign?: string;
}) {
  const data        = chartOutput?.data as Record<string, unknown> | undefined;
  const planets     = data?.planets     as Record<string, Planet>   | undefined;
  const bhavaChalit = data?.bhava_chalit as Record<string, { rashi_house?: number; bhava_house?: number; shifted?: boolean }> | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown> | undefined;
  const sav = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;

  // Build whole-sign house → planet list
  const houseMap: Record<number, string[]> = {};
  for (let i = 1; i <= 12; i++) houseMap[i] = [];
  if (planets) {
    PLANET_ORDER.forEach(name => {
      const h = planets[name]?.house;
      if (h != null && h >= 1 && h <= 12) houseMap[h].push(name);
    });
  }

  const shifts = bhavaChalit
    ? Object.entries(bhavaChalit).filter(([, v]) => v.shifted)
    : [];

  return (
    <div className="space-y-8">
      {/* Bhava Chalit */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Bhava Chalit — House Shifts
        </h3>
        {!bhavaChalit ? (
          <p className="text-xs text-muted-foreground italic">Bhava Chalit data not available.</p>
        ) : shifts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No planets shift house in Bhava Chalit.</p>
        ) : (
          <div className="space-y-1 mb-3">
            {shifts.map(([planet, v]) => (
              <div key={planet} className="flex items-center gap-2 text-sm">
                <span className="w-20 font-semibold text-[var(--color-ink-1)]">{planet}</span>
                <span className="text-muted-foreground">Rasi H{v.rashi_house}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-amber-300 font-semibold">Bhava H{v.bhava_house}</span>
              </div>
            ))}
          </div>
        )}
        {bhavaChalit && (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Planet", "Rasi House", "Bhava House", "Shifted"].map(h => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const b = bhavaChalit[name];
                  if (!b) return null;
                  return (
                    <tr key={name} className="border-b border-[var(--color-border)]/40">
                      <td className={`${td} font-semibold text-[var(--color-ink-1)]`}>{name}</td>
                      <td className={td}>{b.rashi_house ?? "—"}</td>
                      <td className={`${td} ${b.shifted ? "text-amber-300 font-semibold" : ""}`}>{b.bhava_house ?? "—"}</td>
                      <td className={td}>{b.shifted ? "Yes" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per-house summary with SAV */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Houses — Occupants &amp; SAV
        </h3>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse w-full max-w-lg">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["House", "Occupants (whole-sign)", "SAV Bindus"].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                const sign = lagnaSign ? houseToSign(lagnaSign, h) : undefined;
                const savVal: number | undefined = sav && sign ? sav[sign] : undefined;
                return (
                  <tr key={h} className="border-b border-[var(--color-border)]/40">
                    <td className={`${td} font-bold text-[var(--color-ink-1)]`}>{h}</td>
                    <td className={td}>
                      {houseMap[h].length > 0
                        ? houseMap[h].join(", ")
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className={td}>
                      {savVal !== undefined
                        ? <span className={savVal >= 28 ? "text-emerald-400 font-bold" : savVal < 22 ? "text-red-400" : ""}>{savVal}</span>
                        : <span className="text-muted-foreground/50">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Varga Matrix */}
      {planets && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Varga Matrix — All Divisional Charts
          </h3>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className={th}>Planet</th>
                  {VARGA_DEFS.map(({ label }) => (
                    <th key={label} className="py-1.5 px-1 text-center text-xs font-medium text-muted-foreground">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const p = planets[name];
                  if (!p) return null;
                  return (
                    <tr key={name} className="border-b border-[var(--color-border)]/40">
                      <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-1)]">{name}</td>
                      {VARGA_DEFS.map(({ key, label }) => {
                        const val = p[key as keyof Planet] as string | undefined;
                        return (
                          <td key={label} className="py-1.5 px-1 text-center text-xs text-muted-foreground">
                            {val?.slice(0, 3) ?? "—"}
                          </td>
                        );
                      })}
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
