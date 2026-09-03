// In-memory rate limiter. Per-instance on serverless (not globally shared across
// Lambda invocations). Adequate for low-risk routes; use the Turso-backed
// shared cross-instance limits for protected deployed paths.

const store = new Map<string, { count: number; expires: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; limit: number; remaining: number } {
  const now = Date.now();
  const record = store.get(key);

  if (!record || now > record.expires) {
    store.set(key, { count: 1, expires: now + windowMs });
    return { success: true, limit, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0 };
  }

  record.count++;
  return { success: true, limit, remaining: limit - record.count };
}

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.expires) store.delete(key);
  }
}, 60_000);

if (cleanup.unref) cleanup.unref();
