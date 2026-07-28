// DashaFlow Vedic chart engine.
//
// Calls our self-hosted Python sidecar (separate Vercel project, no Next.js)
// which wraps the DashaFlow library (Swiss Ephemeris + Lahiri ayanamsha).
// Computes locally — no third-party API rate limits.
import { fetchWithRetry } from "./fetch-with-retry";
import { toTimeZoneIsoDate } from "@/lib/local-date";

const SIDECAR =
  process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";

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

export type DashaflowDashaPeriod = {
  planet: string;
  start: string;
  end: string;
  days: number;
};

export type DashaflowSubperiodsOutput = {
  path?: number[];
  parent?: DashaflowDashaPeriod;
  children?: DashaflowDashaPeriod[];
  error?: string;
};

export async function fetchDashaflow(
  input: DashaflowInput,
  queryDate = toTimeZoneIsoDate(new Date(), input.timezone),
): Promise<DashaflowOutput> {
  try {
    const res = await fetchWithRetry(`${SIDECAR}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, query_date: queryDate }),
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

export async function fetchDashaflowSubperiods(
  input: DashaflowInput,
  path: number[],
  queryDate = toTimeZoneIsoDate(new Date(), input.timezone),
): Promise<DashaflowSubperiodsOutput> {
  try {
    const res = await fetchWithRetry(`${SIDECAR}/dasha-subperiods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, query_date: queryDate, path }),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return {
        error: (err as { detail?: string }).detail ?? `Sidecar HTTP ${res.status}`,
      };
    }
    const json = (await res.json()) as {
      status?: string;
      data?: {
        path?: number[];
        parent?: DashaflowDashaPeriod;
        children?: DashaflowDashaPeriod[];
      };
    };
    return json.data ?? { error: "Dasha subperiod response was empty." };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    return {
      error: isTimeout
        ? "Dasha timeline request timed out. Please try again."
        : (e instanceof Error ? e.message : String(e)),
    };
  }
}
