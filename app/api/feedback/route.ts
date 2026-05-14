import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const ip = request.headers.get("x-forwarded-for") ?? "anon";
  const { success } = rateLimit(`feedback:${ip}`, 5, 60_000);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await request.json();
  const { rating, message, page_url } = body;

  if (!rating) {
    return NextResponse.json({ error: "Rating is required" }, { status: 400 });
  }

  await db.feedback.save({
    user_email: session?.user?.email ?? null,
    rating,
    message: message || null,
    page_url: page_url || null,
  });

  return NextResponse.json({ success: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.feedback.list();
  return NextResponse.json(rows);
}
