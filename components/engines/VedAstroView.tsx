"use client";
import { parseVedAstroPlanets, longitudeToSign, houseNumberToName } from "@/lib/astro-utils";

type Props = { output: Record<string, unknown> };

export function VedAstroView({ output }: Props) {
  const raw = output.raw_responses as Record<string, unknown> | undefined;
  const errors = output.errors as Record<string, string> | undefined;

  if (!raw) return <p className="text-muted-foreground text-sm">No data</p>;

  const lagna = (raw.rising_sign as { Payload?: { LagnaSignName?: string } } | undefined)?.Payload?.LagnaSignName;

  const planetsRaw = (raw.planetary_positions as { Payload?: { AllPlanetLongitude?: string } } | undefined)?.Payload?.AllPlanetLongitude;
  const planets = planetsRaw ? parseVedAstroPlanets(planetsRaw) : [];

  const housesRaw = (raw.house_cusps as { Payload?: { AllHouseLongitudes?: Array<{ House: string; Begin: string; Mid: string }> } } | undefined)?.Payload?.AllHouseLongitudes ?? [];

  const dashaPayload = (raw.dasha as { Payload?: { DasaForNow?: Record<string, unknown> } } | undefined)?.Payload?.DasaForNow;
  const dashaLord = dashaPayload ? Object.keys(dashaPayload)[0] : null;
  const dasha = dashaLord ? (dashaPayload![dashaLord] as Record<string, unknown>) : null;
  const subDasas = dasha?.SubDasas as Record<string, Record<string, unknown>> | undefined;
  const bhuktiLord = subDasas ? Object.keys(subDasas)[0] : null;

  return (
    <div className="space-y-6 text-sm">
      {/* Lagna */}
      {lagna && (
        <section>
          <h4 className="font-semibold text-blue-800 uppercase tracking-wide text-xs mb-2">Lagna (Ascendant)</h4>
          <p className="text-2xl font-bold text-blue-900">{lagna}</p>
        </section>
      )}

      {/* Planetary Positions */}
      {planets.length > 0 && (
        <section>
          <h4 className="font-semibold text-blue-800 uppercase tracking-wide text-xs mb-2">Planetary Positions</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-3">Planet</th>
                <th className="text-left py-1 pr-3">Sign</th>
                <th className="text-left py-1 pr-3">Degrees</th>
                <th className="text-left py-1">Nakshatra</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(p => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-blue-50/30">
                  <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                  <td className="py-1.5 pr-3">{p.sign}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{p.degrees}</td>
                  <td className="py-1.5 text-xs text-muted-foreground">{p.nakshatra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Houses */}
      {housesRaw.length > 0 && (
        <section>
          <h4 className="font-semibold text-blue-800 uppercase tracking-wide text-xs mb-2">House Cusps</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-3">House</th>
                <th className="text-left py-1 pr-3">Sign</th>
                <th className="text-left py-1">Cusp</th>
              </tr>
            </thead>
            <tbody>
              {housesRaw.map((h) => (
                <tr key={h.House} className="border-b border-gray-100 hover:bg-blue-50/30">
                  <td className="py-1.5 pr-3 font-medium">{houseNumberToName(h.House)}</td>
                  <td className="py-1.5 pr-3">{longitudeToSign(parseFloat(h.Begin))}</td>
                  <td className="py-1.5 font-mono text-xs">{parseFloat(h.Begin).toFixed(2)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Dasha */}
      {dasha && dashaLord && (
        <section>
          <h4 className="font-semibold text-blue-800 uppercase tracking-wide text-xs mb-2">Current Dasha Period</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
            <div className="flex gap-2 items-baseline">
              <span className="font-bold text-blue-900 text-base">{dashaLord} Mahadasha</span>
              {!!dasha.Nature && <span className={`text-xs px-1.5 py-0.5 rounded border ${dasha.Nature === "Good" ? "text-green-700 bg-green-50 border-green-200" : "text-orange-700 bg-orange-50 border-orange-200"}`}>{String(dasha.Nature)}</span>}
            </div>
            {bhuktiLord && <p className="text-sm text-blue-800">{bhuktiLord} Bhukti (Antardasha)</p>}
            {!!dasha.Start && <p className="text-xs text-muted-foreground">From {String(dasha.Start).split(" ").slice(1).join(" ")}</p>}
            {!!dasha.Description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-4">{String(dasha.Description)}</p>}
          </div>
        </section>
      )}

      {/* Errors */}
      {errors && Object.keys(errors).length > 0 && (
        <section>
          <h4 className="font-semibold text-red-700 uppercase tracking-wide text-xs mb-2">Errors</h4>
          <ul className="text-xs text-red-600 space-y-1">
            {Object.entries(errors).map(([k, v]) => <li key={k}><span className="font-medium">{k}:</span> {v}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
