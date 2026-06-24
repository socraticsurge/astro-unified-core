import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./gemini", () => ({
  callGemini: vi.fn(),
  callGeminiText: vi.fn(),
}));

import { callAIForJson, callAIForText } from "./ai-caller";
import { callGemini, callGeminiText } from "./gemini";

describe("callAIForJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes gemini-flash to callGemini with its model id", async () => {
    vi.mocked(callGemini).mockResolvedValue({ summary: "test" });

    const result = await callAIForJson("gemini-flash", "sys", "user", { temperature: 0.5, maxTokens: 1024 });

    expect(callGemini).toHaveBeenCalledWith("gemini-3.1-flash-lite", "sys", "user", {
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
    expect(result).toEqual({ summary: "test" });
  });

  it("routes gemma-4-31b-it to callGemini with its model id", async () => {
    vi.mocked(callGemini).mockResolvedValue({ score: 28 });

    const result = await callAIForJson("gemma-4-31b-it", "sys", "user", { temperature: 0.4 });

    expect(callGemini).toHaveBeenCalledWith("gemma-4-31b-it", "sys", "user", {
      temperature: 0.4,
      maxOutputTokens: undefined,
    });
    expect(result).toEqual({ score: 28 });
  });
});

describe("callAIForText", () => {
  const msgs = [{ role: "user" as const, content: "hello" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes gemini-flash to callGeminiText with its model id", async () => {
    vi.mocked(callGeminiText).mockResolvedValue("Gemini response");

    const result = await callAIForText("gemini-flash", "sys", msgs, { temperature: 0.6, maxTokens: 2048 });

    expect(callGeminiText).toHaveBeenCalledWith("gemini-3.1-flash-lite", "sys", msgs, {
      temperature: 0.6,
      maxOutputTokens: 2048,
    });
    expect(result).toBe("Gemini response");
  });

  it("routes gemma-4-31b-it to callGeminiText with its model id", async () => {
    vi.mocked(callGeminiText).mockResolvedValue("Gemma reply");

    const result = await callAIForText("gemma-4-31b-it", "sys", msgs, { temperature: 0.65 });

    expect(callGeminiText).toHaveBeenCalledWith("gemma-4-31b-it", "sys", msgs, {
      temperature: 0.65,
      maxOutputTokens: undefined,
    });
    expect(result).toBe("Gemma reply");
  });
});
