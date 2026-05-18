# Changelog

All notable changes to Astro Chaganti are recorded here.

**Format:** `## [YYYY-MM-DD] — title` then `### Added / Changed / Fixed / Removed` bullets.  
**Rule:** Every push to `main` must add or update an entry. One session = one date entry.  
**Audience:** Future agents and developers — write enough that someone can understand what changed without reading the diff.

---

## [2026-05-18] — CareerTab layout reorganisation; CompareTab UX overhaul; scroll fix; design token additions

### Changed
- **CareerTab layout** (`components/unified/tabs/CareerTab.tsx`) — reorganised to reduce visual noise:
  - Removed "Career Analysis" meta-heading that appeared before any real content.
  - Moved **Key Significators** chips and **Career Themes** chips into the left column, below the D10 NatalChartGrid — contextually paired with the chart they annotate.
  - Right column now starts directly with the small inline **Refresh** button (top-right, no heading above it), followed immediately by the 10th House section, D10 Planetary Positions table, and Indicators.

### Fixed
- **ProfileView scroll** (`components/profiles/ProfileView.tsx`) — outer div changed from `flex flex-col min-h-0` to `h-full flex flex-col min-h-0` so the `flex-1 overflow-y-auto` tab panel correctly gets a constrained height and scrolls. All tabs (especially Compare with its long result) can now be scrolled.

### Changed
- **CompareTab** — third iteration addressing UX issues:
  - **Full names**: removed all `.split(" ")[0]` truncation everywhere in the tab.
  - **Dropdown picker**: candidate selection changed from chips to a native `<select>` — one name visible, clean, no horizontal overflow.
  - **Clear / blank state**: `×` button next to the select resets the tab back to empty state.
  - **Token colours**: all hardcoded `rgba()` values replaced with design system tokens. Dosha cards now use `--color-success-faint/border` and `--color-danger-faint/border`. Groom/bride name tints use `--color-compat-groom` and `--color-compat-bride`. Score colours use `--color-success/warning/danger`.
  - **Section structure**: result sections now use `<section>` + `SectionHeading` matching the rest of the unified tabs.

### Added
- **`app/globals.css`** — new design tokens (dark + light themes, registered in `@theme inline`):
  - `--color-success-faint`, `--color-success-border` — green tinted backgrounds / borders
  - `--color-danger-faint`, `--color-danger-border` — red tinted backgrounds / borders
  - `--color-compat-groom`, `--color-compat-bride` — compatibility persona accent colours

---

## [2026-05-18] — Fix stale engine cache; restyle CareerTab

### Fixed
- **Stale engine cache** (`app/api/readings/career/route.ts`, `app/api/readings/dashaflow/route.ts`) — cached readings were returned unconditionally even if the profile's birth data had since been edited. The GET handler now builds the `input` object first, then checks `birthDataChanged()` against the cached `input_snapshot` before serving the cache. If birth data changed, the cache is skipped and a fresh result is computed. New helper: `lib/engines/cache-validate.ts`.

### Changed
- **CareerTab** restyled to match PlanetsTab/AshtakavargaTab conventions: plain `<section>` elements with `SectionHeading`, `divide-y` row separators instead of bordered card boxes, `TABLE_STYLES` for the D10 planetary table, and `DIGNITY_COLORS` / `text-planet-name` / `text-dignity-exalted` tokens throughout. Refresh button now always visible (not only when data is absent). D10 planetary table now shows all 9 planets ordered by `PLANET_ORDER`, with primary significators bolded.

---

## [2026-05-18] — CompareTab: persistent chip picker, full compatibility result

### Changed
- **CompareTab** — second rewrite addressing UX and completeness:
  - **No more back-navigation**: picker is now a persistent chip row at the top of the tab. Tapping a different candidate chip immediately swaps the result below — no "Compare another" back button needed.
  - **Compact chips**: active profile and candidates are shown as small rounded chips (avatar + first name) not full-width list rows. Active profile is always shown on the left; candidates on the right.
  - **Full result** now shows all compatibility sections in compacted form using shared `TABLE_STYLES` / `SectionHeading` tokens:
    - Score arc + tier label + verdict text
    - Guna Breakdown as a proper table (Koota / Score / Max / indicator icon)
    - Natal Moon Profiles — two-column: moon sign, nakshatra, gana, nadi, yoni per person
    - Dosha summary — Mangal Dosha (with per-person Manglik status and description) + Bhakoot
    - Kuja Dosha Detail — per-person planet breakdown table (only shown when breakdown data exists)
    - Additional Kutas — one row per kuta with ResultPill, male/female values, and description
    - Dosha Mitigations / exceptions (amber-toned block, shown when classical exceptions apply)
- **ProfileAvatar** — added `xs` size (20 px / 0.6 rem) for use in compact chip contexts.

---

## [2026-05-18] — CareerTab: surface lord dignity, occupants, and D10 significator strength

### Changed
- **CareerTab** (`components/unified/tabs/CareerTab.tsx`) — expanded career analysis display using fields the sidecar already returns but were not shown:
  - **10th House block** now shows lord dignity (colour-coded via `DIGNITY_COLORS` tokens: exalted → debilitated), lord's D1 sign, and 10th house occupants alongside the existing lord/house/D10 fields.
  - **Significators in D10 table** (new) — one row per primary planet (10th lord + 10th house occupants), showing their D10 sign, D10 lord, and a ✓ when they are exalted or in own sign in D10. Uses shared `TABLE_STYLES` (`th`, `td`, `row`) and `text-planet-name` / `text-dignity-exalted` tokens.
  - Career themes and Indicators sections wrapped in `SectionHeading` for visual consistency with other tabs; career theme labels now have underscores replaced with spaces.
  - No new API calls or sidecar changes — all data was already in the `/career` response.

---

## [2026-05-18] — Compare tab: inline compatibility with smart gender roles

### Changed
- **CompareTab** (`components/tabs/CompareTab.tsx`) — full rewrite. Was a stub with broken links; now a self-contained inline compatibility flow:
  - **Smart gender role assignment** — active profile's gender determines their role (male → Groom, female → Bride, unset → Person A). Only opposite-gender profiles are shown as candidates; if active gender is unknown all other profiles are shown.
  - **Profile picker** — clicking a candidate immediately POSTs to `/api/compatibility` (which is idempotent — returns an existing result if the pair was already checked, otherwise calls the sidecar and saves).
  - **Inline result** — Score arc (out of 36), verdict banner, Guna breakdown table with full/partial/zero indicators, Mangal Dosha card, Bhakoot Dosha card. No navigation away from the dashboard.
  - **"Compare another" back button** — resets to profile picker without leaving the tab.

---

## [2026-05-18] — UI refinements: Bhava Chalit to Planets tab, sidebar Panchang strip, transit cleanup, larger charts

### Changed
- **Bhava Chalit moved into PlanetsTab** — shifts summary and full house table now live alongside planet positions and Shadbala; removed from HousesVargasTab (it remains there for the compact lookup context in that tab).
- **ProfileSidebar Panchang** restyled from card grid to inline flex strip, matching the IdentityStrip layout used in ChartTab.
- **TransitsTab** — removed Rahu/Ketu axis strip; the information is redundant with the planet table rows for Rahu and Ketu.
- **NatalChartGrid** `CHART_SIZE_PX` bumped 240 → 260px for improved readability across all chart instances.

---

## [2026-05-18] — Visual consistency: full domain token sweep across all unified components

### Added
- **9 domain color tokens** in `app/globals.css` (`@theme inline`): dignity scale (exalted → debilitated), planet retrograde, planet combust, planet name. Values defined for both dark and light themes.
- **`TABLE_STYLES`** exported from `components/unified/types.ts` — single source for `th`, `td`, and `row` class strings; all tab tables now consume this.
- **`SectionHeading`** component (`components/unified/SectionHeading.tsx`) — replaces repeated inline `h3` pattern across every tab.

### Changed
- **All hardcoded Tailwind color classes removed from `components/unified/`** — every color in the content layer (dignity, retrograde, combust, SAV/BAV scores, Sade Sati banners, planet name highlights, Kaal Sarpa, Graha Yuddha) now resolves through `globals.css` tokens. Affected files: `PlanetsTab`, `HousesVargasTab`, `YogasTab`, `DashaTab`, `JaiminiTab`, `AshtakavargaTab`, `CareerTab`, `TransitsTab`, `ChartTab`, `TimeTab`, `PatternsTab`, `IdentityStrip`, `NatalChartGrid`, `SavChartGrid`.
- Changing any domain color (e.g. "exalted dignity", "Sade Sati warning") now requires editing one line in `globals.css` — both dark and light themes update automatically.

---

## [2026-05-18] — Elevated tabs: Yogas, Jaimini, Ashtakavarga; Divisional rename; Planets cleanup

### Added
- **YogasTab** (`components/unified/tabs/YogasTab.tsx`) — primary tab combining Yogas (2-col) + Doshas (2-col) sections, elevated from Patterns sub-tab.
- **JaiminiTab** (`components/unified/tabs/JaiminiTab.tsx`) — primary tab for Jaimini indicators: Chara Karakas, Karakamsha, Arudha Padas, Upapada.
- **AshtakavargaTab** (`components/unified/tabs/AshtakavargaTab.tsx`) — primary tab with SAV chart (SavChartGrid) + BAV per-planet table.

### Changed
- **ProfileView** — new 10-tab layout: `Today | Planets | Divisional | Yogas | Jaimini | Ashtakavarga | Dasha | Transits | Career | Compare`. Removed `Patterns` tab (content split into three elevated tabs).
- **Planets tab** — removed "Yogas by Planet" section; yoga participation is still shown as a ✦ tooltip badge on each planet row in the Positions table.
- **Houses tab renamed to "Divisional"** — clearer name for a tab containing divisional charts, Bhava Chalit, house occupants, and Varga Matrix. Removed the "Lagna across Vargas" chip strip (lagna is already highlighted in each chart).

---

## [2026-05-18] — Chart sizing, inline edit, SAV chart, antardasha accordion, 2-col patterns

### Added
- **SavChartGrid** (`components/unified/SavChartGrid.tsx`) — South Indian 4×4 grid showing SAV bindus per sign. Green ≥28, red <22. Rendered in PatternsTab → Ashtakavarga sub-tab, replacing the horizontal table.
- **Inline edit in ProfileSidebar** — "Edit" button opens a compact form in the sidebar itself (no redirect). Fields: name, relationship, gender, DOB, TOB, place of birth, current location. Save POSTs to `/api/profiles/:id` and reloads the page. Cancel dismisses.
- **CHART_SIZE_PX = 200** exported from `NatalChartGrid.tsx`. All chart instances read this constant; changing it in one place resizes charts everywhere.

### Changed
- **ProfileSidebar** — D1 and D9 charts now stack vertically (was side-by-side) giving each chart 200 px. Profile info now shows gender and current location in addition to DOB, time, and birthplace.
- **CareerTab** — D10 chart and career analysis are now side-by-side (`flex-row` on sm+), making better use of horizontal space.
- **DashaTab** — Maha Dasha timeline rows are now accordion buttons. Clicking a row expands its `antardashas[]` array (if provided by sidecar). Current maha row auto-expands on load. Current antardasha sub-row is highlighted.
- **PatternsTab** — Yogas changed from single-column to `grid-cols-2` on sm+. Doshas changed from single-column to `grid-cols-2` on sm+.

---

## [2026-05-18] — Sidebar layout, dedicated Dasha/Transits/Career tabs, 4-per-row divisional charts

### Added
- **ProfileSidebar** (`components/profiles/ProfileSidebar.tsx`) — persistent left panel (w-80, visible md+) per profile. Shows: name + edit link, birth date/time/place, natal panchang in a 2-col compact grid, and D1 + D9 NatalChartGrid side by side.
- **TransitsTab** (`components/unified/tabs/TransitsTab.tsx`) — standalone primary tab for today's transits. Auto-fetches on mount, shows Sade Sati alert, Rahu/Ketu axis row, and per-planet transit table.
- **CareerTab** (`components/unified/tabs/CareerTab.tsx`) — standalone primary tab with D10 chart at top (using NatalChartGrid), followed by 10th house details, career themes chips, and strength indicators.
- **DashaTab** (`components/unified/tabs/DashaTab.tsx`) — simplified replacement for TimeTab. Shows current 5-level Vimshottari period and full Maha Dasha timeline table; no sub-tabs.

### Changed
- **ProfileView** — new tab set: `Today | Planets | Houses | Patterns | Dasha | Transits | Career | Compare`. Removed `Chart` tab (D1/D9 moved to sidebar; planet positions already in Planets tab). Removed `Time` tab (split into Dasha + Transits + Career). `onExplore` in TodayTab now navigates to `planets`.
- **DashboardClient** — main content area now uses `flex` row: ProfileSidebar (hidden on mobile, always visible on md+) + flex-1 ProfileView column.
- **HousesVargasTab** — divisional charts grid changed from `grid-cols-2 sm:grid-cols-3` compact to `grid-cols-4` full-size with `overflow-x-auto` wrapper (minimum 560px). Lagna-across-vargas strip moved here from ChartTab.

---

## [2026-05-18] — Natal chart grids, divisional charts, guided UX improvements

### Added
- **NatalChartGrid** — reusable South Indian 4×4 chart grid (`components/unified/NatalChartGrid.tsx`). Accepts any divisional sign key (`sign`, `d9_sign`, etc.), computes house numbers relative to lagna, colours planets by dignity (D1 only), marks lagna cell, supports `compact` mode for thumbnail grids.
- **D1 + D9 charts in ChartTab** — "Birth Chart" section at the top shows the Rasi (D1) and Navamsa (D9) grids side by side.
- **Divisional chart grid in HousesVargasTab** — 2–3 column grid of compact charts for all 14 divisionals (D2–D60). Only charts with data render; charts with no backend data are omitted cleanly.

### Changed
- **AskPanel** — after submitting a question, shows a confirmation state: "An astrologer will respond within 2 days." Panel resets on close.
- **Profile transition animation** — switching profiles triggers a 200ms fade-in (`animate-profile-enter` keyframe in globals.css). The re-keyed wrapper ensures stale data from the previous profile never bleeds through.
- **First-user journey** — `app/dashboard/page.tsx` now redirects unauthenticated first-time users (no profiles) directly to `/profiles/new` instead of showing an empty state.
- **Font consistency** — all sub-tab buttons (`text-[11px]`) bumped to `text-xs` with `py-1.5` tap target. All section labels and badges inside PatternsTab, TimeTab normalised to `text-xs` minimum. `text-[10px]` retained only for intentional caption/legend lines.
- **HousesVargasTab** — added SAV legend (≥28 favorable · <22 challenging). D9 and D10 columns highlighted in Varga Matrix. Panchang section header updated to "Panchang at Birth" for clarity.

---

## [2026-05-18] — UX polish pass: flat tables, inline edit, simplified ask panel

### Changed
- **ProfileChip** — chips now show full name + `· relationship` on a single line (e.g. "Venkata · Spouse") instead of a two-line stacked layout.
- **PlanetsTab** — replaced expandable cards with three flat tables: Positions, Shadbala (all numeric columns), Yogas by Planet. Retro/Combust are separate columns; planet name gets a ✦ dot if it participates in a yoga.
- **ChartTab** — Retro and Combust split into their own columns; D1 lagna uses a left-border accent instead of a highlight background; table body upgraded to `text-sm`.
- **TimeTab (Timeline sub-tab)** — replaced accordion with a flat maha dasha table (Planet · Start · End · Duration in years); current period is highlighted in place.
- **TodayTab** — removed redundant "Ask an expert" bottom button; hero card shows dasha date range; section text bumped to `text-xs`; content constrained to `max-w-xl`.
- **AskPanel** — stripped topic-picker fieldset entirely; now just context block + free-text textarea + submit. Submit disabled until question is non-empty.
- **ProfileView** — added an Edit link at the right edge of the tab bar linking to `/profiles/[id]/edit`; fixed `lagnaSign` prop forwarded to HousesVargasTab.
- **PatternsTab + `lib/insights.ts`** — fixed MAJOR_YOGAS name set to include "Yoga" suffix (e.g. "Malavya Yoga") matching the sidecar's production output format.

### Tests
- Updated ProfileChip, ProfileNav, AskPanel, PlanetsTab tests to match new UI shape.

---

## [2026-05-18] — Navigation redesign: chip-first profile nav and unified dashboard shell

### Added
- **ProfileNav** — horizontal scrollable chip row in the top bar. Each chip shows a profile name; the active chip is highlighted. A ✦ Ask button opens the AskPanel with chart context pre-filled.
- **ProfileChip** — individual chip component with active/inactive states and an optional alert dot.
- **DashboardClient** — new root interactive shell at `app/dashboard/DashboardClient.tsx`. Owns all interactive state: active profile chip, chart/transit/career engine fetch results, Ask panel open/context.
- **ProfileView** — 7-tab profile shell (`components/profiles/ProfileView.tsx`): Today, Chart, Planets, Houses, Patterns, Time, Compare. Full ARIA tablist pattern throughout.
- **TodayTab** — dasha hero card (maha · antar, shift pill when ≤8 weeks) + up to 5 insight cards with Ask/Explore CTAs.
- **TodayInsightCard + `lib/insights.ts`** — rule-based insight generator: imminent antardasha transition, Sade Sati, Kaal Sarpa, significant Jupiter transit, major yogas (up to 5 insights total).
- **CompareTab** — lists other profiles linking to `/compatibility/[id]?with=[otherId]`; empty state links to profile creation.
- **PatternsTab sub-tabs** — 4 sub-tabs (Yogas, Doshas, Jaimini, Ashtakavarga) with full ARIA tablist.
- **TimeTab sub-tabs** — 4 sub-tabs (Current Period, Timeline, Transits, Career) with lazy fetch for transit and career engines.
- **DashaTimeline + DashaRow** — recursive expandable accordion for 5-level dasha nesting; graceful fallback when sidecar returns flat data only.
- **NavBar** replaced — removes section-nav (Dashboard / Compatibility / Consultation links) and replaces with ProfileNav chips. Settings moved to a DropdownMenu (account settings, theme toggle, admin, sign out).
- **shadcn `dropdown-menu`** installed (base-ui variant).

### Changed
- `app/dashboard/page.tsx` — now renders `DashboardClient` and accepts `?profile=<id>` query param for deep-linking a specific chip.
- `app/profiles/[id]/page.tsx` — now redirects to `/dashboard?profile=<id>` (deep-link redirect into chip nav).

---

## [2026-05-18] — Full Chart (Experimental): unified single-view with 5 tabs

### Added
- **Full Chart (Experimental)** — third view mode on profile pages (admin-gated). Unified single-view intended to replace Basic/Professional once validated. Five intent-based tabs: Chart (panchang + planet table), Planets (per-planet shadbala bars + avastha + aspects), Houses & Vargas (Bhava Chalit + varga matrix), Patterns (yogas + doshas + Jaimini + Ashtakavarga BAV), Time (dasha stack + transits + career D10).
- **Aspects column** — BPHS planet aspects surfaced in the planet table for the first time, reading `planets[N].aspects` from the sidecar (previously ignored).
- **Per-planet BAV tables** — Bhinnashtakavarga sign-by-sign bindus per planet (Bhinnashtakavarga), previously present in the sidecar response but never displayed.
- **House Grid** — compact 12-box D1 + D9 visual in a sticky left panel (desktop only), showing which planets occupy each house.
- **Bhava Chalit shift summary** — shifted planets highlighted with Rasi→Bhava house alongside full Bhava Chalit table.
- **Karakamsha + Ishta Devata** surfaced as a featured card in the Jaimini section (previously one buried line).
- **Identity Strip** — persistent header chip row showing lagna, moon nakshatra, current dasha pair, and Sade Sati badge when active.
- `components/unified/` component tree: `UnifiedView`, `IdentityStrip`, `HouseGrid`, `ChartTab`, `PlanetsTab`, `HousesVargasTab`, `PatternsTab`, `TimeTab`, `types.ts`.

### Changed
- Profile page view toggle widened from 2-button (Basic / Professional) to 3-button (Basic / Professional / Full Chart) — admin-only.

---

## [2026-05-17] — Polish: global selection, scrollbar, tap highlight, placeholder, focus ring, shadow tokens

### Added
- **`::selection` colors** in `globals.css` — both themes use `--color-accent-faint` background so highlighted text matches the brand accent.
- **Scrollbar styling** — thin 6px webkit scrollbar + Firefox `scrollbar-width: thin` using `--color-border` / `--color-ink-4` tokens; invisible on clean layouts, visible on hover.
- **`-webkit-tap-highlight-color: transparent`** on `*` — removes default blue flash on mobile tap; keyboard focus still shows the accent ring.
- **`::placeholder` color** — `var(--color-ink-4)` with `opacity: 1` (Firefox fix); all inputs share the same subtle placeholder hierarchy.
- **`:focus-visible` ring** — `2px solid var(--color-accent)` at 2px offset; `:focus:not(:focus-visible)` suppresses the ring for mouse/touch so it's keyboard-only.
- **`shadows` export** in `lib/typography.ts` — `{ card, elevated }` CSS-var references for inline `boxShadow` use; theme-aware (dark: glow, light: hard offset).

---

## [2026-05-17] — Layout & navigation: view transitions, PageHeader, tab fix, chart skeleton

### Added
- **`@view-transition { navigation: auto; }`** in `globals.css` — free cross-fade between all page navigations; profile avatar morphs from list → detail via shared `viewTransitionName`. No library, no JS.
- **`components/PageHeader.tsx`** — shared header (back chevron, title, subtitle, actions slot). Used on every sub-page; future pages get consistent navigation for free.
- **`components/ChartSkeleton.tsx`** — shimmer skeleton mirroring the Dashaflow section structure; shown while chart data fetches so users see content shape, not a blank spinner.
- **`app/profiles/[id]/loading.tsx`** — Next.js route-level loading file; shows a full-page profile + chart skeleton automatically during page navigation (before client mounts).

### Changed
- **`components/dashboard/ProfileList.tsx`** — added monogram avatar to each profile card with `viewTransitionName` keyed to profile id; enables shared element transition to detail page.
- **`app/profiles/[id]/ProfileDetailClient.tsx`** — PageHeader replaces inline h1+edit pattern; ChartSkeleton replaces full-screen spinner during chart fetch; avatar gets matching `viewTransitionName`.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — PageHeader replaces inline ArrowLeft back link.
- **`app/consultation/page.tsx`** — PageHeader replaces inline h1.
- **`app/profiles/new/page.tsx`** and **`app/profiles/[id]/edit/page.tsx`** — PageHeader replaces ad-hoc flex-row ChevronLeft+h1 patterns.
- **`components/engines/ProfessionalView.tsx`** — tab strip is now `overflow-x-auto scrollbar-none scroll-smooth flex` at all sizes; tabs have `shrink-0`; no more `flex-col sm:flex-row` vertical stacking on mobile.

---

## [2026-05-17] — Shared PageHeader component; consistent back navigation across all sub-pages

### Added
- `components/PageHeader.tsx` — shared page header with optional `back` chevron-left button, `title`, `subtitle`, and `actions` slot. Eliminates ad-hoc per-page header patterns.

### Changed
- `app/profiles/[id]/ProfileDetailClient.tsx` — added `PageHeader` (back="/dashboard", title=profile.name, subtitle=relationship) as the first element; removed the duplicate `h1` and pencil-edit `Link` from inside the glass card.
- `app/compatibility/[id]/CompatibilityDetailClient.tsx` — replaced the inline `ArrowLeft` back link with `PageHeader` (back="/compatibility", title="Groom × Bride", subtitle="Compatibility reading").
- `app/consultation/page.tsx` — replaced the `<h1 style={textStyles.pageTitle}>` block with `PageHeader` (back="/dashboard").
- `app/profiles/new/page.tsx` — replaced the ad-hoc flex-row ChevronLeft+h1 with `PageHeader` (back="/dashboard", title="New Birth Profile").
- `app/profiles/[id]/edit/page.tsx` — replaced the ad-hoc flex-row ChevronLeft+h1+subtitle with `PageHeader` (back="/profiles/:id", title="Edit Profile", subtitle=profile.name).

---

## [2026-05-17] — Spacing tokens, responsive type scale, mobile token overrides

### Added
- **Spacing tokens** (`--space-1` through `--space-16`) in both `[data-theme]` blocks. Export `spacing` from `lib/typography.ts` for use in inline styles. Tighten density app-wide by editing one block in `globals.css`.
- **Responsive overrides block** in `globals.css` (`@media (max-width: 639px)`): radii, motion timing, shadow depth, blur intensity, type sizes, and spacing all automatically adjust on mobile — zero component changes needed. Key differences:
  - Dark theme: radii shrink 4px each step, motion 300ms→220ms, blur lightens, page title 2.2rem→1.75rem
  - Light theme: motion 180ms→140ms, hard shadows halve, same type reductions

### Changed
- **`lib/typography.ts` — `scale`** values are now CSS variable references (`var(--fs-page-title)` etc.) instead of hardcoded rem values. Components using `textStyles` automatically get responsive type sizing from the breakpoint override block — no component changes needed.

---

## [2026-05-17] — Theme layer: runtime dark/light toggle with CSS custom properties

### Added
- **`lib/theme.ts`** — theme registry; adding a new theme = one entry here + one CSS block in `globals.css`. Zero component changes required.
- **`components/ThemeProvider.tsx`** — next-themes wrapper; sets `data-theme` on `<html>`, persists to localStorage, no flash on reload (`suppressHydrationWarning` on `<html>`).
- **`components/ThemeToggle.tsx`** — cycles themes on click; visible in desktop nav right cluster and mobile utility strip.
- **`motion` token** in `lib/typography.ts` — theme-aware timing/easing for inline `transition` values (`motion.standard`, `motion.fast`, `motion.slow`, `motion.exit`).

### Changed
- **`app/globals.css`** — replaced `.dark {}` with `[data-theme="dark"]`; added full `[data-theme="light"]` (Archival: parchment background, crimson accents, near-square corners, snappy transitions); added semantic ink/surface/accent/status tokens to `@theme inline`; shadcn variables now remap to our semantic tokens so shadcn components participate in theming automatically; `@custom-variant dark` updated to target `[data-theme="dark"]`.
- **`lib/typography.ts`** — all hardcoded `rgba()` and `px` values replaced with `var(--*)` references. `glass`, `radii`, `interactive`, `colors`, `fonts` are now fully theme-aware. Added `mono`/`monoMedium` font tokens.
- **`app/layout.tsx`** — preloads 5 font families (Philosopher + Mulish for dark; Libre Baskerville + Inter + JetBrains Mono for light) with renamed CSS variables (`--font-display-dark`, `--font-ui-dark`, `--font-display-light`, `--font-ui-light`, `--font-mono-light`); removed hardcoded `dark` class from `<html>`; wraps app in `ThemeProvider`.
- **All ~45 components** — migrated from scattered `bg-white/5`, `border-white/10`, hardcoded rgba, hardcoded px radius, hardcoded transition strings to semantic theme tokens. See phase entries below for per-file detail.

### How to add a third theme
1. Add one `[data-theme="new-theme"]` block to `app/globals.css` with all token values.
2. Add one entry to `THEMES` in `lib/theme.ts`.
3. Zero component changes required.

---

## [2026-05-17] — Theme tokens: migrate admin, feedback, and engine files (phase 5)

### Changed
- **`app/admin/AdminTables.tsx`** — migrated all hardcoded Tailwind color values to CSS custom property tokens: table borders/backgrounds (`--color-border`, `--color-surface-1`, `--color-surface-hover`), text colors (`--color-ink-2`, `--color-accent`, `--color-success`, `--color-danger`), slot list items, draft panel surface, and toggle component.
- **`components/FeedbackWidget.tsx`** — migrated `border-white/10`, `border-white/5`, `hover:bg-white/5`, and `text-emerald-400` to theme tokens.
- **`components/admin/LlmSettingsPanel.tsx`** — migrated all `border-white/10`, `bg-white/5` (inputs and panel backgrounds), and error `text-red-400` to theme tokens.
- **`components/ui/ModelPicker.tsx`** — migrated `hover:text-white/70` and `hover:border-white/10` to `--color-ink-2` and `--color-border`.
- **`components/engines/ProfileChat.tsx`** — migrated all surface, border, text contrast, copy-button, and inline code chip colors to theme tokens. Left violet accent colors (`text-violet-400`) as-is (not in migration table).
- **`components/engines/DashaflowView.tsx`** — migrated `text-amber-300` and `text-amber-400` (non-chart) to `--color-accent`. Left chart data colors and `text-amber-400/60` as-is.
- **`app/profiles/new/page.tsx`** — migrated `hover:bg-white/10` back-button to `--color-surface-hover`.
- **`app/profiles/[id]/edit/page.tsx`** — migrated `hover:bg-white/10` back-button to `--color-surface-hover`.

---

## [2026-05-17] — Theme tokens: migrate compatibility surfaces (phase 4)

### Changed
- **`components/compatibility/CompatibilityClient.tsx`** — migrated all hardcoded color/radius/motion values to CSS custom property tokens: `--color-surface-1`, `--color-border`, `--color-ink-{1-4}`, `--color-accent-faint`, `--color-danger`, `radii.lg/md/full`, `motion.standard`, `--backdrop-blur`. Added `motion` to typography import. Left CTA button gradient and ScoreRing SVG stroke colors as-is.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — migrated Tailwind utility classes (`bg-white/5`, `border-white/10`, `text-white/70`, etc.) and inline rgba values to theme tokens. Added `motion` to typography import. Left ScoreArc SVG and role-specific profile colors as-is.

---

## [2026-05-17] — Bug fixes: compatibility deletion, profile edit discoverability

### Added
- **Compatibility check deletion** — fully implemented end-to-end:
  - `lib/db/compatibility.ts` — `delete(id, userId)` DB function.
  - `app/api/compatibility/[id]/route.ts` — authenticated DELETE handler with ownership check.
  - `components/compatibility/CompatibilityClient.tsx` — trash icon on each past-reading row; optimistic removal on success.
- **Edit button on profile detail page** — pencil icon next to the profile name ensures the edit path is always discoverable, even for fully-complete profiles that don't show the "Complete profile →" badge.

### Fixed
- Profile editing was inaccessible for profiles with all fields filled (relationship, gender, current_location all set). The "Complete profile →" badge only appears when something is missing; now a persistent edit icon in the header guarantees the path is always visible.

---

## [2026-05-17] — Navigation UX: centralized config, label fixes, flow improvements

### Added
- **`lib/nav.ts`** — single source of truth for section identity (href, label, mobile short, page title). Changing a nav label or page title is now one edit in one file; NavBar, page headings, and mobile tabs all derive from it automatically.
- **Consultation CTA** on chart detail and compatibility detail pages — low-friction path from chart/result to consultation without naming a specific person.

### Changed
- **`components/NavBar.tsx`** — logo now links to `/dashboard` for logged-in users (was `/`, which added a redirect hop). Nav labels updated from nav.ts: "Kundali Matching" → "Kundali", "Get Consultation" → "Consult". Mobile sign-out demoted from primary tab to a small utility strip below the tabs; removed misleading "Exit" label.
- **`app/dashboard/page.tsx`** — single-profile shortcut: users with exactly one profile are redirected directly to their chart, skipping the list entirely.
- **`app/consultation/page.tsx`** — page title derived from nav.ts; uses `textStyles.pageTitle` token.
- **`components/compatibility/CompatibilityClient.tsx`** — page title from nav.ts.
- **`components/dashboard/ProfileList.tsx`** — page title from nav.ts (both empty-state and populated headings).
- **`app/profiles/[id]/ProfileDetailClient.tsx`** — current-location nudge changed from red/destructive to amber/informational; copy changed from "Muhurtha and Transit features require your current location" to "Add your current location to unlock transit and auspicious timing features."

---

## [2026-05-17] — Design system: radii tokens, glass surface, centralised score colours

### Added
- **`lib/typography.ts`** — `radii` token: `sm` (12px), `md` (16px), `lg` (20px), `full` (999px). Every surface now references a named radius instead of a raw pixel value.
- **`lib/compatibility.ts`** — `scoreColor(score)` and `scoreLabel(score)` helper functions. The Ashtakoota colour thresholds (26/18/12) and corresponding label text live in one place.

### Changed
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — removed local `glassCard` const; imports `glass` + `radii.lg` from typography. `ScoreArc` uses `scoreColor`/`scoreLabel` from compatibility.
- **`app/consultation/ConsultationForm.tsx`** — removed local `glassCard` const; uses `glass` + `radii.lg`. All non-standard radii normalised: `14px` → `radii.md`, `10px`/`12px` → `radii.sm`.
- **`components/compatibility/CompatibilityClient.tsx`** — `ScoreRing` uses `scoreColor`; error banner uses `radii.sm`.

---

## [2026-05-17] — Add interactive state tokens to design system

### Added
- **`lib/typography.ts`** — `interactive` constant with four semantic Tailwind class strings: `card`, `listRow`, `ghostButton`, `slotButton`. Single place to change hover/active/transition feel across the whole app.

### Changed
- **`components/profile/ProfileSelectorCard.tsx`** — removed inline `transition` string; non-incomplete variant now uses `interactive.card` via className.
- **`components/compatibility/CompatibilityClient.tsx`** — past-readings rows removed inline `transition`/`cursor`; now use `interactive.listRow` via className.
- **`app/consultation/ConsultationForm.tsx`** — slot buttons removed inline `transition`/`cursor`; now use `interactive.slotButton` via className.

---

## [2026-05-17] — Design audit: typography token cleanup, border-radius normalization

### Changed
- **`app/admin/page.tsx`** — page heading now uses `textStyles.pageTitle`; added missing `textStyles` import.
- **`app/profiles/[id]/ProfileDetailClient.tsx`** — profile name heading uses `textStyles.pageTitle`.
- **`components/compatibility/CompatibilityClient.tsx`** — "Kundali Matching" heading uses `textStyles.pageTitle`; five raw `fontFamily` inline strings replaced with `fonts.*` tokens.
- **`app/consultation/ConsultationForm.tsx`** — five raw `fontFamily` strings replaced with `fonts.*` tokens; slot button `borderRadius` normalized from `"14px"` to `"16px"`.
- **`components/profile/ProfileSelectorCard.tsx`** — selected avatar background uses `colors.goldFaint` token instead of raw rgba.
- **`lib/typography.ts`** — added `glass` surface style (backdrop blur + light background); added `clamp.one` / `clamp.two` overflow utilities.

---

## [2026-05-17] — Consistent name clamping and equal-height card pairs across all profile UIs

### Added
- **`lib/typography.ts`** — `clamp.one` (single-line, ellipsis) and `clamp.two` (two-line, webkit-box) utilities. Apply to any name inside a card; changing the strategy is a one-line edit here.

### Changed
- **`components/profile/ProfileSelectorCard.tsx`** — name uses `clamp.one`; card gets `height: 100%` so CSS grid rows equalize all cards in a row automatically.
- **`components/compatibility/CompatibilityClient.tsx`** — SeatCard name uses `clamp.two`; parent container switches to `align-items: stretch` with flex column wrappers; `cardBase` gets `flex: 1` so both portrait cards are always the same height regardless of name length.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — Groom and Bride names use `clamp.one`.

---

## [2026-05-17] — Design system: color palette, text levels, ProfileAvatar, ProfileSelectorCard

### Added
- **`lib/typography.ts`** — extended with `colors` (semantic palette: primary/secondary/tertiary/muted/faint/gold/goldDim/goldFaint/success/warning/danger) and `textStyles` (composed text level objects: pageTitle, sectionHead, subhead, stepLabel, body, bodyMedium, small, label, meta). All font+size+color combinations now live in one place.
- **`components/profile/ProfileAvatar.tsx`** — reusable avatar circle: `name` (initials auto-derived), `size` (sm/md/lg/xl), `color`, `textColor`. Uses `fonts.displayBold` consistently.
- **`components/profile/ProfileSelectorCard.tsx`** — compact selectable profile card (vertical, glass, amber selected state). Props: `name`, `subtitle`, `selected`, `onSelect`, `incomplete`, `incompleteHref`. All profile selection UIs now share this component.

### Changed
- **`app/consultation/ConsultationForm.tsx`** — complete/incomplete profile selector grids replaced with `ProfileSelectorCard`. Step labels use `textStyles.stepLabel`.
- **`components/compatibility/CompatibilityClient.tsx`** — SeatCard avatar replaced with `ProfileAvatar`. Role label and birth date use `textStyles.meta`.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — Groom/Bride avatars replaced with `ProfileAvatar` using role colors. Role labels use `textStyles.meta`.

---

## [2026-05-17] — Centralized typography system; Mulish replaces Jost; nav items switch to sans

### Added
- **`lib/typography.ts`** — single source of truth for font styles. Exports `fonts` (role-based style objects: `display`, `displayBold`, `displayItalic`, `ui`, `uiLight`, `uiMedium`, `uiSemibold`, `uiBold`, `uiItalic`) and `scale` (named size constants: `pageTitle`, `sectionHead`, `subhead`, `body`, `label`, `small`, `xs`). Changing a font or weight now requires editing one file.

### Changed
- **`app/layout.tsx`** — Jost replaced by Mulish (same `--font-sans` variable). Added `style: ["normal", "italic"]` to load italic variant.
- **`components/NavBar.tsx`** — All style objects rewritten using `fonts.*` tokens. Nav items (Natal Charts, Kundali Matching, Get Consultation) switched from Philosopher to Mulish `uiMedium` so wordmark is the sole Philosopher element in the bar. Mobile labels and admin link follow suit.
- **`components/compatibility/CompatibilityClient.tsx`** — Local `const cormorant` removed; imports and uses `fonts.display`.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — Same.
- **`app/consultation/ConsultationForm.tsx`** — Same.
- **`app/consultation/page.tsx`** — Inline h1 style replaced with `fonts.display` + `scale.pageTitle`.
- **`components/dashboard/ProfileList.tsx`** — Both h1 styles replaced with `fonts.display` + `scale.pageTitle`.

---

## [2026-05-17] — Philosopher + Jost font system; font weight cleanup across all UI

### Changed
- **`app/layout.tsx`** — Font imports replaced: Cormorant Garamond → Philosopher (display/headings, `--font-cormorant`), Inter → Jost (body/UI, `--font-sans`). `<body>` class updated to `jost.variable philosopher.variable`.
- **`components/NavBar.tsx`** — All `fontWeight: 300` → `400`. Wordmark size `1.65rem` → `1.45rem`, nav link size `1.25rem` → `1.1rem`, letter-spacing reduced. Philosopher at 400 reads heavier than Cormorant at 300.
- **`components/dashboard/ProfileList.tsx`** — Page heading `fontWeight: 300` → `400`.
- **`components/CosmicLanding.module.css`** — All `font-weight: 300` → `400` in cormorant contexts.
- **`components/compatibility/CompatibilityClient.tsx`** — `cormorant` object `fontWeight: 300` → `400`; avatar initials and CTA button `fontWeight: 600` → `700` (Philosopher only ships 400/700).
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — `cormorant` object `fontWeight: 300` → `400`.
- **`app/consultation/ConsultationForm.tsx`** — `cormorant` object `fontWeight: 300` → `400`; all cormorant-context `fontWeight: 600` → `700` (avatar initials, price, submit button, WhatsApp link, delivery card price).
- **`app/consultation/page.tsx`** — h1 `fontWeight: 300` → `400`, `fontSize: "2.4rem"` → `"2.2rem"` (Philosopher reads larger at equivalent size).

---

## [2026-05-17] — Written consultation toggle; subtitle removal; Kundali carousel "new profile" slide

### Added
- **`lib/db/settings.ts`** — `written_consultation_enabled` field added to `AppSettings`. Defaults `true` (existing installs unaffected: stored absence treated as `true`).
- **`app/api/admin/settings/route.ts`** — `written_consultation_enabled` added to `ALLOWED_SETTINGS`.
- **`app/admin/AdminTables.tsx`** — Written consultation toggle added. All consultation settings (Written toggle, Live toggle, Pricing, Slot management) consolidated into one "Consultation" panel. Extracted reusable `Toggle` component.
- **`app/consultation/ConsultationForm.tsx`** — `writtenConsultationEnabled` prop. Written delivery card hidden when off. Both-off state shows "not available" message, hides submit button. Default delivery mode respects the flag.

### Changed
- **`components/compatibility/CompatibilityClient.tsx`** — Subtitle removed. `SeatCard` always includes a "New profile" virtual slide as the last carousel position — indicator shows `1/2`, `+` on creation slide.
- **`app/consultation/page.tsx`** — Subtitle removed. `writtenConsultationEnabled` threaded through to form.

---

## [2026-05-17] — Consultation page full tonal pass; strip emoji, elevate copy and delivery cards

### Changed
- **`app/consultation/page.tsx`** — h1 changed from "Get Consultation" to "Seek Counsel". Subtitle rewritten to be evocative rather than instructional.
- **`app/consultation/ConsultationForm.tsx`**:
  - Step labels ("Whose chart is this about?" etc.) replaced with Cormorant italic phrasing ("Whose chart is this reading for?", "What would you like to understand?", "How would you like it answered?")
  - `DeliveryCard` component: `emoji` prop and usage removed entirely. Card now uses pure Cormorant typography — title + price + description. Selected state uses amber glow border consistent with the rest of the app.
  - Slot time picker buttons: moved from Tailwind `className` to inline style system matching the glass aesthetic.
  - Submit button: font switched to Cormorant, copy changed from "Submit your question ✦" to "Ask your question ✦", rounded to 16px to match Kundali CTA.
  - `SlotActions`: `💬` emoji removed from Reschedule/Cancel WhatsApp links. Buttons restyled to inline glass aesthetic.
  - `PaymentInstructions`: `💬` emoji removed from WhatsApp confirmation link. Link restyled to match tonal contract.
  - Unused lucide imports (`ChevronRight`, `AlertCircle`) removed.

---

## [2026-05-17] — Portrait seat cards for Kundali Matching + Consultation; remove emoji throughout

### Changed
- **`components/compatibility/CompatibilityClient.tsx`** — Profile pill buttons replaced with portrait seat cards. Two glass cards (Groom / Bride) side by side with faint `&` connector. Empty state shows faint SVG silhouette with an `+ add profile` link. Filled state shows large Cormorant name, birth date, initials avatar, and `‹ idx/total ›` carousel controls when 2+ profiles exist. Violet color system for groom; rose for bride. No emoji anywhere.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — Name truncation (`max-w-[100px] truncate`) removed; names now wrap with `word-break: break-word`. Emoji (`🤵` / `👰`) stripped from Natal Moon Profiles, Kuja Dosha, Manglik lines, and guna breakdown detail rows. Name labels substituted instead.
- **`app/consultation/ConsultationForm.tsx`** — Profile pill buttons replaced with portrait cards in a responsive auto-fill grid. Complete profiles show initials avatar, name in Cormorant, relationship role; selected state uses amber/gold border + glow. Incomplete profiles shown as faint unselectable cards with "complete profile" link. Empty state shows dashed placeholder linking to dashboard.

---

## [2026-05-17] — Kundali Matching + Consultation redesign; remove question/check caps

### Changed
- **`components/compatibility/CompatibilityClient.tsx`** — Full restyle. Groom (🤵) / Bride (👰) pill selectors replace Male/Female dropdowns. Glass card matching landing page aesthetic. CTA uses same gold shimmer button as landing. "X/6 checks used" chip removed. History cards show animated SVG score ring and Auspicious/Moderate label. Empty state replaced with warmer copy.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — "Male/Female" replaced with "Groom/Bride" + emoji throughout (header avatars, Moon Profiles, Kuja Dosha, Additional Kutas). Score arc upgraded to larger SVG with score/36 label and qualitative label. All cards use the landing page glass style. Verdict and dosha cards use Cormorant typography. Mobile-first layout with max-w-2xl.
- **`app/consultation/ConsultationForm.tsx`** — One-at-a-time gate removed. Multiple open questions now display in an "Open questions" section below the always-visible submission form. Payment card, delivery cards, and question display all upgraded to glass aesthetic. Language simplified (e.g. "Pay to confirm", "Send confirmation on WhatsApp"). Answered history similarly elevated.
- **`app/consultation/page.tsx`** — No functional change; styling inherited.

### Removed
- **API cap: 1 active question** — `app/api/consultation-requests/route.ts` no longer blocks submission when a pending question exists.
- **API cap: 6 compatibility checks** — `app/api/compatibility/route.ts` no longer returns 403 when the user has 6+ checks.

---

## [2026-05-17] — UX tightening: above-fold layout, simplified consultation, tucked footer

### Changed
- **`app/consultation/ConsultationForm.tsx`** — Removed life area selection and 4-part structured question (observation/constraint/objective/options). Replaced with a single free-text question textarea. Profiles → question → delivery mode is now the entire flow. History section shows the raw question rather than assembled structured text.
- **`app/api/consultation-requests/route.ts`** — Accepts new `question` field (simplified mode). Maps to `observation` column; sets `life_area = "General"` and blanks the other legacy fields. Old 4-part format still accepted for backwards compat.
- **`components/dashboard/ProfileList.tsx`** — Added "Natal Charts" Cormorant heading. Page header (title + search + button) sits above the card grid. Fixed hardcoded `bg-zinc-900 border-zinc-700` search input to use CSS-variable based `bg-white/5 border-white/10`.
- **`components/compatibility/CompatibilityClient.tsx`** — Updated heading to "Kundali Matching" in Cormorant. Reduced top padding from `py-6` to no top padding; reduced `space-y-10` to `space-y-6` so the form and header fit above fold.
- **`app/consultation/page.tsx`** — Heading updated to Cormorant weight-300, removed excess `py-6`.
- **`app/layout.tsx`** — Footer Privacy/Terms collapsed to a 10px right-aligned strip at 20% opacity (fades to 50% on hover). Not a visual element, just a legal link.

---

## [2026-05-17] — Dark cosmic app shell

### Added
- **`components/AppStarCanvas.tsx`** — Fixed canvas with 70 slow-drifting stars (upward drift 0.04–0.13 px/frame, subtle twinkle via sin oscillation). Pauses on tab hide. Pointer-events none, z-index 0. Does not interfere with charts or text.
- **`components/AppShell.tsx`** — Renders `AppStarCanvas` + a CSS nebula radial-gradient accent (violet top-right, blue bottom-left) as fixed backdrop on all inner app pages. All app content elevated to z-index 1.

### Changed
- **`app/globals.css`** — Dark mode CSS variables updated to cosmic palette: `--background` → deep navy `oklch(0.07 0.022 275)`, `--card` → slightly elevated `oklch(0.14 0.016 275)`, `--muted` tinted to match. The NavBar glass now blurs against the same deep-space background as the landing page.

---

## [2026-05-17] — NavBar typography upgrade

### Changed
- **`components/NavBar.tsx`** — Significantly increased readability. Desktop nav links now use Cormorant 300 at 1.25rem (up from 1rem); Admin link uses 1.1rem with matching Cormorant style; "Sign Out" drops the icon and becomes Cormorant italic at 1rem. "Astro Chaganti" wordmark bumped to 1.65rem and TwoOrbits logo to 40px — remains the largest element. Mobile bottom nav labels bumped from 0.68rem to 0.82rem. All sign-out, admin, and nav-link sizing is now consistently Cormorant-based.

---

## [2026-05-17] — NavBar elevated glass redesign

### Changed
- **`components/NavBar.tsx`** — Full rebuild. Desktop: larger glass bar (`py-4`, `blur(32px) saturate(1.8)`, inset highlight shadow matching the landing page panel) with bespoke SVG icons (natal wheel, kundali overlapping circles, person silhouette — same as landing page feature strip) beside Cormorant Garamond light link labels; `usePathname` active state in gold. Mobile: desktop top bar is `hidden sm:flex` — no top bar on mobile at all; a fixed `bottom-0` glass bottom nav (same glass treatment) shows Charts / Kundali / Consult / Exit (sign out); unauthenticated mobile gets a minimal top bar with logo + Sign In only.

---

## [2026-05-17] — NavBar redesign + navigation label rename

### Changed
- **`components/NavBar.tsx`** — Full visual redesign to match the cosmic dark aesthetic: dark glass background (`#030115/90` + `backdrop-blur-md`), Two Orbits SVG brand mark in the logo, Cormorant Garamond wordmark with gold italic "Chaganti", gold active-state links via `usePathname`, sticky `z-40`. Nav labels renamed: "Profiles" → "Natal Charts", "Compatibility" → "Kundali Matching", "Ask a Question" → "Get Consultation". Desktop links use `bg-amber-400/8 text-amber-400` for active state. Mobile bottom nav updated with matching active-state gold treatment, new short labels (Charts / Kundali / Consult), and `sm:hidden` remains. Added `usePathname`-based active detection so links visually reflect current route.
- **`app/consultation/page.tsx`** — Page heading updated from "Ask a Question" to "Get Consultation" to match navigation label.

---

## [2026-05-17] — Wire cosmic landing page into app (development)

### Added
- **`components/CosmicLanding.tsx`** — Full React port of the `preview.html` mockup. Client component with four `useEffect` hooks: (1) body overflow lock, (2) zodiac wheel built via `createElementNS` (12 signs × outer/inner segments + 72 tick marks), (3) star-field canvas animation loop with RAF + `visibilitychange` pause + debounced resize, (4) diagonal crossfade quote cycle. Calls `signIn('google', { callbackUrl: '/dashboard' })` on CTA click.
- **`components/CosmicLanding.module.css`** — CSS module for all landing page styles: glass panel, zodiac/earth positioning, quote animation, feature icon strip, CTA button shimmer, mobile layout. Keyframes declared `:global` so inline `animation:` strings resolve by name.
- **`components/AppShell.tsx`** — Client component using `usePathname()`. On `/`, renders `children` only (no NavBar, no Footer, no FeedbackWidget, no `max-w-7xl` main wrapper). On all other routes, renders the full shell as before.
- **`public/earth.mp4`** — 3D Earth video copied from design mockup for production serving.

### Changed
- **`app/layout.tsx`** — Added `"300"` to Cormorant Garamond weights (required for the landing page light-weight typography). Replaced inline NavBar/main/FeedbackWidget/footer with `<AppShell>` passing nav, footer, and feedback as props.
- **`app/page.tsx`** — Replaced `<LandingPage />` with `<CosmicLanding />`. Added `export const dynamic = "force-dynamic"` (page reads auth via `getServerSession`).

---

## [2026-05-16] — Landing page redesign mockup v2 (uxred)

### Added
- **`design/landing-mockup/preview.html`** — High-fidelity standalone landing page mockup, ready to port. Design: 3D earth video as centrepiece; spinning zodiac wheel (160s CSS animation); animated star-field canvas with shared drift direction and meteor showers; glass panel (backdrop-filter blur 32px) with diagonal crossfade quote animation (5s hold, 1.2s transition); Cormorant Garamond typography; "Two Orbits" Saturn×Venus brand mark (personal to chart owner's planetary signature); bespoke SVG icon strip for Natal Charts / Kundali Matching / Consultations; Google sign-in CTA with shimmer-on-hover; fully responsive mobile layout. Performance: canvas pauses via visibilitychange, resize debounced 120ms, static gradient built once per resize, RAF and timer IDs stored for React useEffect cleanup on unmount.
- **`design/landing-mockup/earth.mp4`** — 3D rendered Earth video asset (23 MB). Autoplay muted loop, used as the cinematic centrepiece.

### Changed
- **`design/landing-mockup/bundle.html`** — Earlier design iteration, kept as reference.

---

## [2026-05-14] — Fix Muhurtha event type mismatch

### Fixed
- **`components/engines/MuhurthaView.tsx`** — Dropdown option values updated to match what the sidecar accepts: `marriage`, `house_entry`, `business`, `travel`, `education`, `medical`. Previous values (`"General"`, `"House Warming"`, `"Vehicle Purchase"`, `"Property"`) did not match any sidecar-accepted event type, causing all Muhurtha searches to fail or return empty results. Default changed from `"General"` to `"marriage"`. Empty-state message no longer references the removed `"General"` sentinel.
- **`app/api/readings/muhurtha/route.ts`** — Fallback `event_type` default changed from `"General"` to `"marriage"` to stay consistent.

---

## [2026-05-14] — Harden AIInsightCard against all nullable insight fields

### Fixed
- **`components/engines/AIInsightCard.tsx`** — Added optional chaining guards for `insight.key_themes` (render and copyInsight) to match the earlier guards on `section.technical_basis` and `section.content_sources`. Any cached insight where the AI returned null for these fields would have crashed on `.length`. All field accesses on insight data are now null-safe.

---

## [2026-05-14] — Fix AIInsightCard crash on compat insight data; fix misleading spinner

### Fixed
- **`components/engines/AIInsightCard.tsx`** — `section.technical_basis` and `section.content_sources` are `TabInsight`-only fields absent from `CompatInsight`. Accessing `.length` on them unconditionally threw a TypeError whenever a cached compat insight auto-expanded. Guarded with optional chaining.
- **`components/engines/CompatibilityInsightShell.tsx`** and **`components/engines/AIInsightShell.tsx`** — Separated the initial cache-check state (`checking`) from the generation state (`loading`). The Generate button now only spins during actual AI generation, not during the silent initial GET cache check, eliminating the confusing "auto-generating" appearance on mount.

---

## [2026-05-14] — Fix AI insight bars invisible when cache-check fetch is slow

### Fixed
- **`components/engines/CompatibilityInsightShell.tsx`** and **`components/engines/AIInsightShell.tsx`** — Both components hid themselves entirely (`return null`) while the initial cache-check GET request was in flight. If that request was slow (DB latency, Turso hiccup) or hung, the Generate button never appeared. Changed `loading` to start `true` and removed the `initialized` guard so the bar renders immediately and the Generate button is simply disabled until the check completes.

---

## [2026-05-14] — Fix compatibility chat crash on AI provider errors; add route tests

### Fixed
- **`app/api/readings/chat/compatibility/route.ts`** — Expanded try-catch to cover context-building and settings fetch. Previously, errors from `buildProfileContext` (malformed chart JSON, DB timeout) or `getChatLlm()` escaped the error handler and returned an HTML 500 page, causing the client's `res.json()` to throw and surface as "page could not load". Now all errors return `{ error: message }` JSON with status 500.

### Added
- **`app/api/readings/chat/compatibility/route.test.ts`** — 8 tests covering auth gating, input validation, 404 paths, successful response, and two crash scenarios: AI provider unavailable (e.g. Gemini high-demand error) and DB connection timeout. The Gemini-unavailable test directly reproduces the reported production failure.

---

## [2026-05-14] — Unified AI model selection, compatibility AI insight + chat, consultation draft assistant

### Added
- **`lib/engines/models.ts`** — Unified model registry: Gemini Flash, Llama 4 Scout, Gemma 4 31B. Single source of truth (`AiModelKey`, `DEFAULT_INSIGHT_MODEL`, `DEFAULT_CHAT_MODEL`, `DEFAULT_DRAFT_MODEL`).
- **`lib/engines/ai-caller.ts`** — `callAIForJson` and `callAIForText` routing functions; dispatches to Gemini or Groq based on model provider. Groq supports `json_mode` for structured output.
- **`lib/engines/gemini.ts`** — Added `callGeminiText` for prose output (non-JSON mode). Default temperature raised to 0.5.
- **`lib/engines/groq.ts`** — Added `callGroqById` low-level function and `json_mode` option for structured JSON output from Groq models.
- **`components/ui/ModelPicker.tsx`** — Reusable chip-group model picker; used consistently across all AI features.
- **`components/engines/AIInsightShell.tsx`** — Regenerate button (always visible after first generation), ModelPicker in header, auto-opens on cached insight.
- **`lib/ai-insight-compat.ts`** — `buildCompatibilityInsight`: dual-chart AI analysis with 5 sections (overall, dynamics, strengths/friction, growth, timing).
- **`app/api/readings/ai-insight/compatibility/route.ts`** — GET cached insight, POST generate/force-regenerate for compatibility pair.
- **`app/api/readings/chat/compatibility/route.ts`** — POST chat endpoint; loads both charts, builds dual-profile system prompt with Ashtakoota scores.
- **`components/engines/CompatibilityInsightShell.tsx`** — Insight shell for compatibility pairs, reuses `AIInsightCard`.
- **`components/engines/CompatibilityChat.tsx`** — Chat UI for compatibility pairs.
- **`app/compatibility/[id]/CompatibilityDetailClient.tsx`** — Professional view now shows AI Insight Shell + collapsible Chat (admin-only).
- **`app/api/admin/consultation-draft/route.ts`** — POST endpoint; loads profile chart(s), builds context from dashaflow + content blocks, generates draft consultation answer via any model.
- **`lib/db/settings.ts`** — Added `DraftLlmConfig` type with `getDraftLlm()`/`setDraftLlm()` methods (temperature 0.55, max_tokens 4096).
- **`lib/db/consultation-requests.ts`** — Added `getById(id)` method.
- **`app/api/admin/llm-settings/route.ts`** — Now handles `type === "draft"`.
- **`components/admin/LlmSettingsPanel.tsx`** — Added Draft section with temperature, max tokens, custom instructions.
- **`app/admin/AdminTables.tsx`** — Draft Assistant in expanded paid question row: ModelPicker, Generate/Regenerate, draft display, copy-to-clipboard.

### Changed
- AI insight sections (natal tab) restructured to match 8 consultation life areas instead of generic chart sections.
- Groq compound model ID corrected to `gemma-4-31b-it`. TPM notes removed from model chips.
- Admin LLM settings now cover 3 engines: AI Insights, Chat, Draft.

---

## [2026-05-14] — Chart Chat tab (admin-only, Llama 4 Scout via Groq)

### Added
- **`lib/engines/groq.ts`** — Groq API caller (OpenAI-compatible, `meta-llama/llama-4-scout-17b-16e-instruct`, temperature 0.3). Requires `GROQ_API_KEY` env variable.
- **`app/api/readings/chat/route.ts`** — `POST` endpoint (admin-only, stateless). Loads full chart data + all content blocks for the profile, builds system prompt with zero-trust credibility rules, proxies conversation to Groq.
- **`components/engines/ProfileChat.tsx`** — chat UI: in-memory message history, textarea input (Enter to send), auto-scroll, basic markdown rendering (bold, code, bullets, headings), Clear button.
- **`components/engines/ProfessionalView.tsx`** — "Chat" tab appended for admin-only; visible only when `isAdmin` prop is true.

### Notes
- Requires `GROQ_API_KEY` in Vercel env vars (same setup as `GOOGLE_GEMINI_API_KEY`).
- Conversation is never persisted — resets on page reload.
- System prompt enforces: cite chart factors per claim, cite content source keys, label general-knowledge reasoning separately, admit gaps.

---

## [2026-05-14] — Fix vargas tab AI insight: build actual per-planet varga table

### Fixed
- `lib/ai-insight.ts` vargas tab was looking for `data.lagna.vargas` (doesn't exist in chart output). Now builds a proper planet×divisional-chart table from `planets[name].d9_sign`, `d10_sign`, etc. — all 14 varga columns for 9 planets sent as tab-separated data. Also attempts to look up D9 and D10 ascendant content if derivable from chart.

---

## [2026-05-14] — Per-tab AI insights with Gemini

### Added
- **`lib/engines/gemini.ts`** — direct Gemini API caller using `fetch` (no SDK); `gemini-3.1-flash-lite`, `responseMimeType: "application/json"`, temperature 0.15.
- **`lib/ai-insight.ts`** — server-only insight builder. Per-tab content selection (ascendant, planet-in-house, nakshatra, dasha-pair lookups), strict system prompt (verbatim `chart_verification`, grounded-only synthesis), `buildInsightForTab(profile, tab)`.
- **`app/api/readings/ai-insight/route.ts`** — `GET` returns cached insight; `POST` generates + caches (transit always regenerates, others permanent).
- **`app/api/admin/ai-insights/[id]/rating/route.ts`** — `PATCH` endpoint for thumbs-up / thumbs-down / null.
- **`components/engines/AIInsightCard.tsx`** — renders `TabInsight` JSON: chart-verification pill strip, collapsible technical-basis disclosure per section, key themes, model/version footer, rating buttons.
- **`components/engines/AIInsightShell.tsx`** — collapsible admin-only shell per tab; checks cache on mount, shows Generate button if uncached (or always for transit tab), spinner during fetch.

### Changed
- **`lib/db/client.ts`** — schema v8: added `rating INTEGER` and `rated_at TEXT` columns to `readings` table.
- **`lib/db/readings.ts`** — added `rate()`, `aiInsightStats()` methods; updated `Reading` type with optional `rating`, `rated_at`.
- **`components/engines/ProfessionalView.tsx`** — accepts `profileId` + `isAdmin` props; renders `AIInsightShell` at the top of natal, vargas, dashas, career, transit, tarabalam tabs (admin-only).
- **`app/profiles/[id]/ProfileDetailClient.tsx`** — passes `profileId` and `isAdmin` to `ProfessionalView`.
- **`app/admin/page.tsx`** — fetches `db.readings.aiInsightStats()` and passes to `AdminTables`.
- **`app/admin/AdminTables.tsx`** — new "AI Insights" tab showing per-engine rating summary table.

---

## [2026-05-14] — Remove dead files; clear T1 from backlog

### Removed
- `scratch_test_rate_limit.ts`, `test_get_many.ts` — dev scratch console scripts
- `jest.config.js` — stale Jest config (project uses Vitest)
- `DEPLOYMENT_STRATEGY.md` — superseded by `docs/PROJECT.md`
- `docs/ai_astrology_design.md` — deferred AI librarian design, never implemented
- `docs/superpowers/plans/2026-05-04-multi-engine-astrology.md` — stale agent planning doc

### Changed
- `docs/BACKLOG.md` — removed T1 (scratch file) since it is now resolved

---

## [2026-05-14] — Documentation restructure: 9-document system

### Added
- **`docs/STANDARDS.md`** — new cross-agent source of truth: task lifecycle, branch workflow, Vitest rules, auth patterns (isAdmin JWT-stamping), security patterns (Cache-Control, NEXT_PUBLIC_, force-dynamic), DB conventions, rate limiting, API conventions, doc hygiene.
- **`docs/PRODUCT.md`** — product story, 3 user personas, feature map, consultation fee structure, 8 plain-language user journeys (J1–J8), content philosophy, product roadmap.
- **`docs/TESTING.md`** — test coverage status per module, how-to-run instructions, test plans for all 8 user journeys, manual QA log template with 2026-05-13 entry.

### Changed
- **`docs/ARCHITECTURE.md`** — added Section 1 "Server / Client Boundary Map": complete table of every page (server vs client), every client component with what it cannot do, the `isAdmin` JWT pattern with a flow diagram, and a `process.env` availability table. Renumbered old sections 1–12 → 2–13. Fixed schema version reference (4 → 7). Updated admin guard description to reflect JWT-stamping pattern.
- **`docs/BACKLOG.md`** — added "Session Decisions" section (S1–S7, capturing all architectural decisions from the prior two sessions) and "Product Roadmap" section (near/medium/long-term). Updated `last-updated` stamp.
- **`docs/PROJECT.md`** — fixed stale `ADMIN_EMAILS` description (was "optional override of hardcoded email", now correctly "required; if unset no one is admin"). Updated auth model section. Added "Runbook" section with procedures for: changing admin users, running backfill, verifying failed deployments, updating env vars via REST API, schema migration, clearing compatibility history.
- **`CLAUDE.md`** — trimmed to thin wrapper (~70 lines). Removed duplicated hard constraints (→ `STANDARDS.md`). Added documentation map table. References `docs/STANDARDS.md` as source of truth.
- **`AGENTS.md`** — trimmed to pre-flight checklist + 7 repeated-failure rules + reference to `docs/STANDARDS.md`. Target was ~80 lines.

---

## [2026-05-14] — Fix admin visibility in all client components

### Fixed
- `ProfileDetailClient` and `CompatibilityDetailClient` both called `isAdmin(session)` directly inside `"use client"` components where `process.env.ADMIN_EMAILS` is not visible. Replaced with `session.user.isAdmin` (stamped server-side in the session callback). Basic/Professional toggle and all admin tools in profile and compatibility views are now visible to admin users again.

---

## [2026-05-14] — Jules PRs #16-29 merged + full security/performance audit fixes

### Added
- **Mobile bottom navigation** (PR #17): Thumb-friendly nav bar on mobile screens
- **Batch content API** (PR #26): `GET /api/content/batch?q=...` reduces N individual fetches to 1; ExplainerModal updated to use it
- **Security headers** (PR #23): X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy added via `next.config.ts`
- **Memoized sanitization** (PR #18): HTML sanitization results cached to reduce CPU on repeated renders
- **Test coverage** (PRs #19-22, #24-25, #27-29): Tests for Dashaflow engine, geocoding, consultation note assembly, transit API, profile creation, astro-utils, content loader caching, and profile GET missing-ID path
- **`unbook()` method** on `consultationSlots` for compensating rollback

### Changed
- **CRIT-1**: Resolved merge conflict markers in `.gitignore` (coverage/ entry)
- **CRIT-3**: Consultation request creation now unbookmarks the slot if `create()` throws, preventing orphaned bookings
- **HIGH-1**: `/api/admin/clear-compatibility` and `/api/admin/backfill` changed from `GET` to `POST` to prevent CSRF
- **HIGH-2**: Removed hardcoded admin email fallback from `lib/admin.ts`; removed admin email display from admin page HTML
- **HIGH-3**: Added `export const dynamic = "force-dynamic"` to `app/dashboard/page.tsx` and `app/compatibility/page.tsx`
- **HIGH-4**: Admin settings `PATCH` route now validates against an explicit allowlist of known keys
- **HIGH-5**: Consultation form fields now enforce a 2000-character maximum
- **HIGH-6**: Compatibility limit check now runs *before* sidecar call; added rate limiting (10 req/min per user)
- **HIGH-7**: `users.upsert` now updates `id` on email conflict (handles provider-ID changes)
- **MED-1**: `NEXT_PUBLIC_DASHAFLOW_SIDECAR_URL` → `DASHAFLOW_SIDECAR_URL` in API routes (was exposing server env var to client bundle)
- **MED-2**: Consultation request POST now validates all profile_ids belong to the requesting user
- **MED-3**: Consultation slot POST validates `starts_at` is a parseable ISO date
- **MED-4**: Transit POST validates `transit_date` matches `YYYY-MM-DD` format
- **MED-5**: Feedback POST rate-limited at 5 requests/min per IP
- **MED-6**: Tarabalam POST rate-limited at 20 req/min; date range capped at 90 days
- **LOW-2**: `authOptions` now includes explicit `secret: process.env.NEXTAUTH_SECRET`
- **LOW-4**: Content API routes (`/api/content/...`) Cache-Control changed from `public` to `private`
- **PR #16**: Required field indicators added to ProfileForm
- **tsconfig.json**: Test files excluded from main type-checking; tests run under vitest's own env

## [2026-05-13] — Jules Integration: Security, Performance, and Tests

### Added
- **Security Hardening**: Implemented `isomorphic-dompurify` for HTML sanitization in `ExplainerModal.tsx` and `credits/page.tsx` to mitigate XSS risks.
- **Performance Optimization**: 
  - Added batching for profile and reading lookups in `Tarabalam` service to eliminate N+1 database queries.
  - Memoized markdown rendering in `ExplainerModal` to reduce CPU overhead.
- **Comprehensive Testing**: 
  - Added unit tests for `Dashaflow` API integration and chart summary logic.
  - Added Vitest coverage for Markdown rendering components.
  - Added unit tests for rating calculation and rate-limiting logic.
  - Added UI tests for `ConsultationForm` and engine error handling.
  - Added tests for geocoding query variants.

### Fixed
- Fixed `dangerouslySetInnerHTML` vulnerabilities across the application.
- Fixed React Hook violations in `ExplainerModal.tsx` by moving `useMemo` before conditional returns.

## [2026-05-13] — Admin dashboard: question stats + per-user activity counts

### Added
- Stats row now shows 6 cards: Users, Profiles, Compat Checks, Feedback, Written Q's, Live Sessions. Written and Live counts are all-time totals across all statuses.
- Users table: three new columns — Profiles, Compat, Questions — showing per-user counts computed from data already loaded on the page (no extra DB queries).

## [2026-05-13] — Live consultation slot booking

### Added
- Admin Settings tab: slot manager with IST datetime picker to add slots, list of all slots with availability/booked status, and delete buttons for unbooked slots.
- `lib/db/consultation-slots.ts`: new `getById(id)` method used by the booking API.
- Slot picker in Ask a Question form (Step 5, visible only when Live Consultation is selected). Shows upcoming slots 5+ days out in IST; requires a selection before the form can be submitted.
- Consultation POST API (`/api/consultation-requests`): accepts `slot_id` for appointment mode, verifies the slot exists and is unbooked, books it atomically (race-condition-safe), and stores `slot_starts_at` on the request.
- Admin Questions table: live consultation rows now show the selected slot date/time (IST) below the "Live" label in the Mode column, and in the expanded detail row.
- `PendingCard`: shows the selected slot date/time for live consultations. Paid live consultations show "Request Reschedule" and "Request Cancellation" wa.me buttons (pre-filled with Ref and slot — Kalyani's number is never displayed in the UI).
- WhatsApp payment confirmation message now includes the selected slot line for appointment-mode requests.

### Changed
- `app/admin/page.tsx` now loads `consultationSlots` and passes it to `AdminTables`.
- `app/consultation/page.tsx` loads upcoming slots and filters to 5+ days out + unbooked before passing as `availableSlots` to `ConsultationForm`.
- Switching delivery mode back to "Written" clears any slot selection.

## [2026-05-13] — Pricing as admin setting + UX polish

### Changed
- Consultation fees are now configurable from the admin Settings tab (₹ inputs, "Save Pricing" button). Fees stored in `settings` table; API reads live values on each submission. Hardcoded constants remain only as DB-fallback defaults.
- `AppSettings` type extended with `written_fee_paise` and `live_fee_paise`; `set()` accepts `boolean | number`.
- Removed pricing callout banner from Ask a Question page.
- DeliveryCard redesigned: price now appears on the right side of the title row instead of stacked below it.
- Landing page journey paragraph: removed "The chart is free; written responses…" sentence.
- Landing page bio: removed "payment coordination" from Kalyani's description.
- FAQ cost answer: confident, no email reference, directs users to see pricing in-app.

---

## [2026-05-13] — Payment workflow: UPI + WhatsApp confirmation

### Added
- Pricing callout on Ask a Question page (always visible; ₹1,200 written / ₹5,000 live).
- DeliveryCard shows price for each mode.
- After question submission, user sees payment instructions: dynamic UPI QR code (amount pre-filled via `upi://` deep link), UPI ID with copy button, and a WhatsApp button to Kalyani with a pre-filled message containing user name, email, profile(s), life area, type, amount, and reference ID.
- Status `paid` added — Kalyani (or admin) clicks "Mark as Paid" in admin panel after confirming payment. User sees "Payment confirmed — in the queue" state.
- SCHEMA_VERSION bumped to 6: `amount_paise INTEGER` column on `consultation_requests`.
- `feeForMode()` and `formatFee()` helpers in `lib/consultation.ts`; `WRITTEN_FEE_PAISE = 120000`, `LIVE_FEE_PAISE = 500000`.
- `db.consultationRequests.markPaid(id)` method.
- `POST /api/admin/consultation-requests?id=<id>` now accepts `{ action: "mark_paid" }` in addition to existing mark-answered body.
- Landing page About section: added sentence introducing Kalyani Chaganti and her administrative role.

### Changed
- `getPending()` now returns any non-answered request (`status != 'answered'`) covering `pending_payment`, `paid`, and legacy `pending` rows.
- `create()` sets initial status to `pending_payment` and stores `amount_paise`.
- Admin Questions tab: status badges are now "Awaiting Payment" (amber) / "Paid" (blue) / "Answered" (green); "Mark as Paid" button shown for awaiting-payment rows; "Mark as Answered" shown only after payment confirmed — enforcing the payment → answer flow. Tab label changed from "N pending" to "N active".
- `page.tsx` passes `userName` and `userEmail` to `ConsultationForm` for the WhatsApp pre-fill.

---

## [2026-05-13] — Landing page: pricing clarity and tone

### Changed
- Life areas subtitle: "makes a real difference" → "can offer guidance" (humbler, suggestive tone)
- Journey section: added explicit note that the chart is free, written responses and live consultations are chargeable and priced differently
- FAQ "What is the cost?": rewritten to clearly distinguish free chart vs. chargeable written responses vs. chargeable live appointments; directs to email for current pricing

---

## [2026-05-13] — Landing page copy & design polish

### Changed
- Hero subhead: removed "researcher's rigor" → warmer, benefit-focused copy
- Journey paragraph: "grounded, research-based answer" → "focused answer, not a generic reading"
- Life area cards: replaced `<ul>` bullet lists with free-flowing `<p>` text (~2-3 sentences per area); no more widow words
- Compatibility callout: redesigned from plain horizontal bar with 🔗 emoji to amber-tinted card (matching family callout style) with 💞 emoji; removed technical jargon (Nadi, Gana, Bhakoot) aimed at first-time visitors; warmer heading "Checking compatibility before marriage?"
- About Dr. Chaganti: removed "researcher's discipline", "careful research engagement", "decode the architecture of your situation" → plain, warm language
- Step 4 "How it works": "deep-dive research response" → "written answer built around your charts"
- FAQ Ayanamsha answer: "strictly utilises" → "uses"; removed "highest possible mathematical integrity"
- FAQ consultation answer: "synthesises" → "brings together"

---

## [2026-05-13] — Landing page overhaul

### Changed
- Hero: second CTA changed from `mailto:` link to in-app "Ask a Question" → `/auth/signin`
- "How it works" Step 3 and Step 4 updated to describe the in-app question submission and
  written response flow; email instruction removed
- Consultation areas expanded from 3 cards to all 8 life areas (4×2 grid matching the app's
  LIFE_AREAS): Career, Wealth, Marriage, Family, Health, Education, Travel, Dharma
- "What's computed" section moved up (before About) for earlier credibility signal
- Family recommendation section updated to reference submitting a question rather than emailing
- About Dr. Chaganti: last paragraph updated to mention limited monthly availability
- Bottom contact section replaced with a clean "Ready to begin?" CTA section; email demoted
  to secondary line for general enquiries

### Added
- Compatibility (Ashtakoota Milan) callout below the 8-area grid
- FAQ: "What is the difference between the free chart and a personal consultation?"
- FAQ: "How does the in-app question submission work?"
- FAQ "How should I prepare?" updated to four-part LPS framework with structured list
- FAQ "What is the cost?" updated to reference in-app written response flow

### Removed
- Standalone contact section (email as primary CTA) — replaced by bottom sign-in CTA
- FAQ referencing email as the consultation path

---

## [2026-05-13] — Consultation: options field, profile guard, answer feedback

### Added
- **Options field** — 4th mandatory field in the Life Problem Statement form ("Options you are considering").
  Per-area placeholder examples provided; generic fallback guides users who haven't narrowed options yet.
  Stored as `options TEXT` (nullable for legacy rows). Included in assembled question preview and all views.
- **Profile completeness guard** — profiles missing `gender`, `relationship`, or `current_location` are
  shown grayed-out with a "Complete →" link to their edit page. Only complete profiles are selectable.
- **Answer feedback** — users can rate answered questions as Helpful / Not helpful directly in the history
  card. "Helpful" shows an optional note textarea before submitting. Rating shown as icon in admin table.
  Admin detail row shows full feedback including the user's note.
- `user_rating` and `user_feedback_note` columns added to `consultation_requests` (SCHEMA_VERSION 5).
- `POST /api/consultation-requests/[id]` — submit feedback for an owned, answered request.

### Changed
- `assembleStatement()` accepts optional 4th `options` param — backward compatible.
- `LIFE_AREA_EXAMPLES` extended with `options` placeholder for all 8 life areas.

---

## [2026-05-13] — Consultation question queue (MVP)

### Added
- **Consultation feature** — users can submit one structured question at a time to the astrologer.
  - `/consultation` page with step-by-step form: life area selection (8 MECE areas), profile selector,
    3-part Life Problem Statement (Observation / Constraint / Objective), live preview, delivery mode.
  - "Ask a Question" link in `NavBar` (authenticated users only).
  - Pending question status card shown when a question is awaiting answer.
- **DB layer** — `consultation_requests` and `settings` tables (SCHEMA_VERSION bumped to 4).
  - `lib/db/settings.ts` — `AppSettings` type, `getAll()` and `set()` methods.
  - `lib/db/consultation-requests.ts` — full CRUD: `getPending`, `listByUser`, `listAllWithUser`,
    `create`, `markAnswered`.
  - Both modules exported from `lib/db/index.ts`.
- **Shared types/constants** — `lib/consultation.ts`: `LIFE_AREAS`, `LifeArea`, `DeliveryMode`,
  `LIFE_AREA_EXAMPLES` (placeholder text per area × 3 fields), `MIN_FIELD_LENGTH = 30`, `assembleStatement`.
- **API routes**:
  - `GET/POST /api/consultation-requests` — user: list own requests / submit new (enforces one-pending limit, rate-limited 5/min).
  - `PATCH /api/admin/consultation-requests?id=<id>` — admin: mark answered with optional note.
  - `GET/PATCH /api/admin/settings` — admin: read and update app-wide settings.
- **Admin panel** — two new tabs:
  - *Questions* — lists all consultation requests sorted newest-first; pending cards show the assembled question, user email, life area, delivery mode, and a "Mark as Answered" action with optional admin note textarea.
  - *Settings* — toggle switch for `live_consultation_enabled` (default OFF).

### Design decisions
- One pending question per user enforced server-side; the form is replaced with a status card while a question is awaiting answer.
- Live Consultation delivery option is hidden from users until the admin enables it via the Settings tab.
- No payment integration yet — handled offline for MVP.

---

## [2026-05-13] — Code organisation refactoring + full documentation

### Added
- `lib/db/` module split: `client.ts`, `users.ts`, `profiles.ts`, `readings.ts`,
  `compatibility.ts`, `feedback.ts`, `index.ts` — each table in its own file.
  `lib/db.ts` is now a one-line re-export shim; all existing imports unchanged.
- Proper TypeScript types exported from db modules: `User`, `Profile`,
  `ProfileWithUser`, `CompatibilityCheck`, `CompatibilityCheckWithDetails`, `Feedback`.
- `lib/compatibility.ts` — shared `KOOTA_MAX` constant and all compatibility-related
  types (`CompatResult`, `KujaDosha`, `ProfileDetails`, `AdditionalKuta`).
- `docs/ARCHITECTURE.md` — full module reference with GitHub hyperlinks, user journey
  traces for all 6 flows, code organisation assessment.
- `CHANGELOG.md` (this file), `docs/BACKLOG.md` — documentation framework.
- `CLAUDE.md` rewritten as a full agent brief with user types, task patterns, hard
  constraints, and mandatory documentation hygiene rules.

### Changed
- `lib/rate-limit.ts` unified and rewritten — configurable `rateLimit(key, limit, windowMs)`
  returning `{ success, limit, remaining }`.
- `lib/security.ts` deleted — was a duplicate rate limiter with a slightly different API.
- All four rate-limit callers updated (`profiles/route.ts`, `dashaflow/route.ts`,
  `career/route.ts`, `transit/route.ts`).
- `AdminTables` props typed — replaced `any[]` with `User[]`, `ProfileWithUser[]`,
  `CompatibilityCheckWithDetails[]`, `Feedback[]`.
- Sort comparators in `AdminTables` refactored into a single generic `sortBy<T>` helper.
- Dead `KOOTA_MAX` declaration removed from `CompatibilityClient.tsx`.

---

## [2026-05-13] — Compatibility professional view + admin link

### Added
- Compatibility detail professional view (admin-only) showing:
  - Natal Moon Profiles: moon sign, nakshatra, gana, nadi, yoni per person
  - Kuja Dosha Analysis: per-planet breakdown (house, sign, score) for both people
  - Additional Kutas: Mahendra, Stree Deergha, Vedha, Rajju (body-part group + effect),
    BadConstellations, Lagna/7th House, Sex Energy — each with result indicator
  - Dosha Mitigations: classical BPHS exception strings
  - Overall match verdict banner with `is_match_approved` + Kuja balance
- Admin compatibility table: "View" link (violet) to `/compatibility/[id]` alongside JSON dropdown.

### Changed
- `CompatibilityDetailClient` type definitions expanded to cover the full sidecar payload.
- `ResultPill` component added for good/bad/acceptable/neutral indicators with icons.

---

## [2026-05-13] — Compatibility full-page view + KOOTA fix

### Changed
- Compatibility replaced popup/modal pattern with a full-page detail view at
  `/compatibility/[id]` — follows the same server component + client component
  split as the profiles page.
- `CompatibilityClient` now navigates to the detail page after a successful check
  (`router.push`); history cards are `<Link>` components.
- Admin and non-admin users both see the same detail page; admin sees the
  Basic/Professional toggle.

### Fixed
- `KOOTA_MAX` lookup now includes all sidecar key aliases (`Tara`, `GrahaMaitri`,
  `Maitri`, `Rashi`) — previously Tara and Graha Maitri showed "—" instead of max.

### Added
- `app/compatibility/[id]/page.tsx` — server component fetching check + both profiles.
- `db.compatibility.get(id, userId)` and `db.compatibility.getAny(id)` methods.

---

## [2026-05-13] — Tarabalam feature

### Added
- `lib/tarabalam.ts` — full TypeScript-native implementation: `NAKSHATRAS_27`,
  `TARAS` (9 archetypes with quality/description), `computeTara()`, `computeTithi()`,
  `extrapolateMoonLongitude()`, `extrapolateSunLongitude()`, `taraColor()`.
- `app/api/readings/tarabalam/route.ts` — POST endpoint: one sidecar call for
  today's transit, then extrapolates Moon + Sun for each day in the date range.
  Computes Tara and Tithi per profile per day.
- `components/engines/TarabalamView.tsx` — profile checkboxes (current profile
  pre-selected), date range selector, Tara + Tithi calendar table, "All ✦" column
  highlighting rows where all selected profiles have auspicious Tara.
- Tarabalam tab added to `ProfessionalView`.
- Tithi column in Tarabalam table: amber for Purnima, zinc for Amavasya, sky-blue
  for others.

### Fixed
- Tarabalam no longer requires Transit tab to be loaded first — API calls
  `fetchTransit()` directly.
- Transit output Moon longitude reconstruction: sidecar returns `{ sign, degree }`,
  not raw longitude. Fixed with `SIGNS.indexOf(sign) * 30 + degree`.
- Admin viewing another user's profile now shows the profile *owner's* family in
  Tarabalam, not the admin's own profiles. Fixed by using `profile.user_id` instead
  of `session.user.id` for subsequent `db.profiles.list()` calls.
  Change in `app/profiles/[id]/page.tsx`.

---

## [2026-05-13] — Landing page UX + nav + auth polish

### Changed
- Landing page reframed around consultation services (Relationships, Career,
  Timing, Family) rather than app features.
- NavBar: auth-gated Compatibility link, session flash fixed.
- Compatibility page auth-gated; inline error handling improved.

### Fixed
- `geo-tz` missing from profile edit bundle on Vercel.
- Year used at runtime instead of build time in footer.

---

## [2026-05-12] — Performance, admin, and professional view consolidation

### Added
- DB indexes: `idx_readings_lookup`, `idx_profiles_user`, `idx_compatibility_user`,
  `idx_readings_profile`.
- Admin utility to clear all compatibility history.
- Identity header in professional view for admin context.
- Compatibility tracker integrated into admin tabs.

### Changed
- Basic and professional views consolidated into a single toggleable interface per
  profile (admin-only toggle).
- Phase 1 performance optimisations: lazy tab loading, memoisation, waterfall
  fetch elimination.

### Fixed
- Null pointer crash in `ProfileDetailClient`.
- Missing `useEffect` and `RefreshCw` imports in `ProfessionalView`.
- TypeScript error in `DashaflowView` causing Vercel build failure.
- Missing `'use client'` directive in `ProfessionalView` — Vercel deployment fix.
- Kaal Sarpa Yoga section always visible even when not detected.
- `schema_version` table replaces `PRAGMA user_version` (Turso HTTP API rejects
  PRAGMA writes).
- Gandanta rendering, content CDN caching, resilient `JSON.parse`.

---

## [2026-05-04] — Initial build (project bootstrap through feature-complete MVP)

### Added
- Next.js 16 project bootstrap with TypeScript, Tailwind v4, shadcn/ui.
- NextAuth v4 with Google OAuth provider; user upsert on sign-in.
- Turso (libSQL) database layer with `profiles`, `users`, `readings` tables.
- Profile CRUD API routes with Nominatim geocoding and `geo-tz` timezone resolution.
- DashaFlow sidecar integration: full 17-section Vedic chart (`/calculate` endpoint).
- `DashaflowView` — collapsible sections with `SectionShell` + `ExplainerModal`.
- `VargaDashboard` — D1–D30 divisional chart tabs.
- `CareerView` — D10 career analysis.
- `TransitView` — current planetary positions.
- `MuhurthaView` — auspicious timing.
- `AntardashaTimeline` — Vimshottari dasha timeline visualisation.
- Admin panel with users, profiles, readings, feedback tabs.
- Rate limiting on profile creation (5 req/min per user).
- 538 markdown files of Vedic interpretive content across 9 content types.
- Readings cache: results stored per `(profile_id, engine)`, refreshed on demand.
- Feedback widget (floating overlay, submits to `/api/feedback`).
- Privacy, Terms, Credits public pages.

### Notes
- Early builds explored VedAstro, Ba Zi, Western (Kerykeion), Panchangam WASM,
  and Ollama chat engines. All superseded by DashaFlow. Dead rows in `readings`
  table from those engines are harmless.
- Python sidecar deployed as a separate Vercel project because Next.js claims
  all of `/api/*`, preventing co-deployment of Python serverless functions.
