"use client";

type Panchanga = { tithi?: string; nakshatra?: string; yoga?: string; karana?: string; vaara?: string };
type Occupant = { celestialBody?: string; sign?: string; signDegrees?: number; nakshatra?: string; motion_type?: string };
type House = { number: number; sign?: string; lord?: string; lordPlacedHouse?: number; bhavaBala?: number; occupants?: Occupant[]; nakshatra?: string; pada?: number; signDegrees?: number };
type D1Chart = { houses?: House[] };
type Ayanamsa = { name?: string; value?: number };

type Props = { output: Record<string, unknown> };

export function JyotishganitView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm">{output.error ? String(output.error) : "No data"}</p>;

  const panchanga = data.panchanga as Panchanga | undefined;
  const d1 = data.d1Chart as D1Chart | undefined;
  const ayanamsa = data.ayanamsa as Ayanamsa | undefined;
  const lagna = d1?.houses?.find(h => h.number === 1);

  return (
    <div className="space-y-6 text-sm">
      {/* Panchanga */}
      {panchanga && (
        <section>
          <h4 className="font-semibold text-green-800 uppercase tracking-wide text-xs mb-3">Panchanga</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Tithi", value: panchanga.tithi },
              { label: "Nakshatra", value: panchanga.nakshatra },
              { label: "Yoga", value: panchanga.yoga },
              { label: "Karana", value: panchanga.karana },
              { label: "Vara (Day)", value: panchanga.vaara },
            ].filter(({ value }) => !!value).map(({ label, value }) => (
              <div key={label} className="bg-green-50 border border-green-200 rounded p-2">
                <p className="text-xs text-green-700 font-medium">{label}</p>
                <p className="font-semibold text-green-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lagna */}
      {lagna && (
        <section>
          <h4 className="font-semibold text-green-800 uppercase tracking-wide text-xs mb-2">Lagna (Ascendant)</h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-900">{lagna.sign}</p>
            {lagna.nakshatra && <p className="text-sm text-green-700">{lagna.nakshatra} Nakshatra{lagna.pada ? ` · Pada ${lagna.pada}` : ""}</p>}
            {lagna.signDegrees !== undefined && <p className="text-xs text-muted-foreground font-mono">{lagna.signDegrees.toFixed(2)}° in sign</p>}
          </div>
        </section>
      )}

      {/* Birth Chart D1 */}
      {d1?.houses && d1.houses.length > 0 && (
        <section>
          <h4 className="font-semibold text-green-800 uppercase tracking-wide text-xs mb-2">Birth Chart (D1 Rasi)</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-2 w-8">H</th>
                <th className="text-left py-1 pr-3">Sign</th>
                <th className="text-left py-1 pr-3">Lord (in H)</th>
                <th className="text-left py-1">Occupants</th>
              </tr>
            </thead>
            <tbody>
              {d1.houses.map(h => (
                <tr key={h.number} className="border-b border-gray-100 hover:bg-green-50/30">
                  <td className="py-1.5 pr-2 font-bold text-green-800">{h.number}</td>
                  <td className="py-1.5 pr-3 font-medium">{h.sign}</td>
                  <td className="py-1.5 pr-3 text-xs">{h.lord} (H{h.lordPlacedHouse})</td>
                  <td className="py-1.5 text-xs">
                    {h.occupants && h.occupants.length > 0
                      ? h.occupants.map(o => `${o.celestialBody}${o.motion_type === "retrograde" ? " ℞" : ""}`).join(", ")
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Ayanamsa */}
      {ayanamsa && (
        <p className="text-xs text-muted-foreground">Ayanamsa: {ayanamsa.name} · {ayanamsa.value?.toFixed(4)}°</p>
      )}
    </div>
  );
}
