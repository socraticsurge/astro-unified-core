import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [ai_insights, chat, draft, today_reading] = await Promise.all([
    db.settings.getAiInsightsLlm(),
    db.settings.getChatLlm(),
    db.settings.getDraftLlm(),
    db.settings.getTodayReadingLlm(),
  ]);

  return NextResponse.json({ ai_insights, chat, draft, today_reading });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { type, config } = body as { type?: string; config?: Record<string, unknown> };

  if (!type || !config) {
    return NextResponse.json({ error: "type and config required" }, { status: 400 });
  }

  if (type === "ai_insights") {
    const saved = await db.settings.setAiInsightsLlm(config as never);
    return NextResponse.json({ ai_insights: saved });
  }

  if (type === "chat") {
    const saved = await db.settings.setChatLlm(config as never);
    return NextResponse.json({ chat: saved });
  }

  if (type === "draft") {
    const saved = await db.settings.setDraftLlm(config as never);
    return NextResponse.json({ draft: saved });
  }

  if (type === "today_reading") {
    const saved = await db.settings.setTodayReadingLlm(config as never);
    return NextResponse.json({ today_reading: saved });
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
}
