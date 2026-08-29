import "server-only";

import { z } from "zod";
import { fetchWithRetry } from "./fetch-with-retry";

const DEFAULT_SIDECAR = "https://dashaflow-sidecar.vercel.app";
const ELECTION_CHART_PATH = "/v1/election-chart/derive";
// Two transient-error attempts plus the retry delay stay below the browser's
// 20-second request deadline: 8s + 0.5s + 8s = 16.5s maximum.
export const ELECTION_SIDECAR_ATTEMPT_TIMEOUT_MS = 8_000;

const RashiSchema = z.enum([
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

export const ELECTION_CHART_PLANETS = [
  "Surya",
  "Chandra",
  "Kuja",
  "Budha",
  "Guru",
  "Shukra",
  "Shani",
  "Rahu",
  "Ketu",
] as const;

const ElectionPlanetSchema = z.object({
  name: z.enum(ELECTION_CHART_PLANETS),
  rashi: RashiSchema,
  degree: z.number().finite().min(0).lt(30),
  house: z.number().int().min(1).max(12),
  retrograde: z.boolean(),
}).strict();

const ElectionSnapshotSchema = z.object({
  instant: z.string().min(1).max(35),
  lagna: z.object({
    rashi: RashiSchema,
    degree: z.number().finite().min(0).lt(30),
  }).strict(),
  planets: z.array(ElectionPlanetSchema).length(ELECTION_CHART_PLANETS.length),
}).strict().superRefine((snapshot, context) => {
  snapshot.planets.forEach((planet, index) => {
    if (planet.name !== ELECTION_CHART_PLANETS[index]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planets", index, "name"],
        message: "Planet order does not match the election-chart contract",
      });
    }
  });
});

const ElectionLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  timezone: z.string().min(1).max(80).refine((value) => value === value.trim()),
}).strict();

export const DashaflowElectionChartContractSchema = z.object({
  contract_version: z.literal("1.0"),
  engine: z.object({
    name: z.literal("DashaFlow"),
    version: z.string().min(1).max(40).refine((value) => value === value.trim()),
    ayanamsha: z.literal("Lahiri"),
    ephemeris: z.enum(["swiss", "moshier", "mixed", "unknown"]),
  }).strict(),
  house_system: z.literal("whole_sign"),
  location: ElectionLocationSchema,
  data: z.object({
    charts: z.array(ElectionSnapshotSchema).min(1).max(24),
  }).strict(),
}).strict();

export type DashaflowElectionChartInput = {
  contract_version: "1.0";
  location: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
  instants: string[];
};

export type DashaflowElectionChartContract = z.infer<
  typeof DashaflowElectionChartContractSchema
>;

export type DashaflowElectionChartErrorCode =
  | "configuration"
  | "invalid-input"
  | "rate-limited"
  | "unavailable"
  | "invalid-response";

export class DashaflowElectionChartError extends Error {
  constructor(
    public readonly code: DashaflowElectionChartErrorCode,
    public readonly retryAfterSeconds: number | null = null,
  ) {
    super(code);
    this.name = "DashaflowElectionChartError";
  }
}

function sidecarUrl(): string {
  const base = (process.env.DASHAFLOW_SIDECAR_URL || DEFAULT_SIDECAR).replace(/\/+$/, "");
  return `${base}${ELECTION_CHART_PATH}`;
}

function retryAfterSeconds(response: Response, fallback: number): number {
  const value = Number(response.headers.get("Retry-After"));
  return Number.isInteger(value) && value > 0 && value <= 300 ? value : fallback;
}

function responseMatchesRequest(
  contract: DashaflowElectionChartContract,
  input: DashaflowElectionChartInput,
): boolean {
  const sameLocation =
    contract.location.latitude === input.location.latitude
    && contract.location.longitude === input.location.longitude
    && contract.location.timezone === input.location.timezone;
  const sameInstants =
    contract.data.charts.length === input.instants.length
    && contract.data.charts.every((chart, index) => chart.instant === input.instants[index]);
  return sameLocation && sameInstants;
}

/**
 * Calls the credentialed election-chart projection. Only the explicit
 * location and instants in the versioned contract cross the service boundary;
 * browser cookies, activity data, people, and natal-chart data are never sent.
 */
export async function deriveDashaflowElectionCharts(
  input: DashaflowElectionChartInput,
): Promise<DashaflowElectionChartContract> {
  const token = process.env.DASHAFLOW_SIDECAR_TOKEN;
  const validToken = token
    && token === token.trim()
    && /^[\x21-\x7E]+$/.test(token);
  if (!validToken) throw new DashaflowElectionChartError("configuration");

  // Re-project at the final network boundary. TypeScript's structural typing
  // allows an object with extra properties to satisfy this function's type;
  // selecting the wire fields here guarantees those properties never leave.
  const wireInput: DashaflowElectionChartInput = {
    contract_version: input.contract_version,
    location: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      timezone: input.location.timezone,
    },
    instants: [...input.instants],
  };

  let response: Response;
  try {
    response = await fetchWithRetry(sidecarUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wireInput),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    }, ELECTION_SIDECAR_ATTEMPT_TIMEOUT_MS);
  } catch {
    throw new DashaflowElectionChartError("unavailable", 5);
  }

  if (!response.ok) {
    if (response.status === 422) throw new DashaflowElectionChartError("invalid-input");
    if (response.status === 429) {
      throw new DashaflowElectionChartError(
        "rate-limited",
        retryAfterSeconds(response, 60),
      );
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new DashaflowElectionChartError(
        "unavailable",
        retryAfterSeconds(response, 5),
      );
    }
    if (response.status === 401 || response.status === 403) {
      throw new DashaflowElectionChartError("configuration");
    }
    throw new DashaflowElectionChartError("unavailable", 5);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new DashaflowElectionChartError("invalid-response");
  }

  const parsed = DashaflowElectionChartContractSchema.safeParse(payload);
  if (!parsed.success || !responseMatchesRequest(parsed.data, wireInput)) {
    throw new DashaflowElectionChartError("invalid-response");
  }
  return parsed.data;
}
