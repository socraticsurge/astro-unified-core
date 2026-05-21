import { vi, describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { DELETE } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "",
}));

vi.mock("@/lib/db", () => ({
  db: {
    compatibility: {
      get: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/compatibility/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await DELETE({} as NextRequest, params("check1"));
    expect(res.status).toBe(401);
    expect(db.compatibility.get).not.toHaveBeenCalled();
    expect(db.compatibility.delete).not.toHaveBeenCalled();
  });

  it("scopes the get() lookup by the caller's userId (cannot read another user's check)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "userA" } } as never);
    vi.mocked(db.compatibility.get).mockResolvedValue(null);
    const res = await DELETE({} as NextRequest, params("check-owned-by-userB"));
    expect(db.compatibility.get).toHaveBeenCalledWith("check-owned-by-userB", "userA");
    expect(res.status).toBe(404);
  });

  it("does not call delete() when the check is not owned by the caller", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "userA" } } as never);
    vi.mocked(db.compatibility.get).mockResolvedValue(null);
    await DELETE({} as NextRequest, params("foreign-check"));
    expect(db.compatibility.delete).not.toHaveBeenCalled();
  });

  it("deletes scoped by userId and returns 204 on success", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "userA" } } as never);
    vi.mocked(db.compatibility.get).mockResolvedValue({
      id: "check1",
      user_id: "userA",
    } as never);
    const res = await DELETE({} as NextRequest, params("check1"));
    expect(db.compatibility.delete).toHaveBeenCalledWith("check1", "userA");
    expect(res.status).toBe(204);
  });
});
