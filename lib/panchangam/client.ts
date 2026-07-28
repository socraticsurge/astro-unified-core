import "server-only";

import { serviceEnvelopeSchema, type ServiceEnvelope } from "./contracts";

const DEFAULT_TIMEOUT_MS = 5_000;

export class PanchangamServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(code);
    this.name = "PanchangamServiceError";
  }
}
function serviceConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env.PANCHANGAM_API_URL?.replace(/\/$/, "");
  const token = process.env.PANCHANGAM_API_TOKEN;
  if (!baseUrl || !URL.canParse(baseUrl) || !token || token.length < 32) {
    throw new PanchangamServiceError(503, "service_not_configured");
  }
  return { baseUrl, token };
}

export async function callPanchangamService<T>(
  path: string,
  body: Record<string, unknown>,
  requestId: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ServiceEnvelope<T>> {
  const { baseUrl, token } = serviceConfig();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-ID": requestId,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const code = error instanceof Error && error.name === "TimeoutError"
      ? "upstream_timeout"
      : "upstream_unavailable";
    throw new PanchangamServiceError(503, code, requestId);
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const safeError = zodSafeServiceError(payload);
    throw new PanchangamServiceError(
      response.status >= 500 ? 503 : response.status,
      safeError.code,
      safeError.requestId ?? requestId,
    );
  }

  const parsed = serviceEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PanchangamServiceError(502, "invalid_upstream_response", requestId);
  }
  return parsed.data as ServiceEnvelope<T>;
}

function zodSafeServiceError(payload: unknown): { code: string; requestId?: string } {
  if (!payload || typeof payload !== "object") return { code: "upstream_failed" };
  const record = payload as Record<string, unknown>;
  const error = record.error;
  const code = error && typeof error === "object"
    ? (error as Record<string, unknown>).code
    : undefined;
  return {
    code: typeof code === "string" ? code : "upstream_failed",
    requestId: typeof record.request_id === "string" ? record.request_id : undefined,
  };
}
