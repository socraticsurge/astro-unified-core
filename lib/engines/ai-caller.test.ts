import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./gemini", () => ({
  callGemini: vi.fn(),
  callGeminiText: vi.fn(),
}));

vi.mock("./groq", () => ({
  callGroqById: vi.fn(),
}));

import { callAIForJson, callAIForText } from "./ai-caller";
import { callGemini, callGeminiText } from "./gemini";
import { callGroqById } from "./groq";

describe("callAIForJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes gemini-flash to callGemini", async () => {
    vi.mocked(callGemini).mockResolvedValue({ summary: "test" });

    const result = await callAIForJson("gemini-flash", "sys", "user", { temperature: 0.5, maxTokens: 1024 });

    expect(callGemini).toHaveBeenCalledWith("sys", "user", {
      temperature: 0.5,
      maxOutputTokens: 1024,
    });
    expect(callGroqById).not.toHaveBeenCalled();
    expect(result).toEqual({ summary: "test" });
  });

  it("routes groq-scout to callGroqById with json_mode enabled", async () => {
    vi.mocked(callGroqById).mockResolvedValue('{"score": 28}');

    const result = await callAIForJson("groq-scout", "sys", "user", { temperature: 0.4 });

    expect(callGroqById).toHaveBeenCalledWith(
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "sys",
      [{ role: "user", content: "user" }],
      expect.objectContaining({ json_mode: true, temperature: 0.4 }),
    );
    expect(callGemini).not.toHaveBeenCalled();
    expect(result).toEqual({ score: 28 });
  });

  it("routes groq-scout to callGroqById with correct model id", async () => {
    vi.mocked(callGroqById).mockResolvedValue('{"key":"val"}');

    await callAIForJson("groq-scout", "sys", "user");

    expect(callGroqById).toHaveBeenCalledWith(
      "meta-llama/llama-4-scout-17b-16e-instruct",
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({ json_mode: true }),
    );
  });

  it("parses the JSON string returned by Groq", async () => {
    vi.mocked(callGroqById).mockResolvedValue('{"sections":[{"title":"Career"}]}');

    const result = await callAIForJson("groq-scout", "sys", "user");

    expect(result).toEqual({ sections: [{ title: "Career" }] });
  });
});

describe("callAIForText", () => {
  const msgs = [{ role: "user" as const, content: "hello" }];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes gemini-flash to callGeminiText", async () => {
    vi.mocked(callGeminiText).mockResolvedValue("Gemini response");

    const result = await callAIForText("gemini-flash", "sys", msgs, { temperature: 0.6, maxTokens: 2048 });

    expect(callGeminiText).toHaveBeenCalledWith("sys", msgs, {
      temperature: 0.6,
      maxOutputTokens: 2048,
    });
    expect(callGroqById).not.toHaveBeenCalled();
    expect(result).toBe("Gemini response");
  });

  it("routes groq-scout to callGroqById without json_mode", async () => {
    vi.mocked(callGroqById).mockResolvedValue("Groq response");

    const result = await callAIForText("groq-scout", "sys", msgs, { temperature: 0.65 });

    expect(callGroqById).toHaveBeenCalledWith(
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "sys",
      msgs,
      expect.not.objectContaining({ json_mode: true }),
    );
    expect(callGeminiText).not.toHaveBeenCalled();
    expect(result).toBe("Groq response");
  });

  it("routes groq-scout to callGroqById with correct model id", async () => {
    vi.mocked(callGroqById).mockResolvedValue("Scout reply");

    await callAIForText("groq-scout", "sys", msgs);

    expect(callGroqById).toHaveBeenCalledWith(
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "sys",
      msgs,
      expect.any(Object),
    );
  });
});
