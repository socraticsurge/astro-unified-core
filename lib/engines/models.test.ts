import { describe, it, expect } from "vitest";
import { resolveModel, DEFAULT_INSIGHT_MODEL, DEFAULT_CHAT_MODEL, DEFAULT_DRAFT_MODEL } from "./models";

describe("resolveModel", () => {
  it("passes through a valid model key unchanged", () => {
    expect(resolveModel("gemini-flash", DEFAULT_INSIGHT_MODEL)).toBe("gemini-flash");
    expect(resolveModel("gemma-4-31b-it", DEFAULT_CHAT_MODEL)).toBe("gemma-4-31b-it");
    expect(resolveModel("gemma-4-31b-it", DEFAULT_DRAFT_MODEL)).toBe("gemma-4-31b-it");
  });

  it("returns the fallback for a retired or unknown model key (e.g. legacy 'groq-scout')", () => {
    expect(resolveModel("gpt-4o", DEFAULT_INSIGHT_MODEL)).toBe(DEFAULT_INSIGHT_MODEL);
    expect(resolveModel("groq-scout", DEFAULT_CHAT_MODEL)).toBe(DEFAULT_CHAT_MODEL);
  });

  it("returns the fallback for undefined", () => {
    expect(resolveModel(undefined, DEFAULT_INSIGHT_MODEL)).toBe(DEFAULT_INSIGHT_MODEL);
  });

  it("returns the fallback for null", () => {
    expect(resolveModel(null, DEFAULT_DRAFT_MODEL)).toBe(DEFAULT_DRAFT_MODEL);
  });

  it("returns the fallback for an empty string", () => {
    expect(resolveModel("", DEFAULT_CHAT_MODEL)).toBe(DEFAULT_CHAT_MODEL);
  });

  it("returns the fallback for a number", () => {
    expect(resolveModel(42, DEFAULT_INSIGHT_MODEL)).toBe(DEFAULT_INSIGHT_MODEL);
  });
});
