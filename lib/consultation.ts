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
export const LIFE_AREA_EXAMPLES: Record<LifeArea, { observation: string; constraint: string; objective: string }> = {
  "Career & Profession": {
    observation: "I have been passed over for promotion twice despite strong performance reviews",
    constraint: "I cannot tell if this is a timing issue, the wrong company, or the wrong field entirely",
    objective: "I want to know whether to persist here or make a lateral move before year-end",
  },
  "Wealth & Finances": {
    observation: "I have been earning well for five years but my net savings have not grown as expected",
    constraint: "I cannot decide between investing in real estate, equities, or my own business",
    objective: "I want to understand the period ahead for wealth accumulation and the right vehicle for me",
  },
  "Marriage & Partnership": {
    observation: "I am 32 and have had two serious relationships end when marriage was discussed",
    constraint: "I cannot tell if this is my chart, the timing, or the kind of partner I am attracting",
    objective: "I want to understand when my 7th house activates and what qualities to look for in a partner",
  },
  "Family & Children": {
    observation: "My relationship with my father has been strained since I moved abroad five years ago",
    constraint: "I cannot tell if this rift is a temporary phase or something deeper in our charts",
    objective: "I want to understand the karmic dynamic and whether reconciliation is indicated in my chart",
  },
  "Health & Wellbeing": {
    observation: "I have been experiencing chronic fatigue and disrupted sleep for the past eight months",
    constraint: "Medical tests show nothing conclusive and I am unsure if a dasha is affecting my vitality",
    objective: "I want to understand which planetary period is at play and when this is likely to lift",
  },
  "Education & Skills": {
    observation: "I am choosing between an MBA and a specialised technical certification",
    constraint: "The MBA offers broad opportunities but the certification aligns with my current strengths",
    objective: "I want to understand which direction my 5th house supports and the right timing to commit",
  },
  "Travel & Relocation": {
    observation: "I have been offered a role in Singapore that would require permanent relocation",
    constraint: "I am unsure if foreign settlement is auspicious in my chart and what the timing suggests",
    objective: "I want to understand whether the 12th house is active and if this move is indicated now",
  },
  "Dharma & Life Purpose": {
    observation: "Despite professional success, I feel I am not living in alignment with my true calling",
    constraint: "I cannot tell if I should pivot to something more meaningful or if this is a passing dasha",
    objective: "I want to understand what my Atmakaraka and 9th house say about my dharmic direction",
  },
};

export const MIN_FIELD_LENGTH = 30;

export function assembleStatement(
  observation: string,
  constraint: string,
  objective: string
): string {
  return [observation.trim(), constraint.trim(), objective.trim()]
    .filter(Boolean)
    .join(" ");
}
