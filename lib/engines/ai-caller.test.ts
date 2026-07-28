import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./groq", () => ({
  callGroq: vi.fn(),
}));

import { callAIForJson, callAIForText } from "./ai-caller";
import { callGroq } from "./groq";

describe("callAIForJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes structured generation through the Groq production model", async () => {
    vi.mocked(callGroq).mockResolvedValue('{"summary":"test"}');

    const result = await callAIForJson(
      "groq-gpt-oss-120b",
      "sys",
      "user",
      { temperature: 0.5, maxTokens: 1024, topP: 0.8 },
    );

    expect(callGroq).toHaveBeenCalledWith(
      "openai/gpt-oss-120b",
      "sys",
      [{ role: "user", content: "user" }],
      {
        temperature: 0.5,
        maxTokens: 1024,
        topP: 0.8,
        jsonMode: true,
      },
    );
    expect(result).toEqual({ summary: "test" });
  });

  it("parses JSON from a fenced fallback response", async () => {
    vi.mocked(callGroq).mockResolvedValue('```json\n{"summary":"fallback"}\n```');

    await expect(
      callAIForJson("groq-gpt-oss-120b", "sys", "user"),
    ).resolves.toEqual({ summary: "fallback" });
  });
});

describe("callAIForText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes prose generation through the Groq production model", async () => {
    const messages = [{ role: "user" as const, content: "hello" }];
    vi.mocked(callGroq).mockResolvedValue("Groq response");

    const result = await callAIForText(
      "groq-gpt-oss-120b",
      "sys",
      messages,
      { temperature: 0.6, maxTokens: 2048 },
    );

    expect(callGroq).toHaveBeenCalledWith(
      "openai/gpt-oss-120b",
      "sys",
      messages,
      {
        temperature: 0.6,
        maxTokens: 2048,
        topP: undefined,
      },
    );
    expect(result).toBe("Groq response");
  });
});
