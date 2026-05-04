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

export function dignityBadgeColor(dignity: string): string {
  switch (dignity) {
    case "Exalted": return "text-emerald-400 bg-emerald-950/40 border-emerald-700/50";
    case "OwnSign": return "text-blue-400 bg-blue-950/40 border-blue-700/50";
    case "Debilitated": return "text-red-400 bg-red-950/40 border-red-700/50";
    case "Friend": return "text-teal-400 bg-teal-950/40 border-teal-700/50";
    case "Enemy": return "text-orange-400 bg-orange-950/40 border-orange-700/50";
    default: return "text-gray-400 bg-gray-800/40 border-gray-600/50";
  }
}
