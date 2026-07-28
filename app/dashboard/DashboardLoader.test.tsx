import type { Session } from "next-auth";
import type { CompatibilityCheck, Profile } from "@/lib/db";
import { DashboardLoader } from "./DashboardLoader";

const mocks = vi.hoisted(() => ({
  profileList: vi.fn(),
  profileGetAny: vi.fn(),
  userGetById: vi.fn(),
  settingsGetAll: vi.fn(),
  compatibilityGetAny: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getUserId: () => "admin-user",
}));

vi.mock("@/lib/admin", () => ({
  isAdmin: () => true,
}));

vi.mock("@/lib/db", () => ({
  db: {
    profiles: {
      list: mocks.profileList,
      getAny: mocks.profileGetAny,
    },
    users: {
      getById: mocks.userGetById,
    },
    settings: {
      getAll: mocks.settingsGetAll,
    },
    compatibility: {
      getAny: mocks.compatibilityGetAny,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

const session = {
  user: { id: "admin-user", email: "admin@example.com" },
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

function profile(id: string, userId = "admin-user"): Profile {
  return {
    id,
    user_id: userId,
    name: id,
    date_of_birth: "1990-01-01",
    time_of_birth: "10:00",
    place_of_birth: "Hyderabad, India",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    relationship: "Self",
    gender: "female",
    current_location: "Hyderabad, India",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function compatibility(
  id: string,
  profileId1: string,
  profileId2: string,
): CompatibilityCheck {
  return {
    id,
    user_id: "admin-user",
    profile_id_1: profileId1,
    profile_id_2: profileId2,
    score: 28,
    result_json: "{}",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("DashboardLoader admin compatibility deep links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settingsGetAll.mockResolvedValue({
      written_consultation_enabled: true,
      live_consultation_enabled: false,
      written_fee_paise: 120000,
      live_fee_paise: 500000,
    });
  });

  it("hydrates a saved comparison for the administrator's own profiles", async () => {
    const profiles = [profile("vinay"), profile("tara")];
    const check = compatibility("check-1", "vinay", "tara");
    mocks.profileList.mockResolvedValue(profiles);
    mocks.compatibilityGetAny.mockResolvedValue(check);

    const element = await DashboardLoader({
      session,
      searchParams: { profile: "vinay", compare: "check-1" },
    });

    expect(mocks.compatibilityGetAny).toHaveBeenCalledWith("check-1");
    expect(element.props.initialProfileId).toBe("vinay");
    expect(element.props.initialCompareCheck).toEqual(check);
    expect(element.key).toContain("check-1");
  });

  it("does not hydrate a comparison outside the resolved account context", async () => {
    const profiles = [profile("vinay"), profile("tara")];
    mocks.profileList.mockResolvedValue(profiles);
    mocks.compatibilityGetAny.mockResolvedValue(
      compatibility("check-other", "vinay", "outside-profile"),
    );

    const element = await DashboardLoader({
      session,
      searchParams: { profile: "vinay", compare: "check-other" },
    });

    expect(element.props.initialCompareCheck).toBeUndefined();
  });
});
