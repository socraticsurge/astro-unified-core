import type { ParticipantContext } from "./contracts";

const RASI_BY_SIGN: Record<string, string> = {
  aries: "Mesha",
  taurus: "Vrishabha",
  gemini: "Mithuna",
  cancer: "Karka",
  leo: "Simha",
  virgo: "Kanya",
  libra: "Tula",
  scorpio: "Vrischika",
  sagittarius: "Dhanu",
  capricorn: "Makara",
  aquarius: "Kumbha",
  pisces: "Meena",
};

const NAKSHATRA_BY_KEY: Record<string, string> = {
  ashvini: "Ashvini",
  ashwini: "Ashvini",
  aswini: "Ashvini",
  bharani: "Bharani",
  krittika: "Krittika",
  kritika: "Krittika",
  krithika: "Krittika",
  rohini: "Rohini",
  mrigashira: "Mrigashira",
  mrigashirsha: "Mrigashira",
  ardra: "Ardra",
  punarvasu: "Punarvasu",
  pushya: "Pushya",
  pushyami: "Pushya",
  ashlesha: "Ashlesha",
  aslesha: "Ashlesha",
  magha: "Magha",
  makha: "Magha",
  purvaphalguni: "Purva Phalguni",
  poorvaphalguni: "Purva Phalguni",
  uttaraphalguni: "Uttara Phalguni",
  hasta: "Hasta",
  chitra: "Chitra",
  swati: "Swati",
  vishakha: "Vishakha",
  visakha: "Vishakha",
  anuradha: "Anuradha",
  jyeshtha: "Jyeshtha",
  jyestha: "Jyeshtha",
  mula: "Mula",
  moola: "Mula",
  purvaashadha: "Purva Ashadha",
  poorvaashadha: "Purva Ashadha",
  purvashada: "Purva Ashadha",
  uttaraashadha: "Uttara Ashadha",
  uttarashada: "Uttara Ashadha",
  shravana: "Shravana",
  sravana: "Shravana",
  dhanishtha: "Dhanishtha",
  dhanishta: "Dhanishtha",
  shatabhisha: "Shatabhisha",
  satabhisha: "Shatabhisha",
  purvabhadrapada: "Purva Bhadrapada",
  poorvabhadrapada: "Purva Bhadrapada",
  uttarabhadrapada: "Uttara Bhadrapada",
  revati: "Revati",
};

function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function canonicalRasi(value: unknown): string | undefined {
  const sign = text(value);
  return sign ? RASI_BY_SIGN[key(sign)] : undefined;
}

export function canonicalNakshatra(value: unknown): string | undefined {
  const nakshatra = text(value);
  return nakshatra ? NAKSHATRA_BY_KEY[key(nakshatra)] : undefined;
}

export function extractParticipantContext(
  chartOutput: unknown,
  label: ParticipantContext["label"],
): ParticipantContext | null {
  const root = asRecord(chartOutput);
  const data = asRecord(root?.data) ?? root;
  const planets = asRecord(data?.planets);
  const moon = asRecord(planets?.Moon) ?? asRecord(planets?.moon);
  const lagna = asRecord(data?.lagna) ?? asRecord(planets?.Lagna);

  const janmaNakshatra = canonicalNakshatra(moon?.nakshatra);
  if (!janmaNakshatra) return null;

  const janmaRasi = canonicalRasi(moon?.sign);
  const janmaLagna = canonicalRasi(lagna?.sign);
  return {
    label,
    janma_nakshatra: janmaNakshatra,
    ...(janmaRasi ? { janma_rasi: janmaRasi } : {}),
    ...(janmaLagna ? { janma_lagna: janmaLagna } : {}),
  };
}
