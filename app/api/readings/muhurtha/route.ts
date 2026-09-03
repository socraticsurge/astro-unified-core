import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { credentialedDashaflowSidecarConfig } from "@/lib/engines/dashaflow-config";
import { fetchWithRetry } from "@/lib/engines/fetch-with-retry";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };
const MUHURTHA_UNAVAILABLE =
  "Muhurtha calculation is temporarily unavailable. Please try again.";
// The legacy sidecar schema still types event location as BirthData even
// though the engine reads only coordinates/timezone. Use non-personal
// placeholders until that field is narrowed in a versioned sidecar contract.
const LOCATION_DATE_PLACEHOLDER = "2000-01-01";
const LOCATION_TIME_PLACEHOLDER = "00:00";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = getUserId(session);

    const body = await req.json();
    const { profile_id, event_type, start_date, end_date } = body ?? {};

    if (!profile_id) return NextResponse.json({ error: "Profile ID required" }, { status: 400 });

    if (!rateLimit(`muhurtha_${userId}`, RATE_LIMIT_DEFAULT_COUNT, RATE_LIMIT_WINDOW_MS).success) {
      return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
    }

    const VALID_EVENT_TYPES = ["marriage", "house_entry", "business", "travel", "education", "medical"] as const;
    if (event_type && !VALID_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }

    const p = await db.profiles.get(profile_id, userId);
    if (!p) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    if (!p.current_location || !p.current_latitude || !p.current_longitude) {
      return NextResponse.json({ error: "Current location required for Muhurtha" }, { status: 400 });
    }

    const config = credentialedDashaflowSidecarConfig("/muhurtha");
    if (!config) {
      return NextResponse.json(
        { error: MUHURTHA_UNAVAILABLE },
        { status: 503, headers: PRIVATE_NO_STORE },
      );
    }

    // The sidecar's Muhurtha operation depends only on event location and the
    // requested date window. Natal birth data is deliberately not transmitted.
    let res: Response;
    try {
      res = await fetchWithRetry(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_location_data: {
            date_of_birth: LOCATION_DATE_PLACEHOLDER,
            time_of_birth: LOCATION_TIME_PLACEHOLDER,
            latitude: p.current_latitude,
            longitude: p.current_longitude,
            timezone: p.current_timezone || "UTC",
          },
          event_type: event_type || "marriage",
          start_date,
          end_date,
        }),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      });
    } catch {
      return NextResponse.json(
        { error: MUHURTHA_UNAVAILABLE },
        { status: 502, headers: PRIVATE_NO_STORE },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: MUHURTHA_UNAVAILABLE },
        { status: 502, headers: PRIVATE_NO_STORE },
      );
    }

    const { data } = await res.json();
    return NextResponse.json(data, { headers: PRIVATE_NO_STORE });
  } catch (e) {
    console.error("POST /api/readings/muhurtha failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
