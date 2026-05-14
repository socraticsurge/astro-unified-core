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
import type { ChatMessage } from "@/lib/engines/groq";

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
  const { profile_id, messages } = body as { profile_id?: string; messages?: ChatMessage[] };

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
    for (const [planet, p] of Object.entries(planets)) {
      if (p.house && p.house > 0) {
        const entry = lookupPlanetInHouse(planet, p.house);
        if (entry) contentBlocks.push({ key: `planet-in-house/${planet.toLowerCase()}-${p.house}`, text: stripHtml(entry.body) });
      }
    }
  }

  const contentSection = contentBlocks
    .map((b) => `--- ${b.key} ---\n${b.text}`)
    .join("\n\n");

  const systemPrompt = `You are a Vedic astrology interpreter for Dr. Vinay Kumar Chaganti's practice.

You have the complete natal chart data and authoritative interpretation texts for ${profile.name}. Your role is to answer questions about this chart in a practical, situational way.

CREDIBILITY RULES — follow without exception:
1. CITE CHART FACTORS: For every astrological claim, name the exact factor it is based on (e.g. "Sun in H8 Scorpio", "Moon in Rohini nakshatra", "Rahu mahadasha / Venus antardasha").
2. CITE CONTENT SOURCES: When your interpretation draws from the provided texts, reference the content key (e.g. "per planet-in-house/sun-8").
3. LABEL GENERAL REASONING: If you use world knowledge to make something situational (e.g. how a trait manifests for a software engineer or a 30-year-old), label it explicitly as "My reasoning:" so it is clearly separate from chart-derived claims.
4. NO INVENTION: Do not state or imply planetary positions, house placements, or chart facts that are not in the data below. If you are unsure, say so.
5. ADMIT GAPS: If the chart data does not clearly support an answer, say so rather than speculating.

Format responses with markdown. Use bullet points for factor citations. Keep answers concise.

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
    const response = await callGroq(systemPrompt, messages);
    return NextResponse.json({ response }, {
      headers: { "Cache-Control": "private, max-age=0" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
