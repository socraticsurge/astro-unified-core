import { queryVariants, geocodePlace } from "./geocode";

// Setup global fetch mock
global.fetch = jest.fn();

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
    jest.resetAllMocks();
  });

  it("throws the last error if all fetch attempts fail", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network Error"));

    await expect(geocodePlace("Unknown Place")).rejects.toThrow("Network Error");

    // "Unknown Place" yields 2 variants: ["Unknown Place", "Unknown Place, India"]
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("throws a default error if no results are found and no HTTP errors occur", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await expect(geocodePlace("Nowhere")).rejects.toThrow(
      'We couldn\'t find "Nowhere". Try the nearest larger city — for example, the closest district headquarters.'
    );
  });

  it("succeeds if an early variant fails but a later one succeeds", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network Error 1"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "17.3850", lon: "78.4867", display_name: "Hyderabad" }],
      });

    const result = await geocodePlace("Hyderabad");
    expect(result.latitude).toBe(17.385);
    expect(result.longitude).toBe(78.4867);
    expect(result.display_name).toBe("Hyderabad");
    expect(result.timezone).toBe("Asia/Kolkata");
  });
});
