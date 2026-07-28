import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

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

import {
  buildCurrentReading,
  buildNatalReading,
  PROMPT_VERSION_CURRENT,
  PROMPT_VERSION_NATAL,
} from "../today-reading";
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

describe("PROMPT_VERSION constants", () => {
  it("CURRENT and NATAL are positive integers (bumpable cache keys)", () => {
    expect(Number.isInteger(PROMPT_VERSION_CURRENT)).toBe(true);
    expect(Number.isInteger(PROMPT_VERSION_NATAL)).toBe(true);
    expect(PROMPT_VERSION_CURRENT).toBeGreaterThan(0);
    expect(PROMPT_VERSION_NATAL).toBeGreaterThan(0);
  });
});

describe("buildCurrentReading", () => {
  it("returns empty string when maha and antar are missing", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue(undefined);
    const out = await buildCurrentReading(profile, chartWith({}), defaultConfig);
    expect(out).toBe("");
    expect(callAIForJson).not.toHaveBeenCalled();
  });

  it("returns empty string when no dasha-pair content matches", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue(undefined);
    const out = await buildCurrentReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      defaultConfig,
    );
    expect(out).toBe("");
    expect(callAIForJson).not.toHaveBeenCalled();
  });

  it("calls the LLM and returns dasha_reading when dasha-pair content exists", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue({ body: "<p>Sun-Mars body</p>" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({ dasha_reading: "your current period…" } as never);
    const out = await buildCurrentReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      defaultConfig,
    );
    expect(out).toBe("your current period…");
    expect(callAIForJson).toHaveBeenCalledTimes(1);
  });

  it("propagates temperature and max_tokens to the AI caller", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildCurrentReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      { temperature: 0.2, max_tokens: 1234, custom_instructions: "" },
    );
    expect(callAIForJson).toHaveBeenCalledWith(
      "groq-gpt-oss-120b",
      expect.any(String),
      expect.any(String),
      { temperature: 0.2, maxTokens: 1234 },
    );
  });

  it("includes the antardasha alert when antar.end is within 8 weeks", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildCurrentReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars", end: futureIso(4) } }),
      defaultConfig,
    );
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).toMatch(/Antardasha transition in ~\d+ weeks/);
  });

  it("appends custom_instructions to the system prompt verbatim", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildCurrentReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      { ...defaultConfig, custom_instructions: "Lean more existential." },
    );
    const systemPrompt = vi.mocked(callAIForJson).mock.calls[0][1];
    expect(systemPrompt).toContain("Lean more existential.");
  });

  it("identifies itself as the CURRENT-period tier in the system prompt", async () => {
    vi.mocked(lookupDashaPair).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildCurrentReading(
      profile,
      chartWith({ maha: { planet: "Sun" }, antar: { planet: "Mars" } }),
      defaultConfig,
    );
    const systemPrompt = vi.mocked(callAIForJson).mock.calls[0][1];
    expect(systemPrompt).toMatch(/CURRENT PERIOD/);
    expect(systemPrompt).not.toMatch(/NATAL CHART reading/);
  });
});

describe("buildNatalReading", () => {
  it("returns empty string when no ascendant content matches", async () => {
    vi.mocked(lookupAscendant).mockReturnValue(undefined);
    const out = await buildNatalReading(profile, chartWith({}), defaultConfig);
    expect(out).toBe("");
    expect(callAIForJson).not.toHaveBeenCalled();
  });

  it("calls the LLM and returns chart_reading when ascendant content exists", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "<p>Aries body</p>" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({ chart_reading: "your natal chart…" } as never);
    const out = await buildNatalReading(profile, chartWith({}, "Aries"), defaultConfig);
    expect(out).toBe("your natal chart…");
  });

  it("identifies itself as the NATAL tier in the system prompt", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildNatalReading(profile, chartWith({}, "Aries"), defaultConfig);
    const systemPrompt = vi.mocked(callAIForJson).mock.calls[0][1];
    expect(systemPrompt).toMatch(/NATAL CHART/);
  });

  it("strips HTML from the ascendant body", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({
      body: "<p>Aries are <strong>bold</strong> and <em>direct</em>.</p>",
    } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildNatalReading(profile, chartWith({}, "Aries"), defaultConfig);
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).toContain("Aries are bold and direct");
    expect(userPrompt).not.toContain("<strong>");
    expect(userPrompt).not.toContain("</em>");
  });

  it("coerces non-string output to empty string", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({ chart_reading: 42 } as never);
    const out = await buildNatalReading(profile, chartWith({}, "Aries"), defaultConfig);
    expect(out).toBe("");
  });

  it("asks for ~5x more content than the current-period reading", async () => {
    vi.mocked(lookupAscendant).mockReturnValue({ body: "body" } as never);
    vi.mocked(callAIForJson).mockResolvedValue({} as never);
    await buildNatalReading(profile, chartWith({}, "Aries"), defaultConfig);
    const userPrompt = vi.mocked(callAIForJson).mock.calls[0][2];
    expect(userPrompt).toMatch(/15.?20 sentences|3.?4 short paragraphs|350.?500 words/);
  });
});
