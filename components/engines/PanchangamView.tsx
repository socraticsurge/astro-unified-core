"use client";
import { longitudeToSign, longitudeToDegreesInSign, dignityBadgeColor } from "@/lib/astro-utils";

type Planet = { name: string; longitude: number; is_retrograde: boolean; dignity: string };
type Panchang = {
  planets?: Planet[];
  tithi_name?: string;
  nakshatra_name?: string;
  yoga_name?: string;
  karana_name?: string;
  vara_name?: string;
  sunrise?: number;
  sunset?: number;
};
type Dasha = { mahadasha_lord?: string; antardasha_lord?: string; pratyantardasha_lord?: string };

type Props = { output: Record<string, unknown> };

export function PanchangamView({ output }: Props) {
  const raw = output.raw as Record<string, unknown> | undefined;
  if (!raw) return <p className="text-muted-foreground text-sm">{output.error ? String(output.error) : "No data"}</p>;

  const panchang = raw.panchang as Panchang | undefined;
  const dasha = raw.dasha as Dasha | undefined;
  const planets = panchang?.planets ?? [];

  return (
    <div className="space-y-6 text-sm">
      {/* Panchanga Elements */}
      {panchang && (
        <section>
          <h4 className="font-semibold text-amber-800 uppercase tracking-wide text-xs mb-3">Panchanga</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Tithi", value: panchang.tithi_name },
              { label: "Nakshatra", value: panchang.nakshatra_name },
              { label: "Yoga", value: panchang.yoga_name },
              { label: "Karana", value: panchang.karana_name },
              { label: "Vara (Day)", value: panchang.vara_name },
            ].filter(({ value }) => !!value).map(({ label, value }) => (
              <div key={label} className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="text-xs text-amber-700 font-medium">{label}</p>
                <p className="font-semibold text-amber-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Planetary Positions */}
      {planets.length > 0 && (
        <section>
          <h4 className="font-semibold text-amber-800 uppercase tracking-wide text-xs mb-2">Planetary Positions</h4>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-1 pr-3">Planet</th>
                <th className="text-left py-1 pr-3">Sign</th>
                <th className="text-left py-1 pr-3">Degrees</th>
                <th className="text-left py-1 pr-3">Dignity</th>
                <th className="text-left py-1">&#8477;</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(p => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-amber-50/30">
                  <td className="py-1.5 pr-3 font-medium">{p.name}</td>
                  <td className="py-1.5 pr-3">{longitudeToSign(p.longitude)}</td>
                  <td className="py-1.5 pr-3 font-mono text-xs">{longitudeToDegreesInSign(p.longitude)}</td>
                  <td className="py-1.5 pr-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${dignityBadgeColor(p.dignity)}`}>{p.dignity}</span>
                  </td>
                  <td className="py-1.5 text-xs">{p.is_retrograde ? "℞" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Dasha */}
      {dasha && (
        <section>
          <h4 className="font-semibold text-amber-800 uppercase tracking-wide text-xs mb-2">Current Dasha</h4>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            {dasha.mahadasha_lord && <p><span className="text-xs text-muted-foreground">Mahadasha:</span> <span className="font-bold">{dasha.mahadasha_lord}</span></p>}
            {dasha.antardasha_lord && <p><span className="text-xs text-muted-foreground">Antardasha:</span> <span className="font-semibold">{dasha.antardasha_lord}</span></p>}
            {dasha.pratyantardasha_lord && <p><span className="text-xs text-muted-foreground">Pratyantardasha:</span> <span className="font-semibold">{dasha.pratyantardasha_lord}</span></p>}
          </div>
        </section>
      )}
    </div>
  );
}
