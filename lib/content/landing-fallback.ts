// Generic, sign-by-sign fallback for the landing page when /api/landing/today
// has not yet returned (cold start, missing env vars in dev, sidecar/LLM
// failure with no prior-day row). Same tone as the LLM-generated paragraphs:
// observational, no commands, no mystic clichés, ~30–45 words.

export const LANDING_FALLBACK_ASCENDANTS = {
  aries:
    "Aries rising starts before others finish. Fire moves first, asks questions later, and learns by impact. Clarity tends to arrive mid-step, not before it.",
  taurus:
    "Taurus rising holds its ground. You make a place by staying in it — the same room, the same hour — until what was loud becomes background and what was hidden becomes obvious.",
  gemini:
    "Gemini rising follows the next interesting thing. Many doors stay slightly open. Some of them only close when you finally walk through one fully.",
  cancer:
    "Cancer rising remembers. People you barely know feel held by you because you carry their small details. The harder work is bringing that same attention inward.",
  leo: "Leo rising warms the room. People perform their best version near you. The skill is staying generous when the spotlight turns back the other way.",
  virgo:
    "Virgo rising notices what's slightly off — the seam, the typo, the tone shift. Useful, until it becomes the only thing you see. Try noticing what's right.",
  libra:
    "Libra rising waits for the other side to speak. You hear what's underneath the words. The risk is becoming a mirror; the gift is being one when it's actually asked for.",
  scorpio:
    "Scorpio rising trusts what it doesn't say. People sense the depth and lean in. Reveal slowly — the few who stay are the ones worth choosing.",
  sagittarius:
    "Sagittarius rising travels for the meaning, not the destination. Plans loosen along the way. The version of you waiting at the end isn't the one who left.",
  capricorn:
    "Capricorn rising builds quietly. The years compound. What looks like restraint is patience pricing itself into every move.",
  aquarius:
    "Aquarius rising sees the system before the person. That's the edge and the trap together. Let one specific name disrupt the larger pattern.",
  pisces:
    "Pisces rising dissolves the edge between itself and what it watches. Strong currents move through. Pick the one that's yours — the others will recede on their own.",
} as const;

export type LandingFallbackKey = keyof typeof LANDING_FALLBACK_ASCENDANTS;
