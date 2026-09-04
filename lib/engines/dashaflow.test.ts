import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  deriveDashaflowProfile,
  fetchDashaflow,
  PROFILE_SIDECAR_ATTEMPT_TIMEOUT_MS,
  PROFILE_SIDECAR_RETRY_DELAY_MS,
  PROFILE_SIDECAR_TOTAL_DEADLINE_MS,
  DashaflowInput,
  DashaflowProfileContract,
} from "./dashaflow";

const SERVICE_TOKEN = "test-service-token-that-is-at-least-32-characters";
const WRONG_SERVICE_TOKEN = "wrong-service-token-that-is-at-least-32-characters";

const profileContract: DashaflowProfileContract = {
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
    planets: [
      { name: "Surya", rashi: "Mesha", degree: 0.5, house: 1, retrograde: false },
      { name: "Chandra", rashi: "Vrishabha", degree: 1.5, house: 2, retrograde: false },
      { name: "Kuja", rashi: "Mithuna", degree: 2.5, house: 3, retrograde: true },
      { name: "Budha", rashi: "Karka", degree: 3.5, house: 4, retrograde: false },
      { name: "Guru", rashi: "Simha", degree: 4.5, house: 5, retrograde: false },
      { name: "Shukra", rashi: "Kanya", degree: 5.5, house: 6, retrograde: false },
      { name: "Shani", rashi: "Tula", degree: 6.5, house: 7, retrograde: true },
      { name: "Rahu", rashi: "Vrischika", degree: 7.5, house: 8, retrograde: true },
      { name: "Ketu", rashi: "Dhanu", degree: 8.5, house: 9, retrograde: true },
    ],
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

  beforeEach(() => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
    process.env.DASHAFLOW_SIDECAR_URL = "https://sidecar.example/";
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    delete process.env.DASHAFLOW_SIDECAR_URL;
    delete process.env.VERCEL_ENV;
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
    expect(fetch).toHaveBeenCalledWith(
      "https://sidecar.example/calculate",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockInput),
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
      }),
    );
  });

  it("does not read or expose an upstream error body", async () => {
    const json = vi.fn(async () => ({ detail: "private-sidecar-diagnostic" }));
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json,
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Chart calculation is temporarily unavailable. Please try again.");
    expect(result.error).not.toContain("private-sidecar-diagnostic");
    expect(json).not.toHaveBeenCalled();
  });

  it("returns the same sanitized error for other non-success statuses", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    } as Response);

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Chart calculation is temporarily unavailable. Please try again.");
  });

  it("does not expose status text if the transient retry also fails", async () => {
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
    expect(result.error).toBe("Chart calculation is temporarily unavailable. Please try again.");
  });

  it("does not expose network exception messages", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("private-network-diagnostic"));

    const result = await fetchDashaflow(mockInput);
    expect(result.data).toBeNull();
    expect(result.error).toBe("Chart calculation is temporarily unavailable. Please try again.");
    expect(result.error).not.toContain("private-network-diagnostic");
  });

  it("fails closed before fetch when the service credential is missing", async () => {
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    const fetchSpy = vi.spyOn(global, "fetch");

    const result = await fetchDashaflow(mockInput);

    expect(result).toEqual({
      data: null,
      error: "Chart calculation is temporarily unavailable. Please try again.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
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
    delete process.env.VERCEL_ENV;
  });

  it("sends the exact input to the versioned sidecar with its bearer credential", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
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
      Authorization: `Bearer ${SERVICE_TOKEN}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init?.body))).toEqual(mockInput);
    expect(init?.credentials).toBe("omit");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
  });

  it("fails closed without a configured credential", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not read or expose an upstream authentication error body", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = WRONG_SERVICE_TOKEN;
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
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
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

  it.each([
    [
      "engine identity",
      { ...profileContract, engine: { ...profileContract.engine, name: "OtherEngine" } },
    ],
    [
      "ayanamsha",
      { ...profileContract, engine: { ...profileContract.engine, ayanamsha: "Raman" } },
    ],
    [
      "Nakshatra spelling",
      { ...profileContract, data: { ...profileContract.data, nakshatra: "Ashwini" } },
    ],
    [
      "Janma Rashi spelling",
      { ...profileContract, data: { ...profileContract.data, janma_rashi: "Taurus" } },
    ],
    [
      "Lagna spelling",
      { ...profileContract, data: { ...profileContract.data, lagna: "Cancer" } },
    ],
    [
      "planet Rashi spelling",
      {
        ...profileContract,
        data: {
          ...profileContract.data,
          planets: [
            { ...profileContract.data.planets[0], rashi: "Aries" },
            ...profileContract.data.planets.slice(1),
          ],
        },
      },
    ],
    [
      "graha order",
      {
        ...profileContract,
        data: {
          ...profileContract.data,
          planets: [
            profileContract.data.planets[1],
            profileContract.data.planets[0],
            ...profileContract.data.planets.slice(2),
          ],
        },
      },
    ],
    [
      "graha uniqueness",
      {
        ...profileContract,
        data: {
          ...profileContract.data,
          planets: [
            profileContract.data.planets[0],
            profileContract.data.planets[0],
            ...profileContract.data.planets.slice(2),
          ],
        },
      },
    ],
  ])("rejects sidecar profile contract drift in %s", async (_label, payload) => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => payload,
    } as Response);

    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "invalid-response",
    });
  });

  it("keeps the full retry budget safely below the browser deadline", async () => {
    vi.useFakeTimers();
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const unavailable = {
      ok: false,
      status: 503,
      headers: new Headers({ "Retry-After": "12" }),
    } as Response;
    const fetchSpy = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce(unavailable);

    const result = expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "unavailable",
      retryAfterSeconds: 12,
    });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(PROFILE_SIDECAR_RETRY_DELAY_MS);

    await result;
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(timeoutSpy).toHaveBeenNthCalledWith(1, PROFILE_SIDECAR_ATTEMPT_TIMEOUT_MS);
    expect(timeoutSpy).toHaveBeenNthCalledWith(2, PROFILE_SIDECAR_ATTEMPT_TIMEOUT_MS);
    expect(PROFILE_SIDECAR_TOTAL_DEADLINE_MS).toBe(12_500);
    expect(PROFILE_SIDECAR_TOTAL_DEADLINE_MS).toBeLessThan(15_000);
  });

  it("rejects an insecure deployed sidecar URL before attaching the credential", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
    process.env.DASHAFLOW_SIDECAR_URL = "http://127.0.0.1:8000";
    const fetchSpy = vi.spyOn(global, "fetch");

    await expect(deriveDashaflowProfile(mockInput)).rejects.toMatchObject({
      code: "configuration",
      message: "configuration",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a short credential without exposing its value", async () => {
    const shortToken = "private-short-token";
    process.env.DASHAFLOW_SIDECAR_TOKEN = shortToken;

    const rejection = deriveDashaflowProfile(mockInput).catch((error: unknown) => error);
    await expect(rejection).resolves.toMatchObject({ code: "configuration" });
    await expect(rejection).resolves.not.toMatchObject({ message: expect.stringContaining(shortToken) });
  });
});
