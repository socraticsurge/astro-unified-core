# Astro Chaganti — Product Reference

<!-- last-updated: 2026-07-26 -->

> **For product managers, feature designers, and anyone reasoning about
> the *why* of the product.** Technical implementation details live in
> `ARCHITECTURE.md`. Coding standards live in `STANDARDS.md`.

---

## Table of Contents

1. [Product Story](#1-product-story)
2. [User Personas](#2-user-personas)
3. [Feature Map](#3-feature-map)
4. [Consultation & Fee Structure](#4-consultation--fee-structure)
5. [User Journeys (Plain Language)](#5-user-journeys-plain-language)
6. [Content Philosophy](#6-content-philosophy)
7. [Product Roadmap](#7-product-roadmap)
8. [Unification Programme](#8-unification-programme)

---

## 1. Product Story

Astro Chaganti brings Dr. Vinay Kumar Chaganti's Vedic astrology practice
online. It combines trustworthy public daily astrology utilities with a private,
profile-aware experience for family and clients.

**The promise:** Visit for a useful view of the day; enter your birth details
once for a lifelong, structured Vedic chart; return when life events require
personal clarity about career, relationships, and timing.

**What sets it apart:**
- All computation uses the Swiss Ephemeris with Lahiri ayanamsha (the standard
  adopted by the Indian government for Panchang).
- Interpretations are drawn from classical Sanskrit sources (Brihat Parashara
  Hora Shastra, Jataka Parijata, Uttara Kalamrita, Sarvartha Chintamani) and
  rephrased by Dr. Chaganti for modern readers.
- No cold algorithmic output — every section has a human-authored explainer.

---

## 2. User Personas

### Persona A — "The Family Member"

Age 30–65. Referred by Dr. Chaganti. Has a birth time. Wants to understand
their chart without learning Vedic astrology. Values clarity over completeness.

**Key needs:**
- Create profiles for self, spouse, children without friction.
- Read their chart in plain English.
- Know auspicious days for upcoming decisions.
- Ask Dr. Chaganti a specific question when stuck.

**Pain points:**
- Unfamiliar Vedic vocabulary (nakshatras, dashas, lords).
- Anxiety about time-of-birth accuracy.

### Persona B — "The Enthusiast"

Age 25–45. Has studied astrology casually. Wants deeper analysis — planetary
conjunctions, yoga formations, D10 charts. Comfortable with technical terms.

**Key needs:**
- Professional view with detailed planetary tables.
- Transit overlay for current planetary positions.
- Career analysis (D10 divisional chart).
- Compatibility scoring with detailed breakdown.

### Persona C — "Dr. Chaganti (Admin)"

**Key needs:**
- View any user's chart or compatibility check.
- See all consultation requests in one place.
- Mark consultations answered.
- Run backfill / maintenance without engineering help.
- Toggle consultation availability (live vs. written only).

### Persona D — "The Public Visitor"

Arrives through search, a shared link, or an existing Panchangam subscription.
May not be ready to create an account but expects an authoritative, fast,
mobile-friendly daily resource.

**Key needs:**
- See today's Panchangam for their location.
- Read the daily Rasi Phalalu and understand their provenance.
- Learn who Dr. Chaganti is and why the calculations are trustworthy.
- Move naturally from generic guidance to a private, personalized profile.

---

## 3. Feature Map

| Feature | Who can use | Status |
|---|---|---|
| Google sign-in | All users | Live |
| Birth profile CRUD (max 10) | Registered users | Live |
| Vedic chart — 17 sections (DashaFlow) | Registered users | Live |
| Marriage compatibility (Ashtakoota Milan) | Registered users (max 6 checks) | Live |
| Tarabalam — auspicious-day calendar | Registered users | Live |
| Transit overlay | Registered users | Live |
| Career analysis (D10) | Admin only (Professional view) | Live |
| Muhurtha — auspicious timing | Registered users (requires current location) | Live |
| Today's Panchangam | Public visitors | Migration planned |
| Daily Rasi Phalalu | Public visitors | Migration planned |
| Astrologer profile | Public visitors | Upgrade planned |
| Profile-validated Muhurtam | Registered users | Upgrade planned |
| Professional view toggle | Admin only | Live |
| Written consultation request | Registered users (1 pending at a time) | Live |
| Consultation admin panel | Admin only | Live |
| Live consultation scheduling | Deferred (D4) | Not built |
| Profile sharing (public links) | Deferred (D5) | Not built |
| Family / relationship graph | Deferred (D6) | Not built |

---

## 4. Consultation & Fee Structure

### Written Consultation ("Ask a Question")

- User submits a "Life Problem Statement" — a single focused question.
- One pending submission allowed at a time per user.
- Dr. Chaganti reviews in the admin panel and marks it answered.
- Fee: configurable via `written_fee_paise` app setting (stored in DB).
  Default: see `lib/db/settings.ts` seed values.

### Live Consultation

- Availability toggled by `live_consultation_enabled` app setting.
- When enabled, the UI shows a booking CTA (currently redirects to email).
- Fee: configurable via `live_fee_paise` app setting.
- Full booking flow (Cal.com / Calendly) is deferred (D4).

### Admin Settings

Three settings are writable via the admin API:
- `live_consultation_enabled` — boolean toggle
- `written_fee_paise` — integer (paise = 1/100 of a rupee)
- `live_fee_paise` — integer

---

## 5. User Journeys (Plain Language)

These are numbered so `TESTING.md` test plans can reference them by ID.

### J1 — New User Onboarding

1. User lands on the home page (unauthenticated).
2. Clicks "Sign In with Google".
3. Authorises the Google OAuth flow.
4. Redirected to `/dashboard`. Dashboard is empty — a nudge to create a profile is shown.
5. User clicks "New Profile".
6. Fills in name, date, time, place of birth, gender, relationship.
7. Saves. Profile appears in the dashboard.

### J2 — Viewing a Chart

1. User clicks a profile on the dashboard.
2. Chart page loads. Spinner shown while sidecar calculates.
3. 17 chart sections appear: planets, ascendant, dashas, yogas, etc.
4. User taps the ⓘ button on any section to read the classical interpretation.
5. User refreshes the chart using the "Refresh" button (triggers a new sidecar call).

### J3 — Compatibility Check

1. User navigates to `/compatibility`.
2. Selects Profile A (person 1) and Profile B (person 2).
3. Clicks "Check Compatibility".
4. Results page shows: total score, per-kuta breakdown, narrative.

### J4 — Auspicious Days (Tarabalam)

1. From a profile's chart page → opens the Tarabalam calendar.
2. Selects a date range (max 90 days).
3. Optionally selects additional family profiles to overlay.
4. Calendar grid shows Tara quality (green/amber/red) and Tithi per day per profile.

### J5 — Transit Check

1. Admin opens a profile in Professional view.
2. Selects "Transit" tab.
3. Picks a target date.
4. Current planetary positions overlaid on the natal chart.

### J6 — Consultation Request

1. User navigates to "Ask a Question" (`/consultation`).
2. Writes a Life Problem Statement.
3. Submits. Confirmation shown. User cannot submit another until Dr. Chaganti responds.
4. Dr. Chaganti sees the request in admin panel → marks it answered.
5. User sees the status change on their consultation page.

### J7 — Admin Oversight

1. Dr. Chaganti signs in.
2. Admin nav link appears (only visible to admin accounts).
3. Admin panel shows: all users, all profiles, pending consultations, app settings.
4. Admin can open any user's profile and see the full Professional view.

### J8 — Muhurtha (Auspicious Timing)

1. User must have a current location set on their profile.
2. Opens Muhurtha tool from the Professional view.
3. Selects event type (marriage, business, travel, etc.) and a date/time window.
4. System returns a quality rating and reasoning for the proposed time.

---

## 6. Content Philosophy

- **538 markdown files** covering: ascendants, planets in houses, house lords,
  dasha pairs, conjunctions, nakshatras, nabhasa yogas, lunar yogas.
- All content authored or adapted by Dr. Chaganti from classical Sanskrit texts.
- Sources: Brihat Parashara Hora Shastra, Jataka Parijata, Uttara Kalamrita,
  Sarvartha Chintamani.
- Content is rendered at runtime from a file-based CMS (`lib/content/loader.ts`).
  Files are loaded lazily and cached per Lambda instance.
- Credit attribution required in footer: `"Verses adapted from classical sources;
  rephrasings by Dr. Vinay Kumar Chaganti. See credits for source attribution."`

---

## 7. Product Roadmap

### Near-term (next 3 sprints)

- Expose more DashaFlow sidecar endpoints in the Professional view (D8).
- Add live consultation booking via Cal.com embed (D4).
- Add email notification when a consultation is answered (D3 variant).

### Medium-term

- Global rate limiting via Upstash Redis (D7 — unblocks future scaling).
- Family relationship graph (D6 — enables richer Tarabalam across family members).
- Public profile sharing (D5 — allows Dr. Chaganti to share a chart link with a client).

### Long-term / Under review

- Custom domain (`astrochaganti.com`) — requires OAuth redirect URI update (D2).
- Mobile-first redesign (currently responsive but desktop-primary).
- Payment integration (Razorpay or Stripe) linked to consultation slots.

---

## 8. Unification Programme

### Goal

Unify `astrochaganti.com` and the user-facing capabilities of
`panchangam.astrochaganti.com` into one coherent product and SEO authority.
Generic Panchangam and daily horoscope experiences remain public. Muhurtam
selection becomes profile-aware inside the authenticated Astro Chaganti
experience. The Telugu Calendar Utilities project remains the authoritative
calculation source and gains a Vercel-hosted API surface.

### Non-negotiable principles

1. **Migration before retirement.** Existing sites, feeds, workflows, data, and
   subscriber URLs remain operational until their replacements have passed
   parity, acceptance, cutover, and stabilization gates.
2. **No production experimentation.** Development and acceptance testing use
   Vercel previews, isolated credentials, and a separate staging Turso database.
3. **One authoritative calculation source.** Panchangam and personalized timing
   consumers call the Telugu Calendar Utilities engine; they do not fork or
   approximate its rules in the web application.
4. **Public and private boundaries stay explicit.** Public content can use CDN
   caching. Authenticated profile data is owner-scoped and never publicly cached.
5. **Backward compatibility is a deliverable.** Existing calendar feed URLs and
   valuable indexed URLs are preserved, proxied, or permanently redirected only
   after verification.
6. **Every cutover is reversible.** The former production deployment and service
   remain available throughout stabilization, with a documented rollback trigger
   and procedure.
7. **Retirement requires separate approval.** Shipping a replacement never
   implicitly authorizes disabling the old service.

### Target experience

- The public home page presents today's Panchangam, daily Rasi Phalalu,
  Dr. Chaganti's profile, and a clear path to personalized astrology.
- Public visitors can explore location-aware daily and calendar content without
  signing in.
- Registered users create and manage private profiles, explore their charts, and
  select Muhurtams validated against the relevant profile or profiles.
- The product appears as one Astro Chaganti service even when separate Vercel
  projects provide the Next.js application and Python computation APIs.

### Gate 2 target-experience proposal

This proposal is based on a responsive review of both live products. Astro
Chaganti supplies the premium visual identity and trusted private workspace;
the Panchangam site supplies substantial public utility. The unified experience
uses progressive disclosure so the first screen feels calm while the detailed
calculation evidence remains available when a visitor asks for it.

#### Experience principles

1. **Useful before sign-in.** The home page is a public destination, not an
   authentication wall. Signing in unlocks personalization rather than access
   to generic daily information.
2. **One brand, two trust boundaries.** Public pages are crawlable and shareable;
   saved profiles, charts, consultations, and personalized results remain
   private and owner-scoped.
3. **Generic and personal claims are labelled honestly.** Rasi Phalalu is
   guidance for a Moon sign. `Your Today` and personalized Muhurtam use a saved
   birth profile and state exactly which factors were evaluated.
4. **Progressive disclosure over information density.** Every principal page
   begins with a concise answer and then exposes calculations, terminology,
   provenance, and advanced controls.
5. **Mobile is the primary daily-use experience.** Location, date, sign, profile,
   and primary action remain easy to reach without horizontal navigation or
   dense desktop tables.
6. **Continuity is part of the experience.** Existing users retain familiar
   authenticated URLs and capabilities; feed subscribers and indexed visitors
   do not encounter broken links during migration.
7. **Astrologer review remains meaningful.** High-stakes electional results show
   limitations and offer Dr. Chaganti's review instead of making absolute
   automated claims.

#### Information architecture

| Surface | Access | Purpose |
|---|---|---|
| `/` | Public | Today's useful summary, Rasi Phalalu, Dr. Chaganti introduction, feeds, and path to personalization |
| `/panchangam` | Public | Location- and date-aware Panchangam with concise summary and expandable detail |
| `/horoscope` | Public | Clearly labelled generic Rasi Phalalu with sign and date selection |
| `/festivals` | Public | Searchable month/year festival calendar |
| `/subscribe` | Public | Existing and future calendar-feed subscriptions and instructions |
| `/about` | Public | Dr. Chaganti's biography, practice, calculation approach, sources, and consultation scope |
| `/muhurtam` | Public | Baseline electional calculator with method, limitations, and an invitation to add profile-aware validation |
| `/privacy`, `/terms`, `/credits` | Public | Trust, policy, and source attribution |
| `/dashboard` | Authenticated | Profile switcher and the next most useful actions for the signed-in user |
| `/dashboard/today` | Authenticated | `Your Today`: profile-aware daily timing, distinct from generic Rasi Phalalu |
| Existing profile and chart routes | Authenticated | Preserve saved profiles and all current chart capabilities while simplifying navigation |
| `/dashboard/muhurtam` | Authenticated | Multi-profile, chart-aware Muhurtam workspace |
| `/compatibility`, `/consultation`, `/admin` | Authenticated/authorised | Preserve current comparison, consultation, and administration journeys |

Exact canonical date and location URL shapes, redirects, rendering strategy, and
cache rules are Gate 3 architecture decisions. Public navigation is **Today,
Panchangam, Horoscopes, Festivals, About** with **Sign in**; signed-in visitors
see **My Dashboard** in its place and may still use the public home page.

#### Home-page composition

1. A restrained version of the existing cosmic hero communicates Astro
   Chaganti's identity and the distinction between today's public guidance and
   personal chart work.
2. `Today in [location]` shows the five Panchangam limbs, the most useful
   auspicious/avoid windows, and links to the full calculation. Date and location
   are changeable without signing in.
3. `Daily Rasi Phalalu` lets a visitor select one of twelve signs and explains
   that this is sign-level transit guidance, not a natal-chart reading.
4. `Plan an important date` opens the public Muhurtam calculator; saved profiles
   and deeper chart validation provide a clear, optional reason to sign in.
5. `About Dr. Chaganti` provides human identity, method, sources, and a path to
   consultation without inventing credentials or claims.
6. A calendar subscription block preserves the high-value feed journey.

#### Public and authenticated feature placement

| Capability | Public experience | Authenticated upgrade |
|---|---|---|
| Panchangam | Daily/location explorer, festivals, horas, lagnas, auspicious and avoid periods | Uses saved profile and preferred location where relevant |
| Daily horoscope | Generic Rasi Phalalu by sign, with provenance and disclaimer | `Your Today`, calculated for the selected saved profile |
| Muhurtam | Usable baseline calculator with event rules, Panchangam factors, explanations, and limitations | Saved people plus deeper participant- and chart-aware validation |
| Birth chart | Explains the benefit and required birth data | Full existing chart and interpretation capabilities |
| Calendar feeds | Browse and subscribe without an account | Saved preferences may simplify feed selection later |
| Astrologer and sources | Public biography, method, source philosophy, consultation scope | Submit and track a consultation request |

#### Simplified signed-in workspace

The current chart depth is preserved but presented in six understandable groups:

- **Overview / Today** — immediate profile summary and current guidance.
- **Birth Chart** — core chart, planets, houses, nakshatras, and divisional views.
- **Timing** — Dashas, transits, Tarabalam, Chandrabalam, and Muhurtam.
- **Patterns** — Yogas, Jaimini, Ashtakavarga, and advanced analysis.
- **Life Areas** — career and other topic-focused interpretations.
- **Compare** — compatibility and multi-profile work.

The profile switcher remains visible throughout. Existing deep links and
capabilities are retained or compatibly redirected; this grouping is a
navigation simplification, not a feature deletion.

#### Protected admin workspace

Administration is a first-class product surface, not an incidental collection
of controls. Existing user/profile access, consultation handling, professional
view, and settings remain available throughout migration. The target workspace
organises them into **People**, **Consultations**, **Content & Publishing**,
**Operations**, and **Settings**. It adds role-enforced access, clear audit
context for sensitive actions, calculation/API health and publishing status,
and migration-readiness visibility. Gate 3 defines the security and data
boundaries; Gate 7 delivers and accepts the improved admin experience alongside
the other authenticated journeys.

#### Target journeys

**U1 — Public daily visit**

1. A visitor lands on `/` from search, a share, or a bookmark.
2. Location is inferred conservatively or selected explicitly; the page shows
   today's concise Panchangam immediately.
3. The visitor can expand the calculation, change date/location, read a Rasi
   Phalalu, or subscribe without creating an account.

**U2 — From generic guidance to a saved profile**

1. A visitor sees the explicit difference between sign-level guidance and a
   natal-chart-based result.
2. They sign in with Google and create a birth profile once.
3. They arrive at that profile's overview rather than a generic empty dashboard.

**U3 — Returning user's day**

1. A signed-in user may still visit the public home page.
2. `My Dashboard` opens the last-used profile and offers `View Your Today`,
   `Explore Birth Chart`, `Plan a Muhurtam`, `Compare Profiles`, and
   `Ask Dr. Chaganti`.
3. Switching profiles updates all personal context without re-entering data.

**U4 — Public-to-profile-aware Muhurtam**

1. A public visitor chooses an activity, event location, date range, and
   flexibility, then receives useful baseline dates and windows from general
   Panchangam and activity rules without signing in.
2. The result explains that participant suitability requires birth details and
   offers sign-in/profile creation without hiding the baseline result.
3. A signed-in user selects one or more saved profiles. The engine adds approved
   participant factors and chart-specific validations without re-entering birth
   data.
4. Enhanced results separate general-day quality, participant fit, chart
   cautions, and factors not evaluated; serious events can be marked for
   astrologer review.
5. The user can compare, save, share privately, or request Dr. Chaganti's review.

**U5 — Existing subscriber continuity**

1. Existing Panchangam feed and indexed URLs continue working during migration.
2. Once parity and mapping are verified, the visitor may see the unified Astro
   Chaganti presentation without changing a subscribed calendar URL.
3. Redirects or retirement occur only at the later approved gates.

#### Content required from the owner

Before visual/content approval, Dr. Chaganti supplies or approves the public
biography, qualifications and practice description, methods and calculation
standards, source philosophy, consultation offering, languages/location, a
portrait, and contact boundaries. Placeholders may be used in previews, but no
professional credential or endorsement will be inferred.

#### Gate 2 acceptance decisions

Gate 2 is approved only when the owner explicitly accepts all of the following:

1. The home page is publicly useful and does not redirect signed-in users away.
2. Generic Panchangam, festivals, feeds, and Rasi Phalalu are public.
3. `Your Today` and saved charts are authenticated; Muhurtam has a useful public
   baseline and an authenticated, profile-validated upgrade.
4. `/muhurtam` remains a public calculator and `/dashboard/muhurtam` provides the
   saved-profile workspace without duplicating the calculation engine.
5. The navigation, route families, six-group chart organisation, and five target
   journeys are directionally correct.
6. Dr. Chaganti's public profile uses only owner-supplied or owner-approved
   claims and media.
7. Existing admin capabilities are preserved and reorganised into a protected,
   role-enforced operational workspace during the authenticated-experience gate.
8. No legacy URL, feed, capability, or production service is retired in this
   gate.

### Gate 4 visual-direction proposal

The reviewable prototype is intentionally isolated at
`prototypes/unification-gate4/index.html` and excluded from Vercel builds. It
contains representative content only and does not call production routes,
authentication, Turso, DashaFlow, or Telugu Calendar Utilities.

The direction preserves the existing Astro Chaganti character while simplifying
how information arrives:

- **Vellum first, Umbra retained.** The warm parchment system becomes the calm
  default for public daily use. The established dark celestial expression
  remains available as a theme and is used more strongly in the protected admin
  preview.
- **Summary before calculation detail.** The home page gives a concise daily
  Panchangam, sign-level Rasi guidance, and clear paths to expanded evidence.
  Dense Hora, Lagna, Choghadiya, and source detail remain accessible through
  progressive disclosure.
- **Generic and personal results look different.** Public Rasi Phalalu and
  public Muhurtam explicitly state their limits. The signed-in workspace names
  the selected profile and displays natal or participant-specific factors.
- **Muhurtam remains genuinely useful in public.** Baseline timings are visible
  before the invitation to sign in. The invitation explains that saved profiles
  add Tarabalam, Chandrabalam, Lagna, and approved chart validation rather than
  merely unlocking the same answer.
- **Profiles become the organising context.** A persistent profile selector and
  six simple workspace groups replace a long feature catalogue; onboarding
  explains why birth data is requested and who may access it.
- **Administration is operational, not decorative.** The preview groups People,
  Consultations, Content & Publishing, Operations, and Settings, with service
  health, publishing state, queues, and audit context. Source switching remains
  environment-controlled and is not exposed as a casual UI action.
- **Mobile is a first-class layout.** Navigation, filters, cards, results,
  profile selection, onboarding, and admin navigation collapse into single-column
  or horizontally scrollable patterns below the defined responsive breakpoints.
- **Accessibility is part of the direction.** Semantic landmarks, labelled form
  controls, visible keyboard focus, a skip link, 44-pixel control targets, colour
  plus text status cues, and reduced-motion handling are present in the prototype.

Portrait, biography, qualifications, consultation claims, and final public copy
remain placeholders until owner-supplied or owner-approved material is available.
All dates, calculations, people, metrics, health states, and parity figures in
the prototype are illustrative rather than assertions about production.

#### Gate 4 acceptance decisions

Gate 4 is approved only when the owner explicitly accepts or amends:

1. The overall Vellum/Umbra character and type, colour, spacing, and density.
2. The public home-page hierarchy: Today, Panchangam, Rasi Phalalu, Muhurtam,
   astrologer profile, and feed continuity.
3. The boundary between generic public guidance and selected-profile results.
4. The public Muhurtam result and signed-in validation invitation.
5. The profile selector, dashboard groups, and onboarding tone.
6. The protected admin workspace structure and operational emphasis.
7. The mobile hierarchy and progressive-disclosure approach.
8. The use of owner-approved biography, credentials, portrait, and claims before
   any public implementation ships.

### Owner check-in and approval gates

| Gate | Evidence reviewed together | Decision required |
|---|---|---|
| 1. Current-state audit | Repositories, deployments, Turso, workflows, URLs, dependencies, backups | Is the baseline complete and correct? |
| 2. Target experience | Information architecture and public/authenticated journeys | Is this the product we intend to build? |
| 3. Technical architecture | Service boundaries, API contracts, staging, caching, jobs, security, cost | Is the design maintainable and economical? |
| 4. Visual direction | Mobile and desktop prototypes for the principal journeys | Does this feel like Astro Chaganti? |
| 5. Backend parity | Cross-city/date/system fixtures and edge-case comparisons | Do we trust the Vercel Panchangam backend? |
| 6. Public experience | Homepage, Panchangam, horoscope, profile, sharing, SEO, accessibility | Is the public experience ready for visitors? |
| 7. Personalized experience | Auth, ownership, profiles, charts, Tarabalam, Chandrabalam, Muhurtam | Is the signed-in experience correct and simpler? |
| 8. Migration rehearsal | Staging migration, feeds, redirects, observability, rollback drill | Can cutover be executed and reversed safely? |
| 9. Production release | Test report, backups, known issues, exact runbook | Go or no-go? |
| 10. Stabilization | Errors, performance, calculations, usage, feedback, SEO, feeds | Observe, roll back, or proceed? |
| 11. Retirement | Stability evidence and verified replacement of every dependency | May the old frontend/workflows be retired? |

Work stops at each gate until the owner records an explicit decision. A gate may
be reopened whenever new evidence invalidates an earlier assumption.

### Programme status

| Gate | Status | Notes |
|---|---|---|
| 1. Current-state audit | **Approved 2026-07-22** | Read-only baseline accepted; six unresolved confirmations remain tracked inputs to later gates. |
| 2. Target experience | **Approved 2026-07-22** | Approved with a usable public Muhurtam calculator, profile-aware signed-in validation, and explicit admin-workspace scope. |
| 3. Technical architecture | **Approved 2026-07-22** | Approved with the service, staging, admin, security, data, job, cost, and rollback boundaries recorded in `ARCHITECTURE.md §15`. |
| 4. Visual direction | **Approved 2026-07-22** | Direction approved with detailed visual and interaction refinement expected during implementation; the public/private boundary and principal journeys remain controlling. |
| 5. Backend parity | **Approved 2026-07-22** | Additive contract, cross-system parity fixtures, security tests, full regression, and isolated Vercel runtime proof accepted. |
| 6. Public experience | **Approved 2026-07-22** | Direction and presentation approved. Typography/hero refinements pass in staging; the owner-approved portrait, 14+ years of astrology practice and 400+ consultation claim now replace the biography placeholder. |
| 7. Personalized experience | **Approved 2026-07-22** | Isolated owner/admin auth, synthetic Turso profiles, six-group chart navigation, five-group admin navigation, canonical multi-profile Muhurtam/Tarabalam, ownership rejection, private caching, mobile, and regression evidence accepted. Detailed refinements may be reviewed later. |
| 8. Migration rehearsal | **Approved 2026-07-22** | Functional and migration-safety review accepted. Unified root switch, fail-closed environment boundary, dependency health, crawler isolation, schema verification, legacy URL/feed checks and measured deployment rollback passed. |
| 9. Production release | **Hosted owner review in progress** | The landing-page implementation candidate is available as staging deployment `dpl_CqSecbjJMeceXrabu4aXcjDCAaEV` at `astro-unified-staging.vercel.app`, with isolated Turso, synthetic owner/admin auth and staging calculation deployment `dpl_H5LZCWuAPG6fMjVXhzR2ucYtaMoX`. Its hero plots computed Surya/Chandra sidereal positions; page settings, timing rows, three-step public Muhurtam journey and complete in-page calendar subscription flow have live acceptance evidence. All 198 feed combinations return HTTP 200 and no legacy landing-page link remains. The landing page has no known material implementation blocker, but both dirty local worktrees must still be committed and rebuilt from clean Git SHAs before a fresh unaliased candidate and go/no-go. Manual Turso recovery is proven; native PITR remains an explicit upstream-error caveat. Production aliases stay on the prior deployment. |
| 10–11 | Not started | No production changes or retirement authorised. |

---

*Last updated: 2026-07-26*
