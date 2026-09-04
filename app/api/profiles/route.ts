import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { geocodePlace } from "@/lib/geocode";
import { isGeocoderCapacityError } from "@/lib/geocoder-capacity-error";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_PROFILES, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { getPostHogClient } from "@/lib/posthog-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const userId = getUserId(session);
  const profiles = await db.profiles.list(userId);
  return NextResponse.json(profiles, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = getUserId(session);

    // Rate Limiting Check
    const rateLimitResult = rateLimit(`create_profile_${userId}`, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS);
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute before creating another profile." }, { status: 429 });
    }

    // Max Profiles Check — use COUNT() rather than loading the full list (TOCTOU + memory).
    const profileCount = await db.profiles.count(userId);
    if (profileCount >= MAX_PROFILES) {
      return NextResponse.json({ error: `You have reached the maximum limit of ${MAX_PROFILES} profiles.` }, { status: 403 });
    }

    const body = await req.json();
    const { name, date_of_birth, time_of_birth, place_of_birth, current_location, gender, relationship } = body ?? {};

    if (!name || !date_of_birth || !time_of_birth || !place_of_birth) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    // Input Length Validation
    if (name.length > 100 || place_of_birth.length > 100 || (current_location && current_location.length > 100)) {
      return NextResponse.json({ error: "Name, birth place, and current location must be under 100 characters." }, { status: 400 });
    }

    // DOB must not be in the future. The form sets `max={today}` but clients
    // can bypass — guard server-side too. Compare as ISO date strings.
    if (date_of_birth > new Date().toISOString().slice(0, 10)) {
      return NextResponse.json({ error: "Date of birth cannot be in the future." }, { status: 400 });
    }

    let geo;
    try {
      geo = await geocodePlace(place_of_birth, { authenticatedUserId: userId });
    } catch (e) {
      if (isGeocoderCapacityError(e)) {
        return NextResponse.json(
          {
            error: e.code === "rate-limited"
              ? "Location search is busy. Please wait and try again."
              : "Location search is temporarily unavailable. Please try again.",
          },
          {
            status: e.code === "rate-limited" ? 429 : 503,
            headers: { "Retry-After": String(e.retryAfterSeconds) },
          },
        );
      }
      const msg = e instanceof Error ? e.message : "Geocoding birth place failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    let currentGeo = null;
    if (current_location) {
      try {
        currentGeo = await geocodePlace(current_location, { authenticatedUserId: userId });
      } catch (e) {
        if (isGeocoderCapacityError(e)) {
          return NextResponse.json(
            {
              error: e.code === "rate-limited"
                ? "Location search is busy. Please wait and try again."
                : "Location search is temporarily unavailable. Please try again.",
            },
            {
              status: e.code === "rate-limited" ? 429 : 503,
              headers: { "Retry-After": String(e.retryAfterSeconds) },
            },
          );
        }
        // We allow creating the profile even if current location geocoding fails,
        // but we return an error to the user if they specifically tried to set it.
        const msg = e instanceof Error ? e.message : "Geocoding current location failed";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // Preserve the user's typed strings as the canonical display values for
    // `place_of_birth` and `current_location`. The geocoder's display_name is
    // discarded — we only keep its lat/lon/timezone in the dedicated columns.
    // (See "cognitive consistency" rule in observations.)
    const profile = await db.profiles.create(userId, {
      name,
      date_of_birth,
      time_of_birth,
      place_of_birth,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
      timezone_offset: geo.timezone_offset,
      current_location: current_location || null,
      current_latitude: currentGeo?.latitude || null,
      current_longitude: currentGeo?.longitude || null,
      current_timezone: currentGeo?.timezone || null,
      current_timezone_offset: currentGeo?.timezone_offset || null,
      gender,
      relationship,
    });

    getPostHogClient().capture({
      distinctId: userId,
      event: "profile_created",
      properties: {
        relationship: relationship ?? null,
        has_current_location: !!current_location,
      },
    });

    return NextResponse.json(profile, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error("POST /api/profiles failed:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
