"use client";
import { Section } from "@/components/Section";
import { longitudeToSign, longitudeToDegreesInSign, dignityBadgeColor } from "@/lib/astro-utils";

type Planet = {
  name: string; longitude: number; latitude: number; distance: number;
  speed: number; is_retrograde: boolean; is_combust: boolean; dignity: string;
};
type Muhurat = { name: string; start: number; end: number };
type Panchang = {
  planets?: Planet[];
  tithi_index?: number; tithi_name?: string; tithi_start_time?: number; tithi_end_time?: number;
  nakshatra_index?: number; nakshatra_name?: string; nakshatra_start_time?: number; nakshatra_end_time?: number;
  yoga_index?: number; yoga_name?: string; yoga_start_time?: number; yoga_end_time?: number;
  karana_index?: number; karana_name?: string; karana_start_time?: number; karana_end_time?: number;
  vara_name?: string;
  sunrise?: number; sunset?: number;
  ascendant?: number; mc?: number; ayanamsha_value?: number;
  muhurats?: Record<string, Muhurat>;
};
type Houses = {
  ascendant?: number; mc?: number; armc?: number; vertex?: number;
  equatorial_ascendant?: number; co_ascendant1?: number; co_ascendant2?: number; polar_ascendant?: number;
  cusps?: Record<string, number>;
};
type Dasha = {
  mahadasha?: string; antardasha?: string; pratyantardasha?: string;
  mahadasha_end_date?: number; antardasha_end_date?: number; pratyantardasha_end_date?: number;
  nakshatra_name?: string; nakshatra_pada?: number;
};

type Props = { output: Record<string, unknown> };

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function PanchangamView({ output }: Props) {
  const raw = output.raw as Record<string, unknown> | undefined;
  if (!raw) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const panchang = raw.panchang as Panchang | undefined;
  const dasha = raw.dasha as Dasha | undefined;
  const houses = raw.houses as Houses | undefined;
  const planets = panchang?.planets ?? [];
  const muhurats = panchang?.muhurats ?? {};
  const libVersion = raw.library_version as string | undefined;
  const birthJd = raw.birth_julian_day as number | undefined;

  const accent = "text-amber-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card = "bg-amber-950/20 border border-amber-800/30 rounded-lg p-3";

  return (
    <div>
      {panchang && (
        <Section title="Panchanga" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Vara (Day)", value: panchang.vara_name },
              { label: "Tithi", value: panchang.tithi_name, sub: panchang.tithi_index !== undefined ? `#${panchang.tithi_index}` : undefined },
              { label: "Nakshatra", value: panchang.nakshatra_name, sub: panchang.nakshatra_index !== undefined ? `#${panchang.nakshatra_index}` : undefined },
              { label: "Yoga", value: panchang.yoga_name, sub: panchang.yoga_index !== undefined ? `#${panchang.yoga_index}` : undefined },
              { label: "Karana", value: panchang.karana_name, sub: panchang.karana_index !== undefined ? `#${panchang.karana_index}` : undefined },
            ].filter(x => x.value).map(({ label, value, sub }) => (
              <div key={label} className={card}>
                <p className="text-xs text-amber-400/70 font-medium uppercase tracking-wide">{label}</p>
                <p className="font-semibold text-amber-200 mt-0.5">{value}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </div>
            ))}
          </div>
          {/* Timings */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {panchang.sunrise && (
              <div className={card}><p className="text-xs text-amber-400/70 uppercase tracking-wide">Sunrise</p><p className="font-semibold text-amber-200">{fmtTime(panchang.sunrise)}</p></div>
            )}
            {panchang.sunset && (
              <div className={card}><p className="text-xs text-amber-400/70 uppercase tracking-wide">Sunset</p><p className="font-semibold text-amber-200">{fmtTime(panchang.sunset)}</p></div>
            )}
          </div>
          {/* Tithi / Nakshatra / Yoga / Karana timing windows */}
          <table className="w-full text-xs border-collapse mt-3">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Element</th>
                <th className={th}>Starts</th>
                <th className={th}>Ends</th>
              </tr>
            </thead>
            <tbody>
              {panchang.tithi_name && panchang.tithi_start_time && (
                <tr className={row}>
                  <td className="py-1.5 pr-3 font-medium">Tithi ({panchang.tithi_name})</td>
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">{fmtTime(panchang.tithi_start_time)}</td>
                  <td className="py-1.5 font-mono text-muted-foreground">{panchang.tithi_end_time ? fmtTime(panchang.tithi_end_time) : "—"}</td>
                </tr>
              )}
              {panchang.nakshatra_name && panchang.nakshatra_start_time && (
                <tr className={row}>
                  <td className="py-1.5 pr-3 font-medium">Nakshatra ({panchang.nakshatra_name})</td>
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">{fmtTime(panchang.nakshatra_start_time)}</td>
                  <td className="py-1.5 font-mono text-muted-foreground">{panchang.nakshatra_end_time ? fmtTime(panchang.nakshatra_end_time) : "—"}</td>
                </tr>
              )}
              {panchang.yoga_name && panchang.yoga_start_time && (
                <tr className={row}>
                  <td className="py-1.5 pr-3 font-medium">Yoga ({panchang.yoga_name})</td>
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">{fmtTime(panchang.yoga_start_time)}</td>
                  <td className="py-1.5 font-mono text-muted-foreground">{panchang.yoga_end_time ? fmtTime(panchang.yoga_end_time) : "—"}</td>
                </tr>
              )}
              {panchang.karana_name && panchang.karana_start_time && (
                <tr className={row}>
                  <td className="py-1.5 pr-3 font-medium">Karana ({panchang.karana_name})</td>
                  <td className="py-1.5 pr-3 font-mono text-muted-foreground">{fmtTime(panchang.karana_start_time)}</td>
                  <td className="py-1.5 font-mono text-muted-foreground">{panchang.karana_end_time ? fmtTime(panchang.karana_end_time) : "—"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      )}

      {panchang && (panchang.ascendant !== undefined || panchang.mc !== undefined) && (
        <Section title="Ascendant & Midheaven" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {panchang.ascendant !== undefined && (
              <div className={card}>
                <p className="text-xs text-amber-400/70 uppercase tracking-wide">Ascendant (Lagna)</p>
                <p className="font-bold text-amber-200">{longitudeToSign(panchang.ascendant)}</p>
                <p className="text-xs font-mono text-muted-foreground">{longitudeToDegreesInSign(panchang.ascendant)} ({panchang.ascendant.toFixed(2)}°)</p>
              </div>
            )}
            {panchang.mc !== undefined && (
              <div className={card}>
                <p className="text-xs text-amber-400/70 uppercase tracking-wide">Midheaven (MC)</p>
                <p className="font-bold text-amber-200">{longitudeToSign(panchang.mc)}</p>
                <p className="text-xs font-mono text-muted-foreground">{longitudeToDegreesInSign(panchang.mc)} ({panchang.mc.toFixed(2)}°)</p>
              </div>
            )}
            {panchang.ayanamsha_value !== undefined && (
              <div className={card}>
                <p className="text-xs text-amber-400/70 uppercase tracking-wide">Ayanamsha</p>
                <p className="font-bold text-amber-200 font-mono">{panchang.ayanamsha_value.toFixed(4)}°</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {planets.length > 0 && (
        <Section title="Planetary Positions" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg</th>
                <th className={th}>Dignity</th>
                <th className={th}>Speed°/d</th>
                <th className={th}>Lat</th>
                <th className={th}>℞</th>
                <th className={th}>Combust</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(p => (
                <tr key={p.name} className={row}>
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">{longitudeToSign(p.longitude)}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{longitudeToDegreesInSign(p.longitude)}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${dignityBadgeColor(p.dignity)}`}>{p.dignity}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.speed.toFixed(3)}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.latitude.toFixed(3)}</td>
                  <td className="py-2 pr-3 font-bold text-orange-400">{p.is_retrograde ? "℞" : ""}</td>
                  <td className="py-2 text-xs text-red-400">{p.is_combust ? "☉" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {Object.keys(muhurats).length > 0 && (
        <Section title="Muhurats (Auspicious & Inauspicious Times)" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Muhurat</th>
                <th className={th}>Start</th>
                <th className={th}>End</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(muhurats).map(([key, m]) => (
                <tr key={key} className={row}>
                  <td className="py-2 pr-3 font-medium">{m.name}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{fmtTime(m.start)}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{fmtTime(m.end)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {houses && (
        <Section title="House Cusps (Whole Sign)" accent={accent}>
          <div className="space-y-3 mt-2">
            {/* Sensitive points */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Ascendant", val: houses.ascendant },
                { label: "Midheaven (MC)", val: houses.mc },
                { label: "ARMC", val: houses.armc },
                { label: "Vertex", val: houses.vertex },
                { label: "Equatorial Asc", val: houses.equatorial_ascendant },
                { label: "Co-Asc 1", val: houses.co_ascendant1 },
                { label: "Co-Asc 2", val: houses.co_ascendant2 },
                { label: "Polar Asc", val: houses.polar_ascendant },
              ].filter(x => x.val !== undefined).map(({ label, val }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded p-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{longitudeToSign(val!)} <span className="font-mono text-xs text-muted-foreground">{longitudeToDegreesInSign(val!)}</span></p>
                </div>
              ))}
            </div>
            {/* House cusps table */}
            {houses.cusps && (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className={th}>House</th>
                    <th className={th}>Cusp Sign</th>
                    <th className={`${th} font-mono`}>Cusp°</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(houses.cusps).map(([idx, lon]) => (
                    <tr key={idx} className={row}>
                      <td className="py-2 pr-3 font-bold text-amber-400">{parseInt(idx) + 1}</td>
                      <td className="py-2 pr-3">{longitudeToSign(lon)}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{longitudeToDegreesInSign(lon)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Section>
      )}

      {dasha && (
        <Section title="Vimshottari Dasha — Current Period" accent={accent}>
          <div className="space-y-3 mt-2">
            {dasha.nakshatra_name && (
              <p className="text-xs text-muted-foreground">
                Moon Nakshatra: <span className="text-amber-300 font-medium">{dasha.nakshatra_name}</span>
                {dasha.nakshatra_pada ? ` · Pada ${dasha.nakshatra_pada}` : ""}
              </p>
            )}
            {dasha.mahadasha && (
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-4">
                <p className="text-xs text-amber-400/70 uppercase tracking-widest">Mahadasha</p>
                <p className="text-2xl font-bold text-amber-200">{dasha.mahadasha}</p>
                {dasha.mahadasha_end_date && <p className="text-xs text-muted-foreground mt-1">Ends: {fmtDate(dasha.mahadasha_end_date)}</p>}
              </div>
            )}
            {dasha.antardasha && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 ml-4">
                <p className="text-xs text-amber-400/70 uppercase tracking-widest">Antardasha</p>
                <p className="text-lg font-semibold text-amber-300">{dasha.antardasha}</p>
                {dasha.antardasha_end_date && <p className="text-xs text-muted-foreground">Ends: {fmtDate(dasha.antardasha_end_date)}</p>}
              </div>
            )}
            {dasha.pratyantardasha && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 ml-8">
                <p className="text-xs text-amber-400/70 uppercase tracking-widest">Pratyantardasha</p>
                <p className="text-base font-medium text-amber-200">{dasha.pratyantardasha}</p>
                {dasha.pratyantardasha_end_date && <p className="text-xs text-muted-foreground">Ends: {fmtDate(dasha.pratyantardasha_end_date)}</p>}
              </div>
            )}
          </div>
        </Section>
      )}

      {(birthJd !== undefined || libVersion) && (
        <Section title="Technical Details" accent={accent} defaultOpen={false}>
          <div className="space-y-1 mt-2 text-sm text-muted-foreground">
            {birthJd !== undefined && <p>Birth Julian Day: <span className="font-mono">{birthJd.toFixed(6)}</span></p>}
            {libVersion && <p>Library Version: <span className="font-mono">{libVersion}</span></p>}
          </div>
        </Section>
      )}
    </div>
  );
}
