import "server-only";
import { z } from "zod";
import { callAIForJson } from "./ai-caller";
import { fetchDashaflow } from "./dashaflow";
import { lookupAscendant } from "@/lib/content/lookup";

// Bump to invalidate cached payloads when the prompt template or output
// schema changes meaningfully. Same pattern as today-reading.ts.
// Bump when prompt template / output shape changes meaningfully. v2 (2026-05-20):
// tightened length to 1-2 sentences ≤ 40 words to fit a fixed-height snippet
// box on the landing without visual jumps.
export const PROMPT_VERSION_LANDING = 2;

export const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export type TodaySky = {
  moon_nakshatra: string;
  sun_sign: string;
  retrogrades: string[];
};

export type LandingPayload = {
  prompt_version: number;
  sky: TodaySky;
  ascendants: Record<ZodiacSign, string>;
};

const AscendantsSchema = z.object({
  aries: z.string().min(20),
  taurus: z.string().min(20),
  gemini: z.string().min(20),
  cancer: z.string().min(20),
  leo: z.string().min(20),
  virgo: z.string().min(20),
  libra: z.string().min(20),
  scorpio: z.string().min(20),
  sagittarius: z.string().min(20),
  capricorn: z.string().min(20),
  aquarius: z.string().min(20),
  pisces: z.string().min(20),
});

export const LlmResponseSchema = z.object({ ascendants: AscendantsSchema });

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(s: string, max = 600): string {
  return s.length > max ? s.slice(0, max).trimEnd() + "…" : s;
}

// Calls the sidecar with a synthetic "today noon IST, neutral location" input
// to extract today's Moon nakshatra, Sun sign, and any active retrogrades.
// Location is arbitrary because we only consume location-independent fields.
export async function fetchTodayCelestialFacts(date: Date = new Date()): Promise<TodaySky> {
  const iso = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const out = await fetchDashaflow({
    date_of_birth: iso,
    time_of_birth: "12:00",
    latitude: 28.6139,   // New Delhi — arbitrary; doesn't affect what we read
    longitude: 77.2090,
    timezone: "Asia/Kolkata",
  });
  if (out.error || !out.data) {
    throw new Error(`Sidecar failed: ${out.error ?? "no data"}`);
  }
  const data = out.data as {
    planets?: Record<string, { sign?: string; nakshatra?: string; is_retrograde?: boolean }>;
    panchanga?: { nakshatra?: { name?: string } };
  };

  const moonNak =
    data.panchanga?.nakshatra?.name ??
    data.planets?.Moon?.nakshatra ??
    "";
  const sunSign = data.planets?.Sun?.sign ?? "";
  const retrogrades: string[] = [];
  for (const [planet, info] of Object.entries(data.planets ?? {})) {
    if (info?.is_retrograde) retrogrades.push(planet);
  }
  if (!moonNak || !sunSign) {
    throw new Error("Sidecar response missing moon_nakshatra or sun_sign");
  }
  return { moon_nakshatra: moonNak, sun_sign: sunSign, retrogrades };
}

function buildSystemPrompt(): string {
  return `You write for Dr. Vinay Kumar Chaganti's Vedic astrology practice.

Tone:
1. Clear and observational. Speak about what TODAY's sky touches in a person born under a given ascendant.
2. Inviting reflection — not commands, not predictions, not fortune-cookie clichés.
3. No mystical jargon ("the cosmos compels", "destiny calls", etc.). No CTAs of any kind.
4. Each paragraph is 1-2 sentences. STRICT MAXIMUM 40 words. Aim for 30-38 words. Brevity is non-negotiable — the landing has a fixed-size visual box.
5. Reference the specific celestial facts provided (Moon's nakshatra, Sun's sign, named active retrogrades). Do not invent transits the data doesn't show.
6. Return strict JSON matching the requested schema. No markdown fences, no commentary.`;
}

function buildUserPrompt(sky: TodaySky): string {
  const groundingBlocks: string[] = [];
  for (const sign of ZODIAC_SIGNS) {
    const entry = lookupAscendant(sign);
    const body = entry?.body ? truncate(stripHtml(entry.body), 500) : "";
    groundingBlocks.push(
      `\n${sign.toUpperCase()} RISING — natal lens:\n${body || "(no authored grounding available; rely on classical significations of this ascendant)"}`,
    );
  }

  const retroLine =
    sky.retrogrades.length > 0
      ? `Active retrogrades: ${sky.retrogrades.join(", ")}.`
      : "No major planets are retrograde today.";

  return `Today's sky:
- Moon's nakshatra: ${sky.moon_nakshatra}
- Sun's sign: ${sky.sun_sign}
- ${retroLine}

For each of the 12 ascendants below, write what today's sky (above) ADDS or ASKS of a person born with that ascendant. Use the natal-lens grounding as the stable lens; let today's facts vary the angle. 1-2 sentences, STRICT MAX 40 words (aim for 30-38).

${groundingBlocks.join("\n")}

Return strict JSON in this exact shape (no other keys, no nesting beyond this):
{
  "ascendants": {
    "aries": "<paragraph>",
    "taurus": "<paragraph>",
    "gemini": "<paragraph>",
    "cancer": "<paragraph>",
    "leo": "<paragraph>",
    "virgo": "<paragraph>",
    "libra": "<paragraph>",
    "scorpio": "<paragraph>",
    "sagittarius": "<paragraph>",
    "capricorn": "<paragraph>",
    "aquarius": "<paragraph>",
    "pisces": "<paragraph>"
  }
}`;
}

// Single Gemini Flash Lite call returning 12 ascendant paragraphs grounded
// in (a) the authored ascendant content blocks and (b) today's actual sky.
// Throws on malformed output — caller handles retry/fallback.
export async function buildDailyLandingContent(sky: TodaySky): Promise<LandingPayload> {
  const raw = await callAIForJson(
    "gemini-flash",
    buildSystemPrompt(),
    buildUserPrompt(sky),
    { temperature: 0.8, maxTokens: 2400 },
  );
  const parsed = LlmResponseSchema.parse(raw);
  return {
    prompt_version: PROMPT_VERSION_LANDING,
    sky,
    ascendants: parsed.ascendants,
  };
}
