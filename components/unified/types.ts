// components/unified/types.ts
// Shared types for the unified chart view components.

export type SignName =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export type PlanetName =
  | "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter"
  | "Venus" | "Saturn" | "Rahu" | "Ketu";

// aspects field shape is unknown — handled defensively in formatAspects()
export type Planet = {
  sign?: SignName;
  degree?: number;
  house?: number;
  nakshatra?: string;
  pada?: number;
  nakshatra_lord?: string;
  dignity?: string;
  is_retrograde?: boolean;
  is_combust?: boolean;
  has_digbala?: boolean;
  aspects?: unknown[];
  d2_sign?: SignName; d3_sign?: SignName; d4_sign?: SignName;
  d7_sign?: SignName; d9_sign?: SignName; d10_sign?: SignName;
  d12_sign?: SignName; d16_sign?: SignName; d20_sign?: SignName;
  d24_sign?: SignName; d27_sign?: SignName; d30_sign?: SignName;
  d40_sign?: SignName; d60_sign?: SignName;
};

export type ShadbalaPlanet = {
  sthana_bala?: { total?: number };
  dig_bala?: number;
  kala_bala?: number;
  chesta_bala?: number;
  naisargika_bala?: number;
  drik_bala?: number;
  total_rupas?: number;
  required_rupas?: number;
  is_strong?: boolean;
  strength_ratio?: number;
  ishta_phala?: number;
  kashta_phala?: number;
};

export type UnifiedViewProps = {
  chartOutput: Record<string, unknown>;
  transitOutput: Record<string, unknown> | null;
  careerOutput: Record<string, unknown> | null;
  isTransitLoading: boolean;
  isCareerLoading: boolean;
  onFetchTransit: (force?: boolean) => void;
  onFetchCareer: (force?: boolean) => void;
};

export const SIGNS_ORDER: readonly SignName[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

export const PLANET_ORDER: readonly PlanetName[] = [
  "Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu",
];

export const DIGNITY_COLORS: Record<string, string> = {
  exalted:     "text-emerald-400",
  mooltrikona: "text-emerald-300",
  own:         "text-sky-300",
  friend:      "text-sky-200",
  neutral:     "text-slate-300",
  enemy:       "text-orange-300",
  debilitated: "text-red-500",
};

export const VARGA_KEYS: { label: string; key: keyof Planet }[] = [
  { label: "D2",  key: "d2_sign"  }, { label: "D3",  key: "d3_sign"  },
  { label: "D4",  key: "d4_sign"  }, { label: "D7",  key: "d7_sign"  },
  { label: "D9",  key: "d9_sign"  }, { label: "D10", key: "d10_sign" },
  { label: "D12", key: "d12_sign" }, { label: "D16", key: "d16_sign" },
  { label: "D20", key: "d20_sign" }, { label: "D24", key: "d24_sign" },
  { label: "D27", key: "d27_sign" }, { label: "D30", key: "d30_sign" },
  { label: "D40", key: "d40_sign" }, { label: "D60", key: "d60_sign" },
];

export const PLANET_ABBR: Record<PlanetName, string> = {
  Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me",
  Jupiter: "Ju", Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
};

// Handles all plausible aspects array shapes from the sidecar
export function formatAspects(aspects: unknown): string {
  if (!aspects) return "—";
  if (Array.isArray(aspects)) {
    if (aspects.length === 0) return "—";
    if (typeof aspects[0] === "number") {
      return (aspects as number[]).map(h => `H${h}`).join(", ");
    }
    if (typeof aspects[0] === "object" && aspects[0] !== null) {
      return aspects.map((a: unknown) => {
        const obj = a as Record<string, unknown>;
        return obj.house ? `H${obj.house}` : String(a);
      }).join(", ");
    }
    return aspects.map(String).join(", ");
  }
  if (typeof aspects === "object" && aspects !== null) {
    return Object.values(aspects as Record<string, unknown>).join(", ");
  }
  return String(aspects);
}
