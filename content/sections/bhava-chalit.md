---
key: section:bhava-chalit
type: section
title: Bhava Chalit
section_in_view: Bhava Chalit — House Shift Analysis
gist: The Sripati system of house cusps — a refinement of the equal-house rasi chart that adjusts house boundaries by the actual angular span of each bhava, surfacing planets that have "shifted" houses.
sources:
  - text: Sripati Paddhati
    chapter: 1
---

## What this section measures

The standard rasi chart treats each sign as one house — the lagna sign as the first house, the second sign as the second house, and so on. This is the *equal-house* convention used throughout Parashari interpretation.

The Bhava Chalit chart applies a refinement. The actual angular span of each *bhava* (house) is not exactly 30°. The midpoint of each house — the *bhava madhya*, the cusp — is computed by dividing the arc from the lagna degree to the descendant degree (the seventh-house cusp) into six equal parts. The bhava boundaries (where one house ends and the next begins) are then derived from these midpoints. The result is that a planet near the boundary between two signs in the rasi chart can fall into a different house in the Bhava Chalit chart.

The methodology originates in *Sripati Paddhati*, the eleventh-century work by Sripati Bhatta. The system addresses an asymmetry in the equal-house convention: at high latitudes, or with certain ascendant degrees, the angular span of houses 10 through 12 (the upper hemisphere) differs noticeably from houses 1 through 6 (the lower hemisphere), and the equal-house treatment can place a planet in the wrong house relative to its actual angular position.

## What the section shows

DashaflowView renders a per-planet table:

| Column | Meaning |
|---|---|
| Planet | One of the nine |
| Rashi House | The house assigned by the equal-house rasi chart |
| Bhava House | The house assigned by the Sripati Bhava Chalit calculation |
| Shifted | Whether the planet sits in a different house in the Bhava Chalit reading |

A "Shifted" planet is one whose Bhava Chalit house differs from its rasi house. The table colour-codes shifted planets in orange to draw attention to the difference.

## How the section is read

The reading distinguishes three cases.

When no planets shift, the rasi and Bhava Chalit charts agree, and there is nothing additional to interpret.

When a planet shifts to an adjacent house, its house-related significations are read against the *Bhava Chalit* house in addition to the rasi house. A Mars in the rasi 5th but the Chalit 6th, for example, is read as having both the 5th-house themes (intellect, children, mantras) and the 6th-house themes (enemies, debts, illness) active in different layers — the rasi-house theme in the *outer* expression, the Bhava-house theme in the *underlying* expression.

When a planet shifts across a more significant boundary (e.g., from a kendra to a non-kendra, or from a trine to a dustana), the Bhava Chalit reading carries more weight. Yogas formed in the rasi chart may be modified or weakened by the Bhava Chalit shift; conversely, yogas not visible in the rasi may surface in the Bhava Chalit alignment.

## A note on tradition and convention

The Sripati Paddhati system is one of several house-cusp methodologies in the broader Vedic tradition. Other methods (Porphyry, Placidus adapted for Vedic use, the *KP* system used in Krishnamurti Paddhati) produce slightly different cusp values and therefore slightly different Bhava Chalit house assignments. *BPHS* itself does not specify a particular cusp methodology — Parasara works with the equal-house convention throughout. The Bhava Chalit refinement is post-Parashari, and its inclusion in modern Vedic practice is a matter of school rather than universal convention.

DashaflowView uses the Sripati methodology as its default. The reading is offered as a refinement of the rasi chart rather than a replacement — the equal-house chart remains the primary frame, and the Bhava Chalit identifies the cases where the boundary effects of high latitudes or extreme ascendant degrees materially change the interpretation.
