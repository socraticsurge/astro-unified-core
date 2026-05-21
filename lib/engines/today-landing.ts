import "server-only";
import { z } from "zod";
import { callAIForJson } from "./ai-caller";
import { fetchDashaflow } from "./dashaflow";
import { lookupAscendant } from "@/lib/content/lookup";

// Bump to invalidate cached payloads when the prompt template or output
// schema changes meaningfully. Same pattern as today-reading.ts.
// Bump when prompt template / output shape changes meaningfully.
// v2 (2026-05-20): tightened length to 1-2 sentences ≤ 40 words.
// v3 (2026-05-21): hard cap of 300 chars / 45 words in prompt + Zod
// .max(320) schema so an over-long Gemini response fails validation and
// retries — no more brutal client-side mid-sentence truncation.
// v4 (2026-05-21): explicitly forbid restating today's transit data
// (Sun sign, Moon nakshatra, retrogrades). The landing already displays
// these facts in tiles above the snippet — repeating them in prose
// wasted the character budget on info the reader already has. Now the
// budget goes to guidance.
export const PROMPT_VERSION_LANDING = 4;

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

// Each snippet must fit the landing's fixed-height box. .max(320) hard-fails
// a Gemini response that ignored the prompt's word/char limits, so the route
// triggers a retry (we have 3 attempts/day) instead of shipping a snippet
// that gets clipped client-side.
const SNIPPET_SCHEMA = z.string().min(20).max(320);

const AscendantsSchema = z.object({
  aries: SNIPPET_SCHEMA,
  taurus: SNIPPET_SCHEMA,
  gemini: SNIPPET_SCHEMA,
  cancer: SNIPPET_SCHEMA,
  leo: SNIPPET_SCHEMA,
  virgo: SNIPPET_SCHEMA,
  libra: SNIPPET_SCHEMA,
  scorpio: SNIPPET_SCHEMA,
  sagittarius: SNIPPET_SCHEMA,
  capricorn: SNIPPET_SCHEMA,
  aquarius: SNIPPET_SCHEMA,
  pisces: SNIPPET_SCHEMA,
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
  // Rahu and Ketu (the lunar nodes) are always retrograde from Earth's
  // frame of reference — flagging them on the landing badge would be
  // tautological and noisy. Filter out so only meaningful retrogrades
  // (Mercury, Venus, Mars, Jupiter, Saturn) surface.
  const ALWAYS_RETROGRADE = new Set(["Rahu", "Ketu"]);
  const retrogrades: string[] = [];
  for (const [planet, info] of Object.entries(data.planets ?? {})) {
    if (info?.is_retrograde && !ALWAYS_RETROGRADE.has(planet)) retrogrades.push(planet);
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
4. Each paragraph is 1-2 sentences. STRICT MAXIMUM: 45 words AND 300 characters (count, do not estimate). Aim for 35-42 words. The landing has a fixed-size visual box; any snippet exceeding these limits will be rejected and the entire batch regenerated.
5. **DO NOT restate today's transit data.** The landing UI already displays the Moon's nakshatra, Sun's sign, and active retrogrades in tiles above your text. Phrases like "The Sun in Taurus brings…", "Moon in Pushya asks…", "Mercury retrograde slows…" are forbidden. The reader has already read those facts. Use the natal-lens + today's sky as private context; the snippet's words are reserved for guidance, reflection, or invitation.
6. Use the natal-lens grounding to identify what the ascendant naturally seeks; use today's sky (in your head, not on the page) to choose the angle of guidance. The reader should feel addressed personally, not lectured on celestial mechanics.
7. Return strict JSON matching the requested schema. No markdown fences, no commentary.`;
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

  return `Today's sky (private context for you; the reader already sees these in tiles on the page — DO NOT restate them in your prose):
- Moon's nakshatra: ${sky.moon_nakshatra}
- Sun's sign: ${sky.sun_sign}
- ${retroLine}

For each of the 12 ascendants below, write **guidance** that uses the natal-lens grounding as the stable lens and today's sky (above) as private context for the angle you choose. **Do not begin with "The Sun in…", "The Moon in…", or any phrase that restates the transit facts** — those facts are already on the page above your text. The reader's question is "what does this ask of me?" — answer that. 1-2 sentences. STRICT MAX 45 words AND 300 chars (aim 35-42 words / ~250 chars). Over-length snippets cause the whole response to be rejected.

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
