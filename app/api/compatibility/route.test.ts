import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { GET, POST } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "",
}));

vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    compatibility: {
      list: vi.fn(),
      save: vi.fn(),
    },
    profiles: {
      get: vi.fn(),
    },
  },
}));

const session = (id: string) => ({ user: { id } }) as never;

const makePostRequest = (body: Record<string, unknown>) =>
  ({ json: vi.fn().mockResolvedValue(body) }) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rateLimit).mockReturnValue({ success: true } as never);
});

describe("GET /api/compatibility", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(db.compatibility.list).not.toHaveBeenCalled();
  });

  it("scopes the list by userId", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session("userA"));
    vi.mocked(db.compatibility.list).mockResolvedValue([]);
    await GET();
    expect(db.compatibility.list).toHaveBeenCalledWith("userA");
  });
});

describe("POST /api/compatibility", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makePostRequest({ profile_id_1: "a", profile_id_2: "b" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session("userA"));
    vi.mocked(rateLimit).mockReturnValue({ success: false } as never);
    const res = await POST(makePostRequest({ profile_id_1: "a", profile_id_2: "b" }));
    expect(res.status).toBe(429);
  });

  it("uses the caller's userId in the rate-limit key", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session("userA"));
    vi.mocked(db.compatibility.list).mockResolvedValue([]);
    vi.mocked(db.profiles.get).mockResolvedValue(null);
    await POST(makePostRequest({ profile_id_1: "a", profile_id_2: "b" }));
    expect(rateLimit).toHaveBeenCalledWith("compat:userA", 10, 60_000);
  });

  it("returns 400 when either profile_id is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session("userA"));
    const res = await POST(makePostRequest({ profile_id_1: "a" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when one of the profiles is not owned by the user", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session("userA"));
    vi.mocked(db.compatibility.list).mockResolvedValue([]);
    vi.mocked(db.profiles.get)
      .mockResolvedValueOnce({ id: "a" } as never) // p1 owned
      .mockResolvedValueOnce(null); // p2 not owned
    const res = await POST(makePostRequest({ profile_id_1: "a", profile_id_2: "stolen" }));
    expect(res.status).toBe(404);
    expect(db.profiles.get).toHaveBeenCalledWith("a", "userA");
    expect(db.profiles.get).toHaveBeenCalledWith("stolen", "userA");
  });

  it("returns the existing check when a duplicate (either order) already exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(session("userA"));
    const existing = {
      id: "existing",
      user_id: "userA",
      profile_id_1: "b",
      profile_id_2: "a", // reversed order
    } as never;
    vi.mocked(db.compatibility.list).mockResolvedValue([existing]);
    vi.mocked(db.profiles.get)
      .mockResolvedValueOnce({ id: "a" } as never)
      .mockResolvedValueOnce({ id: "b" } as never);

    const res = await POST(makePostRequest({ profile_id_1: "a", profile_id_2: "b" }));
    const body = await res.json();
    expect(body.id).toBe("existing");
    expect(db.compatibility.save).not.toHaveBeenCalled();
  });
});
