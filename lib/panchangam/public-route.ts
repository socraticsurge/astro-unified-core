import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { PanchangamServiceError } from "./client";

const PUBLIC_LIMIT = 30;
const PUBLIC_WINDOW_MS = 60_000;

export const PUBLIC_DAILY_CACHE =
  "public, s-maxage=3600, stale-while-revalidate=86400";
export const PUBLIC_MUHURTAM_CACHE =
  "public, s-maxage=3600, stale-while-revalidate=86400";

export function requestId(request: NextRequest): string {
  const supplied = request.headers.get("x-request-id") ?? "";
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(supplied)
    ? supplied
    : crypto.randomUUID().replaceAll("-", "");
}
export function guardPublicRequest(request: NextRequest, operation: string): NextResponse | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const parts = forwarded?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const trustedIp = parts.at(-1) ?? "anonymous";
  const result = rateLimit(
    `public-panchangam:${operation}:${trustedIp}`,
    PUBLIC_LIMIT,
    PUBLIC_WINDOW_MS,
  );
  if (result.success) return null;
  return NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429, headers: { "Retry-After": "60", "Cache-Control": "private, no-store" } },
  );
}

export function publicSuccess<T>(
  data: T,
  cacheControl: string,
  id: string,
): NextResponse {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": cacheControl,
      "X-Request-ID": id,
    },
  });
}

export function publicFailure(error: unknown, id: string): NextResponse {
  const known = error instanceof PanchangamServiceError;
  const status = known ? error.status : 503;
  const code = known ? error.code : "upstream_unavailable";
  const message = status === 400 || status === 422
    ? "The calculation request is not supported."
    : "Today’s calculation is temporarily unavailable. Please try again.";
  return NextResponse.json(
    { error: message, code, request_id: known ? error.requestId ?? id : id },
    { status, headers: { "Cache-Control": "private, no-store", "X-Request-ID": id } },
  );
}
