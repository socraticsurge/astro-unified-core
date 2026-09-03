// Transit engine client — calls the /transit endpoint on our Python sidecar.
// Returns cast_transit() output: planetary transits, Sade Sati, Rahu-Ketu axis.
import "server-only";

import { credentialedDashaflowSidecarConfig } from "./dashaflow-config";
import { fetchWithRetry } from "./fetch-with-retry";

const TRANSIT_UNAVAILABLE =
  "Transit calculation is temporarily unavailable. Please try again.";

export type TransitInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  transit_date?: string; // YYYY-MM-DD, defaults to today on the sidecar
};

export type TransitOutput = {
  data: unknown;
  transit_date?: string;
  error?: string;
};

export async function fetchTransit(input: TransitInput): Promise<TransitOutput> {
  const config = credentialedDashaflowSidecarConfig("/transit");
  if (!config) return { data: null, error: TRANSIT_UNAVAILABLE };

  try {
    const res = await fetchWithRetry(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    });
    if (!res.ok) {
      return { data: null, error: TRANSIT_UNAVAILABLE };
    }
    const json = (await res.json()) as { status?: string; data?: unknown; transit_date?: string };
    return { data: json.data ?? null, transit_date: json.transit_date };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    return {
      data: null,
      error: isTimeout
        ? "Sidecar request timed out. Please try again."
        : TRANSIT_UNAVAILABLE,
    };
  }
}
