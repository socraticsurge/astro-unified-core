import "server-only";
import { callAIForJson } from "./ai-caller";
import { lookupDashaPair, lookupAscendant } from "@/lib/content/lookup";
import { summarizeDashaflow } from "@/lib/chart-summary";
import type { Profile } from "@/lib/db";

// ── Prompt versions ─────────────────────────────────────────────────────────
// Bump the relevant constant when the prompt template, content-block
// selection, or output schema changes in a way that should invalidate
// cached readings of that tier.
//
// Tiered cache strategy (PR-3):
//   - today-current  → invalidates on pratyantar shift, LLM config edit, or
//                      PROMPT_VERSION_CURRENT bump. ~2× content per call.
//   - today-natal    → invalidates on birth-data change, LLM config edit, or
//                      PROMPT_VERSION_NATAL bump. ~5× content per call. For
//                      an existing profile this effectively never regenerates.
//
// Backward-compat: the deprecated single-fingerprint flow used `PROMPT_VERSION`.
// Kept exported as a build-time alias of `PROMPT_VERSION_CURRENT` for any
// straggler imports; new code should use the tier-specific constants.

export const PROMPT_VERSION_CURRENT = 1;
export const PROMPT_VERSION_NATAL   = 1;
/** @deprecated use PROMPT_VERSION_CURRENT or PROMPT_VERSION_NATAL */
export const PROMPT_VERSION = PROMPT_VERSION_CURRENT;

export type TodayReadingOutput = {
  dasha_reading: string;
  chart_reading: string;
};

export type LlmConfig = {
  temperature: number;
  max_tokens: number;
  custom_instructions: string;
};

type DashaLevel = { planet?: string; start?: string; end?: string };
type DashaInfo = {
  maha?: DashaLevel;
  antar?: DashaLevel;
  pratyantar?: DashaLevel;
  sukshma?: DashaLevel;
  prana?: DashaLevel;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function activeAlerts(dashas: DashaInfo | undefined): string[] {
  const alerts: string[] = [];
  if (dashas?.antar?.end) {
    const ms = new Date(dashas.antar.end).getTime();
    if (!isNaN(ms)) {
      const weeksLeft = Math.round((ms - Date.now()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksLeft >= 0 && weeksLeft <= 8) {
        alerts.push(`Antardasha transition in ~${weeksLeft} weeks (${dashas.antar.planet} period ending)`);
      }
    }
  }
  if (dashas?.pratyantar?.end) {
    const ms = new Date(dashas.pratyantar.end).getTime();
    if (!isNaN(ms)) {
      const weeksLeft = Math.round((ms - Date.now()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksLeft >= 0 && weeksLeft <= 4) {
        alerts.push(`Pratyantar shift in ~${weeksLeft} weeks (${dashas.pratyantar.planet} period ending)`);
      }
    }
  }
  return alerts;
}

function systemPromptFor(tier: "current" | "natal", llmConfig: LlmConfig): string {
  const base = `You are a Vedic astrology reading synthesiser for Dr. Vinay Kumar Chaganti's practice.

Rules:
1. Use ONLY the interpretation texts provided. Do not add knowledge from your own training.
2. Write in second person — speak directly to the person ("Your ascendant in Aries…").
3. Be warm, clear, and direct. No vague hedging.
4. Return valid JSON only — match the exact schema requested. No markdown fences.`;
  const tierGuidance =
    tier === "current"
      ? "\n5. This is the CURRENT PERIOD reading. Focus on the active dasha combination and any imminent shifts."
      : "\n5. This is the NATAL CHART reading. Focus on enduring life themes, natural strengths, growth edges. Do NOT reference current dasha periods.";
  const customInstructions = llmConfig.custom_instructions
    ? `\n\nAdditional instructions:\n${llmConfig.custom_instructions}`
    : "";
  return base + tierGuidance + customInstructions;
}

// ── Current-period reading (Tier 1) ─────────────────────────────────────────
// ~2× the prior length: 6–8 sentences across two short paragraphs.
// Cached separately as engine="today-current" — invalidates on pratyantar shift.

export async function buildCurrentReading(
  profile: Profile,
  chartOutput: Record<string, unknown>,
  llmConfig: LlmConfig,
): Promise<string> {
  const data = (chartOutput?.data ?? chartOutput) as Record<string, unknown>;
  const dashas = data?.dashas as DashaInfo | undefined;
  const mahaStr = dashas?.maha?.planet;
  const antarStr = dashas?.antar?.planet;

  // No dasha-pair content available → no reading.
  if (!mahaStr || !antarStr) return "";

  const entry = lookupDashaPair(mahaStr, antarStr);
  if (!entry) return "";

  const dashaPairBlock = stripHtml(entry.body);
  const chartSummary = summarizeDashaflow(chartOutput);
  const alerts = activeAlerts(dashas);

  const dashaLines = (["maha", "antar", "pratyantar", "sukshma", "prana"] as const)
    .map((lvl) => {
      const d = dashas?.[lvl];
      return d?.planet
        ? `${lvl}: ${d.planet}${d.start ? ` (${d.start} → ${d.end ?? "?"})` : ""}`
        : null;
    })
    .filter(Boolean)
    .join("\n");

  const alertsSection = alerts.length > 0
    ? `\n\n=== ACTIVE PERIOD SHIFTS ===\n${alerts.join("\n")}`
    : "";

  const userPrompt = `=== PROFILE ===
Name: ${profile.name}
Date of birth: ${profile.date_of_birth}
Time of birth: ${profile.time_of_birth} (${profile.timezone})
Place of birth: ${profile.place_of_birth}

=== CHART SUMMARY ===
${chartSummary}

=== CURRENT DASHA PERIODS ===
${dashaLines}${alertsSection}

=== INTERPRETATION TEXTS ===
--- dasha-pair/${mahaStr.toLowerCase()}-${antarStr.toLowerCase()} ---
${dashaPairBlock}

=== TASK ===
Write a current-period reading using only the provided interpretation texts.

Length target: 6–8 sentences across two short paragraphs (roughly 120–180 words). Synthesise the Maha + Antar (+ Pratyantar if relevant) dasha combination, then briefly describe what to watch for or lean into during this window. Speak directly to the person (use "your"). Ground every sentence in the texts provided.

Return JSON only:
{
  "dasha_reading": "the reading text"
}`;

  const raw = (await callAIForJson("gemini-flash", systemPromptFor("current", llmConfig), userPrompt, {
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.max_tokens,
  })) as Record<string, unknown>;

  return typeof raw?.dasha_reading === "string" ? raw.dasha_reading : "";
}

// ── Natal chart reading (Tier 2) ────────────────────────────────────────────
// ~5× the prior length: 15–20 sentences across 3–4 paragraphs.
// Cached separately as engine="today-natal" — for an existing profile this
// effectively never regenerates unless birth data changes or PROMPT_VERSION_NATAL
// is bumped or admin settings change.

export async function buildNatalReading(
  profile: Profile,
  chartOutput: Record<string, unknown>,
  llmConfig: LlmConfig,
): Promise<string> {
  const data = (chartOutput?.data ?? chartOutput) as Record<string, unknown>;
  const lagnaSign = ((data?.lagna as Record<string, unknown> | undefined)?.sign as string) ?? "";

  if (!lagnaSign) return "";

  const entry = lookupAscendant(lagnaSign);
  if (!entry) return "";

  const ascendantBlock = stripHtml(entry.body);
  const chartSummary = summarizeDashaflow(chartOutput);

  const userPrompt = `=== PROFILE ===
Name: ${profile.name}
Date of birth: ${profile.date_of_birth}
Time of birth: ${profile.time_of_birth} (${profile.timezone})
Place of birth: ${profile.place_of_birth}

=== CHART SUMMARY ===
${chartSummary}

=== INTERPRETATION TEXTS ===
--- ascendant/${lagnaSign.toLowerCase()} ---
${ascendantBlock}

=== TASK ===
Write a natal chart reading using only the provided interpretation texts.

Length target: 15–20 sentences across 3–4 short paragraphs (roughly 350–500 words). Cover the ascendant's defining qualities, the person's natural strengths and growth edges, and the enduring life themes you can read in the chart summary. Speak directly to the person (use "your"). Do NOT mention current dasha periods or transitions — those belong to the current-period reading.

Return JSON only:
{
  "chart_reading": "the reading text"
}`;

  const raw = (await callAIForJson("gemini-flash", systemPromptFor("natal", llmConfig), userPrompt, {
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.max_tokens,
  })) as Record<string, unknown>;

  return typeof raw?.chart_reading === "string" ? raw.chart_reading : "";
}
