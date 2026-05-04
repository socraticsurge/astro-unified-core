import { find as findTimezone } from "geo-tz";

export type GeoResult = {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset: number;
  display_name: string;
};

export async function geocodePlace(place: string): Promise<GeoResult> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "AstroUnified/1.0" },
  });
  if (!res.ok) throw new Error(`Geocoding failed: ${res.statusText}`);

  const data = await res.json();
  if (!data.length) throw new Error(`Place not found: ${place}`);

  const { lat, lon, display_name } = data[0];
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  const timezones = findTimezone(latitude, longitude);
  const timezone = timezones[0] ?? "UTC";

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC+0";
  const match = offsetPart.match(/UTC([+-]\d+(?::\d+)?)/);
  let timezone_offset = 0;
  if (match) {
    const parts = match[1].split(":");
    const hours = Number(parts[0]);
    const minutes = parts[1] !== undefined ? Number(parts[1]) : 0;
    timezone_offset = hours + (hours < 0 ? -minutes / 60 : minutes / 60);
  }

  return { latitude, longitude, timezone, timezone_offset, display_name };
}
