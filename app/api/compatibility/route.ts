import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { credentialedDashaflowSidecarConfig } from "@/lib/engines/dashaflow-config";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };
const COMPATIBILITY_UNAVAILABLE =
  "Compatibility calculation is temporarily unavailable. Please try again.";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = getUserId(session);

  const checks = await db.compatibility.list(userId);
  return NextResponse.json(checks, { headers: PRIVATE_NO_STORE });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = getUserId(session);

    const { success } = rateLimit(`compat:${userId}`, 10, 60_000);
    if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const admin = isAdmin(session);

    const body = await req.json();
    const { profile_id_1, profile_id_2 } = body ?? {};
    if (!profile_id_1 || !profile_id_2) {
      return NextResponse.json({ error: "Two profiles required" }, { status: 400 });
    }

    // Admins bypass the duplicate check and 6-check cap — they run checks on
    // behalf of users and results are stored under their own userId, not the
    // profile owner's, so the limits don't apply.
    let duplicate;
    if (!admin) {
      // Targeted SQL — avoids loading every check into JS just to scan for a
      // duplicate or count. Also fixes a TOCTOU race in the 6-check cap.
      duplicate = await db.compatibility.findDuplicate(userId, profile_id_1, profile_id_2);
      if (!duplicate) {
        const count = await db.compatibility.countByUser(userId);
        if (count >= 6) {
          return NextResponse.json({ error: "You have reached the maximum limit of 6 compatibility checks. Please delete some checks or contact support to run more." }, { status: 403 });
        }
      }
    }

    // Admins use getAny() to bypass ownership scoping so they can compare any
    // two profiles across the system. Regular users use get() which enforces
    // that both profiles belong to them.
    const [p1, p2] = await Promise.all([
      admin ? db.profiles.getAny(profile_id_1) : db.profiles.get(profile_id_1, userId),
      admin ? db.profiles.getAny(profile_id_2) : db.profiles.get(profile_id_2, userId),
    ]);

    if (!p1 || !p2) {
      return NextResponse.json({ error: "One or both profiles not found" }, { status: 404 });
    }

    if (duplicate) {
      return NextResponse.json(duplicate, { headers: PRIVATE_NO_STORE });
    }

    const config = credentialedDashaflowSidecarConfig("/compatibility");
    if (!config) {
      return NextResponse.json(
        { error: COMPATIBILITY_UNAVAILABLE },
        { status: 503, headers: PRIVATE_NO_STORE },
      );
    }

    // Call the authenticated Python sidecar only after validating its URL.
    let res: Response;
    try {
      res = await fetch(config.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
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
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      });
    } catch {
      return NextResponse.json(
        { error: COMPATIBILITY_UNAVAILABLE },
        { status: 502, headers: PRIVATE_NO_STORE },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: COMPATIBILITY_UNAVAILABLE },
        { status: 502, headers: PRIVATE_NO_STORE },
      );
    }

    const json = await res.json();
    const data = json.data;

    const check = await db.compatibility.save(userId, {
      profile_id_1,
      profile_id_2,
      score: data.total_score || 0,
      result_json: JSON.stringify(data),
    });

    return NextResponse.json(check, { headers: PRIVATE_NO_STORE });
  } catch (e) {
    console.error("POST /api/compatibility failed:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
