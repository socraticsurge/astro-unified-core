import { vi, describe, it, expect, afterEach } from "vitest";
import {
  fetchDashaflow,
  fetchDashaflowSubperiods,
  DashaflowInput,
} from "./dashaflow";

describe("fetchDashaflow", () => {
  const mockInput: DashaflowInput = {
    date_of_birth: "1990-01-01",
    time_of_birth: "12:00",
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: "Asia/Kolkata",
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return data successfully on 200 OK", async () => {
    const mockData = { planets: [], houses: [] };
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "success", data: mockData }),
    } as Response);

    const result = await fetchDashaflow(mockInput, "2026-07-27");
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/calculate"),
      expect.objectContaining({
        body: JSON.stringify({ ...mockInput, query_date: "2026-07-27" }),
      }),
    );
  });

  it("should return error detail on non-200 with JSON detail", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ detail: "Invalid input format" }),
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Invalid input format");
  });

  it("should return default error on non-200 with no JSON detail", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Sidecar HTTP 500");
  });

  it("should return statusText if JSON parsing fails on non-200 (retries once on 503)", async () => {
    // fetchWithRetry retries once on 503 — mock both calls with the same response.
    const mock503 = {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => { throw new Error("Invalid JSON"); },
    } as Response;
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(mock503)
      .mockResolvedValueOnce(mock503);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Service Unavailable");
  });

  it("should handle network errors (fetch throws)", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network Error"));

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Network Error");
  });

  it("requests exact Dasha children with the profile-local query date", async () => {
    const children = [
      {
        planet: "Ketu",
        start: "2020-02-28",
        end: "2020-07-26",
        days: 149.14,
      },
    ];
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        data: { path: [2], children },
      }),
    } as Response);

    const result = await fetchDashaflowSubperiods(
      mockInput,
      [2],
      "2026-07-27",
    );
    expect(result.children).toEqual(children);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/dasha-subperiods"),
      expect.objectContaining({
        body: JSON.stringify({
          ...mockInput,
          query_date: "2026-07-27",
          path: [2],
        }),
      }),
    );
  });
});
