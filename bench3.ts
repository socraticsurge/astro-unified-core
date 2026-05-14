import { queryVariants } from "./lib/geocode";

type NominatimRow = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

async function nominatimQuery(query: string, limit = 3): Promise<NominatimRow[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=0`;
  const res = await fetch(url, {
    headers: { "User-Agent": "AstroChaganti/1.0" },
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
  throw new Error(`We couldn't find "${input}".`);
}

export async function bestMatchParallel(input: string): Promise<NominatimRow> {
  const variants = queryVariants(input);
  let lastError: Error | null = null;

  // Launch all queries simultaneously
  const promises = variants.map(q => nominatimQuery(q, 3).catch(e => {
    lastError = e instanceof Error ? e : new Error(String(e));
    return []; // Return empty array on error so it acts like a miss
  }));

  // But we want to check them in order!
  // We can just await them in order, even though they are running in parallel.
  for (const promise of promises) {
    const rows = await promise;
    if (rows.length > 0) {
      return rows[0];
    }
  }

  if (lastError) throw lastError;
  throw new Error(`We couldn't find "${input}".`);
}

async function run() {
    const start = Date.now();
    try {
        await bestMatch("Srikakulam District");
    } catch (e) {}
    console.log("Sequential took", Date.now() - start);

    const start2 = Date.now();
    try {
        await bestMatchParallel("Srikakulam District");
    } catch (e) {}
    console.log("Parallel took", Date.now() - start2);
}
run();
