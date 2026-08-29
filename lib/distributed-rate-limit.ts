import { createHmac } from "node:crypto";

export interface DistributedRateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterSeconds: number;
  configured: boolean;
  unavailable: boolean;
}

interface DistributedRateLimitOptions {
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
  runtime?: string;
  timeoutMs?: number;
}

const FIXED_WINDOW_SCRIPT = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {current, ttl}",
].join("\n");

function credentials(env: Record<string, string | undefined>) {
  const rawUrl = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!rawUrl || !token || token !== token.trim()) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { url: url.toString().replace(/\/+$/, ""), token };
  } catch {
    return null;
  }
}

function unavailable(configured: boolean): DistributedRateLimitResult {
  return {
    success: false,
    remaining: 0,
    retryAfterSeconds: 10,
    configured,
    unavailable: true,
  };
}

/**
 * Atomic fixed-window limit shared across Vercel instances.
 *
 * Production fails closed if the Marketplace Redis integration is absent or
 * unavailable. Local/test runs retain the existing process-local limiter and
 * skip this second layer. The client identifier is HMAC-pseudonymized before
 * leaving the function and expires with the short Redis window.
 */
export async function distributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: DistributedRateLimitOptions = {},
): Promise<DistributedRateLimitResult> {
  const env = options.env || process.env;
  const production = (options.runtime || process.env.NODE_ENV) === "production";
  if (!production) {
    return {
      success: true,
      remaining: limit,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    };
  }
  const config = credentials(env);
  if (!config) {
    return unavailable(false);
  }

  const digest = createHmac("sha256", config.token).update(key).digest("hex");
  const redisKey = `astrochaganti:rate-limit:${digest}`;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 1_500,
  );
  try {
    const response = await (options.fetcher || fetch)(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        "EVAL", FIXED_WINDOW_SCRIPT, "1", redisKey, String(windowMs),
      ]),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    const result = payload && typeof payload === "object" && "result" in payload
      ? (payload as { result?: unknown }).result
      : null;
    if (
      !response.ok || !Array.isArray(result) || result.length !== 2
      || !result.every(value => typeof value === "number" && Number.isFinite(value))
    ) return unavailable(true);

    const count = result[0] as number;
    const ttlMs = result[1] as number;
    if (!Number.isInteger(count) || count < 1 || ttlMs < 0) {
      return unavailable(true);
    }
    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1_000)),
      configured: true,
      unavailable: false,
    };
  } catch {
    return unavailable(true);
  } finally {
    clearTimeout(timeout);
  }
}
