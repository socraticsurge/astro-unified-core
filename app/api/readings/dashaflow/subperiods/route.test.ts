import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/engines/reading-handler", () => ({ resolveProfile: vi.fn() }));
vi.mock("@/lib/engines/dashaflow", () => ({
  fetchDashaflowSubperiods: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: true })),
}));

import { getServerSession } from "next-auth/next";
import { resolveProfile } from "@/lib/engines/reading-handler";
import { fetchDashaflowSubperiods } from "@/lib/engines/dashaflow";
import { POST } from "./route";

const session = { user: { id: "owner-id", email: "owner@example.test" } };
const input = {
  date_of_birth: "1984-10-08",
  time_of_birth: "14:05",
  latitude: 16.5115,
  longitude: 80.616,
  timezone: "Asia/Kolkata",
};

function request(body: unknown) {
  return new NextRequest(
    "https://astro-unified-staging.vercel.app/api/readings/dashaflow/subperiods",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("Dasha subperiod route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T05:00:00.000Z"));
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(resolveProfile).mockResolvedValue({
      ok: true,
      userId: "owner-id",
      profile_id: "profile-1",
      profile: {} as never,
      input,
    });
    vi.mocked(fetchDashaflowSubperiods).mockResolvedValue({
      path: [2],
      children: [
        {
          planet: "Ketu",
          start: "2020-02-28",
          end: "2020-07-26",
          days: 149.14,
        },
      ],
    });
  });

  it("requires authentication", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await POST(request({ profile_id: "profile-1", path: [2] }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects paths outside the five-level Dasha tree", async () => {
    const response = await POST(
      request({ profile_id: "profile-1", path: [2, 1, 0, 8, 3] }),
    );
    expect(response.status).toBe(400);
    expect(fetchDashaflowSubperiods).not.toHaveBeenCalled();
  });

  it("uses the owner-scoped profile and profile-local calculation date", async () => {
    const response = await POST(request({ profile_id: "profile-1", path: [2] }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(resolveProfile).toHaveBeenCalledWith("profile-1", session);
    expect(fetchDashaflowSubperiods).toHaveBeenCalledWith(
      input,
      [2],
      "2026-07-27",
    );
    await expect(response.json()).resolves.toMatchObject({
      path: [2],
      children: [{ planet: "Ketu" }],
    });
  });

  it("fails closed when the sidecar cannot return exact children", async () => {
    vi.mocked(fetchDashaflowSubperiods).mockResolvedValue({
      error: "Timeline unavailable",
    });
    const response = await POST(request({ profile_id: "profile-1", path: [2] }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Timeline unavailable",
    });
  });
});
