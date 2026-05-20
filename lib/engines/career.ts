// Career engine client — calls the /career endpoint on our Python sidecar.
// Returns analyze_career() output: D10 themes, planet-domain recommendations.

import { fetchWithRetry } from "./fetch-with-retry";

const SIDECAR =
  process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";

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
  try {
    const res = await fetchWithRetry(`${SIDECAR}/career`, {
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
