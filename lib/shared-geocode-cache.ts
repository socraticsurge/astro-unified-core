import "server-only";

import { createHmac } from "node:crypto";
import {
  redisRestCommand,
  redisRestConfig,
  type RedisRestConfig,
} from "./redis-rest";

export type SharedGeocodeRow = {
  provider_id?: string;
  place_id?: number | string;
  osm_type?: "node" | "way" | "relation";
  osm_id?: number | string;
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

export type SharedGeocodeCacheRead =
  | { status: "hit"; rows: SharedGeocodeRow[] }
  | { status: "miss" }
  | { status: "unavailable"; configured: boolean };

type SharedGeocodeCacheOptions = {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

const CACHE_VERSION = 1 as const;
const CACHE_TTL_SECONDS = 24 * 60 * 60;
const CACHE_MAX_VALUE_BYTES = 64 * 1_024;
const SAFE_FIELDS = new Set([
  "provider_id",
  "place_id",
  "osm_type",
  "osm_id",
  "lat",
  "lon",
  "display_name",
  "importance",
]);

function boundedIdentifier(value: unknown): number | string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length <= 80) return value;
  return undefined;
}

function coordinate(
  value: unknown,
  min: number,
  max: number,
): string | null {
  if (typeof value !== "string" || value.length > 32) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max
    ? String(numeric)
    : null;
}

function safeRows(value: unknown): SharedGeocodeRow[] | null {
  if (!Array.isArray(value) || value.length > 5) return null;
  const rows: SharedGeocodeRow[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const row = entry as Record<string, unknown>;
    if (Object.keys(row).some((field) => !SAFE_FIELDS.has(field))) return null;
    const lat = coordinate(row.lat, -90, 90);
    const lon = coordinate(row.lon, -180, 180);
    if (
      lat === null
      || lon === null
      || typeof row.display_name !== "string"
      || !row.display_name.trim()
      || row.display_name.length > 1_024
    ) return null;

    const safe: SharedGeocodeRow = {
      lat,
      lon,
      display_name: row.display_name.trim(),
    };
    const providerId = boundedIdentifier(row.provider_id);
    const placeId = boundedIdentifier(row.place_id);
    const osmId = boundedIdentifier(row.osm_id);
    if (providerId !== undefined) safe.provider_id = String(providerId);
    if (placeId !== undefined) safe.place_id = placeId;
    if (osmId !== undefined) safe.osm_id = osmId;
    if (
      row.osm_type === "node"
      || row.osm_type === "way"
      || row.osm_type === "relation"
    ) safe.osm_type = row.osm_type;
    if (typeof row.importance === "number" && Number.isFinite(row.importance)) {
      safe.importance = row.importance;
    }
    rows.push(safe);
  }
  return rows;
}

function cacheKey(material: string, config: RedisRestConfig): string {
  const digest = createHmac("sha256", config.token)
    .update(`geocode:v${CACHE_VERSION}:${material}`)
    .digest("hex");
  return `astrochaganti:geocode:v${CACHE_VERSION}:${digest}`;
}

function commandOptions(
  config: RedisRestConfig,
  options: SharedGeocodeCacheOptions,
) {
  return {
    config,
    fetcher: options.fetcher,
    timeoutMs: options.timeoutMs,
    maxResponseBytes: CACHE_MAX_VALUE_BYTES,
  };
}

export async function readSharedGeocodeCache(
  material: string,
  options: SharedGeocodeCacheOptions = {},
): Promise<SharedGeocodeCacheRead> {
  const config = redisRestConfig(options.env);
  if (!config) return { status: "unavailable", configured: false };
  const result = await redisRestCommand(
    ["GET", cacheKey(material, config)],
    commandOptions(config, options),
  );
  if (!result.ok) {
    return { status: "unavailable", configured: result.configured };
  }
  if (result.result === null) return { status: "miss" };
  if (typeof result.result !== "string") {
    return { status: "unavailable", configured: true };
  }
  if (new TextEncoder().encode(result.result).byteLength > CACHE_MAX_VALUE_BYTES) {
    return { status: "unavailable", configured: true };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(result.result) as unknown;
  } catch {
    return { status: "unavailable", configured: true };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { status: "unavailable", configured: true };
  }
  const envelope = payload as { version?: unknown; rows?: unknown };
  if (envelope.version !== CACHE_VERSION) {
    return { status: "unavailable", configured: true };
  }
  const rows = safeRows(envelope.rows);
  return rows === null
    ? { status: "unavailable", configured: true }
    : { status: "hit", rows };
}

export async function writeSharedGeocodeCache(
  material: string,
  rows: readonly SharedGeocodeRow[],
  options: SharedGeocodeCacheOptions = {},
): Promise<{ ok: boolean; configured: boolean }> {
  const config = redisRestConfig(options.env);
  if (!config) return { ok: false, configured: false };
  const normalized = safeRows(rows);
  if (normalized === null) return { ok: false, configured: true };
  const value = JSON.stringify({ version: CACHE_VERSION, rows: normalized });
  if (new TextEncoder().encode(value).byteLength > CACHE_MAX_VALUE_BYTES) {
    return { ok: false, configured: true };
  }
  const result = await redisRestCommand(
    [
      "SET",
      cacheKey(material, config),
      value,
      "EX",
      String(CACHE_TTL_SECONDS),
    ],
    commandOptions(config, options),
  );
  return {
    ok: result.ok && result.result === "OK",
    configured: result.configured,
  };
}
