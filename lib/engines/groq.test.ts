import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callGroq } from "./groq";

describe("callGroq", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "test-groq-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the OpenAI-compatible chat endpoint and JSON object mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"summary":"ready"}' } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGroq(
      "openai/gpt-oss-120b",
      "Return JSON.",
      [{ role: "user", content: "Summarize." }],
      {
        temperature: 0.4,
        maxTokens: 1024,
        topP: 0.8,
        jsonMode: true,
      },
    );

    expect(result).toBe('{"summary":"ready"}');
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-groq-key",
        },
      }),
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toMatchObject({
      model: "openai/gpt-oss-120b",
      max_completion_tokens: 1024,
      reasoning_effort: "low",
      include_reasoning: false,
      response_format: { type: "json_object" },
    });
  });

  it("retries without JSON mode when Groq rejects strict JSON validation", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Failed to validate JSON. Please adjust your prompt." },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"summary":"recovered"}' } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callGroq(
      "openai/gpt-oss-120b",
      "Return JSON.",
      [{ role: "user", content: "Summarize." }],
      { jsonMode: true },
    );

    expect(result).toBe('{"summary":"recovered"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(retryRequest.body as string)).not.toHaveProperty("response_format");
  });

  it("also retries when Groq reports a JSON generation failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: { message: "Failed to generate JSON. Please adjust your prompt." },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"summary":"recovered"}' } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callGroq(
        "openai/gpt-oss-120b",
        "Return JSON.",
        [{ role: "user", content: "Summarize." }],
        { jsonMode: true },
      ),
    ).resolves.toBe('{"summary":"recovered"}');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("waits for Groq's requested window and retries one rate-limited call", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => null },
        json: async () => ({
          error: { message: "Rate limit reached. Please try again in 0s." },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Recovered response" } }],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      callGroq(
        "openai/gpt-oss-120b",
        "System",
        [{ role: "user", content: "Hello." }],
      ),
    ).resolves.toBe("Recovered response");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails clearly when the staging credential is absent", async () => {
    vi.stubEnv("GROQ_API_KEY", "");

    await expect(
      callGroq("openai/gpt-oss-120b", "System", [], {}),
    ).rejects.toThrow("GROQ_API_KEY is not set");
  });
});
