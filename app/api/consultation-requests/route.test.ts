import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/consultation", () => ({ MIN_FIELD_LENGTH: 30 }));
vi.mock("@/lib/db", () => ({
  db: {
    consultationRequests: {
      listByUser: vi.fn(),
      getPending: vi.fn(),
      create: vi.fn(),
    },
    profiles: {
      get: vi.fn(),
      getAny: vi.fn(),
    },
    consultationSlots: {
      getById: vi.fn(),
      book: vi.fn(),
      unbook: vi.fn(),
    },
    settings: {
      getAll: vi.fn(),
    },
  },
}));

import { GET, POST } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/admin";

const session = { user: { id: "user-1" } };
const profile = {
  id: "prof-1", user_id: "user-1", name: "Test",
  date_of_birth: "1990-01-01", time_of_birth: "12:00", place_of_birth: "Mumbai",
  latitude: 19, longitude: 72, timezone: "Asia/Kolkata", timezone_offset: 5.5,
  created_at: "2026-01-01T00:00:00Z",
};

// All text fields are > 30 characters (MIN_FIELD_LENGTH)
const validBody = {
  profile_ids: ["prof-1"],
  life_area: "Career",
  observation: "I have been experiencing challenges in my career for the past several months",
  constraint_text: "I am unable to change jobs due to financial constraints and family responsibilities",
  objective: "I want to understand what period I am in astrologically and when things improve",
  options: "Option A is to wait patiently, Option B is to start a small side business now",
  delivery_mode: "written",
};

describe("GET /api/consultation-requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with request list and Cache-Control header", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(db.consultationRequests.listByUser).mockResolvedValue([] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(db.consultationRequests.listByUser).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/consultation-requests", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReq = (body: object) =>
    new NextRequest("http://localhost/api/consultation-requests", {
      method: "POST",
      body: JSON.stringify(body),
    });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: false } as never);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(429);
  });

  it("returns 409 when user already has a pending request", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue({ id: "req-existing" } as never);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);

    const res = await POST(makeReq({ profile_ids: ["prof-1"], life_area: "Career" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "All fields are required" });
  });

  it("returns 400 when text fields are below minimum length", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);

    const res = await POST(makeReq({ ...validBody, observation: "Too short" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Each field must be at least 30 characters" });
  });

  it("returns 400 for invalid delivery_mode", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);

    const res = await POST(makeReq({ ...validBody, delivery_mode: "telepathy" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid delivery mode" });
  });

  it("returns 400 when appointment mode has no slot_id", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);

    const res = await POST(makeReq({ ...validBody, delivery_mode: "appointment" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "A slot selection is required for live consultation" });
  });

  it("returns 404 when profile is not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);
    vi.mocked(db.profiles.get).mockResolvedValue(null as never);

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "One or more profiles not found" });
  });

  it("returns 201 with created request on success (written mode)", async () => {
    const created = {
      id: "req-1", user_id: "user-1", status: "pending_payment",
      delivery_mode: "written", created_at: "2026-01-01T00:00:00Z",
    };
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(db.settings.getAll).mockResolvedValue({ written_fee_paise: 50000, live_fee_paise: 200000 } as never);
    vi.mocked(db.consultationRequests.create).mockResolvedValue(created as never);

    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const data = await res.json();
    expect(data.id).toBe("req-1");
  });

  it("returns 409 when appointment slot is already booked", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.consultationRequests.getPending).mockResolvedValue(undefined as never);
    vi.mocked(db.profiles.get).mockResolvedValue(profile as never);
    vi.mocked(db.consultationSlots.getById).mockResolvedValue({
      id: "slot-1", starts_at: "2026-06-01T10:00:00Z", is_booked: 1,
    } as never);

    const res = await POST(makeReq({ ...validBody, delivery_mode: "appointment", slot_id: "slot-1" }));
    expect(res.status).toBe(409);
  });
});
