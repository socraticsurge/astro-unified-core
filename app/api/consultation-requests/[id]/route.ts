import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { rating, note } = body;

  if (rating !== "helpful" && rating !== "not_helpful") {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  await db.consultationRequests.submitFeedback(id, userId, rating, note ?? undefined);
  return NextResponse.json({ success: true });
}
