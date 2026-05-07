// Compact per-engine summarizers for LLM context.
// Each returns ≤ ~800 tokens of plain text rather than the raw JSON dump
// (which can be 100+ KB for engines like jyotishganit).

import {
  parseVedAstroPlanets,
  longitudeToSign,
  longitudeToDegreesInSign,
} from "./astro-utils";

type Output = unknown;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

function fmt(n: unknown, digits = 2): string {
  return typeof n === "number" ? n.toFixed(digits) : "—";
}

function summarizeVedAstro(out: Output): string {
  if (!isObj(out)) return "";
  const raw = out.raw_responses as Record<string, unknown> | undefined;
  if (!raw) return "(no data)";
  const lagna =
    (raw.rising_sign as { Payload?: { LagnaSignName?: string } } | undefined)
      ?.Payload?.LagnaSignName;
  const planetsRaw = (raw.planetary_positions as
    | { Payload?: { AllPlanetLongitude?: string } }
    | undefined)?.Payload?.AllPlanetLongitude;
  const planets = planetsRaw ? parseVedAstroPlanets(planetsRaw) : [];
  const houses = (raw.house_cusps as
    | { Payload?: { AllHouseLongitudes?: Array<{ House: string; Begin: string }> } }
    | undefined)?.Payload?.AllHouseLongitudes ?? [];
  const av = (raw.ashtakavarga as
    | { Payload?: { BhinnashtakavargaChart?: Record<string, { Total: number }> } }
    | undefined)?.Payload?.BhinnashtakavargaChart;

  const lines: string[] = [];
  lines.push(`Lagna (Ascendant, sidereal Lahiri): ${lagna ?? "—"}`);
  if (planets.length) {
    lines.push("Planets (sidereal):");
    for (const p of planets) {
      lines.push(`  ${p.name}: ${p.sign} ${p.degrees} — Nakshatra ${p.nakshatra}`);
    }
  }
  if (houses.length) {
    const cusps = houses
      .slice()
      .sort(
        (a, b) => parseInt(a.House.replace("House", "")) - parseInt(b.House.replace("House", ""))
      )
      .map((h) => {
        const n = parseInt(h.House.replace("House", ""));
        const lon = parseFloat(h.Begin);
        return `H${n}=${longitudeToSign(lon)} ${longitudeToDegreesInSign(lon)}`;
      });
    lines.push(`House cusps: ${cusps.join(", ")}`);
  }
  if (av) {
    const totals = Object.entries(av)
      .map(([k, v]) => `${k}=${v.Total}`)
      .join(", ");
    lines.push(`Ashtakavarga totals (per planet): ${totals}`);
  }
  return lines.join("\n");
}

function summarizePanchangam(out: Output): string {
  if (!isObj(out)) return "";
  const raw = (out.raw as Record<string, unknown>) ?? {};
  const p = (raw.panchang as Record<string, unknown>) ?? {};
  const lines: string[] = [];
  lines.push(`Tithi: ${p.tithi_name ?? "—"} (${p.paksha ?? "—"})`);
  lines.push(`Vara: ${p.vara_name ?? "—"}`);
  lines.push(`Nakshatra: ${p.nakshatra_name ?? "—"} pada ${p.nakshatra_pada ?? "—"}`);
  lines.push(`Yoga: ${p.yoga_name ?? "—"}`);
  lines.push(`Karana: ${p.karana_name ?? "—"}`);
  if (p.sunrise) lines.push(`Sunrise (UTC ms): ${p.sunrise}`);
  if (p.sunset) lines.push(`Sunset (UTC ms): ${p.sunset}`);
  if (p.ascendant !== undefined) {
    const lon = Number(p.ascendant);
    lines.push(`Ascendant longitude: ${fmt(lon, 3)}° (${longitudeToSign(lon)} ${longitudeToDegreesInSign(lon)})`);
  }
  return lines.join("\n");
}

function summarizeJyotishganit(out: Output): string {
  if (!isObj(out)) return "";
  const data = (out.data as Record<string, unknown>) ?? {};
  const ay = data.ayanamsa as { name?: string; value?: number } | undefined;
  const panch = data.panchanga as Record<string, string> | undefined;
  const d1 = data.d1Chart as { houses?: Array<Record<string, unknown>> } | undefined;
  const dashas = data.dashas as
    | { current?: Record<string, unknown>; balance?: Record<string, number> }
    | undefined;

  const lines: string[] = [];
  if (ay) lines.push(`Ayanamsa: ${ay.name} (${fmt(ay.value, 4)}°)`);
  if (panch)
    lines.push(
      `Panchanga: tithi=${panch.tithi}, nakshatra=${panch.nakshatra}, yoga=${panch.yoga}, karana=${panch.karana}, vaara=${panch.vaara}`
    );
  if (d1?.houses?.length) {
    const lagna = d1.houses[0];
    lines.push(
      `Lagna: ${lagna.sign} ${fmt(lagna.signDegrees as number, 2)}° — Nakshatra ${lagna.nakshatra} pada ${lagna.pada}`
    );
    lines.push("Planet placements (sidereal):");
    for (const h of d1.houses) {
      const occupants = h.occupants as Array<{ name?: string; degree?: number; nakshatra?: string }> | undefined;
      if (occupants?.length) {
        for (const occ of occupants) {
          lines.push(
            `  ${occ.name}: H${h.number} ${h.sign} ${fmt(occ.degree, 2)}° — ${occ.nakshatra ?? "—"}`
          );
        }
      }
    }
  }
  if (dashas?.current) {
    const c = dashas.current as Record<string, { lord?: string; start?: string; end?: string }>;
    const parts: string[] = [];
    for (const level of ["maha", "antar", "pratyantar", "sukshma"]) {
      const p = c[level];
      if (p?.lord) parts.push(`${level}=${p.lord} (${p.start}→${p.end})`);
    }
    if (parts.length) lines.push(`Vimshottari current: ${parts.join("; ")}`);
  }
  return lines.join("\n");
}

function summarizeWestern(out: Output): string {
  if (!isObj(out)) return "";
  const data = (out.data as Record<string, unknown>) ?? {};
  const meta = data.meta as { is_diurnal?: boolean; zodiac_type?: string; houses_system?: string } | undefined;
  const planets = data.planets as Record<string, { sign?: string; position?: number; house?: string; retrograde?: boolean }> | undefined;
  const houses = data.houses as Record<string, { sign?: string; position?: number }> | undefined;
  const aspects = data.aspects as Array<{ p1: string; p2: string; aspect: string; orbit?: number }> | undefined;

  const lines: string[] = [];
  if (meta) lines.push(`Tropical chart, ${meta.houses_system ?? "Placidus"}, ${meta.is_diurnal ? "day" : "night"} chart.`);
  if (planets) {
    lines.push("Planets (tropical):");
    for (const [k, v] of Object.entries(planets)) {
      const r = v.retrograde ? " ℞" : "";
      lines.push(`  ${k}: ${v.sign} ${fmt(v.position, 2)}° (H${(v.house ?? "").replace(/_house|_House/i, "")})${r}`);
    }
  }
  if (houses) {
    const cusps = Object.entries(houses)
      .map(([k, v]) => `${k.replace("_house", "")}=${v.sign} ${fmt(v.position, 1)}°`)
      .join(", ");
    lines.push(`Cusps: ${cusps}`);
  }
  if (aspects?.length) {
    const top = aspects.slice(0, 15).map((a) => `${a.p1}-${a.aspect}-${a.p2} (orb ${fmt(a.orbit, 2)}°)`);
    lines.push(`Aspects (top ${top.length}): ${top.join("; ")}`);
  }
  return lines.join("\n");
}

function summarizeHellenistic(out: Output): string {
  if (!isObj(out)) return "";
  const data = (out.data as Record<string, unknown>) ?? {};
  const meta = data.meta as { is_diurnal?: boolean; house_system?: string } | undefined;
  const planets = data.planets as Record<string, { sign?: string; signlon?: number; retrograde?: boolean }> | undefined;
  const aspects = data.aspects as Array<{ p1: string; p2: string; type: string; orb?: number }> | undefined;
  const lots = data.lots as { pars_fortuna?: { sign?: string; lon?: number; formula?: string } } | undefined;

  const lines: string[] = [];
  lines.push(`${meta?.is_diurnal ? "Day" : "Night"} chart (${meta?.house_system ?? "Placidus"}).`);
  if (planets) {
    lines.push("Traditional planets:");
    for (const [k, v] of Object.entries(planets).slice(0, 7)) {
      const r = v.retrograde ? " ℞" : "";
      lines.push(`  ${k}: ${v.sign} ${fmt(v.signlon, 2)}°${r}`);
    }
  }
  if (aspects?.length) {
    lines.push(`Aspects: ${aspects.map((a) => `${a.p1}-${a.type}-${a.p2}`).join("; ")}`);
  }
  if (lots?.pars_fortuna) {
    lines.push(
      `Pars Fortuna: ${lots.pars_fortuna.sign} ${fmt(lots.pars_fortuna.lon, 2)}° (${lots.pars_fortuna.formula})`
    );
  }
  return lines.join("\n");
}

function summarizeNumerology(out: Output): string {
  if (!isObj(out)) return "";
  const data = (out.data as Record<string, unknown>) ?? {};
  const lines: string[] = [];
  for (const sys of ["pythagorean", "chaldean"] as const) {
    const s = data[sys] as { key_figures?: Record<string, unknown> } | undefined;
    if (!s?.key_figures) continue;
    const k = s.key_figures;
    lines.push(
      `${sys}: life_path=${k.life_path_number}, destiny=${k.destiny_number}, expression=${k.expression_number}, soul_urge=${k.hearth_desire_number}, personality=${k.personality_number}, power=${k.power_number}`
    );
    if (k.full_name_missing_numbers)
      lines.push(`  ${sys} missing numbers: ${JSON.stringify(k.full_name_missing_numbers)}`);
  }
  return lines.join("\n");
}

function summarizeDashaflow(out: Output): string {
  if (!isObj(out)) return "";
  const data = (out.data as Record<string, unknown>) ?? {};
  const meta = data.metadata as Record<string, unknown> | undefined;
  const panch = data.panchang as Record<string, Record<string, unknown>> | undefined;
  const lagna = data.lagna as Record<string, unknown> | undefined;
  const planets = data.planets as Record<string, Record<string, unknown>> | undefined;
  const dashas = data.dashas as Record<string, Record<string, unknown>> | undefined;
  const yogas = data.yogas as Array<{ name: string; description?: string; formed_by?: string[] }> | undefined;
  const shadbala = data.shadbala as Record<string, { total_rupas?: number; required_rupas?: number; is_strong?: boolean }> | undefined;
  const jaimini = data.jaimini_karakas as Record<string, { planet?: string; sign?: string; house?: number }> | undefined;
  const karaks = data.karakamsha as Record<string, unknown> | undefined;

  const lines: string[] = [];
  if (meta) lines.push(`Ayanamsha: ${meta.ayanamsha} (${fmt(meta.ayanamsha_degrees as number, 3)}°)`);
  if (panch) {
    const t = panch.tithi, n = panch.nakshatra, y = panch.yoga;
    lines.push(`Panchang: tithi=${t?.name}/${t?.paksha}, nakshatra=${n?.name} pada ${n?.pada}, yoga=${y?.name}, karana=${panch.karana}`);
  }
  if (lagna) lines.push(`Lagna: ${lagna.sign} ${fmt(lagna.degree as number, 2)}° (Nakshatra ${lagna.nakshatra} pada ${lagna.pada})`);
  if (planets) {
    lines.push("Planets (sidereal):");
    for (const [k, v] of Object.entries(planets)) {
      const r = v.is_retrograde ? " ℞" : "";
      const c = v.is_combust ? " (combust)" : "";
      lines.push(`  ${k}: ${v.sign} ${fmt(v.degree as number, 2)}° H${v.house} — Nakshatra ${v.nakshatra} pada ${v.pada}, dignity=${v.dignity}${r}${c}`);
    }
  }
  if (dashas) {
    const parts = ["maha", "antar", "pratyantar", "sukshma", "prana"]
      .map((lvl) => {
        const p = dashas[lvl];
        return p?.planet ? `${lvl}=${p.planet} (${p.start}→${p.end})` : null;
      })
      .filter(Boolean);
    if (parts.length) lines.push(`Vimshottari current: ${parts.join("; ")}`);
  }
  if (yogas?.length) {
    lines.push("Yogas detected:");
    for (const y of yogas.slice(0, 12)) {
      lines.push(`  ${y.name} [${(y.formed_by ?? []).join(",")}]: ${y.description ?? ""}`);
    }
  }
  if (shadbala) {
    const sb = Object.entries(shadbala)
      .map(([k, v]) => `${k}=${fmt(v.total_rupas, 2)}/${fmt(v.required_rupas, 2)}${v.is_strong ? "✓" : ""}`)
      .join(", ");
    lines.push(`Shadbala (rupas): ${sb}`);
  }
  if (jaimini) {
    const summaries = Object.entries(jaimini)
      .slice(0, 4)
      .map(([k, v]) => `${k}=${v.planet} (${v.sign} H${v.house})`);
    lines.push(`Jaimini Karakas: ${summaries.join(", ")}`);
  }
  if (karaks?.atmakaraka)
    lines.push(`Karakamsha: AK ${karaks.atmakaraka} in D9 ${karaks.karakamsha_sign} (H${karaks.karakamsha_house_from_lagna}); Ishta Devata via ${karaks.ishta_devata_lord}`);
  return lines.join("\n");
}

function summarizeStellium(out: Output): string {
  if (!isObj(out)) return "";
  const data = (out.data as Record<string, unknown>) ?? {};
  const sect = data.sect;
  const positions = data.positions as Array<{ name: string; type?: string; sign?: string; sign_degree?: number; is_retrograde?: boolean }> | undefined;
  const aspects = data.aspects as Array<Record<string, unknown>> | undefined;
  const profections = data.profections_now as Array<Record<string, unknown>> | undefined;
  const parts = data.arabic_parts as Array<{ name: string; sign?: string; sign_degree?: number }> | undefined;
  const voc = data.voc_moon;

  const lines: string[] = [`Sect: ${sect}`];
  if (positions) {
    const planets = positions.filter((p) => p.type === "planet");
    if (planets.length) {
      lines.push("Planets (tropical):");
      for (const p of planets) {
        const r = p.is_retrograde ? " ℞" : "";
        lines.push(`  ${p.name}: ${p.sign} ${fmt(p.sign_degree, 2)}°${r}`);
      }
    }
  }
  if (aspects?.length) lines.push(`Aspects: ${aspects.length} total`);
  if (profections?.length) {
    const yr = profections[0];
    if (yr) {
      lines.push(
        `Annual profection: age ${yr.units}, profected to ${yr.profected_sign} (H${yr.profected_house}), time lord ${yr.ruler}`
      );
      const rp = yr.ruler_position as { sign?: string; sign_degree?: number } | undefined;
      if (rp) lines.push(`  Time lord position: ${rp.sign} ${fmt(rp.sign_degree, 2)}°`);
    }
  }
  if (parts?.length) {
    const top = parts.slice(0, 8).map((p) => `${p.name}=${p.sign} ${fmt(p.sign_degree, 1)}°`);
    lines.push(`Arabic Parts (top ${top.length}): ${top.join(", ")}`);
  }
  if (voc !== undefined) lines.push(`VoC Moon: ${typeof voc === "object" ? JSON.stringify(voc) : voc}`);
  return lines.join("\n");
}

const SUMMARIZERS: Record<string, (o: Output) => string> = {
  vedastro: summarizeVedAstro,
  panchangam: summarizePanchangam,
  jyotishganit: summarizeJyotishganit,
  western: summarizeWestern,
  hellenistic: summarizeHellenistic,
  numerology: summarizeNumerology,
  dashaflow: summarizeDashaflow,
  stellium: summarizeStellium,
};

export function summarizeEngine(engine: string, output: Output): string {
  const fn = SUMMARIZERS[engine];
  if (!fn) return "";
  try {
    return fn(output);
  } catch (e) {
    return `(summary error: ${e instanceof Error ? e.message : String(e)})`;
  }
}
