// DashaFlow chart -> compact text summary for clipboard / LLM context.

type Output = unknown;
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const pick = <T = unknown>(o: unknown, ...path: string[]): T | undefined => {
  let cur: unknown = o;
  for (const k of path) {
    if (!isObj(cur)) return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur as T | undefined;
};

export function summarizeDashaflow(out: Output): string {
  if (!isObj(out)) return "";
  const data = out.data as Record<string, unknown> | undefined;
  if (!data) return "(no data)";

  const lines: string[] = [];

  const ay = pick<string>(data, "metadata", "ayanamsha");
  const ayDeg = pick<number>(data, "metadata", "ayanamsha_degrees");
  if (ay) lines.push(`Ayanamsha: ${ay}${typeof ayDeg === "number" ? ` (${ayDeg.toFixed(4)}°)` : ""}`);

  const lagnaSign = pick<string>(data, "lagna", "sign");
  const lagnaDeg = pick<number>(data, "lagna", "degree");
  const lagnaNak = pick<string>(data, "lagna", "nakshatra");
  const lagnaPada = pick<number>(data, "lagna", "pada");
  if (lagnaSign) {
    lines.push(
      `Lagna: ${lagnaSign}${typeof lagnaDeg === "number" ? ` ${lagnaDeg.toFixed(2)}°` : ""}` +
        (lagnaNak ? ` — Nakshatra ${lagnaNak}${lagnaPada ? ` pada ${lagnaPada}` : ""}` : "")
    );
  }

  const panch = data.panchang as
    | {
        tithi?: { name?: string; paksha?: string };
        vara?: { name?: string };
        nakshatra?: { name?: string; pada?: number };
        yoga?: { name?: string };
        karana?: string;
      }
    | undefined;
  if (panch) {
    const parts: string[] = [];
    if (panch.tithi?.name) parts.push(`Tithi=${panch.tithi.name}${panch.tithi.paksha ? ` (${panch.tithi.paksha})` : ""}`);
    if (panch.vara?.name) parts.push(`Vara=${panch.vara.name}`);
    if (panch.nakshatra?.name) parts.push(`Nakshatra=${panch.nakshatra.name}${panch.nakshatra.pada ? ` pada ${panch.nakshatra.pada}` : ""}`);
    if (panch.yoga?.name) parts.push(`Yoga=${panch.yoga.name}`);
    if (panch.karana) parts.push(`Karana=${panch.karana}`);
    if (parts.length) lines.push(`Panchanga: ${parts.join(", ")}`);
  }

  const planets = data.planets as
    | Record<
        string,
        { sign?: string; degree?: number; house?: number; nakshatra?: string; dignity?: string; is_retrograde?: boolean; d9_sign?: string }
      >
    | undefined;
  if (planets) {
    lines.push("");
    lines.push("Planets (sidereal D1):");
    for (const [name, p] of Object.entries(planets)) {
      const seg = [
        `  ${name}: ${p.sign ?? "—"} ${typeof p.degree === "number" ? `${p.degree.toFixed(2)}°` : ""}`,
        p.house !== undefined ? `H${p.house}` : null,
        p.nakshatra ? `Nak ${p.nakshatra}` : null,
        p.dignity ? p.dignity : null,
        p.is_retrograde ? "retro" : null,
      ]
        .filter(Boolean)
        .join(" — ");
      lines.push(seg);
    }

    // D9 (Navamsa) signs — one line per planet
    const lagnaD9 = pick<string>(data, "lagna", "d9_sign");
    const d9Lines: string[] = [];
    if (lagnaD9) d9Lines.push(`  Lagna: ${lagnaD9}`);
    for (const [name, p] of Object.entries(planets)) {
      if (p.d9_sign) d9Lines.push(`  ${name}: ${p.d9_sign}`);
    }
    if (d9Lines.length) {
      lines.push("");
      lines.push("D9 (Navamsa) signs:");
      lines.push(...d9Lines);
    }
  }

  const dashas = data.dashas as
    | {
        maha?: { planet?: string; start?: string; end?: string };
        antar?: { planet?: string; start?: string; end?: string };
        pratyantar?: { planet?: string; start?: string; end?: string };
        sukshma?: { planet?: string; start?: string; end?: string };
        prana?: { planet?: string; start?: string; end?: string };
      }
    | undefined;
  if (dashas) {
    const parts: string[] = [];
    for (const lvl of ["maha", "antar", "pratyantar", "sukshma", "prana"] as const) {
      const d = dashas[lvl];
      if (d?.planet) parts.push(`${lvl}=${d.planet} (${d.start ?? "?"}→${d.end ?? "?"})`);
    }
    if (parts.length) {
      lines.push("");
      lines.push(`Vimshottari current: ${parts.join("; ")}`);
    }
  }

  const yogas = data.yogas as Array<{ name?: string }> | undefined;
  if (yogas?.length) {
    const names = yogas.map((y) => y.name).filter(Boolean) as string[];
    if (names.length) lines.push(`Yogas: ${names.join(", ")}`);
  }

  const karak = data.karakamsha as
    | { atmakaraka?: string; karakamsha_sign?: string; karakamsha_house_from_lagna?: number; ishta_devata_sign?: string; ishta_devata_lord?: string }
    | undefined;
  if (karak) {
    const bits: string[] = [];
    if (karak.atmakaraka) bits.push(`Atmakaraka=${karak.atmakaraka}`);
    if (karak.karakamsha_sign)
      bits.push(`Karakamsha=${karak.karakamsha_sign}${karak.karakamsha_house_from_lagna ? ` (H${karak.karakamsha_house_from_lagna} from lagna)` : ""}`);
    if (karak.ishta_devata_sign) bits.push(`Ishta Devata sign=${karak.ishta_devata_sign}${karak.ishta_devata_lord ? `, lord=${karak.ishta_devata_lord}` : ""}`);
    if (bits.length) lines.push(`Karakamsha: ${bits.join("; ")}`);
  }

  return lines.join("\n");
}
