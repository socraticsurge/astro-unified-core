import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/readings/[id]/rating
// Body: { rating: 1 | -1 | null }
//
// User-facing thumbs up / thumbs down on a reading. The session user must
// own the profile the reading was generated for. Admins can rate anything.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { rating } = body as { rating?: 1 | -1 | null };
  if (rating !== 1 && rating !== -1 && rating !== null) {
    return NextResponse.json({ error: "rating must be 1, -1, or null" }, { status: 400 });
  }

  const reading = await db.readings.getById(id);
  if (!reading) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!isAdmin(session)) {
    const profile = await db.profiles.get(reading.profile_id, userId);
    if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.readings.rate(id, rating);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
