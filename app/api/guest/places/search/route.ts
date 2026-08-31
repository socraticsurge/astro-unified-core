import { z } from "zod";
import { GEOCODER_ATTRIBUTION, searchPlaces } from "@/lib/geocode";
import { guestGeocoderConfigured } from "@/lib/geocoder-config";
import { guestBirthProfileEnabled } from "@/lib/guest-calculation-gates";
import {
  guestClientIp,
  guestJson,
  guestOptions,
  readLimitedJson,
  rejectDisallowedGuestOrigin,
} from "@/lib/guest-api";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

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

  if (!guestBirthProfileEnabled() || !guestGeocoderConfigured()) {
    return guestJson(
      request,
      { error: "This calculation is temporarily unavailable. Please try again later." },
      { status: 503, headers: { "Retry-After": "300" } },
    );
  }

  const ip = guestClientIp(request);
  const limit = rateLimit(
    `guest:places:${ip}`,
    RATE_LIMIT_DEFAULT_COUNT,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!limit.success) {
    return guestJson(
      request,
      { error: "Too many place searches. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } },
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
    const results = await searchPlaces(parsed.data.query);
    return guestJson(request, {
      data: {
        results,
        attribution: GEOCODER_ATTRIBUTION,
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
