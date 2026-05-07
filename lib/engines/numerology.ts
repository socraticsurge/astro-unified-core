import { SIDECAR_URL as SIDECAR } from "@/lib/python-sidecar";

export type NumerologyInput = {
  date_of_birth: string;
  name: string;
};

export type NumerologyOutput = {
  data: unknown;
  error?: string;
};

export async function fetchNumerology(input: NumerologyInput): Promise<NumerologyOutput> {
  try {
    // The sidecar's BirthData model requires lat/lng/tz — pass dummy values since numerology doesn't use them
    const body = {
      date_of_birth: input.date_of_birth,
      time_of_birth: "00:00",
      latitude: 0,
      longitude: 0,
      timezone_offset: 0,
      timezone: "UTC",
      name: input.name,
    };
    const res = await fetch(`${SIDECAR}/calculate/numerology`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return { data: null, error: (err as { detail?: string }).detail ?? res.statusText };
    }
    const json = await res.json();
    return { data: json.data };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
