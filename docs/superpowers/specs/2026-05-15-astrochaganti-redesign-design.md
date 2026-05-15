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

## 13. Design System

The new app is built to consume a design system being developed in parallel in Claude Design. The implementation approach handles partial availability gracefully:

- All visual tokens (color, typography, spacing, radius, shadow) are expressed as CSS custom properties — not hardcoded Tailwind values. shadcn/ui already follows this pattern. Swapping the design system means updating one token file, not hunting through components.
- The initial scaffold uses a provisional token set derived from the current app's palette (amber/zinc dark theme) as a placeholder. When design system tokens are available, they replace the provisional set in a single file.
- Component structure is built to match design system component boundaries. When the design system ships a component, it replaces the provisional implementation without touching the pages that consume it.
- The design system is the source of truth for visual decisions. If a design system token or component exists, use it — do not improvise around it.

Design system assets (Figma, token files, component specs) are provided by the user as they become available. The implementation plan will flag which components to scaffold provisionally and which to hold until the design system is ready.

---

## 14. Standards for the New Repo

- **CLAUDE.md** written fresh: new IA, new component conventions, session-first mental model.
- **Tests:** Session-level integration tests, intake flow tests, gating logic tests. Not just unit tests for individual components.
- **Documentation:** `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/BACKLOG.md` — same discipline, fresh content.
- **No personal brand copy** anywhere in UI strings, metadata, or documentation.
- **Tone:** Restrained, confident, researcher's register. No marketing superlatives. Citations are features.
- **Security:** Rate limiting is global from day one (Upstash Redis, not per-Lambda). Subscription checks happen server-side. Admin routes verified server-side against `ADMIN_EMAILS`.

---

## 14. Phase C Seeds (built into Phase B)

- `/pricing` exists and is shareable from day one
- URL structure is clean and linkable
- Session structure includes fields for future optional public sharing
- Scripture citations surface in AI responses via the existing content/ system
- Platform name is Astrochaganti — not tied to a person, ready to stand alone
