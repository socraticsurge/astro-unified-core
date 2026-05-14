# Astro Chaganti — Product Reference

<!-- last-updated: 2026-05-14 -->

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

---

## 1. Product Story

Astro Chaganti brings Dr. Vinay Kumar Chaganti's Vedic astrology practice
online. It is a personal tool for family and clients — not a mass-market app.

**The promise:** Enter your birth details once; receive a lifelong, structured
Vedic chart enriched with classical interpretations. Return when life events
require clarity (career, relationships, timing).

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

*Last updated: 2026-05-14*
