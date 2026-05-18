# Navigation & Experience Redesign Spec

**Date:** 2026-05-18  
**Status:** Approved for implementation planning  
**Replaces:** Current dashboard → profile → tab navigation model  
**Supersedes partially:** `2026-05-18-full-chart-redesign.md` — the Full Chart sub-tab and timeline decisions from that spec are absorbed here. This is the authoritative document.

---

## Goal

Replace the current "browse to a profile" navigation with a model where profiles *are* the navigation. Every feature — chart exploration, compatibility, consultation — lives inside the context of a person. No separate sections to navigate between. Return visits are driven by a personalized Today tab that surfaces what's changing for each person right now.

---

## Mental model shift

| Before | After |
|---|---|
| Dashboard → pick a profile → view chart | Profile chips in top bar → tap a person → their world opens |
| Compatibility is a separate section | Compare is a tab inside every profile |
| "Book a consultation" is a nav item | Ask an expert is a persistent global action, context-aware |
| Chart is the home | Today is the home; Chart is a tab you go to for depth |
| Features are destinations | Features are views within a person |

---

## 1. Global navigation shell

### Top bar (always visible)

```
[✦ AstroChaganti]  |  [Vinay · You]  [Priya · Spouse ●]  [Karan · Son]  [+]  ········  [✦ Ask an expert]  [⚙]
```

**Left region:** Logo, then a vertical divider, then profile chips.  
**Right region:** Ask an expert button, settings icon. These are pinned right and never scroll.

### Profile chips

Two-line design: first name (bold, 11px) on top, relationship label (muted, 9px) below. Pill shape, border-radius 8px.

**States:**
- **Active:** purple highlight (`bg-[var(--color-surface-active)]`, `border-purple-500/30`, purple text)
- **Inactive:** muted surface, grey text
- **Alert dot:** 6px orange dot at top-right of chip — visible when something significant is happening for that person (Sade Sati active, imminent dasha change, strong transit). Does not require opening the profile to notice.
- **Add:** dashed border, `+` only, same height as other chips

**Behaviour:**
- Tapping a chip switches the active profile. All content below — the chart tabs and their content — immediately reflects the new person. No page navigation.
- The active chip is always fully visible in the bar. If the bar is scrolled, activating a chip snaps it into view.
- On screens where all chips fit without scrolling, no overflow behaviour is needed. When chips overflow, the chip row scrolls horizontally. Ask an expert stays pinned and does not scroll.

**Relationship labels** are set during profile creation via a dropdown: You · Spouse / Partner · Son · Daughter · Mother · Father · Sibling · Other. Stored on the profile record. Used throughout the app wherever the person is referenced (Ask panel context, Compare panel heading, etc.).

**Desktop vs mobile:**
- Desktop (≥768px): full first name + relationship label. Chips sit in the top bar.
- Mobile (<768px): same chip design. Chip row scrolls horizontally within the bar. "Ask an expert" abbreviates to "Ask". Settings icon stays.

### Ask an expert button

Persistent in the top bar. Opens the Ask side panel (see §5).

Context capture rule: the Ask panel pre-fills based on whatever is currently in view —
- Active profile (always)
- Active chart tab (Today, Chart, Planets, etc.)
- If triggered from an insight card CTA, that specific insight is captured as the primary context
- If triggered cold from the global button, captures: active profile + current dasha period

### Settings (⚙)

Small icon button, top-right. Opens a dropdown containing: account settings, Sign out, and any admin links. Sign out is never in the primary nav — only here.

---

## 2. Profile view — chart tabs

When a profile chip is active, the area below the top bar shows that person's chart. A single horizontal tab bar provides 7 tabs:

```
Today  ·  Chart  ·  Planets  ·  Houses  ·  Patterns  ·  Time  ·  Compare
```

**Default tab on profile open:** Today — on first open. When switching between profiles via the chip bar, the active chart tab is preserved (if you're on Patterns for Vinay and tap Priya, you land on Patterns for Priya). This lets users scan the same domain across multiple people without resetting their position. Exception: if the preserved tab has no data for the new profile (e.g. Career sub-tab hasn't been loaded yet), it falls back to Today.

**Visual treatment:** underline-style tabs (border-bottom: 2px). Today has a subtle visual distinction from the data tabs — a small `◎` prefix or slightly different inactive colour — to signal it operates differently (digest vs. exploration). Exact treatment is a frontend decision; the intent is: Today should not feel like just another data tab.

**Tab bar on mobile:** scrollable horizontally. Font 9–10px, padding reduced. All 7 tabs remain present — no tabs are hidden on mobile.

---

## 3. Today tab

The default landing state for every profile. A personalized digest of what is active and changing for this person astrologically. This is the primary engagement surface — the reason to open the app regularly.

### Hero card

Displays the current dasha period as the dominant element:
- Mahadasha and Antardasha planet names, formatted as "Sun · Mars dasha"
- One sentence interpretation of this period (e.g. "Career and initiative are the themes right now")
- Two pills: active period label + time-to-next-shift (e.g. "Changes in 6 weeks") when within 8 weeks of an Antardasha change

### Insight cards

3–5 cards surfacing what is most significant for this person right now. Each card has:
- A coloured dot (category colour)
- Title (the insight, specific and named — not generic)
- One sentence body
- Optional contextual CTA: "Ask an expert about this →" or "Explore in Chart →" depending on relevance

**Insight sources (in priority order):**
1. Imminent dasha transitions (within 8 weeks)
2. Significant active transits (Jupiter, Saturn, Rahu/Ketu in key houses)
3. Active Sade Sati or Kaal Sarpa
4. Major yogas in the natal chart (shown once, on first few visits or periodically)

Insight cards are rule-based, not AI-generated. Each insight type has a defined trigger condition and a template sentence. This keeps them accurate and fast to render without a sidecar call.

### What Today does NOT contain

Raw tables, planet lists, full ashtakavarga grids, dasha timelines. Those live in the chart tabs. Today is the signal; the tabs are the data.

---

## 4. Chart tabs — Chart, Planets, Houses, Patterns, Time

### Chart, Planets, Houses

These three tabs carry over from the existing Full Chart implementation (`ChartTab`, `PlanetsTab`, `HousesVargasTab`) with no structural changes. The tab label "Houses & Vargas" is shortened to "Houses" in the tab bar for space.

### Patterns tab — sub-tabs

Replaces the current single-scroll layout with 4 sub-tabs. Sub-tabs use a smaller pill/chip style, visually quieter than the chart-level tabs to establish hierarchy.

| Sub-tab | Content |
|---|---|
| **Yogas** | Yoga cards — major yogas (amber highlight), minor yogas below |
| **Doshas** | Kaal Sarpa, Graha Yuddha, Gandanta |
| **Jaimini** | Karakas table, Karakamsha card, Arudha Padas grid, Upapada |
| **Ashtakavarga** | SAV sign-by-sign row, BAV planet grid |

Default sub-tab on load: Yogas.

### Time tab — sub-tabs

Replaces the current single-scroll layout with 4 sub-tabs.

| Sub-tab | Content |
|---|---|
| **Current Period** | 5-level indented dasha stack (Maha → Antar → Pratyantar → Sukshma → Prana). Read-only. Always reflects today. |
| **Timeline** | Accordion drill-down (see below) |
| **Transits** | Today's transit positions table, Sade Sati alert, Rahu/Ketu axis card, SAV scores per planet, Refresh button |
| **Career** | D10 analysis card, career themes tags, strength indicators list, Load button |

Default sub-tab on load: Current Period.

### Timeline accordion — drill-down behaviour

**Default state on load:**
- All 9 Mahadashas rendered as collapsed rows (planet name + date range)
- Active Mahadasha auto-expanded showing its 9 Antardashas
- Active Antardasha has a `● now` badge
- Levels 4–5 (Sukshma, Prana) only auto-expand if the parent Antardasha is currently active

**Interaction:**
- Click any Mahadasha row → toggles its Antardasha list. Only one Mahadasha open at a time.
- Click any Antardasha row → toggles its Pratyantar list (nested levels can all be open simultaneously within the expanded Mahadasha)
- Click Pratyantar → Sukshma; click Sukshma → Prana
- `● now` badge appears on the currently active row at each level

**Visual hierarchy — indentation and colour by level:**

| Level | Indent | Text treatment |
|---|---|---|
| Mahadasha (L1) | 0 | `text-[var(--color-ink-1)]`, bold, 13px |
| Antardasha (L2) | 16px | `text-[var(--color-ink-2)]`, 12px |
| Pratyantar (L3) | 32px | `text-muted-foreground`, 11px |
| Sukshma (L4) | 48px | `text-muted-foreground`, 10px |
| Prana (L5) | 64px | `text-muted-foreground`, 10px |

Active period at any level: `text-[var(--color-accent)]` + `● now` badge.

**Data prerequisite:** the accordion needs sub-period arrays for each Mahadasha entry — not just the flat `dashas.timeline` list (Mahadasha only) and `dashas.maha/antar/pratyantar/sukshma/prana` (current period only). Verify the sidecar returns `dashas.timeline[n].antardashas[]` etc. before building. If not, a sidecar change is required first.

---

## 5. Compare tab

Compare is the 7th chart tab. It surfaces compatibility between the active profile and any other profile in the user's account.

**Landing state:**
- Shows the active profile anchored on one side
- Lists other profiles to compare with (from the user's account)
- Selecting a second profile runs the existing compatibility engine and shows a result

**Result view (within the tab):**
- Overall score
- Category breakdown (emotional, career, values, timing — or whatever the compatibility engine returns)
- Brief interpretation sentence
- "Ask an expert about this compatibility →" CTA that opens the Ask panel with both people's names and the score pre-filled as context

**Known design gap:** the internal layout of the Compare tab result view is not fully designed. The existing compatibility detail page (`CompatibilityDetailClient`) is the fallback for full analysis — Compare tab shows the summary, with a link to the full report. Full Compare tab design is deferred to its own spec.

---

## 6. Ask side panel

Opens from: the global "Ask an expert" button, any "Ask an expert →" CTA in Today insight cards, and the Compare tab CTA.

**Panel structure:**
- Header: "Ask an expert" + close button
- Context block (auto-filled, not editable): who (profile name + relationship), what they were looking at, current dasha period. Displayed as a highlighted block so the user can confirm the context is right.
- Topic picker: 4 options (Career & professional timing · Upcoming dasha transition · Relationship guidance · General reading). Pre-selected based on what triggered the open if determinable.
- Free text field: optional, "Anything specific on your mind?"
- Submit button: "Request consultation →"

**On mobile:** renders as a bottom sheet (slides up from bottom edge) rather than a side panel. Same content.

**Context capture when triggered cold (global button):** active profile + relationship label + current Mahadasha + Antardasha + any active significant transit. No specific insight is highlighted.

---

## 7. Sub-tab visual system — hierarchy summary

Four levels, each visually quieter than the one above:

| Level | Component | Visual style |
|---|---|---|
| Profile chips | Who you're looking at | Pill, purple accent, two-line |
| Chart tabs | Which domain | Underline, 2px border-bottom, white active |
| Patterns / Time sub-tabs | Which section within domain | Small pill/chip, muted colours |
| (none planned beyond this) | — | — |

The rule: each level signals depth by being less visually prominent. You should never need to read a breadcrumb to know where you are — the visual weight of the tabs tells you.

---

## 8. First-time user experience

A user with no profiles sees the top bar with only the `+` chip and no chart tabs. The content area shows:

- A single centred prompt: "Your cosmic story starts here"
- One sentence explanation: "Enter your birth details — everything else flows from there"
- One CTA: "Create your first profile"

After creating the first profile:
- The chip appears in the top bar with their name + "You"
- The view opens directly to their Today tab
- A brief welcome moment runs once: 3 key facts from their chart (current dasha, one standout yoga, Lagna sign) with a "Explore your chart →" link below

The welcome moment is shown exactly once (tracked in localStorage or a user preference flag). Subsequent opens land on Today directly.

---

## 9. Files to create or modify

| File | Change |
|---|---|
| `components/NavBar.tsx` | Replace entirely with new global nav shell |
| `components/profiles/ProfileChip.tsx` | New — two-line chip component |
| `components/profiles/ProfileNav.tsx` | New — chip row + Ask button + settings |
| `components/profiles/ProfileView.tsx` | New — 7-tab shell, renders per active profile |
| `components/tabs/TodayTab.tsx` | New — digest view, hero + insight cards |
| `components/tabs/TodayInsightCard.tsx` | New — individual insight card with optional CTA |
| `components/panels/AskPanel.tsx` | New — side panel / bottom sheet |
| `components/unified/tabs/PatternsTab.tsx` | Modify — wrap in 4 sub-tabs |
| `components/unified/tabs/TimeTab.tsx` | Modify — wrap in 4 sub-tabs |
| `components/unified/tabs/timeline/DashaTimeline.tsx` | New — accordion container |
| `components/unified/tabs/timeline/DashaRow.tsx` | New — recursive expandable row |
| `components/tabs/CompareTab.tsx` | New — shell only; full design deferred |
| `app/profiles/[id]/ProfileDetailClient.tsx` | Modify — wire into ProfileView shell |
| `app/profiles/[id]/page.tsx` | Modify — may become redundant if routing shifts to chip-based state |
| `app/dashboard/page.tsx` | Modify or retire — dashboard may become the ProfileView landing |

---

## 10. Out of scope

- Cross-profile family feed (shows significant events across all profiles simultaneously) — deferred
- URL routing per profile chip or chart tab (bookmarkable deep links) — deferred  
- Full Compare tab internal design — deferred, own spec
- AI-generated Today insights — Today is rule-based only; AI insights remain in the Professional view
- Numerology, daily horoscopes, Muhurtha as profile tabs — architecture supports them as future tabs; not in this spec
- Any changes to sidecar engines, API routes, or DB schema beyond what the accordion data prerequisite requires
- Mobile-specific layout beyond chip scrolling and Ask panel as bottom sheet
