import { find as findTimezone } from "geo-tz";

export type GeoResult = {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset: number;
  display_name: string;
};

type NominatimRow = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

const UA = "AstroChaganti/1.0 (https://astrochaganti.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

async function nominatimQuery(query: string, limit = 3): Promise<NominatimRow[]> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
  return (await res.json()) as NominatimRow[];
}

// Build a cascade of progressively-relaxed query variants.
// We try each in order and pick the first that returns results.
export function queryVariants(input: string): string[] {
  const trimmed = input.trim();
  const variants = new Set<string>();
  variants.add(trimmed);

  // If there's no comma, also try with ", India" (most users here)
  if (!trimmed.includes(",")) {
    variants.add(`${trimmed}, India`);
  }

  // Drop everything after the first comma — handles
  //   "Vishakhapatnam, AP" -> "Vishakhapatnam" (typo still won't match,
  //   but worth one attempt)
  const firstSegment = trimmed.split(",")[0].trim();
  if (firstSegment && firstSegment !== trimmed) {
    variants.add(firstSegment);
    variants.add(`${firstSegment}, India`);
  }

  // Drop everything BEFORE the last comma — useful when users type
  //   "Some Village, Visakhapatnam district" and only the last part
  //   is a known city.
  if (trimmed.includes(",")) {
    const lastSegment = trimmed.split(",").slice(-1)[0].trim();
    const allButLast = trimmed.split(",").slice(0, -1).join(",").trim();
    if (lastSegment) variants.add(lastSegment);
    if (allButLast) variants.add(allButLast);
  }

  return Array.from(variants);
}

async function bestMatch(input: string): Promise<NominatimRow> {
  const variants = queryVariants(input);
  let lastError: Error | null = null;

  for (const q of variants) {
    try {
      const rows = await nominatimQuery(q, 3);
      if (rows.length > 0) {
        // Pick the highest-importance result; Nominatim usually orders
        // them already, so rows[0] is fine.
        return rows[0];
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // Keep trying other variants even if one HTTP call fails.
    }
  }

  if (lastError) throw lastError;
  throw new Error(
    `We couldn't find "${input}". Try the nearest larger city — for example, the closest district headquarters.`
  );
}

export async function geocodePlace(place: string): Promise<GeoResult> {
  const row = await bestMatch(place);
  const latitude = parseFloat(row.lat);
  const longitude = parseFloat(row.lon);

  const timezones = findTimezone(latitude, longitude);
  const timezone = timezones[0] ?? "UTC";

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC+0";
  // Intl.DateTimeFormat may return "GMT+5:30" or "UTC+5:30" depending on the runtime
  const match = offsetPart.match(/(?:UTC|GMT)([+-]\d+(?::\d+)?)/);
  let timezone_offset = 0;
  if (match) {
    const offsetParts = match[1].split(":");
    const hours = parseInt(offsetParts[0], 10);
    const minutes = offsetParts[1] !== undefined ? parseInt(offsetParts[1], 10) : 0;
    const sign = match[1].startsWith("-") ? -1 : 1;
    timezone_offset = isNaN(hours) || isNaN(minutes) ? 0 : hours + sign * (minutes / 60);
  }

  return {
    latitude,
    longitude,
    timezone,
    timezone_offset,
    display_name: row.display_name,
  };
}
