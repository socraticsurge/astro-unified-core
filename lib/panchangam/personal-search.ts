import "server-only";

import { callPanchangamService } from "./client";
import {
  inclusiveDays,
  type MuhurtamData,
  type TarabalamData,
} from "./contracts";
import {
  prepareOwnedLocation,
  prepareOwnedParticipants,
} from "./personal-timing";

type TarabalamInput = {
  profile_ids: string[];
  start_date: string;
  end_date: string;
  chandra_mode: "stars" | "puja_ok" | "strict";
};

type MuhurtamInput = TarabalamInput & {
  activity: string;
  include_night: boolean;
  validation_mode?: "general" | "personal";
  travel_direction?: "North" | "South" | "East" | "West";
};

export async function searchPersonalTarabalam(
  userId: string,
  input: TarabalamInput,
  requestId: string,
) {
  const prepared = await prepareOwnedParticipants(input.profile_ids, userId);
  const envelope = await callPanchangamService<TarabalamData>(
    "/v1/tarabalam",
    {
      start_date: input.start_date,
      days: inclusiveDays(input.start_date, input.end_date),
      chandra_mode: input.chandra_mode,
      participants: prepared.participants,
      ...prepared.location,
      system: "drik",
      ayanamsa: "lahiri",
    },
    requestId,
    15_000,
  );
  return { ...envelope, profile_labels: prepared.profileLabels };
}

export async function searchPersonalMuhurtam(
  userId: string,
  input: MuhurtamInput,
  requestId: string,
) {
  const prepared = await prepareOwnedParticipants(input.profile_ids, userId);
  const envelope = await callPanchangamService<MuhurtamData>(
    "/v1/muhurtam/search",
    {
      start_date: input.start_date,
      days: inclusiveDays(input.start_date, input.end_date),
      activity: input.activity,
      chandra_mode: input.chandra_mode,
      include_night: input.include_night,
      ...(input.travel_direction
        ? { travel_direction: input.travel_direction }
        : {}),
      participants: prepared.participants,
      ...prepared.location,
      system: "drik",
      ayanamsa: "lahiri",
    },
    requestId,
    20_000,
  );
  return {
    ...envelope,
    profile_labels: prepared.profileLabels,
    validation_mode: "personal" as const,
  };
}

export async function searchGeneralMuhurtam(
  userId: string,
  input: MuhurtamInput,
  requestId: string,
) {
  const location = await prepareOwnedLocation(input.profile_ids[0], userId);
  const envelope = await callPanchangamService<MuhurtamData>(
    "/v1/muhurtam/search",
    {
      start_date: input.start_date,
      days: inclusiveDays(input.start_date, input.end_date),
      activity: input.activity,
      chandra_mode: input.chandra_mode,
      include_night: input.include_night,
      ...(input.travel_direction
        ? { travel_direction: input.travel_direction }
        : {}),
      participants: [],
      ...location,
      system: "drik",
      ayanamsa: "lahiri",
    },
    requestId,
    20_000,
  );
  return {
    ...envelope,
    profile_labels: [],
    validation_mode: "general" as const,
  };
}
