// Career engine client — calls the /career endpoint on our Python sidecar.
// Returns analyze_career() output: D10 themes, planet-domain recommendations.
import "server-only";

import { credentialedDashaflowSidecarConfig } from "./dashaflow-config";
import { fetchWithRetry } from "./fetch-with-retry";

const CAREER_UNAVAILABLE =
  "Career calculation is temporarily unavailable. Please try again.";

export type CareerInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type CareerOutput = {
  data: unknown;
  error?: string;
};

export async function fetchCareer(input: CareerInput): Promise<CareerOutput> {
  const config = credentialedDashaflowSidecarConfig("/career");
  if (!config) return { data: null, error: CAREER_UNAVAILABLE };

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
      return { data: null, error: CAREER_UNAVAILABLE };
    }
    const json = (await res.json()) as { status?: string; data?: unknown };
    return { data: json.data ?? null };
  } catch (e) {
    const isTimeout = e instanceof Error && e.name === "TimeoutError";
    return {
      data: null,
      error: isTimeout
        ? "Sidecar request timed out. Please try again."
        : CAREER_UNAVAILABLE,
    };
  }
}
