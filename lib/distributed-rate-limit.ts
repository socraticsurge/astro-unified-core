import "server-only";

import { createHmac } from "node:crypto";
import { deploymentEnvironment } from "./deployment-environment";
import { redisRestCommand, redisRestConfig } from "./redis-rest";

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
  timeoutMs?: number;
}

const FIXED_WINDOW_SCRIPT = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {current, ttl}",
].join("\n");

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
 * Vercel Preview and Production fail closed if the Marketplace Redis
 * integration is absent or unavailable. Local/test runs retain the existing
 * process-local limiter and skip this second layer. The client identifier is
 * HMAC-pseudonymized before leaving the function and expires with the short
 * Redis window.
 */
export async function distributedRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  options: DistributedRateLimitOptions = {},
): Promise<DistributedRateLimitResult> {
  const env = options.env || process.env;
  const runtime = deploymentEnvironment(env);
  if (runtime === "local") {
    return {
      success: true,
      remaining: limit,
      retryAfterSeconds: 0,
      configured: false,
      unavailable: false,
    };
  }
  if (runtime === "unknown") return unavailable(false);
  const config = redisRestConfig(env);
  if (!config) {
    return unavailable(false);
  }

  const digest = createHmac("sha256", config.token).update(key).digest("hex");
  const redisKey = `astrochaganti:rate-limit:${digest}`;
  const command = await redisRestCommand(
    ["EVAL", FIXED_WINDOW_SCRIPT, "1", redisKey, String(windowMs)],
    {
      config,
      fetcher: options.fetcher,
      timeoutMs: options.timeoutMs,
    },
  );
  try {
    const result = command.ok ? command.result : null;
    if (
      !command.ok || !Array.isArray(result) || result.length !== 2
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
  }
}
