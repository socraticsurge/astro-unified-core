const SIDECAR = process.env.PYTHON_SIDECAR_URL ?? "http://localhost:8001";

export type DashaflowInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset: number;
};

export type DashaflowOutput = {
  data: unknown;
  error?: string;
};

export async function fetchDashaflow(input: DashaflowInput): Promise<DashaflowOutput> {
  try {
    const res = await fetch(`${SIDECAR}/calculate/dashaflow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, name: "Native" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return { data: null, error: (err as { detail?: string }).detail ?? res.statusText };
    }
    const json = await res.json();
    return { data: json.data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
