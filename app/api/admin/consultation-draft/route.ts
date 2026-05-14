import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { callAIForText } from "@/lib/engines/ai-caller";
import { summarizeDashaflow } from "@/lib/chart-summary";
import { assembleStatement } from "@/lib/consultation";
import {
  lookupAscendant,
  lookupNakshatra,
  lookupDashaPair,
  lookupPlanetInHouse,
} from "@/lib/content/lookup";
import { type AiModelKey, DEFAULT_DRAFT_MODEL } from "@/lib/engines/models";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function buildChartContext(profileId: string) {
  const profile = await db.profiles.getAny(profileId);
  if (!profile) return null;

  const reading = await db.readings.latestByEngine(profile.id, "dashaflow");
  if (!reading) return { profile, summary: "(no chart data)", blocks: [] as { key: string; text: string }[], lagna: "", moonNak: "", maha: "", antar: "" };

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
      const lifeLord = pl.house === 1 || pl.house === 5 || pl.house === 7 || pl.house === 9 || pl.house === 10;
      if (lifeLord) {
        const e = lookupPlanetInHouse(name, pl.house!);
        if (e) blocks.push({ key: `planet-in-house/${name.toLowerCase()}-${pl.house}`, text: stripHtml(e.body) });
      }
    }
  }
  return { profile, summary, blocks, lagna: lagnaSign, moonNak, maha, antar };
}

// POST /api/admin/consultation-draft
// Body: { request_id, model? }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { request_id, model } = body as { request_id?: string; model?: AiModelKey };

  if (!request_id) return NextResponse.json({ error: "request_id required" }, { status: 400 });

  const request = await db.consultationRequests.getById(request_id);
  if (!request) return NextResponse.json({ error: "Consultation request not found" }, { status: 404 });

  const profileIds: string[] = JSON.parse(request.profile_ids);
  const chartContexts = await Promise.all(profileIds.map(buildChartContext));
  const validContexts = chartContexts.filter(Boolean);

  const question = assembleStatement(request.observation, request.constraint_text, request.objective, request.options);

  const draftConfig = await db.settings.getDraftLlm();
  const chosenModel: AiModelKey = model ?? DEFAULT_DRAFT_MODEL;

  const chartSection = validContexts.map(ctx => {
    if (!ctx) return "";
    const { profile, summary, blocks, lagna, moonNak, maha, antar } = ctx;
    const contentText = blocks.map(b => `${b.key}\n${b.text}`).join("\n\n---\n\n");
    return `=== ${profile.name.toUpperCase()} ===
DOB: ${profile.date_of_birth} ${profile.time_of_birth} (${profile.timezone})
Lagna: ${lagna} | Moon Nakshatra: ${moonNak} | Dasha: ${maha}/${antar}

${summary}

${contentText}`;
  }).join("\n\n");

  const systemPrompt = `You are an expert Vedic astrologer drafting a written consultation response.

Your task: write a thorough, grounded answer to the client's specific question. This is a draft for the astrologer to review, refine, and send — so write as if you are the astrologer speaking directly to the client.

HOW TO WRITE:
- Address the question specifically, not generically. Don't just describe their chart — answer what they asked.
- Reference specific placements, dashas, and timing that are relevant to the question.
- Be direct and confident where the chart supports it. Acknowledge complexity where it exists.
- Tone: warm, professional, practical. Avoid mystical vagueness.
- Length: comprehensive but focused — typically 200–400 words. No fluff.
- Format: flowing prose paragraphs. Avoid bullet lists unless genuinely listing timing periods or remedies.
- End with a brief note on current dasha period relevance if applicable.

LIFE AREA: ${request.life_area}

${chartSection}${draftConfig.custom_instructions ? `\n\n=== ADDITIONAL INSTRUCTIONS ===\n${draftConfig.custom_instructions}` : ""}`;

  try {
    const draft = await callAIForText(chosenModel, systemPrompt, [{ role: "user", content: question }], {
      temperature: draftConfig.temperature,
      maxTokens: draftConfig.max_tokens,
    });
    return NextResponse.json({ draft }, { headers: { "Cache-Control": "private, max-age=0" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate draft";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
