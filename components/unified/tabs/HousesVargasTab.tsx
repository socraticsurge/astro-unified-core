"use client";
import { PLANET_ORDER, SIGNS_ORDER, TABLE_STYLES } from "@/components/unified/types";
import type { Planet, SignName } from "@/components/unified/types";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import { SectionHeading } from "@/components/unified/SectionHeading";

const th = TABLE_STYLES.th;
const td = TABLE_STYLES.td;

// Each divisional chart: label, signKey, lagna key in the lagna object
const DIVISIONAL_CHARTS: {
  label: string;
  signKey: keyof Planet;
  lagnaKey: string;
}[] = [
  { label: "D2 — Hora",         signKey: "d2_sign",  lagnaKey: "d2_sign"  },
  { label: "D3 — Drekkana",     signKey: "d3_sign",  lagnaKey: "d3_sign"  },
  { label: "D4 — Chaturthamsha",signKey: "d4_sign",  lagnaKey: "d4_sign"  },
  { label: "D7 — Saptamsha",    signKey: "d7_sign",  lagnaKey: "d7_sign"  },
  { label: "D12 — Dvadashamsha",signKey: "d12_sign", lagnaKey: "d12_sign" },
  { label: "D16 — Shodashamsha",signKey: "d16_sign", lagnaKey: "d16_sign" },
  { label: "D20 — Vimshamsha",  signKey: "d20_sign", lagnaKey: "d20_sign" },
  { label: "D24 — Chaturvimshamsha", signKey: "d24_sign", lagnaKey: "d24_sign" },
  { label: "D27 — Nakshatramsha",signKey: "d27_sign", lagnaKey: "d27_sign" },
  { label: "D30 — Trimshamsha", signKey: "d30_sign", lagnaKey: "d30_sign" },
  { label: "D40 — Khavedamsha", signKey: "d40_sign", lagnaKey: "d40_sign" },
  { label: "D60 — Shashtiamsha",signKey: "d60_sign", lagnaKey: "d60_sign" },
];

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
  const data         = chartOutput?.data as Record<string, unknown> | undefined;
  const planets      = data?.planets     as Record<string, Planet>  | undefined;
  const bhavaChalit  = data?.bhava_chalit as Record<string, { rashi_house?: number; bhava_house?: number; shifted?: boolean }> | undefined;
  const ashtakavarga = data?.ashtakavarga as Record<string, unknown> | undefined;
  const sav          = ashtakavarga?.sarvashtakavarga as Record<string, number> | undefined;
  const lagna        = data?.lagna as Record<string, unknown> | undefined;

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
    <div className="space-y-10">

      {/* Divisional Charts grid — 4 per row */}
      {planets && (
        <section>
          <SectionHeading>Divisional Charts</SectionHeading>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-4 gap-4 min-w-max">
              {DIVISIONAL_CHARTS.map(({ label, signKey, lagnaKey }) => {
                const divLagnaSign = lagna?.[lagnaKey] as SignName | undefined;
                const hasDivData = PLANET_ORDER.some(n => planets[n]?.[signKey]);
                if (!hasDivData) return null;
                return (
                  <NatalChartGrid
                    key={label}
                    planets={planets}
                    lagnaSign={divLagnaSign}
                    signKey={signKey}
                    label={label}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Bhava Chalit */}
      <section>
        <SectionHeading>Bhava Chalit — House Shifts</SectionHeading>
        {!bhavaChalit ? (
          <p className="text-xs text-muted-foreground italic">Bhava Chalit data not available.</p>
        ) : shifts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No planets shift house in Bhava Chalit.</p>
        ) : (
          <div className="space-y-1 mb-4">
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

      {/* Houses — Occupants & SAV */}
      <section>
        <SectionHeading>Houses — Occupants &amp; SAV</SectionHeading>
        {!planets ? (
          <p className="text-xs text-muted-foreground italic">House data not available.</p>
        ) : (
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
                  const sign  = lagnaSign ? houseToSign(lagnaSign, h) : undefined;
                  const savVal: number | undefined = sav && sign ? sav[sign] : undefined;
                  return (
                    <tr key={h} className="border-b border-[var(--color-border)]/40">
                      <td className={`${td} font-bold text-[var(--color-ink-1)]`}>{h}</td>
                      <td className={td}>
                        {houseMap[h].length > 0
                          ? houseMap[h].join(", ")
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className={td}>
                        {savVal !== undefined
                          ? (
                            <span className={
                              savVal >= 28
                                ? "text-success font-bold"
                                : savVal < 22
                                  ? "text-danger"
                                  : ""
                            }>
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
        )}
      </section>

      {/* Varga Matrix — kept as efficient lookup table */}
      {planets && (
        <section>
          <SectionHeading>Varga Matrix</SectionHeading>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className={th}>Planet</th>
                  <th className="py-1.5 px-2 text-center text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wide">D1</th>
                  {DIVISIONAL_CHARTS.map(({ label }) => (
                    <th
                      key={label}
                      className="py-1.5 px-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {label.split(" ")[0]}
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
                      <td className="py-1.5 px-2 text-center text-xs font-medium text-[var(--color-ink-2)]">
                        {p.sign?.slice(0, 3) ?? "—"}
                      </td>
                      {DIVISIONAL_CHARTS.map(({ signKey, label }) => {
                        const val = p[signKey] as string | undefined;
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
