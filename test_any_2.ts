import { queryVariants } from "./lib/geocode";

type NominatimRow = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

const UA = "AstroChaganti/1.0 (https://astrochaganti.com)";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

async function nominatimQuery(query: string, limit = 3): Promise<NominatimRow[]> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Geocoder HTTP ${res.status}`);
  return (await res.json()) as NominatimRow[];
}

export async function bestMatch(input: string): Promise<NominatimRow> {
  const variants = queryVariants(input);
  let lastError: Error | null = null;

  for (const q of variants) {
    try {
      const rows = await nominatimQuery(q, 3);
      if (rows.length > 0) {
        return rows[0];
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  if (lastError) throw lastError;
  throw new Error(
    `We couldn't find "${input}". Try the nearest larger city — for example, the closest district headquarters.`
  );
}

export async function bestMatchParallelBatches(input: string): Promise<NominatimRow> {
  const variants = queryVariants(input);
  let lastError: Error | null = null;

  // Nominatim rate limits to 1 request per second typically, but we can do small batches or
  // maybe we don't need to fire them all. But the prompt says:
  // "Optimizing the cascade could involve parallelizing safe queries, but requires care."
  // Wait, the prompt: "While firing requests in parallel using Promise.any() or similar might be faster, it might trigger rate limits on the free Nominatim API. Optimizing the cascade could involve parallelizing safe queries, but requires care."

  // Maybe we can run Nominatim searches but wait? No, the goal is speed.
  // Actually, wait, Nominatim allows 1 request per second according to their policy.
  // What if we just run 2 at a time? Or what if we use Promise.any but limit concurrency?
}

async function run() {
    const start = Date.now();
    try {
        const res = await bestMatch("Village, Mandal, District, State");
    } catch (e) {
    }
    console.log("Sequential took", Date.now() - start);
}
run();
