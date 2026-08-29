import { vi, describe, it, expect, afterEach } from "vitest";
import {
  deriveDashaflowProfile,
  fetchDashaflow,
  DashaflowInput,
} from "./dashaflow";

const profileContract = {
  contract_version: "1.0" as const,
  engine: {
    name: "DashaFlow",
    version: "1.1.0",
    ayanamsha: "Lahiri",
    ephemeris: "swiss" as const,
  },
  data: {
    nakshatra: "Rohini",
    pada: 2,
    janma_rashi: "Vrishabha",
    lagna: "Karka",
    lagna_degree: 12.5,
    planets: Array.from({ length: 9 }, (_, index) => ({
      name: `Planet ${index + 1}`,
      rashi: "Mesha",
      degree: index + 0.5,
      house: index + 1,
      retrograde: false,
    })),
  },
};

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

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toEqual(mockData);
    expect(result.error).toBeUndefined();
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
});

describe("deriveDashaflowProfile", () => {
  const mockInput: DashaflowInput = {
    date_of_birth: "1990-01-01",
    time_of_birth: "12:00",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
  };

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    delete process.env.DASHAFLOW_SIDECAR_URL;
  });

  it("sends the exact input to the versioned sidecar with its bearer credential", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    process.env.DASHAFLOW_SIDECAR_URL = "https://sidecar.example/";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => profileContract,
    } as Response);

    await expect(deriveDashaflowProfile(mockInput)).resolves.toEqual(profileContract);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://sidecar.example/v1/profile/derive");
    expect(init?.headers).toEqual({
      Authorization: "Bearer service-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual(mockInput);
  });

  it("fails closed without a configured credential", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not read or expose an upstream authentication error body", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "wrong-token";
    const json = vi.fn(async () => ({ detail: "expected super-secret-value" }));
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json,
    } as unknown as Response);

    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "configuration",
      message: "configuration",
    });
    expect(json).not.toHaveBeenCalled();
  });

  it("rejects a malformed or expanded sidecar contract", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ ...profileContract, raw_chart: { private: true } }),
    } as Response);

    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "invalid-response",
    });
  });

  it("returns bounded retry guidance after transient sidecar failure", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    const unavailable = {
      ok: false,
      status: 503,
      headers: new Headers({ "Retry-After": "12" }),
    } as Response;
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce(unavailable);

    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "unavailable",
      retryAfterSeconds: 12,
    });
  });
});
