import fs from "node:fs";

// Mock server-only globally so it doesn't fail import in the test environment
jest.mock("server-only", () => ({}), { virtual: true });

describe("content loader caching", () => {
  beforeEach(() => {
    // Resetting modules is key to clear the module-level 'cache' Map in loader.ts
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should read from disk on the first call and cache subsequent calls for the same type and key", async () => {
    const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue("---\ntype: section\ntitle: Test Section\n---\nTest content body");
    const loader = await import("./loader");

    // First call should read from disk
    const firstResult = loader.loadByTypeAndKey("section", "test-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual(expect.objectContaining({
      type: "section",
      title: "Test Section",
      body: "Test content body"
    }));

    // Second call should return the cached value
    const secondResult = loader.loadByTypeAndKey("section", "test-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1); // Still 1, so it hit the cache
    expect(secondResult).toBe(firstResult); // Should return the exact same object reference
  });

  it("should return null and cache it if the file does not exist", async () => {
    const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockImplementation(() => {
      throw new Error("ENOENT: no such file or directory");
    });

    const loader = await import("./loader");

    // First call should read from disk and fail
    const firstResult = loader.loadByTypeAndKey("section", "missing-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(firstResult).toBeNull();

    // Second call should return the cached null value
    const secondResult = loader.loadByTypeAndKey("section", "missing-key");
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1); // Still 1
    expect(secondResult).toBeNull();
  });

  it("should cache different keys separately", async () => {
    const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockImplementation((path) => {
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
    const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockImplementation((path) => {
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
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should cache sections loaded via loadAllSections", async () => {
    jest.spyOn(fs, "readdirSync").mockReturnValue(["test-section.md"] as any);
    const readFileSyncSpy = jest.spyOn(fs, "readFileSync").mockReturnValue("---\ntype: section\ntitle: Test\nsection_in_view: Test View\n---\nBody");

    const loader = await import("./loader");

    const sections = loader.loadAllSections();
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(sections["Test View"]).toBeDefined();

    // Re-reading should not hit disk if caching is working correctly.
    // wait, actually loadAllSections does read directory every time, but load() might hit the cache.
    // Let's verify.
    const sections2 = loader.loadAllSections();
    // readdirSync is called again, but readFileSync shouldn't be called again if it's cached.
    expect(readFileSyncSpy).toHaveBeenCalledTimes(1); // Should hit the cache internally
    expect(sections2["Test View"]).toBe(sections["Test View"]); // same object ref
  });

  it("should return empty object if readdirSync throws", async () => {
    jest.spyOn(fs, "readdirSync").mockImplementation(() => {
      throw new Error("No dir");
    });

    const loader = await import("./loader");
    const sections = loader.loadAllSections();
    expect(sections).toEqual({});
  });
});
