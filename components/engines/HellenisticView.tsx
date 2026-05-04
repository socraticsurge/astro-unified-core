"use client";
import { Section } from "@/components/Section";

type PlanetObj = {
  id?: string; sign?: string; lon?: number; signlon?: number;
  lat?: number; speed?: number; retrograde?: boolean;
  element?: string; gender?: string;
};
type HouseObj = { id?: string; sign?: string; lon?: number; signlon?: number };
type AspectObj = { p1?: string; p2?: string; type?: string; orb?: number; movement?: string };
type Lots = { pars_fortuna?: { lon?: number; sign?: string; formula?: string } };

type Props = { output: Record<string, unknown> };

const DOMICILE: Record<string, string[]> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mercury: ["Gemini","Virgo"],
  Venus: ["Taurus","Libra"], Mars: ["Aries","Scorpio"],
  Jupiter: ["Sagittarius","Pisces"], Saturn: ["Capricorn","Aquarius"],
};
const EXALTATION: Record<string, string> = {
  Sun: "Aries", Moon: "Taurus", Mercury: "Virgo", Venus: "Pisces",
  Mars: "Capricorn", Jupiter: "Cancer", Saturn: "Libra",
};
const FALL: Record<string, string> = {
  Sun: "Libra", Moon: "Scorpio", Mercury: "Pisces", Venus: "Virgo",
  Mars: "Cancer", Jupiter: "Capricorn", Saturn: "Aries",
};
const DETRIMENT: Record<string, string[]> = {
  Sun: ["Aquarius"], Moon: ["Capricorn"], Mercury: ["Sagittarius","Pisces"],
  Venus: ["Aries","Scorpio"], Mars: ["Taurus","Libra"],
  Jupiter: ["Gemini","Virgo"], Saturn: ["Cancer","Leo"],
};

function essentialDignity(planet: string, sign: string): { label: string; color: string } {
  if (DOMICILE[planet]?.includes(sign)) return { label: "Domicile", color: "text-emerald-400 bg-emerald-950/40 border-emerald-700/50" };
  if (EXALTATION[planet] === sign) return { label: "Exaltation", color: "text-blue-400 bg-blue-950/40 border-blue-700/50" };
  if (FALL[planet] === sign) return { label: "Fall", color: "text-orange-400 bg-orange-950/40 border-orange-700/50" };
  if (DETRIMENT[planet]?.includes(sign)) return { label: "Detriment", color: "text-red-400 bg-red-950/40 border-red-700/50" };
  return { label: "Peregrine", color: "text-gray-400 bg-gray-800/40 border-gray-600/50" };
}

function aspectColor(type?: string): string {
  switch (type) {
    case "conjunction": return "text-yellow-400";
    case "trine": return "text-emerald-400";
    case "sextile": return "text-teal-400";
    case "square": return "text-red-400";
    case "opposition": return "text-orange-400";
    default: return "text-muted-foreground";
  }
}

function fmtDeg(deg?: number): string {
  if (deg === undefined || deg === null) return "—";
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

const TRADITIONAL = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"];
const HOUSE_IDS = ["House1","House2","House3","House4","House5","House6",
                   "House7","House8","House9","House10","House11","House12"];

export function HellenisticView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const meta = data.meta as { is_diurnal?: boolean; utc_datetime?: string; house_system?: string } | undefined;
  const planets = data.planets as Record<string, PlanetObj> | undefined;
  const houses = data.houses as Record<string, HouseObj> | undefined;
  const aspects = data.aspects as AspectObj[] | undefined;
  const lots = data.lots as Lots | undefined;

  const accent = "text-purple-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card = "bg-purple-950/20 border border-purple-800/30 rounded-lg p-3";

  return (
    <div>
      {meta && (
        <Section title="Chart Overview" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Chart Sect", value: meta.is_diurnal !== undefined ? (meta.is_diurnal ? "Day Chart (Solar)" : "Night Chart (Lunar)") : undefined },
              { label: "House System", value: meta.house_system },
              { label: "UTC Moment", value: meta.utc_datetime },
            ].filter(x => x.value !== undefined).map(({ label, value }) => (
              <div key={label} className={card}>
                <p className="text-xs text-purple-400/70 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-purple-200 mt-0.5">{String(value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Hellenistic astrology uses Whole Sign or Placidus houses, emphasizes sect (day/night), essential dignities (Domicile, Exaltation, Fall, Detriment), and the Hermetic Lots.
          </p>
        </Section>
      )}

      {planets && (
        <Section title="Planetary Positions — Essential Dignities" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg</th>
                <th className={th}>Dignity</th>
                <th className={th}>Speed</th>
                <th className={th}>Lat</th>
                <th className={th}>Element</th>
                <th className={th}>Gender</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {TRADITIONAL.filter(p => planets[p]).map(pKey => {
                const p = planets[pKey];
                const dig = essentialDignity(pKey, p.sign ?? "");
                return (
                  <tr key={pKey} className={row}>
                    <td className="py-2 pr-3 font-medium">{pKey}</td>
                    <td className="py-2 pr-3">{p.sign}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.signlon)}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${dig.color}`}>{dig.label}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.speed?.toFixed(3) ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.lat?.toFixed(3) ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground capitalize">{p.element ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground capitalize">{p.gender ?? "—"}</td>
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
              {HOUSE_IDS.filter(hk => houses[hk]).map((hk, i) => {
                const h = houses[hk];
                return (
                  <tr key={hk} className={row}>
                    <td className="py-2 pr-3 font-bold text-purple-400">{i + 1}</td>
                    <td className="py-2 pr-3">{h.sign}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{fmtDeg(h.signlon)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {aspects && aspects.length > 0 && (
        <Section title="Aspects (Traditional Planets)" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet 1</th>
                <th className={th}>Aspect</th>
                <th className={th}>Planet 2</th>
                <th className={th}>Orb</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => (
                <tr key={i} className={row}>
                  <td className="py-2 pr-3 font-medium">{a.p1}</td>
                  <td className={`py-2 pr-3 font-medium capitalize ${aspectColor(a.type)}`}>{a.type}</td>
                  <td className="py-2 pr-3 font-medium">{a.p2}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{a.orb?.toFixed(2)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {lots?.pars_fortuna && (
        <Section title="Hermetic Lots" accent={accent}>
          <div className={`${card} mt-2 space-y-2`}>
            <div>
              <p className="text-xs text-purple-400/70 uppercase tracking-wide">Pars Fortuna (Lot of Fortune)</p>
              <p className="text-xl font-bold text-purple-200 mt-1">{lots.pars_fortuna.sign}</p>
              <p className="text-sm font-mono text-muted-foreground">{lots.pars_fortuna.lon?.toFixed(4)}°</p>
              <p className="text-xs text-muted-foreground mt-1">Formula: {lots.pars_fortuna.formula}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Lot of Fortune indicates areas of material prosperity and body vitality. Computed from ASC, Sun, Moon positions — formula inverts for night charts.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
