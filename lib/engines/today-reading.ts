import "server-only";
import { callAIForJson } from "./ai-caller";
import { lookupDashaPair, lookupAscendant } from "@/lib/content/lookup";
import { summarizeDashaflow } from "@/lib/chart-summary";
import type { Profile } from "@/lib/db";

export type TodayReadingOutput = {
  dasha_reading: string;
  chart_reading: string;
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

function buildPrompt(
  profile: Profile,
  chartSummary: string,
  dashas: DashaInfo,
  contentBlocks: { key: string; text: string }[],
  activeAlerts: string[],
): string {
  const dashaLines = (["maha", "antar", "pratyantar", "sukshma", "prana"] as const)
    .map((lvl) => {
      const d = dashas[lvl];
      return d?.planet
        ? `${lvl}: ${d.planet}${d.start ? ` (${d.start} → ${d.end ?? "?"})` : ""}`
        : null;
    })
    .filter(Boolean)
    .join("\n");

  const contentSection = contentBlocks
    .map((b) => `--- ${b.key} ---\n${b.text}`)
    .join("\n\n");

  const alertsSection =
    activeAlerts.length > 0
      ? `\n\n=== ACTIVE PERIOD SHIFTS ===\n${activeAlerts.join("\n")}`
      : "";

  return `=== PROFILE ===
Name: ${profile.name}
Date of birth: ${profile.date_of_birth}
Time of birth: ${profile.time_of_birth} (${profile.timezone})
Place of birth: ${profile.place_of_birth}

=== CHART SUMMARY ===
${chartSummary}

=== CURRENT DASHA PERIODS ===
${dashaLines}${alertsSection}

=== INTERPRETATION TEXTS ===
${contentSection}

=== TASK ===
Write two reading sections using only the provided interpretation texts. Return valid JSON only — no markdown, no explanation outside the object.

{
  "dasha_reading": "3–4 sentences. Synthesise the current Maha + Antar + Pratyantar dasha combination using the provided dasha pair interpretation. Speak directly to the person (use 'your'). Ground every sentence in the texts provided.",
  "chart_reading": "3–4 sentences. Describe the person's overall natal chart themes using the provided ascendant interpretation. Focus on enduring life themes and natural strengths. Do not reference dasha periods here."
}`;
}

export async function buildTodayReading(
  profile: Profile,
  chartOutput: Record<string, unknown>,
  llmConfig: { temperature: number; max_tokens: number; custom_instructions: string },
): Promise<TodayReadingOutput> {
  const systemPrompt = `You are a Vedic astrology reading synthesiser for Dr. Vinay Kumar Chaganti's practice.

Rules:
1. Use ONLY the interpretation texts provided. Do not add knowledge from your own training.
2. Write in second person — speak directly to the person ("Your ascendant in Aries…").
3. Be warm, clear, and direct. No vague hedging.
4. Return valid JSON only — the exact two-key schema requested. No markdown fences.${
    llmConfig.custom_instructions
      ? `\n\nAdditional instructions:\n${llmConfig.custom_instructions}`
      : ""
  }`;

  const data = (chartOutput?.data ?? chartOutput) as Record<string, unknown>;
  const dashas = data?.dashas as DashaInfo | undefined;
  const lagnaSign = ((data?.lagna as Record<string, unknown> | undefined)?.sign as string) ?? "";
  const mahaStr = dashas?.maha?.planet;
  const antarStr = dashas?.antar?.planet;

  const contentBlocks: { key: string; text: string }[] = [];

  if (mahaStr && antarStr) {
    const entry = lookupDashaPair(mahaStr, antarStr);
    if (entry)
      contentBlocks.push({
        key: `dasha-pair/${mahaStr.toLowerCase()}-${antarStr.toLowerCase()}`,
        text: stripHtml(entry.body),
      });
  }

  if (lagnaSign) {
    const entry = lookupAscendant(lagnaSign);
    if (entry)
      contentBlocks.push({
        key: `ascendant/${lagnaSign.toLowerCase()}`,
        text: stripHtml(entry.body),
      });
  }

  if (contentBlocks.length === 0) {
    return {
      dasha_reading: "",
      chart_reading: "",
    };
  }

  const chartSummary = summarizeDashaflow(chartOutput);

  const activeAlerts: string[] = [];
  if (dashas?.antar?.end) {
    const ms = new Date(dashas.antar.end).getTime();
    if (!isNaN(ms)) {
      const weeksLeft = Math.round((ms - Date.now()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksLeft >= 0 && weeksLeft <= 8) {
        activeAlerts.push(
          `Antardasha transition in ~${weeksLeft} weeks (${dashas.antar.planet} period ending)`,
        );
      }
    }
  }
  if (dashas?.pratyantar?.end) {
    const ms = new Date(dashas.pratyantar.end).getTime();
    if (!isNaN(ms)) {
      const weeksLeft = Math.round((ms - Date.now()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksLeft >= 0 && weeksLeft <= 4) {
        activeAlerts.push(
          `Pratyantar shift in ~${weeksLeft} weeks (${dashas.pratyantar.planet} period ending)`,
        );
      }
    }
  }

  const userPrompt = buildPrompt(
    profile,
    chartSummary,
    dashas ?? {},
    contentBlocks,
    activeAlerts,
  );

  const raw = (await callAIForJson("gemini-flash", systemPrompt, userPrompt, {
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.max_tokens,
  })) as Record<string, unknown>;

  return {
    dasha_reading: typeof raw?.dasha_reading === "string" ? raw.dasha_reading : "",
    chart_reading: typeof raw?.chart_reading === "string" ? raw.chart_reading : "",
  };
}
