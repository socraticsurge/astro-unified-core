import { queryVariants } from "./lib/geocode";

type NominatimRow = {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
};

// ... we need a test that fails the first few variants to show speedup ...

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

  // We map the array of promises to a race structure or just map them to Promises and then `await` them in order
  const promises = variants.map(q => nominatimQuery(q, 3).catch(e => {
    lastError = e instanceof Error ? e : new Error(String(e));
    return [];
  }));

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
    // Fails the first few variants to show speedup
    const query = "FakeVillage999, Vishakhapatnam";
    const start = Date.now();
    try {
        await bestMatch(query);
    } catch (e) {}
    console.log("Sequential took", Date.now() - start);

    const start2 = Date.now();
    try {
        await bestMatchParallel(query);
    } catch (e) {}
    console.log("Parallel took", Date.now() - start2);
}
run();
