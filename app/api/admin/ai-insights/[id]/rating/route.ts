import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// PATCH /api/admin/ai-insights/[id]/rating
// Body: { rating: 1 | -1 | null }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { rating } = body as { rating: 1 | -1 | null };

  if (rating !== 1 && rating !== -1 && rating !== null) {
    return NextResponse.json({ error: "rating must be 1, -1, or null" }, { status: 400 });
  }

  await db.readings.rate(id, rating);
  return NextResponse.json({ ok: true });
}
