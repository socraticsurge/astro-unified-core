// Simple in-memory rate limiter for Next.js API routes.
// Note: In serverless environments like Vercel, this state is isolated per lambda instance.
// However, it is still highly effective for stopping single-node rapid spam.

type RateLimitData = {
  count: number;
  lastReset: number;
};

const rateLimitMap = new Map<string, RateLimitData>();

// Limit: 5 requests per minute
const LIMIT = 5;
const WINDOW_MS = 60 * 1000;

export function rateLimit(identifier: string) {
  const now = Date.now();
  const windowData = rateLimitMap.get(identifier);

  if (!windowData || now - windowData.lastReset > WINDOW_MS) {
    rateLimitMap.set(identifier, { count: 1, lastReset: now });
    return { success: true, limit: LIMIT, remaining: LIMIT - 1 };
  }

  if (windowData.count >= LIMIT) {
    return { success: false, limit: LIMIT, remaining: 0 };
  }

  windowData.count++;
  rateLimitMap.set(identifier, windowData);
  return { success: true, limit: LIMIT, remaining: LIMIT - windowData.count };
}

// Optionally clean up map periodically to prevent memory leaks over long lambda lifespans
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now - val.lastReset > WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, WINDOW_MS);

// Allow the process to exit even if this interval is running
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
