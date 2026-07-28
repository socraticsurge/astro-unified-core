# Signed-in experience: tab-by-tab review

Status: active review. This document supersedes any earlier blanket claim that
the signed-in experience was visually or functionally complete.

## Review rule

A tab is complete only after it passes its own functional, visual, responsive,
accessibility, and data-provenance checks and Vinay has had a useful staging
review. Rendering without an error is not acceptance.

Global shell changes are allowed during a tab pass only when they are necessary
to remove a shared defect visible in that tab. They do not approve the other
tabs.

## Current sequence

| Surface | Status | Acceptance focus |
| --- | --- | --- |
| Natal chart | In progress | Written interpretation first; birth context and birth Panchangam second with inline editing; charts remain authoritative |
| Planets | In progress | Direct D1 anchors; coherent desktop/mobile data presentation; no inferred benefic/malefic classification |
| Divisional charts | In progress | Preserve the charts; explain each traditional life-area lens; remove repetitive legends; verify responsive details |
| Dashas | Owner approved | One authoritative engine timeline; expose calculation basis; refresh date-sensitive periods daily |
| Transits | Owner approved | One coherent Sade Sati context; complete returned graha data; prominent SAV points |
| Muhurtam | Owner approved | Preserve the public general calculation, then add explicit saved-profile validation |
| Tarabalam | Owner approved | Exact day comparison, clear Moon policy, private multi-profile context, and complete responsive evidence |
| Yogas | Owner approved | Calculation-faithful major/supporting hierarchy; contextual conditions; semantic responsive presentation |
| Jaimini | Ready for owner review | Connected inner-to-outward hierarchy; exact engine values; semantic responsive presentation |
| Ashtakavarga | Ready for owner review | House-mapped SAV points first; traditional life-area lenses; exact BAV contribution evidence |
| Shadbala | Ready for owner review | Total versus required Rupas first; exact six-part strength and Ishta–Kashta evidence; secondary Bhava context |
| Career | Ready for owner review | 10th-house foundation first; complete D10 map; exact supportive/complicating evidence; unranked domain vocabulary |
| Marriage compatibility | Ready for owner review | Deliberate two-profile journey; exact classical evidence; honest decision boundary; responsive tables |
| Today | Pending follow-up | Keep daily horoscope in Today; do not force an unnecessary Janma Rasi choice; expose Panchangam and Calendar as direct navigation destinations |
| Admin | Pending redesign | Full visual, functional, responsive, and accessibility review |

## Global acceptance backlog

- Remove accidental stepped dividers and align the top brand block with the
  signed-in navigation rail.
- Avoid avoidable single-word widows and narrow copy measures across all tabs.
- Make Explore with AI the primary interpretive continuation; keep Ask Dr
  Chaganti as the clearly secondary human consultation path.
- Replace the ambiguous theme glyph with a recognizable theme control.
- Check every surface at phone, tablet, laptop, and wide-desktop widths.
- Verify focus order, visible focus, keyboard operation, semantic headings,
  form labels, error states, reduced motion, and colour-independent meaning.

## Investigation register

These are evidence questions, not design assumptions:

1. Which backend fields feed the Planets “key placements” summary?
2. Does the existing chart response already classify functional benefics and
   malefics? If not, record it as a wishlist item and do not infer it.
3. Where are Dasha dates calculated in production and staging, and why does
   Vinay's profile differ?
4. Does DashaFlow return adverse as well as supportive career influences?
5. **Resolved:** the canonical Telugu Calendar engine itself enforces a
   1–14-day inclusive search and returns at most 12 ranked slots. The web must
   explain and preserve this service contract rather than silently widening it.
6. **Resolved:** public and signed-in general Muhurtam call the same
   `/v1/muhurtam/search` engine with no participant contexts. Personal mode
   adds only anonymous, derived contexts for owned saved profiles.

## Natal chart acceptance

- [x] The written interpretation is the first substantive content.
- [x] Birth details and Panchangam follow as the calculation foundation.
- [x] Editing happens inline in that content; no left edit drawer is opened.
- [ ] Saving refreshes all calculations based on changed birth details.
- [x] The written interpretation appears before the charts and has stronger
      editorial hierarchy.
- [x] Placeholder interpretation copy is explicitly labelled as a preview and
      makes no claim that it was calculated from the chart.
- [x] D1 and D9 remain available and can be focused independently.
- [ ] Loading, generated-reading, failed-reading, and placeholder states work.
- [ ] Desktop and mobile have no overlap, clipping, stepped dividers, or
      avoidable widows.
- [ ] Keyboard and screen-reader labels cover edit, save, cancel, retry, chart
      focus, dialog close, and Explore with AI.

### Natal implementation evidence — 2026-07-27

- Staging deployment:
  `dpl_DGg1Y7Q6k9i7knMsLcWggWrhUcxn` on the isolated
  `astro-unified-staging` project; stable alias
  `https://astro-unified-staging.vercel.app`. Production was not changed.
- Automated gates: 67 test files / 500 tests passed; TypeScript, ESLint, and
  the production Next.js build passed.
- Live authenticated check: the rail Edit action activates Natal and opens
  `form[aria-label="Edit profile"]` inline; zero dialog elements are created.
- Live geometry check at 1280 px: top brand right edge = 248 px; left rail
  right edge = 248 px; document, birth-foundation card, and title report no
  horizontal overflow.
- Live AI check: the primary Natal action opens “Explore with AI” with
  `Natal chart · Vinay` context.
- Live typography check: interpretation copy resolves to 15 px Inter with a
  26.25 px line-height at desktop width, preserves authored paragraph breaks,
  and exposes no invented “Try interpretation” action.
- Live dependency check: `/api/health` returned HTTP 200 with Turso,
  DashaFlow, and Panchangam healthy; rehearsal boundary and synthetic staging
  authentication remain ready.
- Still intentionally open: mutate-and-save check on a disposable profile,
  phone-width visual review, complete keyboard traversal, and owner approval.

## Planets acceptance

- [x] The former hard-coded Moon, Sun, Jupiter, and Saturn “key placements” list
      is removed.
- [x] Ascendant, Sun, and Moon are presented as orientation anchors, explicitly
      not as a ranking of planetary importance.
- [x] The complete nine-graha presentation retains sign, degree, house,
      Nakshatra, dignity, motion/condition, Avastha, aspects, and yoga context
      whenever those fields are returned.
- [x] Desktop uses a purpose-built readable table; phone widths use complete
      planetary cards instead of a squeezed table.
- [x] Dignity and condition are kept visually distinct and are not presented as
      equivalent to chart-specific functional benefic/malefic status.
- [x] No functional benefic/malefic label is inferred in the browser.
- [ ] Desktop and phone staging visuals have no clipping, overflow, avoidable
      widows, or colour-only meaning.
- [ ] Owner has reviewed and approved the Planets tab on staging.

### Planets investigation result — 2026-07-27

- The old “key placements” summary was a frontend list of four names, not a
  DashaFlow classification. It read the Moon, Sun, Jupiter, and Saturn fields
  from `chartOutput.data.planets`.
- The current DashaFlow 1.1 chart response supplies placements, dignity,
  condition, Avastha, aspects, and yoga data, but does not supply a
  chart-specific functional benefic/malefic classification.
- The UI therefore exposes the returned calculation faithfully and leaves
  functional classification as an engine-contract wishlist item.

### Planets implementation evidence — 2026-07-27

- Staging deployment:
  `dpl_HKPS81a9dDMrsYtLk2ukr29AadJj` on the isolated
  `astro-unified-staging` project; stable alias
  `https://astro-unified-staging.vercel.app`. Production was not changed.
- Automated gates: 67 test files / 504 tests passed; the Planets contract has
  seven focused tests; TypeScript, ESLint, whitespace checks, and the remote
  production-style Next.js build passed.
- Live authenticated check with Vinay's profile: orientation anchors resolve to
  Ascendant Capricorn, Sun Virgo, and Moon Pisces; the table contains nine
  graha rows and the expected seven column headings.
- Live provenance check: Jupiter and Saturn do not appear in the anchor region;
  the DashaFlow D1 source label and the no-inference classification boundary are
  visible.
- Live desktop geometry check at 1280 px: the document reports no horizontal
  overflow and the settled tab has no loading overlay.

## Divisional charts acceptance

- [x] All available DashaFlow Varga placements remain unchanged and render in
      divisional order.
- [x] Each chart states its traditional life-area lens without presenting the
      Varga as an isolated verdict.
- [x] The introduction establishes D1 as the interpretive foundation without a
      redundant reading-discipline block.
- [x] Higher-division birth-time sensitivity is stated plainly.
- [x] D9 Navamsha is accounted for and remains beside D1 in Natal Chart.
- [x] The repeated per-chart legend is replaced with one shared key.
- [x] Missing Varga data produces an explicit recovery-oriented state.
- [ ] Phone-width staging visuals have no clipped chart labels, crowded cells,
      avoidable widows, or horizontal overflow.
- [x] Owner approved the chart library direction; the redundant
      reading-discipline block identified during review was removed.

### Divisional charts implementation evidence — 2026-07-27

- Current staging deployment:
  `dpl_GnLW6uqzkAgXMz5wmxbqv5TWQLoX` on the isolated
  `astro-unified-staging` project; stable alias
  `https://astro-unified-staging.vercel.app`. Production was not changed.
- Automated gates: 68 test files / 509 tests passed, including five focused
  Divisional Charts contracts; TypeScript, ESLint, whitespace checks, and the
  remote production-style Next.js build passed.
- Live authenticated check with Vinay's profile: 12 chart figures render from
  D2 through D60 with their existing accessible chart labels and calculated
  contents.
- Live information check: D2 describes the resource lens; D60 carries the
  birth-time-sensitive karmic lens; D1-first and D9 placement guidance are
  present.
- Live repetition and geometry check at 1280 px: one shared legend, zero
  per-figure legends, and no document-level horizontal overflow.
- Owner-review refinement: the separate “Reading discipline” section was
  removed as redundant. Live staging now reports no such label or heading,
  retains the concise D9 note and shared key, and still renders all 12 charts.
- The browser screenshot operation timed out on the unusually tall 12-chart
  document; semantic, computed-content, and geometry checks completed.

## Dashas acceptance

- [x] DashaFlow is the sole authority for all dates shown in the tab.
- [x] The five current periods preserve the exact engine-returned boundaries
      from Mahadasha through Prana Dasha.
- [x] The calculation basis makes birth date, birth time, profile timezone, and
      calculation date visible so materially different inputs cannot look like
      a computation discrepancy.
- [x] The Mahadasha timeline uses only the authoritative major-period
      boundaries returned by DashaFlow.
- [x] Every Mahadasha can be expanded lazily through Antar, Pratyantar,
      Sukshma, and Prana levels.
- [x] Accordion children use DashaFlow 1.1.0's exact server-side period builder
      and rounding sequence; the browser performs no date arithmetic.
- [x] The web cache refreshes when its calculation date is no longer today in
      the profile's timezone.
- [x] The query-date and exact-subperiod contracts are connected end to end
      through the dedicated `dashaflow-sidecar-staging` service.
- [x] Empty current-period and timeline states explain what is unavailable.
- [ ] Phone-width staging visuals have no clipped dates, avoidable widows, or
      horizontal overflow.
- [x] Owner reviewed and approved the Dashas tab on staging.

### Dashas investigation result — 2026-07-27

- The initial comparison used different birth times: production contained
  `14:50` while staging then contained `14:05`. That difference legitimately
  changed the starting balance and every subsequent Vimshottari boundary.
- The current staging review now resolves Vinay to `14:50`, permitting an
  apples-to-apples live comparison. Both sites agree on Ketu Mahadasha
  `2019-08-19` to `2026-08-19`.
- Production's cached chart is date-stale: it still calls expired Jupiter
  Pratyantar, Mercury Sukshma, and Rahu Prana periods “current.” A fresh
  DashaFlow calculation for 2026-07-27 returns Saturn Pratyantar and Moon
  Sukshma instead.
- The current production screen also contradicts itself: its top Mercury Antar
  card ends `2026-08-18`, while its browser-derived accordion ends
  `2026-08-19`.
- Staging had a second, independent presentation defect: its current-period
  cards used exact DashaFlow results, while its expanded historical rows
  proportionally reconstructed nested periods in TypeScript. One displayed
  Pratyantar boundary consequently differed by a day within the same screen.
- The fix does not silently change profile data. It displays the calculation
  basis, passes the profile-local date to DashaFlow, invalidates date-sensitive
  cached charts daily, and replaces browser arithmetic with a lazy exact-period
  endpoint.

### Dashas implementation evidence — 2026-07-27

- Current staging deployment:
  `dpl_FQJrDZbnN1dRq3DGHCzdFVjgrTB5` on the isolated
  `astro-unified-staging` project; stable alias
  `https://astro-unified-staging.vercel.app`. Production Astro and the shared
  production DashaFlow alias were not changed.
- Exact-period service:
  `dashaflow-sidecar-staging` deployment
  `dpl_zKD5qaLJPMnokk5DtXbnK2nkZHeQ`; stable staging-only alias
  `https://dashaflow-sidecar-staging.vercel.app`.
- Automated gates: 70 test files / 522 tests passed, including exact
  engine-boundary, authenticated lazy accordion, no-client-reconstruction,
  profile-timezone cache rollover, and query-date forwarding contracts;
  TypeScript, ESLint, Python compilation, whitespace checks, and the
  production-style Next.js build passed.
- The redesigned tab presents the current sequence first, followed by the
  authoritative Mahadasha timeline and a concise provenance boundary.
- Live authenticated check with Vinay's staging profile displays the explicit
  basis `8 Oct 1984 · 14:50`, `Asia/Kolkata`, and `27 Jul 2026`. The current
  path auto-opens from Ketu through Moon and exposes exact Prana children.
- A separate Saturn historical Mahadasha was expanded successfully, proving
  that exploration is not limited to the current branch.
- Live desktop geometry at 1280 px reports no document overflow after five
  nested lists, 46 disclosure buttons, and five expanded branches. Both web and
  staging-sidecar deployment error scans are clean.
- Owner approved the restored accordion exploration and current visual
  direction on staging.
- Still open: a reliable phone-width visual capture.

## Transits acceptance

- [x] The DashaFlow transit response remains the calculation authority; the
      browser presents returned placements, houses, motion, Sade Sati, nodal
      axis, and SAV points without recomputing them.
- [x] Sade Sati is presented once as a coherent current-context card rather
      than an isolated warning banner or a redundant explanatory bar.
- [x] All returned grahas expose sign, retrograde state, house from Lagna,
      house from Moon, and SAV points in one scannable responsive collection.
- [x] SAV points have primary metric hierarchy and an explicit textual band, so
      their meaning does not depend on colour.
- [x] The point legend distinguishes natal sign support from a planet score or
      complete prediction.
- [x] The transit chart remains on the natal SAV lattice and retains accessible
      sign, house, planet, ascendant, retrograde, and bindu labels.
- [x] Rahu and Ketu retain the returned nodal-axis context.
- [x] Loading, service failure, refresh, and missing-planet states are explicit.
- [ ] Phone-width staging visuals have no overlap, clipping, avoidable widows,
      or horizontal overflow.
- [x] Owner has reviewed and approved the Transits tab on staging.

### Transits implementation evidence — 2026-07-27

- Current staging deployment:
  `dpl_HYhN2uxF4UuFrDnR5gADka9yc3j3` on the isolated
  `astro-unified-staging` project; stable alias
  `https://astro-unified-staging.vercel.app`. Production was not changed.
- The prior screen exposed only Moon, Saturn, Jupiter, and a warning-style Sade
  Sati banner; the remaining per-planet house and SAV fields were returned by
  DashaFlow but not presented.
- The redesigned screen preserves the existing current-sky chart, adds all
  returned planets as responsive data cards, foregrounds each SAV value and
  restores the returned Rahu-Ketu axis.
- Owner-review refinement removed the full-width Sade Sati explanation because
  it repeated the status and phase already expressed by the context card.
- Five focused component contracts cover cycle semantics, points and houses,
  date and nodal axis, refresh behavior, and empty data.
- Automated gates: 71 test files / 527 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed.
- Live authenticated check with Vinay's staging profile renders all nine
  grahas, the returned Rahu-Ketu axis, Sade Sati peak context, and SAV values
  from 22 through 32.
- Desktop at 1494 px and phone override at 390 px both report equal document
  scroll and client widths; the only element with intentional internal
  overflow at phone width is screen-reader-only text. The browser console and
  Vercel build error scans are clean.

## Muhurtam acceptance

- [x] The complete supported occasion catalogue is available without a legacy
      select menu.
- [x] The journey establishes a general election first and makes profile
      validation a clear optional enhancement.
- [x] General mode uses the owned active profile only as a current-location
      anchor and sends zero participant contexts to the canonical engine.
- [x] Personal mode supports one to four owned saved profiles and sends only
      anonymous derived Nakshatra, Rasi, and Lagna contexts upstream.
- [x] The real 1–14-day inclusive engine limit is stated beside the date
      controls and enforced at both browser and BFF boundaries.
- [x] Ranked slots expose date, time, tier, score, grouped reasoning, and
      evaluated versus unevaluated factors without implying a complete
      election-chart judgment.
- [x] General results can be upgraded to profile validation without rebuilding
      the occasion or date search.
- [x] Loading, empty, warning, failure, retry, truncated-result, and WhatsApp
      sharing states are present.
- [x] Desktop and phone staging checks have no overlap, clipping, avoidable
      widows, or horizontal overflow.
- [x] Live general and personal searches return usable slots or an honest
      engine response.
- [x] Owner reviewed and approved the Muhurtam tab on staging.

### Muhurtam implementation evidence — 2026-07-27

- The authenticated BFF now accepts an explicit `validation_mode`. Both modes
  call `/v1/muhurtam/search`; general mode supplies `participants: []`, while
  personal mode prepares contexts only after profile ownership checks.
- The active profile's current location can be loaded independently, so a
  general calculation does not calculate or transmit birth-chart context.
- Focused component, route, search-adapter, and profile-location contracts cover
  the two modes, participant privacy, range enforcement, and result evidence.
- Isolated staging deployment `dpl_HYhN2uxF4UuFrDnR5gADka9yc3j3` is READY;
  production was not changed. A live Hyderabad wedding search over eight days
  returned an honest zero-slot result with all eight days rejected by hard
  filters in both modes. General evidence named no birth-chart factors;
  personal evidence named Vinay's Tarabalam, Chandrabalam, and Lagna context.
- At 390 px the document has no horizontal overflow and all 36 occasion targets
  measure 44 px high. At the normal 1494 px viewport the document also has no
  horizontal overflow. The long engine method is collapsed behind explicit
  progressive disclosure, and the browser error scan is clean.
- Automated gates: 72 test files / 535 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed.

## Tarabalam acceptance

- [x] The authenticated screen calls the canonical Telugu Calendar Utilities
      Drik engine; the browser performs no mean-motion extrapolation.
- [x] One to four owned saved profiles and a 1–90-day inclusive range are
      supported, with the active profile first and always included.
- [x] The active profile supplies the calculation place, while only anonymous
      derived star and Moon-sign contexts are sent upstream.
- [x] Classic Tarabalam, exclude-Moon-cautions, and strict-Moon-support policies
      are available with plain-language definitions.
- [x] The engine's authoritative `good_for_all` verdict is preserved rather
      than re-derived from presentation data.
- [x] Results expose the daily star and transition time, Tithi, per-person Tara,
      Chandrabalam house and verdict, and evaluated versus unevaluated factors.
- [x] Long results use progressive disclosure; loading, failure, retry,
      warnings, empty shortlist, and WhatsApp sharing are present.
- [x] Desktop and phone staging checks have no clipping, overflow, avoidable
      widows, or inaccessible targets.
- [x] Owner reviewed and approved the Tarabalam tab on staging.

### Tarabalam implementation evidence — 2026-07-27

- Focused component, BFF, and adapter contracts cover exact engine mapping,
  profile order, all three Moon policies, one- and multi-profile results,
  evidence, the 90-day boundary, and long-result disclosure.
- The result rows state support or caution in text, retain the canonical group
  verdict, and make every person's Tara and Chandrabalam reasoning inspectable.
- The old duplicate desktop/mobile results are replaced by one semantic
  comparison table: a row per date, fixed Moon context and overall verdict,
  and a compact Tara/Chandrabalam column for each selected profile. On phones,
  the table scrolls within its own region while the date column remains pinned.
- Isolated staging deployment `dpl_Fc9UnxEsRnWCsaEoqVibTTLBp4ei` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.
- A live strict-policy comparison for Vinay and Tara over 14 days returned one
  mutually supportive day, with exact star, Tithi, Tara, and Chandrabalam
  evidence for both profiles. A classic one-profile run returned seven of 14
  supportive days.
- Desktop at 1494 px and phone at 390 px both report equal document client and
  scroll widths. At phone width, the 700 px comparison table is contained
  within a 360 px independently scrollable region between 14 px gutters; the
  116 px date column stays pinned. The browser console error scan is clean.
- The non-actionable upstream canonical-path diagnostic is suppressed while
  genuine calculation warnings remain visible.
- Automated gates: 73 test files / 540 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed.

## Yogas acceptance

- [x] Every displayed Yoga, forming planet, Dosha, Graha Yuddha, and Gandanta
      condition comes directly from the calculated chart output.
- [x] The existing major-Yoga classification is used only to establish reading
      order; the browser does not synthesize new combinations or predictions.
- [x] Major yogas appear first, followed by the complete supporting set.
- [x] Forming planets use labelled semantic lists rather than undifferentiated
      legacy chips.
- [x] Doshas, planetary wars, and junction conditions remain visually and
      semantically separate from favourable combinations.
- [x] The page states that these conditions require dignity, aspects, house
      ownership, cancellation rules, and wider chart context.
- [x] Empty engine output produces an honest explicit state.
- [x] Desktop and phone staging checks have no clipping, horizontal overflow,
      avoidable heading truncation, or console errors.
- [x] Owner reviewed and approved the Yogas tab on staging.

### Yogas implementation evidence — 2026-07-27

- Vinay's live calculated chart returns 11 Yogas: seven existing major
  classifications and four supporting combinations. All 11 remain present
  after the presentation rebuild.
- The live condition section preserves the returned Venus-Saturn Graha Yuddha
  and its 0.42-degree explanation without adding an independent verdict.
- Focused render contracts cover major-first ordering, semantic forming-planet
  lists, the interpretation boundary, condition presentation, and empty output.
- At 1280 px the major-yoga cards form two 489 px columns and the document has
  no horizontal overflow. At 390 px all 12 visible articles form a single
  362 px column between 14 px gutters; no heading clips and the document width
  remains exactly 390 px.
- Isolated staging deployment `dpl_6RnAY6nqsufMtQWmbibzfG2aYKQL` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.
- Automated gates: 74 test files / 543 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed. Desktop and phone browser console error scans are clean.

## Jaimini acceptance

- [x] Atmakaraka and Karakamsha establish the first reading context.
- [x] Karakamsha sign, house from Lagna, occupants, and Ishta Devata details
      appear only when those exact fields are returned by the engine.
- [x] Chara Karakas retain the traditional Atmakaraka-to-Darakaraka order in a
      semantic table without changing planets or descriptions.
- [x] The complete Arudha Pada set remains visible as outward/reflected
      indicators rather than disconnected generic tiles.
- [x] Upapada is visually and semantically distinct as a relationship
      indicator and retains the engine-returned sign, lord, second-from-UL,
      and description.
- [x] The page states that the connected Jaimini indicators are not standalone
      verdicts.
- [x] Empty engine output produces an honest explicit state.
- [x] Desktop and phone staging checks have no clipping, horizontal overflow,
      heading widows, or runtime browser errors.
- [ ] Owner has reviewed and approved the Jaimini tab on staging.

### Jaimini implementation evidence — 2026-07-27

- Vinay's live calculated chart retains Venus Atmakaraka, Aries Karakamsha,
  House 4 from Lagna, Venus and Saturn as occupants, and Pisces/Jupiter Ishta
  Devata evidence.
- The complete seven-row Chara Karaka table remains in the expected order and
  the complete twelve-pada set remains present. Upapada retains Virgo,
  Mercury, Libra second-from-UL, and the existing engine description.
- Four focused render contracts cover orientation, exact occupants, semantic
  Karaka ordering, Arudha/Upapada separation, and honest empty output.
- At 1280 px, the 988 px content panel, table, Arudha matrix, and Upapada card
  report no overflow. The hero wraps into balanced five-word and four-word
  lines.
- At 390 px, the content panel remains between 14 px gutters, each Karaka
  becomes a complete 362 px responsive row, and Arudha becomes one column.
  The document remains exactly 390 px wide and the hero wraps into three
  balanced three-word lines.
- Owner-review typography refinement: the hero and section display type now
  use weight 450, supporting labels use 600–650 sparingly, and data values use
  Inter at weight 500–550. Planet pills were removed so emphasis no longer
  repeats across every row.
- Second owner-review rebuild removed the bespoke counter, flow-diagram,
  numbered-row, matrix, and large-section-heading systems. Jaimini now imports
  the same shared `ToolPage` lead and section primitives as Planets and matches
  its anchor-card, desktop-table, and mobile-card geometry.
- Isolated staging deployment `dpl_DEfZsySRwQzmBcrg3ABKLSRg3j8J` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.
- Automated gates: 75 test files / 547 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed. The deployed page runtime log scan is clean.

## Ashtakavarga acceptance

- [x] Sarvashtakavarga points are the first substantive content rather than a
      secondary chart annotation.
- [x] Every returned sign is mapped to its actual house from the returned
      Lagna, and each house names its traditional life-area lens.
- [x] Exact SAV values remain visible alongside the shared 28+ higher-support,
      22–27 middle-range, and below-22 lower-support bands.
- [x] Support bands are stated in text and do not rely on colour alone.
- [x] The interface states that points are comparative support context rather
      than a complete prediction.
- [x] The D1 chart retains every returned planet and the exact SAV lattice.
- [x] The seven-planet BAV matrix retains every returned bindu and total; cell
      shading supplements rather than replaces the printed values.
- [x] Empty engine output produces an honest explicit state.
- [x] Desktop and phone staging checks have no page-level horizontal overflow,
      clipping, or runtime browser errors; the wide BAV evidence table scrolls
      within its own phone-width container.
- [ ] Owner has reviewed and approved the Ashtakavarga tab on staging.

### Ashtakavarga implementation evidence — 2026-07-27

- Vinay's live chart maps Capricorn Lagna to House 1 with 33 points, Libra to
  House 10 with 31 points, and Sagittarius to House 12 with 22 points. All
  twelve returned SAV values remain present.
- The exact seven BAV rows remain present with returned totals: Sun 48, Moon
  49, Mars 39, Mercury 54, Jupiter 56, Venus 52, and Saturn 39.
- Four focused render contracts cover house mapping, exact scores and bands,
  the D1 chart context, exact BAV values and totals, and honest empty output.
- At 1280 px, the 988 px content panel, SAV table, BAV matrix, and natal chart
  report no overflow. At 390 px, all twelve house cards remain within 14 px
  page gutters and the 920 px BAV matrix is contained by a 360 px internal
  scroll region.
- Isolated staging deployment `dpl_EfEp3KHHbXmNqUVx6UjoRHeMfPCx` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.

## Shadbala acceptance

- [x] Total Rupas and required Rupas establish the primary comparison for each
      returned graha.
- [x] Every threshold state is stated in text and as a percentage rather than
      relying on colour alone.
- [x] The interface explicitly distinguishes planetary strength from
      beneficence or favourable results.
- [x] All six exact strength contributors remain available and are labelled as
      Virupas, with the sixty-Virupas-to-one-Rupa relationship stated.
- [x] Ishta and Kashta Phala remain exact, paired, and visually separate from
      the required-strength threshold.
- [x] Bhava Chalit lists only genuine shifts and states that a house shift does
      not alter the Shadbala total.
- [x] Empty engine output produces an honest explicit state.
- [x] Desktop and phone staging checks have no page-level horizontal overflow
      or clipped evidence; phone layouts replace both wide tables with complete
      per-planet cards.
- [ ] Owner has reviewed and approved the Shadbala tab on staging.

### Shadbala implementation evidence — 2026-07-27

- Vinay's live chart retains all seven returned grahas. Venus is shown at 5.97
  total Rupas against 5.50 required (109%, meets requirement); Sun remains 4.95
  against 6.50 (76%, below requirement). No strength verdict was invented.
- All 42 returned Virupa component values remain present across Sthana, Dig,
  Kala, Chesta, Naisargika, and Drik Bala. All fourteen Ishta/Kashta values
  remain present.
- The five live Bhava Chalit changes remain exact: Moon H3→H2, Mars H12→H11,
  Jupiter H12→H11, Rahu H5→H4, and Ketu H11→H10.
- Five focused render contracts cover strength-versus-requirement, exact
  components and units, Ishta/Kashta separation, genuine Bhava shifts, and
  honest empty output.
- At 1261 px, the 969 px content panel and both 967 px tables report no
  overflow. At 390 px, the panel remains within 14 px gutters; all strength
  and component cards are 360 px wide, and the document remains exactly
  390 px.
- Isolated staging deployment `dpl_8hPedha999T13CgYJ2uLJoVXdVfW` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.
- Automated gates: 77 test files / 556 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed.

## Career acceptance

- [x] The natal 10th house, its lord, occupants, lord placement, and lord's D10
      sign establish the first calculated career context.
- [x] The exact D10 chart remains visible with every returned graha.
- [x] All nine returned D10 indicators remain present rather than showing only
      planets with positive or primary flags.
- [x] A missing strong-sign flag is explicitly not presented as a weakness
      verdict.
- [x] Exact engine statements are separated into supportive, complicating, and
      contextual evidence without changing their text.
- [x] When the engine returns no explicit challenge, the page says so and
      states that absence is not proof of a challenge-free professional life.
- [x] Every returned career domain remains visible and is explicitly described
      as alphabetical, unranked vocabulary rather than a recommendation list.
- [x] Loading, refresh, error, and genuinely empty responses remain distinct.
- [x] Desktop and phone staging checks have no page-level horizontal overflow
      or clipped evidence; phone layout replaces the D10 table with complete
      per-graha cards.
- [ ] Owner has reviewed and approved the Career tab on staging.

### Career implementation evidence — 2026-07-27

- Vinay's live career foundation remains Libra 10th house, Venus as the
  10th lord in House 10/Libra, Venus and Saturn as occupants, and Taurus as
  the lord's D10 sign. The D10 Ascendant remains Gemini.
- The complete nine-graha D10 map remains exact. Jupiter in Pisces, Venus in
  Taurus, and Rahu in Aquarius carry the engine's strong-sign flag; the other
  six are labelled only as having no returned strong-sign flag.
- All five live strength statements are retained as supportive factors. The
  page correctly reports zero returned complexities for Vinay and does not
  manufacture an adverse influence.
- All 19 live career domains remain visible in the engine's alphabetical order
  and are explicitly unranked.
- DashaFlow 1.1 source audit confirms that the current career engine can return
  a Dusthana 10th-lord challenge or a retrograde 10th-house complexity. Broader
  challenge modelling is recorded as backlog item D11 rather than inferred in
  the browser.
- Six focused render contracts cover exact foundation data, complete D10
  indicators, supportive/complicating separation, honest absence, complete
  domains, and explicit error/empty states.
- At 1261 px, the 969 px panel, 967 px D10 table, foundation, evidence, and
  domain sections report no overflow. At 390 px, the panel remains within
  14 px gutters; all nine D10 cards are 360 px wide and the document remains
  exactly 390 px.
- Isolated staging deployment `dpl_EaU3b1s8osuXMtxJLCsrMM3SmE8c` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.
- Automated gates: 78 test files / 562 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed.

## Marriage compatibility acceptance

- [x] The current profile stays fixed and the second profile is chosen
      deliberately; choosing a profile does not silently run or store a check.
- [x] The calculation route receives two different, owned profile IDs and
      retains its existing duplicate-result, rate-limit, and six-check
      protections.
- [x] The classical score is presented as one lens and against the customary
      18-point threshold, never as a relationship or marriage verdict.
- [x] Every returned Ashtakoota point remains visible with earned, maximum, and
      colour-independent full/partial/no-points labels.
- [x] Both returned Moon profiles remain complete: sign, Nakshatra, Gana, Nadi,
      and Yoni.
- [x] Mangal/Kuja balance, Bhakoot status, exact contributing placements,
      additional Kutas, returned descriptions, and exceptions remain distinct.
- [x] A reading boundary names important non-astrological factors that the
      calculation cannot assess.
- [x] Saved checks reopen without recalculation; loading, calculation failure,
      unreadable saved data, reset, and no-partner states remain explicit.
- [x] Desktop and phone staging flows are keyboard-operable and retain all
      evidence; wide tables scroll inside their own frames on narrow screens.
- [ ] Owner has reviewed and approved the Marriage compatibility tab on
      staging.

### Marriage compatibility implementation evidence — 2026-07-27

- Vinay and Tara's live result remains 28/36. The exact Koota sequence remains
  Varna 1/1, Vashya 0.5/2, Tara 1.5/3, Yoni 2/4,
  Graha Maitri 3/5, Gana 5/6, Bhakoot 7/7, and Nadi 8/8.
- Both live Moon profiles remain exact: Vinay is Pisces / Uttara Bhadrapada /
  Manushya / Madhya / Cow; Tara is Capricorn / Shravana / Deva / Antya /
  Monkey.
- The live engine still reports both profiles as Manglik and explicitly says
  “Kuja Dosha balanced between partners.” The exact contributors remain
  Vinay's Mars in House 12/Sagittarius at +35 and Tara's Ketu in House
  12/Libra at +30.
- All seven live additional Kutas remain present. The Lagna/7th-house
  description and the Sex Energy insufficient-data statement remain exact;
  missing descriptions are labelled as not returned rather than invented.
- Four focused component contracts cover deliberate selection, complete live
  evidence, saved-result reopening, and actionable engine failure. The API
  additionally rejects self-comparison before reading profiles or calling the
  sidecar.
- Live authenticated desktop and 390 px phone checks completed the full
  selection-to-result journey and exposed the score, Moon profiles, Dosha
  evidence, tables, and boundary through semantic headings and labels.
- Isolated staging deployment `dpl_FGZr1Xuso69TU5SX5d4ZmjS6V2rE` is READY at
  `https://astro-unified-staging.vercel.app`; production was not changed.
- Automated gates: 79 test files / 567 tests passed; TypeScript, ESLint,
  palette, route, whitespace, local production build, and remote Vercel build
  passed.
