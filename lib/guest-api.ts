import { NextResponse } from "next/server";

export const MAX_GUEST_BODY_BYTES = 4 * 1024;

const PRODUCTION_ORIGIN = "https://panchangam.astrochaganti.com";
const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type";

export function allowedGuestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === PRODUCTION_ORIGIN) return origin;

  try {
    const url = new URL(origin);
    const localHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol === "http:" && localHost && url.origin === origin) return origin;
  } catch {
    // Invalid Origin header.
  }
  return null;
}

function responseHeaders(request: Request, init?: HeadersInit): Headers {
  const headers = new Headers(init);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Origin");

  const origin = allowedGuestOrigin(request);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  }
  return headers;
}

export function guestJson(
  request: Request,
  body: unknown,
  init: ResponseInit = {},
): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: responseHeaders(request, init.headers),
  });
}

export function rejectDisallowedGuestOrigin(request: Request): NextResponse | null {
  if (allowedGuestOrigin(request)) return null;
  return guestJson(request, { error: "Origin not allowed" }, { status: 403 });
}

export function guestOptions(request: Request): Response {
  const allowed = allowedGuestOrigin(request) !== null;
  return new Response(null, {
    status: allowed ? 204 : 403,
    headers: responseHeaders(request, { Allow: ALLOWED_METHODS }),
  });
}

export type LimitedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; status: 400 | 413 | 415; error: string };

export async function readLimitedJson(
  request: Request,
  maxBytes = MAX_GUEST_BODY_BYTES,
): Promise<LimitedJsonResult> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, status: 415, error: "Content-Type must be application/json" };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBytes) {
    return { ok: false, status: 413, error: "Request body is too large" };
  }
  if (!request.body) return { ok: false, status: 400, error: "Invalid request body" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "Request body is too large" };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, status: 400, error: "Invalid request body" };
  }
}

// Vercel appends the observed client IP to X-Forwarded-For. Values to its
// left may be client supplied, so use the rightmost bounded value.
export function guestClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return "anon";
  const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
  const value = parts[parts.length - 1];
  return value && value.length <= 128 ? value : "anon";
}
