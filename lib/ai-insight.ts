import "server-only";
import { callGemini, GEMINI_MODEL } from "./engines/gemini";
import { summarizeDashaflow } from "./chart-summary";
import {
  lookupAscendant,
  lookupDashaPair,
  lookupNakshatra,
  lookupPlanetInHouse,
} from "./content/lookup";
import { db } from "./db";
import type { Profile } from "./db";

export type InsightTab = "natal" | "vargas" | "dashas" | "career" | "transit" | "tarabalam";

export const INSIGHT_TABS: InsightTab[] = ["natal", "vargas", "dashas", "career", "transit", "tarabalam"];

export const TAB_LABELS: Record<InsightTab, string> = {
  natal: "Natal Chart",
  vargas: "Varga Dashboard",
  dashas: "Dasha Timeline",
  career: "Career Analysis",
  transit: "Transit (Gochar)",
  tarabalam: "Tarabalam",
};

// Engine key stored in readings table per tab
export const TAB_ENGINE: Record<InsightTab, string> = {
  natal: "ai-natal",
  vargas: "ai-vargas",
  dashas: "ai-dashas",
  career: "ai-career",
  transit: "ai-transit",
  tarabalam: "ai-tarabalam",
};

export type InsightTechnicalFactor = {
  factor: string;
  value: string;
  nakshatra?: string;
};

export type InsightSection = {
  id: string;
  title: string;
  technical_basis: InsightTechnicalFactor[];
  content_sources: string[];
  interpretation: string;
};

export type TabInsight = {
  tab: InsightTab;
  model: string;
  prompt_version: string;
  generated_at: string;
  chart_verification: Record<string, string>;
  sections: InsightSection[];
  key_themes: string[];
};

const PROMPT_VERSION = "1.0";

const SYSTEM_PROMPT = `You are a Vedic astrology insight synthesiser for Dr. Vinay Kumar Chaganti's astrology practice.

Your sole task is to synthesise the provided chart data and interpretation texts into a structured JSON insight.

Rules — follow without exception:
1. CHART VERIFICATION: Reproduce every value in "chart_verification" EXACTLY as it appears in the provided chart data. Verbatim. No paraphrasing, no rounding, no reformatting. A mismatch invalidates the entire response.
2. GROUNDED ONLY: Write interpretations using ONLY the provided interpretation texts. Do not add any Vedic astrology knowledge from your own training. Do not speculate or invent anything.
3. TECHNICAL BASIS: In each section's "technical_basis" array, copy planet/house/factor values directly from the chart data as provided.
4. CONTENT SOURCES: In "content_sources", list only the content keys actually provided to you (e.g. "planet-in-house/sun-8").
5. KEY THEMES: 3–5 short bullet phrases summarising the tab's main themes. Drawn only from provided interpretations.
6. OUTPUT: Return valid JSON only. No markdown fences, no explanation text outside the JSON object.`;

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type ContentBlock = { key: string; text: string };

function buildUserPrompt(
  profile: Profile,
  chartSummary: string,
  tab: InsightTab,
  contentBlocks: ContentBlock[],
  tabSpecificData?: string,
): string {
  const sections = TAB_SECTIONS[tab];
  const contentSection = contentBlocks
    .map((b) => `--- ${b.key} ---\n${b.text}`)
    .join("\n\n");

  const schemaExample: TabInsight = {
    tab,
    model: GEMINI_MODEL,
    prompt_version: PROMPT_VERSION,
    generated_at: new Date().toISOString(),
    chart_verification: TAB_VERIFICATION_FIELDS[tab],
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      technical_basis: [{ factor: "example", value: "example value", nakshatra: "optional" }],
      content_sources: ["example/key"],
      interpretation: "3–5 sentence synthesis from the provided interpretation texts only.",
    })),
    key_themes: ["Theme one", "Theme two", "Theme three"],
  };

  return `=== PROFILE ===
Name: ${profile.name}
Date of birth: ${profile.date_of_birth}
Time of birth: ${profile.time_of_birth} (${profile.timezone})
Place of birth: ${profile.place_of_birth}

=== CHART DATA ===
${chartSummary}${tabSpecificData ? `\n\n=== ${TAB_LABELS[tab].toUpperCase()} DATA ===\n${tabSpecificData}` : ""}

=== INTERPRETATION TEXTS ===
${contentSection}

=== OUTPUT SCHEMA ===
Return a JSON object exactly matching this structure:
${JSON.stringify(schemaExample, null, 2)}

Generate the insight for the ${TAB_LABELS[tab]} tab. Sections to produce: ${sections.map((s) => s.title).join(", ")}.`;
}

// Sections to generate per tab
const TAB_SECTIONS: Record<InsightTab, { id: string; title: string }[]> = {
  natal: [
    { id: "core-nature", title: "Core Nature" },
    { id: "key-strengths", title: "Key Strengths" },
    { id: "challenges", title: "Challenges & Growth Areas" },
    { id: "relationships", title: "Relationships & Family" },
    { id: "current-period", title: "Current Life Period" },
  ],
  vargas: [
    { id: "overall-pattern", title: "Overall Divisional Pattern" },
    { id: "d9-dharma", title: "D9 — Dharma & Relationships" },
    { id: "d10-career", title: "D10 — Career & Status" },
  ],
  dashas: [
    { id: "mahadasha", title: "Current Major Period (Mahadasha)" },
    { id: "antardasha", title: "Current Sub-Period (Antardasha)" },
    { id: "period-guidance", title: "How to Navigate This Period" },
  ],
  career: [
    { id: "career-themes", title: "Career Themes" },
    { id: "recommended-domains", title: "Recommended Domains" },
    { id: "career-period", title: "Current Career Period" },
  ],
  transit: [
    { id: "transit-climate", title: "Overall Transit Climate" },
    { id: "key-influences", title: "Key Planetary Influences" },
    { id: "opportunities", title: "Opportunities & Cautions" },
  ],
  tarabalam: [
    { id: "tara-pattern", title: "Your Tara Pattern" },
    { id: "auspicious-periods", title: "Auspicious Periods" },
    { id: "caution-periods", title: "Caution Periods" },
  ],
};

// Placeholder verification field keys per tab (model fills values from chart data)
const TAB_VERIFICATION_FIELDS: Record<InsightTab, Record<string, string>> = {
  natal: {
    name: "[exact name from profile]",
    ascendant: "[lagna sign + degree + nakshatra, verbatim from chart data]",
    moon_sign: "[moon sign + nakshatra, verbatim]",
    current_dasha: "[mahadasha planet / antardasha planet, verbatim]",
    dasha_ends: "[mahadasha end date, verbatim]",
  },
  vargas: {
    name: "[exact name]",
    ascendant: "[D1 lagna, verbatim]",
    d9_ascendant: "[D9 lagna sign, verbatim]",
    d10_ascendant: "[D10 lagna sign, verbatim]",
  },
  dashas: {
    name: "[exact name]",
    mahadasha: "[mahadasha planet, verbatim]",
    mahadasha_ends: "[mahadasha end date, verbatim]",
    antardasha: "[antardasha planet, verbatim]",
    antardasha_ends: "[antardasha end date, verbatim]",
  },
  career: {
    name: "[exact name]",
    ascendant: "[lagna sign, verbatim]",
    current_dasha: "[mahadasha / antardasha, verbatim]",
    d10_summary: "[key D10 detail from career data, verbatim]",
  },
  transit: {
    name: "[exact name]",
    transit_date: "[date of transit data, verbatim]",
    ascendant: "[lagna sign, verbatim]",
    current_dasha: "[mahadasha / antardasha, verbatim]",
  },
  tarabalam: {
    name: "[exact name]",
    birth_nakshatra: "[birth moon nakshatra, verbatim]",
    ascendant: "[lagna sign, verbatim]",
  },
};

// Extract planet placements from chart output
function extractPlanetPlacements(chartOutput: Record<string, unknown>): {
  planet: string; sign: string; house: number; nakshatra?: string;
}[] {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, { sign?: string; house?: number; nakshatra?: string }> | undefined;
  if (!planets) return [];
  return Object.entries(planets).map(([planet, p]) => ({
    planet,
    sign: p.sign ?? "",
    house: p.house ?? 0,
    nakshatra: p.nakshatra,
  }));
}

function extractLagna(chartOutput: Record<string, unknown>): string {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  return (data?.lagna as Record<string, unknown>)?.sign as string ?? "";
}

function extractCurrentDasha(chartOutput: Record<string, unknown>): {
  maha?: string; antar?: string;
} {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as Record<string, { planet?: string }> | undefined;
  return {
    maha: dashas?.maha?.planet,
    antar: dashas?.antar?.planet,
  };
}

function extractMoonNakshatra(chartOutput: Record<string, unknown>): string {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, { nakshatra?: string }> | undefined;
  return planets?.Moon?.nakshatra ?? planets?.moon?.nakshatra ?? "";
}

// Main entry point — builds content, calls Gemini, returns TabInsight
export async function buildInsightForTab(
  profile: Profile,
  tab: InsightTab,
): Promise<TabInsight> {
  // Fetch chart reading from DB
  const chartReading = await db.readings.latestByEngine(profile.id, "dashaflow");
  if (!chartReading) throw new Error("No chart data found. Generate the chart first.");

  const chartOutput = JSON.parse(chartReading.output_data) as Record<string, unknown>;
  const chartSummary = summarizeDashaflow(chartOutput);

  const contentBlocks: ContentBlock[] = [];
  let tabSpecificData: string | undefined;

  const lagnaSign = extractLagna(chartOutput);
  const { maha, antar } = extractCurrentDasha(chartOutput);
  const moonNak = extractMoonNakshatra(chartOutput);
  const placements = extractPlanetPlacements(chartOutput);

  if (tab === "natal") {
    // Ascendant
    if (lagnaSign) {
      const entry = lookupAscendant(lagnaSign);
      if (entry) contentBlocks.push({ key: `ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    // All planets in houses
    for (const { planet, house } of placements) {
      if (house > 0) {
        const entry = lookupPlanetInHouse(planet, house);
        if (entry) contentBlocks.push({ key: `planet-in-house/${planet.toLowerCase()}-${house}`, text: stripHtml(entry.body) });
      }
    }
    // Moon nakshatra
    if (moonNak) {
      const entry = lookupNakshatra(moonNak);
      if (entry) contentBlocks.push({ key: `nakshatra/${moonNak.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    // Current dasha pair
    if (maha && antar) {
      const entry = lookupDashaPair(maha, antar);
      if (entry) contentBlocks.push({ key: `dasha-pair/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(entry.body) });
    }
  }

  if (tab === "vargas") {
    if (lagnaSign) {
      const entry = lookupAscendant(lagnaSign);
      if (entry) contentBlocks.push({ key: `ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    // Build per-planet varga table from planets[name].d9_sign / d10_sign etc.
    const data = chartOutput?.data as Record<string, unknown> | undefined;
    const planets = data?.planets as Record<string, Record<string, string | undefined>> | undefined;
    if (planets) {
      const PLANET_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
      const VARGA_KEYS = ["d2_sign","d3_sign","d4_sign","d7_sign","d9_sign","d10_sign","d12_sign","d16_sign","d20_sign","d24_sign","d27_sign","d30_sign","d40_sign","d60_sign"];
      // Header
      const header = ["Planet", ...VARGA_KEYS.map(k => k.replace("_sign", "").toUpperCase())].join("\t");
      const rows = PLANET_ORDER
        .filter(name => planets[name])
        .map(name => {
          const p = planets[name];
          return [name, ...VARGA_KEYS.map(k => p[k] ?? "—")].join("\t");
        });
      tabSpecificData = [header, ...rows].join("\n");

      // Look up D9 and D10 ascendant content if we can derive their signs from Lagna planet entry
      const lagna = data?.lagna as Record<string, unknown> | undefined;
      const d9LagnaSign = (lagna?.d9_sign ?? (planets["Lagna"] as Record<string, unknown> | undefined)?.d9_sign) as string | undefined;
      const d10LagnaSign = (lagna?.d10_sign ?? (planets["Lagna"] as Record<string, unknown> | undefined)?.d10_sign) as string | undefined;
      if (d9LagnaSign) {
        const entry = lookupAscendant(d9LagnaSign);
        if (entry) contentBlocks.push({ key: `d9-ascendant/${d9LagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
      }
      if (d10LagnaSign) {
        const entry = lookupAscendant(d10LagnaSign);
        if (entry) contentBlocks.push({ key: `d10-ascendant/${d10LagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
      }
    }
  }

  if (tab === "dashas") {
    if (maha && antar) {
      const entry = lookupDashaPair(maha, antar);
      if (entry) contentBlocks.push({ key: `dasha-pair/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    const data = chartOutput?.data as Record<string, unknown> | undefined;
    const dashas = data?.dashas as Record<string, { planet?: string; start?: string; end?: string }> | undefined;
    if (dashas) {
      tabSpecificData = ["maha", "antar", "pratyantar"]
        .map((lvl) => {
          const d = dashas[lvl];
          return d ? `${lvl}: ${d.planet} (${d.start ?? "?"} → ${d.end ?? "?"})` : null;
        })
        .filter(Boolean)
        .join("\n");
    }
  }

  if (tab === "career") {
    const careerReading = await db.readings.latestByEngine(profile.id, "career");
    if (careerReading) {
      tabSpecificData = JSON.stringify(JSON.parse(careerReading.output_data), null, 2).slice(0, 3000);
    }
    if (lagnaSign) {
      const entry = lookupAscendant(lagnaSign);
      if (entry) contentBlocks.push({ key: `ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    // 10th house planets
    for (const { planet, house } of placements) {
      if (house === 10 || house === 1) {
        const entry = lookupPlanetInHouse(planet, house);
        if (entry) contentBlocks.push({ key: `planet-in-house/${planet.toLowerCase()}-${house}`, text: stripHtml(entry.body) });
      }
    }
    if (maha && antar) {
      const entry = lookupDashaPair(maha, antar);
      if (entry) contentBlocks.push({ key: `dasha-pair/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(entry.body) });
    }
  }

  if (tab === "transit") {
    const transitReading = await db.readings.latestByEngine(profile.id, "transit");
    if (transitReading) {
      tabSpecificData = JSON.stringify(JSON.parse(transitReading.output_data), null, 2).slice(0, 3000);
    }
    if (moonNak) {
      const entry = lookupNakshatra(moonNak);
      if (entry) contentBlocks.push({ key: `nakshatra/${moonNak.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    if (maha && antar) {
      const entry = lookupDashaPair(maha, antar);
      if (entry) contentBlocks.push({ key: `dasha-pair/${maha.toLowerCase()}-${antar.toLowerCase()}`, text: stripHtml(entry.body) });
    }
  }

  if (tab === "tarabalam") {
    if (moonNak) {
      const entry = lookupNakshatra(moonNak);
      if (entry) contentBlocks.push({ key: `nakshatra/${moonNak.toLowerCase()}`, text: stripHtml(entry.body) });
    }
    if (lagnaSign) {
      const entry = lookupAscendant(lagnaSign);
      if (entry) contentBlocks.push({ key: `ascendant/${lagnaSign.toLowerCase()}`, text: stripHtml(entry.body) });
    }
  }

  if (contentBlocks.length === 0) {
    throw new Error(`No interpretation content found for tab: ${tab}`);
  }

  const userPrompt = buildUserPrompt(profile, chartSummary, tab, contentBlocks, tabSpecificData);
  const raw = await callGemini(SYSTEM_PROMPT, userPrompt) as TabInsight;

  // Stamp model + prompt_version regardless of what Gemini returned
  return {
    ...raw,
    tab,
    model: GEMINI_MODEL,
    prompt_version: PROMPT_VERSION,
    generated_at: new Date().toISOString(),
  };
}
