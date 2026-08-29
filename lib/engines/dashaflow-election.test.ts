import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DashaflowElectionChartContract,
  DashaflowElectionChartInput,
  deriveDashaflowElectionCharts,
} from "./dashaflow-election";

const input: DashaflowElectionChartInput = {
  contract_version: "1.0",
  location: {
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
  },
  instants: ["2026-09-08T05:30:00.000Z", "2026-09-08T06:00:00+00:00"],
};

const planetNames = [
  "Surya",
  "Chandra",
  "Kuja",
  "Budha",
  "Guru",
  "Shukra",
  "Shani",
  "Rahu",
  "Ketu",
] as const;

function chart(instant: string) {
  return {
    instant,
    lagna: { rashi: "Karka" as const, degree: 12.5 },
    planets: planetNames.map((name, index) => ({
      name,
      rashi: "Mesha" as const,
      degree: index + 0.5,
      house: index + 1,
      retrograde: false,
    })),
  };
}

const contract: DashaflowElectionChartContract = {
  contract_version: "1.0",
  engine: {
    name: "DashaFlow",
    version: "1.1.0",
    ayanamsha: "Lahiri",
    ephemeris: "swiss",
  },
  house_system: "whole_sign",
  location: input.location,
  data: { charts: input.instants.map(chart) },
};

describe("deriveDashaflowElectionCharts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    delete process.env.DASHAFLOW_SIDECAR_URL;
  });

  it("sends only the versioned location-and-instants contract without cookies", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    process.env.DASHAFLOW_SIDECAR_URL = "https://sidecar.example/";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => contract,
    } as Response);

    await expect(deriveDashaflowElectionCharts(input)).resolves.toEqual(contract);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://sidecar.example/v1/election-chart/derive");
    expect(init?.headers).toEqual({
      Authorization: "Bearer service-token",
      "Content-Type": "application/json",
    });
    expect(init?.credentials).toBe("omit");
    expect(init?.cache).toBe("no-store");
    expect(init?.redirect).toBe("error");
    expect(JSON.parse(String(init?.body))).toEqual(input);
    expect(String(init?.body)).not.toMatch(/activity|profile|birth|natal|name/i);
  });

  it("re-projects the wire request so structurally compatible extras cannot cross", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => contract,
    } as Response);
    const expanded = {
      ...input,
      activity: "gold",
      profile_id: "private-profile",
      natal_chart: { private: true },
    };

    await deriveDashaflowElectionCharts(expanded);

    const [, init] = fetchSpy.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual(input);
  });

  it("fails closed without a configured bearer credential", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    await expect(deriveDashaflowElectionCharts(input)).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not read or expose an upstream authentication error body", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "wrong-token";
    const json = vi.fn(async () => ({ detail: "expected secret-token" }));
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json,
    } as unknown as Response);

    await expect(deriveDashaflowElectionCharts(input)).rejects.toMatchObject({
      code: "configuration",
      message: "configuration",
    });
    expect(json).not.toHaveBeenCalled();
  });

  it("rejects expanded, malformed, or out-of-order sidecar responses", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    const expanded = { ...contract, raw_chart: { private: true } };
    const wrongOrder = {
      ...contract,
      data: { charts: [...contract.data.charts].reverse() },
    };
    const wrongPlanets = {
      ...contract,
      data: {
        charts: contract.data.charts.map((item) => ({
          ...item,
          planets: [...item.planets].reverse(),
        })),
      },
    };

    for (const payload of [expanded, wrongOrder, wrongPlanets]) {
      vi.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => payload,
      } as Response);
      await expect(deriveDashaflowElectionCharts(input)).rejects.toMatchObject({
        code: "invalid-response",
      });
      vi.restoreAllMocks();
    }
  });

  it("rejects a response that echoes a different location", async () => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = "service-token";
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({
        ...contract,
        location: { ...contract.location, latitude: 0 },
      }),
    } as Response);

    await expect(deriveDashaflowElectionCharts(input)).rejects.toMatchObject({
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

    await expect(deriveDashaflowElectionCharts(input)).rejects.toMatchObject({
      code: "unavailable",
      retryAfterSeconds: 12,
    });
  });
});
