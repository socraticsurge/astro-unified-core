// Nominatim requires 1 request per second.
// However, the issue explicitly says: "While firing requests in parallel using Promise.any() or similar might be faster, it might trigger rate limits on the free Nominatim API. Optimizing the cascade could involve parallelizing safe queries, but requires care."
// Wait, actually `nominatimQuery` uses `Promise.any` or maybe batching?
// What if we fire the first 2 queries in parallel, then the next 2?
// Or maybe we first try the exact match, and if it fails, then we try the others?
// But wait, what if we use Promise.any but wrap it so we only start the next one after a delay?
