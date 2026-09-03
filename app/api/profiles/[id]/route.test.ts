import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT } from "./route";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

// Mock dependencies
vi.mock("server-only", () => ({}));
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
      update: vi.fn(),
    },
    readings: { deleteByProfile: vi.fn() },
    compatibility: { deleteByProfile: vi.fn() },
  },
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: vi.fn(),
}));
vi.mock("@/lib/geocode", () => ({ geocodePlace: vi.fn() }));
vi.mock("@/lib/posthog-server", () => ({
  getPostHogClient: () => ({ capture: vi.fn() }),
}));

import { geocodePlace } from "@/lib/geocode";

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

describe("PUT /api/profiles/[id]", () => {
  const existingProfile = {
    id: "profile-456",
    user_id: "user-123",
    name: "Test User",
    date_of_birth: "1990-01-01",
    time_of_birth: "12:00",
    place_of_birth: "Mumbai",
    latitude: 19.076,
    longitude: 72.877,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    current_location: null,
    current_latitude: null,
    current_longitude: null,
    current_timezone: null,
    current_timezone_offset: null,
    gender: null,
    relationship: "self",
  };

  const request = (body: object) => new NextRequest(
    "http://localhost:3000/api/profiles/profile-456",
    { method: "PUT", body: JSON.stringify(body) },
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-123" } });
  });

  it("preserves birth-place and optional current-location geocoding on edit", async () => {
    const updated = {
      ...existingProfile,
      place_of_birth: "Hyderabad",
      latitude: 17.385,
      longitude: 78.4867,
      current_location: "London",
      current_latitude: 51.5072,
      current_longitude: -0.1276,
      current_timezone: "Europe/London",
      current_timezone_offset: 1,
    };
    vi.mocked(db.profiles.get)
      .mockResolvedValueOnce(existingProfile)
      .mockResolvedValueOnce(updated);
    vi.mocked(geocodePlace)
      .mockResolvedValueOnce({
        latitude: 17.385,
        longitude: 78.4867,
        timezone: "Asia/Kolkata",
        timezone_offset: 5.5,
        display_name: "Hyderabad, India",
      })
      .mockResolvedValueOnce({
        latitude: 51.5072,
        longitude: -0.1276,
        timezone: "Europe/London",
        timezone_offset: 1,
        display_name: "London, United Kingdom",
      });

    const response = await PUT(request({
      name: "Test User",
      date_of_birth: "1990-01-01",
      time_of_birth: "12:00",
      place_of_birth: "Hyderabad",
      current_location: "London",
      relationship: "self",
    }), { params: Promise.resolve({ id: "profile-456" }) });

    expect(response.status).toBe(200);
    expect(geocodePlace).toHaveBeenNthCalledWith(1, "Hyderabad", {
      authenticatedUserId: "user-123",
    });
    expect(geocodePlace).toHaveBeenNthCalledWith(2, "London", {
      authenticatedUserId: "user-123",
    });
    expect(db.profiles.update).toHaveBeenCalledWith(
      "profile-456",
      "user-123",
      expect.objectContaining({
        place_of_birth: "Hyderabad",
        latitude: 17.385,
        current_location: "London",
        current_timezone: "Europe/London",
      }),
    );
    expect(db.readings.deleteByProfile).toHaveBeenCalledWith("profile-456");
    expect(db.compatibility.deleteByProfile).toHaveBeenCalledWith("profile-456");
    expect(await response.json()).toEqual(updated);
  });

  it("returns a bounded client error when managed-provider geocoding fails", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue(existingProfile);
    vi.mocked(geocodePlace).mockRejectedValue(
      new Error("Geocoder configuration unavailable"),
    );

    const response = await PUT(request({
      ...existingProfile,
      place_of_birth: "Changed place",
    }), { params: Promise.resolve({ id: "profile-456" }) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Geocoder configuration unavailable",
    });
    expect(db.profiles.update).not.toHaveBeenCalled();
  });

  it("rejects a missing birth place before invoking the provider", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue(existingProfile);
    const response = await PUT(request({
      ...existingProfile,
      place_of_birth: "",
    }), { params: Promise.resolve({ id: "profile-456" }) });

    expect(response.status).toBe(400);
    expect(geocodePlace).not.toHaveBeenCalled();
    expect(db.profiles.update).not.toHaveBeenCalled();
  });
});
