// Shared constants and types for the Ashtakoota compatibility system.

export const KOOTA_MAX: Record<string, number> = {
  Varna: 1,
  Vashya: 2,
  Dina: 3, Tara: 3,
  Yoni: 4,
  "Graha Maitri": 5, GrahaMaitri: 5, Maitri: 5,
  Gana: 6,
  Bhakoot: 7, Rashi: 7,
  Nadi: 8, Nakshatra: 8,
};

export type KootaScores = Record<string, number>;

export type KujaBreakdownEntry = { house: number; sign: string; score: number };

export type KujaDosha = {
  male?: { is_manglik?: boolean; total_score?: number; breakdown?: Record<string, KujaBreakdownEntry> };
  female?: { is_manglik?: boolean; total_score?: number; breakdown?: Record<string, KujaBreakdownEntry> };
  compatibility?: { result?: string; description?: string };
};

export type ProfileDetails = {
  moon_sign?: string;
  nakshatra?: string;
  gana?: string;
  nadi?: string;
  yoni?: string;
};

export type AdditionalKuta = {
  result?: string;
  group?: string | null;
  effect?: string;
  issues?: string[];
  description?: string;
  male?: string;
  female?: string;
};

// ── Score display helpers ─────────────────────────────────────────────────────
// Ashtakoota is out of 36. These thresholds and colors are used wherever a
// score is rendered — centralised here so the logic lives in one place.

export function scoreColor(score: number): string {
  return score >= 26 ? "#34d399"
       : score >= 18 ? "#86efac"
       : score >= 12 ? "#fbbf24"
       :               "#f87171";
}

export function scoreLabel(score: number): string {
  return score >= 26 ? "Excellent"
       : score >= 18 ? "Auspicious"
       : score >= 12 ? "Moderate"
       :               "Challenging";
}

export type CompatResult = {
  total_score: number;
  scores?: KootaScores;
  kuja_dosha?: KujaDosha;
  male_details?: ProfileDetails;
  female_details?: ProfileDetails;
  additional_kutas?: Record<string, string | AdditionalKuta>;
  exceptions?: string[];
  is_match_approved?: boolean;
};
