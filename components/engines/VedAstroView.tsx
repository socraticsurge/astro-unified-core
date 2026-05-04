"use client";
import { Section } from "@/components/Section";
import { parseVedAstroPlanets, longitudeToSign, longitudeToDegreesInSign } from "@/lib/astro-utils";

type Props = { output: Record<string, unknown> };

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const PLANETS_ORDER = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];

function houseNum(h: string): number { return parseInt(h.replace("House", "")); }

export function VedAstroView({ output }: Props) {
  const raw = output.raw_responses as Record<string, unknown> | undefined;
  const errors = output.errors as Record<string, string> | undefined;
  if (!raw) return <p className="text-muted-foreground text-sm p-4">No data</p>;

  const lagna = (raw.rising_sign as { Payload?: { LagnaSignName?: string } } | undefined)?.Payload?.LagnaSignName;
  const planetsRaw = (raw.planetary_positions as { Payload?: { AllPlanetLongitude?: string } } | undefined)?.Payload?.AllPlanetLongitude;
  const planets = planetsRaw ? parseVedAstroPlanets(planetsRaw) : [];
  const housesRaw = (raw.house_cusps as { Payload?: { AllHouseLongitudes?: Array<{ House: string; Begin: string; Mid: string; End: string }> } } | undefined)?.Payload?.AllHouseLongitudes ?? [];
  const avPayload = (raw.ashtakavarga as { Payload?: { BhinnashtakavargaChart?: Record<string, { Total: number; Rows: number[] }> } } | undefined)?.Payload?.BhinnashtakavargaChart;

  const accent = "text-blue-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";

  return (
    <div>
      {lagna && (
        <Section title="Lagna (Ascendant)" accent={accent}>
          <p className="text-3xl font-bold text-blue-300 py-2">{lagna}</p>
        </Section>
      )}

      {planets.length > 0 && (
        <Section title="Planetary Positions" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Degrees in Sign</th>
                <th className={th}>Nakshatra</th>
                <th className={`${th} font-mono`}>Longitude°</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(p => (
                <tr key={p.name} className={row}>
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">{p.sign}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{p.degrees}</td>
                  <td className="py-2 pr-3 text-muted-foreground text-xs">{p.nakshatra}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{p.longitude.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {housesRaw.length > 0 && (
        <Section title="House Cusps" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>House</th>
                <th className={th}>Cusp Sign</th>
                <th className={`${th} font-mono`}>Begin°</th>
                <th className={`${th} font-mono`}>Mid°</th>
                <th className={th}>Mid Sign</th>
              </tr>
            </thead>
            <tbody>
              {housesRaw.sort((a, b) => houseNum(a.House) - houseNum(b.House)).map(h => {
                const begin = parseFloat(h.Begin);
                const mid = parseFloat(h.Mid);
                return (
                  <tr key={h.House} className={row}>
                    <td className="py-2 pr-3 font-bold text-blue-400">{houseNum(h.House)}</td>
                    <td className="py-2 pr-3">{longitudeToSign(begin)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{longitudeToDegreesInSign(begin)}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{longitudeToDegreesInSign(mid)}</td>
                    <td className="py-2 text-muted-foreground text-xs">{longitudeToSign(mid)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {avPayload && (
        <Section title="Ashtakavarga — Bhinnashtakavarga Chart" accent={accent}>
          <div className="overflow-x-auto mt-2">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground w-20">Planet</th>
                  {SIGNS.map(s => <th key={s} className="text-center py-1.5 px-1 font-medium text-muted-foreground whitespace-nowrap">{s.slice(0,3)}</th>)}
                  <th className="text-center py-1.5 px-2 font-bold text-blue-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {PLANETS_ORDER.filter(p => avPayload[p]).map(planet => (
                  <tr key={planet} className={row}>
                    <td className="py-2 pr-3 font-medium">{planet}</td>
                    {avPayload[planet].Rows.map((score, i) => (
                      <td key={i} className={`py-2 px-1 text-center font-mono ${score >= 6 ? "text-emerald-400 font-bold" : score <= 2 ? "text-red-400" : "text-foreground"}`}>
                        {score}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-center font-bold text-blue-300">{avPayload[planet].Total}</td>
                  </tr>
                ))}
                {/* SAV total row */}
                <tr className="border-t-2 border-blue-800/50 bg-blue-950/20">
                  <td className="py-2 pr-3 font-bold text-blue-400">SAV</td>
                  {SIGNS.map((_, i) => {
                    const total = PLANETS_ORDER.filter(p => avPayload[p]).reduce((sum, p) => sum + (avPayload[p].Rows[i] ?? 0), 0);
                    return <td key={i} className={`py-2 px-1 text-center font-bold font-mono ${total >= 28 ? "text-emerald-400" : total < 22 ? "text-red-400" : "text-blue-200"}`}>{total}</td>;
                  })}
                  <td className="py-2 px-2 text-center font-bold text-blue-300">
                    {PLANETS_ORDER.filter(p => avPayload[p]).reduce((s, p) => s + avPayload[p].Total, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">Green = 6+, Red = ≤2 | SAV ≥28 strong, &lt;22 weak</p>
          </div>
        </Section>
      )}

      {errors && Object.keys(errors).length > 0 && (
        <Section title="Errors" accent="text-red-400" defaultOpen={true}>
          <ul className="text-sm text-red-400 space-y-1 mt-1">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}><span className="font-medium">{k}:</span> {v}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
