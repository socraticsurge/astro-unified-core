# Product Roadmap — Astro Chaganti

<!-- last-updated: 2026-05-14 -->

This document describes the path from the current state (admin-only AI tools, manual consultations, no email, desktop-first UX) to a two-tier commercial product. Written implementation-first so both the product owner and AI agents working in this codebase can act on it directly.

**Sidecar note:** `dashaflow-sidecar` lives at `socraticsurge/dashaflow-sidecar` on GitHub, deployed as a Python Vercel serverless function at `dashaflow-sidecar.vercel.app`. Same Vercel account. No hosting changes needed. Cold start is mitigated by the warmup call in `ProfileForm.tsx`.

---

## Guiding principle

Build features on `development`, test thoroughly, merge to `main` only when confident. Payment gateway is last. Self-serve AI tier comes after mobile UX and email are solid.

---

## Phase 1 — Feature Completion (current sprint)

Things already in the backlog or partially built that need to be done before anything else.

### 1.1 Finish consultation answer flow
**What:** Right now the admin can generate a draft, but there is no in-app way to send the answer back to the user. The user has no way to read their consultation answer inside the app.

**Why:** Without this, consultations live outside the app (WhatsApp, email). That is friction and makes the paid self-serve tier impossible.

**Build:**
- New `consultation_answers` DB table: `id`, `request_id`, `body_html`, `sent_at`, `created_at`
- Or simpler: add `answer_text` and `answered_at` columns to `consultation_requests`
- Admin: "Publish Answer" button in the questions panel that saves the draft as the final answer
- User: `/consultations/[id]` page shows the question + the answer once published
- Status: `pending` → `answered` (already exists in `markAnswered`) needs to show the answer body

### 1.2 Sidecar endpoint coverage in professional view
**What:** The sidecar exposes endpoints the app doesn't use yet — `evaluate_muhurtha`, deeper career details. Check `dashaflow-sidecar` repo for `api/index.py` to see what's available.

**Why:** More depth = higher justifiable price for consultations and self-serve reports.

**Deferred** — inventory what's available first, build after Phase 2 mobile work is done.

---

## Phase 2 — Mobile User Experience

The app is currently desktop-first. Most users in India open things on mobile. This is the single biggest conversion lever before monetisation.

### 2.1 Responsive audit — pages that are broken on mobile today

Prioritised by user journey frequency:

| Page | Problem | Fix |
|---|---|---|
| `/compatibility/[id]` | Score table overflows, professional view panels too wide | Stack columns, horizontal scroll on table |
| `/profiles/[id]` | Tab strip overflows on small screens | Scrollable tab row, hidden overflow |
| `/admin` | Admin tables unreadable on mobile | Acceptable — admin is desktop use |
| Compatibility detail professional view | Multiple wide cards side-by-side | Single column stack below 640px |

### 2.2 Bottom navigation (mobile only)
**What:** On mobile, replace the top nav links with a bottom tab bar.

**Why:** Thumb reach. Top nav is fine on desktop; on mobile the important links are unreachable without scrolling.

**Tabs:** Home / Profiles / Compatibility / Consultations

**Build:**
- New `components/layout/BottomNav.tsx` — renders only below `sm` breakpoint
- Hide in the existing `Navbar.tsx` with `hidden sm:flex`
- Active state reads current pathname via `usePathname()`

### 2.3 PWA manifest
**What:** Add `manifest.webmanifest`, splash screen icons, `theme-color` meta tag, `viewport` fix.

**Why:** Users can "Add to Home Screen" on Android/iOS. Removes the browser chrome. Feels like an app.

**Build:**
- `app/manifest.ts` (Next.js 15 App Router native manifest support)
- Icons at 192×192 and 512×512 (the astrology/star logo)
- `theme-color: #0a0a0f` to match the dark background
- Test on Chrome Android — check "Add to Home Screen" works

### 2.4 Touch-friendly AI chat input
**What:** The compatibility chat and profile chat textareas are small on mobile. The send button is tiny.

**Build:**
- Increase textarea `rows` on mobile, increase send button hit area to 44×44px minimum
- Keyboard-aware layout: when virtual keyboard opens, the message list should scroll up, not get buried under the keyboard. Use `env(safe-area-inset-bottom)` for bottom padding.

---

## Phase 3 — Email Infrastructure + Dasha Change Alerts

Email serves two purposes: transactional (confirmations, answers) and proactive (dasha alerts). Build the foundation once, plug features in.

### 3.1 Email foundation — Resend + React Email

**What:** Wire Resend for all outbound email. Use React Email for templates (same component model as the app — no Handlebars/MJML).

**Build:**
- `npm install resend @react-email/components`
- `RESEND_API_KEY` env var
- `lib/email/send.ts` — thin wrapper: `sendEmail({ to, subject, react })` calling `resend.emails.send()`
- `lib/email/templates/` — one file per template (see below)
- Free tier: 3,000 emails/month — fine until well past 1,000 active users

### 3.2 Transactional emails

Three templates to build:

**ConsultationReceived** — sent to user when `consultation_requests.create()` is called
- Subject: "Your consultation request has been received"
- Body: question summary, expected response time, consultation ID

**ConsultationAnswered** — sent to user when admin publishes the answer (Phase 1.1)
- Subject: "Your consultation answer is ready"
- Body: link to `/consultations/[id]`, preview of first sentence

**WelcomeEmail** — sent on first Google sign-in
- Subject: "Welcome to Astro Chaganti"
- Body: what they can do, how consultations work, CTA to add a profile

**Where to trigger these:** In the existing API routes:
- `app/api/consultation-requests/route.ts` (POST) → send ConsultationReceived
- New "publish answer" route → send ConsultationAnswered
- `app/api/auth/[...nextauth]/route.ts` or NextAuth `events.createUser` callback → send WelcomeEmail

### 3.3 Dasha change alerts — the interesting one

**What:** Each profile has a running mahadasha and antardasha. When either changes, send the user an email: "Your dasha has changed. Here's what it means."

**Why:** This is the recurring engagement hook that brings users back without you doing anything. It is also a natural upsell moment — attach a CTA for a consultation about the new dasha period.

**How dashas work in the data:**

The sidecar `/calculate` endpoint returns dasha data in `reading.output_data`. Looking at how the chat route parses it:
```ts
const dashas = data?.dashas as Record<string, { planet?: string }> | undefined;
const maha = dashas?.maha?.planet ?? "";
const antar = dashas?.antar?.planet ?? "";
```
This gives us the current planets. But we also need the transition DATE — when the current antar ends and the next one begins. The sidecar response likely includes this. Check `dashaflow-sidecar/api/index.py` to confirm what date fields are available in the dashas object.

**DB schema — new `profile_dasha_state` table:**
```sql
CREATE TABLE profile_dasha_state (
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  maha_planet TEXT NOT NULL,
  antar_planet TEXT NOT NULL,
  antar_ends_at TEXT NOT NULL,    -- ISO date when current antar expires
  maha_ends_at TEXT NOT NULL,     -- ISO date when current maha expires
  alert_sent_antar INTEGER DEFAULT 0,  -- 0 or 1
  alert_sent_maha INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (profile_id)
);
```

**Refresh strategy:**
- On every successful sidecar calculation (when a new reading is saved), update `profile_dasha_state` for that profile
- Add this to the `/api/readings/dashaflow/route.ts` POST handler after saving the reading

**Alert strategy — Vercel Cron:**
```ts
// app/api/cron/dasha-alerts/route.ts
// vercel.json cron: "0 6 * * *"  (6am IST daily)
```
- Query all `profile_dasha_state` rows where `antar_ends_at <= today + 3 days AND alert_sent_antar = 0`
- For each: fetch profile + user email, send DashaChangeAlert email, set `alert_sent_antar = 1`
- Same logic for `maha_ends_at` / `alert_sent_maha`
- Reset `alert_sent_antar = 0` after the transition date passes (so the NEXT antar also gets an alert)

**DashaChangeAlert email template:**
- Subject: "{name}'s dasha is changing — {OldPlanet} → {NewPlanet}"
- Body: what the new planet/dasha means (pull from existing `lookupDashaPair` content), CTA: "Book a consultation to understand this transition"

**Add to `vercel.json`:**
```json
{
  "crons": [{ "path": "/api/cron/dasha-alerts", "schedule": "0 1 * * *" }]
}
```
(1am UTC = 6:30am IST)

### 3.4 Transit alerts (deferred, build after dasha alerts work)

Same pattern as dasha alerts. When a major planet (Jupiter, Saturn) changes sign or when Sade Sati begins/ends, send an alert. The transit engine already exists. This is a future iteration of the same cron infrastructure.

---

## Phase 4 — Self-Serve AI Tier

**Prerequisite:** Phases 1–3 complete. Email working. Mobile UX solid.

### 4.1 Unlock AI insights for users (not just admin)

**What:** Today, `AIInsightShell` and `CompatibilityInsightShell` are gated by `showAdminTools`. For paying users, show a read-only version of the AI insight.

**Change needed:**
- Add an `is_premium` flag to users (new DB column or via a new `user_entitlements` table)
- API routes `/api/readings/ai-insight` and `/api/readings/ai-insight/compatibility` currently check `isAdmin`. Add a second condition: `isAdmin(session) || isPremium(session)`
- UI: `CompatibilityDetailClient` and `ProfileDetailClient` read `session.user.isPremium` the same way they read `isAdmin`
- Non-premium users see a locked card: "Unlock AI insight — ₹299"

### 4.2 Self-serve compatibility report

**What:** User pays, gets the full AI compatibility report + AI chat access for that specific check. No consultation needed.

**Change needed:**
- New `compatibility_purchases` table: `id`, `user_id`, `check_id`, `paid_at`
- API routes check: `isAdmin || isCompatibilityPurchased(session.user.id, check_id)`
- This scopes the unlock to the specific compatibility check they paid for (not all)

### 4.3 Upgrade CTA surfaces

Places in the UI to put upgrade CTAs:
- Locked AI insight card in profile tabs
- Locked AI insight bar in compatibility professional view
- Post-compatibility-check page: "Unlock AI analysis of this match"
- Post-consultation-answer email: "Get ongoing AI insights for ₹199/month"

---

## Phase 5 — Payment Gateway (Last)

**Prerequisite:** Phase 4 gates are in place. Upgrade CTAs exist. Email working.

- Razorpay or Cashfree (both have React-friendly SDKs, UPI support, instant settlement)
- Razorpay is the most documented for Indian B2C. 2% transaction fee, no monthly cost.
- Build a `/api/payments/create-order` route and a `/api/payments/webhook` route
- On webhook success: set `is_premium = true` or insert into `compatibility_purchases`
- No subscription management complexity initially — one-time purchases only

---

## Summary — build order

```
Phase 1  →  Phase 2 (mobile)  →  Phase 3 (email + dasha alerts)
         →  Phase 4 (self-serve AI gates)  →  Phase 5 (payments)
```

Phases 2 and 3 can run in parallel. Phase 4 cannot start until Phase 3 is done (email confirms purchase). Phase 5 cannot start until Phase 4 gates are coded.

The next thing to build after the current development sprint finishes is **Phase 2 — mobile UX**, followed immediately by **Phase 3.1–3.2** (email foundation + transactional emails). Dasha alerts (Phase 3.3) are the highest-value feature in this entire roadmap — they create recurring engagement with zero ongoing effort.
