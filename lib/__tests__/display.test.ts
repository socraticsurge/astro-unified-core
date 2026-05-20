import { describe, it, expect } from "vitest";
import { toTitleCase, formatName, formatPlace } from "../display";

describe("toTitleCase", () => {
  it("title-cases simple lowercase words", () => {
    expect(toTitleCase("vinay kumar")).toBe("Vinay Kumar");
  });

  it("title-cases mixed case input", () => {
    expect(toTitleCase("VINAY KUMAR")).toBe("Vinay Kumar");
  });

  it("preserves all-caps acronyms of 2+ letters", () => {
    expect(toTitleCase("ramanujan iyengar from mit")).toBe("Ramanujan Iyengar From Mit");
    expect(toTitleCase("ramanujan iyengar from MIT")).toBe("Ramanujan Iyengar From MIT");
  });

  it("title-cases across comma-separated segments", () => {
    expect(toTitleCase("erode, tamil nadu, india")).toBe("Erode, Tamil Nadu, India");
  });

  it("lowercases small connector words when not first", () => {
    expect(toTitleCase("kingdom of saudi arabia")).toBe("Kingdom of Saudi Arabia");
  });

  it("capitalizes a small connector when it's the first word", () => {
    expect(toTitleCase("of mice and men")).toBe("Of Mice and Men");
  });

  it("handles empty / null / undefined", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase(null)).toBe("");
    expect(toTitleCase(undefined)).toBe("");
  });

  it("trims surrounding whitespace", () => {
    expect(toTitleCase("  vinay  ")).toBe("Vinay");
  });

  it("title-cases across hyphens and slashes", () => {
    expect(toTitleCase("port-au-prince")).toBe("Port-Au-Prince");
    expect(toTitleCase("apple/banana")).toBe("Apple/Banana");
  });
});

describe("formatName / formatPlace", () => {
  it("formatName delegates to toTitleCase", () => {
    expect(formatName("vinay")).toBe("Vinay");
  });

  it("formatPlace delegates to toTitleCase", () => {
    expect(formatPlace("erode, india")).toBe("Erode, India");
  });
});
