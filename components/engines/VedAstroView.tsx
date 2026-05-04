"use client";
import { Section } from "@/components/Section";
import { parseVedAstroPlanets, longitudeToSign, houseNumberToName } from "@/lib/astro-utils";

type Props = { output: Record<string, unknown> };

export function VedAstroView({ output }: Props) {
  const raw = output.raw_responses as Record<string, unknown> | undefined;
  const errors = output.errors as Record<string, string> | undefined;
  if (!raw) return <p className="text-muted-foreground text-sm p-4">No data</p>;

  const lagna = (raw.rising_sign as { Payload?: { LagnaSignName?: string } } | undefined)?.Payload?.LagnaSignName;
  const planetsRaw = (raw.planetary_positions as { Payload?: { AllPlanetLongitude?: string } } | undefined)?.Payload?.AllPlanetLongitude;
  const planets = planetsRaw ? parseVedAstroPlanets(planetsRaw) : [];
  const housesRaw = (raw.house_cusps as { Payload?: { AllHouseLongitudes?: Array<{ House: string; Begin: string; Mid: string }> } } | undefined)?.Payload?.AllHouseLongitudes ?? [];
  const dashaPayload = (raw.dasha as { Payload?: { DasaForNow?: Record<string, unknown> } } | undefined)?.Payload?.DasaForNow;
  const dashaLord = dashaPayload ? Object.keys(dashaPayload)[0] : null;
  const dasha = dashaLord ? (dashaPayload![dashaLord] as Record<string, unknown>) : null;
  const subDasas = dasha?.SubDasas as Record<string, Record<string, unknown>> | undefined;
  const bhuktiLord = subDasas ? Object.keys(subDasas)[0] : null;
  const bhukti = bhuktiLord ? subDasas![bhuktiLord] : null;

  const accent = "text-blue-800";

  return (
    <div>
      {lagna && (
        <Section title="Lagna (Ascendant)" accent={accent}>
          <p className="text-3xl font-bold text-blue-900 py-2">{lagna}</p>
        </Section>
      )}

      {planets.length > 0 && (
        <Section title="Planetary Positions" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1.5 pr-4 font-medium">Planet</th>
                <th className="text-left py-1.5 pr-4 font-medium">Sign</th>
                <th className="text-left py-1.5 pr-4 font-medium">Degrees</th>
                <th className="text-left py-1.5 font-medium">Nakshatra</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(p => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-blue-50/40">
                  <td className="py-2 pr-4 font-medium">{p.name}</td>
                  <td className="py-2 pr-4">{p.sign}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{p.degrees}</td>
                  <td className="py-2 text-sm text-muted-foreground">{p.nakshatra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {housesRaw.length > 0 && (
        <Section title="House Cusps" accent={accent} defaultOpen={false}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1.5 pr-4 font-medium">House</th>
                <th className="text-left py-1.5 pr-4 font-medium">Sign</th>
                <th className="text-left py-1.5 font-medium">Cusp</th>
              </tr>
            </thead>
            <tbody>
              {housesRaw.map(h => (
                <tr key={h.House} className="border-b border-gray-100 hover:bg-blue-50/40">
                  <td className="py-2 pr-4 font-medium">{houseNumberToName(h.House)}</td>
                  <td className="py-2 pr-4">{longitudeToSign(parseFloat(h.Begin))}</td>
                  <td className="py-2 font-mono text-xs">{parseFloat(h.Begin).toFixed(2)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {dasha && dashaLord && (
        <Section title="Current Dasha Period" accent={accent}>
          <div className="space-y-2 mt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-blue-900">{dashaLord} Mahadasha</span>
              {!!dasha.Nature && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dasha.Nature === "Good" ? "text-green-700 bg-green-50 border-green-200" : "text-orange-700 bg-orange-50 border-orange-200"}`}>
                  {String(dasha.Nature)}
                </span>
              )}
            </div>
            {bhuktiLord && <p className="text-base text-blue-800">{bhuktiLord} Bhukti (Antardasha)</p>}
            {bhukti && !!(bhukti.SubDasas as Record<string, unknown> | undefined) && (
              <p className="text-sm text-muted-foreground">
                {Object.keys(bhukti.SubDasas as Record<string, unknown>)[0]} Pratyantardasha
              </p>
            )}
            {!!dasha.Start && <p className="text-sm text-muted-foreground">From {String(dasha.Start).split(" ").slice(1).join(" ")}</p>}
            {!!dasha.Description && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{String(dasha.Description)}</p>
            )}
          </div>
        </Section>
      )}

      {errors && Object.keys(errors).length > 0 && (
        <Section title="Errors" accent="text-red-700" defaultOpen={true}>
          <ul className="text-sm text-red-600 space-y-1 mt-1">
            {Object.entries(errors).map(([k, v]) => (
              <li key={k}><span className="font-medium">{k}:</span> {v}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
