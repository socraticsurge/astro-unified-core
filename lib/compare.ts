export type CompareField = {
  label: string;
  vedastro?: string;
  panchangam?: string;
  jyotishganit?: string;
};

export const COMPARE_FIELDS: CompareField[] = [
  {
    label: "Nakshatra (Moon)",
    panchangam: "nakshatra.name",
    jyotishganit: "nakshatra",
    vedastro: "raw_responses.planetary_positions.Moon.nakshatra",
  },
  {
    label: "Tithi",
    panchangam: "tithi.name",
    jyotishganit: "tithi",
  },
  {
    label: "Yoga",
    panchangam: "yoga.name",
    jyotishganit: "yoga",
  },
  {
    label: "Vimshottari Dasha (current)",
    panchangam: "vimshottari_dasha.current_period",
    jyotishganit: "vimshottari_dasha.current_period",
    vedastro: "raw_responses.dasha",
  },
  {
    label: "Shadbala (Sun)",
    panchangam: "shadbala.Sun",
    jyotishganit: "shadbala.Sun",
  },
  {
    label: "Ashtakavarga (Sun)",
    panchangam: "ashtakavarga.Sun",
    jyotishganit: "ashtakavarga.Sun",
  },
  {
    label: "Rising Sign / Lagna",
    vedastro: "raw_responses.rising_sign",
    panchangam: "house_cusps.1",
    jyotishganit: "ascendant",
  },
  {
    label: "Moon Longitude",
    panchangam: "planetary_positions.Moon.longitude",
    jyotishganit: "planets.Moon.longitude",
    vedastro: "raw_responses.planetary_positions.Moon.longitude",
  },
  {
    label: "Sun Longitude",
    panchangam: "planetary_positions.Sun.longitude",
    jyotishganit: "planets.Sun.longitude",
    vedastro: "raw_responses.planetary_positions.Sun.longitude",
  },
];

function getPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined;
  const keys = path.split(".");
  let cur: unknown = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

export type CompareRow = {
  label: string;
  vedastro: unknown;
  panchangam: unknown;
  jyotishganit: unknown;
  hasMultiple: boolean;
};

export function extractCompareRows(
  vedastroOutput: unknown,
  panchangamOutput: unknown,
  jyotishganitOutput: unknown
): CompareRow[] {
  return COMPARE_FIELDS.map((field) => {
    const v = field.vedastro ? getPath(vedastroOutput, field.vedastro) : undefined;
    const p = field.panchangam ? getPath(panchangamOutput, field.panchangam) : undefined;
    const j = field.jyotishganit ? getPath(jyotishganitOutput, field.jyotishganit) : undefined;
    const count = [v, p, j].filter((x) => x !== undefined && x !== null).length;
    return {
      label: field.label,
      vedastro: v ?? null,
      panchangam: p ?? null,
      jyotishganit: j ?? null,
      hasMultiple: count >= 2,
    };
  }).filter((row) => row.hasMultiple);
}
