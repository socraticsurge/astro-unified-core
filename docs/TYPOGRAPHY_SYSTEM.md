# Astro Chaganti Typography System

The authenticated experience uses one typographic hierarchy across every tab.
The system is intentionally compact enough for dense astrological data while
remaining readable on mobile.

## Families

| Role | Family | Allowed weights |
| --- | --- | --- |
| Display titles and important reading headings | Libre Baskerville | 400, 700 |
| Interface copy, controls, labels, and tables | Inter | 400, 500, 600, 700 |
| Dates, degrees, times, and aligned numeric data | JetBrains Mono | 400, 600 |

Do not synthesize intermediate display weights. Libre Baskerville is loaded only
at 400 and 700.

## Semantic roles

| Role | Token | Size | Typical use |
| --- | --- | --- | --- |
| Page title | `--type-page-size` | 25–34px | Active dashboard destination |
| Feature title | `--type-feature-size` | 24–34px | Primary interpretation or result |
| Section title | `--type-title-size` | 21–28px | Major card or workflow section |
| Metric | `--type-metric-size` | 21px | Compact score or astrological value |
| Card title | `--type-title-sm-size` | 18px | Compact display heading |
| Reading copy | `--type-body-lg-size` | 13px | Interpretation paragraphs |
| Body | `--type-body-size` | 12px | Default interface copy |
| Compact body | `--type-body-sm-size` | 11px | Controls and data tables |
| Caption | `--type-caption-size` | 10px | Dates, hints, supporting metadata |
| Label | `--type-label-size` | 9px | Eyebrows and table headers |

Labels use uppercase Inter 700 with `--type-track-label`. Body copy uses
`--type-line-body`; compact data uses `--type-line-compact`. Large numerical
scores and astrological glyphs may retain a deliberately larger size, but their
surrounding labels and explanations must use these roles.

## Usage rules

1. Display type establishes hierarchy; it is not used for ordinary controls or
   dense data.
2. A component chooses a semantic role instead of a one-off pixel size.
3. Numeric columns use tabular figures; degrees, times, and date ranges may use
   the mono family.
4. Mobile layouts preserve the hierarchy. They may reduce exceptional score or
   glyph sizes, but must not invent new body or label sizes.
5. New tabs must use these tokens rather than hard-coded font sizes or
   unsupported weights.
6. Long-form generated, preview, and current-period interpretations use the
   shared `ac-reading` class. Equivalent reading surfaces must not choose their
   font family independently.
