// Shared constants and types for the consultation request feature.

export const LIFE_AREAS = [
  "Career & Profession",
  "Wealth & Finances",
  "Marriage & Partnership",
  "Family & Children",
  "Health & Wellbeing",
  "Education & Skills",
  "Travel & Relocation",
  "Dharma & Life Purpose",
] as const;

export type LifeArea = typeof LIFE_AREAS[number];

export type DeliveryMode = "written" | "appointment";

// Per-area placeholder examples that guide the user toward a well-formed
// Life Problem Statement without them needing to read instructions.
export const LIFE_AREA_EXAMPLES: Record<LifeArea, { observation: string; constraint: string; objective: string; options: string }> = {
  "Career & Profession": {
    observation: "I have been passed over for promotion twice despite strong performance reviews",
    constraint: "I cannot tell if this is a timing issue, the wrong company, or the wrong field entirely",
    objective: "I want to know whether to persist here or make a lateral move before year-end",
    options: "Staying at my current employer vs. a lateral move to a startup vs. pursuing independent consulting",
  },
  "Wealth & Finances": {
    observation: "I have been earning well for five years but my net savings have not grown as expected",
    constraint: "I cannot decide between investing in real estate, equities, or my own business",
    objective: "I want to understand the period ahead for wealth accumulation and the right vehicle for me",
    options: "Investing in real estate vs. equities vs. putting capital into my own business",
  },
  "Marriage & Partnership": {
    observation: "I am 32 and have had two serious relationships end when marriage was discussed",
    constraint: "I cannot tell if this is my chart, the timing, or the kind of partner I am attracting",
    objective: "I want to understand when my 7th house activates and what qualities to look for in a partner",
    options: "I am not weighing specific people — I want to understand the timing and qualities I should be open to",
  },
  "Family & Children": {
    observation: "My relationship with my father has been strained since I moved abroad five years ago",
    constraint: "I cannot tell if this rift is a temporary phase or something deeper in our charts",
    objective: "I want to understand the karmic dynamic and whether reconciliation is indicated in my chart",
    options: "Reaching out directly vs. waiting for him to initiate vs. involving a family elder as mediator",
  },
  "Health & Wellbeing": {
    observation: "I have been experiencing chronic fatigue and disrupted sleep for the past eight months",
    constraint: "Medical tests show nothing conclusive and I am unsure if a dasha is affecting my vitality",
    objective: "I want to understand which planetary period is at play and when this is likely to lift",
    options: "Continuing current treatment vs. exploring Ayurvedic approaches vs. making lifestyle changes first",
  },
  "Education & Skills": {
    observation: "I am choosing between an MBA and a specialised technical certification",
    constraint: "The MBA offers broad opportunities but the certification aligns with my current strengths",
    objective: "I want to understand which direction my 5th house supports and the right timing to commit",
    options: "An MBA from a tier-1 college vs. a specialised technical certification vs. self-paced online learning",
  },
  "Travel & Relocation": {
    observation: "I have been offered a role in Singapore that would require permanent relocation",
    constraint: "I am unsure if foreign settlement is auspicious in my chart and what the timing suggests",
    objective: "I want to understand whether the 12th house is active and if this move is indicated now",
    options: "Accepting the Singapore role vs. negotiating a remote arrangement vs. exploring other international offers",
  },
  "Dharma & Life Purpose": {
    observation: "Despite professional success, I feel I am not living in alignment with my true calling",
    constraint: "I cannot tell if I should pivot to something more meaningful or if this is a passing dasha",
    objective: "I want to understand what my Atmakaraka and 9th house say about my dharmic direction",
    options: "Transitioning to teaching or mentoring vs. starting a values-driven venture vs. staying in my current field while contributing differently",
  },
};

// Shown when no life area is selected yet — guides users who have no specific options formed.
export const OPTIONS_GENERIC_PLACEHOLDER =
  "List the options you are weighing — e.g. Job A vs. Job B, staying vs. leaving. " +
  "If no specific options have formed yet, describe what you are drawn to or what paths have been suggested to you.";

export const MIN_FIELD_LENGTH = 30;

export const WRITTEN_FEE_PAISE = 120000; // ₹1,200
export const LIVE_FEE_PAISE = 500000;    // ₹5,000

export function feeForMode(mode: DeliveryMode): number {
  return mode === "written" ? WRITTEN_FEE_PAISE : LIVE_FEE_PAISE;
}

export function formatFee(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function assembleStatement(
  observation: string,
  constraint: string,
  objective: string,
  options?: string | null
): string {
  return [observation.trim(), constraint.trim(), objective.trim(), options?.trim()]
    .filter(Boolean)
    .join(" ");
}
