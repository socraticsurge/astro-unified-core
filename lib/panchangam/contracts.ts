import { z } from "zod";

export const CONTRACT_VERSION = "1.0" as const;

export const SYSTEMS = ["drik", "surya_siddhanta", "vakya"] as const;
export const AYANAMSAS = [
  "lahiri",
  "raman",
  "krishnamurti",
  "true_chitrapaksha",
] as const;
export const RASIS = [
  "Mesha",
  "Vrishabha",
  "Mithuna",
  "Karka",
  "Simha",
  "Kanya",
  "Tula",
  "Vrischika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Meena",
] as const;
export type Rasi = (typeof RASIS)[number];

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const city = z.string().trim().min(1).max(80);
const profileId = z.string().trim().min(1).max(128);

function dateOrdinal(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function inclusiveDays(startDate: string, endDate: string): number {
  return dateOrdinal(endDate) - dateOrdinal(startDate) + 1;
}

const ownedProfileIds = z
  .array(profileId)
  .min(1)
  .max(4)
  .refine((ids) => new Set(ids).size === ids.length, "Profile IDs must be unique");

export const panchangamQuerySchema = z.object({
  date: isoDate,
  city: city.default("Hyderabad"),
  system: z.enum(SYSTEMS).default("drik"),
  ayanamsa: z.enum(AYANAMSAS).default("lahiri"),
}).strict();

export const horoscopeQuerySchema = z.object({
  date: isoDate,
  city: city.default("Hyderabad"),
  rasi: z.enum(RASIS),
  ayanamsa: z.enum(AYANAMSAS).default("lahiri"),
}).strict();

export const muhurtamQuerySchema = z.object({
  start_date: isoDate,
  city: city.default("Hyderabad"),
  days: z.coerce.number().int().min(1).max(14).default(7),
  activity: z.string().trim().min(1).max(80).default("any"),
  system: z.enum(SYSTEMS).default("drik"),
  ayanamsa: z.enum(AYANAMSAS).default("lahiri"),
  include_night: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
}).strict();

export const privateTarabalamSchema = z
  .object({
    profile_ids: ownedProfileIds,
    start_date: isoDate,
    end_date: isoDate,
    chandra_mode: z.enum(["stars", "puja_ok", "strict"]).default("stars"),
  })
  .strict()
  .refine(
    (value) => {
      const days = inclusiveDays(value.start_date, value.end_date);
      return days >= 1 && days <= 90;
    },
    "Choose an inclusive date range between 1 and 90 days",
  );

export const privateMuhurtamSchema = z
  .object({
    profile_ids: ownedProfileIds,
    start_date: isoDate,
    end_date: isoDate,
    activity: z.string().trim().regex(/^[a-z][a-z0-9_]{0,79}$/).default("any"),
    chandra_mode: z.enum(["stars", "puja_ok", "strict"]).default("stars"),
    include_night: z.boolean().default(false),
    validation_mode: z.enum(["general", "personal"]).default("personal"),
    travel_direction: z.enum(["North", "South", "East", "West"]).optional(),
  })
  .strict()
  .refine(
    (value) => {
      const days = inclusiveDays(value.start_date, value.end_date);
      return days >= 1 && days <= 14;
    },
    "Choose an inclusive date range between 1 and 14 days",
  )
  .refine(
    (value) => value.activity === "travel" || value.travel_direction === undefined,
    "Travel direction is available only for travel",
  );

export const engineSchema = z.object({
  package: z.string(),
  version: z.string(),
  system: z.string(),
  ayanamsa: z.string(),
});

export const evidenceSchema = z.object({
  evaluated_factors: z.array(z.string()),
  not_evaluated: z.array(z.string()),
  provenance: z.array(z.unknown()),
});

export const serviceEnvelopeSchema = z.object({
  contract_version: z.literal(CONTRACT_VERSION),
  request_id: z.string().min(1).max(64),
  engine: engineSchema,
  data: z.unknown(),
  evidence: evidenceSchema,
  warnings: z.array(z.string()),
});

export type ServiceEnvelope<T> = Omit<z.infer<typeof serviceEnvelopeSchema>, "data"> & {
  data: T;
};

export type TimeWindow = { start: string; end: string; name?: string };

export type PanchangamData = {
  date: string;
  city: string;
  system: string;
  ayanamsa: string;
  metadata: {
    vaaram: string;
    samvatsara: string;
    ayanam: string;
    rituvu: string;
    maasam: string;
    paksham: string;
    lunar_sign: string;
    solar_sign: string;
    [key: string]: unknown;
  };
  pancha_anga: {
    tithi: TimeWindow;
    nakshatra: TimeWindow;
    nakshatra_pada: number;
    yoga: TimeWindow;
    karana: TimeWindow[];
  };
  sky: {
    sunrise: string;
    sunset: string;
    moonrise: string;
    moonset: string;
  };
  auspicious: {
    brahma_muhurta?: TimeWindow | null;
    abhijit_muhurta?: TimeWindow | null;
    amrita_kalam?: TimeWindow[];
  };
  inauspicious: {
    rahu_kalam?: TimeWindow | null;
    gulika_kalam?: TimeWindow | null;
    yamagandam?: TimeWindow | null;
    varjyam?: TimeWindow[];
    durmuhurtham?: TimeWindow[];
  };
  special_days: string[];
  horas: TimeWindow[];
  choghadiya: TimeWindow[];
  choghadiya_night: TimeWindow[];
  lagna_transitions: TimeWindow[];
  provenance?: unknown;
};

export type RasiPhalaluData = {
  janma_rasi: string;
  day_quality: string;
  moon_house: number;
  favourable_count: number;
  blocked_count: number;
  adverse_count: number;
  conditions: string[];
  lines: string[];
  date: string;
  city: string;
  day_nakshatra: string;
  sky_positions: {
    graha: string;
    longitude: number;
    rasi: string;
    nakshatra: string;
    pada: number;
    retrograde: boolean;
    rasi_until?: string | null;
    next_rasi?: string | null;
  }[];
  disclaimer: string;
};

export type MuhurtamSlot = {
  date: string;
  vaaram: string;
  start: string;
  end: string;
  score: number;
  tier: string;
  reasons: string[];
  reason_groups: {
    slot_quality: string[];
    day_quality: string[];
    group_fit: string[];
    activity_match: string[];
    notes: string[];
  };
  day_dosha?: string | null;
  personal_dosha?: string | null;
};

export type MuhurtamData = {
  start_date: string;
  days: number;
  activity: string;
  resolved_activity: string;
  city: string;
  system: string;
  ayanamsa: string;
  slots: MuhurtamSlot[];
  dropped_days: Array<{ date: string; reason: string }>;
  activity_profile?: unknown;
  disclaimer: string;
  participants?: string[];
};

export type ParticipantContext = {
  label: `p${1 | 2 | 3 | 4}`;
  janma_nakshatra: string;
  janma_rasi?: string;
  janma_lagna?: string;
};

export type TarabalamDay = {
  date: string;
  vaaram: string;
  nakshatra: string;
  nakshatra_until: string;
  tithi: string;
  taras: Array<{
    tara: number;
    name: string;
    auspicious: boolean;
    chandra?: { position: number; verdict: string };
  }>;
  good_for_all: boolean;
};

export type TarabalamData = {
  janma_nakshatras: string[];
  city: string;
  system: string;
  tara_convention: string;
  chandra_convention: string;
  days: TarabalamDay[];
  good_for_all_dates: string[];
  participants: string[];
  requested_days: number;
  ayanamsa: "lahiri";
};
