import { find as findTimezone } from "geo-tz";
import {
  authenticatedProfileGeocoderConfig,
  guestGeocoderConfig,
  type GeocoderConfig,
} from "./geocoder-config";

export type GeoResult = {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset: number;
  display_name: string;
};

export type PlaceSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export const GEOCODER_ATTRIBUTION = "© OpenStreetMap contributors";

type NominatimRow = {
  place_id?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

const PROVIDER_MIN_INTERVAL_MS = 1_000;
const PROVIDER_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const PROVIDER_CACHE_MAX_ENTRIES = 256;

type CachedRows = {
  expiresAt: number;
  rows: NominatimRow[];
};

type GeocoderProcessState = {
  cache: Map<string, CachedRows>;
  requests: Map<string, Promise<NominatimRow[]>>;
  queue: Promise<void>;
  lastRequestStartedAt: number | null;
};

const processGlobal = globalThis as typeof globalThis & {
  __astroChagantiGeocoderState?: GeocoderProcessState;
};
const processState = processGlobal.__astroChagantiGeocoderState ?? {
  cache: new Map<string, CachedRows>(),
  requests: new Map<string, Promise<NominatimRow[]>>(),
  queue: Promise.resolve(),
  lastRequestStartedAt: null,
};
processGlobal.__astroChagantiGeocoderState = processState;

function normalizedCacheQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function cachedRows(key: string): NominatimRow[] | null {
  const cached = processState.cache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    processState.cache.delete(key);
    return null;
  }

  // Refresh insertion order so the bounded map behaves like a small LRU.
  processState.cache.delete(key);
  processState.cache.set(key, cached);
  return cached.rows;
}

function cacheRows(key: string, rows: NominatimRow[]): void {
  if (processState.cache.size >= PROVIDER_CACHE_MAX_ENTRIES) {
    const oldest = processState.cache.keys().next().value;
    if (typeof oldest === "string") processState.cache.delete(oldest);
  }
  processState.cache.set(key, {
    expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS,
    rows,
  });
}

async function waitForProviderSlot(): Promise<void> {
  const slot = processState.queue.then(async () => {
    if (processState.lastRequestStartedAt !== null) {
      const waitMs = Math.max(
        0,
        processState.lastRequestStartedAt + PROVIDER_MIN_INTERVAL_MS - Date.now(),
      );
      if (waitMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      }
    }
    processState.lastRequestStartedAt = Date.now();
  });
  processState.queue = slot.catch(() => undefined);
  await slot;
}

async function fetchProviderRows(
  query: string,
  config: GeocoderConfig,
): Promise<NominatimRow[]> {
  const key = `${config.searchUrl}\u0000${normalizedCacheQuery(query)}`;
  const cached = cachedRows(key);
  if (cached) return cached;

  const pending = processState.requests.get(key);
  if (pending) return pending;

  const request = (async () => {
    await waitForProviderSlot();

    const url = new URL(config.searchUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("dedupe", "1");

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": config.identity,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
    const rows: unknown = await res.json();
    if (!Array.isArray(rows)) throw new Error("Geocoder response was invalid");
    const typedRows = (rows as NominatimRow[]).slice(0, 5);
    cacheRows(key, typedRows);
    return typedRows;
  })();

  processState.requests.set(key, request);
  try {
    return await request;
  } finally {
    if (processState.requests.get(key) === request) processState.requests.delete(key);
  }
}

async function providerQuery(
  query: string,
  config: GeocoderConfig,
  limit = 3,
): Promise<NominatimRow[]> {
  const boundedLimit = Math.max(1, Math.min(5, Math.floor(limit)));
  return (await fetchProviderRows(query, config)).slice(0, boundedLimit);
}

/** Clears only process-local limiter/cache state. Used by deterministic tests. */
export function resetGeocoderProcessStateForTests(): void {
  processState.cache.clear();
  processState.requests.clear();
  processState.queue = Promise.resolve();
  processState.lastRequestStartedAt = null;
}

function timezoneAt(latitude: number, longitude: number): string {
  return findTimezone(latitude, longitude)[0] ?? "UTC";
}

function placeResultId(row: NominatimRow, latitude: number, longitude: number): string {
  const osmType = row.osm_type;
  const osmId = row.osm_id === undefined ? "" : String(row.osm_id);
  if ((osmType === "node" || osmType === "way" || osmType === "relation") && /^\d+$/.test(osmId)) {
    return `osm:${osmType}:${osmId}`;
  }
  const placeId = row.place_id === undefined ? "" : String(row.place_id);
  if (/^\d+$/.test(placeId)) return `nominatim:${placeId}`;
  return `coordinates:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

/**
 * Submit-based guest search. Unlike geocodePlace(), this deliberately sends
 * exactly one bounded provider request and never cascades into relaxed
 * autocomplete-style queries.
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const config = guestGeocoderConfig();
  if (!config) throw new Error("Geocoder configuration unavailable");
  const rows = await providerQuery(normalized, config, 5);
  const results: PlaceSearchResult[] = [];

  for (const row of rows.slice(0, 5)) {
    const latitude = Number(row.lat);
    const longitude = Number(row.lon);
    const label = typeof row.display_name === "string"
      ? row.display_name.trim().slice(0, 240)
      : "";
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !label
    ) {
      continue;
    }

    results.push({
      id: placeResultId(row, latitude, longitude),
      label,
      latitude,
      longitude,
      timezone: timezoneAt(latitude, longitude),
    });
  }

  return results;
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
  const config = authenticatedProfileGeocoderConfig();
  let lastError: Error | null = null;

  for (const q of variants) {
    try {
      const rows = await providerQuery(q, config, 3);
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

  const timezone = timezoneAt(latitude, longitude);

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
