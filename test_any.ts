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

// Build a cascade of progressively-relaxed query variants.
// We try each in order and pick the first that returns results.
export async function bestMatchParallel(input: string): Promise<NominatimRow> {
  const variants = queryVariants(input);

  // Use Promise.any to fetch all variants in parallel and return the first successful result.
  // We throw an Error if the query array is empty, which allows Promise.any to skip it and continue.
  const promises = variants.map(async (q, index) => {
    // Adding a slight delay based on the index to not overwhelm the API immediately if we can avoid it.
    // However, the issue explicitly mentions that parallel queries might trigger rate limits.
    // "Optimizing the cascade could involve parallelizing safe queries, but requires care."
    // Let's read Nominatim API usage policy.

    const rows = await nominatimQuery(q, 3);
    if (rows.length > 0) {
      return { row: rows[0], index };
    }
    throw new Error(`No results for ${q}`);
  });

  try {
      const results = await Promise.allSettled(promises);
      let bestIndex = Infinity;
      let bestRow: NominatimRow | null = null;

      for (const res of results) {
          if (res.status === 'fulfilled') {
              if (res.value.index < bestIndex) {
                  bestIndex = res.value.index;
                  bestRow = res.value.row;
              }
          }
      }
      if (bestRow) return bestRow;
  } catch (e) {}

  throw new Error(
    `We couldn't find "${input}". Try the nearest larger city — for example, the closest district headquarters.`
  );
}

export async function bestMatchAny(input: string): Promise<NominatimRow> {
    const variants = queryVariants(input);
    const promises = variants.map(async q => {
        const rows = await nominatimQuery(q, 3);
        if (rows.length > 0) return rows[0];
        throw new Error("No results");
    });
    try {
        return await Promise.any(promises);
    } catch (e) {
        throw new Error(
            `We couldn't find "${input}". Try the nearest larger city — for example, the closest district headquarters.`
        );
    }
}

async function run() {
    const start = Date.now();
    try {
        const res = await bestMatchParallel("Village, Mandal, District, State");
        console.log(res);
    } catch (e) {
        console.log("Error", e);
    }
    console.log("Parallel took", Date.now() - start);

    const start2 = Date.now();
    try {
        const res = await bestMatchAny("Village, Mandal, District, State");
        console.log(res);
    } catch (e) {
        console.log("Error", e);
    }
    console.log("Any took", Date.now() - start2);
}
run();
