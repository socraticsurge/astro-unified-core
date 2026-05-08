---
key: section:chart-metadata
type: section
title: Chart Metadata
section_in_view: Chart Metadata
gist: The inputs the chart was built from — the ayanamsha used, the coordinates, the timezone, and the date and time. The audit trail that makes the chart reproducible.
sources: []
---

## What this section measures

This section records the inputs the chart was built from. Three things matter most.

The ayanamsha is the gap between two zodiacs. Vedic astrology uses the sidereal zodiac — the actual stars in the sky. Western astrology uses the tropical zodiac — the seasons measured from the spring equinox. The two have drifted apart over millennia. Today the gap is about 24 degrees. That is enough to shift most planets, and the lagna, by one full sign.

The Lahiri value shown here is the most widely accepted measurement of that gap. It was set in 1955 by the Calendar Reform Committee of the Government of India, under the astronomer N.C. Lahiri. Indian almanacs and most serious Vedic software have used it ever since.

Your coordinates and timezone matter because the lagna — the sign rising in the east at the moment you were born — moves by about one degree every four minutes. A small error in the recorded time can put your lagna in the next sign. That changes everything else.

## What the section shows

| Field | Meaning |
|---|---|
| Ayanamsha | The system used to convert tropical longitudes to sidereal — Lahiri |
| Value | The exact ayanamsha figure for the date and time of birth |
| Timezone | The IANA timezone applied (e.g., Asia/Kolkata, America/New_York) |
| Query Date | The date the calculation was run |
| Latitude / Longitude | The geographic coordinates used for the lagna calculation |
| DOB | Date of birth |
| Time | Time of birth in the local timezone |

The ayanamsha *value* is given to four decimal places. It changes very slowly — the rate of change is roughly 50.3 arcseconds per year, or 0.014° per year. For practical purposes the ayanamsha for any year in the 20th or 21st century is approximately 23°–24°.

## Why this section exists

This is the chart's audit trail. Every interpretation that follows can be reproduced from the inputs in this section in any other Vedic software that uses the Lahiri ayanamsha. If two pieces of software produce different signs for the same person, the metadata in this section is what reveals the cause — almost always a different ayanamsha (Lahiri vs. Raman vs. Krishnamurti vs. Yukteshwar) or, less commonly, an incorrect timezone.

If you have ever opened a Western astrology app and seen completely different signs for yourself than the ones shown here, the ayanamsha is the reason. Both can be internally consistent. They are answering different questions.

## A note on calculation conventions

Classical Vedic texts predate the modern ayanamsha standardisation. The ayanamsha is a 20th-century calibration that ties classical sidereal calculations to the modern ephemeris. Different traditions within Vedic astrology use slightly different ayanamsha values — Lahiri is the dominant standard in mainstream Vedic practice, but Raman and Krishnamurti ayanamshas are used in their respective lineages and produce slightly shifted (typically by less than 1°) chart values.

The Lahiri ayanamsha used here is appropriate for general Parashari interpretation and the calculations performed across the rest of the chart. If you have a specific reason to consult a chart calculated under another ayanamsha, the metadata recorded in this section tells you exactly what would change.
