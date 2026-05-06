const SIDECAR = process.env.PYTHON_SIDECAR_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/python` : "http://localhost:3000/api/python");

export type HellenisticInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
  timezone: string;
};

export type HellenisticOutput = {
  data: unknown;
  error?: string;
};

export async function fetchHellenistic(input: HellenisticInput): Promise<HellenisticOutput> {
  try {
    const res = await fetch(`${SIDECAR}/calculate/hellenistic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
