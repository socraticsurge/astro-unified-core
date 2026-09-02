import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {}, getUserId: (s) => s?.user?.id ?? "" }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/geocode", () => ({ geocodePlace: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    profiles: {
      list: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { geocodePlace } from "@/lib/geocode";

const mockProfile = {
  id: "prof-1",
  user_id: "user-1",
  name: "Test User",
  date_of_birth: "1990-01-01",
  time_of_birth: "12:00",
  place_of_birth: "Mumbai, India",
  latitude: 19.076,
  longitude: 72.877,
  timezone: "Asia/Kolkata",
  timezone_offset: 5.5,
  created_at: "2026-01-01T00:00:00.000Z",
};

const mockGeo = {
  latitude: 19.076,
  longitude: 72.877,
  timezone: "Asia/Kolkata",
  timezone_offset: 5.5,
  display_name: "Mumbai, India",
};

describe("GET /api/profiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 with profiles list", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(db.profiles.list).mockResolvedValue([mockProfile] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([mockProfile]);
    expect(db.profiles.list).toHaveBeenCalledWith("user-1");
  });

  it("sets Cache-Control: private, no-store", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(db.profiles.list).mockResolvedValue([] as never);
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("POST /api/profiles", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (body: object) =>
    new NextRequest("http://localhost/api/profiles", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeReq({ name: "A", date_of_birth: "1990-01-01", time_of_birth: "12:00", place_of_birth: "Mumbai" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: false } as never);
    const res = await POST(makeReq({ name: "A", date_of_birth: "1990-01-01", time_of_birth: "12:00", place_of_birth: "Mumbai" }));
    expect(res.status).toBe(429);
  });

  it("returns 403 when at 10-profile cap", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.profiles.count).mockResolvedValue(10 as never);
    const res = await POST(makeReq({ name: "A", date_of_birth: "1990-01-01", time_of_birth: "12:00", place_of_birth: "Mumbai" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/maximum limit/i);
  });

  it("returns 400 when required fields are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.profiles.count).mockResolvedValue(0 as never);
    const res = await POST(makeReq({ name: "A" })); // missing date_of_birth etc.
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "All fields required" });
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.profiles.count).mockResolvedValue(0 as never);
    const res = await POST(makeReq({
      name: "A".repeat(101),
      date_of_birth: "1990-01-01",
      time_of_birth: "12:00",
      place_of_birth: "Mumbai",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 201 with created profile on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.profiles.count).mockResolvedValue(2 as never);
    vi.mocked(geocodePlace).mockResolvedValue(mockGeo as never);
    vi.mocked(db.profiles.create).mockResolvedValue(mockProfile as never);

    const res = await POST(makeReq({
      name: "Test User",
      date_of_birth: "1990-01-01",
      time_of_birth: "12:00",
      place_of_birth: "Mumbai",
    }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe("Test User");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(geocodePlace).toHaveBeenCalledWith("Mumbai", {
      authenticatedUserId: "user-1",
    });
  });

  it("returns 400 when geocoding fails", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.profiles.count).mockResolvedValue(0 as never);
    vi.mocked(geocodePlace).mockRejectedValue(new Error("Place not found") as never);

    const res = await POST(makeReq({
      name: "Test User",
      date_of_birth: "1990-01-01",
      time_of_birth: "12:00",
      place_of_birth: "XYZXYZ",
    }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Place not found" });
  });
});
