"use client";
import { SectionShell } from "./SectionShell";
import type { ChartEntry } from "./ExplainerModal";

const slug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type Props = {
  output: Record<string, unknown>;
  /**
   * Server-loaded explainers, keyed by `section_in_view`. Pre-rendered
   * to HTML so the client doesn't bundle a markdown parser.
   */
  explainers: Record<string, SectionExplainer>;
};

const DIGNITY_COLOR: Record<string, string> = {
  exalted:     "text-emerald-400 bg-emerald-950/40 border border-emerald-700/50",
  own:         "text-blue-400 bg-blue-950/40 border border-blue-700/50",
  mooltrikona: "text-blue-300 bg-blue-950/30 border border-blue-700/40",
  friend:      "text-teal-400 bg-teal-950/40 border border-teal-700/50",
  neutral:     "text-gray-400 bg-gray-800/40 border border-gray-600/50",
  enemy:       "text-orange-400 bg-orange-950/40 border border-orange-700/50",
  debilitated: "text-red-400 bg-red-950/40 border border-red-700/50",
};

const SIGNS_ORDER = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

const MAJOR_YOGAS = new Set([
  "Malavya Yoga","Shasha Yoga","Bhadra Yoga","Hamsa Yoga","Ruchaka Yoga",
  "Gajakesari Yoga","Raj Yoga","Lakshmi Yoga","Adhi Yoga",
]);

const DIV_LABELS: Record<string, string> = {
  d2_sign:  "D2 Hora",
  d3_sign:  "D3 Drekkana",
  d4_sign:  "D4 Chaturthamsha",
  d7_sign:  "D7 Saptamsha",
  d9_sign:  "D9 Navamsa",
  d10_sign: "D10 Dasamsa",
  d12_sign: "D12 Dvadasamsa",
  d16_sign: "D16 Shodasamsa",
  d20_sign: "D20 Vimshamsa",
  d24_sign: "D24 Chaturvimshamsa",
  d27_sign: "D27 Saptavimshamsa",
  d30_sign: "D30 Trimshamsa",
  d40_sign: "D40 Khavedamsa",
  d60_sign: "D60 Shastiamsa",
};

const PLANET_ORDER = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

export function DashaflowView({ output, explainers }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) {
    return (
      <p className="text-muted-foreground text-sm p-4">
        {output.error ? String(output.error) : "No data"}
      </p>
    );
  }

  const accent = "text-green-400";
  const row    = "border-b border-white/10 hover:bg-white/5";
  const th     = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card   = "bg-green-950/20 border border-green-800/30 rounded-lg p-3";

  const meta = data.metadata as {
    ayanamsha?: string; ayanamsha_degrees?: number; query_date?: string;
    coordinates?: { lat: number; lon: number }; timezone?: string; dob?: string; time?: string;
  } | undefined;

  const panchang = data.panchang as {
    tithi?: { number?: number; name?: string; paksha?: string };
    vara?: { name?: string; lord?: string };
    nakshatra?: { name?: string; pada?: number; lord?: string };
    yoga?: { index?: number; name?: string };
    karana?: string;
  } | undefined;

  const lagna = data.lagna as Record<string, unknown> | undefined;

  const planets = data.planets as Record<string, {
    sign?: string; degree?: number; house?: number; nakshatra?: string; pada?: number;
    nakshatra_lord?: string; is_retrograde?: boolean; is_combust?: boolean; dignity?: string;
    has_digbala?: boolean;
  }> | undefined;

  const dashas = data.dashas as {
    maha?: { planet?: string; start?: string; end?: string; years?: number; days?: number };
    antar?: { planet?: string; start?: string; end?: string; days?: number };
    pratyantar?: { planet?: string; start?: string; end?: string; days?: number };
    sukshma?: { planet?: string; start?: string; end?: string; days?: number };
    prana?: { planet?: string; start?: string; end?: string; days?: number };
    timeline?: Array<{ planet?: string; start?: string; end?: string }>;
  } | undefined;

  const yogas = data.yogas as Array<{
    name?: string; formed_by?: string[]; description?: string;
  }> | undefined;

  const shadbala = data.shadbala as Record<string, {
    sthana_bala?: { total?: number };
    dig_bala?: number; kala_bala?: number; chesta_bala?: number;
    naisargika_bala?: number; drik_bala?: number;
    total_rupas?: number; required_rupas?: number; is_strong?: boolean;
    strength_ratio?: number; ishta_phala?: number; kashta_phala?: number;
  }> | undefined;

  const jaiminiKarakas = data.jaimini_karakas as Record<string, {
    planet?: string; degree?: number; description?: string;
    sign?: string; house?: number; d9_sign?: string;
  }> | undefined;

  const karakamsha = data.karakamsha as {
    atmakaraka?: string; karakamsha_sign?: string; karakamsha_house_from_lagna?: number;
    planets_in_karakamsha?: string[]; ishta_devata_sign?: string;
    ishta_devata_lord?: string; description?: string;
  } | undefined;

  const avasthas = data.avasthas as Record<string, {
    avastha?: string; degree?: number; strength_factor?: number; description?: string;
  }> | undefined;

  const bhavaChalit = data.bhava_chalit as Record<string, {
    bhava_house?: number; rashi_house?: number; shifted?: boolean;
  }> | undefined;

  const grahaYuddha = data.graha_yuddha as Array<{
    planet1?: string; planet2?: string; separation_degrees?: number;
    winner?: string; loser?: string; description?: string;
  }> | undefined;

  const gandanta = data.gandanta as unknown[] | undefined;

  const arudha = data.arudha_padas as Record<string, {
    sign?: string; sign_index?: number; name?: string;
  }> | undefined;

  const upapada = data.upapada as {
    sign?: string; sign_index?: number; lord?: string;
    second_from_ul?: string; description?: string;
  } | undefined;

  const ashtakavarga = data.ashtakavarga as {
    sarvashtakavarga?: Record<string, number>;
    bhinnashtakavarga?: Record<string, Record<string, number>>;
  } | undefined;

  const kaalSarpa = data.kaal_sarpa as Record<string, unknown> | null | undefined;

  // Helpers to look up explainer by section_in_view; returns null if absent
  const exp = (sectionInView: string) => explainers[sectionInView] ?? null;

  return (
    <div>
      {/* 1. Chart Metadata */}
      {meta && (
        <SectionShell sectionInView="Chart Metadata" explainer={exp("Chart Metadata")} accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
            {[
              { label: "Ayanamsha",   value: meta.ayanamsha },
              { label: "Value",       value: meta.ayanamsha_degrees !== undefined ? `${meta.ayanamsha_degrees.toFixed(4)}°` : undefined },
              { label: "Timezone",   value: meta.timezone },
              { label: "Query Date", value: meta.query_date },
              { label: "Latitude",   value: meta.coordinates ? `${meta.coordinates.lat}` : undefined },
              { label: "Longitude",  value: meta.coordinates ? `${meta.coordinates.lon}` : undefined },
              { label: "DOB",        value: meta.dob },
              { label: "Time",       value: meta.time },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded p-2">
                <p className="text-green-400/60 uppercase tracking-wide font-medium text-[10px]">{label}</p>
                <p className="text-green-200 font-mono font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* 2. Panchang */}
      {panchang && (
        <SectionShell
          sectionInView="Panchang"
          explainer={exp("Panchang")}
          accent={accent}
          chartEntries={
            panchang.nakshatra?.name
              ? [
                  {
                    type: "nakshatra",
                    key: slug(panchang.nakshatra.name),
                    heading: `Moon in ${panchang.nakshatra.name}`,
                  },
                ]
              : []
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {panchang.tithi && (
              <div className={card}>
                <p className="text-xs text-green-400/70 font-medium uppercase tracking-wide">Tithi</p>
                <p className="font-semibold text-green-200 mt-0.5">
                  {panchang.tithi.name}
                  {panchang.tithi.paksha ? ` (${panchang.tithi.paksha})` : ""}
                </p>
                {panchang.tithi.number !== undefined && (
                  <p className="text-xs text-muted-foreground">#{panchang.tithi.number}</p>
                )}
              </div>
            )}
            {panchang.vara && (
              <div className={card}>
                <p className="text-xs text-green-400/70 font-medium uppercase tracking-wide">Vara (Day)</p>
                <p className="font-semibold text-green-200 mt-0.5">{panchang.vara.name}</p>
                {panchang.vara.lord && (
                  <p className="text-xs text-muted-foreground">Lord: {panchang.vara.lord}</p>
                )}
              </div>
            )}
            {panchang.nakshatra && (
              <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
                <p className="text-xs text-green-300/80 font-medium uppercase tracking-wide">Nakshatra</p>
                <p className="font-bold text-green-100 text-lg mt-0.5">{panchang.nakshatra.name}</p>
                <p className="text-xs text-green-400">
                  Pada {panchang.nakshatra.pada}
                  {panchang.nakshatra.lord ? ` · Lord: ${panchang.nakshatra.lord}` : ""}
                </p>
              </div>
            )}
            {panchang.yoga && (
              <div className={card}>
                <p className="text-xs text-green-400/70 font-medium uppercase tracking-wide">Yoga</p>
                <p className="font-semibold text-green-200 mt-0.5">{panchang.yoga.name}</p>
                {panchang.yoga.index !== undefined && (
                  <p className="text-xs text-muted-foreground">#{panchang.yoga.index}</p>
                )}
              </div>
            )}
            {panchang.karana && (
              <div className={card}>
                <p className="text-xs text-green-400/70 font-medium uppercase tracking-wide">Karana</p>
                <p className="font-semibold text-green-200 mt-0.5">{panchang.karana}</p>
              </div>
            )}
          </div>
        </SectionShell>
      )}

      {/* 3. Lagna & Divisional Lagnas */}
      {lagna && (
        <SectionShell
          sectionInView="Lagna & Divisional Lagnas"
          explainer={exp("Lagna & Divisional Lagnas")}
          accent={accent}
          chartEntries={
            typeof lagna.sign === "string" && lagna.sign.length > 0
              ? [
                  {
                    type: "ascendant",
                    key: slug(lagna.sign),
                    heading: `${lagna.sign} ascendant`,
                  },
                ]
              : []
          }
        >
          <div className="mt-2 space-y-3">
            <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4">
              <p className="text-xs text-green-300/80 uppercase tracking-wide font-medium">Ascendant (D1 Rasi)</p>
              <p className="text-3xl font-bold text-green-100 mt-1">{String(lagna.sign ?? "")}</p>
              <div className="flex flex-wrap gap-4 mt-1 text-sm">
                {lagna.degree !== undefined && (
                  <span className="text-green-400 font-mono">{Number(lagna.degree).toFixed(2)}°</span>
                )}
                {!!lagna.nakshatra && (
                  <span className="text-green-300">{String(lagna.nakshatra)}{lagna.pada ? ` · Pada ${String(lagna.pada)}` : ""}</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(DIV_LABELS).map(([key, label]) => {
                const val = lagna[key];
                if (!val) return null;
                return (
                  <div key={key} className="bg-white/5 rounded-lg p-2 text-xs">
                    <p className="text-green-400/60 font-medium">{label}</p>
                    <p className="text-green-200 font-semibold mt-0.5">{String(val)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionShell>
      )}

      {/* 4. Planetary Positions */}
      {planets && (
        <SectionShell
          sectionInView="Planetary Positions"
          explainer={exp("Planetary Positions")}
          accent={accent}
          chartEntries={
            PLANET_ORDER
              .map<ChartEntry | null>((name) => {
                const p = planets[name];
                if (!p || p.house === undefined) return null;
                return {
                  type: "planet-in-house",
                  key: `${slug(name)}-${p.house}`,
                  heading: `${name} · ${ord(p.house)} house`,
                };
              })
              .filter((x): x is ChartEntry => x !== null)
          }
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Planet</th>
                  <th className={th}>Sign</th>
                  <th className={th}>Degree</th>
                  <th className={th}>House</th>
                  <th className={th}>Nakshatra</th>
                  <th className={th}>Pada</th>
                  <th className={th}>Dignity</th>
                  <th className={`${th} text-center`}>℞</th>
                  <th className={`${th} text-center`}>Combust</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const p = planets[name];
                  if (!p) return null;
                  const dKey = (p.dignity ?? "neutral").toLowerCase();
                  const dignClass = DIGNITY_COLOR[dKey] ?? DIGNITY_COLOR.neutral;
                  return (
                    <tr key={name} className={row}>
                      <td className="py-2 pr-3 font-semibold text-green-300">{name}</td>
                      <td className="py-2 pr-3">{p.sign}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                        {p.degree !== undefined ? `${p.degree.toFixed(2)}°` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-green-400 font-bold">
                        {p.house !== undefined ? `H${p.house}` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {p.nakshatra ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {p.pada ?? "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${dignClass}`}>
                          {p.dignity ?? "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-center">
                        {p.is_retrograde
                          ? <span className="text-orange-400 font-bold">℞</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-2 text-center">
                        {p.is_combust
                          ? <span className="text-red-400 font-bold">●</span>
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionShell>
      )}

      {/* 5. Vimshottari Dasha — 5-level */}
      {dashas && (
        <SectionShell
          sectionInView="Vimshottari Dasha — Current 5-Level Period"
          explainer={exp("Vimshottari Dasha — Current 5-Level Period")}
          accent={accent}
          chartEntries={
            dashas.maha?.planet && dashas.antar?.planet
              ? [
                  {
                    type: "dasha-pair",
                    key: `${slug(dashas.maha.planet)}-${slug(dashas.antar.planet)}`,
                    heading: `${dashas.maha.planet} mahadasha · ${dashas.antar.planet} antardasha`,
                  },
                ]
              : []
          }
        >
          <div className="mt-2 space-y-2">
            {dashas.maha && (
              <div className="bg-green-950/40 border border-green-700/50 rounded-lg p-3">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-xs text-green-400/60 uppercase tracking-widest font-medium">Maha Dasha</span>
                  <span className="text-xl font-bold text-green-200">{dashas.maha.planet}</span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {dashas.maha.start} → {dashas.maha.end}
                  </span>
                  {dashas.maha.years !== undefined && (
                    <span className="text-xs text-green-400">{dashas.maha.years} yrs</span>
                  )}
                </div>

                {dashas.antar && (
                  <div className="ml-4 mt-2 bg-green-950/30 border border-green-800/40 rounded-lg p-2.5">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-xs text-green-400/50 uppercase tracking-widest">Antar</span>
                      <span className="font-bold text-green-200">{dashas.antar.planet}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {dashas.antar.start} → {dashas.antar.end}
                      </span>
                      {dashas.antar.days !== undefined && (
                        <span className="text-xs text-green-400">{dashas.antar.days.toFixed(1)} days</span>
                      )}
                    </div>

                    {dashas.pratyantar && (
                      <div className="ml-4 mt-2 bg-green-950/20 border border-green-800/30 rounded-lg p-2.5">
                        <div className="flex items-baseline gap-3 flex-wrap">
                          <span className="text-xs text-green-400/40 uppercase tracking-widest">Pratyantar</span>
                          <span className="font-bold text-green-200">{dashas.pratyantar.planet}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {dashas.pratyantar.start} → {dashas.pratyantar.end}
                          </span>
                          {dashas.pratyantar.days !== undefined && (
                            <span className="text-xs text-green-400">{dashas.pratyantar.days.toFixed(1)} days</span>
                          )}
                        </div>

                        {dashas.sukshma && (
                          <div className="ml-4 mt-2 bg-green-950/10 border border-green-900/30 rounded-lg p-2">
                            <div className="flex items-baseline gap-3 flex-wrap">
                              <span className="text-xs text-green-400/30 uppercase tracking-widest">Sukshma</span>
                              <span className="font-semibold text-green-200">{dashas.sukshma.planet}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {dashas.sukshma.start} → {dashas.sukshma.end}
                              </span>
                              {dashas.sukshma.days !== undefined && (
                                <span className="text-xs text-green-400">{dashas.sukshma.days.toFixed(2)} days</span>
                              )}
                            </div>

                            {dashas.prana && (
                              <div className="ml-4 mt-1.5 bg-white/5 rounded-lg p-2">
                                <div className="flex items-baseline gap-3 flex-wrap">
                                  <span className="text-xs text-green-400/20 uppercase tracking-widest">Prana</span>
                                  <span className="font-semibold text-green-300">{dashas.prana.planet}</span>
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {dashas.prana.start} → {dashas.prana.end}
                                  </span>
                                  {dashas.prana.days !== undefined && (
                                    <span className="text-xs text-green-400">{dashas.prana.days.toFixed(2)} days</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {dashas.timeline && dashas.timeline.length > 0 && (
              <details className="border border-white/10 rounded-lg">
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-green-400 hover:bg-white/5 rounded-lg uppercase tracking-wide">
                  Full Maha Dasha Timeline
                </summary>
                <div className="px-3 pb-3 overflow-x-auto">
                  <table className="w-full text-xs border-collapse mt-2">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className={th}>Planet</th>
                        <th className={th}>Start</th>
                        <th className={th}>End</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashas.timeline.map((t, i) => {
                        const isCurrent = dashas.maha?.planet === t.planet &&
                          dashas.maha?.start === t.start;
                        return (
                          <tr key={i} className={`${row} ${isCurrent ? "bg-green-950/30" : ""}`}>
                            <td className={`py-1.5 pr-3 font-medium ${isCurrent ? "text-green-300" : ""}`}>
                              {t.planet}{isCurrent ? " ●" : ""}
                            </td>
                            <td className="py-1.5 pr-3 font-mono text-muted-foreground">{t.start}</td>
                            <td className="py-1.5 font-mono text-muted-foreground">{t.end}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        </SectionShell>
      )}

      {/* 6. Yogas */}
      {yogas && yogas.length > 0 && (
        <SectionShell
          sectionInView="Yogas (Planetary Combinations)"
          explainer={exp("Yogas (Planetary Combinations)")}
          accent={accent}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {yogas.map((yoga, i) => {
              const isMajor = MAJOR_YOGAS.has(yoga.name ?? "");
              return (
                <div
                  key={i}
                  className={isMajor
                    ? "bg-green-900/30 border border-green-600/50 rounded-lg p-3"
                    : "bg-white/5 border border-white/10 rounded-lg p-3"}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className={`font-bold text-sm ${isMajor ? "text-green-100" : "text-green-300"}`}>
                      {yoga.name}
                    </p>
                    {isMajor && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-600/30 text-green-300 rounded font-medium uppercase">
                        Major
                      </span>
                    )}
                  </div>
                  {yoga.formed_by && yoga.formed_by.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {yoga.formed_by.map(p => (
                        <span key={p} className="text-xs px-1.5 py-0.5 bg-green-950/60 border border-green-800/50 text-green-300 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                  {yoga.description && (
                    <p className="text-xs text-muted-foreground mt-1.5">{yoga.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </SectionShell>
      )}

      {/* 7. Shadbala */}
      {shadbala && (
        <SectionShell
          sectionInView="Shadbala — 6-Fold Planetary Strength"
          explainer={exp("Shadbala — 6-Fold Planetary Strength")}
          accent={accent}
        >
          <p className="text-xs text-muted-foreground mt-2 mb-3">
            Shadbala = 6-fold planetary strength. A planet is strong if total rupas ≥ required rupas.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Planet</th>
                  <th className={th}>Sthana</th>
                  <th className={th}>Dig</th>
                  <th className={th}>Kala</th>
                  <th className={th}>Chesta</th>
                  <th className={th}>Naisarg.</th>
                  <th className={th}>Drik</th>
                  <th className={th}>Total ṣ</th>
                  <th className={th}>Rupas</th>
                  <th className={th}>Reqd</th>
                  <th className={th}>Strong?</th>
                  <th className={th}>Ishta</th>
                  <th className={th}>Kashta</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.slice(0, 7).map(name => {
                  const s = shadbala[name];
                  if (!s) return null;
                  const isStrong = s.is_strong;
                  return (
                    <tr key={name} className={`${row} ${isStrong ? "bg-green-950/20" : ""}`}>
                      <td className={`py-1.5 pr-3 font-semibold ${isStrong ? "text-green-300" : "text-green-400"}`}>{name}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">
                        {s.sthana_bala?.total?.toFixed(1) ?? "—"}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.dig_bala?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.kala_bala?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.chesta_bala?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.naisargika_bala?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.drik_bala?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.total_rupas !== undefined ? (s.total_rupas * 60).toFixed(0) : "—"}</td>
                      <td className="py-1.5 pr-3 font-mono font-bold text-green-300">{s.total_rupas?.toFixed(2) ?? "—"}</td>
                      <td className="py-1.5 pr-3 font-mono text-muted-foreground">{s.required_rupas?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 pr-3">
                        {isStrong
                          ? <span className="text-emerald-400 font-bold">✓</span>
                          : <span className="text-red-400/70">✗</span>}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-amber-400/80">{s.ishta_phala?.toFixed(1) ?? "—"}</td>
                      <td className="py-1.5 font-mono text-red-400/70">{s.kashta_phala?.toFixed(1) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionShell>
      )}

      {/* 8. Jaimini Karakas */}
      {jaiminiKarakas && (
        <SectionShell sectionInView="Jaimini Karakas" explainer={exp("Jaimini Karakas")} accent={accent}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            {Object.entries(jaiminiKarakas).map(([role, k]) => (
              <div key={role} className={card}>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <p className="text-xs text-green-400/70 uppercase tracking-wide font-medium">{role}</p>
                  <p className="font-bold text-green-200 text-base">{k.planet}</p>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {k.sign && <span>Sign: <span className="text-green-300">{k.sign}</span></span>}
                  {k.house !== undefined && <span>H{k.house}</span>}
                  {k.d9_sign && <span>D9: <span className="text-green-300">{k.d9_sign}</span></span>}
                  {k.degree !== undefined && <span className="font-mono">{k.degree.toFixed(2)}°</span>}
                </div>
                {k.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{k.description}</p>
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* 9. Karakamsha */}
      {karakamsha && (
        <SectionShell
          sectionInView="Karakamsha — Soul's Direction in D9"
          explainer={exp("Karakamsha — Soul's Direction in D9")}
          accent={accent}
          defaultOpen={false}
        >
          <div className={`${card} mt-2 space-y-2`}>
            <div className="flex gap-4 flex-wrap text-sm">
              {karakamsha.atmakaraka && (
                <span>Atmakaraka: <span className="text-green-200 font-bold">{karakamsha.atmakaraka}</span></span>
              )}
              {karakamsha.karakamsha_sign && (
                <span>Karakamsha Sign: <span className="text-green-200 font-bold">{karakamsha.karakamsha_sign}</span></span>
              )}
              {karakamsha.karakamsha_house_from_lagna !== undefined && (
                <span>House from Lagna: <span className="text-green-200 font-bold">H{karakamsha.karakamsha_house_from_lagna}</span></span>
              )}
            </div>
            {karakamsha.planets_in_karakamsha && karakamsha.planets_in_karakamsha.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">Planets in Karakamsha:</span>
                {karakamsha.planets_in_karakamsha.map(p => (
                  <span key={p} className="text-xs px-1.5 py-0.5 bg-green-950/60 border border-green-800/50 text-green-300 rounded">{p}</span>
                ))}
              </div>
            )}
            {karakamsha.ishta_devata_lord && (
              <p className="text-sm">
                Ishta Devata: <span className="text-green-200 font-bold">{karakamsha.ishta_devata_lord}</span>
                {karakamsha.ishta_devata_sign ? <span className="text-muted-foreground"> ({karakamsha.ishta_devata_sign})</span> : ""}
              </p>
            )}
            {karakamsha.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{karakamsha.description}</p>
            )}
          </div>
        </SectionShell>
      )}

      {/* 10. Avasthas */}
      {avasthas && (
        <SectionShell
          sectionInView="Avasthas — Planetary States"
          explainer={exp("Avasthas — Planetary States")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Planet</th>
                  <th className={th}>Avastha</th>
                  <th className={th}>Degree</th>
                  <th className={th}>Strength Factor</th>
                  <th className={th}>Description</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.slice(0, 7).map(name => {
                  const a = avasthas[name];
                  if (!a) return null;
                  const avasthaColors: Record<string, string> = {
                    Bala:    "text-yellow-400",
                    Kumara:  "text-amber-400",
                    Yuva:    "text-emerald-400",
                    Vriddha: "text-orange-400",
                    Mrita:   "text-red-400",
                  };
                  const cls = avasthaColors[a.avastha ?? ""] ?? "text-muted-foreground";
                  return (
                    <tr key={name} className={row}>
                      <td className="py-2 pr-3 font-semibold text-green-300">{name}</td>
                      <td className={`py-2 pr-3 font-bold ${cls}`}>{a.avastha ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                        {a.degree !== undefined ? `${a.degree.toFixed(2)}°` : "—"}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                        {a.strength_factor !== undefined ? a.strength_factor.toFixed(2) : "—"}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{a.description ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionShell>
      )}

      {/* 11. Bhava Chalit */}
      {bhavaChalit && (
        <SectionShell
          sectionInView="Bhava Chalit — House Shift Analysis"
          explainer={exp("Bhava Chalit — House Shift Analysis")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={th}>Planet</th>
                  <th className={th}>Rashi House</th>
                  <th className={th}>Bhava House</th>
                  <th className={th}>Shifted</th>
                </tr>
              </thead>
              <tbody>
                {PLANET_ORDER.map(name => {
                  const b = bhavaChalit[name];
                  if (!b) return null;
                  return (
                    <tr key={name} className={`${row} ${b.shifted ? "bg-orange-950/10" : ""}`}>
                      <td className="py-2 pr-3 font-semibold text-green-300">{name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">H{b.rashi_house}</td>
                      <td className="py-2 pr-3 font-bold text-green-200">H{b.bhava_house}</td>
                      <td className="py-2">
                        {b.shifted
                          ? <span className="text-orange-400 font-bold text-xs px-1.5 py-0.5 bg-orange-950/30 border border-orange-800/40 rounded">Shifted</span>
                          : <span className="text-muted-foreground/50 text-xs">Same</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionShell>
      )}

      {/* 12. Graha Yuddha */}
      {grahaYuddha && grahaYuddha.length > 0 && (
        <SectionShell
          sectionInView="Graha Yuddha — Planetary Wars"
          explainer={exp("Graha Yuddha — Planetary Wars")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="space-y-3 mt-2">
            {grahaYuddha.map((war, i) => (
              <div key={i} className="bg-red-950/20 border border-red-900/40 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-red-300">{war.planet1}</span>
                  <span className="text-muted-foreground text-xs">vs</span>
                  <span className="font-bold text-red-300">{war.planet2}</span>
                  {war.separation_degrees !== undefined && (
                    <span className="text-xs text-muted-foreground font-mono">{war.separation_degrees.toFixed(4)}° apart</span>
                  )}
                </div>
                <div className="flex gap-3 mt-1.5 text-xs flex-wrap">
                  {war.winner && (
                    <span className="text-emerald-400">Winner: <span className="font-bold">{war.winner}</span></span>
                  )}
                  {war.loser && (
                    <span className="text-red-400">Weakened: <span className="font-bold">{war.loser}</span></span>
                  )}
                </div>
                {war.description && (
                  <p className="text-xs text-muted-foreground mt-1.5">{war.description}</p>
                )}
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* 13. Gandanta */}
      {gandanta && gandanta.length > 0 && (
        <SectionShell
          sectionInView="Gandanta — Karmic Junction Planets"
          explainer={exp("Gandanta — Karmic Junction Planets")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="space-y-2 mt-2">
            {gandanta.map((g, i) => (
              <div key={i} className={card}>
                <pre className="text-xs text-muted-foreground">{JSON.stringify(g, null, 2)}</pre>
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* 14. Arudha Padas */}
      {arudha && (
        <SectionShell
          sectionInView="Arudha Padas (A1–A12)"
          explainer={exp("Arudha Padas (A1–A12)")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
            {Object.entries(arudha).map(([num, a]) => (
              <div key={num} className={card}>
                <p className="text-xs text-green-400/60 font-medium">A{num}</p>
                {a.name && <p className="text-[10px] text-muted-foreground">{a.name}</p>}
                <p className="font-bold text-green-200 mt-0.5">{a.sign}</p>
              </div>
            ))}
          </div>
        </SectionShell>
      )}

      {/* 15. Upapada */}
      {upapada && (
        <SectionShell
          sectionInView="Upapada (UL) — Spouse Indicator"
          explainer={exp("Upapada (UL) — Spouse Indicator")}
          accent={accent}
          defaultOpen={false}
        >
          <div className={`${card} mt-2 space-y-2`}>
            <div className="flex gap-4 flex-wrap text-sm">
              {upapada.sign && (
                <span>UL Sign: <span className="text-green-200 font-bold">{upapada.sign}</span></span>
              )}
              {upapada.lord && (
                <span>Lord: <span className="text-green-200 font-bold">{upapada.lord}</span></span>
              )}
              {upapada.second_from_ul && (
                <span>2nd from UL: <span className="text-green-200 font-bold">{upapada.second_from_ul}</span></span>
              )}
            </div>
            {upapada.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{upapada.description}</p>
            )}
          </div>
        </SectionShell>
      )}

      {/* 16. SAV */}
      {ashtakavarga?.sarvashtakavarga && (
        <SectionShell
          sectionInView="Ashtakavarga — Sarvashtakavarga (SAV)"
          explainer={exp("Ashtakavarga — Sarvashtakavarga (SAV)")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-2">Total bindus per sign across all 7 planets. Green ≥28 (strong), Red &lt;22 (weak).</p>
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    {SIGNS_ORDER.map(s => (
                      <th key={s} className="text-center py-1.5 px-2 font-medium text-muted-foreground">{s.slice(0,3)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {SIGNS_ORDER.map(sign => {
                      const val = ashtakavarga.sarvashtakavarga![sign] ?? 0;
                      return (
                        <td key={sign} className={`py-2 px-2 text-center font-bold font-mono ${val >= 28 ? "text-emerald-400" : val < 22 ? "text-red-400" : "text-foreground"}`}>
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </SectionShell>
      )}

      {/* 17. Bhinnashtakavarga */}
      {ashtakavarga?.bhinnashtakavarga && (
        <SectionShell
          sectionInView="Ashtakavarga — Bhinnashtakavarga (Planet-wise)"
          explainer={exp("Ashtakavarga — Bhinnashtakavarga (Planet-wise)")}
          accent={accent}
          defaultOpen={false}
        >
          <div className="mt-2 overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={`${th} pr-4`}>Planet</th>
                  {SIGNS_ORDER.map(s => (
                    <th key={s} className="text-center py-1.5 px-1.5 font-medium text-muted-foreground">{s.slice(0,3)}</th>
                  ))}
                  <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ashtakavarga.bhinnashtakavarga).map(([planet, scores]) => {
                  const total = SIGNS_ORDER.reduce((sum, s) => sum + (scores[s] ?? 0), 0);
                  return (
                    <tr key={planet} className={row}>
                      <td className="py-1.5 pr-4 font-semibold text-green-300">{planet}</td>
                      {SIGNS_ORDER.map(sign => {
                        const val = scores[sign] ?? 0;
                        return (
                          <td key={sign} className={`py-1.5 px-1.5 text-center font-mono ${val >= 6 ? "text-emerald-400 font-bold" : val <= 2 ? "text-red-400" : "text-muted-foreground"}`}>
                            {val}
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-2 text-center font-bold text-green-300">{total}</td>
                    </tr>
                  );
                })}
                {ashtakavarga.sarvashtakavarga && (
                  <tr className="border-t border-white/20 bg-green-950/20">
                    <td className="py-1.5 pr-4 font-bold text-green-400 uppercase text-[10px] tracking-wide">SAV</td>
                    {SIGNS_ORDER.map(sign => {
                      const val = ashtakavarga.sarvashtakavarga![sign] ?? 0;
                      return (
                        <td key={sign} className={`py-1.5 px-1.5 text-center font-bold font-mono ${val >= 28 ? "text-emerald-400" : val < 22 ? "text-red-400" : "text-muted-foreground"}`}>
                          {val}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-center font-bold text-green-300">
                      {SIGNS_ORDER.reduce((sum, s) => sum + (ashtakavarga.sarvashtakavarga![s] ?? 0), 0)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionShell>
      )}

      {/* 18. Kaal Sarpa */}
      {kaalSarpa && (
        <SectionShell
          sectionInView="Kaal Sarpa Yoga"
          explainer={exp("Kaal Sarpa Yoga")}
          accent={accent}
          defaultOpen={false}
        >
          <div className={`${card} mt-2`}>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(kaalSarpa, null, 2)}
            </pre>
          </div>
        </SectionShell>
      )}
    </div>
  );
}
