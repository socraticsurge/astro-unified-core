"use client";
import { Section } from "@/components/Section";

type Panchanga = { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; vaara?: string };
type Occupant = { celestialBody?: string; sign?: string; signDegrees?: number; nakshatra?: string; motion_type?: string };
type House = { number: number; sign?: string; lord?: string; lordPlacedHouse?: number; bhavaBala?: number; occupants?: Occupant[]; nakshatra?: string; pada?: number; signDegrees?: number };
type Ayanamsa = { name?: string; value?: number };

type Props = { output: Record<string, unknown> };

export function JyotishganitView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const panchanga = data.panchanga as Panchanga | undefined;
  const houses = (data.d1Chart as { houses?: House[] } | undefined)?.houses ?? [];
  const ayanamsa = data.ayanamsa as Ayanamsa | undefined;
  const lagna = houses.find(h => h.number === 1);
  const accent = "text-green-800";

  return (
    <div>
      {panchanga && (
        <Section title="Panchanga" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Tithi", value: panchanga.tithi },
              { label: "Nakshatra", value: panchanga.nakshatra },
              { label: "Yoga", value: panchanga.yoga },
              { label: "Karana", value: panchanga.karana },
              { label: "Vara (Day)", value: panchanga.vaara },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-green-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {lagna && (
        <Section title="Lagna (Ascendant)" accent={accent}>
          <div className="mt-1">
            <p className="text-3xl font-bold text-green-900">{lagna.sign}</p>
            {lagna.nakshatra && (
              <p className="text-base text-green-700 mt-1">
                {lagna.nakshatra} Nakshatra{lagna.pada ? ` · Pada ${lagna.pada}` : ""}
              </p>
            )}
            {lagna.signDegrees !== undefined && (
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{lagna.signDegrees.toFixed(2)}° in sign</p>
            )}
          </div>
        </Section>
      )}

      {houses.length > 0 && (
        <Section title="Birth Chart — D1 (Rasi)" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1.5 pr-3 font-medium w-8">H</th>
                <th className="text-left py-1.5 pr-4 font-medium">Sign</th>
                <th className="text-left py-1.5 pr-4 font-medium">Lord</th>
                <th className="text-left py-1.5 pr-4 font-medium">Lord in</th>
                <th className="text-left py-1.5 font-medium">Occupants</th>
              </tr>
            </thead>
            <tbody>
              {houses.map(h => (
                <tr key={h.number} className="border-b border-gray-100 hover:bg-green-50/40">
                  <td className="py-2 pr-3 font-bold text-green-700">{h.number}</td>
                  <td className="py-2 pr-4 font-medium">{h.sign}</td>
                  <td className="py-2 pr-4">{h.lord}</td>
                  <td className="py-2 pr-4 text-muted-foreground text-xs">H{h.lordPlacedHouse}</td>
                  <td className="py-2 text-sm">
                    {h.occupants && h.occupants.length > 0
                      ? h.occupants.map(o => `${o.celestialBody}${o.motion_type === "retrograde" ? " ℞" : ""}`).join(", ")
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {ayanamsa && (
        <Section title="Ayanamsa" accent={accent} defaultOpen={false}>
          <p className="text-sm mt-1">{ayanamsa.name} · <span className="font-mono">{ayanamsa.value?.toFixed(4)}°</span></p>
        </Section>
      )}
    </div>
  );
}
