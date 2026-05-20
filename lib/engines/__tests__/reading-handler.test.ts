import { vi, describe, it, expect, beforeEach } from "vitest";
import { resolveProfile } from "../reading-handler";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

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
      get: vi.fn(),
      getAny: vi.fn(),
    },
  },
}));

const completeProfile = {
  id: "prof1",
  user_id: "user1",
  name: "Vinay",
  date_of_birth: "1990-01-15",
  time_of_birth: "10:30",
  latitude: 12.97,
  longitude: 77.59,
  timezone: "Asia/Kolkata",
};

const sessionFor = (id: string) => ({ user: { id } }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isAdmin).mockReturnValue(false);
});

describe("resolveProfile", () => {
  it("returns 401 when session is null", async () => {
    const r = await resolveProfile("prof1", null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("returns 401 when session.user is missing", async () => {
    const r = await resolveProfile("prof1", {} as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(401);
  });

  it("returns 400 when profile_id is missing", async () => {
    const r = await resolveProfile(null, sessionFor("user1"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("returns 400 when profile_id is empty string", async () => {
    const r = await resolveProfile("", sessionFor("user1"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("scopes lookup by userId for non-admins", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue(completeProfile);
    const r = await resolveProfile("prof1", sessionFor("user1"));
    expect(db.profiles.get).toHaveBeenCalledWith("prof1", "user1");
    expect(db.profiles.getAny).not.toHaveBeenCalled();
    expect(r.ok).toBe(true);
  });

  it("uses getAny() for admins (no userId scoping)", async () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(db.profiles.getAny).mockResolvedValue(completeProfile);
    const r = await resolveProfile("prof1", sessionFor("admin1"));
    expect(db.profiles.getAny).toHaveBeenCalledWith("prof1");
    expect(db.profiles.get).not.toHaveBeenCalled();
    expect(r.ok).toBe(true);
  });

  it("returns 404 when profile is not found", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue(null);
    const r = await resolveProfile("prof1", sessionFor("user1"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(404);
  });

  it("returns 400 when profile is missing date_of_birth", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue({ ...completeProfile, date_of_birth: null });
    const r = await resolveProfile("prof1", sessionFor("user1"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("returns 400 when profile latitude is null", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue({ ...completeProfile, latitude: null });
    const r = await resolveProfile("prof1", sessionFor("user1"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("returns 400 when timezone is empty string", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue({ ...completeProfile, timezone: "" });
    const r = await resolveProfile("prof1", sessionFor("user1"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.response.status).toBe(400);
  });

  it("returns the BirthInput payload on success", async () => {
    vi.mocked(db.profiles.get).mockResolvedValue(completeProfile);
    const r = await resolveProfile("prof1", sessionFor("user1"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.profile_id).toBe("prof1");
      expect(r.userId).toBe("user1");
      expect(r.profile).toBe(completeProfile);
      expect(r.input).toEqual({
        date_of_birth: "1990-01-15",
        time_of_birth: "10:30",
        latitude: 12.97,
        longitude: 77.59,
        timezone: "Asia/Kolkata",
      });
    }
  });
});
