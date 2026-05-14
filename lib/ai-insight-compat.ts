import "server-only";
import { callAIForJson } from "./engines/ai-caller";
import { GEMINI_MODEL } from "./engines/gemini";
import { summarizeDashaflow } from "./chart-summary";
import {
  lookupAscendant,
  lookupNakshatra,
  lookupDashaPair,
  lookupPlanetInHouse,
} from "./content/lookup";
import { db } from "./db";
import type { Profile } from "./db";
import { type AiModelKey, DEFAULT_INSIGHT_MODEL } from "./engines/models";

export const COMPAT_ENGINE = "ai-compat";
const PROMPT_VERSION = "1.0";

export type CompatInsight = {
  model: string;
  prompt_version: string;
  generated_at: string;
  profiles: { name1: string; name2: string };
  chart_verification: Record<string, string>;
  sections: { id: string; title: string; interpretation: string }[];
  key_themes: string[];
};

const COMPAT_SECTIONS = [
  { id: "overall", title: "Overall Compatibility Assessment" },
  { id: "dynamics", title: "Relationship Dynamics" },
  { id: "strengths-tensions", title: "Strengths & Friction Points" },
  { id: "growth", title: "Long-Term Growth & Outlook" },
  { id: "timing", title: "Current Period & Timing" },
];

const SYSTEM_PROMPT = `You are a Vedic astrology insight synthesiser for a compatibility assessment.

Your task: synthesise the provided chart data and compatibility scores for TWO profiles into a structured JSON insight.

Rules:
1. CHART VERIFICATION: Reproduce every value in "chart_verification" verbatim from the provided data.
2. GROUNDED ONLY: Write interpretations using only the provided chart data and interpretation texts. Do not speculate.
3. BOTH PROFILES: Each section must reference both individuals by name, not generic labels like "Person A/B".
4. KEY THEMES: 3–5 short bullet phrases summarising compatibility themes.
5. OUTPUT: Return valid JSON only. No markdown fences, no explanation text outside the JSON object.`;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function buildChartContext(profile: Profile): Promise<{
  summary: string;
  blocks: { key: string; text: string }[];
  lagna: string;
  moonNak: string;
  maha: string | undefined;
  antar: string | undefined;
}> {
  const chartReading = await db.readings.latestByEngine(profile.id, "dashaflow");
  if (!chartReading) throw new Error(`No chart data for profile: ${profile.name}`);

  const chartOutput = JSON.parse(chartReading.output_data) as Record<string, unknown>;
  const summary = summarizeDashaflow(chartOutput);
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const lagnaSign = (data?.lagna as Record<string, unknown> | undefined)?.sign as string ?? "";
  const planets = data?.planets as Record<string, { sign?: string; house?: number; nakshatra?: string }> | undefined;
  const dashas = data?.dashas as Record<string, { planet?: string }> | undefined;
  const moonNak = planets?.Moon?.nakshatra ?? planets?.moon?.nakshatra ?? "";
  const maha = dashas?.maha?.planet;
  const antar = dashas?.antar?.planet;

  const blocks: { key: string; text: string }[] = [];

  if (lagnaSign) {
    const e = lookupAscendant(lagnaSign);
    if (e) blocks.push({ key: `${profile.name}/ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(e.body) });
  }
  if (moonNak) {
    const e = lookupNakshatra(moonNak);
    if (e) blocks.push({ key: `${profile.name}/nakshatra/${moonNak.toLowerCase()}`, text: stripHtml(e.body) });
  }
  if (maha && antar) {
    const e = lookupDashaPair(maha, antar);
    if (e) blocks.push({ key: `${profile.name}/dasha-pair/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(e.body) });
  }
  // 7th house placements (most relevant for compatibility)
  if (planets) {
    for (const [name, p] of Object.entries(planets)) {
      if (p.house === 7 || p.house === 1 || p.house === 5) {
        const e = lookupPlanetInHouse(name, p.house);
        if (e) blocks.push({ key: `${profile.name}/planet-in-house/${name.toLowerCase()}-${p.house}`, text: stripHtml(e.body) });
      }
    }
  }

  return { summary, blocks, lagna: lagnaSign, moonNak, maha, antar };
}

export async function buildCompatibilityInsight(
  profile1: Profile,
  profile2: Profile,
  compatResult: Record<string, unknown>,
  model: AiModelKey = DEFAULT_INSIGHT_MODEL,
): Promise<CompatInsight> {
  const [ctx1, ctx2] = await Promise.all([
    buildChartContext(profile1),
    buildChartContext(profile2),
  ]);

  const scores = compatResult?.scores as Record<string, number> | undefined;
  const totalScore = compatResult?.total_score as number ?? 0;
  const isApproved = compatResult?.is_match_approved as boolean ?? false;

  const scoreSummary = scores
    ? Object.entries(scores).map(([k, v]) => `${k}: ${v}`).join(", ")
    : "No scores";

  const contentSection = [...ctx1.blocks, ...ctx2.blocks]
    .map((b) => `--- ${b.key} ---\n${b.text}`)
    .join("\n\n");

  const schemaExample: CompatInsight = {
    model: GEMINI_MODEL,
    prompt_version: PROMPT_VERSION,
    generated_at: new Date().toISOString(),
    profiles: { name1: profile1.name, name2: profile2.name },
    chart_verification: {
      name1: "[exact]",
      lagna1: "[lagna sign, verbatim]",
      moon_nakshatra1: "[nakshatra, verbatim]",
      name2: "[exact]",
      lagna2: "[lagna sign, verbatim]",
      moon_nakshatra2: "[nakshatra, verbatim]",
      total_score: "[exact score from compatibility data]",
    },
    sections: COMPAT_SECTIONS.map((s) => ({
      id: s.id,
      title: s.title,
      interpretation: "3–5 sentence synthesis referencing both profiles by name.",
    })),
    key_themes: ["Theme one", "Theme two", "Theme three"],
  };

  const userPrompt = `=== PROFILE 1: ${profile1.name} ===
DOB: ${profile1.date_of_birth} ${profile1.time_of_birth} (${profile1.timezone})
Place: ${profile1.place_of_birth}
Lagna: ${ctx1.lagna} | Moon Nakshatra: ${ctx1.moonNak} | Dasha: ${ctx1.maha}/${ctx1.antar}

${ctx1.summary}

=== PROFILE 2: ${profile2.name} ===
DOB: ${profile2.date_of_birth} ${profile2.time_of_birth} (${profile2.timezone})
Place: ${profile2.place_of_birth}
Lagna: ${ctx2.lagna} | Moon Nakshatra: ${ctx2.moonNak} | Dasha: ${ctx2.maha}/${ctx2.antar}

${ctx2.summary}

=== COMPATIBILITY SCORES ===
Total: ${totalScore}/36 — ${isApproved ? "Approved" : "Not Approved"}
${scoreSummary}

=== INTERPRETATION TEXTS ===
${contentSection}

=== OUTPUT SCHEMA ===
${JSON.stringify(schemaExample, null, 2)}

Generate the compatibility insight for ${profile1.name} and ${profile2.name}.`;

  const llmConfig = await db.settings.getAiInsightsLlm();
  const systemPrompt = llmConfig.custom_instructions
    ? `${SYSTEM_PROMPT}\n\n=== ADDITIONAL INSTRUCTIONS ===\n${llmConfig.custom_instructions}`
    : SYSTEM_PROMPT;

  const raw = await callAIForJson(model, systemPrompt, userPrompt, {
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.max_tokens,
  }) as CompatInsight;

  return {
    ...raw,
    model: model === "gemini-flash" ? GEMINI_MODEL : model,
    prompt_version: PROMPT_VERSION,
    generated_at: new Date().toISOString(),
    profiles: { name1: profile1.name, name2: profile2.name },
  };
}
