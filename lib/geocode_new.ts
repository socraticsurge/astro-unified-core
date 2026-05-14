import { queryVariants } from "./geocode";

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

// To optimize this, the prompt mentions: "Optimizing the cascade could involve parallelizing safe queries, but requires care."
// So if we have `["Vishakhapatnam, AP", "Vishakhapatnam", "Vishakhapatnam, India", "AP"]`
// Firing them all at once might hit rate limits.
// What if we fire them with a slight delay or batch them?
// Actually, wait! The prompt says "Optimizing the cascade could involve parallelizing safe queries, but requires care."
// "While firing requests in parallel using Promise.any() or similar might be faster, it might trigger rate limits on the free Nominatim API. Optimizing the cascade could involve parallelizing safe queries, but requires care."
// Safe parallelization: we can run queries concurrently, but we still want the highest priority query result if multiple succeed. Promise.any() returns the *first* to resolve, which might be the *last* fallback (like "AP"). If "AP" resolves faster than "Vishakhapatnam, AP", Promise.any will return "AP", which is incorrect! We want the *highest priority* variant that yields a result.
// Ah! That is what it means by "requires care"! Promise.any returns the fastest, not the highest priority.
// To fix this, we can fire them all in parallel, but we must return the result from the highest priority variant that succeeds. If variant 0 succeeds, we return it. If it fails, we return variant 1, etc.
// But we also don't want to spam the API. Wait, "Optimizing the cascade could involve parallelizing safe queries, but requires care."
