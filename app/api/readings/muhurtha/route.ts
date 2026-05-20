import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const SIDECAR_URL =
  process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;

    const body = await req.json();
    const { profile_id, event_type, start_date, end_date } = body ?? {};

    if (!profile_id) return NextResponse.json({ error: "Profile ID required" }, { status: 400 });

    const VALID_EVENT_TYPES = ["marriage", "house_entry", "business", "travel", "education", "medical"] as const;
    if (event_type && !VALID_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
    }

    const p = await db.profiles.get(profile_id, userId);
    if (!p) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    if (!p.current_location || !p.current_latitude || !p.current_longitude) {
      return NextResponse.json({ error: "Current location required for Muhurtha" }, { status: 400 });
    }

    // Call Python Sidecar
    const res = await fetch(`${SIDECAR_URL}/muhurtha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        birth_data: {
          date_of_birth: p.date_of_birth,
          time_of_birth: p.time_of_birth,
          latitude: p.latitude,
          longitude: p.longitude,
          timezone: p.timezone,
        },
        current_location_data: {
          date_of_birth: p.date_of_birth, // dummy, engine only needs coordinates/tz
          time_of_birth: p.time_of_birth, // dummy
          latitude: p.current_latitude,
          longitude: p.current_longitude,
          timezone: p.current_timezone || "UTC",
        },
        event_type: event_type || "marriage",
        start_date,
        end_date,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Engine error: ${errorText}` }, { status: 500 });
    }

    const { data } = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST /api/readings/muhurtha failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

