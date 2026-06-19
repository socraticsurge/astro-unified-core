import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/chat/feedback
// Body: { message_id, rating: 1 | -1 | null }
// Saves thumbs-up/down on an assistant chat message. Ownership enforced via user_id.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { message_id, rating } = body as { message_id?: string; rating?: unknown };

  if (!message_id) {
    return NextResponse.json({ error: "message_id required" }, { status: 400 });
  }
  if (rating !== 1 && rating !== -1 && rating !== null) {
    return NextResponse.json({ error: "rating must be 1, -1, or null" }, { status: 400 });
  }

  await db.chatMessages.rate(message_id, userId, rating as 1 | -1 | null);
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, max-age=0" } });
}
