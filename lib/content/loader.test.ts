import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";

vi.mock("server-only", () => ({}));

vi.mock("gray-matter", () => ({
  default: (text: string) => {
    const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { data: {}, content: text };
    const data: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
      const colonIdx = line.indexOf(": ");
      if (colonIdx !== -1) {
        data[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 2).trim();
      }
    }
    return { data, content: match[2].trim() };
  },
}));

describe("content loader caching", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should read from disk on the first call and cache subsequent calls for the same type and key", async () => {
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockReturnValue("---\ntype: section\ntitle: Test Section\n---\nTest content body");
    const loader = await import("./loader");

    const firstResult = loader.loadByTypeAndKey("section", "test-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(expect.objectContaining({
      type: "section",
      title: "Test Section",
      body: "Test content body",
    }));

    const secondResult = loader.loadByTypeAndKey("section", "test-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(secondResult).toBe(firstResult);
  });

  it("should return null and cache it if the file does not exist", async () => {
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const loader = await import("./loader");

    const firstResult = loader.loadByTypeAndKey("section", "missing-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(firstResult).toBeNull();

    const secondResult = loader.loadByTypeAndKey("section", "missing-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(secondResult).toBeNull();
  });

  it("should cache different keys separately", async () => {
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockImplementation((path) => {
      if (path.toString().includes("key1")) return "---\ntype: section\ntitle: One\n---\nBody1";
      if (path.toString().includes("key2")) return "---\ntype: section\ntitle: Two\n---\nBody2";
      throw new Error("Not found");
    });

    const loader = await import("./loader");

    loader.loadByTypeAndKey("section", "key1");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);

    loader.loadByTypeAndKey("section", "key2");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(2);

    loader.loadByTypeAndKey("section", "key1");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(2);

    loader.loadByTypeAndKey("section", "key2");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(2);
  });

  it("should handle different types independently", async () => {
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockImplementation((path) => {
      if (path.toString().includes("sections")) return "---\ntype: section\ntitle: Section\n---\nBody";
      if (path.toString().includes("dasha-pair")) return "---\ntype: dasha-pair\ntitle: Dasha\n---\nBody";
      throw new Error("Not found");
    });

    const loader = await import("./loader");

    loader.loadByTypeAndKey("section", "same-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);

    loader.loadByTypeAndKey("dasha-pair", "same-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(2);

    loader.loadByTypeAndKey("section", "same-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(2);
  });
});

describe("loadAllSections caching", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should cache sections loaded via loadAllSections", async () => {
    vi.spyOn(fs, "readdirSync").mockReturnValue(["test-section.md"] as ReturnType<typeof fs.readdirSync>);
    const readFileSyncSpy = vi.spyOn(fs, "readFileSync").mockReturnValue("---\ntype: section\ntitle: Test\nsection_in_view: Test View\n---\nBody");

    const loader = await import("./loader");

    const sections = loader.loadAllSections();
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(sections["Test View"]).toBeDefined();

    const sections2 = loader.loadAllSections();
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(sections2["Test View"]).toBe(sections["Test View"]);
  });

  it("should return empty object if readdirSync throws", async () => {
    vi.spyOn(fs, "readdirSync").mockImplementation(() => {
      throw new Error("No dir");
    });

    const loader = await import("./loader");
    const sections = loader.loadAllSections();
    expect(sections).toEqual({});
  });
});
