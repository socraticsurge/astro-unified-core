"use client";
import { Section } from "@/components/Section";
import { longitudeToSign, longitudeToDegreesInSign, dignityBadgeColor } from "@/lib/astro-utils";

type Planet = { name: string; longitude: number; is_retrograde: boolean; dignity: string };
type Panchang = {
  planets?: Planet[];
  tithi_name?: string; nakshatra_name?: string; yoga_name?: string;
  karana_name?: string; vara_name?: string;
};
type Dasha = { mahadasha_lord?: string; antardasha_lord?: string; pratyantardasha_lord?: string };

type Props = { output: Record<string, unknown> };

export function PanchangamView({ output }: Props) {
  const raw = output.raw as Record<string, unknown> | undefined;
  if (!raw) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const panchang = raw.panchang as Panchang | undefined;
  const dasha = raw.dasha as Dasha | undefined;
  const planets = panchang?.planets ?? [];
  const accent = "text-amber-800";

  return (
    <div>
      {panchang && (
        <Section title="Panchanga" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Tithi", value: panchang.tithi_name },
              { label: "Nakshatra", value: panchang.nakshatra_name },
              { label: "Yoga", value: panchang.yoga_name },
              { label: "Karana", value: panchang.karana_name },
              { label: "Vara (Day)", value: panchang.vara_name },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-amber-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
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
                <th className="text-left py-1.5 pr-4 font-medium">Dignity</th>
                <th className="text-left py-1.5 font-medium">&#8477;</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(p => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-amber-50/40">
                  <td className="py-2 pr-4 font-medium">{p.name}</td>
                  <td className="py-2 pr-4">{longitudeToSign(p.longitude)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{longitudeToDegreesInSign(p.longitude)}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${dignityBadgeColor(p.dignity)}`}>{p.dignity}</span>
                  </td>
                  <td className="py-2 text-sm font-semibold text-orange-600">{p.is_retrograde ? "℞" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {dasha && (dasha.mahadasha_lord || dasha.antardasha_lord) && (
        <Section title="Current Dasha" accent={accent}>
          <div className="space-y-2 mt-1">
            {dasha.mahadasha_lord && (
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Mahadasha</span>
              <p className="text-xl font-bold text-amber-900">{dasha.mahadasha_lord}</p></div>
            )}
            {dasha.antardasha_lord && (
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Antardasha</span>
              <p className="text-base font-semibold text-amber-800">{dasha.antardasha_lord}</p></div>
            )}
            {dasha.pratyantardasha_lord && (
              <div><span className="text-xs text-muted-foreground uppercase tracking-wide">Pratyantardasha</span>
              <p className="text-sm text-amber-700">{dasha.pratyantardasha_lord}</p></div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}
