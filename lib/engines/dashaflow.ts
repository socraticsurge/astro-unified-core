// DashaFlow Vedic chart engine.
//
// Calls our self-hosted Python sidecar (separate Vercel project, no Next.js)
// which wraps the DashaFlow library (Swiss Ephemeris + Lahiri ayanamsha).
// Computes locally — no third-party API rate limits.
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

export async function fetchDashaflow(input: DashaflowInput): Promise<DashaflowOutput> {
  try {
    const res = await fetch(`${SIDECAR}/calculate`, {
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
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
