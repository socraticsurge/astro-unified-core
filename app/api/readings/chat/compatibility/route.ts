import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { callAIForText } from "@/lib/engines/ai-caller";
import { resolveModel, DEFAULT_INSIGHT_MODEL, type AiModelKey } from "@/lib/engines/models";
import { COMPAT_ENGINE } from "@/lib/ai-insight-compat";
import type { ChatMessage } from "@/lib/engines/groq";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are an expert Vedic astrology assistant working with Dr. Vinay Kumar Chaganti's practice. You answer questions about marriage compatibility (Kundali Milan) between two people.

Guidelines:
- Be concise and practical; avoid lengthy preambles.
- Ground every statement in Vedic (Jyotish) principles — Ashtakoot Milan, Nadi dosha, Mangal dosha, and synastry as appropriate.
- When compatibility data is provided below, refer to it directly and precisely.
- If you are uncertain, say so rather than speculating.
- Do not make absolute predictions or guarantees about marriage outcomes.
- Keep responses conversational and accessible to a non-specialist user.`;

// POST /api/readings/chat/compatibility
// Body: { check_id, messages: ChatMessage[], model? }
// Returns: { response: string }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { check_id, messages, model } = body as {
    check_id?: string;
    messages?: ChatMessage[];
    model?: AiModelKey;
  };

  if (!check_id || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "check_id and messages required" }, { status: 400 });
  }

  const check = await db.compatibility.getAny(check_id);
  if (!check) return NextResponse.json({ error: "Compatibility check not found" }, { status: 404 });

  const [profile1, profile2] = await Promise.all([
    db.profiles.getAny(check.profile_id_1),
    db.profiles.getAny(check.profile_id_2),
  ]);
  if (!profile1 || !profile2) {
    return NextResponse.json({ error: "One or both profiles not found" }, { status: 404 });
  }

  const chosenModel: AiModelKey = resolveModel(model, DEFAULT_INSIGHT_MODEL);

  // Build compatibility context from the most recent compat insight if available.
  let compatContext = "";
  const latestInsight = await db.readings.latestByEngine(check_id, COMPAT_ENGINE);
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
      compatContext = `\n\nCompatibility context:\nKey themes: ${themes}\n${sections}`;
    } catch { /* use no context */ }
  }

  const systemPrompt = `${SYSTEM_PROMPT}\n\nProfiles: ${profile1.name}` +
    (profile1.date_of_birth ? ` (born ${profile1.date_of_birth})` : "") +
    ` and ${profile2.name}` +
    (profile2.date_of_birth ? ` (born ${profile2.date_of_birth})` : "") +
    compatContext;

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
