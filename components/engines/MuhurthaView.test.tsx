// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/lib/db";
import { MuhurthaView } from "./MuhurthaView";

const profiles: Profile[] = [
  {
    id: "vinay",
    user_id: "owner",
    name: "Vinay",
    date_of_birth: "1984-10-08",
    time_of_birth: "14:50",
    place_of_birth: "Hyderabad",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    relationship: "Self",
    gender: "male",
    current_location: "Hyderabad",
    current_latitude: 17.385,
    current_longitude: 78.4867,
    current_timezone: "Asia/Kolkata",
    current_timezone_offset: 5.5,
    created_at: "2026-07-22T00:00:00.000Z",
  },
  {
    id: "tara",
    user_id: "owner",
    name: "Tara",
    date_of_birth: "1990-01-01",
    time_of_birth: "08:00",
    place_of_birth: "Hyderabad",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    relationship: "Family",
    gender: "female",
    current_location: "Hyderabad",
    current_latitude: 17.385,
    current_longitude: 78.4867,
    current_timezone: "Asia/Kolkata",
    current_timezone_offset: 5.5,
    created_at: "2026-07-22T00:00:00.000Z",
  },
];

const slot = {
  date: "2026-07-29",
  vaaram: "Budhavaram",
  start: "09:10",
  end: "10:04",
  score: 91,
  tier: "Excellent",
  reasons: ["Shubha window", "Strong day"],
  reason_groups: {
    slot_quality: ["Clear of restricted periods"],
    day_quality: ["Supportive Tithi"],
    group_fit: ["Tarabalam supports all participants"],
    activity_match: ["Wedding rule profile passed"],
    notes: ["Complete election chart remains a manual check"],
  },
  day_dosha: null,
  personal_dosha: null,
};

function response(mode: "general" | "personal") {
  return {
    ok: true,
    json: async () => ({
      validation_mode: mode,
      data: {
        slots: [slot],
        dropped_days: [{ date: "2026-07-28", reason: "Hard filter" }],
        disclaimer: "Computed electional shortlist.",
      },
      evidence: {
        evaluated_factors: mode === "personal"
          ? ["panchangam", "activity_rules", "tarabalam", "chandrabalam"]
          : ["panchangam", "activity_rules", "avoid_windows"],
        not_evaluated: ["full_election_chart"],
      },
      warnings: [],
    }),
  };
}

function moveToValidationStep() {
  fireEvent.click(screen.getByRole("button", { name: /Choose dates/i }));
  fireEvent.click(screen.getAllByRole("button", { name: /Choose validation/i }).at(-1)!);
}

describe("MuhurthaView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { validation_mode: "general" | "personal" };
      return response(body.validation_mode);
    }));
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with the complete occasion catalogue and explains the real range limit", () => {
    render(<MuhurthaView profileId="vinay" profiles={profiles} />);

    expect(screen.getByRole("heading", {
      name: "Find the general window first. Then make it personal.",
    })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Travel / journey" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bhumi Puja" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Choose dates/i }));
    expect(screen.getByText(/evaluates 1–14 inclusive days per search/i))
      .toBeInTheDocument();
    expect(screen.getByText("Hyderabad")).toBeInTheDocument();
  });

  it("offers general timings before optional profile validation", () => {
    render(<MuhurthaView profileId="vinay" profiles={profiles} />);
    moveToValidationStep();

    expect(screen.getByRole("heading", { name: "Show the public baseline" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show general timings" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate for 1 profile" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Profiles for Muhurtam validation"))
      .toHaveTextContent("Vinay · active");
  });

  it("requests a participant-free general baseline and renders its evidence", async () => {
    render(<MuhurthaView profileId="vinay" profiles={profiles} />);
    moveToValidationStep();

    fireEvent.click(screen.getByRole("button", { name: "Show general timings" }));

    expect(await screen.findByRole("heading", { name: "Best general timings" }))
      .toBeInTheDocument();
    expect(screen.getByText("No birth-chart factors were used")).toBeInTheDocument();
    expect(screen.getByText("09:10–10:04")).toBeInTheDocument();
    expect(screen.getByText(/1 day was excluded/i)).toBeInTheDocument();
    expect(screen.getByText("Calculation method and limits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate these timings" }))
      .toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/readings/muhurtam",
        expect.objectContaining({
          body: expect.stringContaining('"validation_mode":"general"'),
        }),
      );
    });
    const body = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    ) as { profile_ids: string[] };
    expect(body.profile_ids).toEqual(["vinay"]);
  });

  it("adds selected profiles only on the personal-validation path", async () => {
    render(<MuhurthaView profileId="vinay" profiles={profiles} />);
    moveToValidationStep();

    const profilePicker = screen.getByLabelText("Profiles for Muhurtam validation");
    fireEvent.click(within(profilePicker).getByRole("button", { name: "Tara" }));
    fireEvent.click(screen.getByRole("button", { name: "Validate for 2 profiles" }));

    expect(await screen.findByRole("heading", {
      name: "Best profile-validated timings",
    })).toBeInTheDocument();
    expect(screen.getByText(/2 saved profiles informed this ranking/i))
      .toBeInTheDocument();

    const body = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    ) as { profile_ids: string[]; validation_mode: string };
    expect(body.profile_ids).toEqual(["vinay", "tara"]);
    expect(body.validation_mode).toBe("personal");
  });
});
