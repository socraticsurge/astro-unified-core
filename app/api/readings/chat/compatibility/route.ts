import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { callAIForText } from "@/lib/engines/ai-caller";
import { summarizeDashaflow } from "@/lib/chart-summary";
import {
  lookupAscendant,
  lookupNakshatra,
  lookupDashaPair,
  lookupPlanetInHouse,
} from "@/lib/content/lookup";
import { type AiModelKey, DEFAULT_CHAT_MODEL } from "@/lib/engines/models";
import type { ChatMessage } from "@/lib/engines/groq";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// POST /api/readings/chat/compatibility
// Body: { check_id, messages, model? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { check_id, messages, model } = body as {
    check_id?: string;
    messages?: ChatMessage[];
    model?: AiModelKey;
  };

  if (!check_id || !messages?.length) {
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

  let compatResult: Record<string, unknown> = {};
  try { compatResult = JSON.parse(check.result_json) as Record<string, unknown>; } catch { /* empty */ }

  const scores = compatResult?.scores as Record<string, number> | undefined;
  const totalScore = compatResult?.total_score as number ?? check.score;
  const isApproved = compatResult?.is_match_approved as boolean ?? false;

  // Build context for both profiles
  async function buildProfileContext(p: typeof profile1) {
    const reading = await db.readings.latestByEngine(p!.id, "dashaflow");
    if (!reading) return { summary: "(no chart data)", blocks: [] as { key: string; text: string }[], lagna: "", moonNak: "", maha: "", antar: "" };

    const output = JSON.parse(reading.output_data) as Record<string, unknown>;
    const summary = summarizeDashaflow(output);
    const data = output?.data as Record<string, unknown> | undefined;
    const lagnaSign = (data?.lagna as Record<string, unknown> | undefined)?.sign as string ?? "";
    const planets = data?.planets as Record<string, { sign?: string; house?: number; nakshatra?: string }> | undefined;
    const dashas = data?.dashas as Record<string, { planet?: string }> | undefined;
    const moonNak = planets?.Moon?.nakshatra ?? planets?.moon?.nakshatra ?? "";
    const maha = dashas?.maha?.planet ?? "";
    const antar = dashas?.antar?.planet ?? "";

    const blocks: { key: string; text: string }[] = [];
    if (lagnaSign) { const e = lookupAscendant(lagnaSign); if (e) blocks.push({ key: `ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(e.body) }); }
    if (moonNak) { const e = lookupNakshatra(moonNak); if (e) blocks.push({ key: `nakshatra/${moonNak.toLowerCase()}`, text: stripHtml(e.body) }); }
    if (maha && antar) { const e = lookupDashaPair(maha, antar); if (e) blocks.push({ key: `dasha/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(e.body) }); }
    if (planets) {
      for (const [name, pl] of Object.entries(planets)) {
        if (pl.house === 7 || pl.house === 1 || pl.house === 5) {
          const e = lookupPlanetInHouse(name, pl.house);
          if (e) blocks.push({ key: `planet-in-house/${name.toLowerCase()}-${pl.house}`, text: stripHtml(e.body) });
        }
      }
    }
    return { summary, blocks, lagna: lagnaSign, moonNak, maha, antar };
  }

  const [ctx1, ctx2] = await Promise.all([buildProfileContext(profile1), buildProfileContext(profile2)]);

  const contentSection = [...ctx1.blocks.map(b => `[${profile1.name}] ${b.key}\n${b.text}`), ...ctx2.blocks.map(b => `[${profile2.name}] ${b.key}\n${b.text}`)].join("\n\n---\n\n");

  const scoreSummary = scores
    ? Object.entries(scores).map(([k, v]) => `${k}: ${v}`).join(" | ")
    : "";

  const chatConfig = await db.settings.getChatLlm();
  const chosenModel: AiModelKey = model ?? DEFAULT_CHAT_MODEL;

  const systemPrompt = `You are an expert Vedic astrologer analysing the compatibility between ${profile1.name} and ${profile2.name}.

You have both their complete charts and the Ashtakoota Milan scores. Your role: give real, grounded insight — not a recitation of texts. Apply astrological reasoning to help understand this pairing as two specific people with specific placements.

HOW TO RESPOND:
- Always refer to them by name, not as "Person A/B" or generic terms.
- Weave in placements naturally: "with ${profile1.name}'s Moon in Rohini and ${profile2.name}'s Mars in the 7th..."
- Be direct and confident where the chart supports it. Don't hedge every sentence.
- Keep tone conversational, intelligent, practical.
- Short paragraphs, avoid heavy bullet lists unless genuinely listing things.

=== ${profile1.name.toUpperCase()} ===
DOB: ${profile1.date_of_birth} ${profile1.time_of_birth} (${profile1.timezone})
Lagna: ${ctx1.lagna} | Moon Nakshatra: ${ctx1.moonNak} | Dasha: ${ctx1.maha}/${ctx1.antar}

${ctx1.summary}

=== ${profile2.name.toUpperCase()} ===
DOB: ${profile2.date_of_birth} ${profile2.time_of_birth} (${profile2.timezone})
Lagna: ${ctx2.lagna} | Moon Nakshatra: ${ctx2.moonNak} | Dasha: ${ctx2.maha}/${ctx2.antar}

${ctx2.summary}

=== ASHTAKOOTA SCORES ===
Total: ${totalScore}/36 — ${isApproved ? "Match Approved" : "Match Not Approved"}
${scoreSummary}

=== INTERPRETATION TEXTS ===
${contentSection}${chatConfig.custom_instructions ? `\n\n=== ADDITIONAL INSTRUCTIONS ===\n${chatConfig.custom_instructions}` : ""}`;

  try {
    const response = await callAIForText(chosenModel, systemPrompt, messages, {
      temperature: chatConfig.temperature,
      maxTokens: chatConfig.max_tokens,
      topP: chatConfig.top_p,
    });
    return NextResponse.json({ response }, { headers: { "Cache-Control": "private, max-age=0" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
