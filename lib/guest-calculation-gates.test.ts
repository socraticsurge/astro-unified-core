import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  guestBirthProfileEnabled,
  guestElectionChartEnabled,
} from "./guest-calculation-gates";

describe("guest calculation production gates", () => {
  it.each([
    {},
    { VERCEL_ENV: "development" },
  ])("defaults both routes on only in local development: %j", (env) => {
    expect(guestBirthProfileEnabled(env)).toBe(true);
    expect(guestElectionChartEnabled(env)).toBe(true);
  });

  it.each(["preview", "production"])(
    "defaults both routes off in Vercel %s",
    (vercelEnv) => {
      const env = { VERCEL_ENV: vercelEnv };
      expect(guestBirthProfileEnabled(env)).toBe(false);
      expect(guestElectionChartEnabled(env)).toBe(false);
    },
  );

  it("requires the exact string true in a deployed environment", () => {
    for (const configured of ["TRUE", " true", "true ", "1", "yes", "false", ""]) {
      const env = {
        VERCEL_ENV: "production",
        GUEST_BIRTH_PROFILE_ENABLED: configured,
        GUEST_ELECTION_CHART_ENABLED: configured,
      };
      expect(guestBirthProfileEnabled(env)).toBe(false);
      expect(guestElectionChartEnabled(env)).toBe(false);
    }

    const enabled = {
      VERCEL_ENV: "production",
      GUEST_BIRTH_PROFILE_ENABLED: "true",
      GUEST_ELECTION_CHART_ENABLED: "true",
    };
    expect(guestBirthProfileEnabled(enabled)).toBe(true);
    expect(guestElectionChartEnabled(enabled)).toBe(true);
  });

  it("honors an explicit false locally", () => {
    const env = {
      GUEST_BIRTH_PROFILE_ENABLED: "false",
      GUEST_ELECTION_CHART_ENABLED: "false",
    };
    expect(guestBirthProfileEnabled(env)).toBe(false);
    expect(guestElectionChartEnabled(env)).toBe(false);
  });

  it("keeps the birth-profile and election-chart flags independent", () => {
    const birthOnly = {
      VERCEL_ENV: "preview",
      GUEST_BIRTH_PROFILE_ENABLED: "true",
      GUEST_ELECTION_CHART_ENABLED: "false",
    };
    expect(guestBirthProfileEnabled(birthOnly)).toBe(true);
    expect(guestElectionChartEnabled(birthOnly)).toBe(false);

    const electionOnly = {
      VERCEL_ENV: "preview",
      GUEST_BIRTH_PROFILE_ENABLED: "false",
      GUEST_ELECTION_CHART_ENABLED: "true",
    };
    expect(guestBirthProfileEnabled(electionOnly)).toBe(false);
    expect(guestElectionChartEnabled(electionOnly)).toBe(true);
  });

  it("fails closed for an unknown Vercel environment", () => {
    expect(guestBirthProfileEnabled({ VERCEL_ENV: "staging" })).toBe(false);
    expect(guestElectionChartEnabled({ VERCEL_ENV: "staging" })).toBe(false);
  });
});
