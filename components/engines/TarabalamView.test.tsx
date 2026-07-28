// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Profile } from "@/lib/db";
import { TarabalamView } from "./TarabalamView";

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

function serviceResponse(dayCount = 2, requestedIds = ["vinay"]) {
  const requestedProfiles = profiles.filter((profile) => requestedIds.includes(profile.id));
  return {
    ok: true,
    json: async () => ({
      profile_labels: requestedProfiles.map((profile, index) => ({
        label: `p${index + 1}`,
        id: profile.id,
        name: profile.name,
      })),
      data: {
        janma_nakshatras: requestedProfiles.map((profile) =>
          profile.id === "vinay" ? "Uttara Bhadrapada" : "Purva Ashadha"
        ),
        city: "Hyderabad",
        tara_convention: "Supportive Taras are 2, 4, 6, 8 and 9.",
        chandra_convention: "Moon positions are evaluated by the selected policy.",
        days: Array.from({ length: dayCount }, (_, index) => ({
          date: `2026-08-${String(index + 1).padStart(2, "0")}`,
          vaaram: index === 0 ? "Shanivaram" : "Adivaram",
          nakshatra: index === 0 ? "Revati" : "Ashvini",
          nakshatra_until: index === 0 ? "14:28" : "16:05",
          tithi: index === 0 ? "Krishna Tritiya" : "Krishna Chaturthi",
          good_for_all: index === 1,
          taras: [
            {
              tara: 2,
              name: "Sampat",
              auspicious: true,
              chandra: {
                position: index === 0 ? 8 : 10,
                verdict: index === 0 ? "bad" : "good",
              },
            },
            {
              tara: index === 0 ? 3 : 9,
              name: index === 0 ? "Vipat" : "Parama Mitra",
              auspicious: index !== 0,
              chandra: {
                position: index === 0 ? 5 : 6,
                verdict: index === 0 ? "puja" : "good",
              },
            },
          ].slice(0, requestedProfiles.length),
        })),
      },
      evidence: {
        evaluated_factors: ["tarabalam", "chandrabalam"],
        not_evaluated: ["natal_chart", "dasha", "activity_specific_muhurta"],
      },
      warnings: [
        "Tarabalam day comparison currently uses the canonical Lahiri tool path.",
      ],
    }),
  };
}

describe("TarabalamView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as { profile_ids: string[] };
      return serviceResponse(2, payload.profile_ids);
    }));
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains the exact engine, keeps the current profile included, and exposes useful ranges", () => {
    render(<TarabalamView profileId="vinay" profiles={profiles} />);

    expect(screen.getByRole("heading", {
      name: "Find the days that support everyone involved.",
    })).toBeInTheDocument();
    expect(screen.getByText("Exact Drik calculation")).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: /Vinay, current profile, included/i,
    }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: "90 days" })).toBeInTheDocument();
    expect(screen.getByText(/supports 1–90 inclusive days/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Classic Tarabalam/i }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("submits the current profile with the classic policy", async () => {
    render(<TarabalamView profileId="vinay" profiles={profiles} />);

    fireEvent.click(screen.getByRole("button", { name: "Find supportive days" }));

    expect(await screen.findByRole("heading", {
      name: "1 day supports everyone",
    })).toBeInTheDocument();
    expect(screen.getByText("Exact daily Moon positions, private profile context."))
      .toBeInTheDocument();
    expect(screen.queryByText(/canonical Lahiri tool path/i))
      .not.toBeInTheDocument();
    expect(screen.getByRole("table", {
      name: /Tarabalam and Chandrabalam comparison/i,
    })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Vinay/i })).toBeInTheDocument();
    expect(screen.getByText("Revati until 14:28")).toBeInTheDocument();
    expect(screen.getByText("House 8 · Moon caution")).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/readings/tarabalam",
        expect.objectContaining({
          body: expect.stringContaining('"chandra_mode":"stars"'),
        }),
      );
    });
    const payload = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    ) as { profile_ids: string[] };
    expect(payload.profile_ids).toEqual(["vinay"]);
  });

  it("adds another saved profile and lets the canonical engine apply strict Chandrabalam", async () => {
    render(<TarabalamView profileId="vinay" profiles={profiles} />);

    fireEvent.click(screen.getByRole("button", { name: /Tara, Family/i }));
    fireEvent.click(screen.getByRole("button", { name: /Strict Moon support/i }));
    fireEvent.click(screen.getByRole("button", { name: "Find supportive days" }));

    const profilesCompared = (await screen.findByText("Profiles compared")).parentElement;
    expect(profilesCompared).not.toBeNull();
    expect(within(profilesCompared!).getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("Vipat")).toHaveLength(2);
    expect(screen.getAllByText("Parama Mitra")).toHaveLength(2);

    const payload = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0][1]?.body),
    ) as { profile_ids: string[]; chandra_mode: string };
    expect(payload.profile_ids).toEqual(["vinay", "tara"]);
    expect(payload.chandra_mode).toBe("strict");
  });

  it("keeps long searches bounded and makes truncation explicit", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body)) as { profile_ids: string[] };
      return serviceResponse(15, payload.profile_ids);
    }));
    render(<TarabalamView profileId="vinay" profiles={profiles} />);

    fireEvent.click(screen.getByRole("button", { name: "30 days" }));
    fireEvent.click(screen.getByRole("button", { name: "Find supportive days" }));

    expect(await screen.findByText("Showing 14 of 15 calculated days."))
      .toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Show all 15 calculated days",
    }));
    expect(screen.getByText("Showing 15 of 15 calculated days."))
      .toBeInTheDocument();
  });
});
