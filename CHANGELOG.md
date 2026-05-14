# Changelog

All notable changes to Astro Chaganti are recorded here.

**Format:** `## [YYYY-MM-DD] — title` then `### Added / Changed / Fixed / Removed` bullets.  
**Rule:** Every push to `main` must add or update an entry. One session = one date entry.  
**Audience:** Future agents and developers — write enough that someone can understand what changed without reading the diff.

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
