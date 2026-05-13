# Changelog

All notable changes to Astro Chaganti are recorded here.

**Format:** `## [YYYY-MM-DD] — title` then `### Added / Changed / Fixed / Removed` bullets.  
**Rule:** Every push to `main` must add or update an entry. One session = one date entry.  
**Audience:** Future agents and developers — write enough that someone can understand what changed without reading the diff.

---

<<<<<<< HEAD
## [2026-05-13] — Geocoding: Added tests for query variants

### Added
- Comprehensive test suite for `queryVariants` in `lib/geocode.test.ts` covering edge cases like multiple commas, whitespace, and empty strings.

### Changed
- Exported `queryVariants` from `lib/geocode.ts` to enable unit testing.
=======
<<<<<<< HEAD
## [2026-05-13] — Security: HTML Sanitization for ExplainerModal

### Fixed
- Dangerously Set Inner HTML vulnerability in `ExplainerModal.tsx`.
- React Hooks violation in `ExplainerModal.tsx` (moved `useMemo` before conditional return).
- Vulnerability in `app/credits/page.tsx` where raw HTML was rendered without sanitization.

### Added
- Custom HTML sanitization utility in `lib/sanitize.ts` using `DOMParser` (client-side) and a robust regex-based fallback (server-side), addressing XSS risks when external sanitization libraries cannot be installed.
=======
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
>>>>>>> development
>>>>>>> development

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
