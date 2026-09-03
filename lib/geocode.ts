import { createHash } from "node:crypto";
import { find as findTimezone } from "geo-tz";
import {
  authenticatedProfileGeocoderConfig,
  guestGeocoderConfig,
  type GeocoderConfig,
} from "./geocoder-config";
import { deploymentEnvironment } from "./deployment-environment";
import {
  readSharedGeocodeCache,
  writeSharedGeocodeCache,
  type SharedGeocodeRow,
} from "./shared-geocode-cache";
import { enforceAuthenticatedGeocoderRateLimit } from "./authenticated-geocoder-rate-limit";
import { enforceGeocoderDailyRequestBudget } from "./geocoder-provider-budget";

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

type NormalizedProviderRow = SharedGeocodeRow;

const PROVIDER_MIN_INTERVAL_MS = 1_000;
const PROVIDER_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;
const PROVIDER_CACHE_MAX_ENTRIES = 256;
const PROVIDER_MAX_OUTSTANDING_REQUESTS = 8;
const PROVIDER_MAX_GUEST_OUTSTANDING_REQUESTS = 6;
const PROVIDER_REQUEST_DEADLINE_MS = 8_000;
const PROVIDER_MAX_RESPONSE_BYTES = 64 * 1_024;
const GEOCODER_PROCESS_STATE_VERSION = 3 as const;
const SAFE_PROVIDER_FIELDS = new Set([
  "provider_id",
  "place_id",
  "osm_type",
  "osm_id",
  "lat",
  "lon",
  "display_name",
  "importance",
]);

type CachedRows = {
  expiresAt: number;
  rows: NormalizedProviderRow[];
};

type RequestAudience = "guest" | "authenticated";

type PendingProviderRequest = {
  promise: Promise<NormalizedProviderRow[]>;
  controller: AbortController;
  audience: RequestAudience;
  subscribers: number;
  settled: boolean;
};

type GeocoderProcessState = {
  version: typeof GEOCODER_PROCESS_STATE_VERSION;
  cache: Map<string, CachedRows>;
  requests: Map<string, PendingProviderRequest>;
  queue: Promise<void>;
  lastRequestStartedAt: number | null;
  cacheExpiryTimer: ReturnType<typeof setTimeout> | null;
};

const processGlobal = globalThis as typeof globalThis & {
  __astroChagantiGeocoderState?: GeocoderProcessState;
};
const existingProcessState = processGlobal.__astroChagantiGeocoderState;
const processState: GeocoderProcessState =
  existingProcessState?.version === GEOCODER_PROCESS_STATE_VERSION
    ? existingProcessState
    : {
      version: GEOCODER_PROCESS_STATE_VERSION,
      cache: new Map<string, CachedRows>(),
      requests: new Map<string, PendingProviderRequest>(),
      queue: Promise.resolve(),
      lastRequestStartedAt: null,
      cacheExpiryTimer: null,
    };
processGlobal.__astroChagantiGeocoderState = processState;

function normalizedCacheQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function providerRequestKey(query: string, config: GeocoderConfig): string {
  return createHash("sha256")
    .update(config.searchUrl)
    .update("\u0000")
    .update(normalizedCacheQuery(query))
    .digest("hex");
}

function purgeExpiredCache(now = Date.now()): void {
  for (const [key, value] of processState.cache) {
    if (value.expiresAt <= now) processState.cache.delete(key);
  }
}

function scheduleCacheExpiry(): void {
  if (processState.cacheExpiryTimer !== null) {
    clearTimeout(processState.cacheExpiryTimer);
    processState.cacheExpiryTimer = null;
  }
  const nextExpiry = Array.from(processState.cache.values())
    .reduce<number | null>(
      (earliest, value) => earliest === null
        ? value.expiresAt
        : Math.min(earliest, value.expiresAt),
      null,
    );
  if (nextExpiry === null) return;

  const timer = setTimeout(() => {
    processState.cacheExpiryTimer = null;
    purgeExpiredCache();
    scheduleCacheExpiry();
  }, Math.max(0, nextExpiry - Date.now()));
  const unref = (timer as unknown as { unref?: () => void }).unref;
  if (typeof unref === "function") unref.call(timer);
  processState.cacheExpiryTimer = timer;
}

function cachedRows(key: string): NormalizedProviderRow[] | null {
  purgeExpiredCache();
  scheduleCacheExpiry();
  const cached = processState.cache.get(key);
  if (!cached) return null;

  // Refresh insertion order so the bounded map behaves like a small LRU.
  processState.cache.delete(key);
  processState.cache.set(key, cached);
  return cached.rows;
}

function cacheRows(key: string, rows: NormalizedProviderRow[]): void {
  purgeExpiredCache();
  if (processState.cache.size >= PROVIDER_CACHE_MAX_ENTRIES) {
    const oldest = processState.cache.keys().next().value;
    if (typeof oldest === "string") processState.cache.delete(oldest);
  }
  processState.cache.set(key, {
    expiresAt: Date.now() + PROVIDER_CACHE_TTL_MS,
    rows,
  });
  scheduleCacheExpiry();
}

function deadlineError(): Error {
  return new Error("Geocoder request timed out");
}

function cancellationError(): Error {
  return new Error("Geocoder request cancelled");
}

function safeAbortReason(signal: AbortSignal): Error {
  const reason = signal.reason;
  if (
    reason instanceof Error
    && (
      reason.message === "Geocoder request timed out"
      || reason.message === "Geocoder request cancelled"
    )
  ) {
    return new Error(reason.message);
  }
  return deadlineError();
}

function withAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(safeAbortReason(signal));
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(safeAbortReason(signal));
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

async function waitForProviderSlot(
  deadlineAt: number,
  signal: AbortSignal,
): Promise<void> {
  const slot = processState.queue.then(async () => {
    if (signal.aborted) throw safeAbortReason(signal);
    if (Date.now() >= deadlineAt) throw deadlineError();
    if (processState.lastRequestStartedAt !== null) {
      const waitMs = Math.max(
        0,
        processState.lastRequestStartedAt + PROVIDER_MIN_INTERVAL_MS - Date.now(),
      );
      if (waitMs > 0) {
        await withAbort(
          new Promise<void>((resolve) => setTimeout(resolve, waitMs)),
          signal,
        );
      }
    }
    if (signal.aborted) throw safeAbortReason(signal);
    if (Date.now() >= deadlineAt) throw deadlineError();
    processState.lastRequestStartedAt = Date.now();
  });
  processState.queue = slot.catch(() => undefined);
  await withAbort(slot, signal);
}

function normalizedCoordinate(
  value: unknown,
  min: number,
  max: number,
): string | null {
  const text = typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : typeof value === "string"
      ? value.trim()
      : "";
  if (
    !text
    || text.length > 32
    || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)
  ) return null;
  const coordinate = Number(text);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
    ? String(coordinate)
    : null;
}

function normalizedDisplayName(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1_024) return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function boundedIdentifier(value: unknown): number | string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length <= 80) return value;
  return undefined;
}

function providerPayloadRows(
  payload: unknown,
  config: GeocoderConfig,
): unknown[] {
  if (config.responseEnvelope === "array") {
    if (!Array.isArray(payload)) throw new Error("Geocoder response was invalid");
    return payload;
  }
  if (
    !payload
    || typeof payload !== "object"
    || Array.isArray(payload)
    || !Array.isArray((payload as Record<string, unknown>).results)
  ) {
    throw new Error("Geocoder response was invalid");
  }
  return (payload as { results: unknown[] }).results;
}

function normalizedProviderRows(
  payload: unknown,
  config: GeocoderConfig,
): { rows: NormalizedProviderRow[]; sourceWasEmpty: boolean } {
  const providerRows = providerPayloadRows(payload, config);
  const normalized: NormalizedProviderRow[] = [];
  for (const value of providerRows.slice(0, 5)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const lat = normalizedCoordinate(row.lat, -90, 90);
    const lon = normalizedCoordinate(row.lon, -180, 180);
    const displayName = normalizedDisplayName(
      config.responseEnvelope === "results" ? row.formatted : row.display_name,
    );
    if (lat === null || lon === null || displayName === null) continue;

    const normalizedRow: NormalizedProviderRow = {
      lat,
      lon,
      display_name: displayName,
    };
    const placeId = boundedIdentifier(row.place_id);
    const osmId = boundedIdentifier(row.osm_id);
    if (placeId !== undefined && config.provider !== "nominatim-local") {
      normalizedRow.provider_id = String(placeId);
    }
    if (placeId !== undefined) normalizedRow.place_id = placeId;
    if (osmId !== undefined) normalizedRow.osm_id = osmId;
    if (
      row.osm_type === "node"
      || row.osm_type === "way"
      || row.osm_type === "relation"
    ) normalizedRow.osm_type = row.osm_type;
    if (typeof row.importance === "number" && Number.isFinite(row.importance)) {
      normalizedRow.importance = row.importance;
    }
    normalized.push(normalizedRow);
  }
  return { rows: normalized, sourceWasEmpty: providerRows.length === 0 };
}

function parseProviderJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("Geocoder response was invalid");
  }
}

async function readBoundedProviderJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers?.get("content-length");
  if (declaredLength?.trim().match(/^\d+$/)) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length > PROVIDER_MAX_RESPONSE_BYTES) {
      throw new Error("Geocoder response was invalid");
    }
  }

  if (response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytesRead = 0;
    let text = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytesRead += value.byteLength;
        if (bytesRead > PROVIDER_MAX_RESPONSE_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw new Error("Geocoder response was invalid");
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    return parseProviderJson(text);
  }

  // Standards-compliant fetch responses expose either a body stream or text().
  // The json() fallback keeps existing minimal unit-test doubles bounded after
  // serialization; production requests use the streaming path above.
  if (typeof response.text === "function") {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > PROVIDER_MAX_RESPONSE_BYTES) {
      throw new Error("Geocoder response was invalid");
    }
    return parseProviderJson(text);
  }
  const payload: unknown = await response.json();
  const serialized = JSON.stringify(payload);
  if (
    serialized === undefined
    || new TextEncoder().encode(serialized).byteLength > PROVIDER_MAX_RESPONSE_BYTES
  ) {
    throw new Error("Geocoder response was invalid");
  }
  return payload;
}

function providerSearchUrl(query: string, config: GeocoderConfig): URL {
  const url = new URL(config.searchUrl);
  url.searchParams.set(config.queryParameter, query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  if (config.responseEnvelope === "array") {
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("dedupe", "1");
    if (
      config.provider === "locationiq-eu"
      || config.provider === "locationiq-us"
    ) {
      // Pin LocationIQ to its OSM-only dataset so the linked data credit we
      // return matches the provider request contract.
      url.searchParams.set("source", "nom");
    }
  }
  if (config.apiKeyParameter && config.apiKey) {
    url.searchParams.set(config.apiKeyParameter, config.apiKey);
  }
  return url;
}

function subscribeToProviderRequest(
  pending: PendingProviderRequest,
  callerSignal?: AbortSignal,
): Promise<NormalizedProviderRow[]> {
  if (callerSignal?.aborted) return Promise.reject(cancellationError());
  pending.subscribers += 1;

  return new Promise<NormalizedProviderRow[]>((resolve, reject) => {
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      pending.subscribers = Math.max(0, pending.subscribers - 1);
      if (
        pending.subscribers === 0
        && !pending.settled
        && !pending.controller.signal.aborted
      ) {
        pending.controller.abort(cancellationError());
      }
    };
    const cleanup = () => callerSignal?.removeEventListener("abort", abort);
    const abort = () => {
      cleanup();
      release();
      reject(cancellationError());
    };
    callerSignal?.addEventListener("abort", abort, { once: true });

    pending.promise.then(
      (rows) => {
        cleanup();
        release();
        resolve(rows);
      },
      (error) => {
        cleanup();
        release();
        reject(error);
      },
    );
    if (callerSignal?.aborted) abort();
  });
}

async function fetchProviderRows(
  query: string,
  config: GeocoderConfig,
  audience: RequestAudience,
  callerSignal?: AbortSignal,
): Promise<NormalizedProviderRow[]> {
  if (callerSignal?.aborted) throw cancellationError();
  const key = providerRequestKey(query, config);
  const useSharedCache = deploymentEnvironment() === "deployed"
    && config.provider !== "nominatim-local";
  if (useSharedCache) {
    const shared = await readSharedGeocodeCache(key);
    if (callerSignal?.aborted) throw cancellationError();
    if (shared.status === "unavailable") {
      throw new Error("Geocoder cache unavailable");
    }
    if (shared.status === "hit") return shared.rows;
  } else {
    const cached = cachedRows(key);
    if (cached) return cached;
  }

  const pending = processState.requests.get(key);
  if (pending && !pending.settled && !pending.controller.signal.aborted) {
    return subscribeToProviderRequest(pending, callerSignal);
  }
  if (pending && processState.requests.get(key) === pending) {
    processState.requests.delete(key);
  }

  const guestOutstanding = Array.from(processState.requests.values())
    .filter((request) => request.audience === "guest").length;
  if (
    processState.requests.size >= PROVIDER_MAX_OUTSTANDING_REQUESTS
    || (
      audience === "guest"
      && guestOutstanding >= PROVIDER_MAX_GUEST_OUTSTANDING_REQUESTS
    )
  ) {
    throw new Error("Geocoder is busy");
  }

  const deadlineAt = Date.now() + PROVIDER_REQUEST_DEADLINE_MS;
  const controller = new AbortController();
  const deadline = setTimeout(
    () => controller.abort(deadlineError()),
    PROVIDER_REQUEST_DEADLINE_MS,
  );

  const pendingRequest: PendingProviderRequest = {
    promise: Promise.resolve([]),
    controller,
    audience,
    subscribers: 0,
    settled: false,
  };

  const request = (async () => {
    try {
      if (config.provider !== "nominatim-local") {
        const budget = await enforceGeocoderDailyRequestBudget();
        if (budget.unavailable) {
          throw new Error("Geocoder daily budget unavailable");
        }
        if (!budget.success) {
          throw new Error("Geocoder daily budget exhausted");
        }
      }
      await waitForProviderSlot(deadlineAt, controller.signal);

      const url = providerSearchUrl(query, config);

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": config.identity,
        },
        cache: "no-store",
        redirect: "error",
        signal: controller.signal,
      });
      let normalized: ReturnType<typeof normalizedProviderRows>;
      if (
        res.status === 404
        && (
          config.provider === "locationiq-eu"
          || config.provider === "locationiq-us"
        )
      ) {
        await res.body?.cancel().catch(() => undefined);
        normalized = { rows: [], sourceWasEmpty: true };
      } else {
        if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
        const payload = await readBoundedProviderJson(res);
        normalized = normalizedProviderRows(payload, config);
      }
      if (normalized.rows.length > 0 || normalized.sourceWasEmpty) {
        if (useSharedCache) {
          const stored = await writeSharedGeocodeCache(key, normalized.rows);
          if (!stored.ok) throw new Error("Geocoder cache unavailable");
        } else {
          cacheRows(key, normalized.rows);
        }
      }
      return normalized.rows;
    } catch (error) {
      if (
        error instanceof Error
        && (
          error.message === "Geocoder is busy"
          || error.message === "Geocoder request timed out"
          || error.message === "Geocoder request cancelled"
          || error.message === "Geocoder cache unavailable"
          || error.message === "Geocoder daily budget unavailable"
          || error.message === "Geocoder daily budget exhausted"
          || error.message === "Geocoder response was invalid"
          || /^Geocoder HTTP \d{3}$/.test(error.message)
        )
      ) throw error;
      throw new Error(
        controller.signal.aborted
          ? safeAbortReason(controller.signal).message
          : "Geocoder request failed",
      );
    } finally {
      clearTimeout(deadline);
    }
  })();

  pendingRequest.promise = request;
  processState.requests.set(key, pendingRequest);
  void request.then(
    () => {
      pendingRequest.settled = true;
      if (processState.requests.get(key) === pendingRequest) {
        processState.requests.delete(key);
      }
    },
    () => {
      pendingRequest.settled = true;
      if (processState.requests.get(key) === pendingRequest) {
        processState.requests.delete(key);
      }
    },
  );
  return subscribeToProviderRequest(pendingRequest, callerSignal);
}

async function providerQuery(
  query: string,
  config: GeocoderConfig,
  limit = 3,
  audience: RequestAudience = "authenticated",
  callerSignal?: AbortSignal,
): Promise<NormalizedProviderRow[]> {
  const boundedLimit = Math.max(1, Math.min(5, Math.floor(limit)));
  return (await fetchProviderRows(query, config, audience, callerSignal))
    .slice(0, boundedLimit);
}

/** Clears only process-local limiter/cache state. Used by deterministic tests. */
export function resetGeocoderProcessStateForTests(): void {
  if (processState.cacheExpiryTimer !== null) {
    clearTimeout(processState.cacheExpiryTimer);
    processState.cacheExpiryTimer = null;
  }
  for (const request of processState.requests.values()) {
    if (!request.controller.signal.aborted) {
      request.controller.abort(cancellationError());
    }
  }
  processState.cache.clear();
  processState.requests.clear();
  processState.queue = Promise.resolve();
  processState.lastRequestStartedAt = null;
}

/** Read-only, aggregate process state for deterministic resource/privacy tests. */
export function geocoderProcessStateForTests(): {
  cacheEntries: number;
  outstandingRequests: number;
  guestOutstandingRequests: number;
  authenticatedOutstandingRequests: number;
  cacheKeysAreHashed: boolean;
  cachedRowsContainUnknownFields: boolean;
} {
  const cachedRowsContainUnknownFields = Array.from(processState.cache.values())
    .some(({ rows }) => rows.some((row) => (
      Object.keys(row).some((field) => !SAFE_PROVIDER_FIELDS.has(field))
    )));
  const requests = Array.from(processState.requests.values());
  return {
    cacheEntries: processState.cache.size,
    outstandingRequests: processState.requests.size,
    guestOutstandingRequests: requests
      .filter((request) => request.audience === "guest").length,
    authenticatedOutstandingRequests: requests
      .filter((request) => request.audience === "authenticated").length,
    cacheKeysAreHashed: Array.from(processState.cache.keys())
      .every((key) => /^[a-f0-9]{64}$/.test(key)),
    cachedRowsContainUnknownFields,
  };
}

function timezoneAt(latitude: number, longitude: number): string {
  return findTimezone(latitude, longitude)[0] ?? "UTC";
}

function placeResultId(
  row: NormalizedProviderRow,
  config: GeocoderConfig,
  latitude: number,
  longitude: number,
): string {
  if (config.provider !== "nominatim-local") {
    const providerId = row.provider_id;
    if (providerId) {
      let encoded: string | null = null;
      try {
        const candidate = encodeURIComponent(providerId);
        if (candidate.length <= 96) encoded = candidate;
      } catch {
        // Ill-formed Unicode is replaced by the stable hash below.
      }
      const bounded = encoded ?? `sha256-${createHash("sha256")
        .update(Buffer.from(providerId, "utf16le"))
        .digest("hex")
        .slice(0, 32)}`;
      return `${config.provider}:${bounded}`;
    }
    return `${config.provider}:coordinates:${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  }
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
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<PlaceSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const config = guestGeocoderConfig();
  if (!config) throw new Error("Geocoder configuration unavailable");
  const rows = await providerQuery(normalized, config, 5, "guest", signal);
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
      id: placeResultId(row, config, latitude, longitude),
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

async function bestMatch(
  input: string,
  authenticatedUserId?: string,
): Promise<NormalizedProviderRow> {
  const config = authenticatedProfileGeocoderConfig();
  if (!config) throw new Error("Geocoder configuration unavailable");
  if (
    deploymentEnvironment() === "deployed"
    && config.provider !== "nominatim-local"
  ) {
    if (!authenticatedUserId) {
      throw new Error("Geocoder request unavailable");
    }
    const limit = await enforceAuthenticatedGeocoderRateLimit(
      authenticatedUserId,
    );
    if (limit.unavailable) throw new Error("Geocoder request unavailable");
    if (!limit.success) {
      throw new Error("Too many location requests. Please wait a minute.");
    }
  }
  const variants = config.provider === "nominatim-local"
    ? queryVariants(input)
    : [input.trim()];
  let lastError: Error | null = null;

  for (const q of variants) {
    try {
      const rows = await providerQuery(q, config, 3, "authenticated");
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

export async function geocodePlace(
  place: string,
  options: { authenticatedUserId?: string } = {},
): Promise<GeoResult> {
  const row = await bestMatch(place, options.authenticatedUserId);
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
