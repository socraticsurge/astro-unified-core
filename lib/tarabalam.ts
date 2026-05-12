export const NAKSHATRAS_27 = [
  "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra",
  "Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni",
  "Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
  "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta",
  "Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati",
];

export type TaraQuality = "auspicious" | "inauspicious";

export type Tara = {
  number: number;
  name: string;
  quality: TaraQuality;
  description: string;
};

export const TARAS: Tara[] = [
  { number: 1, name: "Janma",        quality: "inauspicious", description: "Birth nakshatra — intense, avoid new beginnings" },
  { number: 2, name: "Sampat",       quality: "auspicious",   description: "Wealth — prosperous, good for financial matters" },
  { number: 3, name: "Vipat",        quality: "inauspicious", description: "Danger — obstacles and losses likely" },
  { number: 4, name: "Kshema",       quality: "auspicious",   description: "Welfare — fortunate, promotes well-being" },
  { number: 5, name: "Pratyak",      quality: "inauspicious", description: "Obstruction — delays, things blocked" },
  { number: 6, name: "Sadhana",      quality: "auspicious",   description: "Achievement — effort bears fruit" },
  { number: 7, name: "Naidana",      quality: "inauspicious", description: "Loss — significant challenges, avoid major decisions" },
  { number: 8, name: "Mitra",        quality: "auspicious",   description: "Friend — favorable, supportive energies" },
  { number: 9, name: "Parama Mitra", quality: "auspicious",   description: "Supreme Friend — most auspicious Tara" },
];

export function getNakshatraIndex(name: string): number {
  if (!name) return -1;
  const clean = name.trim();
  const exact = NAKSHATRAS_27.indexOf(clean);
  if (exact !== -1) return exact;
  // Prefix match for names with pada/qualifier appended
  return NAKSHATRAS_27.findIndex(n => clean.startsWith(n) || n.startsWith(clean));
}

export function computeTara(birthMoonNakshatra: string, transitNakshatra: string): Tara | null {
  const birthIdx = getNakshatraIndex(birthMoonNakshatra);
  const transitIdx = getNakshatraIndex(transitNakshatra);
  if (birthIdx === -1 || transitIdx === -1) return null;
  // Count from birth nakshatra to transit nakshatra (1-indexed, wrapping at 27)
  const count = ((transitIdx - birthIdx + 27) % 27) + 1;
  // Compress the 27-nakshatra cycle to 1–9 (three repetitions)
  const taraNumber = ((count - 1) % 9) + 1;
  return TARAS[taraNumber - 1];
}

// Moon's mean daily motion in degrees
const MOON_DAILY_DEG = 13.176;

export function extrapolateMoonNakshatra(currentLongitude: number, daysFromNow: number): string {
  const newLon = ((currentLongitude + daysFromNow * MOON_DAILY_DEG) % 360 + 360) % 360;
  return NAKSHATRAS_27[Math.floor(newLon / (360 / 27))];
}

export function taraColor(quality: TaraQuality): string {
  return quality === "auspicious"
    ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/40"
    : "bg-red-900/30 text-red-300 border-red-700/30";
}
