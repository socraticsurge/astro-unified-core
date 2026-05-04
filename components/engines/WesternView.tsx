"use client";
import { Section } from "@/components/Section";

type PlanetData = {
  sign?: string; position?: number; abs_pos?: number; house?: string;
  retrograde?: boolean; speed?: number; declination?: number;
  quality?: string; element?: string; emoji?: string;
};
type HouseData = { sign?: string; position?: number; abs_pos?: number };
type AspectData = {
  p1: string; p2: string; aspect: string;
  orbit?: number; movement?: string; aspect_degrees?: number;
};
type MetaData = {
  zodiac_type?: string; houses_system?: string; julian_day?: number;
  is_diurnal?: boolean; day_of_week?: string;
  utc_datetime?: string; local_datetime?: string;
};

type Props = { output: Record<string, unknown> };

const SIGN_MAP: Record<string, string> = {
  Ari:"Aries",Tau:"Taurus",Gem:"Gemini",Can:"Cancer",Leo:"Leo",Vir:"Virgo",
  Lib:"Libra",Sco:"Scorpio",Sag:"Sagittarius",Cap:"Capricorn",Aqu:"Aquarius",Pis:"Pisces",
};
const HOUSE_ORDER = [
  "first_house","second_house","third_house","fourth_house","fifth_house","sixth_house",
  "seventh_house","eighth_house","ninth_house","tenth_house","eleventh_house","twelfth_house",
];
const INNER_PLANETS = ["sun","moon","mercury","venus","mars","jupiter","saturn"];
const OUTER_PLANETS = ["uranus","neptune","pluto","chiron","mean_node","true_node"];

function aspectColor(asp: string): string {
  switch (asp) {
    case "conjunction": return "text-yellow-400";
    case "trine": return "text-emerald-400";
    case "sextile": return "text-teal-400";
    case "square": return "text-red-400";
    case "opposition": return "text-orange-400";
    default: return "text-muted-foreground";
  }
}

function fullSign(abbr: string): string {
  return SIGN_MAP[abbr] ?? abbr;
}

function fmtDeg(deg?: number): string {
  if (deg === undefined || deg === null) return "—";
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

export function WesternView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const meta = data.meta as MetaData | undefined;
  const planets = data.planets as Record<string, PlanetData> | undefined;
  const houses = data.houses as Record<string, HouseData> | undefined;
  const aspects = data.aspects as AspectData[] | undefined;

  const accent = "text-indigo-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card = "bg-indigo-950/20 border border-indigo-800/30 rounded-lg p-3";

  return (
    <div>
      {meta && (
        <Section title="Chart Overview" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {[
              { label: "Chart Type", value: meta.is_diurnal !== undefined ? (meta.is_diurnal ? "Day Chart ☀️" : "Night Chart 🌙") : undefined },
              { label: "Zodiac", value: meta.zodiac_type },
              { label: "House System", value: meta.houses_system },
              { label: "Day of Week", value: meta.day_of_week },
              { label: "Local Time", value: meta.local_datetime },
              { label: "UTC Time", value: meta.utc_datetime },
              { label: "Julian Day", value: meta.julian_day?.toFixed(6) },
            ].filter(x => x.value !== undefined).map(({ label, value }) => (
              <div key={label} className={card}>
                <p className="text-xs text-indigo-400/70 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-indigo-200 mt-0.5 break-all">{String(value)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {planets && (
        <Section title="Planetary Positions (Inner Planets + Luminaries)" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg in Sign</th>
                <th className={th}>House</th>
                <th className={th}>Element</th>
                <th className={th}>Quality</th>
                <th className={th}>Speed°/d</th>
                <th className={th}>Decl.</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {INNER_PLANETS.filter(p => planets[p]).map(pKey => {
                const p = planets[pKey];
                return (
                  <tr key={pKey} className={row}>
                    <td className="py-2 pr-3 font-medium capitalize">{pKey} {p.emoji ?? ""}</td>
                    <td className="py-2 pr-3">{fullSign(p.sign ?? "")}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.position)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {p.house?.replace("_House","").replace("_house","") ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.element ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.quality ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.speed?.toFixed(3) ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.declination?.toFixed(2) ?? "—"}°</td>
                    <td className="py-2 font-bold text-orange-400">{p.retrograde ? "℞" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {houses && (
        <Section title="House Cusps" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>House</th>
                <th className={th}>Sign</th>
                <th className={`${th} font-mono`}>Cusp°</th>
              </tr>
            </thead>
            <tbody>
              {HOUSE_ORDER.filter(hk => houses[hk]).map((hk, i) => {
                const h = houses[hk];
                return (
                  <tr key={hk} className={row}>
                    <td className="py-2 pr-3 font-bold text-indigo-400">{i + 1}</td>
                    <td className="py-2 pr-3">{fullSign(h.sign ?? "")}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{fmtDeg(h.position)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {aspects && aspects.length > 0 && (
        <Section title="Aspects" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet 1</th>
                <th className={th}>Aspect</th>
                <th className={th}>Planet 2</th>
                <th className={th}>Orb</th>
                <th className={th}>Movement</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => (
                <tr key={i} className={row}>
                  <td className="py-2 pr-3 font-medium capitalize">{a.p1}</td>
                  <td className={`py-2 pr-3 font-medium capitalize ${aspectColor(a.aspect)}`}>{a.aspect}</td>
                  <td className="py-2 pr-3 font-medium capitalize">{a.p2}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{a.orbit?.toFixed(2)}°</td>
                  <td className="py-2 text-xs text-muted-foreground">{a.movement ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {planets && OUTER_PLANETS.some(p => planets[p]) && (
        <Section title="Outer Planets & Nodes" accent={accent} defaultOpen={false}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Point</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg in Sign</th>
                <th className={th}>House</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {OUTER_PLANETS.filter(p => planets[p]).map(pKey => {
                const p = planets[pKey];
                return (
                  <tr key={pKey} className={row}>
                    <td className="py-2 pr-3 font-medium capitalize">{pKey.replace("_", " ")} {p.emoji ?? ""}</td>
                    <td className="py-2 pr-3">{fullSign(p.sign ?? "")}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.position)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.house?.replace("_House","").replace("_house","") ?? "—"}</td>
                    <td className="py-2 font-bold text-orange-400">{p.retrograde ? "℞" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
