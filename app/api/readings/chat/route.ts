import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { callAIForText } from "@/lib/engines/ai-caller";
import { resolveModel, DEFAULT_INSIGHT_MODEL, type AiModelKey } from "@/lib/engines/models";
import type { ChatMessage } from "@/lib/engines/groq";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an expert Vedic astrology assistant working with Dr. Vinay Kumar Chaganti's practice. You answer questions about a specific person's Vedic birth chart.

Guidelines:
- Be concise and practical; avoid lengthy preambles.
- Ground every statement in Vedic (Jyotish) principles — Parashari, Jaimini, or classical texts as appropriate.
- When chart data is provided below, refer to it directly and precisely (sign, house, nakshatra, dignity, etc.).
- If you are uncertain, say so rather than speculating.
- Do not discuss birth-time rectification, predict exact events, or make promises about outcomes.
- Keep responses conversational and accessible to a non-specialist user.`;

// POST /api/readings/chat
// Body: { profile_id, messages: ChatMessage[], model? }
// Returns: { response: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { profile_id, messages, model } = body as {
    profile_id?: string;
    messages?: ChatMessage[];
    model?: AiModelKey;
  };

  if (!profile_id || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "profile_id and messages required" }, { status: 400 });
  }

  const profile = await db.profiles.getAny(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const chosenModel: AiModelKey = resolveModel(model, DEFAULT_INSIGHT_MODEL);

  // Build chart context from the most recent natal insight if available.
  // This gives the AI grounded chart facts without requiring a live sidecar call.
  let chartContext = "";
  const latestInsight = await db.readings.latestByEngine(profile_id, "ai-natal");
  if (latestInsight) {
    try {
      const insight = JSON.parse(latestInsight.output_data) as {
        sections?: { title: string; interpretation: string }[];
        key_themes?: string[];
      };
      const themes = insight.key_themes?.join(", ") ?? "";
      const sections = (insight.sections ?? [])
        .map(s => `${s.title}: ${s.interpretation}`)
        .join("\n");
      chartContext = `\n\nChart context for ${profile.name}:\nKey themes: ${themes}\n${sections}`;
    } catch { /* use no context */ }
  }

  const systemPrompt = `${SYSTEM_PROMPT}\n\nProfile: ${profile.name}` +
    (profile.date_of_birth ? `, born ${profile.date_of_birth}` : "") +
    (profile.place_of_birth ? ` in ${profile.place_of_birth}` : "") +
    chartContext;

  try {
    const response = await callAIForText(chosenModel, systemPrompt, messages, {
      temperature: 0.7,
      maxTokens: 1024,
    });
    return NextResponse.json({ response }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
