// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Profile } from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mocks.replace,
  }),
}));

vi.mock("posthog-js", () => ({
  default: { capture: vi.fn() },
}));

vi.mock("@/components/NavBar", () => ({
  NavBar: ({
    onProfileChange,
  }: {
    onProfileChange: (profileId: string) => void;
  }) => (
    <button type="button" onClick={() => onProfileChange("profile-2")}>
      Switch profile
    </button>
  ),
}));

vi.mock("@/components/profiles/ProfileView", () => ({
  ProfileView: ({ profile }: { profile: Profile }) => <p>Active profile: {profile.name}</p>,
}));

vi.mock("@/components/profiles/ProfileCreateExperience", () => ({
  ProfileCreateExperience: () => <p>Create profile</p>,
}));

vi.mock("@/components/ProfileLoadingScreen", () => ({
  ProfileLoadingScreen: () => null,
}));

vi.mock("@/components/panels/AskPanel", () => ({
  AskPanel: () => null,
}));

vi.mock("@/components/panels/AIAdminPanel", () => ({
  AIAdminPanel: () => null,
}));

function profile(id: string, name: string): Profile {
  return {
    id,
    user_id: "user-1",
    name,
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

describe("DashboardClient profile navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(
      {},
      "",
      "/dashboard?profile=profile-1&compare=check-1&new=1",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("synchronizes a profile switch to the URL and clears stale flow parameters", async () => {
    const user = userEvent.setup();
    render(
      <DashboardClient
        profiles={[
          profile("profile-1", "Aruna"),
          profile("profile-2", "Mitra"),
        ]}
        initialProfileId="profile-1"
        appSettings={{
          writtenEnabled: true,
          liveEnabled: false,
          writtenFeePaise: 120000,
          liveFeePaise: 500000,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Switch profile" }));

    expect(screen.getByText("Active profile: Mitra")).toBeInTheDocument();
    expect(mocks.replace).toHaveBeenCalledWith(
      "/dashboard?profile=profile-2",
      { scroll: false },
    );
  });
});
