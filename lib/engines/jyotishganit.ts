import { SIDECAR_URL as SIDECAR } from "@/lib/python-sidecar";

export type JyotishganitInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
};

export type JyotishganitOutput = {
  data: unknown;
  error?: string;
};

export async function fetchJyotishganit(
  input: JyotishganitInput
): Promise<JyotishganitOutput> {
  try {
    const res = await fetch(`${SIDECAR}/calculate`, {
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
