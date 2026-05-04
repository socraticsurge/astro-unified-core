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
    case "Exalted": return "text-green-700 bg-green-50 border-green-200";
    case "OwnSign": return "text-blue-700 bg-blue-50 border-blue-200";
    case "Debilitated": return "text-red-700 bg-red-50 border-red-200";
    case "Friend": return "text-teal-700 bg-teal-50 border-teal-200";
    case "Enemy": return "text-orange-700 bg-orange-50 border-orange-200";
    default: return "text-gray-600 bg-gray-50 border-gray-200";
  }
}
