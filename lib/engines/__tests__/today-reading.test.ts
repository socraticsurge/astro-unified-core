import { vi, describe, it, expect, beforeEach } from "vitest";

// Stub server-only so the module imports cleanly under vitest.
vi.mock("server-only", () => ({}));

// Stub Next.js cache module that some upstream content imports might pull in.
// (Not strictly needed today, but cheap safety.)
vi.mock("@/lib/engines/ai-caller", () => ({
  callAIForJson: vi.fn(),
}));

vi.mock("@/lib/content/lookup", () => ({
  lookupDashaPair: vi.fn(),
  lookupAscendant: vi.fn(),
}));

vi.mock("@/lib/chart-summary", () => ({
  summarizeDashaflow: vi.fn(() => "stubbed chart summary"),
}));

import { buildTodayReading, PROMPT_VERSION } from "../today-reading";
import { callAIForJson } from "../ai-caller";
import { lookupDashaPair, lookupAscendant } from "@/lib/content/lookup";

const profile = {
  id: "prof1",
  user_id: "user1",
  name: "Vinay",
  date_of_birth: "1990-01-15",
  time_of_birth: "10:30",
  place_of_birth: "Bengaluru, India",
  latitude: 12.97,
  longitude: 77.59,
  timezone: "Asia/Kolkata",
} as never;

const futureIso = (weeks: number) =>
  new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString();

const chartWith = (dashas: Record<string, unknown>, lagnaSign = "Aries") => ({
  data: {
    lagna: { sign: lagnaSign },
    dashas,
  },
});

const defaultConfig = { temperature: 0.7, max_tokens: 800, custom_instructions: "" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PROMPT_VERSION", () => {
  it("is a positive integer (bumpable cache key)", () => {
    expect(Number.isInteger(PROMPT_VERSION)).toBe(true);
    expect(PROMPT_VERSION).toBeGreaterThan(0);
  });
});

describe("buildTodayReading", () => {
  it("returns empty strings when no content blocks are available", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue(undefined);
    vi.mocked(lookupAscendant).mockReturnValue(undefined);

    const out = await buildTodayReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      defaultConfig,
    );
    expect(out).toEqual({ dasha_reading: "", chart_reading: "" });
    expect(callAIForJson).not.toHaveBeenCalled();
  });

  it("calls the LLM when at least one content block matches", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({
      body: "<p>Aries ascendants are <em>direct</em>.</p>",
    } as never);
    vi.mocked(callAIForJson).mockResolvedValue({
      dasha_reading: "ok",
      chart_reading: "ok",
    } as never);

    const out = await buildTodayReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      defaultConfig,
    );
    expect(callAIForJson).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ dasha_reading: "ok", chart_reading: "ok" });
  });

  it("propagates llmConfig.temperature and max_tokens to the AI caller", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "Aries body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);

    await buildTodayReading(
      profile,
      chartWith({}),
      { temperature: 0.2, max_tokens: 1234, custom_instructions: "" },
    );
    expect(callAIForJson).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      { temperature: 0.2, maxTokens: 1234 },
    );
  });

  it("appends custom_instructions to the system prompt verbatim", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "Aries body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);

    await buildTodayReading(profile, chartWith({}), {
      ...defaultConfig,
      custom_instructions: "Use more bullet points.",
    });
    const systemPrompt = vi.mocked(callAIForJson).mock.calls[0][1];
    expect(systemPrompt).toContain("Use more bullet points.");
  });

  it("includes an antardasha-ending alert when antar.end is within 8 weeks", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "Aries body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);

    await buildTodayReading(
      profile,
      chartWith({
        antar: { planet: "Mars", end: futureIso(4) },
      }),
      defaultConfig,
    );
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).toMatch(/Antardasha transition in ~\d+ weeks/);
  });

  it("does not include an antardasha alert when end is more than 8 weeks away", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "Aries body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);

    await buildTodayReading(
      profile,
      chartWith({
        antar: { planet: "Mars", end: futureIso(20) },
      }),
      defaultConfig,
    );
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).not.toMatch(/Antardasha transition/);
  });

  it("includes a pratyantar-shift alert when end is within 4 weeks", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "Aries body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);

    await buildTodayReading(
      profile,
      chartWith({
        pratyantar: { planet: "Mercury", end: futureIso(2) },
      }),
      defaultConfig,
    );
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).toMatch(/Pratyantar shift in ~\d+ weeks/);
  });

  it("strips HTML tags from content block bodies", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({
      body: "<p>Aries are <strong>bold</strong>.</p><blockquote>Quote</blockquote>",
    } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);

    await buildTodayReading(profile, chartWith({}), defaultConfig);
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).toContain("Aries are bold");
    expect(userPrompt).not.toContain("<strong>");
    expect(userPrompt).not.toContain("</blockquote>");
  });

  it("coerces non-string LLM fields to empty string", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "Aries body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({
      dasha_reading: 42, // not a string
      chart_reading: "fine",
    } as never);

    const out = await buildTodayReading(profile, chartWith({}), defaultConfig);
    expect(out.dasha_reading).toBe("");
    expect(out.chart_reading).toBe("fine");
  });
});
