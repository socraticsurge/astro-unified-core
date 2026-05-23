import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Mock dependencies
vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

// We need to mock the auth file so its export does not fail
vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (s: { user?: { id?: string } } | null) => s?.user?.id ?? "",
}));

vi.mock("@/lib/db", () => ({
  db: {
    profiles: {
      get: vi.fn(),
      getAny: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(),
}));

describe("GET /api/profiles/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when profile is not found", async () => {
    // Setup mocks
    const mockSession = { user: { id: "user-123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(isAdmin).mockReturnValue(false);
    vi.mocked(db.profiles.get).mockResolvedValue(undefined);

    // Create a mock request
    const req = new NextRequest("http://localhost:3000/api/profiles/profile-456");

    // Call the handler
    const response = await GET(req, { params: Promise.resolve({ id: "profile-456" }) });

    // Assertions
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({ error: "Not found" });

    // Verify mocks were called correctly
    expect(getServerSession).toHaveBeenCalled();
    expect(isAdmin).toHaveBeenCalledWith(mockSession);
    expect(db.profiles.get).toHaveBeenCalledWith("profile-456", "user-123");
  });

  it("returns 404 when profile is not found for admin", async () => {
    // Setup mocks
    const mockSession = { user: { id: "user-123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.profiles.getAny).mockResolvedValue(undefined);

    // Create a mock request
    const req = new NextRequest("http://localhost:3000/api/profiles/profile-456");

    // Call the handler
    const response = await GET(req, { params: Promise.resolve({ id: "profile-456" }) });

    // Assertions
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toEqual({ error: "Not found" });

    // Verify mocks were called correctly
    expect(getServerSession).toHaveBeenCalled();
    expect(isAdmin).toHaveBeenCalledWith(mockSession);
    expect(db.profiles.getAny).toHaveBeenCalledWith("profile-456");
  });

  it("returns 401 when unauthorized", async () => {
    // Setup mocks
    vi.mocked(getServerSession).mockResolvedValue(null);

    // Create a mock request
    const req = new NextRequest("http://localhost:3000/api/profiles/profile-456");

    // Call the handler
    const response = await GET(req, { params: Promise.resolve({ id: "profile-456" }) });

    // Assertions
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 when profile is found", async () => {
    // Setup mocks
    const mockSession = { user: { id: "user-123" } };
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(isAdmin).mockReturnValue(false);

    const mockProfile = { id: "profile-456", name: "Test User" };
    vi.mocked(db.profiles.get).mockResolvedValue(mockProfile);

    // Create a mock request
    const req = new NextRequest("http://localhost:3000/api/profiles/profile-456");

    // Call the handler
    const response = await GET(req, { params: Promise.resolve({ id: "profile-456" }) });

    // Assertions
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual(mockProfile);

    // Verify mocks were called correctly
    expect(getServerSession).toHaveBeenCalled();
    expect(isAdmin).toHaveBeenCalledWith(mockSession);
    expect(db.profiles.get).toHaveBeenCalledWith("profile-456", "user-123");
  });
});
