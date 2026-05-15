# Astrochaganti — Platform Redesign Spec

**Date:** 2026-05-15
**Status:** Approved for implementation planning
**Approach:** New repository (`astrochaganti`), question-first IA, mobile-native, self-serve pricing

---

## 1. Vision & Goals

The core user experience is: **get profiles → ask questions → get answers.**

Charts exist as reference material, not as the entry point. The platform is called Astrochaganti; it is not framed around a named astrologer. Depth and classical fidelity are the trust signals. Scripture citations (BPHS, Saravali, Phaladeepika, Jaimini Sutras) are UI features, not footnotes.

**Phase B (this build):** Question-first IA, mobile-native UX, self-serve subscription, enhanced admin workspace as a researcher's tool.

**Phase C (next phase):** Public platform layer — SEO-indexed landing, shareable content, organic audience acquisition. Phase B is built with C's bones so nothing needs to be rewritten.

---

## 2. New Repository

**Repo:** `astrochaganti` (new GitHub repo under socraticsurge)
**Domain:** `astrochaganti.com`
**Deployment:** New Vercel project pointing to new repo
**Database:** Same Turso DB — schema is additive (new tables only, existing tables untouched)
**Auth:** Same Google OAuth credentials, add new redirect URI for new domain

**Code carried over (copy, not port):**
- `lib/db/` — database layer, used as foundation with new tables added
- `lib/engines/` — AI callers (Groq, Gemini), dashaflow, transit, career engines
- `lib/content/` — content loader, markdown system, full `content/` directory
- `lib/auth.ts`, `lib/sanitize.ts`, `lib/astro-utils.ts`, `lib/rate-limit.ts` — utilities
- Chart components: `DashaflowView`, `AntardashaTimeline`, `VargaDashboard`, `MuhurthaView`, `TransitView`, `CareerView`, `TarabalamView` — brought in as the chart reference panel implementation

**Left behind:** All `app/` pages, `components/dashboard/`, `components/NavBar.tsx`, `components/LandingPage.tsx`, old consultation form, old admin page, old compatibility pages, old test suite.

---

## 3. Information Architecture

### Public routes (no auth)
| Route | Purpose |
|---|---|
| `/` | Platform landing. No personal brand. Sample answers, scripture citations, rigorous framing. |
| `/pricing` | Self-serve subscription tiers. Shareable, SEO-indexable. |
| `/auth/signin` | Sign in with Google |
| `/privacy`, `/terms`, `/credits` | Unchanged |

### Authenticated app — 5 nav destinations
| # | Label | Route | Purpose |
|---|---|---|---|
| 1 | Ask | `/ask` | Start a session. Primary entry point after sign-in. |
| 2 | Profiles | `/profiles` | Manage birth profiles + natal chart reference. |
| 3 | Compatibility | `/compatibility` | Compatibility checks + compatibility chart reference. |
| 4 | History | `/history` | All past ask sessions. |
| 5 | Account | `/account` | Subscription, billing, usage stats. |

**Secondary routes (no nav slot):**
- `/ask/[sessionId]` — Active or past ask session
- `/profiles/new`, `/profiles/[id]`, `/profiles/[id]/edit`
- `/compatibility/new`, `/compatibility/[id]`
- `/consultation/new`, `/consultation/[id]`
- `/admin` — Admin workspace (completely separate, own nav)

After sign-in, the user lands on `/ask`.

---

## 4. The Ask Flow

The Ask surface is a **guided intake** followed by a chat session. Each step builds context progressively before the first message is sent.

### Step 1: Who?
Profile chips — tap to select one or many. Multiple selection is supported and intentional (career, family dynamics, multi-person compatibility all involve 2+ profiles). As each profile is selected, chart data fetches silently in the background. By Step 4, data is ready.

### Step 2: What area?
Options shown depend on the number of profiles selected:

**1 profile:**
Career & Work · Relationships · Health · Family · Finance · Timing & Decisions · Transits & Current Period · Spirituality & Purpose · General

**2+ profiles:**
Compatibility · Business Partnership · Family Dynamics · Timing & Decisions · General

The selected life area is stored in the session record. It is research data as much as routing logic — over time this drives the admin analytics showing which areas users actually ask about.

### Step 3: Conditional configuration check
Shown only when: Compatibility is selected AND the selected profiles share the same gender configuration. Soft advisory, not a block:

> *"Traditional Ashtakuta analysis is designed for male-female pairs. Proceeding — ask the assistant to reframe any response that doesn't fit your context."*

No hard block. No assumptions about the user's situation.

### Step 4: Session opens
A one-line handoff before the input appears: *"[Name]'s chart is loaded. You're asking about career."*

The system prompt is assembled during the intake, not at question time, from:
1. Base system instructions (who the AI is, how it responds, tone)
2. Profile chart data — only the slice relevant to the chosen life area
3. Life area framing — engine selection, focus instructions
4. Auto-summary of the most recent prior session on these profiles + life area (if one exists, ~200 tokens, not full replay)

The user's first message lands in a fully primed context.

### Session limits
| Tier | Limit |
|---|---|
| Free | 3 messages per session. Always. Inline upgrade prompt at message 3, not a modal block. User can start new sessions but hits the same wall. |
| Paid | Monthly message cap (exact number: pricing decision). Soft warning at 80%. |
| Both | Soft cap at ~25 exchanges with prompt to start fresh. Long contexts degrade quality — this is honest and quality-preserving. |

### Ending a session
**"New conversation"** button always visible in the session header. On tap: session closes, saves to DB, summary generated asynchronously, user returns to intake. No data is lost. A session in History is complete and readable.

---

## 5. Charts as Reference Material

### Profiles (`/profiles`)
Card list. Create, edit, delete. Each card links to profile detail with the natal chart view. **No AI features on chart pages** — no insight cards, no regenerate buttons. Chat is the AI surface. One primary action per profile: **"Ask about [Name]"** — jumps to Ask with that profile pre-selected.

### Compatibility (`/compatibility`)
List of all compatibility checks. **"New check"** flow: select 2+ profiles, name the check, choose purpose (romantic, business, family, other). Each check links to the compatibility chart view. Same rule: no AI on chart pages. One primary action: **"Ask about this"** — jumps to Ask with these profiles pre-selected and Compatibility life area set.

### Chart tiers
| Tier | Access |
|---|---|
| Free | Core natal positions, dashas, key placements. Basic compatibility view. |
| Paid | Full professional view — all DashaflowView sections, Varga charts, deeper analysis. Full compatibility chart. |

Neither tier gets AI insight cards or regenerate on chart pages.

---

## 6. Session Persistence & History

Sessions are first-class DB entities, not React state. A session stores: `user_id`, `profile_ids[]`, `life_area`, `engine`, full `messages[]`, `summary`, `started_at`, `ended_at`, `message_count`, `total_tokens`, `cost_usd`.

### History (`/history`)
Chronological list. Each entry: profile(s), life area chip, first question snippet, date, message count. Click to read the full transcript (read-only). **"Ask again"** starts a new session — same profiles, same life area, auto-summary of this session injected as context.

### Context across time
Sessions are discrete. No resuming after a gap. When starting a new session with the same profiles and life area, the system retrieves or generates a digest of the most recent prior session and adds it silently to the system prompt. The user perceives continuity. The system sends ~200 tokens, not thousands.

---

## 7. Consultation

### User side
`/consultation/new`:
- Select profiles
- Describe the question and context (rich text, not one line)
- Choose focus area (same life areas taxonomy)
- Pay (per-session pricing, or included in a higher subscription tier — pricing decision deferred)
- Submit → confirmation with turnaround expectation
- Email notification on delivery

`/consultation/[id]`: Delivered report. Read-only, formatted as a document, not a chat transcript.

### Admin drafting workspace
Each pending consultation opens a two-panel screen inside `/admin`:

**Left panel:** User's profiles with full chart access, submitted question and context.

**Right panel:** Private AI chat — admin-AI dialogue only, never shown to the user. Admin iterates with the AI: pulls chart sections, asks follow-up questions, refines framing. This is the primary tool for developing the answer.

**Bottom:** Draft response area. Admin shapes the final report from the AI dialogue.

**"Publish"** delivers the report, notifies the user, closes the consultation. The full admin-AI dialogue is saved for admin reference. The user receives only the published report.

---

## 8. Admin Workspace — Researcher's Playground

A separate interface at `/admin` with its own sidebar nav. Closer to an internal tool than the consumer app. The admin is a researcher; this workspace reflects that.

### Sections

**Overview**
Live metrics: active users (today / 7d / 30d), sessions started, messages sent, consultations in queue, API cost today and month-to-date. At-a-glance health of the platform.

**Consultations**
Queue sorted by submission date. Status indicators (pending, in drafting, delivered). Each item opens the drafting workspace.

**Users**
Full user list: name, email, profiles count, sessions this month, messages used, subscription tier, last active date. Click any user for a per-user detail view with full session and usage history.

**Usage & Costs**
API call breakdown: by model, by endpoint, by life area. Cost trends over time. Identifies expensive patterns. Per-user cost visibility to spot outliers. This is the data that drives model and prompt decisions.

**Models**
LLM configuration per feature slot, editable without code changes:
- Ask (per life area — each life area can have its own model config)
- Consultation drafting
- Session summary generation

Each slot: model picker, temperature, max tokens.

**Prompts**
System prompt editor per life area and per feature. Each prompt has version history. Ability to test a prompt change in a sandbox before going live. This is where the research happens — refining how the AI frames and responds within each context.

**Settings**
Feature flags, subscription tier configuration, fee amounts, consultation turnaround SLA, free tier message limit, model fallback rules.

---

## 9. Feature Gating

**All limits are runtime-configurable from the admin Settings panel. Nothing is hardcoded.** Code reads from the `settings` table at request time and falls back to defaults only if a key is absent.

| Setting key | Default | Description |
|---|---|---|
| `free_profile_limit` | 3 | Max profiles on free tier |
| `free_messages_per_session` | 3 | Messages before upgrade prompt on free tier |
| `paid_messages_per_month` | 150 | Monthly message cap for paid tier |
| `session_soft_cap` | 25 | Messages before "start fresh" prompt (all tiers) |
| `consultation_turnaround_days` | 5 | Expected delivery window shown to user |
| `live_consultation_enabled` | false | Existing setting, carried over |
| `written_fee_paise` | 120000 | Existing setting, carried over |
| `live_fee_paise` | 500000 | Existing setting, carried over |

| Feature | Free | Paid |
|---|---|---|
| Profiles | Up to `free_profile_limit` | Unlimited |
| Natal chart | Basic view | Professional view |
| Compatibility chart | Basic view | Professional view |
| Ask sessions | Unlimited, `free_messages_per_session` each | Unlimited, `paid_messages_per_month`/month |
| AI insight cards | None | None (chat is the AI surface) |
| Regenerate on charts | None | None |
| Compatibility checks | Create + basic chart | Create + professional chart |
| History | Full access | Full access |
| Consultation | Pay per session | Pay per session |

---

## 10. Mobile UX Principles

**Bottom navigation bar** with 5 items. Ask gets a slightly elevated visual treatment — it is the primary action.

**Touch-first patterns:**
- Profile selection in intake: large tap targets, chip style with clear selected state
- Life area selection: large tappable cards with icon and label — not radio buttons
- Chat: input pinned to bottom, standard mobile chat layout, messages scroll above
- Chart sections: collapsible accordions, not a 17-section scroll wall
- Compatibility chart: horizontally scrollable where layout requires it

**Thumb zone awareness:** Primary actions (Ask, send message, select profile) within easy thumb reach. Destructive actions (delete profile) behind a confirm step, placed away from primary action areas.

---

## 11. Data Model — New and Changed Tables

### New tables

```sql
sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_ids TEXT NOT NULL,        -- JSON array
  life_area TEXT NOT NULL,
  engine TEXT NOT NULL,
  messages TEXT NOT NULL,           -- JSON array
  summary TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  message_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0
)

subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL,               -- 'free' | 'paid'
  status TEXT NOT NULL,             -- 'active' | 'cancelled' | 'expired'
  period_start TEXT,
  period_end TEXT,
  messages_used INTEGER DEFAULT 0,
  messages_cap INTEGER,
  period_reset_at TEXT
)

usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_id TEXT,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  created_at TEXT NOT NULL
)

prompt_templates (
  id TEXT PRIMARY KEY,
  feature_key TEXT NOT NULL,        -- e.g. 'ask:career', 'consultation:draft'
  prompt_text TEXT NOT NULL,
  model TEXT NOT NULL,
  temperature REAL NOT NULL,
  max_tokens INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
)
```

### Modified tables
- `users` — add `subscription_id TEXT` FK
- `consultation_requests` — add `admin_dialogue TEXT` (JSON), `cost_usd REAL`, `published_at TEXT`
- `profiles` — add `guest_token TEXT` (nullable; mutually exclusive with `user_id`)
- `sessions` — add `guest_token TEXT` (nullable)
- `feedback` — add `session_id TEXT`, `consultation_id TEXT`, `feature TEXT`, `rating INTEGER`, `context TEXT` (JSON)

### New guest table
```sql
guest_tokens (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  claimed_by_user_id TEXT,
  claimed_at TEXT
)
```
Guest data is retained permanently — unclaimed sessions are research signal, not waste.

### Untouched tables
`profiles`, `compatibility_checks`, `readings`, `feedback`, `settings`, `consultation_slots` — stable, carried over as-is.

**Note on sessions vs compatibility_checks:** `compatibility_checks` is preserved as a distinct entity (it owns the compatibility chart artifact). A session involving 2+ profiles for a Compatibility life area references those profiles by ID independently — it does not replace the compatibility check record. The `/compatibility/[id]` route still renders from `compatibility_checks`. The session records the Q&A history around it.

---

## 12. Code Organisation (new repo)

```
app/
  (public)/
    page.tsx              # Landing
    pricing/page.tsx
  (auth)/
    auth/signin/page.tsx
  (app)/
    layout.tsx            # App shell with bottom nav
    ask/
      page.tsx            # Intake flow
      [sessionId]/page.tsx
    profiles/
      page.tsx
      new/page.tsx
      [id]/page.tsx
      [id]/edit/page.tsx
    compatibility/
      page.tsx
      new/page.tsx
      [id]/page.tsx
    history/page.tsx
    account/page.tsx
    consultation/
      new/page.tsx
      [id]/page.tsx
  admin/
    layout.tsx            # Admin shell with sidebar
    page.tsx              # Overview
    consultations/
    users/
    usage/
    models/
    prompts/
    settings/
  api/
    ... (existing API routes carried over and extended)

components/
  intake/                 # Guided Ask intake components
  chat/                   # Chat session UI
  charts/                 # Chart reference panels (carried from current repo)
  admin/                  # Admin workspace components
  ui/                     # shadcn/ui primitives

lib/
  db/                     # Carried over, new tables added
  engines/                # Carried over
  content/                # Carried over
  sessions/               # New: session builder, context assembly, summary generation
  subscriptions/          # New: tier checks, message counting
  auth.ts                 # Carried over
  sanitize.ts             # Carried over
  astro-utils.ts          # Carried over
```

---

## 13. Guest User Flow

Visitors who have not signed in can start an Ask session immediately from the landing page. This lowers the acquisition barrier significantly and is the primary conversion mechanism for Phase C organic traffic.

### How it works

**Landing page CTA:** "Ask a question" — no login required. Goes directly to the Ask intake.

**Step 1 for guests — profile creation, not selection:** Since the guest has no saved profiles, Step 1 of the intake becomes an inline profile creation form: name, date of birth, time of birth, place. The same form as `/profiles/new`, surfaced in the intake flow. They can add a second person if needed. Chart data fetches silently as they complete the form.

Steps 2–4 proceed identically to authenticated users.

**Guest session limits:** Same message limits as the free tier (admin-controlled). At the limit, the prompt shifts from "upgrade to continue" to *"Sign in to save [Name]'s profile and continue this conversation."* — a stronger hook because they've already invested in the profile data.

### Data storage

Guest profiles and sessions are stored in the DB against a `guest_token` — a UUID stored in an HttpOnly cookie with no expiry. There is no automatic deletion. Guest data is retained permanently: the admin is a researcher and unclaimed sessions are a valuable signal (what did guests ask? did they convert? which questions drove sign-up?).

**Tables:**
```sql
guest_tokens (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  claimed_by_user_id TEXT,     -- set on login; null = unclaimed
  claimed_at TEXT
)
```
`profiles` and `sessions` tables get a `guest_token TEXT` nullable column. A row has either `user_id` or `guest_token`, never both (after claiming).

### Claiming on login

When a guest signs in via Google OAuth, the NextAuth callback:
1. Checks for the `guest_token` cookie
2. Finds all profiles and sessions owned by that token
3. Atomically transfers ownership to the new/existing user account (`UPDATE ... SET user_id = ?, guest_token = NULL`)
4. Marks the token as claimed in `guest_tokens`
5. Clears the cookie

The user lands on `/ask` with their session history intact.

---

## 14. Feedback Collection

Feedback is collected throughout the app wherever a user has just experienced something worth rating. All feedback is stored with full context so the admin can filter, analyze, and improve prompts and models.

**Feedback schema additions:**
```sql
feedback (
  -- existing columns preserved +
  session_id TEXT,           -- which session (if applicable)
  consultation_id TEXT,      -- which consultation (if applicable)
  feature TEXT NOT NULL,     -- 'session_end' | 'message' | 'chart' | 'consultation' | 'compatibility'
  rating INTEGER,            -- 1–5 or null (thumbs = 1 or 5)
  comment TEXT,
  context TEXT               -- JSON: { life_area, profiles[], model, tokens }
)
```

**Collection points:**
- **After session ends** — "Was this conversation useful?" 1–5 stars + optional comment.
- **Per message** — Thumbs up/down on individual AI responses (stored with the message index and session context). Not shown by default; appears on hover/long-press.
- **After consultation delivered** — User rates the report 1–5 with optional comment. This is the most important signal.
- **On chart views** — "Is this accurate?" thumbs feedback on individual chart sections (free and paid).
- **On the compatibility chart** — Quick rating on the overall compatibility analysis.

Feedback is never mandatory and never blocks. It appears as a lightweight inline prompt that can be dismissed. The admin Usage & Costs view includes a Feedback panel showing ratings by feature, model, and life area.

---

## 15. Design System — Nightfall

The new app adopts the **Nightfall** design system in full. Tokens live in `Design System/tokens.css` and are the single source of truth for all visual decisions. Do not hardcode values that exist as tokens.

### Character

Dark-first, cinematic. The canvas is always a layered cosmic background (never flat black — use `.bg-cosmos`). Drama comes from type scale, glow, and breath — not motion or hue. Light moves; layout holds.

### Tokens (`tokens.css`)

| Category | Key tokens |
|---|---|
| Canvas | `--void`, `--night`, `--indigo`, `--violet-dk`, `--violet` |
| Primary accent | `--gold`, `--gold-l`, `--gold-h`, `--gold-d` — CTAs, marks, emphasis |
| Pro/Admin/AI | `--aurora`, `--aurora-l`, `--aurora-d` — paid features, admin, AI responses |
| Info | `--beam`, `--beam-l` — informational accents |
| Text | `--ink`, `--ink-d`, `--ink-m`, `--ink-l` |
| Surfaces | `--glass` (4% white), `--glass-2` (6%), `--glass-3` (10%) |
| Borders | `--line` (gold-tinted), `--line-s` (soft), `--line-aurora` |
| States | `--good`, `--warn`, `--bad` with matching `*-bg` variants |

### Typography

| Font | Token | Use |
|---|---|---|
| DM Serif Display | `--font-display` | Hero h1, all italic display. Italic is the default voice. |
| Inter | `--font-sans` | Body, buttons, labels, nav. Weights 300–800. |
| Tiro Telugu | `--font-telugu` | Telugu runs (optional, user-toggleable). |
| JetBrains Mono | `--font-mono` | Refs, coords, timezone strings, data labels. |

Signature move: **italic display headline + tracked-caps eyebrow** (`--tr-eyebrow: 0.40em`). The eyebrow tracking is load-bearing — do not change it.

### Cards

Two surface recipes, no third:
- `.ac-glass` — default card (4% white, 1px white-10 border, `--r-xl` radius)
- `.ac-glass-strong` — hero/popover (6% white, gold-tinted border, `--r-2xl`, `--shadow-lg`)

### Motion

Everything fades or drifts slowly. **Never bounces.**
- Hover: 240ms `--ease-out`, opacity + border colour only
- Chart wheel outer ring: 360s full rotation
- Star field: three parallax drift layers (240s / 380s / 520s)
- Hero reveals: 1200ms `--ease-cosmic` — ceremonial

### Logo

Three assets in `Design System/assets/`:
- `logo-cosmic-ac.svg` — primary mark with gradient + glow. Dark surfaces ≥ 32px.
- `logo-cosmic-ac-flat.svg` — `currentColor` flat version. Favicon, chips, inline.
- `logo-wordmark.svg` — mark + "Astro *Chaganti*" in DM Serif Display, italic surname in gold.

### Charts

South Indian layout is the default. The `chart-wheel.js` renderer handles it. North Indian diamond layout is not used.

### Language toggle

Telugu/English toggle (`తె / EN` pill). Default is English. Telugu uses `--font-telugu` and appears as small italics under English section headers. Toggle state stored per user in preferences.

### UI Kit references

Visual references for every surface live in `Design System/ui_kits/`:
- `app/` — dashboard, profile form, chart view, compatibility, consultation
- `console/` — admin panel
- `mobile/` — iOS frame mockup
- `marketing/` — landing page

These are reference implementations, not components to copy verbatim. Use them to understand intended visual weight and layout decisions.

### Integration approach

`tokens.css` is imported as the first stylesheet in the new app's root layout. All Tailwind / shadcn CSS custom property overrides map to Nightfall token values. When a token exists, use it — never write a raw hex value that duplicates a token.

---

## 16. Standards for the New Repo

- **CLAUDE.md** written fresh: new IA, new component conventions, session-first mental model.
- **Tests:** Session-level integration tests, intake flow tests, gating logic tests. Not just unit tests for individual components.
- **Documentation:** `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/BACKLOG.md` — same discipline, fresh content.
- **No personal brand copy** anywhere in UI strings, metadata, or documentation.
- **Tone:** Restrained, confident, researcher's register. No marketing superlatives. Citations are features.
- **Security:** Rate limiting is global from day one (Upstash Redis, not per-Lambda). Subscription checks happen server-side. Admin routes verified server-side against `ADMIN_EMAILS`.

---

## 17. Phase C Seeds (built into Phase B)

- `/pricing` exists and is shareable from day one
- URL structure is clean and linkable
- Session structure includes fields for future optional public sharing
- Scripture citations surface in AI responses via the existing content/ system
- Platform name is Astrochaganti — not tied to a person, ready to stand alone
