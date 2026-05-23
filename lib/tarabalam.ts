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
// Sun's mean daily motion in degrees
const SUN_DAILY_DEG = 360 / 365.25;

export function extrapolateMoonLongitude(currentLongitude: number, daysFromNow: number): number {
  return ((currentLongitude + daysFromNow * MOON_DAILY_DEG) % 360 + 360) % 360;
}

export function extrapolateMoonNakshatra(currentLongitude: number, daysFromNow: number): string {
  const lon = extrapolateMoonLongitude(currentLongitude, daysFromNow);
  return NAKSHATRAS_27[Math.floor(lon / (360 / 27))];
}

export function extrapolateSunLongitude(currentLongitude: number, daysFromNow: number): number {
  return ((currentLongitude + daysFromNow * SUN_DAILY_DEG) % 360 + 360) % 360;
}

// Tithi names (1–15 Shukla, 16–30 Krishna; 15 = Purnima, 30 = Amavasya)
const TITHI_NAMES = [
  "Pratipada", "Dwitiya",    "Tritiya",    "Chaturthi",  "Panchami",
  "Shashthi",  "Saptami",    "Ashtami",    "Navami",     "Dashami",
  "Ekadashi",  "Dwadashi",   "Trayodashi", "Chaturdashi", "Purnima",
];

export type Tithi = {
  number: number;   // 1–30
  name: string;     // e.g. "Ekadashi"
  paksha: "Shukla" | "Krishna" | null; // null for Purnima/Amavasya
  label: string;    // compact display e.g. "S·Ekadashi", "Purnima"
};

export function computeTithi(moonLon: number, sunLon: number): Tithi {
  const gap = ((moonLon - sunLon) % 360 + 360) % 360;
  const raw = Math.ceil(gap / 12);                // 1–30 (ceil so 0° → tithi 30/Amavasya)
  const number = raw === 0 ? 30 : raw;
  const idx = (number - 1) % 15;                  // 0–14 within each paksha
  const name = idx === 14 ? (number === 15 ? "Purnima" : "Amavasya") : TITHI_NAMES[idx];
  const paksha: Tithi["paksha"] =
    number === 15 || number === 30 ? null : number <= 15 ? "Shukla" : "Krishna";
  const label =
    number === 15 ? "Purnima"
    : number === 30 ? "Amavasya"
    : `${paksha === "Shukla" ? "S" : "K"}·${name}`;
  return { number, name, paksha, label };
}

export function taraColor(quality: TaraQuality): string {
  // Theme-aware: routes through the same success/danger tokens the rest of
  // the app uses, so light/dark themes adapt correctly.
  return quality === "auspicious"
    ? "bg-[var(--color-success-faint)] text-[var(--color-success)] border-[var(--color-success-border)]"
    : "bg-[var(--color-danger-faint)] text-[var(--color-danger)] border-[var(--color-danger-border)]";
}
