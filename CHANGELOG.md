# Changelog

All notable changes to Astro Chaganti are recorded here.

**Format:** `## [YYYY-MM-DD] — title` then `### Added / Changed / Fixed / Removed` bullets.  
**Rule:** Every push to `main` must add or update an entry. One session = one date entry.  
**Audience:** Future agents and developers — write enough that someone can understand what changed without reading the diff.

---

## [2026-06-24] — Admin dashboard: AI chat usage view

Until now we shipped the chat feature without any admin-side visibility into who's using it. This adds a dedicated tab with the aggregated stats an admin needs to gauge adoption, see which model is doing the work, and spot specific sessions.

### Added
- **`lib/db/chat-messages.ts` → `stats()`** — Four parallel aggregate queries (overview, by-user top 20, by-model, recent 30 sessions) returning a `ChatUsageStats` object. JOINs with `users` on `user_id` so admins see emails/names, not opaque IDs. `session_id != ''` filter excludes pre-v11 rows from the recent-sessions list (they're still counted in the overview totals).
- **`app/admin/tabs/ChatUsageTab.tsx`** — New tab component. Shows: 4 stat cards (user messages, unique users, sessions, this-month), thumbs up/down summary, per-model breakdown, top users with last-activity timestamps, and the 30 most recent sessions. Empty state when there's no chat activity yet.
- **`app/admin/AdminTables.tsx`** — Wires the new `<TabsTrigger value="chat-usage">` (between AI Insights and LLM Settings) and renders `<ChatUsageTab>`. Tab label shows the live user-message count.
- **`app/admin/page.tsx`** — Adds `db.chatMessages.stats()` to the `Promise.all` block so it runs in parallel with the other dashboard queries.
- **`lib/db/index.ts`** — Re-exports `ChatUsageStats` from the barrel.
- **`lib/db/chat-messages.test.ts`** — New test file with three cases: result shaping, current-calendar-month UTC threshold for `this_month`, and the empty-DB happy path.

---

## [2026-06-24] — Migrate: Llama 4 Scout (Groq) → Gemma 4 31B IT (Google)

Groq announced the deprecation of `meta-llama/llama-4-scout-17b-16e-instruct` with a shutdown date of **July 17, 2026** ([source](https://console.groq.com/docs/deprecations)). Migrated chat + draft defaults to Gemma 4 31B IT, served via the existing Google generative-language API (the same endpoint shape as Gemini, so no new provider plumbing). Groq is no longer wired into the codebase — re-introduce by restoring [`lib/engines/groq.ts`](lib/engines/groq.ts) from git history and adding an `AI_MODELS` entry with `provider: "groq"`.

### Changed
- **`lib/engines/models.ts`** — Removed `groq-scout`; added `gemma-4-31b-it` (`label: "Gemma 4 31B IT"`, `provider: "gemini"`, `id: "gemma-4-31b-it"`). Updated `DEFAULT_CHAT_MODEL` and `DEFAULT_DRAFT_MODEL` to `gemma-4-31b-it`. `ChatMessage` type now lives here (was in the removed `groq.ts`).
- **`lib/engines/gemini.ts`** — `callGemini` and `callGeminiText` now take `modelId` as the first argument and build the API URL from it. Both Gemini and Gemma models share the `https://generativelanguage.googleapis.com/v1beta/models/{id}:generateContent` endpoint.
- **`lib/engines/ai-caller.ts`** — Simplified to a single provider branch (Google). Removed `callGroqById` import and the Groq routing branch.
- **`lib/ai-insight.ts` / `lib/ai-insight-compat.ts`** — Stopped importing the now-removed `GEMINI_MODEL` constant; the underlying model id is read from `AI_MODELS[…].id` so the record always reflects the active registry entry.
- **`lib/db/settings.ts`** — Default `user_model` for the chat config is now `gemma-4-31b-it`.
- **`components/admin/LlmSettingsPanel.tsx`** — User-chat model picker fallback updated to `gemma-4-31b-it`. The picker reads from `AI_MODELS` so any future registry change shows up automatically.
- **`app/api/readings/chat/route.ts` + `app/api/readings/chat/compatibility/route.ts`** — `ChatMessage` is now imported from `@/lib/engines/models` (was `@/lib/engines/groq`).

### Removed
- **`lib/engines/groq.ts`** — Deleted along with `callGroqById`, `GROQ_MODELS`, `GroqModelKey`. No active code path used it after the registry change.

### Notes on stored user preferences
Any user with a persisted `chat.user_model = "groq-scout"` setting will now hit `resolveModel`'s unknown-key fallback path and silently get `DEFAULT_CHAT_MODEL` (Gemma 4 31B IT). No DB migration required.

---

## [2026-06-24] — Fix: four production Sentry issues (bounce-rate incident)

Bundle of fixes for the four issues blocking users on the deployed site this week. Each fix is structured so the failure mode cannot recur.

### Fixed
- **`lib/sanitize.ts`** — Replaced `isomorphic-dompurify` (drags `jsdom` into the server bundle; crashed `/credits` and any route in its module graph on Vercel with `require() of ES Module .../html-encoding-sniffer`) with [`sanitize-html`](https://github.com/apostrophecms/sanitize-html), which parses via `htmlparser2` and has **no DOM dependency at all**. Same `sanitizeHtml(html: string)` export — no caller changes. The new dep is externally maintained and cannot regress into jsdom. **Sentry: ASTROCHAGANTI-1 (72 events).**
- **`instrumentation-client.ts` + `components/PostHogIdentifier.tsx`** — PostHog now probes `localStorage` at init and falls back to `persistence: "memory"` when storage is blocked (sandboxed iframes, in-app browsers like LinkedIn/Facebook, Brave shields, Safari ITP corners). `PostHogIdentifier` also wraps `identify()`/`reset()` in `try/catch` as belt-and-suspenders — analytics failures can never break the React commit phase again. **Sentry: ASTROCHAGANTI-7 (8 events).**
- **`components/CosmicAnimations.tsx`** — `spawnMeteor()` and `draw()` now bail when the canvas has zero dimensions (happens when the effect fires before layout via `requestIdleCallback` on hidden tabs). Added a last-mile finite-coordinate guard before `createLinearGradient` that drops any meteor whose coords went `NaN`/`Infinity` instead of throwing. **Sentry: ASTROCHAGANTI-A (1 event).**
- **`lib/db/client.ts`** — Rewrote `ensureSchema` to split idempotent bootstrap DDL from version-gated migrations:
  - `bootstrapTables()` runs on every cold start with `CREATE TABLE IF NOT EXISTS` for every table (cheap, idempotent). This is what eliminates the failure mode where `schema_version` is at the latest but a table is missing — the cause of the incident.
  - `runMigrations()` only runs when the DB is behind `SCHEMA_VERSION` and only handles `ALTER TABLE` / data seeds.
  - `migrate()` now **rethrows** real errors (only "duplicate column" / "already exists" are still swallowed). Previously it logged-and-continued on any failure, letting a broken CREATE TABLE coexist with a bumped version row.
  - The outer try/catch that hid schema errors has been removed; migration failures now surface as clear 500s at the route and reach Sentry instead of silently corrupting requests.
  **Sentry: ASTROCHAGANTI-9 (2 events).**

### Removed
- `isomorphic-dompurify` from `dependencies`.

### Added
- `sanitize-html` + `@types/sanitize-html` to `dependencies` / `devDependencies`.

---

## [2026-06-19] — Chat: session_id links Q/A pairs and conversation threads

### Added
- **`session_id` column on `chat_messages`** — UUID shared by all rows in one chat session (user + assistant turns). Generated on the client when the panel opens; reset whenever the context changes (new profile/tab). Indexed for fast thread lookups.
- Turso `ALTER TABLE chat_messages ADD COLUMN session_id` migration runs idempotently via `migrate()`.

### Changed
- Both chat API routes accept `session_id` in the request body and write it to all saved rows.
- `AIAdminPanel`: generates `sessionIdRef` on mount, rotates on context change, sends with every request.

---

## [2026-06-19] — Fix: robust chat_messages schema migration (v11)

### Fixed
- **`lib/db/client.ts`** — Bumped schema to v11. `chat_messages` table and index creation moved to `migrate()` calls so they run idempotently even when schema_version was already stamped as 10 by a partial migration. Previously a failed v10 migration would leave the DB version at 10 with the table missing, and subsequent cold-starts would skip the block entirely.

---

## [2026-06-19] — Fix: graceful chat error handling

### Fixed
- **`components/panels/AIAdminPanel.tsx`** — `res.json()` now safe-parses with a fallback; shows "Request failed (N) — please try again" instead of exposing the raw JS parse error when the server returns an empty or HTML body.
- **`app/api/readings/chat/route.ts`** — All logic (quota check, profile lookup, context building, AI call) now runs inside a single top-level try/catch via an extracted `handleChat()` helper, guaranteeing a JSON error response on any unhandled throw.
- **`app/api/readings/chat/compatibility/route.ts`** — Same pattern via `handleCompatChat()`.

---

## [2026-06-19] — Fix: AI button now visible to all users

### Fixed
- **`components/profiles/ProfileView.tsx`** — AI button was still gated on `isAdmin`; now renders whenever `onAIOpen` is provided (which is always the case from DashboardClient).

---

## [2026-06-19] — User chat: richer context from user-generated tab readings

### Changed
- **`app/api/readings/chat/route.ts`** — System prompt now includes user-generated engine readings for all users: `today-current` (current dasha period narrative), `today-natal` (natal chart narrative), and `career` (D10 themes, primary planets, strength factors). These load in parallel and are omitted gracefully if the user hasn't visited those tabs yet. Admins additionally get the active-tab AI insight as before. Removed the incorrect approach of loading admin-generated `ai-*` summaries as user context.

---

## [2026-06-19] — User AI Chat: quota, message logging, feedback persistence

### Added
- **`lib/db/chat-messages.ts`** — New DB module for the `chat_messages` table. Records every user/assistant turn with `user_id`, `profile_id`/`check_id`, `session_type`, `model`, and `rating`. Exposes `save()`, `countUserMonthly()`, `rate()`, `listByUser()`, `listAll()`.
- **`app/api/chat/feedback/route.ts`** — `POST /api/chat/feedback` saves thumbs-up/down on a specific assistant message. Ownership-enforced via `user_id`.
- **DB schema v10** — New `chat_messages` table with index on `(user_id, created_at)`.

### Changed
- **`app/api/readings/chat/route.ts`** — Opened to all authenticated users (was admin-only). Non-admins: profile ownership enforced, model locked to `chatConfig.user_model`, monthly quota enforced. Response now includes `message_id` (assistant turn) and `quota` for non-admins. Messages saved to DB only after a successful LLM response.
- **`app/api/readings/chat/compatibility/route.ts`** — Same changes as above for compatibility chat.
- **`lib/db/settings.ts`** — `ChatLlmConfig` extended with `user_model` (AiModelKey, default `"groq-scout"`) and `user_quota_per_month` (default 20).
- **`components/panels/AIAdminPanel.tsx`** — Added `isAdmin` prop. Non-admins: no model picker, no summary tab, quota pill shown in header, quota exhaustion disables input. Thumbs-up/down now persists to DB via `/api/chat/feedback`.
- **`app/dashboard/DashboardClient.tsx`** — `AIAdminPanel` now renders for all users (not just admins); `isAdmin` prop passed through.
- **`components/admin/LlmSettingsPanel.tsx`** — Chat settings section gains user model selector and monthly quota slider.

---

## [2026-06-19] — Performance: landing page FCP, dashboard streaming, Vercel region

### Added
- **`components/cosmic-shared.ts`** — Shared `ZODIAC`, `DARK_PALETTE`, `LIGHT_PALETTE`, and `Palette` type extracted from `CosmicLanding.tsx` so the animation bundle can be code-split without duplication.
- **`components/CosmicAnimations.tsx`** — New lazily-loaded component (`dynamic(() => import(...), { ssr: false })`) containing the canvas star/meteor animation and the imperative SVG zodiac-wheel builder. Removed from the initial JS bundle so the glass panel (brand, snippet, CTA) paints first.
- **`app/dashboard/DashboardLoader.tsx`** — Async server component holding all DB queries for the dashboard. Runs behind a `<Suspense>` boundary so the skeleton HTML flushes to the client immediately after session verification.
- **`app/dashboard/DashboardSkeleton.tsx`** — Server-rendered loading skeleton shown while `DashboardLoader` resolves, replacing the blank wait users previously experienced.
- **`vercel.json`** — Sets the primary serverless function region to `bom1` (Mumbai) to reduce TTFB for the primarily India-based user base.

### Changed
- **`components/CosmicLanding.tsx`** — Imports `ZODIAC` and palettes from `cosmic-shared.ts`; delegates canvas + zodiac rendering to `CosmicAnimations` via `dynamic()`. Panel (snippet, brand, CTA, pill strip) is unchanged in behaviour and appearance.
- **`app/dashboard/page.tsx`** — Session check still runs synchronously (needed for redirect). DB queries moved to `DashboardLoader` and wrapped in `<Suspense fallback={<DashboardSkeleton />}>` for streaming.

## [2026-06-19] — Dedicated onboarding flow for new users

### Added
- **`app/onboarding/page.tsx`** — Server component that auth-gates the onboarding route, redirects users who already have profiles straight to `/dashboard`, and passes the Google display name to the client.
- **`app/onboarding/OnboardingClient.tsx`** — Full-screen, 4-step animated onboarding form (About → Birthday → Birth Time → Birthplace). Features: slide-in/out step transitions, animated progress bar, cosmic orbital header, per-step validation, and a "Create my chart" submit that calls `/api/profiles` and redirects to `/dashboard?profile=[id]&new=1` (triggering the existing `ProfileLoadingScreen`). Birth time defaults to `12:00` with copy nudging users to find the accurate time.

### Changed
- **`app/dashboard/page.tsx`** — New users with 0 profiles are now redirected to `/onboarding` instead of landing on the dashboard in inline-create mode. Returning users and admins are unaffected; `?create=1` still works for adding subsequent profiles.

## [2026-05-23] — Enrich AI chat with full chart context, D9, and content library

### Changed
- **`lib/chart-summary.ts`** — `summarizeDashaflow()` now emits a D9 (Navamsa)
  signs block (lagna + all planets) immediately after the D1 planets section.
  Both the summary and chat routes benefit automatically.
- **`app/api/readings/chat/route.ts`** — Completely rebuilt context packaging:
  - Profile header now includes `time_of_birth` and `timezone`.
  - Raw DashaFlow chart data (panchang, D1 planets, D9 signs, current dasha at
    all 5 levels) replaces the previous AI insight summary as the chart source.
  - Full content library included: ascendant, all planets in house (kendra/trikona
    prioritised), moon nakshatra, and current dasha pair.
  - Accepts optional `tab` parameter — when present, appends the cached AI insight
    sections for that tab as additional grounded context.
  - Uses `DEFAULT_CHAT_MODEL` (Groq Llama 4 Scout) and chat-specific LLM settings.
  - Added `export const dynamic = "force-dynamic"`.
- **`app/api/readings/chat/compatibility/route.ts`** — Same treatment for both
  profiles: full chart summary, D9, content library for houses 1/5/7, Ashtakoot
  scores, and `place_of_birth` added to both profile headers.
- **`components/panels/AIAdminPanel.tsx`** — Chat requests now pass
  `tab: insightTab` so the route includes tab-specific AI insight context.

---

## [2026-05-23] — Fix "WHAT'S ACTIVE NOW" showing wrong pratyantar label

### Fixed
- **Current Period tab** was displaying "Next: Saturn pratyantar in ~3 months"
  even when the person was already in Saturn Pratyantar. Two bugs in the
  `generateInsights` fallback (`lib/insights.ts`):
  1. No check for whether the pratyantar had already started — it only checked
     whether the end date was in the future, so it called active periods "Next".
  2. The "in ~X" lead time was computed from the **end** date, not the **start**,
     so the countdown showed time remaining, not time until it begins.
- Fixed by splitting the fallback into two branches:
  - **Active** (`today >= start && today < end`): shows "Active: X pratyantar"
    with time remaining.
  - **Upcoming** (`today < start`): shows "Next: X pratyantar in ~Y" with lead
    time computed from the start date.
- Added three new tests covering the active, upcoming, and imminent-already-fired
  cases.

---

## [2026-05-22] — Fix unreadable chat text in light theme

### Fixed
- **AI Panel chat responses** were unreadable in the light (Vellum) theme: planet
  names, dasha timings, and other markdown-rendered text appeared in light colours
  against the parchment background.
- Root cause: `MarkdownMessage` in `AIAdminPanel.tsx` had `prose-invert` hardcoded,
  which forces all Tailwind Typography text to light variants regardless of theme.
- Fix: import `useTheme` from `next-themes` and apply `prose-invert` only when
  `resolvedTheme === "dark"`. Light theme now renders dark ink text correctly via
  the existing `var(--color-ink-*)` CSS tokens.

---

## [2026-05-22] — Add missing AI chat API routes

### Fixed
- **AI Panel chat** was throwing "Unexpected token '<'" (HTML 404 returned instead
  of JSON) because `/api/readings/chat` and `/api/readings/chat/compatibility`
  did not exist.
- Created `app/api/readings/chat/route.ts` — POST handler for per-profile chat.
  Loads profile name/DOB/place, enriches system prompt with the latest cached
  natal insight if available, then calls `callAIForText` and returns
  `{ response: string }`.
- Created `app/api/readings/chat/compatibility/route.ts` — POST handler for
  compatibility chat. Same pattern using the latest compat insight as context.
  Both routes are admin-only, `force-dynamic`, and use `private, no-store`
  Cache-Control.

---

## [2026-05-22] — Update site meta title and description

### Changed
- **`app/layout.tsx`** — title updated to "Astro Chaganti - Vedic Astrology
  Readings by Dr Chaganti"; description rewritten from a technical feature list
  to benefit-led copy: "Personal consultations and simplified readings of your
  current period, natal charts, career themes, and marriage compatibility."

---

## [2026-05-22] — CosmicLanding now theme-aware (dark ↔ light)

### Changed
- **`components/CosmicLanding.tsx`** — fully theme-aware via `useTheme()`.
  Added `DARK_PALETTE` and `LIGHT_PALETTE` constants covering every hardcoded
  color in the component. Background, ambient blobs, zodiac wheel (rebuilt on
  theme change via `isDark` in its `useEffect` dep array), canvas star/meteor
  colors (read from a `paletteRef` on every RAF frame without restarting the
  loop), inline SVG glyphs, and the Google sign-in icon all switch between the
  cosmic dark and warm parchment Vellum palettes.
- **`components/CosmicLanding.module.css`** — added `:global([data-theme="light"])`
  overrides for every color-bearing class: panel glass, text hierarchy, brand
  gradient (amber → sindoor brick), CTA button (amber → brick red), dividers,
  and mobile pill strip / fade overlay.

---

## [2026-05-22] — Default theme changed to light (Vellum)

### Changed
- New visitors now land on the light "Vellum" theme instead of dark "Cosmic".
  Single-line change in `ThemeProvider.tsx` (`defaultTheme="light"`).
  Existing users with a stored `localStorage` preference are unaffected.

---

## [2026-05-22] — Constrain Karma Bhava card width on desktop

### Fixed
- Career tab — Karma Bhava card was stretching to full column width on desktop.
  Added `maxWidth: 360px` to match the natural width of its content.

---

## [2026-05-22] — Karma Bhava as simple card in Career tab

### Changed
- **Career tab — Karma Bhava section** converted from a label-value (`ac-kv`) grid
  to a compact card: sign name as bold headline with dignity tag, occupants row,
  lord row (house + sign), and lord-in-D10 row — consistent with the significator
  planet cards above it.
- **PlanetsTab test** updated to reflect Shadbala data now living in ShadabalaTab.

---

## [2026-05-22] — Clarify email response in Ask panel confirmation

### Changed
- **AskPanel success state** — confirmation text now tells users the response
  arrives at their email address (not the app), and provides
  astrochaganti@gmail.com as a clickable mailto link for urgent queries.

---

## [2026-05-22] — Restore D10 chart as last item in Career tab

### Fixed
- D10 — Dashamsha chart restored to Career tab as the fifth and final section
  (was inadvertently dropped in the previous redesign). Order is now:
  significator cards → career themes → astrological indicators →
  Karma Bhava → D10 chart.

---

## [2026-05-22] — Always-visible birth charts in Natal tab; Career tab redesign

### Changed
- **Natal Chart tab** — D1 and D9 charts now always visible below the reading
  (removed collapsible toggle). Charts render under a "Birth charts" section
  heading on both mobile and desktop.
- **Career tab redesigned** — single-column layout replacing the previous
  two-column grid. New order:
  1. **Key professional significators** — planet cards (auto-fill grid) with
     name, Primary badge, D10 sign/lord, and "Strong in D10" indicator.
     Replaces the horizontal-scroll table; works on mobile without scrolling.
  2. **Career themes** — pill tags (unchanged).
  3. **Astrological indicators** — bullet list (unchanged).
  4. **10th house — Karma Bhava** — key-value card (unchanged).
  D10 chart and `TwoColumnTabGrid` removed from this view; unused imports
  (`NatalChartGrid`, `Planet`, `SignName`) cleaned up.

---

## [2026-05-22] — Shadbala admin tab; collapsible birth charts in Natal tab (mobile)

### Added
- **Shadbala tab (admin-only).** Shadbala · Rupas table and Bhava Chalit ·
  House Shifts grid extracted from the Planets tab into a dedicated
  `ShadabalaTab` component. Visible on both mobile and desktop for admins.
  Planets tab now contains only the Positions table.
- **Collapsible D1 + D9 charts in Natal Chart tab (mobile only).** On small
  screens the Natal Chart tab now shows a "Birth charts" toggle below the
  reading. Tapping it expands D1 — Rasi and D9 — Navamsa grids as reference.
  Hidden on `md` and above (sidebar already shows the charts on desktop).
  `NatalTab` accepts a new `chartOutput` prop; `ProfileView` threads it
  through.

### Changed
- `components/unified/tabs/PlanetsTab.tsx` — Shadbala and Bhava Chalit
  sections removed; `ShadbalaPlanet` type and helper constants moved to
  `ShadabalaTab`.
- `components/unified/tabs/ShadabalaTab.tsx` — new component.
- `components/tabs/NatalTab.tsx` — collapsible charts section added; new
  `chartOutput` prop.
- `components/profiles/ProfileView.tsx` — `'shadbala'` added to `ChartTabId`
  and `CHART_TABS` (adminOnly); content section wired; `chartOutput` passed
  to `NatalTab`.

---

## [2026-05-22] — Natal Chart tab; remove mobile nudge; suppress success toast

### Added
- **Natal Chart tab.** The natal chart reading (`chart_reading` from the
  today-reading engine) now lives in its own dedicated tab between Current
  Period and Planets. No new data fetching — the payload was already present.
  The Current Period tab is now single-column, focused purely on what's
  happening now (insight cards, dasha period, dasha reading).
- `components/tabs/NatalTab.tsx` — new component rendering the natal reading
  with loading and empty states.

### Changed
- `components/tabs/TodayTab.tsx` — right column (natal reading) removed;
  layout simplified from `TwoColumnTabGrid` to a single `div.space-y-6`.
- `components/profiles/ProfileView.tsx` — `'natal'` added to `ChartTabId`;
  Natal Chart entry added to `CHART_TABS`; content section wired;
  `needsChart` excludes `'natal'` since it uses `todayReadingOutput` not
  sidecar data; `DESKTOP_ONLY_TABS` set and mobile nudge block removed;
  `Monitor` import removed.
- `components/panels/AskPanel.tsx` — success toast suppressed after question
  submission. The inline panel confirmation ("Dr. Chaganti will respond within
  2 days") is sufficient; the toast was redundant. Error toast is preserved.

---

## [2026-05-22] — Admin-only tabs; rename Today → Current Period

### Changed
- **Six tabs restricted to admin users only:** Divisional, Yogas, Jaimini,
  Ashtakavarga, Dashas, and Transits are now hidden from regular users.
  Users see only: Current Period, Planets, Career, Marriage Compatibility.
  Tab bar filter and content render guards both enforce the restriction so
  neither the tab label nor the content is reachable by non-admins.
- **"Today" tab renamed to "Current Period"** across the tab bar, AI ask
  context (PostHog capture + `AskContext.tab` default), and `DashboardClient`
  fallback strings.
- `components/profiles/ProfileView.tsx` — `adminOnly: true` added to 6 tabs;
  `isAdmin &&` guards added to their content sections; label updated.
- `app/dashboard/DashboardClient.tsx` — three `'Today'` fallback strings
  updated to `'Current Period'`.

---

## [2026-05-21] — Fix Vimshottari sub-dasha date drift in timeline

### Fixed
- **Dasha timeline showed wrong planets at Sukshma/Prana level.** The
  expandable Vimshottari timeline was computing sub-periods using a fixed
  `365.25 days/year` constant (`addYears`), which drifts from the Python
  sidecar's precise calculation. Error compounds through each nested level
  (Maha → Antar → Pratyantar → Sukshma), producing a 3-4 day offset at
  Pratyantar level — enough to land in a completely different planet's period
  at Sukshma/Prana depth.
- **Fix:** `computeSubDashas` now proportions the parent's exact day count
  (`parentEnd − parentStart` in ms) rather than multiplying planet-years by
  a year constant. Sub-periods sum to exactly the parent duration with no
  gaps or overlaps at any depth. The Maha timeline start/end dates come
  directly from the sidecar, so all nesting levels inherit sidecar-authoritative
  boundaries.
- `components/unified/tabs/DashaTab.tsx` — removed `addYears`, rewrote
  `computeSubDashas(parentStart, parentEnd, parentPlanet)`.

---

## [2026-05-21] — Invalidate all stale readings on profile birth-data edit

### Fixed
- **Compatibility check results were never cleared on profile edit.** When a
  user changed their date/time/place of birth, Kuta point scores and
  Ashtakavarga results in `compatibility_checks` remained stale. Added
  `db.compatibility.deleteByProfile(id)` and called it alongside
  `db.readings.deleteByProfile(id)` whenever `chartDataChanged` is true.
- **Race condition in invalidation order.** Previously readings were deleted
  *before* the profile row was updated. In the tiny window between those two
  calls, a concurrent request would regenerate a reading with old birth data.
  Fixed by updating the profile first, then deleting stale rows.
- **AI insights had no self-healing staleness check.** Every other engine
  (dashaflow, career, today-reading) uses `birthDataChanged()` to detect
  stale cache. AI insights did not — they served whatever row was in the DB.
  The GET endpoint now checks `birthDataChanged` against the current profile
  and returns `{ insight: null }` if stale, forcing regeneration. The POST
  endpoint now stores birth coordinates in `input_snapshot` so the check has
  data to compare against.

---

## [2026-05-21] — Fix AIAdminPanel silent cache-check failure

### Fixed
- **AI panel cache-check swallowed errors silently.** When the "✦ Ask" panel
  opened, it hit `/api/readings/ai-insight` to pre-load a cached summary. If
  that fetch threw (network blip, DB timeout) or returned non-OK, the spinner
  just stopped with no feedback — previously generated summaries would vanish
  without explanation. Now surfaces the error via `summaryError` so users see
  a readable message and can retry. `generateSummary` and chat error paths were
  already handled correctly; this closes the one remaining silent gap. (T13)

---

## [2026-05-21] — Admin context-aware profile loading + compatibility bypass

### Added
- **Admin sees full user account on profile click.** When an admin navigates
  to any user's profile from the admin panel, the dashboard now loads *all*
  of that user's profiles as the active context — not just the single profile
  clicked. This means Tarabalam, Marriage Compatibility, and the CompareTab
  all work correctly with the target user's full profile set.
- **Admin context banner.** A slim accent-bar at the top of the dashboard
  shows "👁 Viewing [name]'s account ← Back to admin" when an admin is
  operating in another user's context. Disappears for normal users.
- **Admin compatibility bypass.** Admins can now run marriage compatibility
  checks across any two profiles in the system (ownership not enforced).
  The 6-check cap and duplicate guard are skipped for admins. Results are
  stored under the admin's own `user_id` so the profile owner never sees
  admin-initiated checks.

### Changed
- `app/dashboard/page.tsx` — admin branch now calls `db.profiles.list(userId)`
  on the viewed user and fetches their name via `db.users.getById`. Passes
  `viewingUserLabel` to `DashboardClient`.
- `app/dashboard/DashboardClient.tsx` — renders admin context banner when
  `viewingUserLabel` is set.
- `app/api/compatibility/route.ts` — admin path uses `db.profiles.getAny()`
  (bypasses ownership) and skips cap/duplicate checks.
- `lib/db/users.ts` — added `getById(id)` query method.

---

## [2026-05-21] — Fix ESLint CI failure in ProfileSidebar; mobile dropdown background fix; remove mobile theme switch

### Fixed
- **Profile dropdown was transparent**, letting page content bleed through. Now uses `bg-[var(--color-background)]` for a solid, legible control.

### Fixed
- **ESLint CI failure** (`react-hooks/set-state-in-effect`) in `ProfileSidebar.tsx`. The `useEffect` that resets `isEditing` when the mobile overlay closes was missing the disable comment; added `/* eslint-disable/enable react-hooks/set-state-in-effect */` block matching the project pattern used in `DashboardClient.tsx`.

### Removed
- **Theme switch removed from mobile entirely.** The Settings dropdown no longer shows a Theme row on mobile; the desktop wordmark toggle is unchanged.

---

## [2026-05-21] — Mobile nav cleanup: Ask in header, Theme in Settings

### Changed
- **Ask Dr Chaganti button moved to the profile header row on mobile.** It replaces the edit/delete icons, placing the primary CTA in context of the active profile. The NavBar Ask button is now hidden on mobile (still visible on desktop).
- **Edit and delete buttons removed from the mobile profile header.** Both actions remain accessible via the sidebar overlay (tap the `◧` icon → sidebar has pencil + trash). Removes clutter from a row that previously had four icons.
- **Theme toggle moved into the Settings (⚙) dropdown on mobile.** Previously the theme cycle button sat next to the "AC" wordmark where it was easy to miss. On desktop it stays in the wordmark area as before.

### Technical
- `NavBar`: Ask button gains `hidden sm:flex`; `ThemeToggle` gains `hidden sm:block` wrapper; Settings dropdown gains a mobile-only Theme row with `onSelect` preventDefault to keep the dropdown open while cycling.
- `ProfileView`: `handleMobileDelete` and `Pencil`/`Trash2` removed; `onOpenSidebarEdit` prop removed; mobile header right side is now a single `✦ Ask` button calling `handleAskFromInsight()`.
- `ProfileSidebar`: `mobileEditMode` prop and its sync `useEffect` removed; sidebar always opens in view mode (user taps the pencil inside to edit).
- `DashboardClient`: `mobileSidebarEditing` state and `onOpenSidebarEdit` wiring removed.

---

## [2026-05-21] — Mobile profile UI improvements

### Changed
- **Profile nav on mobile is now a dropdown select** instead of a horizontal scroll strip. Selecting a profile from the dropdown immediately switches to that profile. The existing chip strip is preserved on `sm` and wider viewports.
- **Edit profile on mobile now opens the inline sidebar form** (same as desktop) instead of navigating to the separate `/profiles/[id]/edit` full-page form. The edit button in the mobile header triggers the sidebar overlay in edit mode.
- **Sidebar is now accessible on mobile** via a `PanelLeft` icon button to the left of the profile name in the mobile header. Tapping the icon opens a full-screen overlay containing birth info, panchang, D1 (Rasi) chart, and D9 (Navamsa) chart — previously these were only visible on desktop. Switching profiles closes the overlay automatically.

### Technical
- `ProfileNav`: renders `<select>` on `< sm`, chip strip on `sm+`.
- `ProfileSidebar`: new `mobileOpen / onMobileClose / mobileEditMode` props; `<aside>` switches between `fixed inset-0 z-50` overlay on mobile and the standard `hidden md:flex w-80` sidebar on desktop.
- `ProfileView`: new `onOpenSidebar` / `onOpenSidebarEdit` optional callbacks; mobile header restructured to add the `PanelLeft` trigger.
- `DashboardClient`: manages `mobileSidebarOpen` / `mobileSidebarEditing` state and wires the callbacks.

---

## [2026-05-21] — Mobile dasha-row alignment (Today tab + Dasha tab)

### Fixed
- **Current dasha period rows looked ragged on mobile.** The mobile
  grid for `.ac-dasha-row` used `grid-template-columns: auto 1fr`,
  which sized the level column to the widest label (PRATYANTAR) but
  left short labels (ANTAR, PRANA, SUKSHMA) **left-aligned** inside
  that column — opening a variable, ragged gap between the label and
  the planet name. Tester described it as "disorganized, unaligned".
- Now `grid-template-columns: 92px 1fr` with `text-align: right` on
  `.level`. Every label's right edge sits flush against the planet
  column → consistent visual rhythm row to row. Slightly bumped
  column-gap (12 → 14), row-gap (2 → 3), and padding (10/12 → 12/14)
  for breathing room without growing the card noticeably.
- Single CSS edit; both `TodayTab` (current dasha card) and
  `DashaTab` (dedicated tab) use the same class so both improve.

---

## [2026-05-21] — Tier-0 Playwright mobile-layout suite

### Added
- **`@playwright/test`** + `playwright.config.ts` + `tests/playwright/landing.spec.ts`.
  Three layout-only assertions that run across **three mobile viewports**
  (360 × 800, 375 × 812, 414 × 896) in Chromium-headless:
  1. Landing snippet paragraph and the "Astro Chaganti" brand row do
     **not** vertically intersect (catches the overlap regression that
     just shipped to testers).
  2. "Continue with Google" CTA is fully inside the viewport and at
     least 40-px tall (catches CTA-pushed-off-screen and tap-target
     regressions).
  3. The 12 ascendant pills exist as accessible `<tab>` elements and
     have a tappable first pill (catches the picker-collapsed-to-zero
     regression).
- Tests use `page.route()` to stub `/api/landing/today` — no DB, sidecar,
  or LLM dependency. The Next dev server boots with a stub
  `NEXTAUTH_SECRET` from `playwright.config.ts` so anyone with the
  repo can `npm run test:e2e` cold.
- `npm run test:e2e` runs the suite; `npm run test:e2e:install`
  downloads Chromium on first use.
- Vitest exclude pattern updated so it doesn't try to interpret the
  Playwright specs.
- **CI integration deliberately deferred to a follow-up PR.** First
  pass ships the tests + config + npm scripts only. Once the suite
  has run cleanly locally for a week we add a Playwright job to
  `.github/workflows/test.yml`. Keeps the dev → main pipeline from
  being flake-blocked by infra issues on day one.

### Why
- All three landing-mobile bugs we've shipped recently (`/settings`
  dead link aside) were CSS layout issues at mobile widths that
  vitest couldn't catch because it doesn't render. These three
  geometry assertions would have caught the snippet-overlap, the
  hidden-scrollbar tab strip, and the navbar-crushed-chip-strip bugs
  before they reached testers.

---

## [2026-05-21] — Mobile landing: snippet box overlapped brand row — taller panel + tighter chrome

### Fixed
- **`CosmicLanding` mobile: snippet text bled into the "Astro Chaganti"
  brand row.** The glass panel was a flex column with `.todaySection`
  set to `flex: 1` and an inner `.snippetText` with a rigid `height: 13em`
  (~175px at 13.5px font). Below the snippet, the panel chrome (brand
  row + features + sidereal row + CTA) needed ~310px. On a 720-px
  Android viewport the panel was only 62vh = 446px, leaving the
  todaySection's flex slot too small for the 13em snippet box — so the
  snippet visually overflowed its container and rendered on top of the
  brand row.
- Three coordinated changes inside `@media (max-width: 700px)`:
  1. Panel height 62vh → **68vh** (recovers ~43px on a 720-px phone).
     `pillDock` `bottom: calc(62vh + 8px) → calc(68vh + 8px)` and
     `mobileFade` `bottom: 54vh → 60vh / height: 28vh → 22vh` track
     the new top edge so the wheel/snippet pill dock alignment is
     preserved.
  2. `.snippetText` height 13em → **12em** + `-webkit-line-clamp` 8 → 7
     (recovers ~14px; still fits a 320-char snippet at ~46-50 chars
     per visible line × 7 lines = ~340 chars cap).
  3. Trimmed mobile chrome margins: `.panelDivider` 14px → 8px,
     `.brandRow` margin-bottom 14px → 8px, `.features` margin-bottom
     14px → 8px, `.siderealRow` margin-bottom 16px → 8px. Brand
     subtitle font 16px → 12px, brand name 28px → 26px. Net ~30px
     recovered without breaking the visual rhythm.

---

## [2026-05-21] — Mobile: tab strip shows scrollbar so the "Jaimi…" cutoff has a swipe affordance

### Fixed
- **Profile tab strip looked truncated on mobile.** Mobile users saw
  "Today | Planets | Divisional | Yogas | Jaimi…" with no visual cue
  that the strip horizontally scrolls (Ashtakavarga / Dasha / Transits
  / Career / Compatibility were one swipe away but invisible). The
  scrollbar was hidden via `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
  — fine on desktop where the strip usually fits, hostile on mobile
  where it always overflows. Now the hide rules are gated on `sm` and
  up, so mobile gets a thin native scrollbar as the swipe affordance.

---

## [2026-05-21] — Mobile NavBar: wordmark collapses to "AC" so profile chips fit

### Fixed
- **Profile switcher invisible on mobile.** The NavBar wordmark "Astro
  Chaganti" + ThemeToggle + Add profile + Ask + Settings icons consumed
  the entire 360px width, crushing the `flex-1` slot reserved for
  `ProfileNav` to zero. Mobile users with multiple profiles had no way
  to switch between them. Now the wordmark renders as "AC" below the
  `sm` breakpoint (640px) — full "Astro Chaganti" returns at 640px+.
  Frees ~140px for the profile chip strip on mobile.
- Added `data-testid="profile-nav"` to the ProfileNav container so the
  upcoming Playwright mobile-geometry tests can assert the chip strip
  has non-zero width at small viewports.

---

## [2026-05-21] — Hotfix: stable user.id + mobile create-sidebar + dead-link gate + auth contract tests

### Fixed
- **Orphan profiles after sign-in (P0).** `lib/db/users.ts` was running
  `ON CONFLICT(email) DO UPDATE SET id = excluded.id, …` on every Google
  sign-in, which rewrote the primary key whenever NextAuth produced a
  different `user.id` for the same email — orphaning every
  `profiles.user_id` row pointing at the old value. Three testers and a
  family member hit this in production. Fix: drop `id = excluded.id`
  from the upsert, add `users.getByEmail`, and resolve `session.user.id`
  from the DB (by email) in `lib/auth.ts`, with a `token.sub` fallback
  for the first-signin race.
- **Mobile profile creation sidebar invisible.** `ProfileSidebarCreate`
  used `hidden md:flex` — fine for the read-only sidebar (chips replace
  it on mobile), but the create state has no mobile equivalent, so
  mobile users saw "enter the birth details in the sidebar" and no
  sidebar. Now `w-full md:w-80 … flex` so it spans full width on mobile.
- **`/settings` dead link in NavBar dropdown.** "Account settings" linked
  to a route that doesn't exist (no `app/settings/page.tsx`). Removed the
  menu item; will restore when the settings page is built.

### Added (preventive guards)
- **`lib/db/users.test.ts`** — contract tests on `users.upsert` that
  fail if anything re-introduces `id = excluded.id` in the ON CONFLICT
  clause, plus coverage for `users.getByEmail`. The original incident
  would have been caught by a 10-line test; now it is.
- **`scripts/check-dead-route-links.mjs` + `npm run check:routes` CI
  gate.** Enumerates routes from `app/**/page.tsx`, scans `.ts`/`.tsx`
  in `app/`, `components/`, `lib/` for `Link href="/…"`,
  `router.push("/…")`, `redirect("/…")` etc., and fails on any literal
  that doesn't resolve to a real page. Wired into `.github/workflows/test.yml`
  and the `AGENTS.md` pre-flight checklist. Skips template literals
  (`/dashboard?profile=${id}`) and external URLs.

### Operational
- Existing orphan profiles in production are NOT auto-recovered by
  this fix — they remain pointed at stale user ids. A one-time SQL
  backfill is required to relink them to the canonical id for each
  affected email. The PR body documents the queries; not blocking
  this merge.

---

## [2026-05-21] — Landing: eyebrow names the active ascendant + LLM stops restating transits + slower cross-fade

### Changed (landing UI)
- **`CosmicLanding.tsx` eyebrow now reads "THE COSMOS SPEAKS FOR
  ARIES"** (or whatever sign is active). After the prompt was tightened
  for word count, the LLM stopped reliably opening snippets with the
  ascendant name — so the reader couldn't always tell which sign the
  paragraph addressed. The sign name in the eyebrow cross-fades in
  lockstep with the snippet (shares the `snippetCopyIn` / `snippetCopyOut`
  transition classes), and gets a gold-accent colour so the active sign
  is unambiguous at a glance.
- Tracks a new `displayedKey` state next to `displayedSnippet` — both
  swap together when the active sign changes.
- **Slowed the snippet cross-fade.** `SNIPPET_FADE_OUT_MS` 380 → 700
  and `SNIPPET_FADE_IN_MS` 520 → 900. Total 1600ms transition vs 6500ms
  cycle leaves ~5s of stillness — plenty of read time, but the
  transition itself feels like a wind-stroke instead of a click.

### Changed (LLM prompt — `PROMPT_VERSION_LANDING` 3 → 4)
- **Snippets no longer restate today's transit data.** The reader
  already sees the Moon nakshatra / Sun sign / retrogrades in the
  tile row above the snippet; opening with "The Sun in Taurus brings…"
  wasted the 45-word / 300-char budget on info the reader already had.
  System prompt now explicitly forbids phrases like "The Sun in…",
  "Moon in <nakshatra> asks…", "Mercury retrograde slows…". User prompt
  reinforces: today's sky is private context for the LLM's choice of
  angle; the snippet's words go to guidance, not celestial mechanics.

---

## [2026-05-21] — Hotfix: cron via GitHub Actions, not Vercel Cron

### Fixed
- **PR #91's deploy was rejected by Vercel.** Vercel Hobby plan only
  allows daily cron schedules; the `0 */8 * * *` schedule in
  `vercel.json` failed validation and blocked the development deploy
  entirely (no cron route, no DOB fix, no Rahu/Ketu filter ever
  reached the preview). Vercel's status check link pointed at the
  Cron Jobs Usage & Pricing docs as the diagnostic.

### Changed
- **Switched to GitHub Actions schedule.** Removed `vercel.json` (the
  crons section was its only content). Added
  `.github/workflows/landing-cron.yml` with `schedule: 0 */8 * * *`
  that curls `/api/cron/regenerate-landing` with the
  `Authorization: Bearer ${{ secrets.CRON_SECRET }}` header. Same
  cadence as we wanted (every 8 hours), free, works on any GitHub plan.
  The endpoint code is unchanged.
- **Two repo secrets needed in GitHub** (Settings → Secrets and variables
  → Actions):
  - `CRON_SECRET` — same value as the Vercel env var
  - `LANDING_CRON_URL` — full URL, e.g.
    `https://astrochaganti.com/api/cron/regenerate-landing`
  Workflow fails loudly if either is missing.

### Documentation
- `docs/PROJECT.md` env table — clarified `CRON_SECRET` lives in two
  places (Vercel + GitHub) and explained the GitHub Actions choice.
- `docs/RUNBOOK.md` promotion env-parity table — updated.

---

## [2026-05-21] — DOB max + Rahu/Ketu filter + 8-hour cron landing refresh

### Added
- **Vercel Cron every 8 hours** regenerates today's landing snippets
  when the moon's nakshatra changes. New route `/api/cron/regenerate-
  landing` (auth via `CRON_SECRET` header) + `vercel.json` with
  schedule `0 */8 * * *`. **Smart skip:** if the moon's nakshatra in
  today's cached payload matches the current sky, no LLM call. Net
  cost: 1–2 LLM calls/day typical, catches the nakshatra change
  within ≤8 hours of when it happens.
- Seven unit tests cover auth (missing/wrong/unset secret), skip,
  regenerate, and cold-row paths.

### Changed
- **Profile form blocks future DOB.** `max={today}` on the date input
  in both `ProfileFormFields.tsx` and `ProfileForm.tsx`. Server-side
  defense-in-depth validation in `POST /api/profiles` and
  `PUT /api/profiles/[id]`.
- **Rahu/Ketu filtered out of the retrograde tile** in
  `fetchTodayCelestialFacts()`. The lunar nodes are always retrograde
  from Earth's frame; surfacing them every day was noise.

### Documentation
- `docs/PROJECT.md` — added `CRON_SECRET` (required).
- `docs/RUNBOOK.md` — promotion-runbook env-parity table updated.

---

## [2026-05-21] — Test/lint guards + Sentry runbook

### Added (catch entire bug classes going forward)
- **Negative-case route tests.** Three routes now assert "DB throws →
  handler doesn't 500" (the exact bug class that caused the recent
  `/api/landing/today` outage). The tests caught two real prod risks
  during this session:
  - `PATCH /api/readings/[id]/rating` was unwrapped — wrapped in
    try/catch with Sentry capture, returns 503 on DB failure.
  - `GET /api/readings/today-reading` was unwrapped — same fix.
- **CI palette gate.** `scripts/check-no-raw-palette.sh` (new) +
  `npm run check:palette` blocks raw Tailwind palette classes
  (`bg-emerald-900`, `text-amber-300`, etc.) in `app/`, `components/`,
  `lib/`. Same class of bug as the recent Tarabalam regression. Wired
  into the GitHub Actions workflow + `AGENTS.md` pre-flight checklist.

### Migrated to theme tokens
- `lib/astro-utils.ts` `dignityBadgeColor()` — was raw palette per
  dignity state (Exalted/OwnSign/Debilitated/Friend/Enemy/default).
  Now maps to `--color-success`, `--color-accent`, `--color-danger`,
  `--color-cool`, `--color-warning`, `--color-ink-4` respectively. Test
  rewritten to assert tokens, not raw colour names.
- `components/ProfileLoadingScreen.tsx` — orbiting planet dots
  (`bg-violet-400`, `bg-sky-300/70`) → `--color-accent-dim` and
  `--color-cool`.
- `app/credits/page.tsx` — link colour `prose-a:text-blue-300` →
  `prose-a:text-[var(--color-cool)]`.

### Documentation
- **`docs/RUNBOOK.md`** — new "Weekly Sentry review" section. ~15
  min cadence; lists what to look at (new issues, frequency-sorted top
  5, Web Vitals, releases), what to ignore (AbortError noise, bot
  crawlers, single-event Safari flukes), what to act on (500s from any
  route, repeated client-component errors, release-time spikes).

---

## [2026-05-21] — Landing API hotfix + UX polish (gender, loader, snippet box)

### Fixed
- **`/api/landing/today` was returning HTTP 500** on every request to the
  development preview. Two compounding bugs:
  1. **Race condition in `recordAttempt`** — the SELECT-then-INSERT
     pattern hit `UNIQUE constraint failed: daily_landing.ist_date`
     whenever two cold-cache visitors landed at nearly the same time.
     Replaced with a single atomic `INSERT … ON CONFLICT(ist_date) DO
     UPDATE` UPSERT.
  2. **Unwrapped DB calls in the route handler** — `getByDate()` and
     `getMostRecentSuccess()` could throw and bubble up as a 500.
     Wrapped both in try/catch; the route now gracefully falls through
     to the cold-start 503 instead of crashing.
- **`lib/db/daily-landing.ts` now self-creates its table.** Added a
  module-level `ensureTable()` that runs an idempotent `CREATE TABLE IF
  NOT EXISTS` before every operation, so the module is robust to any
  schema-version drift (the main `ensureSchema()` flow gates table
  creation by `schema_version`, which can skip the CREATE if version
  was bumped without the table actually existing).
- **Snippet's last line was visually clipping descenders** (the `g` /
  `y` tails of "obvious" etc.). Bumped `.snippetText` height from
  11.5em → 13em, `line-height` 1.55 → 1.6, added `padding-bottom:
  0.35em` to the snippet `<p>` so the `-webkit-line-clamp` +
  `overflow: hidden` combo doesn't visually shear the bottom line.
  Mobile equivalent: height 9em → 10em, padding 0.3em.

### Changed
- **Profile-creation loader dismisses on chart-ready instead of
  all-four-fetches-ready.** Was: wait for chart + transit + career +
  today-reading (slow LLM call). Now: wait for chart only — the other
  engines load behind the dashboard with per-engine loading states.
  Minimum animation time also shortened 2s → 1.4s. Combined effect:
  loader now feels deliberate, not stuck.
- **Profile form gender options reduced to Male / Female.** Removed
  the "Other" option from both the `<select>` in `ProfileForm.tsx`
  and the `GENDERS` constant in `ProfileFormFields.tsx`. Existing
  profiles with `gender: "Other"` remain valid in the DB.

---

## [2026-05-21] — Landing page polish: auto-resume cycling, em-dash safety, no-clip snippets, faster first paint

### Changed
- **Cycle auto-resumes 25s after pin.** `CosmicLanding.tsx`: when the user
  clicks/taps a sign, we hold on it for 25s then quietly flip
  `isPinned` back to false so the cycle picks back up. Page stays
  lively even after interaction. localStorage-restored pins are not
  auto-cleared (visitor presumably still wants their sign).
- **Defensive em-dash fallback in transit tiles.** `buildSkyTiles` now
  treats empty/whitespace-only values the same as missing data, so
  partial API responses can't render invisible empty spans (the
  reported "tiles aren't showing" bug).
- **No more brutal mid-snippet truncation.** Three coordinated changes:
  1. `lib/engines/today-landing.ts`: snippet Zod schema now has
     `.max(320)`. Over-long Gemini responses fail validation, the route
     retries (3/day budget), and the next attempt is asked to be shorter.
  2. Prompt tightened: "STRICT MAX 45 words AND 300 chars (aim 35-42 /
     ~250 chars). Over-length snippets cause the whole response to be
     rejected." `PROMPT_VERSION_LANDING` bumped 2 → 3.
  3. `CosmicLanding.module.css`: snippet font reduced to
     `clamp(17px, 1.9vw, 22px)`, line-clamp from 5 → 7, box height
     9.5em → 11.5em. Holds 300+ chars without clipping. Client-side
     last-resort cap raised 320 → 360 (rarely fires now).
- **Cosmos-speaks section sits higher in the glass panel.**
  `.todaySection` switched from `justify-content: center` to
  `flex-start` with small padding. Brand row + CTA stay inside the
  panel; the snippet feels anchored near the top.

### Performance
- **Canvas init deferred via `requestIdleCallback`.** The 260-star + meteor
  canvas no longer blocks first paint. Falls back to a short setTimeout
  in Safari (no `requestIdleCallback`). Expected ~80–120ms cut to LCP
  on cold loads.

### Tests
- `lib/engines/today-landing.test.ts` — new case verifying `.max(320)`
  rejects snippets that exceed the bound.

---

## [2026-05-21] — Profile-create flow + theme-aware Tarabalam + "What's active now" fallback

### Fixed (profile creation)
- **Previous profile's chart no longer renders behind the create form.**
  `app/dashboard/DashboardClient.tsx`: when `isCreating` is true, the
  main panel now renders the create empty-state regardless of any
  `activeProfile` left over from the URL the user came from.
- **Post-create redirect now actually lands on the new profile.**
  `app/dashboard/page.tsx`: added a `key` prop to `<DashboardClient>`
  derived from URL params (profile id + isCreating + isNewProfile) so
  the component remounts on navigation. Without this, React's `useState`
  initializer kept the previously-active profile id, ignoring the new
  `?profile=<newId>&new=1` URL.
- **`ProfileLoadingScreen` now fires on the post-create redirect.**
  Side effect of the same fix — the remount initializes
  `showLoadingScreen` from the fresh `isNewProfile` prop.

### Fixed (theme adaptation)
- **`lib/tarabalam.ts` `taraColor()`** was returning hardcoded Tailwind
  palette classes (`bg-emerald-900/40 text-emerald-300 …` /
  `bg-red-900/30 text-red-300 …`) that don't adapt to the Vellum (light)
  theme. Replaced with `--color-success-*` / `--color-danger-*` tokens
  matching the rest of the app.
- **`components/unified/IdentityStrip.tsx`** Sun sign was rendered in
  `text-amber-300` (also off-theme). Switched to `text-[var(--color-accent)]`.

### Changed (insights)
- **"What's active now" section now always renders** on the Today tab.
- `lib/insights.ts` adds a low-urgency fallback: when no imminent
  antardasha, no imminent pratyantar, no active Sade Sati, and no Kaal
  Sarpa is present, surface the upcoming pratyantar shift regardless of
  distance ("Next: Saturn pratyantar in ~3 months"). New helper
  `formatLeadTime()` picks weeks vs. months automatically.
- `components/tabs/TodayTab.tsx` removes the `when={insights.length > 0}`
  gate. The empty-state copy ("A quiet stretch in your chart…") is
  reserved for the rare case where dasha data isn't loaded.

### Tests
- Updated `lib/__tests__/insights.test.ts` to cover the new fallback
  contract: when antar+pratyantar are both far, the fallback fires; when
  an imminent insight is already present, the fallback skips.

---

## [2026-05-20] — Prune dead npm dependencies

### Removed
Six unused packages from `package.json` + the matching `package-lock.json`
entries, verified by grepping `from "<pkg>"` across the codebase:

- `@fusionstrings/panchangam` — engine removed long ago; also dropped
  its now-stale entry from `serverExternalPackages` in `next.config.ts`.
- `dompurify` + `@types/dompurify` — only `isomorphic-dompurify` is
  imported (`lib/sanitize.ts`). `isomorphic-dompurify` ships its own
  `.d.ts`, so the explicit types package is also unnecessary.
- `uuid` + `@types/uuid` — `lib/db/profiles.ts` uses `randomUUID`
  from `node:crypto` instead. No imports anywhere.
- `tsconfig-paths` — vitest has its own `resolve.alias`; `tsx` reads
  `tsconfig.json` directly. No references in any config or source.

Supersedes PR #78 (which had become unmergeable due to overlap with the
earlier cleanup PR #80 that already removed the boilerplate SVGs).

---

## [2026-05-20] — Today readings: copy / share / thumbs feedback

### Added
- New reusable `<ReadingActions>` (in `components/tabs/ReadingActions.tsx`):
  Copy (clipboard), Share (Web Share API with copy fallback), Thumbs
  Up / Down. Toggles off on second tap. Rolls back optimistic state on
  network failure.
- Wired into both Today-tab reading cards (`Current period —` and
  `Your natal chart`) via plumbing through `DashboardClient` →
  `TodayTab`. Each card now exposes the four actions in a small
  toolbar row at the bottom.
- PostHog events fire from the client:
  - `today_reading_copied` `{ engine, length }`
  - `today_reading_shared` `{ engine, surface: 'web-share'|'clipboard-fallback', length }`
  - `today_reading_rated`  `{ engine, rating: 1 | -1 | null }`

### Added (API)
- `PATCH /api/readings/[id]/rating` (new) — user-facing thumbs endpoint.
  Validates the session user owns the profile the reading belongs to
  via `db.profiles.get(profile_id, userId)`. Admins can rate any
  reading. Returns 401/404/400 appropriately. Six unit tests cover the
  branches.
- `db.readings.getById(id)` — small CRUD helper used by the rating
  endpoint.
- `GET /api/readings/today-reading` now returns `meta.current` and
  `meta.natal` (each `{ id, rating }`) alongside the existing
  `output` so the Today tab can wire ratings without an extra fetch.

---

## [2026-05-20] — Landing polish: anchored eyebrow, wind cross-fade, mobile pills out of glass

### Changed
- **`CosmicLanding.tsx` + `CosmicLanding.module.css`:**
  - Removed the per-sign `ASCENDANT — RISING` label. The LLM snippet
    already names the sign — the label was redundant.
  - Anchored the "The cosmos speaks" eyebrow at a fixed top position
    inside a fixed-height snippet box (9.5em desktop, 7.5em mobile).
    The eyebrow no longer jumps as snippet lengths vary; the
    paragraph below clips at 5 lines (4 on mobile) with `-webkit-line-clamp`.
    Client-side defensive truncate to 320 chars too.
  - **Cross-fade between snippets** ("wind stroke" feel): state-driven
    two-phase transition. Current text fades out with a slight upward
    drift + 4px blur (380ms), the displayed text swaps, then drifts
    back in (520ms). Replaces the abrupt key-remount fade.
  - **Mobile: pill picker moved ABOVE the glass panel.** The pills now
    sit in a new `.pillDock` fixed-positioned above the panel's top
    edge (against the night sky, not behind the panel's frosted
    glass). Backdrop blur on each pill keeps glyphs legible over the
    starfield.
- **`lib/engines/today-landing.ts`** prompt tightened from "~50 words"
  to "STRICT max 40 words, aim for 30-38." `PROMPT_VERSION_LANDING`
  bumped 1 → 2 (signals intent; daily cache key is by IST date, so
  the new prompt takes effect on tomorrow's regeneration).

### Removed
- The "Free · Up to 10 Natal Charts and 6 Kundali Matches" footnote
  under the sign-in button.

### Changed (follow-up — make today's transits actually visible)
- Replaced the small low-contrast `.skyBadge` pill with a proper three-
  tile row above "The cosmos speaks": **Moon · Sun · Retrograde** with
  a `Today` / `Yesterday` eyebrow above them. The third (Retrograde)
  tile only appears when at least one planet is retrograde. Em-dash
  placeholders before `/api/landing` resolves so the layout never
  shifts on data arrival.

---

## [2026-05-20] — Audit round 2: mobile layout fixes + Transits cleanup

### Added
- **Landing — "The cosmos speaks" eyebrow** restored above the sign
  label so the snippet has the same framing line the earlier version
  had. Same fade animation as the label + paragraph.

### Fixed
- **Landing — mobile panel was bleeding the spinning wheel through
  the glass.** Strengthened the mobile `.panel` background
  (`rgba(8,4,24,0.78)`) and increased the backdrop blur to 42 px so
  the wheel reads as a faint glow behind the panel rather than
  competing with the snippet copy.
- **Jaimini → Upapada (spouse indicator) — mobile squeeze.** The card
  was a single 4-column grid (UL sign / Lord / 2nd from UL /
  description) which collapsed the description to one word per line
  on phones. Split into a 3-column header row + a full-width
  description block underneath, separated by a thin divider. New
  `.ac-upapada` / `.ac-upapada-row` / `.ac-upapada-desc` classes
  handle the desktop + mobile layout.
- **Current Dasha Period — mobile date-superscript.** The
  `.ac-dasha-row` grid `110px 1fr auto` was squashing the date range
  into a 2-line superscript next to a giant planet name. Added a
  `@media (max-width: 640px)` rule that reflows the row into
  `level | planet` / `level | range` grid areas so the date sits on
  its own line, full-width, in mono, with `white-space: nowrap`.

### Removed
- **Transits tab — "Transit detail" planet-card strip.** The compact
  per-planet card grid below the chart (showing retrograde marker,
  house-from-lagna, house-from-moon, planet SAV) is gone. The same
  bindu information is already in the natal-SAV-lattice chart
  immediately above. Dropped the now-unused `PLANET_ORDER` import.

### Verified
- `tsc --noEmit`, `npx vitest run` (387 tests), `npx eslint .` clean.
- Landing renders 200 with the "The cosmos speaks" eyebrow visible
  in the HTML.

---

## [2026-05-20] — Landing page: restore wheel spin, fix font var, never-empty snippet

### Fixed
- **Zodiac wheel no longer rotates naturally.** PR #81 had replaced
  the continuous slow rotation with a discrete
  `transform: rotate(${activeIndex * 30}deg)` snap on the rotor `<g>`,
  so the wheel only moved 30° every 6.5 s (auto-cycle step) and felt
  jerky. Restored the pre-#81 behaviour:
  `animation: spinZodiac 160s linear infinite` directly on the rotor.
  The `@keyframes spinZodiac` in `app/globals.css` was already there
  — the rewrite just stopped referencing it. Click-to-pin still
  updates the panel snippet; the wheel itself stays decorative.
- **Landing fonts fell back to Georgia.**
  `components/CosmicLanding.module.css` referenced
  `var(--font-cormorant)` in three places, but that CSS variable is
  not defined anywhere — `app/layout.tsx` exposes only
  `--font-display` (Libre Baskerville), `--font-ui` (Inter), and
  `--font-mono`. The italic 32 px snippet and the "Astro *Chaganti*"
  brand row were silently falling back to Georgia. Swapped all three
  references to `var(--font-display)`.
- **Snippets never appeared.** On cold start (no prior `daily_landing`
  row) and any subsequent generation failure (sidecar timeout,
  missing `GOOGLE_GEMINI_API_KEY`, etc.), `/api/landing/today`
  returns `503 no_content_available`, the client set `errored=true`,
  and the panel rendered "Astro Chaganti / Sign in to begin." — no
  per-sign text at all. Loosened PR #81's "no canned-text fallback"
  rule: added `lib/content/landing-fallback.ts` with one short
  (~30–45 word) curated paragraph per ascendant, in the same
  observational tone as the LLM prompt. The client now always
  renders a per-sign paragraph from that map; when the API succeeds,
  today's LLM-generated copy supersedes the fallback transparently.

### Changed
- Removed the dead `.zodiacRotor` and `.signIndicator` CSS classes,
  the 12 o'clock indicator polygon, the mobile media-query rule that
  hid the indicator, and the `errored` / `showFallback` client state
  — the snippet path is now always live.
- Auto-cycle effect no longer waits for `data` to load; it ticks
  through the fallback snippets immediately on mount.
- Added a small `landingSnippetFade` keyframe so the active sign
  label and snippet text fade in (~500 ms) whenever the active sign
  changes (auto-cycle or click). React `key` on the `<p>` /
  `<span>` re-triggers the animation per cycle.

### Notes
- The cold-start / failure UX no longer reads as broken even when
  the LLM endpoint is unreachable. The "Today — Moon in …" sky
  badge still only appears when the live endpoint returns; the
  static fallback never invents transit facts.
- `tsc --noEmit`, `npx vitest run` (387 tests), and `npx eslint .`
  all clean.

---

## [2026-05-20] — Living landing: 12 daily ascendant snippets

### Added
- `/api/landing/today` public endpoint: returns today's 12 ascendant
  snippets + the "today's sky" badge data (Moon nakshatra, Sun sign,
  active retrogrades). Lazy-generated on first visit of the IST day
  via a single Gemini Flash Lite call. Cost ~$0.0001/day.
- `lib/engines/today-landing.ts` — sidecar synthetic call for today's
  celestial facts; LLM prompt grounded in the authored ascendant
  content blocks (`lookupAscendant`) for stable per-sign lens; Zod-
  validated output.
- `lib/db/daily-landing.ts` + new `daily_landing` table
  (`SCHEMA_VERSION` 8 → 9). Tracks `attempts`, `last_attempt_at`,
  `generated_at` for retry budget.
- Failure handling: max 3 attempts per IST day with ≥10-minute gap.
  Until today succeeds, the endpoint serves the most recent prior
  successfully-generated day with `is_stale: true` (badge phrasing
  switches to "Yesterday's sky — …"). All failures captured to
  Sentry. The hardcoded quote rotator is **removed** — no canned-
  text fallback.
- `CosmicLanding.tsx` rewrite:
  - Spinning zodiac wheel is now the desktop picker. Each sign is a
    click target; clicking pins the active sign and rotates the
    wheel to put it under the new stationary 12-o'clock indicator.
  - Mobile gets a horizontal pill strip with auto-cycle (6.5s) and
    tap-to-pin.
  - localStorage `astrochaganti.ascendant` restores the pinned sign
    on return.
- PostHog event `landing_ascendant_pinned` with
  `{ sign, source: "click"|"tap"|"restored", is_stale }`.

### Removed
- `QUOTES_DESKTOP` / `QUOTES_MOBILE` hardcoded arrays and the quote
  rotator `useEffect` block in `CosmicLanding.tsx` — landing is now
  fully LLM-driven (or shows yesterday's content during failure).

### Verified
- `tsc --noEmit` clean
- 387 tests pass (10 new)
- ESLint clean

---

## [2026-05-20] — Cleanup + remove pending-request submission limit

### Removed
- `design/landing-mockup/` (24MB, local-only Vite scratchpad — was already
  gitignored, this just clears local disk + drops the now-dead
  gitignore/eslintignore entries).
- `public/earth.{webm,mp4}` (1.6MB) and the earth render block in
  `components/CosmicLanding.tsx` + `.module.css` (`.earthWrap` /
  `.earthAtmo` / `.earthClip` / `.earthLight` + mobile rule). Landing
  still has the zodiac wheel, glass quote panel, and starfield.
- Default `create-next-app` boilerplate SVGs from `public/`:
  `next.svg`, `vercel.svg`, `file.svg`, `window.svg`, `globe.svg`
  — zero references anywhere in the codebase.
- "You already have an outstanding consultation request" 409 guard in
  `POST /api/consultation-requests`. Users can now submit any number of
  questions back-to-back; the rate-limit (5/min) still applies. The
  corresponding test case was removed.

### Why
- Cleanup: drop accidentally-committed mockups + 1.6MB of unused
  landing assets before launch.
- The pending-request limit was a guard for the (now-dormant) payment
  flow — it doesn't fit the email-driven model where Dr. Chaganti may
  legitimately have several open questions per user in flight.

---

## [2026-05-20] — Admin email notifications via Resend

### Added
- `resend` SDK + `lib/email/client.ts` (lazy singleton, returns null when
  `RESEND_API_KEY` is missing so local dev / tests don't blow up).
- `lib/email/admin-notify.ts` — sends a formatted HTML+text email to the
  admin recipient when a new consultation request lands. Includes
  requester, profiles, mode, slot (if appointment), the question itself,
  and a link to /admin.
- Wired into `app/api/consultation-requests/route.ts` POST handler.
  Uses Next.js 16 `after()` so the user-facing submission isn't delayed
  by Resend latency. Wrapped in try/catch — outside a request scope
  (tests), it silently skips.
- Constants in `lib/constants.ts`:
  - `ADMIN_EMAIL_NOTIFICATIONS_ENABLED` (kill-switch, default `true`)
  - `ADMIN_NOTIFY_EMAIL` = `astrochaganti@gmail.com`
  - `EMAIL_FROM` = `Astro Chaganti <onboarding@resend.dev>` — Resend's
    shared sender; switch to a verified-domain sender once
    `astrochaganti.com` is live.
- `docs/PROJECT.md`: documented `RESEND_API_KEY`.

### Why
- The "respond by email" flow depended on Dr. Chaganti manually checking
  the admin queue. Without a notification, a question could sit for
  days. This closes that gap before public launch.

---

## [2026-05-20] — Enforce ESLint as a gate

### Changed
- **`.github/workflows/test.yml`** — removed `continue-on-error: true` from
  the ESLint step. Lint errors now fail the CI workflow like tsc and
  vitest do. Renamed the step from `ESLint (advisory)` to `ESLint`.
- **`.githooks/pre-push`** — added `npm run lint` after the vitest step.
  Pushes are now blocked locally if lint reports errors. Warnings are
  still tolerated (ESLint's default exit behavior).
- **`AGENTS.md`** — added `npm run lint` to the pre-flight checklist
  required before opening any PR. This closes the gap that allowed
  React 19.2's stricter rules to surface 12 errors that piled up before
  CI was set up.

### Why
With the slate cleaned in the previous entries (0 errors, 0 warnings),
the gate can be tightened. The protocol previously enforced tsc + vitest
but not lint, which let React purity and set-state-in-effect violations
accumulate undetected.

---

## [2026-05-20] — Shared `<EngineLoading>` and `<EngineError>` components

### Added
- **`components/ui/EngineLoading.tsx`** — shared loading state for engine
  views. Two variants: `inline` (spinner + text, no surface) and `card`
  (wrapped in `.ac-card .ac-card-pad`). Accent-colored `Loader2`,
  `role="status"`, `aria-live="polite"`.
- **`components/ui/EngineError.tsx`** — shared error state. Accepts a
  string or `Error` (renders nothing if nullish), optional `onRetry`
  renders a "Retry" button, `tone` switches between `danger` (default,
  red) and `warning` (yellow, for soft / no-data states). Built on the
  existing `.ac-banner` CSS.
- **`app/globals.css`** — added `.ac-banner.danger` (uses
  `--color-danger-*` tokens) to complete the trio alongside the existing
  `.accent` and `.warn` variants.
- **`components/ui/__tests__/EngineLoading.test.tsx`** and
  **`components/ui/__tests__/EngineError.test.tsx`** — 11 unit tests
  covering default message, variant switching, tone switching, nullish
  guard, Error-instance unwrapping, and Retry button click.

### Changed (migrations using the new components)
- **`components/engines/TarabalamView.tsx`** — replaced the inline
  `<div className="ac-banner warn">{error}</div>` with
  `<EngineError error={error} onRetry={handleSearch} />`. Switches the
  tone from warning to danger (genuine fetch errors deserve danger
  styling) and adds a one-click retry button that was previously absent.
- **`components/engines/MuhurthaView.tsx`** — replaced the synchronous
  `alert(...)` on search failure with `toast(message, "error")`. Aligns
  with the rest of the app's toast pattern and doesn't block the user.
- **`components/engines/ExplainerModal.tsx`** — replaced the inline
  `<Loader2 /> Loading readings…` snippet with
  `<EngineLoading message="Loading readings…" />`. The `Loader2` import
  is no longer needed at this site.

### Why
Previously each engine reinvented loading and error UI: some used
`.ac-banner.warn`, some used inline `text-red-400` paragraphs, some used
browser `alert()`. The result was visually inconsistent and accessibility
was uneven. These shared components give a single, accessible
(`role="status"` / `role="alert"`, `aria-live`) source of truth that
future engines should reach for first.

---

## [2026-05-20] — Clear all ESLint warnings

### Fixed
- **17 ESLint warnings → 0** across 13 files. All were truly unused
  imports, unused locals, or stale `eslint-disable` directives — no
  behavior change.
  - Unused imports removed:
    - `app/admin/page.tsx` — `Link` from `next/link`
    - `app/api/admin/backfill/route.ts` — `db` from `@/lib/db`
    - `app/consultation/ConsultationForm.tsx` — `scale` from typography
    - `components/profile/ProfileSelectorCard.tsx` — `motion`
    - `components/tabs/CompareTab.tsx` — `CheckCircle2`, `XCircle`,
      `MinusCircle`
    - `components/unified/NatalChartGrid.tsx` — `SIGNS_ORDER`
    - `lib/__tests__/insights.test.ts` — `TodayInsight` type
    - `lib/db/profiles.ts` — `User` type
    - `components/panels/__tests__/AskPanel.test.tsx` — `userEvent`
  - Unused locals removed:
    - `app/dashboard/DashboardClient.tsx` — `fetchTodayReading` (dead
      `useCallback`; grepped repo confirms no references)
    - `components/engines/TarabalamView.tsx` — `currentProfile`
  - Stale `eslint-disable` directives removed:
    - `app/dashboard/DashboardClient.tsx:175` — `exhaustive-deps`
      directive that no longer matched a fired rule
    - `components/ui/Toast.tsx:45,139` — two `no-console` directives
      around `console.warn` calls; `no-console` isn't currently
      configured to fire on `console.warn`, so the directives were noise
- **`components/engines/AIInsightCard.tsx:31`** — replaced
  `next.has(id) ? next.delete(id) : next.add(id)` (ternary used as a
  statement, flagged by `no-unused-expressions`) with an `if/else`.

### Why
With the 12 errors handled separately (PR #74), this brings ESLint
output to a fully clean slate. Easier to spot future regressions when
the baseline is `0 errors, 0 warnings`.

---

## [2026-05-20] — Clear all ESLint errors

### Fixed
- **12 ESLint errors → 0** across 9 files. CI's lint step was previously
  configured with `continue-on-error: true` because of these pre-existing
  errors from Next.js 16's stricter React 19.2 rules; with the slate clean,
  CI can be tightened in a follow-up. Categories:
  - `react-hooks/purity` (Date.now() in render) — `app/consultation/page.tsx`,
    `components/engines/MuhurthaView.tsx`. Replaced with
    `new Date().getTime()` (lazy-initialized in MuhurthaView's `useState`).
  - `react-hooks/set-state-in-effect` (×6) — `app/dashboard/DashboardClient.tsx`
    (×2 fetch-driven effects), `components/ThemeToggle.tsx` (SSR mount
    canon), `components/engines/ExplainerModal.tsx` (open-driven tab snap),
    `components/engines/TarabalamView.tsx` (auto-fetch on mount),
    `components/panels/AskPanel.tsx` (form reset on close). Each call is a
    legitimate fetch / mount / reset pattern with no synchronous
    derivation; suppressed with tightly scoped
    `eslint-disable-next-line` / block disables and a comment explaining why.
  - `@typescript-eslint/no-explicit-any` (×3) — `components/unified/HouseGrid.tsx`
    cast as `SignName`; `components/engines/MuhurthaView.tsx` typed via a new
    `MuhurthaResult` shape (`start_time`, `end_time`, `date`, `points?`).
  - `prefer-const` — `components/CosmicLanding.tsx`: `let meteors` →
    `const meteors` (array is mutated via push, never reassigned).

### Not touched
- 17 ESLint warnings remain (unused vars, unused eslint-disable directives).
  Out of scope for this commit, which focused on errors only.

---

## [2026-05-20] — Make content-loader caching tests hermetic

### Fixed
- **`lib/content/loader.test.ts`** — 5 of 6 tests in this file failed
  whenever `lib/content/content-index.json` was absent (the build artifact
  is gitignored and only generated by `npm run prebuild`). The tests
  asserted a "+1" `fs.readFileSync` call attributable to the loader's
  `createRequire("./content-index.json")` at module init, which only
  fires when the JSON file exists. On any fresh checkout, `require`
  threw before hitting `fs.readFileSync`, so spy counts were off by one
  and the pre-push hook (`tsc` + `vitest`) blocked every contributor's
  push. Each test now calls `readFileSyncSpy.mockClear()` right after
  `await import("./loader")`, so assertions measure only user-triggered
  reads and are hermetic across CI (index present) and fresh local
  checkouts (index absent).

---

## [2026-05-20] — PostHog product analytics

### Added
- `posthog-js` + `posthog-node` integration via PostHog wizard. EU
  region. Browser inits in `instrumentation-client.ts` (alongside
  Sentry). Server singleton in `lib/posthog-server.ts`. Server-side
  identify on Google sign-in (`lib/auth.ts`); client-side identify on
  session change (`components/PostHogIdentifier.tsx`).
- `/ingest/*` rewrite proxy in `next.config.ts` for ad-blocker
  resilience.
- Events captured:
  - `user_signed_in` (server, NextAuth signIn callback)
  - `profile_created`, `profile_deleted` (server, REST)
  - `consultation_request_created` (server, REST — authoritative for
    funnel)
  - `consultation_feedback_submitted` (client, rating thumbs)
  - `feedback_submitted` (server, FeedbackWidget)
  - `ask_panel_opened`, `ai_insight_panel_opened` (client, UI)

### Tuned
- `capture_exceptions: false` in PostHog — Sentry already handles
  exception tracking; do not double-capture.
- Removed wizard-added client-side `consultation_submitted` and
  `ask_submitted` events — both POST to `/api/consultation-requests`
  which fires the authoritative server-side `consultation_request_created`,
  so the client events were duplicates that would double-count in
  funnels.

### Documented
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` in
  `docs/PROJECT.md`.

### Removed
- Wizard scaffolding: `posthog-setup-report.md`, `.claude/skills/`
  (PostHog agent skill folder). `.claude/` added to `.gitignore`.

### Known caveat
- `posthog-node` on Vercel serverless is fire-and-forget with
  `flushAt: 1, flushInterval: 0`. Most events land, but a fraction
  may be lost when a Lambda freezes before flush completes. For
  better fidelity later, await `posthog.shutdown()` or use Next.js
  `after()` from `next/server`. Acceptable for analytics; not OK if
  we ever use it for auditing.

---

## [2026-05-20] — Sentry error tracking

### Added
- `@sentry/nextjs` integration via the Sentry wizard. Project
  `astrochaganti` on EU SaaS. Captures uncaught exceptions on client,
  server, edge, and via App Router `global-error.tsx`.
- Build-time source map upload — requires `SENTRY_AUTH_TOKEN` env var
  on Vercel (added).
- `docs/PROJECT.md`: documented `SENTRY_AUTH_TOKEN`.

### Tuned
- `tracesSampleRate: 0.1` (free tier ~5k errors/month).
- `sendDefaultPii: false` everywhere — we have OAuth session cookies
  + user emails, do not ship them to Sentry by default.
- `enableLogs: false` — `console.log` not forwarded.

### Removed
- Wizard-generated `/sentry-example-page` and
  `/api/sentry-example-api` routes — verification only.

---

## [2026-05-20] — Merge of PR #66 (audit fixes, Sessions 1-4)

Picked up the substantive backend hardening from PR #66: Cache-Control on
auth-gated routes, isomorphic-dompurify sanitizer, AbortSignal timeouts on
sidecar/LLM, fetch-with-retry utility, Zod schemas across DB modules,
COUNT queries (TOCTOU fix), 5 new route test files (61 tests), admin
pagination LIMIT 200, eslint-plugin-jsx-a11y wiring, content index
prebuild, pre-push hook. Conflicts resolved by combining with PR-1..PR-8
work (proper-case display, sidebar create, tab primitives, today-reading
two-tier cache, AdminTables split, Transit chart). See the dedicated
session entries below for the details.

---

## [2026-05-20] — PR-8: Legacy Compatibility UI removed + Transit chart

Two corrections from user testing:
1. The standalone Compatibility screens (`/compatibility`, `/compatibility/[id]`,
   their clients + chat/insight components) are unreachable from the live UI —
   no NavBar link, no in-app router push outside the legacy client itself.
   The Compare tab inside the dashboard is the canonical compatibility view now.
2. The Transits tab should render as a D1-style chart with the transiting
   planet placements overlaid on the natal SAV bindu lattice — that's how the
   reading is done classically. The card grid I built in PR-4 missed that.

### Removed (legacy compatibility, UI-orphaned)
- `app/compatibility/page.tsx`
- `app/compatibility/[id]/page.tsx`
- `app/compatibility/[id]/CompatibilityDetailClient.tsx`
- `components/compatibility/CompatibilityClient.tsx`
- `components/engines/CompatibilityChat.tsx` (only consumer was the deleted client)
- `components/engines/CompatibilityInsightShell.tsx` (same)
- `app/api/readings/chat/compatibility/route.ts` + its test (only consumer was
  the deleted `CompatibilityChat` component)
- `app/api/readings/chat/route.ts` (orphaned by the prior `ProfileChat` deletion;
  no remaining caller)

Kept (still in use):
- `app/api/compatibility/route.ts` + `app/api/compatibility/[id]/route.ts` —
  consumed by the dashboard Compare tab.
- `app/api/readings/ai-insight/compatibility/route.ts` — consumed by the
  admin `AIAdminPanel` when expanding a compare check.
- `lib/engines/groq.ts` — still wired through `lib/engines/ai-caller.ts`
  (today-reading + admin draft + ai-insight may route to Groq depending on
  the configured model).

Net: ~700 lines of dead UI + API code gone.

### Changed
- **TransitsTab → D1-style chart with natal SAV bindus + transit planet
  positions** (per user correction). `NatalChartGrid` receives the transit's
  `planets[*].sign` keyed by `signKey="sign"`, with the natal lagna for
  orientation and the natal `sarvashtakavarga` for per-sign bindu counts.
  The compact card grid stays below the chart as a "Transit detail" strip —
  it's still useful for retrograde markers and the H/Lagna / H/Moon callouts,
  but the chart now leads.
- `ProfileView` passes `chartOutput` to `TransitsTab`.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 267/267 pass (-8 from PR-7: the deleted compatibility-chat
  route had 8 tests; all other tests untouched)
- `npm run build` → success

---

## [2026-05-20] — PR-7: AdminTables split + ExplainerModal mobile

The remaining cleanup items from the audit (N3 + N7).

### Changed
- **`app/admin/AdminTables.tsx` split** — was 880 lines in a single file with
  intertwined per-tab state. Extracted:
  - **`app/admin/tabs/QuestionsTab.tsx`** (287 lines) — full Questions tab
    with its own draft / answer / payment state, paid-now → answered flow,
    and the inline Draft Assistant.
  - **`app/admin/tabs/SettingsTab.tsx`** (244 lines) — consultation toggles,
    pricing form, slot management; owns its own state and the `Toggle`
    helper.
  - **`app/admin/utils.tsx`** (33 lines) — shared `sortBy`, `renderSortIcon`,
    `resolveProfileIds`.
  - **`AdminTables.tsx`** is now 370 lines and only holds the inline Users /
    Profiles / Compatibility / Feedback / AI Insights / LLM Settings tabs
    (each under 70 lines).
  - No behavior change — DOM output is identical to the prior single-file
    implementation.

- **`ExplainerModal` on mobile** (observation N7) — the modal previously used
  `h-full` on mobile, occupying 100% of the viewport. On iOS Safari the
  dynamic toolbar could hide the X button below the visible area. Switched
  to `max-h-[92vh]` on mobile (was `h-full`), added `sticky top-0` to the
  header so the close affordance stays reachable as content scrolls, and
  added `p-3` padding around the backdrop so the user can tap outside to
  close. Rounded corners now apply at all sizes for consistency.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 275/275 pass
- `npm run build` → success

### Audit status — all 11 items addressed
| Item | PR |
|---|---|
| Display rules (Born/Lives raw, proper case) | PR-1 (#58) |
| Profile create in sidebar | PR-1 (#58) |
| Logo / wordmark | PR-1 (#58) |
| Tab primitives (TwoColumnTabGrid, TabSection) | PR-2 (#59) |
| Today tab redesign | PR-2 (#59) |
| Today reading LLM split | PR-3 (#60) |
| Jaimini, Dasha, Transits, Career tab refits | PR-4 (#61) |
| Toast + sticky tabs + loading skeleton | PR-5 (#62) |
| Compare responsive + orphan cleanup | PR-6 (#63) |
| AdminTables split + ExplainerModal mobile | PR-7 (this PR) |

The Compatibility Basic/Pro toggle decision (N8) is still queued for your call.

---

## [2026-05-20] — PR-6: Compare responsive + orphan cleanup

Audits the remaining untouched tabs from the UI/UX review, removes orphaned
components discovered during the audit, and tightens the Compare tab.

### Changed
- **`components/tabs/CompareTab.tsx`** — removed the prior `max-w-2xl` clamp
  on the result body. The compare result now fills the dashboard content
  area, so the dense kuta / dosha tables get breathing room on wide screens.
  Replaced inline `display: flex` constructs with Tailwind classes for the
  score row and dosha card chrome, so the existing `flex-wrap` actually
  kicks in at narrow widths. `formatName` applied to all profile names
  in the result body (Natal Moon Profiles header, Kuja Dosha rows,
  Additional Kutas detail lines, Mangal Dosha sentences).
- **"+ Add partner profile" CTA** in CompareTab now links to
  `/dashboard?create=1` (matches the rest of the app).
- **`components/unified/tabs/YogasTab.tsx`** — both sections now use
  `TabSection` for the empty-state policy. When both yogas and doshas are
  absent, a single short "data not available" message renders instead of
  two empty headings.

### Removed
- **Orphaned `components/unified/UnifiedView.tsx`** (had no callers — the
  dashboard shell is `ProfileView`, not `UnifiedView`).
- **Orphaned `components/unified/tabs/PatternsTab.tsx`** (only imported by
  `UnifiedView`; the dashboard's Yogas + Jaimini + Ashtakavarga + Doshas
  content lives in the dedicated top-level tabs).
- **Orphaned `UnifiedViewProps` type** in `components/unified/types.ts`.
- Net: 326 + 106 + 9 = ~441 lines of dead component code gone.

### Fixed (docs)
- **`docs/ARCHITECTURE.md`** Chart Engine Components table — replaced
  `UnifiedView.tsx` row with `TabGrid.tsx` + `TabLoadingSkeleton.tsx`
  (the actual primitives in use). Removed `PatternsTab.tsx` row.
  Updated `Transits` and `Career` row descriptions to reflect the
  PR-4 refits. Server/Client Boundary Map now describes
  `ProfileView + components/unified/tabs/*` as the dashboard shell.

### Decision deferred
- **Compatibility Basic / Pro toggle** (`CompatibilityDetailClient`) —
  the unified dashboard removed the parallel toggle on profile pages,
  but `CompatibilityDetailClient` still has it. Keeping it as-is until
  you decide whether to merge Basic + Pro into one view or remove the
  toggle for non-admins.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 275/275 pass
- `npm run build` → success

### Queued
- **PR-7** — AdminTables split (880 lines), ExplainerModal mobile, sidebar
  dead space, smaller items

---

## [2026-05-20] — PR-5: polish (Toast + sticky tabs + loading skeleton)

Polish layer over the user-visible changes from PR-1 → PR-4. Adds positive
feedback for actions that previously had none, ensures the tab nav stays
visible during scroll, and unifies the loading state across tabs.

### Added
- **`components/ui/Toast.tsx`** — global toast notification system.
  - `<ToastProvider>` mounted once in `app/layout.tsx` (inside `ThemeProvider`).
  - `toast(message, kind?, opts?)` imperative helper callable from any client
    component. `kind` is `"success" | "error" | "info"`. `opts.duration: 0`
    keeps the toast open until dismissed; default auto-dismiss is 3.5s.
  - `useToast()` hook for reactive use.
  - Visual: bottom-right slide-in stack, semantic icon + colour per kind,
    inline dismiss button. 6 unit tests.
- **`components/unified/TabLoadingSkeleton.tsx`** — shared pulsing skeleton.
  Replaces the prior mix of "Loading…" text labels and bare paragraphs across
  tabs. Configurable `lines` / `cards` / `framed`. Applied to `TransitsTab`
  and `CareerTab` (both previously rendered a single italic line).

### Changed
- **ProfileSidebar save / create / delete + AskPanel submit** now fire toasts.
  - Profile saved → "Profile saved" (success)
  - Profile created → "Created &lt;Name&gt;" (success)
  - Profile deleted → "&lt;Name&gt; deleted" (success)
  - Ask submitted → "Your question is on its way — we'll respond within 2 days." (success)
  - Any of the above failing → red error toast with the message
- **ProfileView tab bar is now pinned visibly during content scroll**
  (observation N4). Added `flex-shrink-0 bg-[var(--color-background)] z-10`
  to the tab bar, and `flex-shrink-0` to the mobile header. Both were
  implicit-shrink flex items in some layout regimes; making them explicit
  ensures they stay visible no matter how tall the inner Dasha / Patterns
  table grows.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 275/275 pass (+6 toast tests)
- `npm run build` → success

### Out of scope (queued)
- **PR-6** — Compare responsive, Yogas / Ashtakavarga / Patterns 2-col audit,
  Compatibility Basic/Pro decision
- **PR-7** — AdminTables split (880 lines), ExplainerModal mobile,
  sidebar dead space, smaller items

---

## [2026-05-20] — PR-4: tab refits (Jaimini, Dasha, Transits, Career)

Closes PDF observations **#4–#7**. Each refit composes the PR-2 primitives
(`TwoColumnTabGrid` + `TabSection`) instead of being styled in isolation.

### Changed
- **Jaimini tab** (#4) — section order reflows from "reference-first" to
  "data-first":
  1. Karakamsha — soul's direction (the personal data)
  2. Arudha Padas (personal data)
  3. Upapada (personal data)
  4. Jaimini Soul Indicators karaka table (reference / definitions — moved to
     the bottom)
  - Arudha Padas grid tiles loosened: minimum tile width 80→120px, padding
    8/10→12/14px, gap 6→10px. The cramped look in the screenshot is gone.
  - Every section now uses `TabSection` so missing data hides the heading
    along with the body.

- **Dasha tab — Vimshottari Maha Dasha Timeline** (#5) — text overlap fixed.
  The row was using a flexbox with fixed-width `60px` label and `80px`
  planet columns; "Pratyantar" (10 chars at 10.5px + tracking) overflowed
  into the planet name, producing the "PRATYANTARRahu" rendering.
  Switched to CSS grid `grid-cols-[16px_104px_1fr_96px_96px_auto]` with
  `truncate` on both label and planet cells — each column has its own track
  and content can't bleed.

- **Transits tab** (#6) — wide 5-column table replaced with a **compact card
  grid**. 2 cards/row on small screens, 3 at `sm`, 4 at `lg`. Each card has
  the planet name + retro marker + transit sign on top, and a tight 3-column
  footer for H/Lagna · H/Moon · SAV. The numeric grid uses `font-mono` for
  alignment. Visual density now matches the rest of the unified dashboard.

- **Career tab** (#7) — single-column `max-w-2xl` layout replaced with the
  shared `TwoColumnTabGrid`:
  - **Column 1**: D10 — Dashamsha → Career themes → Astrological indicators
  - **Column 2**: 10th house — Karma Bhava → Key professional significators
  - Every section uses `TabSection` so a missing block doesn't print a stray
    heading.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 269/269 pass
- `npm run build` → success

### What this concludes
With PR-4 in, the PDF observations are addressed (the LLM cost half of #3b
landed in PR-3). The remaining queued work is:
- **PR-5** — sticky tab nav, Toast provider, loading-skeleton consistency,
  Ask submission confirmation
- **PR-6** — Compare responsive, Yogas / Ashtakavarga / Patterns audit,
  Compatibility Basic/Pro decision
- **PR-7** — AdminTables split, ExplainerModal mobile, smaller items

---

## [2026-05-20] — PR-3: today-reading LLM split (two-tier cache)

Closes the cost-saving half of PDF observation 3b. Splits the today-reading
into two independently cached engines so a Pratyantar shift no longer triggers
a full regeneration of the natal portion.

### Added
- **`buildCurrentReading(profile, chartOutput, llmConfig)`** in `lib/engines/today-reading.ts` — Tier 1. Returns the dasha reading. Prompted for ~2× the previous length (6–8 sentences / 120–180 words).
- **`buildNatalReading(profile, chartOutput, llmConfig)`** — Tier 2. Returns the chart reading. Prompted for ~5× the previous length (15–20 sentences across 3–4 paragraphs / 350–500 words).
- **`PROMPT_VERSION_CURRENT`** and **`PROMPT_VERSION_NATAL`** — independent bumpable constants. Bumping one does not invalidate the other tier's cache.
- **`LlmConfig`** type re-exported for the route.

### Changed
- **`GET /api/readings/today-reading` now uses two cache rows**: `engine="today-current"` and `engine="today-natal"`. Each has its own `input_snapshot` + `llm_fingerprint`. The route checks both caches in parallel, generates only the stale tiers, and saves them independently.
- **Response shape extended** — `{ output: { dasha_reading, chart_reading }, cached: boolean, cached_tiers: { current, natal } }`. `cached` is true only when both tiers came from cache; `cached_tiers` exposes the per-tier state for debugging. Client (TodayTab) still reads `output.dasha_reading` / `output.chart_reading` unchanged.
- **`buildTodayReading` removed** — superseded by the two-function API. The legacy `today-reading` cache rows from the single-engine era become orphaned but harmless; they simply stop being read.

### Cost characteristic
For an existing profile, the natal-tier reading effectively never regenerates (only on birth-data change or admin prompt edits / `PROMPT_VERSION_NATAL` bump). On every Pratyantar shift, only the current tier regenerates — roughly **−50% of LLM tokens per Today-tab visit on a returning user** versus the prior single-tier flow, despite emitting ~3.5× more total content per fresh generation.

### Tests
- **`lib/engines/__tests__/today-reading.test.ts`** rewritten — 12 tests covering both build functions: empty-content short-circuit, LLM config plumbing, tier-identifying system prompts, antar alert window, HTML stripping, non-string output coercion, and the ~5× length target for the natal tier.
- **`app/api/readings/today-reading/route.test.ts`** rewritten — 10 tests covering: 401 / 400 / 500 / 502 paths, cold-start (both tiers regenerate), per-engine save shape, full cache hit (`cached_tiers: {current: true, natal: true}`), surgical re-generation of *only* current when Pratyantar shifts (natal stays cached), surgical re-generation of *only* natal when fingerprint mismatches (current stays cached), and corrupt-cache fall-through.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 269/269 pass (+5 net new since PR-2: refactored 10 existing today-reading tests, added 2 new tier-routing tests, expanded engine tests from 10 → 12)
- `npm run build` → success

---

## [2026-05-20] — PR-2: tab primitives + Today refit

Second batch from the UI/UX review. Establishes the global standards
(`<TwoColumnTabGrid>` + `<TabSection>`) and applies them to the Today tab.
Subsequent tab refits (Jaimini, Dasha, Transits, Career) compose these
primitives instead of being re-styled individually.

### Added
- **`components/unified/TabGrid.tsx`** with three exports:
  - **`<TwoColumnTabGrid>`** — `grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8`. Collapses cleanly on small screens.
  - **`<TabColumn>`** — `space-y-6 min-w-0` per column. The `min-w-0` is critical: it lets long inline content (mono ranges) truncate or wrap cleanly inside the grid cell instead of forcing the column wider than the grid track.
  - **`<TabSection title? when? trailing? children>`** — encodes the "no empty sections" rule. When `when` evaluates to `false`, the entire section (including the heading) renders nothing. The heading is rendered as `.ac-eyebrow` for consistency. The `trailing` slot is meant for refresh buttons / inline actions next to the heading.
  - 6 unit tests in `components/unified/__tests__/TabGrid.test.tsx`.

### Fixed
- **Maha Dasha line wraps in light theme** (observation 3a). The Current Dasha card was using inline `flex` with a fixed-width `width: 80` label column that wasn't wide enough for "Maha Dasha" + Inter-light at light-theme metrics. Now uses the existing `.ac-dasha-row` class (`grid-template-columns: 110px 1fr auto`) which always fits the label.
- **Removed duplicate antardasha / pratyantar shift chips from the Current Dasha Period card** (observation 3a). The same data is already rendered as expanded `TodayInsightCard`s under "What's active now". The chips were redundant; the cards win because they carry context + the Ask CTA.
- **"What's active now" section no longer renders when empty** (observation 3a). The "No significant patterns active right now" italic-greyed placeholder is gone. `TabSection when={insights.length > 0}` suppresses the entire section — heading included.

### Changed
- **Today tab is now a two-column layout** (observation 3b layout-only portion):
  - **Column 1**: What's active now → Current dasha period → Current period reading
  - **Column 2**: Natal chart reading
  Collapses to single column below `lg:` (1024px). Falls back to single column with natal at the bottom on mobile.
- All Today sections converted to `<TabSection>`, inheriting the empty-state policy automatically.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 264/264 pass (+6 new)
- `npm run build` → success

### Not in this PR (queued)
- **PR-3** — today-reading LLM split (observation 3b cost portion): two engine rows (`today-current` + `today-natal`), independent fingerprints, ~2× content for current period, ~5× for natal. Storage replaces API calls.
- **PR-4** — Jaimini / Dasha / Transits / Career tab refits using these primitives.
- **PR-5** — sticky tab nav, Toast provider, loading skeleton consistency, Ask submission confirmation.

---

## [2026-05-20] — PR-1: display rules + profile create in sidebar + brand

First batch from the user UI/UX review pass. The aim is "cognitive consistency"
— users see what they typed, in a predictable form, with fewer screens.

### Fixed
- **Server no longer overwrites `place_of_birth` / `current_location` with
  the geocoder's `display_name`** (`app/api/profiles/route.ts` POST, `app/api/profiles/[id]/route.ts` PUT). The user's typed string is now stored verbatim. Geocoding still runs for `latitude` / `longitude` / `timezone`, which are stored in their own columns. Resolves observation #1 — "Born" and "Lives" now show the user's input.

### Added
- **`lib/display.ts`** with `toTitleCase`, `formatName`, `formatPlace`. Policy: never mutate user input on save; normalize for display at the read site. Preserves all-caps acronyms (≤4 chars: USA, MIT, NASA), lowercases small connector words (of, the, and). 11 tests in `lib/__tests__/display.test.ts`.
- **`components/profile/ProfileFormFields.tsx`** — shared field set powering the sidebar's create + edit forms. One place to add/change/validate inputs.
- **`ProfileSidebarCreate`** in `components/profiles/ProfileSidebar.tsx` — inline create form rendered in the sidebar when `?create=1` is set on the dashboard URL. Mirrors the existing `InlineEditForm` flow.
- **Empty-profile users land on `/dashboard?create=1` directly** — the sidebar shows the create form. No more separate "Your cosmic story starts here" screen.

### Changed
- **NavBar wordmark larger; orbital-globe logo removed** (observation #7). `Astro Chaganti` now renders at 1.35rem (up from 1.1) with tighter letter-spacing.
- **NavBar "Add profile" link** now routes to `/dashboard?create=1` instead of `/profiles/new`.
- **`/profiles/new`** is a server redirect to `/dashboard?create=1` — bookmarks and external links still work.
- **`formatName` / `formatPlace` applied at display sites**: `ProfileSidebar` (header name + Born + Lives), `ProfileChip` (NavBar pills), `ProfileView` (mobile header + delete confirm), `CompareTab` (profile pills + dropdown options), `DashboardClient` (Ask + AI panel context). Users who type "VINAY KUMAR" or "vinay kumar" now see "Vinay Kumar".

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 258/258 pass (was 247; +11 display tests)
- `npm run build` → success

### Not in this PR (queued)
- PR-2: `<TwoColumnTabGrid>` + `<TabSection>` primitives applied to Today tab
- PR-3: today-reading split into `today-current` + `today-natal` cache engines
- PR-4: Jaimini / Dasha / Transits / Career tab refits
- PR-5: sticky tab nav, toast system, loading skeleton consistency, Ask submission confirmation
- PR-6: Compare responsive, untouched-tab audit, Compatibility Basic/Pro decision
- PR-7: AdminTables split, ExplainerModal mobile, smaller fish

### Notes
- `components/ProfileForm.tsx` is still used by `app/profiles/[id]/edit/page.tsx` (the mobile edit fallback — the sidebar is `hidden md:flex`). When mobile edit moves to a sheet drawer in a later PR, `ProfileForm` can be deleted in favor of `ProfileFormFields`.
- **Existing profiles with geocoded `place_of_birth` strings** in the database continue to display as-is until the user edits them — at which point the user's new typed value becomes canonical.

---

## [2026-05-20] — Docs rewrite + LLM/insight test coverage (B2 + E1)

PR B from the post-#52/#53 follow-up plan. Closes out the audit backlog.

### Added — Test coverage for previously-untested high-risk modules (E1)
- **`lib/engines/__tests__/cache-validate.test.ts`** (10 tests) — covers `birthDataChanged()`: every field change individually, unparseable JSON, empty string, missing fields, all-null current.
- **`lib/engines/__tests__/reading-handler.test.ts`** (11 tests) — covers `resolveProfile()`: 401 / 400 / 404 paths, admin vs non-admin `db.profiles.get` scoping, every missing-field branch (date, time, lat=null, empty timezone), and the success payload shape.
- **`app/api/readings/today-reading/route.test.ts`** (9 tests) — covers the GET handler: 401 / 400 (chart missing) / 500 (corrupt chart JSON) / 502 (LLM throws), cache-hit when fingerprint matches, regeneration when `llm_fingerprint` or `pratyantar_end` mismatches, fall-through on corrupt cache output, and snapshot save shape.
- **`lib/engines/__tests__/today-reading.test.ts`** (10 tests) — covers `buildTodayReading()`: PROMPT_VERSION shape, empty-blocks short-circuit, LLM-config plumbed to `callAIForJson`, `custom_instructions` appended to system prompt, antar/pratyantar alert windows (4w / 8w), HTML-stripping of content bodies, non-string LLM-output coercion.
- **`app/api/compatibility/[id]/route.test.ts`** (4 tests) — DELETE handler: 401, ownership-scoped `db.compatibility.get`, no-delete on missing/foreign check, 204 on success.
- **`app/api/compatibility/route.test.ts`** (8 tests) — GET (401, userId scoping) and POST (401, 429 rate limit, 400 missing IDs, 404 unowned profile, duplicate-in-either-order short-circuit, rate-limit key uses userId).

Net: **+52 tests, total 247/247 passing.**

### Changed — `docs/ARCHITECTURE.md` no longer references deleted components (B2)
- Removed the stale-section banner added in #52 — the sections below are now actually rewritten.
- **Section 6 "Astrology Engine Layer / DashaFlow"** — updated the consumer description from `DashaflowView` to the unified dashboard + `tabs/*`.
- **Section 8 "Profile Detail"** rewritten as "Dashboard / Profile View" — describes the actual flow: `/profiles/[id]` redirects to `/dashboard?profile=…`, which renders `DashboardClient` orchestrating chart/transit/career/today-reading fetches with the per-profile in-memory cache. Includes a table mapping each of the 10 dashboard tabs to its renderer + data source, plus the admin AI panel and Ask panel.
- **Section 9 "Chart Engine Components" table** rewritten into three groupings: `components/unified/*` (the dashboard set — UnifiedView, IdentityStrip, HouseGrid, NatalChartGrid, SavChartGrid, and all 11 tabs with timeline subcomponents), `components/tabs/*` (TodayTab + CompareTab), and `components/engines/*` (standalone views — MuhurthaView, TarabalamView, SectionShell, ExplainerModal, AIInsightCard, CompatibilityChat).
- **Section 12 "Journey 3: Viewing a Birth Chart"** rewritten to match the dashboard flow: cache-hit-vs-miss branching, parallel chart+transit prefetch, lazy career-on-tab-open, new-profile loading screen path, and the LLM cache invalidation pipeline (fingerprint check).

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 247/247 pass (was 195)
- `npm run build` → success

---

## [2026-05-20] — Perf & theme polish (D1 + D2 + C1 + C2)

PR A from the post-#52/#53 follow-up plan. User-visible perf + theme parity.

### Changed
- **`app/page.tsx` is now fully static / CDN-cacheable** (D1). The `getServerSession` call and `force-dynamic` directive moved to `proxy.ts` (NextAuth middleware), which now redirects authed users from `/` → `/dashboard` before the page renders. The page itself is a pure `return <CosmicLanding />`. Anonymous landing-page hits no longer pay a per-request server render.
- **DashboardClient caches engine output by profile id** (D2). New `profileCacheRef` (Map) holds `{ chart, transit, career, todayReading }` per profile. Both the new-profile (parallel prefetch) and returning-user (chart + transit) paths populate the cache, and the returning-user effect now checks it first — toggling between profile pills no longer refetches the chart/transit/career/today-reading endpoints. Force-refresh paths (`fetchTransit(true)`, `fetchCareer(true)`) still bypass cache.

### Fixed
- **Hardcoded Tailwind colors replaced with design tokens in 9 files** (C1) — Vellum-light theme parity. Replacements: `text-red-*` / `bg-red-*` → `--color-danger` + `-faint` + `-border`; `text-emerald-*` / `text-green-*` → `--color-success` + faint/border; `text-amber-*` / `text-yellow-*` → `--color-warning` (or `--color-accent` for action contexts); `text-violet-*` / `text-purple-*` → `--color-accent` + faint/dim; `bg-zinc-*` → `--color-surface-1` / `-2`. Files: `app/consultation/ConsultationForm.tsx`, `components/engines/ExplainerModal.tsx`, `components/engines/CompatibilityChat.tsx`, `components/FeedbackWidget.tsx`, `components/engines/TarabalamView.tsx`, `components/engines/AIInsightCard.tsx`, `components/unified/UnifiedView.tsx`, `components/profiles/ProfileView.tsx`, `components/ui/ModelPicker.tsx`.

### Documented
- **`lib/typography.ts` boundary clarified** (C2). Audit flagged 79 references across 3 files (`ConsultationForm`, `CompatibilityClient`, `ProfileSelectorCard`) as a half-finished migration. On inspection, these inline-style tokens (`fonts`, `textStyles`, `glass`, `clamp`, `radii`, `motion`, `spacing`, `shadows`, `interactive`) are not legacy — they complement the `.ac-*` classes for cases where runtime-computed styles or unwieldy Tailwind arbitrary values are awkward. Added a usage-policy comment at the top of `lib/typography.ts`. Existing inline-style usage does NOT need to be migrated; the two paths resolve to the same CSS variables and switch with the theme.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 195/195 pass
- `npm run build` → success

---

## [2026-05-19] — P0 + B1 + B3: security/correctness + repo lean

Carryover items from the dev → main audit (#52). After this lands, `development`
is in shape to merge to `main`.

### Fixed
- **`today-reading` cache key now includes a prompt fingerprint** (`app/api/readings/today-reading/route.ts`, `lib/engines/today-reading.ts`) — added a `PROMPT_VERSION` constant and an `llm_fingerprint` (sha1 over version + temperature + max_tokens + custom_instructions) into the cached `input_snapshot`. Admin edits to LLM settings or bumps to `PROMPT_VERSION` now invalidate cached readings on the next request. Previously, an admin editing `custom_instructions` would silently serve stale cached output until the user's pratyantar period shifted.
- **`POST /api/readings/muhurtha` is now rate-limited** (`app/api/readings/muhurtha/route.ts`) — was the only reading route without a limit. Now uses `RATE_LIMIT_DEFAULT_COUNT` per user per minute, matching career/transit/dashaflow.
- **`POST /api/feedback` hardening** (`app/api/feedback/route.ts`) — was an unauthenticated POST that trusted the first value of `X-Forwarded-For` (client-spoofable) and accepted any string as `rating`. Now: rate-limits by user-email when authed and by the *last* X-Forwarded-For segment (Vercel's trusted observation) when anonymous, validates rating against the widget's emoji enum, caps `message` to 2000 chars and `page_url` to 500 chars.

### Changed
- **Extracted `getUserId(session)` helper** (`lib/auth.ts`) — replaces the 15 repeated `(session.user as { id: string }).id` casts across `app/api/**`, `app/**/page.tsx`, and `lib/engines/reading-handler.ts`. The cast now exists only inside the helper. Test mocks for `@/lib/auth` updated in 5 files.

### Removed
- **`public/data/` (52MB) untracked from git** — 11 Hipparcos catalog chunks + 236 sidecar pickle cache files. No app code references them; they were committed as a workaround for GitHub's 50MB limit ("add star catalog in small 5mb chunks for github", 2026-05-06) under an earlier deployment model. The Python sidecar runs as a separate service and cannot access this folder anyway. Added `/public/data/` to `.gitignore` and `.vercelignore`. Repo and every Vercel deployment now ~52MB lighter.
- **3 orphan components, ~684 lines** — `components/LandingPage.tsx` (superseded by `CosmicLanding.tsx`), `components/dashboard/ProfileList.tsx`, and `components/profile-ui.tsx` (only imported by `ProfileList`). Verified zero importers across the codebase.

### Verified
- `./node_modules/.bin/tsc --noEmit` → 0 errors
- `npx vitest run` → 195/195 pass
- `npm run build` → success

---

## [2026-05-19] — Pre-merge cleanup for development → main

### Fixed
- **Auth order in 3 reading POST routes** (`app/api/readings/transit`, `dashaflow`, `career`) — rate-limit was running before the session check, so unauthenticated requests could consume rate-limit slots and receive 429 instead of 401. Now returns 401 first if `!session?.user`. Also resolves the `returns 401 if unauthorized` test failure on the transit route.
- **5 stale UI tests** (theme/nav rebuild leftovers) — `AskPanel` (button label `submit` not `request consultation`), `ProfileChip` (relationship rendered as `You` not `· You`), `ProfileNav` (removed assertions for Add/Ask buttons that moved to `NavBar`), `PlanetsTab` (`℞` now appears in multiple cells, use `getAllByText`). All 195 tests now pass.
- **Missing viewport meta** — added `export const viewport` to `app/layout.tsx`. Mobile browsers were rendering at desktop width, defeating every `sm:`/`md:` breakpoint introduced by the theme rebuild.

### Changed
- **`next.config.ts` CSP** — dropped `'unsafe-eval'` from `script-src`. `next build` verified green; production bundle does not need eval. `'unsafe-inline'` stays until nonce wiring lands.
- **`docs/ARCHITECTURE.md`** — added stale-section banner near top listing the 12 components removed in the 2026-05-19 cleanup. Replaced the client-components table with the current unified-dashboard set (`DashboardClient`, `UnifiedView`, `tabs/*`, `panels/AskPanel`, `profiles/*`, etc.). Deeper sections (legacy "Basic vs Professional" narrative around lines 355, 573-666, 773-781) still need a fuller rewrite — banner flags them.
- **`docs/PROJECT.md`** — updated the user-flow walkthrough and the component tree to reflect the dashboard + 10-tab unified view + theme system.
- **`docs/TESTING.md`** — replaced the dead `DashaflowView` test row with `components/unified/tabs/*` coverage notes.

### Removed
- **`design/landing-mockup/`** — 24MB of unused landing-page exploration (including a 23MB `earth.mp4`). Nothing in the app imported from `design/`. Removed via `git rm -r --cached design/`; added `design/` to `.gitignore`.
- **Jest devdependencies** — `jest`, `ts-jest`, `@jest/globals`, `@types/jest` were installed but unused (project uses Vitest per `AGENTS.md`). `npm test` script changed from `jest` to `vitest run` (was previously broken). `@testing-library/jest-dom` kept — it's loaded by `vitest.setup.ts`.
- **Other dead deps**: `dompurify`, `isomorphic-dompurify`, `@types/dompurify` (sanitizer is custom in `lib/sanitize.ts`), `tsx` (no consumer). 225 packages dropped from the lockfile.

### Added
- **`.vercelignore`** — excludes `design/`, `docs/`, `CHANGELOG.md`, `AGENTS.md`, tests, AI agent scratch dirs (`.claude/`, `.jules/`, `.cursor/`, `.aider/`), and `public/data/ephemeris/*.pickle` from Vercel deployments. Trims the deployed bundle significantly.

### Known follow-ups (not in this PR)
- `public/data/` carries ~52MB (Hipparcos catalog + pickle cache). Referenced as static assets in `docs/ARCHITECTURE.md` but no app code reads it. Confirm whether these are needed at runtime and either move out of `public/` or remove from git.
- `app/api/readings/muhurtha/route.ts` has no rate limit.
- `app/api/feedback/route.ts` is unauthenticated and trusts spoofable `X-Forwarded-For`.
- `today-reading` cache key omits prompt version + `custom_instructions` hash — admin prompt edits silently serve stale cached readings.
- Hardcoded Tailwind colors remain in 9 files (worst: `ConsultationForm.tsx`, `LandingPage.tsx`, `FeedbackWidget.tsx`).
- 3 orphan components (~684 lines): `components/LandingPage.tsx`, `components/dashboard/ProfileList.tsx`, `components/profile-ui.tsx`.
---

## [2026-05-19] — Remove dead basic/professional views and all orphaned engine components

### Removed
- **`app/profiles/[id]/ProfileDetailClient.tsx`** — never imported anywhere; the route page redirects directly to dashboard
- **`app/profiles/[id]/loading.tsx`** — pointless since the page only redirects
- **`components/ChartSkeleton`** — only used by the two files above
- **`components/engines/DashaflowView`** — only used in ProfileDetailClient (dead) and ProfessionalView
- **`components/engines/ProfessionalView`** — only used in ProfileDetailClient (dead)
- **`components/engines/VargaDashboard`**, **`AntardashaTimeline`**, **`TransitView`**, **`CareerView`** — only used in ProfessionalView
- **`components/engines/AIInsightShell`**, **`ProfileChat`** — only used in ProfessionalView
- **`lib/utils/consultation.ts`** and its test — only called by ProfessionalView

---

## [2026-05-19] — Fix Sade Sati inconsistency in Today tab

### Fixed
- **Sade Sati not always appearing in Today tab** — `DashboardClient` "returning user" path only fetched chart and deferred transit to lazy load on tab open. `generateInsights` depends on `transitOutput` to detect Sade Sati, so the Today tab showed "No significant patterns active" until the user visited the Transits tab. Fixed by prefetching transit in parallel with chart on profile switch (matching the behavior already in place for new profiles).

---

## [2026-05-19] — Apply `.ac-*` design language consistently across all tabs and components

### Changed
- **All unified tabs** (`JaiminiTab`, `AshtakavargaTab`, `YogasTab`, `HousesVargasTab`, `DashaTab`, `TransitsTab`, `CareerTab`, `TimeTab`, `PatternsTab`) — replaced `TABLE_STYLES`, `DIGNITY_COLORS`, hardcoded Tailwind color utilities with `.ac-card`, `.ac-table`, `.ac-tag`, `.ac-kv`, `.ac-dasha-row`, `.ac-banner`, `.ac-eyebrow`, `.ac-cell-good`/`.ac-cell-bad`, `.ac-pills`/`.ac-pill` classes.
- **Engine views** (`CareerView`, `MuhurthaView`, `TarabalamView`) — same conversion; removed all `PLANET_COLORS`, hardcoded hex/rgba values.
- **CompatibilityDetailClient** — replaced `glass`, `fonts`, `textStyles`, `clamp`, `radii`, `motion` imports from `lib/typography` with `.ac-card`, `.ac-eyebrow`, `.ac-tag`, CSS variable colors throughout.
- **CompareTab** — removed `TABLE_STYLES`; converted guna table, natal moon table, dosha cards, kuja table to `.ac-*` classes.
- **TodayTab / TodayInsightCard** — dasha hero, insight cards, AI reading cards all use `.ac-card`, `.ac-eyebrow`, `.ac-tag`, `.ac-btn-ask`.
- **ProfileSidebar** — birth info and panchang sections use `.ac-kv` grid and `.ac-eyebrow` labels.

### Removed
- All remaining `TABLE_STYLES` import/usage across codebase.
- All hardcoded hex colors (`#fca5a5`, `#6ee7b7`, `rgba(...)`) — replaced with `var(--color-*)` tokens.
- Stray `.claire/` directory created during development.

---

## [2026-05-19] — Theme system: simplify tokens, fix all hardcoded colors, full light/dark parity

### Added
- **`--color-overlay` / `--color-overlay-dim`** tokens in both themes — replace scattered `bg-black/60` and `bg-black/40` hardcodes in ExplainerModal and CareerView.
- **`--color-button-fg`** token — dark: `#1C1917` (dark text on gold), light: `#FFFCF6` (light text on crimson). Applied to all buttons using `bg-[var(--color-accent)]` across ProfileSidebar, MuhurthaView, TarabalamView, ProfileChat.

### Changed
- **Simplified token set** — removed 10 dead/redundant tokens per theme (20 definitions): `--color-nav-ask-*` (3), `--color-today-ask-cta-*` (3), `--color-today-hero-border`, `--color-ask-option-active-*` (3). Collapsed to existing `--color-accent-*` and `--color-border-subtle` equivalents.
- **NavBar "Ask an expert" button** — was using `--color-nav-ask-*` bespoke tokens; now uses `--color-accent-faint/dim/accent` directly.
- **TodayInsightCard CTA link** — was `--color-today-ask-cta-text`; now `--color-accent`.
- **TodayTab dasha hero border** — was `--color-today-hero-border`; now `--color-border-subtle`.
- **CompatibilityDetailClient score colors** — replaced hardcoded `#34d399 / #fbbf24 / #f87171` with `var(--color-success/warning/danger)`. Both themes now render correctly.
- **CompatibilityDetailClient toggle button** — `text-white` → `text-[var(--color-ink-1)]` (was white-on-surface, now correct in both themes).
- **ProfileChat user bubble** — `bg-violet-800/40 text-white` → accent-faint background with ink-1 text; send button → accent background with button-fg text.
- **AppStarCanvas star color** — hardcoded `rgba(220,230,255,...)` → theme-reactive: dark stays blue-white, light uses `rgba(60,80,140,...)` (visible on light background).

---

## [2026-05-19] — Fix earth globe visibility on landing page

### Fixed
- **Earth globe loading** (CosmicLanding) — added `preload="auto"` to the earth video so the browser starts buffering immediately on page load rather than waiting for user interaction. Previously the globe was invisible until ~23MB finished loading.
- **Earth globe fallback** (CosmicLanding.module.css) — added a blue-ocean radial gradient to `.earthClip` as background, so the globe shape is visible instantly while the video buffers.
- **CSP media-src** (next.config.ts) — added explicit `media-src 'self'` to the Content-Security-Policy header (previously relying on `default-src` fallback, which some browsers interpret inconsistently for video).

### Changed
- **earth.mp4 compressed** — re-encoded from 23MB (1920×1080, 60fps, with audio) to 632KB (960×540, 24fps, no audio, CRF 38) using ffmpeg libx264 with `-movflags faststart`. 36× size reduction.
- **earth.webm added** — VP9 WebM version at 1.0MB as primary source (Chrome/Firefox prefer it); MP4 kept as fallback. Total payload for the globe: ~1.6MB vs original 23MB.

---

## [2026-05-19] — Sprint: logo, landing fonts, theme switcher, mobile UX

### Added
- **Cormorant Garamond font** (`app/layout.tsx`) — landing page brand name and quote text now render in the intended typeface instead of falling back to Georgia. Variable `--font-cormorant` defined globally.
- **Mobile profile bar** (ProfileView) — `md:hidden` bar above the tab list shows profile name, relationship/gender, edit link (`/profiles/[id]/edit`), and delete button. Fills the gap left by the hidden sidebar on mobile.
- **Desktop nudge** (ProfileView) — `md:hidden` banner on complex tabs (Planets, Divisional, Yogas, Jaimini, Ashtakavarga, Dasha) with a Monitor icon and "Best explored on a desktop" copy.

### Changed
- **Logo visibility** (NavBar `TwoOrbits`) — inner ellipse stroke changed from `--color-accent-faint` (8–12% opacity) to `--color-accent-dim` (55%), now fully visible in both themes.
- **ThemeToggle placement** — moved from the Settings dropdown into the NavBar brand panel (right of "Astro Chaganti" text). Removed from dropdown. Available at a glance on every screen.
- **Dark mono font** (`layout.tsx`) — added `--font-mono-dark` variable (JetBrains Mono) which was previously undefined, fixing code/mono text in the Cosmic theme.

---

## [2026-05-19] — Desktop UX polish; theme consistency fixes

### Changed
- **Disclaimer text** (ProfileSidebar) — shortened to: "Astrological readings are for self-reflection and guidance only. They do not predict fixed outcomes. Please consult qualified experts before making important decisions."
- **Sidebar chart spacing** (NatalChartGrid) — switched from fixed `width: 300px` to `maxWidth: 300px` + `w-full` so charts no longer overflow the sidebar's 288px content area.
- **Muhurtha tab** — replaced hardcoded `bg-zinc-900 border-zinc-800` on form inputs and `bg-violet-600` on button with design tokens (`--color-surface-1`, `--color-border`, `--color-accent`).
- **Tarabalam tab** — same: date inputs and Calculate button now use design tokens instead of hardcoded dark colors.

---

## [2026-05-19] — Profile loading screen; graceful LLM failure handling

### Added
- **Celestial loading screen** (`components/ProfileLoadingScreen.tsx`) — orbital animation shown after new profile creation. Fires chart, transit, and career fetches in parallel; chains today-reading after chart resolves. Minimum 2s display, then cross-fades into profile view. Only triggers on `?new=1`; returning visits skip it entirely.
- **Parallel prefetch on new profile** (`DashboardClient`) — chart + transit + career fire simultaneously rather than lazily. Today-reading queues immediately after chart completes. All data warm before loading screen lifts.

### Changed
- **Today tab AI reading** — section hidden entirely when data is null (LLM failure, rate limit, etc.). No error copy shown to users. Retry is passive: next dashboard visit re-generates if cache empty.
- **Profile creation redirect** — `ProfileForm` now goes directly to `/dashboard?profile=[id]&new=1`; removed the extra hop through `/profiles/[id]`.
- **DashboardClient** — split into two `useEffect` branches: new-profile (parallel prefetch + loading screen) and returning-user (chart-only with lazy transit/career).

---

## [2026-05-19] — Today tab: 5-level dasha, AI reading, pratyantar shifts

### Added
- **AI reading on Today tab** — two-section LLM reading (dasha period + natal chart overview) generated once per pratyantar period via `GET /api/readings/today-reading`. Grounded in content library snippets (dasha pair + ascendant lookup) before LLM synthesis. Cached in the readings table and invalidated only when pratyantar period changes or birth data changes.
- **5-level dasha hero card** — Today tab now shows all five Vimshottari levels (Maha, Antar, Pratyantar, Sukshma, Prana) with start/end dates, replacing the two-level Maha + Antar display.
- **Pratyantar shift pill** — shift alert appears within 4 weeks of pratyantar transition (in addition to the existing 8-week antardasha pill).
- **`lib/engines/today-reading.ts`** — new engine that builds a grounded prompt from chart summary + dasha pair + ascendant content, then calls Gemini in JSON mode returning `{ dasha_reading, chart_reading }`.
- **`app/api/readings/today-reading/route.ts`** — GET route with two-part cache invalidation (birth data changed OR pratyantar_end changed).
- **Today Reading LLM settings** — `getTodayReadingLlm` / `setTodayReadingLlm` added to `lib/db/settings.ts`; exposed in admin LLM Settings panel with temperature, max tokens, and custom instructions.

### Changed
- **Today tab insight cards** — removed Jupiter transit and major yogas from `generateInsights()` (now covered by AI reading). Added Pratyantar shift detection (within 4 weeks).
- **`DashboardClient`** — fetches `today-reading` after chart loads; threads result through `ProfileView` → `TodayTab` with loading and error states.

---

## [2026-05-19] — Admin profile navigation, AskPanel API wiring, consultation settings

### Added
- **Admin profile deep-link** (`app/dashboard/page.tsx`) — when admin navigates to `/dashboard?profile=[id]`, the server loads that profile via `db.profiles.getAny` (bypasses ownership check). Works for any user's profile without new pages or nav tabs.
- **Admin compatibility deep-link** — `/dashboard?profile=[p1_id]&compare=[check_id]` also fetches the check and partner profile, then opens the dashboard with the Compare tab pre-populated and the result already loaded.
- **`initialCompareCheck` prop** (`components/profiles/ProfileView.tsx`) — initialises `compareResult` and `compareSelectedId` state from a server-provided `CompatibilityCheck`, enabling the admin compare deep-link to work without any client-side API call.
- **`appSettings` prop** (`app/dashboard/DashboardClient.tsx`, `app/dashboard/page.tsx`) — written/live enabled flags and fees now fetched server-side and threaded down to AskPanel.

### Fixed
- **Questions never reached admin Questions tab** — `AskPanel.onSubmit` was optional and never passed from `DashboardClient`, so submissions silently no-op'd. Now `DashboardClient` provides a handler that POSTs `{ question, profile_ids, delivery_mode: "written" }` to `/api/consultation-requests`. Errors surface in the panel.
- **AskPanel UX** — removed `flex-1` from textarea (was pushing submit button off-screen). Now uses fixed `rows={5}`. Added character counter (`X/2000`) and minimum-length hint (`N more chars needed`). Submit button shows fee or "Submit question" (free) based on settings.
- **AskPanel delivery mode** — panel now respects `written_consultation_enabled` / `live_consultation_enabled` from app settings. If only live is enabled, shows a redirect link to `/consultation`. If both off (free), submits written with no fee shown. If live also enabled, shows "Book a live session →" link below form.
- **Admin table profile links** — all profile and compatibility "View" links now navigate to `/dashboard?profile=...` (and `?compare=...` for compatibility checks) instead of the old `/profiles/[id]` and `/compatibility/[id]` pages. All open in a new tab so admin does not lose their place.

---

## [2026-05-19] — AI Admin Panel + Admin screen design token overhaul

### Added
- **`components/panels/AIAdminPanel.tsx`** — New admin-only side overlay (Sheet) with two sub-tabs: Summary (generate/regenerate cached AI summaries per profile tab, stored in DB) and Chat (stateless per-profile or compatibility chat with markdown rendering). Features: shared model picker persisted across sub-tabs, Copy + ThumbsUp/ThumbsDown on each assistant message, context-aware breadcrumb (profile + tab or compatibility pair), cache check on panel open to avoid redundant API calls, regenerate option.
- **`components/profiles/ProfileView.tsx`** — Exported `ChartTabId`, added `AIOpenPayload` interface, `isAdmin` and `onAIOpen` props, sparkles AI button pinned to tab bar right edge (admin-only).
- **`app/dashboard/DashboardClient.tsx`** — `handleAIOpen` plumbs AI panel open/close state and context; panel closes on profile switch; renders `AIAdminPanel` when admin.
- **`app/dashboard/page.tsx`** — Passes `isAdmin={isAdmin(session)}` to `DashboardClient`.

### Changed
- **`app/admin/AdminTables.tsx`** — Full design token audit: replaced all hardcoded Tailwind color names (`violet-*`, `amber-*`, `sky-*`, `blue-*`, `green-*`, `zinc-*`, `white`, `red-*`) with semantic CSS variable tokens (`--color-accent`, `--color-accent-faint`, `--color-accent-dim`, `--color-success`, `--color-success-faint`, `--color-success-border`, `--color-danger`, `--color-danger-faint`, `--color-danger-border`, `--color-ink-*`, `--color-surface-*`). Toggle now uses `--color-accent` when enabled. Admin screens now correctly adapt between dark and light themes.
- **`components/admin/LlmSettingsPanel.tsx`** — Same audit: `accent-violet-500` → `accent-[var(--color-accent)]`; all `focus:ring-violet-400/50` → `focus:ring-[var(--color-accent)]/50`; save buttons converted to accent tokens.
- **`components/panels/AIAdminPanel.tsx`** — `text-violet-400` instances (Sparkles, spinner, user bubble) replaced with `--color-accent` tokens for theme consistency.

---

## [2026-05-19] — Unified view UI/UX polish: themes, tables, and design tokens

### Changed
- **`app/globals.css`** — Dark theme (Cosmic) contrast significantly improved across two passes. First pass: `--color-ink-3` lifted 38%→52%, `--color-ink-4` 22%→35%, `--color-border` 10%→15%, `--color-border-subtle` 5%→9%, surfaces bumped. Second pass (opacity-stacking audit): `--color-ink-3` 52%→65%, `--color-ink-4` 35%→45%, `--color-border` 15%→22%, `--color-border-subtle` 9%→13%. Resolves widespread unreadability where muted-foreground text stacked with `/30`–`/50` modifiers became near-invisible.
- **`components/unified/tabs/YogasTab.tsx`** — Replaced hardcoded `amber-500`/`amber-300` Tailwind colors on major yoga cards, major badge, and Gandanta card with `var(--color-accent)` tokens. Cards now adapt correctly between dark (amber-gold) and light (crimson) themes.
- **`components/unified/tabs/DashaTab.tsx`** — Replaced `style={{ paddingLeft }}` inline styles with static Tailwind class lookup arrays (`ROWS_PL`, `PERIOD_PL`) so Tailwind can scan classes at build time. Fixed `border-[var(--color-border)]/20` (near-invisible 2% border) → `border-[var(--color-border)]`.
- **`components/unified/tabs/TransitsTab.tsx`** — Table column headers renamed: `"H/Lagna"` → `"From Lagna"`, `"H/Moon"` → `"From Moon"` for clarity.
- **`components/unified/tabs/JaiminiTab.tsx`** — Karakas table wrapper changed to `max-w-2xl overflow-x-auto` so the description column has enough room and the table doesn't span full page width.
- **`components/unified/tabs/CareerTab.tsx`** — Outer container constrained to `max-w-2xl`. Added "Primary" column to Key Professional Significators table. Renamed "Strong" column header to "Strong in D10".
- **`components/profiles/ProfileSidebar.tsx`** — Form label size increased `text-[9px]` → `text-[10px]`. Error text changed from hardcoded `text-red-400` to semantic `text-danger`.
- **`components/tabs/CompareTab.tsx`** — `FullResult` outer wrapper constrained to `max-w-2xl`; Guna Breakdown table to `max-w-xs`; Natal Moon Profiles table to `max-w-sm`. Kuja Dosha Detail table wrapped in `overflow-x-auto` for tablet viewports. Error div converted from inline `style` to semantic `border-danger/40 bg-danger/5`.
- **`components/profiles/ProfileView.tsx`** — Removed leading `◎` symbol from "Today" tab label for consistency.

---

## [2026-05-18] — Marriage Compatibility tab; CompareTab persistence & UX polish; CareerTab card; sidebar disclaimer

### Added
- **Astrology disclaimer** (`components/profiles/ProfileSidebar.tsx`) — soft disclaimer text pinned to the bottom of the profile sidebar reminding users to seek expert guidance and not interpret readings as definitive.

### Changed
- **"Compare" tab renamed to "Marriage Compatibility"** (`components/profiles/ProfileView.tsx`).
- **CompareTab persistence** — `selectedId` and `result` state lifted into `ProfileView` so switching tabs and returning no longer resets the compatibility check.
- **CompareTab selector UX**:
  - After selecting a partner, the dropdown is replaced by a `ProfilePill` (avatar + full name + role label) matching the active profile display — so both parties appear symmetrically.
  - Separator between the two parties changed from `×` to `♡`.
  - Clear button changed from an `X` icon to a labelled `Reset` button with a `RotateCcw` icon.
- **CareerTab left column** (`components/unified/tabs/CareerTab.tsx`) — D10 chart, Key Significators, and Career Themes are now visually grouped inside a single bordered card (`w-[260px]`, `rounded-lg border`). Each section is separated by a border-top within the card for clear hierarchy.
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
## [2026-05-20] — Zod DB validation, content index prebuild, and sort type fix (Session 4)

### Code quality
- **`lib/db/users.ts`**, **`lib/db/feedback.ts`**, **`lib/db/profiles.ts`**, **`lib/db/compatibility.ts`**, **`lib/db/consultation-requests.ts`**, **`lib/db/consultation-slots.ts`**, **`lib/db/readings.ts`** — Replaced all `as unknown as T` raw type casts with Zod schema parsing. Each module now defines a `z.object({...})` schema that matches the table columns exactly. Schema mismatch between the DB and TypeScript types now throws a `ZodError` at runtime rather than silently producing `undefined` fields. Used `z.infer<typeof Schema>` to derive the exported types, so schemas and types stay in sync automatically.
- **`app/admin/AdminTables.tsx`** — Replaced `(a as Record<string, unknown>)[col]` sort accessor with a bounded generic `<T extends Record<string, unknown>>(arr: T[], col: string): T[]`. Accessing via `a[col as keyof T]` removes the unconstrained cast while keeping the `string`-typed sort state.

### Performance
- **`scripts/build-content-index.ts`** (new) — Pre-build script that reads all 542 markdown content files, parses them using the same logic as `lib/content/loader.ts`, and writes `lib/content/content-index.json` (394 entries, ~456 KB) at build time. Added to `package.json` as `"prebuild": "tsx scripts/build-content-index.ts"` so it runs automatically before `next build`.
- **`lib/content/loader.ts`** — Modified to load the pre-built JSON index at module init time (via `createRequire`), pre-populating the in-memory cache before the first request arrives. Cold Lambda starts no longer parse 500+ markdown files — they read a single JSON. Falls back to on-demand file reading if the index doesn't exist (dev mode without running `prebuild`).
- **`lib/content/loader.test.ts`** — Updated call-count assertions to account for the one-time content-index.json read that now occurs at module init. Caching invariants are unaffected.
- **`.gitignore`** — Added `lib/content/content-index.json` (generated at build time; not committed).

### Housekeeping (I3)
- Old engine readings (`bazi`, `vedastro`, `western`, `panchangam`) remain in the DB. Run this once via Turso dashboard when convenient: `DELETE FROM readings WHERE engine IN ('bazi', 'vedastro', 'western', 'panchangam');`

---

## [2026-05-20] — Route tests, admin pagination, and eslint hardening (Session 3)

### Test coverage
- **`app/api/profiles/route.test.ts`** (new) — 8 tests: GET (401, 200+list, Cache-Control) and POST (401, 429, 403 cap at 10, 400 missing fields, 400 name > 100 chars, 201 success with geocoding, 400 geocoding failure).
- **`app/api/compatibility/route.test.ts`** (new) — 9 tests: GET (401, 200+Cache-Control) and POST (401, 429, 400 missing IDs, 200 duplicate no-sidecar, 403 cap, 404 profiles not found, 200 sidecar success+Cache-Control).
- **`app/api/readings/dashaflow/route.test.ts`** (new) — 12 tests: GET (401, 400 missing profile_id, 404, 200 cached+Cache-Control, 200 fresh, 502 engine error, admin `getAny` path) and POST (401, 429, 404, 502, 200 success+Cache-Control).
- **`app/api/readings/ai-insight/route.test.ts`** (new) — 11 tests: GET (403 non-admin, 400 missing tab, 400 invalid tab, 200 with reading+Cache-Control, 200 null when no reading) and POST (403, 400 missing tab, 200 cached no-LLM, 404 profile not found, 200 fresh insight, 500 LLM throws).
- **`app/api/consultation-requests/route.test.ts`** (new) — 10 tests: GET (401, 200+Cache-Control) and POST (401, 429, 409 pending, 400 missing fields, 400 too short, 400 invalid delivery_mode, 400 appointment no slot, 404 profile not found, 201 success, 409 slot already booked).

### Performance
- **`lib/db/users.ts`**, **`lib/db/feedback.ts`**, **`lib/db/profiles.ts`**, **`lib/db/compatibility.ts`**, **`lib/db/consultation-requests.ts`** — All `list()` / `listAll*()` admin queries now include `LIMIT 200` (default, callers can pass a higher value). Previously these queries loaded all rows into Lambda memory with no upper bound. At moderate user scale the unbounded 3-way join in `listAllWithDetails()` would hit Vercel's 50 MB response ceiling. Full pagination with page-controls in the admin UI is deferred to backlog.

### Code quality
- **`eslint.config.mjs`** — Explicitly wired `eslint-plugin-jsx-a11y` (`flatConfigs.recommended`) alongside `eslint-config-next/core-web-vitals`. The plugin was installed transitively but not explicitly declared; this makes accessibility linting unambiguous and resilient to future dependency changes.

---

## [2026-05-20] — Reliability, performance, CSP, and test coverage (Session 2)

### Security
- **`next.config.ts`** — Removed `unsafe-eval` from `script-src` in the Content-Security-Policy header. Production Next.js builds do not use `eval()`; the directive was overly permissive and undermined XSS protection. Also tightened `connect-src` from `https:` (any external domain) to `'self'` — all browser→API traffic goes to the same origin.

### Reliability
- **`lib/engines/fetch-with-retry.ts`** (new) — Shared utility that adds a single 1-retry with 500ms backoff on 502/503/504 responses from sidecar or LLM calls. Does not retry 4xx (genuine client errors) or `TimeoutError` (already exceeded budget). Each attempt gets a fresh `AbortSignal.timeout` so the timer resets on retry.
- **`lib/engines/dashaflow.ts`**, **`lib/engines/transit.ts`**, **`lib/engines/career.ts`**, **`app/api/readings/muhurtha/route.ts`** — All sidecar fetch calls now use `fetchWithRetry` instead of bare `fetch`. Transient sidecar cold-start 502s are now auto-recovered without surfacing an error to the user.

### Performance
- **`lib/db/profiles.ts`** — Added `count(userId)` method: `SELECT COUNT(*)` instead of loading all profile rows just to check the cap.
- **`lib/db/compatibility.ts`** — Added `countByUser(userId)` and `findDuplicate(userId, id1, id2)` methods using targeted SQL queries. Previously the whole user's compatibility list was loaded to count and search for duplicates in JavaScript.
- **`app/api/profiles/route.ts`** — Profile cap check now uses `db.profiles.count()` instead of `db.profiles.list()`. Fixes a TOCTOU race condition: two concurrent POST requests could both see count=9, both pass the check, and both create a profile — resulting in 11 profiles.
- **`app/api/compatibility/route.ts`** — Compatibility cap and duplicate checks now use the two new targeted DB methods.

### Test coverage
- **`lib/tarabalam.test.ts`** (new) — 34 tests covering all exported functions in `lib/tarabalam.ts`: `getNakshatraIndex` (exact match, unknown, prefix/pada), `computeTara` (all 27×27 pairs, wrap-around, known values), `computeTithi` (Amavasya/Purnima, all pakshas, wrap-around, full range), `extrapolateMoonLongitude` (0-offset, daily motion, wrap, negative days, full-cycle), `extrapolateMoonNakshatra` (all 27 segments), `extrapolateSunLongitude` (daily motion, full year), `TARAS` constant integrity.
- **`lib/engines/dashaflow.test.ts`** — Updated 503 test to mock `fetch` twice (initial call + retry) to match the new `fetchWithRetry` behaviour.

### Code quality
- **`package.json`** — Added `"prepare"` script (`git config core.hooksPath .githooks`) so any fresh `npm install` auto-registers the pre-push hook.
- **`.githooks/pre-push`** (new) — Shell hook that runs `tsc --noEmit` and `vitest run` before every push. Blocks the push if either fails.

---

## [2026-05-20] — Security hardening, reliability, and code quality (Session 1)

### Security
- **`app/api/profiles/route.ts`**, **`app/api/consultation-requests/route.ts`**, **`app/api/compatibility/route.ts`**, **`app/api/readings/dashaflow/route.ts`** — Added `Cache-Control: private, no-store` to all authenticated data responses. Without this header, browsers and shared proxies could cache personal chart data and serve it to other users on the same device or network. AI insight and chat routes already had this header; the gap was in the core data retrieval endpoints.
- **`lib/sanitize.ts`** — Replaced homegrown regex-based HTML sanitizer (known OWASP anti-pattern, bypassable with obfuscated payloads) with `isomorphic-dompurify`. DOMPurify is maintained by cure53, uses a real DOM parser on both client and server, and is the industry standard. Package was already in `dependencies`; only the implementation changed.
- **`app/api/readings/muhurtha/route.ts`** — Added enum validation for `event_type` against `["marriage", "house_entry", "business", "travel", "education", "medical"]`. Unknown values now return 400 instead of being forwarded to the sidecar.
- **`app/api/readings/tarabalam/route.ts`** — Added validation that `end_date` is strictly after `start_date`. Previously a reversed range produced a negative `daysDiff` that passed the 90-day guard and sent a backwards date range to the engine.
- **`app/api/admin/backfill/route.ts`**, **`app/api/admin/clear-compatibility/route.ts`** — Replaced direct `createClient()` instantiation with `getClient()` from `lib/db/client.ts`. Admin routes were creating fresh libSQL client instances on every request instead of using the shared singleton, accumulating connection objects on warm Lambdas and bypassing future safety guards.

### Reliability
- **`lib/engines/dashaflow.ts`**, **`lib/engines/transit.ts`**, **`lib/engines/career.ts`** — Added `AbortSignal.timeout(20_000)` (20s) to all sidecar fetch calls. Node's default timeout is ~2 minutes; a hung sidecar would block the Lambda and produce a raw Vercel 504 with no user-friendly message. `TimeoutError` now returns a clear message.
- **`lib/engines/gemini.ts`**, **`lib/engines/groq.ts`** — Added `AbortSignal.timeout(60_000)` (60s) to all LLM API fetch calls.
- **`app/api/readings/muhurtha/route.ts`** — Added 20s timeout to the muhurtha sidecar fetch.

### Code quality
- **`lib/db/client.ts`** — Parameterized the `INSERT OR IGNORE INTO settings` statement (was using a template literal with `new Date().toISOString()` directly in SQL, violating the codebase's own parameterized-query rule). Replaced the 14 empty `catch {}` blocks around `ALTER TABLE` migrations with a shared `migrate()` helper that logs unexpected errors (i.e. errors that are NOT "duplicate column name"), making genuine migration failures visible instead of silent.
- **`package.json`** — Fixed `"test"` script from `"jest"` (no config, always fails) to `"vitest run"`. Added `"test:watch": "vitest"` and `"test:coverage": "vitest run --coverage"`.
- **`vitest.config.ts`** — Added coverage configuration: v8 provider, text + lcov reporters, 60% statement/branch thresholds.
- **`proxy.ts` → `middleware.ts`** — Renamed to follow Next.js convention. Next.js loads middleware from `middleware.ts`; the previous name worked but was non-standard.

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
