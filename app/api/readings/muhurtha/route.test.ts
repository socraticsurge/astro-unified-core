import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (session: { user?: { id?: string } } | null) => session?.user?.id ?? "",
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    profiles: { get: vi.fn() },
  },
}));

vi.stubGlobal("fetch", vi.fn());

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const serviceToken = "test-service-token-that-is-at-least-32-characters";
const session = { user: { id: "user-1" } };
const profile = {
  id: "profile-1",
  user_id: "user-1",
  date_of_birth: "1990-01-01",
  time_of_birth: "12:00",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
  current_location: "Bengaluru, Karnataka, India",
  current_latitude: 12.9716,
  current_longitude: 77.5946,
  current_timezone: "Asia/Kolkata",
};

function request() {
  return new NextRequest("http://localhost/api/readings/muhurtha", {
    method: "POST",
    body: JSON.stringify({
      profile_id: "profile-1",
      event_type: "marriage",
      start_date: "2026-09-10",
      end_date: "2026-09-12",
    }),
  });
}

describe("POST /api/readings/muhurtha sidecar authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockReset();
    process.env.DASHAFLOW_SIDECAR_TOKEN = serviceToken;
    process.env.DASHAFLOW_SIDECAR_URL = "https://sidecar.example/";
    delete process.env.VERCEL_ENV;
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
  });

  afterEach(() => {
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;
    delete process.env.DASHAFLOW_SIDECAR_URL;
    delete process.env.VERCEL_ENV;
  });

  it("uses a synthetic legacy birth object and sends no profile birth data", async () => {
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { timings: [] } }),
    } as never);

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ timings: [] });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://sidecar.example/muhurtha");
    expect(init).toEqual(expect.objectContaining({
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
    }));
    const wireBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(wireBody).toEqual({
      birth_data: {
        date_of_birth: "2000-01-01",
        time_of_birth: "00:00",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
      },
      current_location_data: {
        date_of_birth: "2000-01-01",
        time_of_birth: "00:00",
        latitude: profile.current_latitude,
        longitude: profile.current_longitude,
        timezone: profile.current_timezone,
      },
      event_type: "marriage",
      start_date: "2026-09-10",
      end_date: "2026-09-12",
    });
    expect(JSON.stringify(wireBody)).not.toContain(profile.date_of_birth);
    expect(JSON.stringify(wireBody)).not.toContain(profile.time_of_birth);
  });

  it("fails closed before fetch when sidecar credentials are missing", async () => {
    delete process.env.DASHAFLOW_SIDECAR_TOKEN;

    const res = await POST(request());

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      error: "Muhurtha calculation is temporarily unavailable. Please try again.",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an insecure deployed URL before attaching the credential", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.DASHAFLOW_SIDECAR_URL = "http://127.0.0.1:8000";

    const res = await POST(request());

    expect(res.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not read or expose an upstream error body", async () => {
    const text = vi.fn(async () => "private-sidecar-diagnostic");
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      text,
    } as never);

    const res = await POST(request());

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Muhurtha calculation is temporarily unavailable. Please try again.",
    });
    expect(text).not.toHaveBeenCalled();
  });

  it("does not expose an upstream network exception", async () => {
    vi.mocked(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("private-network-diagnostic"),
    );

    const res = await POST(request());

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: "Muhurtha calculation is temporarily unavailable. Please try again.",
    });
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
