// DashaFlow Vedic chart engine.
//
// Calls our self-hosted Python sidecar (separate Vercel project, no Next.js)
// which wraps the DashaFlow library (Swiss Ephemeris + Lahiri ayanamsha).
// Computes locally — no third-party API rate limits.
import "server-only";

import { z } from "zod";
import { credentialedDashaflowSidecarConfig } from "./dashaflow-config";
import { fetchWithRetry } from "./fetch-with-retry";

const DEFAULT_SIDECAR = "https://dashaflow-sidecar.vercel.app";

function sidecarUrl(path: string): string {
  const base = (process.env.DASHAFLOW_SIDECAR_URL || DEFAULT_SIDECAR).replace(/\/+$/, "");
  return `${base}${path}`;
}

export type DashaflowInput = {
  date_of_birth: string;   // YYYY-MM-DD
  time_of_birth: string;   // HH:MM
  latitude: number;
  longitude: number;
  timezone: string;        // IANA tz, e.g. "Asia/Kolkata"
};

export type DashaflowOutput = {
  data: unknown;
  error?: string;
};

const CanonicalNakshatraSchema = z.enum([
  "Ashvini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishtha",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati",
]);

const CanonicalRashiSchema = z.enum([
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrischika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
]);

const ProfilePlanetShape = {
  rashi: CanonicalRashiSchema,
  degree: z.number().finite().min(0).lt(30),
  house: z.number().int().min(1).max(12),
  retrograde: z.boolean(),
};

function profilePlanetSchema<const Name extends string>(name: Name) {
  return z.object({
    name: z.literal(name),
    ...ProfilePlanetShape,
  }).strict();
}

const ProfilePlanetsSchema = z.tuple([
  profilePlanetSchema("Surya"),
  profilePlanetSchema("Chandra"),
  profilePlanetSchema("Kuja"),
  profilePlanetSchema("Budha"),
  profilePlanetSchema("Guru"),
  profilePlanetSchema("Shukra"),
  profilePlanetSchema("Shani"),
  profilePlanetSchema("Rahu"),
  profilePlanetSchema("Ketu"),
]);

export const PROFILE_SIDECAR_ATTEMPT_TIMEOUT_MS = 6_000;
export const PROFILE_SIDECAR_RETRY_DELAY_MS = 500;
export const PROFILE_SIDECAR_TOTAL_DEADLINE_MS =
  (PROFILE_SIDECAR_ATTEMPT_TIMEOUT_MS * 2) + PROFILE_SIDECAR_RETRY_DELAY_MS;

export const DashaflowProfileContractSchema = z.object({
  contract_version: z.literal("1.0"),
  engine: z.object({
    name: z.literal("DashaFlow"),
    version: z.string().trim().min(1).max(40),
    ayanamsha: z.literal("Lahiri"),
    ephemeris: z.enum(["swiss", "moshier", "unknown"]),
  }).strict(),
  data: z.object({
    nakshatra: CanonicalNakshatraSchema,
    pada: z.number().int().min(1).max(4),
    janma_rashi: CanonicalRashiSchema,
    lagna: CanonicalRashiSchema,
    lagna_degree: z.number().finite().min(0).lt(30),
    planets: ProfilePlanetsSchema,
  }).strict(),
}).strict();

export type DashaflowProfileContract = z.infer<typeof DashaflowProfileContractSchema>;

export type DashaflowProfileErrorCode =
  | "configuration"
  | "invalid-input"
  | "rate-limited"
  | "unavailable"
  | "invalid-response";

export class DashaflowProfileError extends Error {
  constructor(
    public readonly code: DashaflowProfileErrorCode,
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(code);
    this.name = "DashaflowProfileError";
  }
}

function retryAfterSeconds(response: Response, fallback: number): number {
  const value = Number(response.headers.get("Retry-After"));
  return Number.isInteger(value) && value > 0 && value <= 300 ? value : fallback;
}

export async function fetchDashaflow(input: DashaflowInput): Promise<DashaflowOutput> {
  try {
    const res = await fetchWithRetry(sidecarUrl("/calculate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return {
        data: null,
        error: (err as { detail?: string }).detail ?? `Sidecar HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as { status?: string; data?: unknown };
    return { data: json.data ?? null };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    return {
      data: null,
      error: isTimeout ? "Sidecar request timed out. Please try again." : (e instanceof Error ? e.message : String(e)),
    };
  }
}

/**
 * Calls the credentialed, projection-only profile contract. This deliberately
 * never reads or forwards an upstream error body, so sidecar diagnostics and
 * birth inputs cannot escape through the public guest gateway.
 */
export async function deriveDashaflowProfile(
  input: DashaflowInput,
): Promise<DashaflowProfileContract> {
  const config = credentialedDashaflowSidecarConfig("/v1/profile/derive");
  if (!config) throw new DashaflowProfileError("configuration");

  let response: Response;
  try {
    response = await fetchWithRetry(
      config.url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      },
      PROFILE_SIDECAR_ATTEMPT_TIMEOUT_MS,
      PROFILE_SIDECAR_RETRY_DELAY_MS,
    );
  } catch {
    throw new DashaflowProfileError("unavailable", 5);
  }

  if (!response.ok) {
    if (response.status === 422) throw new DashaflowProfileError("invalid-input");
    if (response.status === 429) {
      throw new DashaflowProfileError("rate-limited", retryAfterSeconds(response, 60));
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new DashaflowProfileError("unavailable", retryAfterSeconds(response, 5));
    }
    if (response.status === 401 || response.status === 403) {
      throw new DashaflowProfileError("configuration");
    }
    throw new DashaflowProfileError("unavailable", 5);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DashaflowProfileError("invalid-response");
  }

  const parsed = DashaflowProfileContractSchema.safeParse(payload);
  if (!parsed.success) throw new DashaflowProfileError("invalid-response");
  return parsed.data;
}
