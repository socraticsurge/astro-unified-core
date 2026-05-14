import { GET, POST } from "./route";
import { NextRequest } from "next/server";

// Mock dependencies
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/admin", () => ({
  isAdmin: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  db: {
    profiles: {
      getAny: jest.fn(),
      get: jest.fn(),
    },
    readings: {
      latestByEngine: jest.fn(),
      save: jest.fn(),
    },
  },
}));

jest.mock("@/lib/engines/transit", () => ({
  fetchTransit: jest.fn(),
}));

jest.mock("@/lib/engine-error", () => ({
  extractEngineError: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(),
}));

import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { fetchTransit } from "@/lib/engines/transit";
import { extractEngineError } from "@/lib/engine-error";
import { rateLimit } from "@/lib/rate-limit";

describe("Transit API Route Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 if unauthorized", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 400 if profile_id is missing", async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      const req = {
        nextUrl: {
          searchParams: new URLSearchParams(),
        },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "profile_id is required" });
    });

    it("returns 404 if profile is not found", async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (db.profiles.get as jest.Mock).mockResolvedValue(null);

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({ profile_id: "prof1" }),
        },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Profile not found" });
    });

    it("returns 502 if engine returns an error", async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (db.profiles.get as jest.Mock).mockResolvedValue({
        date_of_birth: "1990-01-01",
        time_of_birth: "12:00",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
      });
      (db.readings.latestByEngine as jest.Mock).mockResolvedValue(null);
      (fetchTransit as jest.Mock).mockResolvedValue({ error: "Engine failure" });
      (extractEngineError as jest.Mock).mockReturnValue("Engine failure");

      const req = {
        nextUrl: {
          searchParams: new URLSearchParams({ profile_id: "prof1" }),
        },
      } as unknown as NextRequest;

      const res = await GET(req);
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "Engine failure" });
    });
  });

  describe("POST", () => {
    it("returns 401 if unauthorized", async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);
      const req = {
        json: jest.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Unauthorized" });
    });

    it("returns 429 if rate limit is exceeded", async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (rateLimit as jest.Mock).mockReturnValue({ success: false });

      const req = {
        json: jest.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ error: "Too many requests. Please wait a minute." });
    });

    it("returns 404 if profile is not found", async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (rateLimit as jest.Mock).mockReturnValue({ success: true });
      (db.profiles.get as jest.Mock).mockResolvedValue(null);

      const req = {
        json: jest.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Profile not found" });
    });

    it("returns 502 if engine returns an error", async () => {
      (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
      (rateLimit as jest.Mock).mockReturnValue({ success: true });
      (db.profiles.get as jest.Mock).mockResolvedValue({
        date_of_birth: "1990-01-01",
        time_of_birth: "12:00",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
      });
      (fetchTransit as jest.Mock).mockResolvedValue({ error: "Engine failure" });
      (extractEngineError as jest.Mock).mockReturnValue("Engine failure");

      const req = {
        json: jest.fn().mockResolvedValue({ profile_id: "prof1" }),
      } as unknown as NextRequest;

      const res = await POST(req);
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "Engine failure" });
    });
  });
});
