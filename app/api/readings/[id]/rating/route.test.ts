import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "",
}));
vi.mock("@/lib/admin", () => ({ isAdmin: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    readings: { getById: vi.fn(), rate: vi.fn() },
    profiles: { get: vi.fn() },
  },
}));

import { PATCH } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

const session = { user: { id: "user-1" } };

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/readings/r1/rating", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: "r1" });

describe("PATCH /api/readings/[id]/rating", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await PATCH(makeReq({ rating: 1 }), { params });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid rating", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    const res = await PATCH(makeReq({ rating: 7 }), { params });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the reading does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(db.readings.getById).mockResolvedValue(undefined as never);
    const res = await PATCH(makeReq({ rating: 1 }), { params });
    expect(res.status).toBe(404);
  });

  it("returns 404 when the reading belongs to another user (non-admin)", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.readings.getById).mockResolvedValue({ id: "r1", profile_id: "p-other" } as never);
    vi.mocked(db.profiles.get).mockResolvedValue(undefined as never);
    const res = await PATCH(makeReq({ rating: 1 }), { params });
    expect(res.status).toBe(404);
    expect(db.readings.rate).not.toHaveBeenCalled();
  });

  it("rates the reading when the user owns the profile", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.readings.getById).mockResolvedValue({ id: "r1", profile_id: "p-own" } as never);
    vi.mocked(db.profiles.get).mockResolvedValue({ id: "p-own", user_id: "user-1" } as never);
    const res = await PATCH(makeReq({ rating: -1 }), { params });
    expect(res.status).toBe(200);
    expect(db.readings.rate).toHaveBeenCalledWith("r1", -1);
  });

  it("admins can rate any reading regardless of ownership", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.readings.getById).mockResolvedValue({ id: "r1", profile_id: "p-other" } as never);
    const res = await PATCH(makeReq({ rating: null }), { params });
    expect(res.status).toBe(200);
    expect(db.profiles.get).not.toHaveBeenCalled();
    expect(db.readings.rate).toHaveBeenCalledWith("r1", null);
  });

  // Negative-case: DB error → not a 500 to the user.
  it("does not 500 when db.readings.getById throws", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(db.readings.getById).mockRejectedValue(new Error("libsql blip"));
    const res = await PATCH(makeReq({ rating: 1 }), { params });
    expect(res.status).not.toBe(500);
  });
});
