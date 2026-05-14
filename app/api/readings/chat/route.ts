import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { callGroq } from "@/lib/engines/groq";
import { summarizeDashaflow } from "@/lib/chart-summary";
import {
  lookupAscendant,
  lookupNakshatra,
  lookupDashaPair,
  lookupPlanetInHouse,
} from "@/lib/content/lookup";
import type { ChatMessage, GroqModelKey } from "@/lib/engines/groq";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// POST /api/readings/chat
// Body: { profile_id, messages: [{role, content}] }
// Stateless — caller owns conversation history; we only build the system prompt server-side.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { profile_id, messages, model } = body as { profile_id?: string; messages?: ChatMessage[]; model?: GroqModelKey };

  if (!profile_id || !messages?.length) {
    return NextResponse.json({ error: "profile_id and messages required" }, { status: 400 });
  }

  const profile = await db.profiles.getAny(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const chartReading = await db.readings.latestByEngine(profile_id, "dashaflow");
  if (!chartReading) return NextResponse.json({ error: "No chart data found. Generate the chart first." }, { status: 400 });

  const chartOutput = JSON.parse(chartReading.output_data) as Record<string, unknown>;
  const chartSummary = summarizeDashaflow(chartOutput);

  // Build the full content library for this profile — all planets, ascendant, nakshatra, dasha pair
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const lagnaSign = (data?.lagna as Record<string, unknown> | undefined)?.sign as string | undefined ?? "";
  const planets = data?.planets as Record<string, { sign?: string; house?: number; nakshatra?: string }> | undefined;
  const dashas = data?.dashas as Record<string, { planet?: string }> | undefined;
  const moonNak = planets?.Moon?.nakshatra ?? planets?.moon?.nakshatra ?? "";
  const maha = dashas?.maha?.planet;
  const antar = dashas?.antar?.planet;

  const contentBlocks: { key: string; text: string }[] = [];

  if (lagnaSign) {
    const entry = lookupAscendant(lagnaSign);
    if (entry) contentBlocks.push({ key: `ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
  }
  if (moonNak) {
    const entry = lookupNakshatra(moonNak);
    if (entry) contentBlocks.push({ key: `nakshatra/${moonNak.toLowerCase()}`, text: stripHtml(entry.body) });
  }
  if (maha && antar) {
    const entry = lookupDashaPair(maha, antar);
    if (entry) contentBlocks.push({ key: `dasha-pair/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(entry.body) });
  }
  if (planets) {
    // Prioritise kendra/trikona houses (1,4,5,7,9,10) then remaining
    const HOUSE_PRIORITY = [1, 10, 5, 9, 4, 7, 2, 3, 6, 8, 11, 12];
    const sorted = Object.entries(planets).sort(([, a], [, b]) => {
      const ai = HOUSE_PRIORITY.indexOf(a.house ?? 0);
      const bi = HOUSE_PRIORITY.indexOf(b.house ?? 0);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    for (const [planet, p] of sorted) {
      if (p.house && p.house > 0) {
        const entry = lookupPlanetInHouse(planet, p.house);
        if (entry) contentBlocks.push({ key: `planet-in-house/${planet.toLowerCase()}-${p.house}`, text: stripHtml(entry.body) });
      }
    }
  }

  // Content files are small (~700–2900 chars each, ~3K tokens total for all 12 blocks).
  // 131K token context window means we send everything at full length.
  const contentSection = contentBlocks
    .map((b) => `--- ${b.key} ---\n${b.text}`)
    .join("\n\n");

  const systemPrompt = `You are an expert Vedic astrologer with deep knowledge of Jyotisha. You know ${profile.name}'s chart intimately and are having a direct, intelligent conversation about it.

Your job is to interpret, reason, and give real insight — not to summarise what texts say. Think like an experienced practitioner: take the chart data and the interpretation texts as your foundation, then apply your own astrological reasoning to answer the question practically and situationally.

HOW TO RESPOND:
- Write the way a knowledgeable astrologer talks to a colleague — direct, thoughtful, conversational. Not a report, not a list of citations.
- When you refer to a placement, weave it in naturally: "with Saturn in the 7th..." or "the Moon in Rohini suggests..." — don't use formal citation syntax.
- You are free to reason beyond what the texts say. If someone asks how a placement manifests for a software engineer in their 30s, reason about it. That is exactly the kind of synthesis that makes this useful.
- Use the interpretation texts as grounding — they tell you the classical meaning of each placement. Build on them; don't just repeat them.
- Do not invent placements or facts that are not in the chart data. If a question asks about something genuinely absent from the chart, say so briefly and move on to what you can say.
- Keep the tone warm and direct. Avoid hedging every sentence. If the chart supports an interpretation, state it confidently.
- Use short paragraphs. Avoid heavy bullet lists unless you're genuinely enumerating things. Don't use headers for short answers.

=== PROFILE ===
Name: ${profile.name}
Date of birth: ${profile.date_of_birth}
Time of birth: ${profile.time_of_birth} (${profile.timezone})
Place of birth: ${profile.place_of_birth}

=== CHART DATA ===
${chartSummary}

=== INTERPRETATION TEXTS (${contentBlocks.length} sources) ===
${contentSection}`;

  try {
    const response = await callGroq(systemPrompt, messages, model);
    return NextResponse.json({ response }, {
      headers: { "Cache-Control": "private, max-age=0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
