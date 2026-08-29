import { vi, describe, it, expect, beforeEach } from "vitest";
import { queryVariants, geocodePlace, searchPlaces } from "./geocode";

global.fetch = vi.fn();

describe("queryVariants", () => {
  it("handles a simple string without comma", () => {
    const res = queryVariants("Hyderabad");
    expect(res).toEqual(["Hyderabad", "Hyderabad, India"]);
  });

  it("handles a string with leading/trailing whitespace", () => {
    const res = queryVariants("  Mumbai  ");
    expect(res).toEqual(["Mumbai", "Mumbai, India"]);
  });

  it("handles a string with one comma", () => {
    const res = queryVariants("Vishakhapatnam, AP");
    expect(res).toContain("Vishakhapatnam, AP");
    expect(res).toContain("Vishakhapatnam");
    expect(res).toContain("Vishakhapatnam, India");
    expect(res).toContain("AP");
    expect(res.length).toBe(4);
  });

  it("handles multiple segments", () => {
    const res = queryVariants("Village, Mandal, District, State");
    expect(res).toContain("Village, Mandal, District, State");
    expect(res).toContain("Village");
    expect(res).toContain("Village, India");
    expect(res).toContain("State");
    expect(res).toContain("Village, Mandal, District");
  });

  it("handles empty string", () => {
    const res = queryVariants("");
    expect(res).toEqual(["", ", India"]);
  });

  it("handles single comma only", () => {
    const res = queryVariants(",");
    expect(res).toEqual([","]);
  });
});

describe("geocodePlace", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("throws the last error if all fetch attempts fail", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));

    await expect(geocodePlace("Unknown Place")).rejects.toThrow("Network Error");

    // "Unknown Place" yields 2 variants: ["Unknown Place", "Unknown Place, India"]
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws a default error if no results are found and no HTTP errors occur", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await expect(geocodePlace("Nowhere")).rejects.toThrow(
      'We couldn\'t find "Nowhere". Try the nearest larger city — for example, the closest district headquarters.'
    );
  });

  it("succeeds if an early variant fails but a later one succeeds", async () => {
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new Error("Network Error 1"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "17.3850", lon: "78.4867", display_name: "Hyderabad" }],
      } as Response);

    const result = await geocodePlace("Hyderabad");
    expect(result.latitude).toBe(17.385);
    expect(result.longitude).toBe(78.4867);
    expect(result.display_name).toBe("Hyderabad");
    expect(result.timezone).toBe("Asia/Kolkata");
  });
});

describe("searchPlaces", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses one bounded upstream request and returns selectable IANA-timezone results", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 123,
        osm_type: "relation",
        osm_id: 456,
        lat: "17.3850",
        lon: "78.4867",
        display_name: "Hyderabad, Telangana, India",
      }],
    } as Response);

    await expect(searchPlaces("  Hyderabad  ")).resolves.toEqual([{
      id: "osm:relation:456",
      label: "Hyderabad, Telangana, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(global.fetch).mock.calls[0];
    expect(String(url)).toContain("q=Hyderabad");
    expect(String(url)).toContain("limit=5");
    expect(String(url)).toContain("format=json");
    expect(init).toMatchObject({ cache: "no-store" });
  });

  it("returns at most five valid results", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => Array.from({ length: 7 }, (_, index) => ({
        place_id: index,
        lat: String(10 + index),
        lon: String(70 + index),
        display_name: `Place ${index}`,
      })),
    } as Response);

    const results = await searchPlaces("Places");
    expect(results).toHaveLength(5);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("drops malformed upstream rows", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [
        { place_id: 1, lat: "not-a-number", lon: "78", display_name: "Bad" },
        { place_id: 2, lat: "17", lon: "78", display_name: "  " },
      ],
    } as Response);

    await expect(searchPlaces("Bad rows")).resolves.toEqual([]);
  });

  it("does not cascade into relaxed queries after an upstream failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network Error"));
    await expect(searchPlaces("Hyderabad, Telangana")).rejects.toThrow("Network Error");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
