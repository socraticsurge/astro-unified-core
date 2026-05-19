import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const SIDECAR_URL =
  process.env.DASHAFLOW_SIDECAR_URL ?? "https://dashaflow-sidecar.vercel.app";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const checks = await db.compatibility.list(userId);
  return NextResponse.json(checks);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;

    const { success } = rateLimit(`compat:${userId}`, 10, 60_000);
    if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await req.json();
    const { profile_id_1, profile_id_2 } = body ?? {};
    if (!profile_id_1 || !profile_id_2) {
      return NextResponse.json({ error: "Two profiles required" }, { status: 400 });
    }

    const existingChecks = await db.compatibility.list(userId);
    const duplicate = existingChecks.find(c =>
      (c.profile_id_1 === profile_id_1 && c.profile_id_2 === profile_id_2) ||
      (c.profile_id_1 === profile_id_2 && c.profile_id_2 === profile_id_1)
    );

    const [p1, p2] = await Promise.all([
      db.profiles.get(profile_id_1, userId),
      db.profiles.get(profile_id_2, userId),
    ]);

    if (!p1 || !p2) {
      return NextResponse.json({ error: "One or both profiles not found" }, { status: 404 });
    }

    if (duplicate) {
      return NextResponse.json(duplicate);
    }

    // Call Python Sidecar
    const res = await fetch(`${SIDECAR_URL}/compatibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        p1: {
          date_of_birth: p1.date_of_birth,
          time_of_birth: p1.time_of_birth,
          latitude: p1.latitude,
          longitude: p1.longitude,
          timezone: p1.timezone,
        },
        p2: {
          date_of_birth: p2.date_of_birth,
          time_of_birth: p2.time_of_birth,
          latitude: p2.latitude,
          longitude: p2.longitude,
          timezone: p2.timezone,
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: `Engine error: ${errorText}` }, { status: 500 });
    }

    const json = await res.json();
    const data = json.data;

    const check = await db.compatibility.save(userId, {
      profile_id_1,
      profile_id_2,
      score: data.total_score || 0,
      result_json: JSON.stringify(data),
    });

    return NextResponse.json(check);
  } catch (e) {
    console.error("POST /api/compatibility failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
