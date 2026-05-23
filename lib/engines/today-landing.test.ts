import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { LlmResponseSchema, ZODIAC_SIGNS } from "./today-landing";

describe("today-landing LlmResponseSchema", () => {
  function makeValid(): Record<string, string> {
    return Object.fromEntries(
      ZODIAC_SIGNS.map((sign) => [
        sign,
        "Today's Moon in Krittika stirs something hidden under your usual focus — listen for the question it's actually asking.",
      ]),
    );
  }

  it("accepts a full payload with all 12 ascendants", () => {
    const ok = LlmResponseSchema.parse({ ascendants: makeValid() });
    expect(Object.keys(ok.ascendants).sort()).toEqual([...ZODIAC_SIGNS].sort());
  });

  it("rejects a payload missing a sign", () => {
    const missing = makeValid();
    delete missing.aries;
    expect(() => LlmResponseSchema.parse({ ascendants: missing })).toThrow();
  });

  it("rejects a payload with empty string for a sign", () => {
    const empty = makeValid();
    empty.taurus = "";
    expect(() => LlmResponseSchema.parse({ ascendants: empty })).toThrow();
  });

  it("rejects a payload with too-short text", () => {
    const tiny = makeValid();
    tiny.gemini = "nope";
    expect(() => LlmResponseSchema.parse({ ascendants: tiny })).toThrow();
  });

  it("rejects a snippet that exceeds 320 chars (forces retry instead of clipping)", () => {
    const tooLong = makeValid();
    tooLong.leo = "L".repeat(400);
    expect(() => LlmResponseSchema.parse({ ascendants: tooLong })).toThrow();
  });

  it("rejects entirely wrong shape", () => {
    expect(() => LlmResponseSchema.parse({ wrong: "shape" })).toThrow();
    expect(() => LlmResponseSchema.parse(null)).toThrow();
    expect(() => LlmResponseSchema.parse("string instead of object")).toThrow();
  });
});
