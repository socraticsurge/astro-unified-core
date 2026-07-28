# Astro Chaganti experience acceptance system

<!-- last-updated: 2026-07-26 -->

This document prevents the public site and signed-in product from drifting
through subjective redesign passes. It defines the primary user, the experience
contract, the current improvement backlog, and the loop required before a pass
can be called complete.

## Primary user: Ananya

Ananya is 36, uses her phone for most everyday tasks, and has a working interest
in Vedic astrology without being an astrologer. She visits Astro Chaganti in the
morning for today’s guidance, returns when choosing a date for an important
event, and occasionally explores her birth chart more deeply on a laptop.

She has saved profiles for herself and close family. She expects the product to:

- recognize which person she is exploring at all times;
- explain the next useful action without diluting astrological precision;
- let her move naturally from public daily guidance into personalized context;
- show charts that are legible and meaningful, not merely technically present;
- use the same Muhurtam workflow publicly and after sign-in, with personal
  validations clearly added after sign-in;
- preserve her place when switching tools or opening AI;
- work completely on a phone without clipped charts, mystery gestures, or
  desktop panels squeezed into the viewport;
- distinguish calculated facts, interpretive guidance, and human consultation;
- feel calm, trustworthy, and continuous from landing page to dashboard.

Her success test is simple: within ten seconds she can answer “whose chart is
this, what can I do here, and what should I look at first?”

## Experience contract

### 1. Landing-to-app continuity

- The landing page and dashboard share typography, parchment texture, border
  language, accent colour, icon restraint, spacing rhythm, and button hierarchy.
- Public labels and signed-in labels do not rename the same task.
- A public Muhurtam search becomes the same signed-in flow with personal
  validation—not a separate calculator.
- Signing in feels like gaining depth and continuity, not entering an unrelated
  admin product.

### 2. Orientation and navigation

- Desktop keeps a persistent, vertically scrollable left tool menu.
- Mobile uses one clearly labelled tool drawer generated from the same registry.
- The active profile, active group, and active tool are visible without
  scrolling.
- The profile name identifies the current subject; it does not open a redundant
  read-only profile drawer.
- Natal contains birth details, Panchangam at birth, D1, and D9.
- Edit profile is explicit, adjacent to identity, and opens editing directly.
- Future tools can be added to a group without creating another navigation
  system or horizontal overflow.

### 3. Chart quality

- D1 and D9 are legible at 320 px, tablet, and desktop widths.
- The chart is not constrained to an arbitrarily small fixed square on desktop.
- Every sign cell exposes its sign, house context where applicable, Lagna, and
  planets without relying on colour alone.
- Planet abbreviations, retrograde state, dignity colour, and SAV values have a
  visible legend or accessible explanation.
- The chart centre supplies useful context rather than an empty square.
- Chart labels, borders, cells, and supporting copy follow the same manuscript
  visual language as the landing page.
- A user can focus a chart without losing profile or chart identity.

### 4. Page grammar

Every tool follows:

1. context — what question this answers for the selected profile;
2. controls — only the inputs needed now;
3. result — the important answer first;
4. explanation — how to interpret or act on it;
5. next action — the most likely continuation.

The page must not repeat title, date, profile, or explanatory information merely
to fill card layouts.

### 5. Mobile and responsive behaviour

- No horizontal document overflow at 320, 390, 768, or 1440 px.
- Core content and actions are never hover-only.
- Touch targets are at least 40 px where space permits.
- Charts and dense tables transform deliberately instead of simply shrinking.
- AI is full-screen on mobile; navigation is a focused drawer.
- Persistent desktop navigation never consumes mobile content width.

### 6. Trust, accessibility, and states

- Computed facts are visually distinct from interpretation.
- Calculated data remains available if an optional narrative or AI provider
  fails.
- Loading, empty, unavailable, validation, and error states explain the next
  action.
- Keyboard focus, semantic labels, modal focus management, contrast, and reduced
  motion are verified.
- User-specific responses are private and never cached across users.

## Release checklist

A staging pass can be presented for owner review only when all blockers below
pass:

- [x] Desktop left navigation is present, grouped, scrollable, and functional.
- [x] Mobile tool drawer contains the same user-visible destinations.
- [x] Clicking the profile identity does not open a duplicate detail drawer.
- [x] Edit profile opens directly in edit mode.
- [x] Natal owns birth details, birth Panchangam, D1, and D9.
- [x] D1 and D9 meet every chart-quality requirement above.
- [x] Today, Natal, Planets, Dashas, Transits, Muhurtam, Tarabalam, Career, and
      Compatibility open and provide a useful next action.
- [x] Public and private Muhurtam use the same interaction language.
- [x] Explore with AI receives profile and tool context.
- [x] Landing page and dashboard pass a side-by-side visual continuity review.
- [x] 320, 390, 768, and 1440 px layouts have no overflow or clipped controls.
- [x] Keyboard, screen-reader names, loading, empty, and error states pass.
- [x] Type checking, lint, automated tests, production build, health checks, and
      deployed-browser checks pass.

## Complete-product convergence gate — 2026-07-27

The checklist above records the previous dashboard pass. It does not waive the
remaining whole-product work. This gate reopens acceptance at the level of every
surface and every role.

### Composite reviewers

Each surface must satisfy all six reviewers. Passing one perspective does not
compensate for failing another.

1. **Ananya, everyday user** — understands where she is, whose chart is active,
   what to do next, and can finish the task comfortably on her phone.
2. **Vinay, astrologer and administrator** — can review users, content,
   consultations, settings, and specialist calculations without entering a
   visually separate back-office product.
3. **Product designer** — sees one type system, one spacing rhythm, aligned
   geometry, intentional hierarchy, useful empty space, and responsive
   transformations rather than compressed desktop layouts.
4. **Engineer and tester** — can exercise success, loading, empty, invalid,
   unavailable, and retry states; controls produce the result they promise;
   visible counts match rendered results.
5. **Architect** — sees shared public/private primitives and contracts, clear
   separation between generic daily content and profile-derived readings, and
   no duplicated workflow that will drift independently.
6. **Accessibility and standards reviewer** — can navigate by keyboard and
   assistive technology, zoom content, use reduced motion, identify focus,
   understand labels and errors, and operate every task without colour,
   hovering, or a precision pointer.

### Information architecture

There are three explicit content layers:

- **Daily commons** — today’s Panchangam, generic moon-sign horoscope, and
  calendar subscription. These are available publicly and inside the signed-in
  product. They are not presented as personalized profile readings.
- **Profile intelligence** — natal chart, planets, dashas, transits, personal
  timing, Tarabalam, career, and compatibility. The active profile is always
  visible.
- **Human and AI guidance** — Explore with AI and Ask Dr Chaganti are distinct,
  clearly described continuations of the current context. Neither appears as a
  legacy utility drawer.

Public Muhurtam and signed-in Muhurtam are one task:

- the activity, timing window, review, calculation, results, visible count, and
  sharing language are the same;
- sign-in adds saved-profile selection and personal chart validations;
- personal validation is labelled as an additional layer and never silently
  replaces the general electional result;
- shared configuration and presentation primitives prevent public and private
  calculators from drifting.

### Surface matrix

> Historical convergence snapshot, not current approval. The detailed review
> has been reopened after hands-on staging feedback. Current status and
> tab-specific acceptance live in
> [`TAB_BY_TAB_REVIEW.md`](./TAB_BY_TAB_REVIEW.md).

Every row must pass desktop and mobile visual, functional, semantic, state, and
navigation checks.

- [x] Global header, profile switcher, Add profile, Ask Dr Chaganti, sign out,
      and admin entry.
- [x] Left tool rail: Current profile and Today share one alignment grid;
      groups, active state, footer action, scrolling, and future additions fit.
- [x] Add profile is a complete guided workspace, not a sidebar plus empty
      canvas; validation, cancellation, submission, and mobile keyboard flow
      pass.
- [x] Edit profile is visually related to Add profile and preserves the active
      context.
- [x] Ask Dr Chaganti is a centred desktop conversation surface and a
      full-screen mobile task with context, fees/modes, validation, success,
      error, and consultation continuation.
- [x] Explore with AI preserves context, history, keyboard behavior, mobile
      geometry, loading, failure, and close/return behavior.
- [x] Today contains personal guidance plus clearly separated daily commons:
      Panchangam, generic daily horoscope, and calendar subscription.
- [x] Natal chart, Planets, Divisional charts, Dashas, Transits, Muhurtam,
      Tarabalam, Yogas, Jaimini, Ashtakavarga, Shadbala, Career, and
      Compatibility each satisfy the five-part page grammar.
- [x] Private Muhurtam matches the public calculator and adds working
      profile-based validation plus WhatsApp sharing.
- [x] Tarabalam has a purpose-built selection and result experience rather than
      generic form/table styling.
- [x] Admin overview, People, Consultations, Content & Publishing, Operations,
      Settings, and every nested tab use the product design system and remain
      usable at phone, tablet, and desktop widths.
- [x] Generic daily data and profile data name their source/context and do not
      imply personalization that has not been computed.

### Geometry and visual acceptance

- [x] Header, rail, workspace, dialog, card, chart, control, and table edges
      align to documented spacing tokens; adjacent items do not differ by
      accidental 2–6 px offsets.
- [x] Display and interface fonts are used consistently by semantic role; raw
      browser or one-off font declarations are absent.
- [x] No widow caused by an unnecessarily narrow copy column, no clipped label,
      no overlapping symbol/content, and no avoidable single-word line.
- [x] Primary, secondary, quiet, and destructive actions are consistent across
      public, signed-in, and admin surfaces.
- [x] Dense data transforms to summaries/cards or intentionally scrollable
      regions on small screens; the document itself never overflows.
- [x] Motion communicates state or hierarchy, respects reduced-motion, and
      never blocks reading or interaction.

### Functional and quality acceptance

- [x] Real staging data exercises every available calculation; mutation paths
      have automated coverage and are not inferred from static rendering.
- [x] Navigation destinations, deep links, browser Back, refresh, profile
      switching, dialogs, drawers, and mobile menus preserve correct context.
- [x] Automated component/API tests, TypeScript, lint, and production build
      pass.
- [x] Browser verification passes at 1440, 768, 390, and 320 px with console,
      overflow, semantics, keyboard, focus, touch-target, and reduced-motion
      checks.
- [x] Staging health verifies database, sidecar, Panchangam services, and auth;
      deployment logs contain no unaccounted runtime errors.
- [x] Production remains unchanged until explicit owner promotion approval.

### Evidence — 2026-07-27 complete-product pass

- Final isolated staging deployment:
  `dpl_7T7FRaaMJfsiNPGch5dUuWuBBaUi`, READY and aliased to
  `astro-unified-staging.vercel.app`. Production was not changed.
- Automated gate: 67 test files and 499 tests passed. TypeScript, full affected
  interface lint, React quality review, and the Next.js production build
  passed.
- Real calculations: private Muhurtam returned canonical personally validated
  slots with Panchangam, activity, restricted-window, Tarabalam, Chandrabalam,
  and Lagna evidence. Exact result count and WhatsApp sharing were present.
  Tarabalam returned 14 day-by-day rows with birth-star classifications.
- Time-zone regression: deployed India-local defaults were verified as
  2026-07-27 through 2026-08-03 for Muhurtam and through 2026-08-09 for
  Tarabalam. A regression test prevents UTC ISO dates from returning.
- Every signed-in destination and every admin group/nested tab opened at
  desktop and 390 px. Representative whole-product checks passed at 1440,
  768, and 320 px. Document width equalled viewport width throughout.
- At 320 px, Add profile, Sign out, and Create profile measured 40, 40, and
  42 px high. Consultation was verified as a centred desktop dialog and a
  full-screen mobile task with focus on the question field.
- Daily commons loaded a computed Panchangam, generic Janma-Rasi guidance, and
  calendar subscription inside Today while explicitly naming the content as
  non-personalized.
- Runtime: browser console scans were clean; Vercel reported no error logs.
  `/api/health` reported Turso, DashaFlow sidecar, Panchangam backend, rehearsal
  boundary, and staging authentication ready.

## Evidence — 2026-07-26 staging pass

- Deployment: `dpl_9mzvPfgg8azH2MqXRia2K32jpfUY`, READY on the isolated
  `astro-unified-staging` project.
- Automated checks: 66 test files and 497 tests passed; TypeScript, focused
  interface lint, and the Next.js production build passed.
- Responsive browser checks: 1440×1000, 768×1024, 390×844, and 320×800. No
  document overflow was detected at any size.
- Desktop: persistent grouped rail verified across every destination; identity
  remained informational; profile editing opened directly.
- Mobile: shared tool drawer, full-screen AI dialog, profile editing, D1/D9,
  focused chart, planetary cards, Dasha cards, and all primary tool families
  verified.
- Chart semantics: sign, house, Lagna, planets, retrograde state, dignity, and
  focused-chart identity exposed visually and through accessible names.
- Muhurtam: the three-step signed-in flow was calculated against staging;
  personal validation evidence was readable at 390 px and did not overflow.
- Accessibility/state checks: semantic headings and regions, dialog focus,
  Escape dismissal, useful narrative-unavailable and no-result states, and
  accessible action names verified.
- Runtime checks: browser console error scan was clean; `/api/health` reported
  database, sidecar, Panchangam backend, and staging authentication ready;
  Vercel returned no recent error logs.

## Improvement wishlist

### P0 — required for the current pass

- Restore the useful desktop left tool menu and remove the duplicate top tool
  strip.
- Make profile identity informational; reserve the editor for “Edit profile.”
- Rebuild the South Indian chart as a responsive, self-explaining chart surface.
- Give Natal a clear chart-first hierarchy rather than treating D1/D9 as small
  supporting cards.
- Harmonize dashboard shell texture, borders, type scale, and actions with the
  public landing page.
- Verify every public tab, not only the five recently redesigned pages.

### P1 — should be included when it improves comprehension without scope risk

- Focused chart view for close reading on desktop and mobile.
- Chart legend and planet/sign detail affordances.
- Tool-specific contextual next actions.
- Preserve active tool in the URL for refresh, deep linking, and browser history.
- Better skeletons that match the final chart and result geometry.

### P2 — future enhancement

- Optional chart annotations and educational layers.
- User-selectable chart presentation preferences.
- Shareable private chart snapshots with deliberate privacy controls.
- Saved Muhurtam searches and comparison history.
- Personalized ordering of frequently used tools.

## Required iteration loop

Each implementation pass follows this sequence:

1. Audit the landing page and authenticated product side by side.
2. Score every release-checklist item as pass, fail, or not exercised.
3. Fix blockers before wishlist polish.
4. Run automated checks and a production build.
5. Deploy only to the isolated staging project.
6. Exercise real signed-in flows at 1440, 768, 390, and 320 px.
7. Inspect screenshots, DOM semantics, overflow, console errors, and backend
   health.
8. Repeat from step 2 until every blocker passes.

“Looks promising” is not a completion condition. The pass is ready only when the
checklist has evidence.
