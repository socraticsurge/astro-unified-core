const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

const NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];

export function longitudeToSign(lon: number): string {
  const normalized = ((lon % 360) + 360) % 360;
  return SIGNS[Math.floor(normalized / 30)];
}

export function longitudeToDegreesInSign(lon: number): string {
  const normalized = ((lon % 360) + 360) % 360;
  const deg = normalized % 30;
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${m.toString().padStart(2,"0")}′`;
}

export function longitudeToNakshatra(lon: number): string {
  const normalized = ((lon % 360) + 360) % 360;
  return NAKSHATRAS[Math.floor(normalized / (360 / 27))];
}

export function parseVedAstroPlanets(raw: string): Array<{ name: string; longitude: number; sign: string; degrees: string; nakshatra: string }> {
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(entry => {
    const [name, lonStr] = entry.split(" - ");
    const longitude = parseFloat(lonStr);
    return {
      name: name.trim(),
      longitude,
      sign: longitudeToSign(longitude),
      degrees: longitudeToDegreesInSign(longitude),
      nakshatra: longitudeToNakshatra(longitude),
    };
  });
}

export function houseNumberToName(h: string): string {
  const n = parseInt(h.replace("House", ""));
  const suffixes = ["","st","nd","rd"];
  const suffix = n <= 3 ? suffixes[n] : "th";
  return `${n}${suffix} House`;
}

// Theme-aware dignity badge colors. Mapping (semantic, not literal palette):
//   Exalted     → success      (best dignity, fortunate)
//   OwnSign     → accent        (strong/confident, our gold brand color)
//   Debilitated → danger        (weakest dignity, challenged)
//   Friend      → cool          (favorable / supportive)
//   Enemy       → warning       (caution, contested)
//   default     → ink-4 muted   (no dignity / unknown)
//
// Previously used raw Tailwind palette utilities (emerald / blue / red /
// teal / orange / gray with numeric weight suffixes), which didn't adapt
// to the Vellum light theme. Same class of bug as the recent Tarabalam
// regression. See scripts/check-no-raw-palette.sh for the CI guard.
export function dignityBadgeColor(dignity: string): string {
  switch (dignity) {
    case "Exalted":
      return "text-[var(--color-success)] bg-[var(--color-success-faint)] border-[var(--color-success-border)]";
    case "OwnSign":
      return "text-[var(--color-accent)] bg-[var(--color-accent-faint)] border-[var(--color-accent-dim)]";
    case "Debilitated":
      return "text-[var(--color-danger)] bg-[var(--color-danger-faint)] border-[var(--color-danger-border)]";
    case "Friend":
      return "text-[var(--color-cool)] bg-[var(--color-cool-bg)] border-[var(--color-border)]";
    case "Enemy":
      return "text-[var(--color-warning)] bg-[var(--color-warning-faint)] border-[var(--color-warning-border)]";
    default:
      return "text-[var(--color-ink-4)] bg-[var(--color-surface-1)] border-[var(--color-border)]";
  }
}
