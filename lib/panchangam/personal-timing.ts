import "server-only";

import { db, type Profile } from "@/lib/db";
import { fetchDashaflow, type DashaflowInput } from "@/lib/engines/dashaflow";
import { birthDataChanged } from "@/lib/engines/cache-validate";
import { extractEngineError } from "@/lib/engine-error";
import type { ParticipantContext } from "./contracts";
import { extractParticipantContext } from "./participant-context";

export class PersonalTimingError extends Error {
  constructor(
    public readonly status: 400 | 404 | 422 | 502,
    public readonly code:
      | "profile_not_found"
      | "current_location_required"
      | "chart_context_unavailable"
      | "chart_engine_unavailable",
  ) {
    super(code);
    this.name = "PersonalTimingError";
  }
}

export type PersonalTimingPreparation = {
  profiles: Profile[];
  profileLabels: Array<{ label: ParticipantContext["label"]; id: string; name: string }>;
  participants: ParticipantContext[];
  location: PersonalTimingLocation;
};

export type PersonalTimingLocation = {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

function locationFromProfile(profile: Profile): PersonalTimingLocation {
  if (
    !profile.current_location ||
    profile.current_latitude == null ||
    profile.current_longitude == null ||
    !profile.current_timezone
  ) {
    throw new PersonalTimingError(422, "current_location_required");
  }
  return {
    city: profile.current_location,
    latitude: profile.current_latitude,
    longitude: profile.current_longitude,
    timezone: profile.current_timezone,
  };
}

export async function prepareOwnedLocation(
  profileId: string,
  userId: string,
): Promise<PersonalTimingLocation> {
  const [profile] = await db.profiles.getMany([profileId], userId);
  if (!profile) {
    throw new PersonalTimingError(404, "profile_not_found");
  }
  return locationFromProfile(profile);
}

function chartInput(profile: Profile): DashaflowInput {
  return {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone: profile.timezone,
  };
}

function parseOutput(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

async function calculateAndCache(profile: Profile): Promise<unknown> {
  const input = chartInput(profile);
  const output = await fetchDashaflow(input);
  if (extractEngineError(output)) {
    throw new PersonalTimingError(502, "chart_engine_unavailable");
  }
  await db.readings.save({
    profile_id: profile.id,
    engine: "dashaflow",
    input_snapshot: input,
    output_data: output,
  });
  return output;
}

export async function prepareOwnedParticipants(
  profileIds: string[],
  userId: string,
): Promise<PersonalTimingPreparation> {
  const loaded = await db.profiles.getMany(profileIds, userId);
  const byId = new Map(loaded.map((profile) => [profile.id, profile]));
  const profiles = profileIds.map((id) => byId.get(id));

  // A mixed owned/cross-user list must fail as a whole. Silently dropping the
  // inaccessible ID could produce a seemingly valid but unsafe calculation.
  if (profiles.some((profile) => !profile)) {
    throw new PersonalTimingError(404, "profile_not_found");
  }
  const orderedProfiles = profiles as Profile[];

  const anchor = orderedProfiles[0];
  const location = locationFromProfile(anchor);

  const readings = await db.readings.latestByEngineMany(profileIds, "dashaflow");
  const readingByProfile = new Map(readings.map((reading) => [reading.profile_id, reading]));

  const contexts = await Promise.all(
    orderedProfiles.map(async (profile, index) => {
      const label = `p${index + 1}` as ParticipantContext["label"];
      const cached = readingByProfile.get(profile.id);
      const input = chartInput(profile);
      const cachedOutput = cached && !birthDataChanged(cached.input_snapshot, input)
        ? parseOutput(cached.output_data)
        : null;
      const cachedContext = extractParticipantContext(cachedOutput, label);
      if (cachedContext) return cachedContext;

      const freshOutput = await calculateAndCache(profile);
      const freshContext = extractParticipantContext(freshOutput, label);
      if (!freshContext) {
        throw new PersonalTimingError(422, "chart_context_unavailable");
      }
      return freshContext;
    }),
  );

  return {
    profiles: orderedProfiles,
    profileLabels: orderedProfiles.map((profile, index) => ({
      label: `p${index + 1}` as ParticipantContext["label"],
      id: profile.id,
      name: profile.name,
    })),
    participants: contexts,
    location,
  };
}
