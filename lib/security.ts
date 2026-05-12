/**
 * Simple in-memory rate limiter for serverless functions.
 * Note: This is per-instance. For global limits, use Redis (Upstash).
 */
const cache = new Map<string, { count: number; expires: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = cache.get(key);

  if (!record || now > record.expires) {
    cache.set(key, { count: 1, expires: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clean up expired records occasionally
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of cache.entries()) {
      if (now > record.expires) {
        cache.delete(key);
      }
    }
  }, 60000); // every minute
}
