import "server-only";

export type RedisRestConfig = {
  url: string;
  token: string;
};

export type RedisRestCommandResult =
  | { ok: true; configured: true; result: unknown }
  | { ok: false; configured: boolean };

type RedisRestCommandOptions = {
  env?: Record<string, string | undefined>;
  config?: RedisRestConfig;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1_024;

function credentialPair(
  rawUrl: string | undefined,
  token: string | undefined,
): RedisRestConfig | null {
  if (!rawUrl || !token || token !== token.trim()) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { url: url.toString().replace(/\/+$/, ""), token };
  } catch {
    return null;
  }
}

/** Resolve exactly one complete credential pair without cross-pair fallback. */
export function redisRestConfig(
  env: Record<string, string | undefined> = process.env,
): RedisRestConfig | null {
  return credentialPair(
    env.UPSTASH_REDIS_REST_URL,
    env.UPSTASH_REDIS_REST_TOKEN,
  ) ?? credentialPair(env.KV_REST_API_URL, env.KV_REST_API_TOKEN);
}

async function readBoundedText(
  response: Response,
  maxBytes: number,
): Promise<string | null> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength?.match(/^\d+$/)) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length > maxBytes) return null;
  }

  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength <= maxBytes ? text : null;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

/** Execute one bounded Upstash-compatible REST command without surfacing diagnostics. */
export async function redisRestCommand(
  command: readonly string[],
  options: RedisRestCommandOptions = {},
): Promise<RedisRestCommandResult> {
  const config = options.config ?? redisRestConfig(options.env);
  if (!config) return { ok: false, configured: false };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 1_500,
  );
  try {
    const response = await (options.fetcher ?? fetch)(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    const text = await readBoundedText(
      response,
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
    );
    if (!response.ok || text === null) return { ok: false, configured: true };

    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      return { ok: false, configured: true };
    }
    if (
      !payload
      || typeof payload !== "object"
      || Array.isArray(payload)
      || !Object.prototype.hasOwnProperty.call(payload, "result")
    ) {
      return { ok: false, configured: true };
    }
    return {
      ok: true,
      configured: true,
      result: (payload as { result: unknown }).result,
    };
  } catch {
    return { ok: false, configured: true };
  } finally {
    clearTimeout(timeout);
  }
}
