import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "",
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    profiles: {
      getAny: vi.fn(),
      get: vi.fn(),
    },
    readings: {
      latestByEngine: vi.fn(),
      save: vi.fn(),
    },
  },
}));

vi.mock("@/lib/engines/transit", () => ({
  fetchTransit: vi.fn(),
}));

vi.mock("@/lib/engine-error", () => ({
  extractEngineError: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { fetchTransit } from "@/lib/engines/transit";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/rate-limit";

describe("Transit API Route Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 if unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 if profile_id is missing", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1" } } as never);
      const req = {
        nextUrl: { searchParams: new URLSearchParams() },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "profile_id is required" });
    });

    it("returns 404 if profile is not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1" } } as never);
      vi.mocked(db.profiles.get).mockResolvedValue(null);

      const req = {
        nextUrl: { searchParams: new URLSearchParams({ profile_id: "prof1" }) },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Profile not found" });
    });

    it("returns 502 if engine returns an error", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1" } } as never);
      vi.mocked(db.profiles.get).mockResolvedValue({
        date_of_birth: "1990-01-01",
        time_of_birth: "12:00",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
      } as never);
      vi.mocked(db.readings.latestByEngine).mockResolvedValue(null);
      vi.mocked(fetchTransit).mockResolvedValue({ error: "Engine failure" } as never);
      vi.mocked(extractEngineError).mockReturnValue("Engine failure");

      const req = {
        nextUrl: { searchParams: new URLSearchParams({ profile_id: "prof1" }) },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "Engine failure" });
    });
  });

  describe("POST", () => {
    it("returns 401 if unauthorized", async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const req = {
        json: vi.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 429 if rate limit is exceeded", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1" } } as never);
      vi.mocked(rateLimit).mockReturnValue({ success: false } as never);

      const req = {
        json: vi.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ error: "Too many requests. Please wait a minute." });
    });

    it("returns 404 if profile is not found", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1" } } as never);
      vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
      vi.mocked(db.profiles.get).mockResolvedValue(null);

      const req = {
        json: vi.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Profile not found" });
    });

    it("returns 502 if engine returns an error", async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1" } } as never);
      vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
      vi.mocked(db.profiles.get).mockResolvedValue({
        date_of_birth: "1990-01-01",
        time_of_birth: "12:00",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
      } as never);
      vi.mocked(fetchTransit).mockResolvedValue({ error: "Engine failure" } as never);
      vi.mocked(extractEngineError).mockReturnValue("Engine failure");

      const req = {
        json: vi.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "Engine failure" });
    });
  });
});
