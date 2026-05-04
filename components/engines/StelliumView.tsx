"use client";
import { Section } from "@/components/Section";

type CelestialPosition = {
  name: string;
  type?: string;
  longitude?: number;
  latitude?: number;
  sign?: string;
  sign_degree?: number;
  is_retrograde?: boolean;
};

type AspectData = {
  object1: string;
  object2: string;
  aspect: string;
  orb?: number;
};

type HouseCusps = {
  cusps?: number[];
  signs?: string[];
  sign_degrees?: number[];
};

type RulerPosition = {
  name: string;
  sign?: string;
  sign_degree?: number;
  longitude?: number;
  is_retrograde?: boolean;
};

type ProfectionResult = {
  source_point?: string;
  source_sign?: string;
  source_house?: number;
  units?: number;
  unit_type?: string;
  profected_house?: number;
  profected_sign?: string;
  ruler?: string;
  ruler_house?: number;
  ruler_modern?: string | null;
  ruler_position?: RulerPosition;
  planets_in_house?: string[];
};

type ArabicPart = {
  name: string;
  sign?: string;
  sign_degree?: number;
  longitude?: number;
};

type VocMoon = {
  is_void?: boolean;
  moon_longitude?: number;
  moon_sign?: string;
  void_until?: string;
  ends_by?: string;
  next_aspect?: string | null;
  next_planet?: string | null;
  next_sign?: string;
  ingress_time?: string;
  aspect_mode?: string;
};

type StelliumData = {
  datetime?: { utc?: string; julian_date?: number };
  location?: { latitude?: number; longitude?: number; name?: string };
  house_systems?: Record<string, HouseCusps>;
  default_house_system?: string;
  house_placements?: Record<string, Record<string, number>>;
  positions?: CelestialPosition[];
  aspects?: AspectData[];
  sect?: string;
  voc_moon?: boolean | VocMoon | null;
  profections_now?: ProfectionResult[] | { error: string };
  arabic_parts?: ArabicPart[] | { error: string };
  query_date?: string;
};

type Props = { output: Record<string, unknown> };

const ASPECT_COLOR: Record<string, string> = {
  Conjunction: "text-yellow-400",
  Trine: "text-emerald-400",
  Sextile: "text-teal-400",
  Square: "text-red-400",
  Opposition: "text-orange-400",
  conjunction: "text-yellow-400",
  trine: "text-emerald-400",
  sextile: "text-teal-400",
  square: "text-red-400",
  opposition: "text-orange-400",
};

function fmtDeg(deg?: number | null): string {
  if (deg === undefined || deg === null) return "—";
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2, "0")}′`;
}

function fmtLon(lon?: number | null): string {
  if (lon === undefined || lon === null) return "—";
  return lon.toFixed(4) + "°";
}

export function StelliumView({ output }: Props) {
  const data = output.data as StelliumData | undefined;
  if (!data)
    return (
      <p className="text-muted-foreground text-sm p-4">
        {output.error ? String(output.error) : "No data"}
      </p>
    );

  const accent = "text-rose-400";
  const card = "bg-rose-950/20 border border-rose-800/30 rounded-lg p-3";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const row = "border-b border-white/10 hover:bg-white/5";

  const positions = data.positions ?? [];
  const planets = positions.filter((p) => p.type === "planet");
  const anglesAndPoints = positions.filter((p) => p.type !== "planet" && p.type !== "arabic_part");
  const aspects = data.aspects ?? [];

  const defaultHouseSystem = data.default_house_system ?? "Placidus";
  const houseCusps = data.house_systems?.[defaultHouseSystem];

  const profectionsRaw = data.profections_now;
  const profections = Array.isArray(profectionsRaw) ? profectionsRaw : [];

  const arabicPartsRaw = data.arabic_parts;
  const arabicParts = Array.isArray(arabicPartsRaw) ? arabicPartsRaw : [];

  const yearProf = profections[0] ?? null;
  const monthProf = profections[1] ?? null;

  function renderProfectionCard(prof: ProfectionResult, label: string) {
    const age = prof.unit_type === "year" ? `Age ${prof.units}` : "";
    return (
      <div className="space-y-3">
        <div className={card}>
          <p className="text-xs text-rose-400/70 uppercase tracking-wide mb-1">
            {label} {age ? `— ${age}` : ""}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Source Point</span>
              <p className="font-medium">{prof.source_point ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Source Sign / House</span>
              <p className="font-medium">
                {prof.source_sign ?? "—"} / H{prof.source_house ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Profected Sign / House</span>
              <p className="font-medium text-rose-300">
                {prof.profected_sign ?? "—"} / H{prof.profected_house ?? "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Time Lord (Ruler)</span>
              <p className="font-medium text-rose-300">{prof.ruler ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Ruler in House</span>
              <p className="font-medium">H{prof.ruler_house ?? "—"}</p>
            </div>
            {prof.ruler_modern && (
              <div>
                <span className="text-muted-foreground text-xs">Modern Ruler</span>
                <p className="font-medium">{prof.ruler_modern}</p>
              </div>
            )}
          </div>
        </div>
        {prof.ruler_position && (
          <div className={card}>
            <p className="text-xs text-rose-400/70 uppercase tracking-wide mb-1">
              Ruler Position ({prof.ruler_position.name})
            </p>
            <p className="text-sm font-medium">
              {prof.ruler_position.sign} {fmtDeg(prof.ruler_position.sign_degree)}
              {prof.ruler_position.is_retrograde && (
                <span className="text-orange-400 ml-2">℞</span>
              )}
            </p>
          </div>
        )}
        {prof.planets_in_house && prof.planets_in_house.length > 0 && (
          <div className={card}>
            <p className="text-xs text-rose-400/70 uppercase tracking-wide mb-1">
              Planets in Profected House
            </p>
            <p className="text-sm">{prof.planets_in_house.join(", ")}</p>
          </div>
        )}
        {(!prof.planets_in_house || prof.planets_in_house.length === 0) && (
          <div className={card}>
            <p className="text-xs text-muted-foreground">No planets in the profected house.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* 1. Chart Overview */}
      <Section title="Chart Overview" accent={accent}>
        <p className="text-xs text-muted-foreground mb-3 mt-1">
          Stellium provides a rich Hellenistic/Western chart with profections, Arabic Parts, sect,
          and VoC Moon analysis. Uses the Tropical zodiac.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Sect",
              value: data.sect
                ? data.sect === "day"
                  ? "Day Chart"
                  : "Night Chart"
                : undefined,
            },
            { label: "Zodiac", value: "Tropical" },
            { label: "House System", value: defaultHouseSystem },
            { label: "UTC Datetime", value: data.datetime?.utc },
            { label: "Query Date", value: data.query_date },
            { label: "Location", value: data.location?.name },
          ]
            .filter((x) => x.value !== undefined)
            .map(({ label, value }) => (
              <div key={label} className={card}>
                <p className="text-xs text-rose-400/70 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-rose-200 mt-0.5 break-all">
                  {String(value)}
                </p>
              </div>
            ))}
        </div>
      </Section>

      {/* 2. Planetary Positions */}
      {planets.length > 0 && (
        <Section title="Planetary Positions" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Name</th>
                <th className={th}>Sign</th>
                <th className={th}>Sign Degree</th>
                <th className={th}>Longitude</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((p) => (
                <tr key={p.name} className={row}>
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">{p.sign ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.sign_degree)}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                    {fmtLon(p.longitude)}
                  </td>
                  <td className="py-2 font-bold text-orange-400">{p.is_retrograde ? "℞" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* 3. Angles & Points */}
      {anglesAndPoints.length > 0 && (
        <Section title="Angles & Points" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Name</th>
                <th className={th}>Type</th>
                <th className={th}>Sign</th>
                <th className={th}>Sign Degree</th>
                <th className={th}>Longitude</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {anglesAndPoints.map((p) => (
                <tr key={p.name} className={row}>
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground capitalize">{p.type}</td>
                  <td className="py-2 pr-3">{p.sign ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.sign_degree)}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                    {fmtLon(p.longitude)}
                  </td>
                  <td className="py-2 font-bold text-orange-400">{p.is_retrograde ? "℞" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* 4. Aspects */}
      {aspects.length > 0 && (
        <Section title="Aspects" accent={accent}>
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
                  <td className="py-2 pr-3 font-medium">{a.object1}</td>
                  <td
                    className={`py-2 pr-3 font-medium capitalize ${
                      ASPECT_COLOR[a.aspect] ?? "text-muted-foreground"
                    }`}
                  >
                    {a.aspect}
                  </td>
                  <td className="py-2 pr-3 font-medium">{a.object2}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">
                    {a.orb !== undefined ? a.orb.toFixed(2) + "°" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* 5. Annual Profection */}
      {yearProf && (
        <Section title="Annual Profection" accent={accent}>
          {renderProfectionCard(yearProf, "Annual Profection")}
        </Section>
      )}

      {/* 6. Monthly Profection */}
      {monthProf && (
        <Section title="Monthly Profection" accent={accent} defaultOpen={false}>
          {renderProfectionCard(monthProf, "Monthly Profection")}
        </Section>
      )}

      {/* 7. Arabic Parts / Hermetic Lots */}
      {arabicParts.length > 0 && (
        <Section title="Arabic Parts / Hermetic Lots" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Name</th>
                <th className={th}>Sign</th>
                <th className={th}>Sign Degree</th>
                <th className={th}>Longitude</th>
              </tr>
            </thead>
            <tbody>
              {arabicParts.map((p) => {
                const highlight =
                  p.name === "Part of Fortune" || p.name === "Part of Spirit";
                return (
                  <tr
                    key={p.name}
                    className={`${row} ${highlight ? "bg-rose-950/30" : ""}`}
                  >
                    <td
                      className={`py-2 pr-3 font-medium ${
                        highlight ? "text-rose-300" : ""
                      }`}
                    >
                      {p.name}
                      {highlight && (
                        <span className="ml-1 text-xs text-rose-400/60">★</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{p.sign ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.sign_degree)}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {fmtLon(p.longitude)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* 8. Void of Course Moon */}
      <Section title="Void of Course Moon" accent={accent} defaultOpen={false}>
        {data.voc_moon === null || data.voc_moon === undefined ? (
          <p className="text-sm text-muted-foreground mt-1">VoC Moon data unavailable.</p>
        ) : typeof data.voc_moon === "boolean" ? (
          <p className="text-sm mt-1">
            Moon is{" "}
            <span className={data.voc_moon ? "text-orange-400 font-medium" : "text-emerald-400 font-medium"}>
              {data.voc_moon ? "Void of Course" : "not Void of Course"}
            </span>
          </p>
        ) : (
          <div className="space-y-2 mt-1">
            <div className={card}>
              <p className="text-xs text-rose-400/70 uppercase tracking-wide mb-2">Status</p>
              <p className={`text-sm font-semibold ${(data.voc_moon as VocMoon).is_void ? "text-orange-400" : "text-emerald-400"}`}>
                {(data.voc_moon as VocMoon).is_void ? "Void of Course" : "Not Void of Course"}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Moon Sign", value: (data.voc_moon as VocMoon).moon_sign },
                {
                  label: "Moon Longitude",
                  value: (data.voc_moon as VocMoon).moon_longitude?.toFixed(4) + "°",
                },
                { label: "Void Until", value: (data.voc_moon as VocMoon).void_until },
                { label: "Ends By", value: (data.voc_moon as VocMoon).ends_by },
                { label: "Next Sign", value: (data.voc_moon as VocMoon).next_sign },
                { label: "Aspect Mode", value: (data.voc_moon as VocMoon).aspect_mode },
                { label: "Next Planet", value: (data.voc_moon as VocMoon).next_planet ?? "None" },
                { label: "Next Aspect", value: (data.voc_moon as VocMoon).next_aspect ?? "None" },
              ]
                .filter((x) => x.value !== undefined)
                .map(({ label, value }) => (
                  <div key={label} className={card}>
                    <p className="text-xs text-rose-400/70 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-medium text-rose-200 mt-0.5 break-all">
                      {String(value)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Section>

      {/* 9. House Cusps */}
      {houseCusps && (
        <Section title={`House Cusps (${defaultHouseSystem})`} accent={accent} defaultOpen={false}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>House</th>
                <th className={th}>Sign</th>
                <th className={th}>Sign Degree</th>
                <th className={th}>Longitude</th>
              </tr>
            </thead>
            <tbody>
              {(houseCusps.cusps ?? []).map((cusp, i) => (
                <tr key={i} className={row}>
                  <td className="py-2 pr-3 font-bold text-rose-400">{i + 1}</td>
                  <td className="py-2 pr-3">{houseCusps.signs?.[i] ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {fmtDeg(houseCusps.sign_degrees?.[i])}
                  </td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">
                    {fmtLon(cusp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
