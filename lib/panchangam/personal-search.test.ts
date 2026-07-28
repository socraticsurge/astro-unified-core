import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({ callPanchangamService: vi.fn() }));
vi.mock("./personal-timing", () => ({
  prepareOwnedLocation: vi.fn(),
  prepareOwnedParticipants: vi.fn(),
}));

import { callPanchangamService } from "./client";
import {
  prepareOwnedLocation,
  prepareOwnedParticipants,
} from "./personal-timing";
import {
  searchGeneralMuhurtam,
  searchPersonalMuhurtam,
  searchPersonalTarabalam,
} from "./personal-search";

const prepared = {
  profiles: [
    {
      id: "profile-secret-id",
      name: "Private name",
      date_of_birth: "1990-04-12",
      time_of_birth: "08:15",
    },
  ],
  profileLabels: [{ label: "p1", id: "profile-secret-id", name: "Private name" }],
  participants: [
    {
      label: "p1",
      janma_nakshatra: "Ashvini",
      janma_rasi: "Mesha",
      janma_lagna: "Karka",
    },
  ],
  location: {
    city: "Hyderabad, India",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
  },
};

const envelope = {
  contract_version: "1.0" as const,
  request_id: "request-id",
  engine: { package: "test", version: "1", system: "drik", ayanamsa: "lahiri" },
  data: {},
  evidence: { evaluated_factors: [], not_evaluated: [], provenance: [] },
  warnings: [],
};

describe("personal timing service boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prepareOwnedParticipants).mockResolvedValue(prepared as never);
    vi.mocked(prepareOwnedLocation).mockResolvedValue(prepared.location);
    vi.mocked(callPanchangamService).mockResolvedValue(envelope);
  });

  it("sends only anonymous derived participant facts for Tarabalam", async () => {
    await searchPersonalTarabalam(
      "owner-id",
      {
        profile_ids: ["profile-secret-id"],
        start_date: "2026-07-22",
        end_date: "2026-07-23",
        chandra_mode: "stars",
      },
      "request-id",
    );

    const upstreamBody = vi.mocked(callPanchangamService).mock.calls[0][1];
    expect(upstreamBody).toMatchObject({
      days: 2,
      participants: prepared.participants,
      city: "Hyderabad, India",
    });
    const serialized = JSON.stringify(upstreamBody);
    expect(serialized).not.toContain("profile-secret-id");
    expect(serialized).not.toContain("Private name");
    expect(serialized).not.toContain("1990-04-12");
    expect(serialized).not.toContain("08:15");
  });

  it("sends the same bounded context for personalized Muhurtam", async () => {
    await searchPersonalMuhurtam(
      "owner-id",
      {
        profile_ids: ["profile-secret-id"],
        start_date: "2026-07-22",
        end_date: "2026-07-28",
        activity: "wedding",
        chandra_mode: "strict",
        include_night: false,
      },
      "request-id",
    );

    expect(callPanchangamService).toHaveBeenCalledWith(
      "/v1/muhurtam/search",
      expect.objectContaining({
        days: 7,
        activity: "wedding",
        participants: prepared.participants,
      }),
      "request-id",
      20_000,
    );
  });

  it("uses the owned profile location but no participant context for general timings", async () => {
    await searchGeneralMuhurtam(
      "owner-id",
      {
        profile_ids: ["profile-secret-id"],
        start_date: "2026-07-22",
        end_date: "2026-07-28",
        activity: "wedding",
        chandra_mode: "stars",
        include_night: false,
        validation_mode: "general",
      },
      "request-id",
    );

    expect(prepareOwnedLocation).toHaveBeenCalledWith(
      "profile-secret-id",
      "owner-id",
    );
    expect(prepareOwnedParticipants).not.toHaveBeenCalled();
    expect(callPanchangamService).toHaveBeenCalledWith(
      "/v1/muhurtam/search",
      expect.objectContaining({
        participants: [],
        city: "Hyderabad, India",
        days: 7,
      }),
      "request-id",
      20_000,
    );
  });
});
