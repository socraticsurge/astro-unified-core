import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    profiles: { getMany: vi.fn() },
    readings: {
      latestByEngineMany: vi.fn(),
      save: vi.fn(),
    },
  },
}));
vi.mock("@/lib/engines/dashaflow", () => ({ fetchDashaflow: vi.fn() }));

import { db, type Profile } from "@/lib/db";
import { fetchDashaflow } from "@/lib/engines/dashaflow";
import {
  PersonalTimingError,
  prepareOwnedLocation,
  prepareOwnedParticipants,
} from "./personal-timing";

function profile(id: string, userId = "owner"): Profile {
  return {
    id,
    user_id: userId,
    name: id,
    date_of_birth: "1990-04-12",
    time_of_birth: "08:15",
    place_of_birth: "Hyderabad, India",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    relationship: "Self",
    gender: "female",
    current_location: "Hyderabad, India",
    current_latitude: 17.385,
    current_longitude: 78.4867,
    current_timezone: "Asia/Kolkata",
    current_timezone_offset: 5.5,
    created_at: "2026-07-22T00:00:00.000Z",
  };
}

function reading(profileId: string, moon = "Ashwini") {
  return {
    id: `reading-${profileId}`,
    profile_id: profileId,
    engine: "dashaflow",
    input_snapshot: JSON.stringify({
      date_of_birth: "1990-04-12",
      time_of_birth: "08:15",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    }),
    output_data: JSON.stringify({
      data: {
        planets: { Moon: { sign: "Aries", nakshatra: moon } },
        lagna: { sign: "Cancer" },
      },
    }),
    created_at: "2026-07-22T00:00:00.000Z",
  };
}

describe("prepareOwnedParticipants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a mixed owner/cross-user ID list instead of silently dropping it", async () => {
    vi.mocked(db.profiles.getMany).mockResolvedValue([profile("owned")]);

    await expect(
      prepareOwnedParticipants(["owned", "cross-user"], "owner"),
    ).rejects.toMatchObject<Partial<PersonalTimingError>>({
      status: 404,
      code: "profile_not_found",
    });
    expect(db.readings.latestByEngineMany).not.toHaveBeenCalled();
    expect(fetchDashaflow).not.toHaveBeenCalled();
  });

  it("loads an owned current location without calculating a birth chart", async () => {
    vi.mocked(db.profiles.getMany).mockResolvedValue([profile("first")]);

    await expect(prepareOwnedLocation("first", "owner")).resolves.toEqual({
      city: "Hyderabad, India",
      latitude: 17.385,
      longitude: 78.4867,
      timezone: "Asia/Kolkata",
    });
    expect(db.readings.latestByEngineMany).not.toHaveBeenCalled();
    expect(fetchDashaflow).not.toHaveBeenCalled();
  });

  it("preserves request order and derives anonymous participant contexts from cache", async () => {
    vi.mocked(db.profiles.getMany).mockResolvedValue([
      profile("second"),
      profile("first"),
    ]);
    vi.mocked(db.readings.latestByEngineMany).mockResolvedValue([
      reading("first", "Ashwini"),
      reading("second", "Pushyami"),
    ]);

    const prepared = await prepareOwnedParticipants(["first", "second"], "owner");

    expect(prepared.profileLabels).toEqual([
      { label: "p1", id: "first", name: "first" },
      { label: "p2", id: "second", name: "second" },
    ]);
    expect(prepared.participants).toEqual([
      {
        label: "p1",
        janma_nakshatra: "Ashvini",
        janma_rasi: "Mesha",
        janma_lagna: "Karka",
      },
      {
        label: "p2",
        janma_nakshatra: "Pushya",
        janma_rasi: "Mesha",
        janma_lagna: "Karka",
      },
    ]);
    expect(fetchDashaflow).not.toHaveBeenCalled();
  });

  it("calculates and caches a chart when the safe derived context is absent", async () => {
    vi.mocked(db.profiles.getMany).mockResolvedValue([profile("first")]);
    vi.mocked(db.readings.latestByEngineMany).mockResolvedValue([]);
    vi.mocked(fetchDashaflow).mockResolvedValue({
      data: {
        planets: { Moon: { sign: "Pisces", nakshatra: "Revati" } },
        lagna: { sign: "Leo" },
      },
    });

    const prepared = await prepareOwnedParticipants(["first"], "owner");

    expect(prepared.participants[0]).toEqual({
      label: "p1",
      janma_nakshatra: "Revati",
      janma_rasi: "Meena",
      janma_lagna: "Simha",
    });
    expect(db.readings.save).toHaveBeenCalledOnce();
  });
});
