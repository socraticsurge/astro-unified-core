import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchCareer } from "./career";
import { fetchTransit } from "./transit";

const SERVICE_TOKEN = "test-service-token-that-is-at-least-32-characters";
const BIRTH_INPUT = {
  date_of_birth: "1990-01-01",
  time_of_birth: "12:00",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
};

const clients = [
  {
    label: "transit",
    path: "/transit",
    call: () => fetchTransit({ ...BIRTH_INPUT, transit_date: "2026-09-03" }),
    response: { status: "ok", data: { planets: [] }, transit_date: "2026-09-03" },
    expected: { data: { planets: [] }, transit_date: "2026-09-03" },
    unavailable: "Transit calculation is temporarily unavailable. Please try again.",
  },
  {
    label: "career",
    path: "/career",
    call: () => fetchCareer(BIRTH_INPUT),
    response: { status: "ok", data: { themes: [] } },
    expected: { data: { themes: [] } },
    unavailable: "Career calculation is temporarily unavailable. Please try again.",
  },
] as const;

describe.each(clients)("credentialed $label sidecar client", (client) => {
  beforeEach(() => {
    process.env.DASHAFLOW_SIDECAR_TOKEN = SERVICE_TOKEN;
    process.env.DASHAFLOW_SIDECAR_URL = "https://sidecar.example/";
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    delete process.env.DASHAFLOW_SIDECAR_URL;
    delete process.env.VERCEL_ENV;
  });

  it("validates the destination before attaching the bearer credential", async () => {
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => client.response,
    } as Response);

    await expect(client.call()).resolves.toEqual(client.expected);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`https://sidecar.example${client.path}`);
    expect(init?.headers).toEqual({
      Authorization: `Bearer ${SERVICE_TOKEN}`,
      "Content-Type": "application/json",
    });
    expect(init?.cache).toBe("no-store");
    expect(init?.credentials).toBe("omit");
    expect(init?.redirect).toBe("error");
  });

  it("fails closed without a valid service credential", async () => {
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    const fetchSpy = vi.spyOn(global, "fetch");

    await expect(client.call()).resolves.toEqual({
      data: null,
      error: client.unavailable,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not read or expose an upstream error body", async () => {
    const json = vi.fn(async () => ({ detail: "private-sidecar-diagnostic" }));
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 400,
      json,
    } as unknown as Response);

    const result = await client.call();
    expect(result).toEqual({ data: null, error: client.unavailable });
    expect(result.error).not.toContain("private-sidecar-diagnostic");
    expect(json).not.toHaveBeenCalled();
  });

  it("does not expose an upstream network exception", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(
      new Error("private-network-diagnostic"),
    );

    const result = await client.call();
    expect(result).toEqual({ data: null, error: client.unavailable });
    expect(result.error).not.toContain("private-network-diagnostic");
  });
});
