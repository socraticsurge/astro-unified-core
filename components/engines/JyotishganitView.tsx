"use client";
import { Section } from "@/components/Section";
import { dignityBadgeColor } from "@/lib/astro-utils";

type Panchanga = { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; vaara?: string };
type Ayanamsa = { name?: string; value?: number };

type Occupant = {
  celestialBody?: string; sign?: string; signDegrees?: number;
  nakshatra?: string; pada?: number; house?: number; motion_type?: string;
  shadbala?: unknown;
};
type AspectReceived = { aspecting_planet?: string; aspect_type?: string };
type House = {
  number: number; sign?: string; lord?: string;
  lordPlacedSign?: string; lordPlacedHouse?: number; bhavaBala?: number;
  occupants?: Occupant[]; aspectsReceived?: AspectReceived[];
  purposes?: string[]; signDegrees?: number;
  nakshatra?: string; pada?: number; nakshatraDeity?: string;
};
type DivHouse = {
  number: number; sign?: string; lord?: string; d1HousePlacement?: number;
  occupants?: Array<{ celestialBody?: string; sign?: string; d1HousePlacement?: number }>;
};
type DivChart = { ascendant?: { sign?: string; d1HousePlacement?: number }; houses?: DivHouse[] };
type MahaDasha = {
  start?: string; end?: string;
  antardashas?: Record<string, { start?: string; end?: string; pratyantardashas?: Record<string, { start?: string; end?: string }> }>;
};
type Dashas = {
  balance?: Record<string, number>;
  all?: { mahadashas?: Record<string, MahaDasha> };
};

type Props = { output: Record<string, unknown> };

const SIGNS_ORDER = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const DIV_CHART_NAMES: Record<string, string> = {
  d2: "D2 — Hora (Wealth)",
  d3: "D3 — Drekkana (Siblings)",
  d4: "D4 — Chaturthamsha (Fortune)",
  d7: "D7 — Saptamsha (Children)",
  d9: "D9 — Navamsha (Marriage/Dharma)",
  d10: "D10 — Dashamsha (Career)",
  d12: "D12 — Dwadashamsha (Parents)",
  d16: "D16 — Shodashamsha (Vehicles)",
  d20: "D20 — Vimshamsha (Spirituality)",
  d24: "D24 — Chaturvimshamsha (Education)",
  d27: "D27 — Saptavimshamsha (Strength)",
  d30: "D30 — Trimshamsha (Evils)",
  d40: "D40 — Khavedamsha",
  d45: "D45 — Akshavedamsha",
  d60: "D60 — Shastiamsha",
};

function isCurrentPeriod(start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const now = new Date();
  return new Date(start) <= now && now <= new Date(end);
}

export function JyotishganitView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const panchanga = data.panchanga as Panchanga | undefined;
  const ayanamsa = data.ayanamsa as Ayanamsa | undefined;
  const d1 = (data.d1Chart as { houses?: House[] } | undefined);
  const houses = d1?.houses ?? [];
  const lagna = houses.find(h => h.number === 1);
  const divisionalCharts = data.divisionalCharts as Record<string, DivChart> | undefined;
  const dashas = data.dashas as Dashas | undefined;
  const ashtakavarga = data.ashtakavarga as Record<string, Record<string, number> | string> | undefined;

  const accent = "text-green-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card = "bg-green-950/20 border border-green-800/30 rounded-lg p-3";

  return (
    <div>
      {panchanga && (
        <Section title="Panchanga" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Vara (Day)", value: panchanga.vaara },
              { label: "Tithi", value: panchanga.tithi },
              { label: "Nakshatra", value: panchanga.nakshatra },
              { label: "Yoga", value: panchanga.yoga },
              { label: "Karana", value: panchanga.karana },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className={card}>
                <p className="text-xs text-green-400/70 font-medium uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-green-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ayanamsa && (
        <Section title="Ayanamsa" accent={accent}>
          <div className={`${card} mt-2 inline-block`}>
            <p className="text-xs text-green-400/70 uppercase tracking-wide">{ayanamsa.name}</p>
            <p className="text-xl font-bold font-mono text-green-200">{ayanamsa.value?.toFixed(6)}°</p>
          </div>
        </Section>
      )}

      {lagna && (
        <Section title="Lagna (Ascendant)" accent={accent}>
          <div className="mt-2 space-y-1">
            <p className="text-3xl font-bold text-green-200">{lagna.sign}</p>
            {lagna.nakshatra && (
              <p className="text-base text-green-400">
                {lagna.nakshatra}{lagna.pada ? ` · Pada ${lagna.pada}` : ""}
                {lagna.nakshatraDeity ? ` (${lagna.nakshatraDeity})` : ""}
              </p>
            )}
            {lagna.signDegrees !== undefined && (
              <p className="text-sm text-muted-foreground font-mono">{lagna.signDegrees.toFixed(4)}° in sign</p>
            )}
            {lagna.bhavaBala !== undefined && (
              <p className="text-xs text-muted-foreground">Bhava Bala: <span className="font-mono">{lagna.bhavaBala.toFixed(3)}</span></p>
            )}
          </div>
        </Section>
      )}

      {houses.length > 0 && (
        <Section title="Birth Chart — D1 Rasi (Full)" accent={accent}>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={`${th} w-8`}>H</th>
                  <th className={th}>Sign</th>
                  <th className={th}>Nakshatra / Pada</th>
                  <th className={th}>Lord</th>
                  <th className={th}>Lord → H (Sign)</th>
                  <th className={th}>BhavaBala</th>
                  <th className={th}>Occupants</th>
                  <th className={th}>Aspects</th>
                  <th className={th}>Purposes</th>
                </tr>
              </thead>
              <tbody>
                {houses.map(h => (
                  <tr key={h.number} className={row}>
                    <td className="py-2 pr-3 font-bold text-green-400">{h.number}</td>
                    <td className="py-2 pr-3 font-medium">{h.sign}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {h.nakshatra ? `${h.nakshatra}${h.pada ? ` P${h.pada}` : ""}` : "—"}
                    </td>
                    <td className="py-2 pr-3">{h.lord}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {h.lordPlacedHouse !== undefined ? `H${h.lordPlacedHouse}` : ""}{h.lordPlacedSign ? ` (${h.lordPlacedSign})` : ""}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{h.bhavaBala?.toFixed(1) ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">
                      {h.occupants && h.occupants.length > 0
                        ? h.occupants.map(o => `${o.celestialBody}${o.motion_type === "retrograde" ? " ℞" : ""}${o.nakshatra ? ` (${o.nakshatra.slice(0, 4)})` : ""}`).join(", ")
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {h.aspectsReceived && h.aspectsReceived.length > 0
                        ? h.aspectsReceived.map(a => `${a.aspecting_planet} (${a.aspect_type})`).join(", ")
                        : "—"}
                    </td>
                    <td className="py-2 text-xs text-green-400/70">
                      {h.purposes && h.purposes.length > 0 ? h.purposes.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Occupant shadbala detail */}
          {houses.some(h => h.occupants && h.occupants.length > 0) && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Planet Positions in D1</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>Planet</th>
                    <th className={th}>House</th>
                    <th className={th}>Sign</th>
                    <th className={th}>Deg</th>
                    <th className={th}>Nakshatra / Pada</th>
                    <th className={th}>Motion</th>
                  </tr>
                </thead>
                <tbody>
                  {houses.flatMap(h => (h.occupants ?? []).map(o => ({ ...o, houseNum: h.number }))).map((o, i) => (
                    <tr key={i} className={row}>
                      <td className="py-1.5 pr-3 font-medium">{o.celestialBody}</td>
                      <td className="py-1.5 pr-3 text-green-400">H{o.houseNum}</td>
                      <td className="py-1.5 pr-3">{o.sign}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{o.signDegrees?.toFixed(3)}°</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{o.nakshatra}{o.pada ? ` P${o.pada}` : ""}</td>
                      <td className="py-1.5">
                        {o.motion_type === "retrograde"
                          ? <span className="text-orange-400 font-bold">℞</span>
                          : <span className="text-muted-foreground">direct</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {divisionalCharts && Object.keys(divisionalCharts).length > 0 && (
        <Section title="Divisional Charts (Vargas)" accent={accent}>
          <div className="space-y-2 mt-2">
            {Object.entries(divisionalCharts).map(([key, chart]) => (
              <details key={key} className="border border-white/10 rounded-lg">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-green-300 hover:bg-white/5 rounded-lg">
                  {DIV_CHART_NAMES[key] ?? key.toUpperCase()}
                  {chart.ascendant?.sign ? ` — Asc: ${chart.ascendant.sign}` : ""}
                </summary>
                <div className="px-3 pb-3">
                  {chart.ascendant && (
                    <p className="text-xs text-muted-foreground mb-2">
                      Ascendant: <span className="text-green-300">{chart.ascendant.sign}</span>
                      {chart.ascendant.d1HousePlacement !== undefined ? ` (D1 H${chart.ascendant.d1HousePlacement})` : ""}
                    </p>
                  )}
                  {chart.houses && chart.houses.length > 0 && (
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className={th}>H</th>
                          <th className={th}>Sign</th>
                          <th className={th}>Lord</th>
                          <th className={th}>D1 Placement</th>
                          <th className={th}>Occupants</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chart.houses.map(h => (
                          <tr key={h.number} className={row}>
                            <td className="py-1.5 pr-2 font-bold text-green-400">{h.number}</td>
                            <td className="py-1.5 pr-2">{h.sign}</td>
                            <td className="py-1.5 pr-2">{h.lord}</td>
                            <td className="py-1.5 pr-2 text-muted-foreground">H{h.d1HousePlacement}</td>
                            <td className="py-1.5 text-muted-foreground">
                              {h.occupants && h.occupants.length > 0
                                ? h.occupants.map(o => `${o.celestialBody}(D1:H${o.d1HousePlacement})`).join(", ")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            ))}
          </div>
        </Section>
      )}

      {dashas?.all?.mahadashas && (
        <Section title="Vimshottari Dashas — Complete Timeline" accent={accent}>
          <div className="space-y-3 mt-2">
            {dashas.balance && (
              <p className="text-xs text-muted-foreground">
                Balance at birth: {Object.entries(dashas.balance).map(([k, v]) => `${k}: ${v.toFixed(4)} yrs`).join(", ")}
              </p>
            )}
            {/* Mahadasha timeline table */}
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Mahadasha</th>
                  <th className={th}>Start</th>
                  <th className={th}>End</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dashas.all.mahadashas).map(([planet, md]) => {
                  const isCurrent = isCurrentPeriod(md.start, md.end);
                  return (
                    <tr key={planet} className={`${row} ${isCurrent ? "bg-green-950/30" : ""}`}>
                      <td className={`py-2 pr-3 font-medium ${isCurrent ? "text-green-300" : ""}`}>{planet}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{md.start}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{md.end}</td>
                      <td className="py-2 text-xs">
                        {isCurrent ? <span className="text-green-400 font-bold">● Current</span>
                          : md.end && new Date(md.end) < new Date() ? <span className="text-muted-foreground">Past</span>
                          : <span className="text-muted-foreground/50">Future</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded current antardasha */}
            {Object.entries(dashas.all.mahadashas).filter(([, md]) => isCurrentPeriod(md.start, md.end)).map(([mahaLord, md]) => (
              <div key={mahaLord} className="bg-green-950/20 border border-green-800/30 rounded-lg p-3">
                <p className="text-xs text-green-400/70 uppercase tracking-widest mb-2">Current: {mahaLord} Mahadasha — Antardashas</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className={th}>Antardasha</th>
                      <th className={th}>Start</th>
                      <th className={th}>End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {md.antardashas && Object.entries(md.antardashas).map(([aLord, ad]) => {
                      const isCurrentAD = isCurrentPeriod(ad.start, ad.end);
                      return (
                        <tr key={aLord} className={`${row} ${isCurrentAD ? "bg-green-950/30" : ""}`}>
                          <td className={`py-1.5 pr-3 font-medium ${isCurrentAD ? "text-green-300" : ""}`}>
                            {aLord}{isCurrentAD ? " ●" : ""}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-muted-foreground">{ad.start}</td>
                          <td className="py-1.5 font-mono text-muted-foreground">{ad.end}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Section>
      )}

      {ashtakavarga && (
        <Section title="Ashtakavarga" accent={accent}>
          <div className="space-y-4 mt-2">
            {/* SAV — Sarvashtakavarga */}
            {ashtakavarga.sav && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Sarvashtakavarga (SAV) — Total Bindus per Sign</p>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        {SIGNS_ORDER.map(s => <th key={s} className="text-center py-1.5 px-2 font-medium text-muted-foreground">{s.slice(0,3)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {SIGNS_ORDER.map(sign => {
                          const val = (ashtakavarga.sav as Record<string, number>)[sign] ?? 0;
                          return (
                            <td key={sign} className={`py-2 px-2 text-center font-bold font-mono ${val >= 28 ? "text-emerald-400" : val < 22 ? "text-red-400" : "text-foreground"}`}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Green ≥28 (strong), Red &lt;22 (weak)</p>
              </div>
            )}

            {/* Individual planet bhavs */}
            {["sun","moon","mars","mercury","jupiter","venus","saturn"].map(p => {
              const bhavKey = `${p}Bhav`;
              const bhav = ashtakavarga[bhavKey] as Record<string, number> | undefined;
              if (!bhav) return null;
              const planetName = p.charAt(0).toUpperCase() + p.slice(1);
              const total = SIGNS_ORDER.reduce((sum, s) => sum + (bhav[s] ?? 0), 0);
              return (
                <div key={p}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{planetName} Ashtakavarga (Total: {total})</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          {SIGNS_ORDER.map(s => <th key={s} className="text-center py-1 px-2 font-medium text-muted-foreground">{s.slice(0,3)}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {SIGNS_ORDER.map(sign => {
                            const val = bhav[sign] ?? 0;
                            return (
                              <td key={sign} className={`py-1.5 px-2 text-center font-mono ${val >= 6 ? "text-emerald-400 font-bold" : val <= 2 ? "text-red-400" : ""}`}>
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
