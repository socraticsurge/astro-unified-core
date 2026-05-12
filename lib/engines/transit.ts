// Transit engine client — calls the /transit endpoint on our Python sidecar.
// Returns cast_transit() output: planetary transits, Sade Sati, Rahu-Ketu axis.

const SIDECAR =
  process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";

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
  try {
    const res = await fetch(`${SIDECAR}/transit`, {
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
    const json = (await res.json()) as { status?: string; data?: unknown; transit_date?: string };
    return { data: json.data ?? null, transit_date: json.transit_date };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
