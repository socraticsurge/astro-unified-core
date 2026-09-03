import { z } from "zod";
import { searchPlaces } from "@/lib/geocode";
import { guestGeocoderPublicMetadata } from "@/lib/geocoder-config";
import { guestBirthProfileEnabled } from "@/lib/guest-calculation-gates";
import {
  guestClientIp,
  guestJson,
  guestOptions,
  readLimitedJson,
  rejectDisallowedGuestOrigin,
} from "@/lib/guest-api";
import { enforceGuestRateLimit } from "@/lib/guest-rate-limit";

const SearchBodySchema = z.object({
  query: z.string()
    .trim()
    .min(2)
    .max(120)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
}).strict();

export function OPTIONS(request: Request): Response {
  return guestOptions(request);
}

export async function POST(request: Request): Promise<Response> {
  const originError = rejectDisallowedGuestOrigin(request);
  if (originError) return originError;

  const geocoderMetadata = guestBirthProfileEnabled()
    ? guestGeocoderPublicMetadata()
    : null;
  if (!geocoderMetadata) {
    return guestJson(
      request,
      { error: "This calculation is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Retry-After": "300" } },
    );
  }

  const ip = guestClientIp(request);
  const limit = await enforceGuestRateLimit("places", ip);
  if (limit.unavailable) {
    return guestJson(
      request,
      { error: "Place search is temporarily unavailable. Please try again." },
      {
        status: 503,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }
  if (!limit.success) {
    return guestJson(
      request,
      { error: "Too many place searches. Please wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const body = await readLimitedJson(request);
  if (!body.ok) {
    return guestJson(request, { error: body.error }, { status: body.status });
  }

  const parsed = SearchBodySchema.safeParse(body.value);
  if (!parsed.success) {
    return guestJson(
      request,
      { error: "query must be between 2 and 120 characters" },
      { status: 400 },
    );
  }

  try {
    const results = await searchPlaces(parsed.data.query, request.signal);
    return guestJson(request, {
      data: {
        results,
        attribution: geocoderMetadata.attribution,
        attributions: geocoderMetadata.attributions,
      },
    });
  } catch {
    return guestJson(
      request,
      { error: "Place search is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Retry-After": "10" } },
    );
  }
}
