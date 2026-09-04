import { z } from "zod";
import { searchPlaces } from "@/lib/geocode";
import { isGeocoderCapacityError } from "@/lib/geocoder-capacity-error";
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
      {
        error: limit.scope === "capacity"
          ? "Shared place-search capacity is temporarily full. Please try again later."
          : "Too many place searches. Please wait and try again.",
      },
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
    const results = await searchPlaces(parsed.data.query, request.signal, ip);
    return guestJson(request, {
      data: {
        results,
        attribution: geocoderMetadata.attribution,
        attributions: geocoderMetadata.attributions,
      },
    });
  } catch (error) {
    if (isGeocoderCapacityError(error)) {
      return guestJson(
        request,
        {
          error: error.code === "rate-limited"
            ? "Place search is busy. Please wait and try again."
            : "Place search is temporarily unavailable. Please try again.",
        },
        {
          status: error.code === "rate-limited" ? 429 : 503,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    return guestJson(
      request,
      { error: "Place search is temporarily unavailable. Please try again." },
      { status: 503, headers: { "Retry-After": "10" } },
    );
  }
}
