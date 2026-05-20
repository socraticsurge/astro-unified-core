# Navigation & Experience Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current browse-to-profile navigation with profile chips in the top bar, add a Today digest tab as the default landing, refactor Patterns and Time into sub-tabs, add a persistent context-aware Ask side panel, and wire everything through a new DashboardClient root shell.

**Architecture:** `app/dashboard/DashboardClient.tsx` becomes the root interactive shell, holding `activeProfileId` state and all chart-fetch state. It renders a new `NavBar` (logo + `ProfileNav` chips + settings) and `ProfileView` (7 tabs: Today, Chart, Planets, Houses, Patterns, Time, Compare). Switching profile chips replaces chart data inline — no page navigation. An `AskPanel` (shadcn Sheet) opens from any context-tagged trigger. The existing `/profiles/[id]` route stays as a deep-link entry point that redirects into the dashboard shell with the chip pre-selected.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Tabs, Sheet, DropdownMenu), Vitest + React Testing Library

---

## File map

| Status | File | Responsibility |
|---|---|---|
| Create | `components/profiles/ProfileChip.tsx` | Two-line pill chip (name + relationship) |
| Create | `components/profiles/__tests__/ProfileChip.test.tsx` | Tests for ProfileChip |
| Create | `components/profiles/ProfileNav.tsx` | Chip row + Ask button layout |
| Create | `components/profiles/__tests__/ProfileNav.test.tsx` | Tests for ProfileNav |
| Create | `components/panels/AskPanel.tsx` | Sliding side panel / bottom sheet |
| Create | `components/panels/__tests__/AskPanel.test.tsx` | Tests for AskPanel |
| Modify | `components/unified/tabs/PatternsTab.tsx` | Wrap existing content in 4 sub-tabs |
| Create | `components/unified/tabs/timeline/DashaRow.tsx` | Recursive expandable dasha row |
| Create | `components/unified/tabs/timeline/__tests__/DashaRow.test.tsx` | Tests for DashaRow |
| Create | `components/unified/tabs/timeline/DashaTimeline.tsx` | Accordion container for dasha drill-down |
| Modify | `components/unified/tabs/TimeTab.tsx` | Wrap existing content in 4 sub-tabs |
| Create | `components/tabs/TodayInsightCard.tsx` | Individual insight card with optional CTA |
| Create | `components/tabs/__tests__/TodayInsightCard.test.tsx` | Tests for TodayInsightCard |
| Create | `lib/insights.ts` | Rule-based insight generator |
| Create | `lib/__tests__/insights.test.ts` | Tests for insight generator |
| Create | `components/tabs/TodayTab.tsx` | Hero card + insight cards |
| Create | `components/tabs/CompareTab.tsx` | Compare shell (deferred internals) |
| Create | `components/profiles/ProfileView.tsx` | 7-tab shell |
| Modify | `components/NavBar.tsx` | Replace with chip-first nav |
| Create | `app/dashboard/DashboardClient.tsx` | Root client shell with active-profile state |
| Modify | `app/dashboard/page.tsx` | Server component — fetches profiles, renders DashboardClient |
| Modify | `app/profiles/[id]/page.tsx` | Redirect to /dashboard?profile=id |

---

## Task 0: Add navigation design tokens to globals.css

**Files:**
- Modify: `app/globals.css`

All hardcoded Tailwind color classes in the new navigation components (`bg-purple-600/20`, `border-purple-500/30`, `text-purple-300`, `bg-orange-400`, etc.) must be replaced with CSS variables defined here. This task must be completed before any component task starts. With these in place, the entire nav color scheme — chip highlight, Ask button, alert dot, Today hero, insight categories, Ask panel — can be changed for both themes from one file.

### Token groups to add

**Group 1 — Profile chip**
| Token | Purpose |
|---|---|
| `--color-nav-chip-active-bg` | Background of the active chip |
| `--color-nav-chip-active-border` | Border of the active chip |
| `--color-nav-chip-active-text` | Text of the active chip |

**Group 2 — Ask button**
| Token | Purpose |
|---|---|
| `--color-nav-ask-bg` | Ask button background |
| `--color-nav-ask-border` | Ask button border |
| `--color-nav-ask-text` | Ask button text |

**Group 3 — Alert dot**
| Token | Purpose |
|---|---|
| `--color-nav-alert` | Alert dot on chip (imminent event) |

**Group 4 — Today tab**
| Token | Purpose |
|---|---|
| `--color-today-hero-border` | Hero dasha card border |
| `--color-today-ask-cta-text` | "Ask an expert about your chart" button text |
| `--color-today-ask-cta-border` | That button's border |
| `--color-today-ask-cta-hover` | That button's hover background |

**Group 5 — Insight card category dots**
| Token | Purpose |
|---|---|
| `--color-insight-dasha` | Dot colour for dasha-category insights |
| `--color-insight-transit` | Dot colour for transit-category insights |
| `--color-insight-dosha` | Dot colour for dosha-category insights |
| `--color-insight-yoga` | Dot colour for yoga-category insights |

**Group 6 — Ask panel**
| Token | Purpose |
|---|---|
| `--color-ask-ctx-bg` | Context block background |
| `--color-ask-ctx-border` | Context block border |
| `--color-ask-ctx-name` | Profile name highlight colour in context block |
| `--color-ask-option-active-bg` | Selected topic option background |
| `--color-ask-option-active-border` | Selected topic option border |
| `--color-ask-option-active-text` | Selected topic option text |

---

- [ ] **Step 1: Add tokens to the `[data-theme="dark"]` block**

Insert the following block at the end of the `[data-theme="dark"]` section in `app/globals.css`, immediately before the closing `}` of that block:

```css
  /* ── Navigation — profile chips & Ask button ── */
  --color-nav-chip-active-bg:       #1e1a2e;
  --color-nav-chip-active-border:   rgba(168, 85, 247, 0.30);
  --color-nav-chip-active-text:     rgba(192, 132, 252, 1);
  --color-nav-ask-bg:               rgba(147, 51, 234, 0.18);
  --color-nav-ask-border:           rgba(168, 85, 247, 0.28);
  --color-nav-ask-text:             rgba(216, 180, 254, 1);
  --color-nav-alert:                rgba(251, 146, 60, 1);

  /* ── Today tab ── */
  --color-today-hero-border:        rgba(168, 85, 247, 0.18);
  --color-today-ask-cta-text:       rgba(192, 132, 252, 1);
  --color-today-ask-cta-border:     rgba(168, 85, 247, 0.18);
  --color-today-ask-cta-hover:      rgba(168, 85, 247, 0.10);

  /* ── Insight card category colours ── */
  --color-insight-dasha:            rgba(192, 132, 252, 1);
  --color-insight-transit:          rgba(56, 189, 248, 1);
  --color-insight-dosha:            rgba(249, 115, 22, 1);
  --color-insight-yoga:             rgba(251, 191, 36, 1);

  /* ── Ask panel ── */
  --color-ask-ctx-bg:               rgba(168, 85, 247, 0.10);
  --color-ask-ctx-border:           rgba(168, 85, 247, 0.20);
  --color-ask-ctx-name:             rgba(216, 180, 254, 1);
  --color-ask-option-active-bg:     rgba(168, 85, 247, 0.08);
  --color-ask-option-active-border: rgba(168, 85, 247, 0.35);
  --color-ask-option-active-text:   rgba(192, 132, 252, 1);
```

- [ ] **Step 2: Add tokens to the `[data-theme="light"]` block**

Insert the same set at the end of the `[data-theme="light"]` block, adjusted for the parchment/crimson aesthetic:

```css
  /* ── Navigation — profile chips & Ask button ── */
  --color-nav-chip-active-bg:       rgba(153, 27, 27, 0.06);
  --color-nav-chip-active-border:   rgba(153, 27, 27, 0.35);
  --color-nav-chip-active-text:     #7F1D1D;
  --color-nav-ask-bg:               rgba(153, 27, 27, 0.06);
  --color-nav-ask-border:           rgba(153, 27, 27, 0.25);
  --color-nav-ask-text:             #991B1B;
  --color-nav-alert:                #92400E;

  /* ── Today tab ── */
  --color-today-hero-border:        rgba(153, 27, 27, 0.18);
  --color-today-ask-cta-text:       #991B1B;
  --color-today-ask-cta-border:     rgba(153, 27, 27, 0.18);
  --color-today-ask-cta-hover:      rgba(153, 27, 27, 0.05);

  /* ── Insight card category colours ── */
  --color-insight-dasha:            #7C3AED;
  --color-insight-transit:          #0369A1;
  --color-insight-dosha:            #C2410C;
  --color-insight-yoga:             #92400E;

  /* ── Ask panel ── */
  --color-ask-ctx-bg:               rgba(153, 27, 27, 0.05);
  --color-ask-ctx-border:           rgba(153, 27, 27, 0.18);
  --color-ask-ctx-name:             #991B1B;
  --color-ask-option-active-bg:     rgba(153, 27, 27, 0.06);
  --color-ask-option-active-border: rgba(153, 27, 27, 0.30);
  --color-ask-option-active-text:   #7F1D1D;
```

- [ ] **Step 3: Verify both blocks have no syntax errors**

```bash
npx postcss app/globals.css --no-map 2>&1 | head -20
```

Expected: no errors (or just "no output plugin" warning — that is fine).

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat: add navigation design tokens to globals.css (both themes)"
```

---

### Token usage reference for all subsequent tasks

When writing component code in Tasks 1–15, replace every hardcoded color with the corresponding variable:

| Instead of this (hardcoded) | Use this (variable) |
|---|---|
| `bg-purple-600/20` | `bg-[var(--color-nav-ask-bg)]` |
| `border-purple-500/30` | `border-[var(--color-nav-ask-border)]` |
| `text-purple-300` / `text-purple-400` | `text-[var(--color-nav-ask-text)]` |
| `bg-[#1e1a2e]` or `bg-purple-900/30` (chip active bg) | `bg-[var(--color-nav-chip-active-bg)]` |
| `border-purple-500/30` (chip active border) | `border-[var(--color-nav-chip-active-border)]` |
| `text-purple-400` (chip active text) | `text-[var(--color-nav-chip-active-text)]` |
| `bg-orange-400` / `bg-orange-500` (alert dot) | `bg-[var(--color-nav-alert)]` |
| `border-purple-500/20` (Today hero card) | `border-[var(--color-today-hero-border)]` |
| `text-purple-400` (Today CTA button text) | `text-[var(--color-today-ask-cta-text)]` |
| `border-purple-500/20` (Today CTA button border) | `border-[var(--color-today-ask-cta-border)]` |
| `hover:bg-purple-500/10` (Today CTA button hover) | `hover:bg-[var(--color-today-ask-cta-hover)]` |
| `bg-purple-500/10` (Ask panel context block bg) | `bg-[var(--color-ask-ctx-bg)]` |
| `border-purple-500/20` (Ask panel context block border) | `border-[var(--color-ask-ctx-border)]` |
| `text-purple-300` (Ask panel profile name) | `text-[var(--color-ask-ctx-name)]` |
| Insight category colours in `generateInsights()` | Use `var(--color-insight-dasha)` etc. in the CSS; or keep as hex constants in `lib/insights.ts` since JS can't read CSS vars — these are fine as hex because they are passed as inline `style` props on the dot span |

> **Note on insight colours in `lib/insights.ts`:** The category colour hex values in the insight generator (`#c084fc`, `#38bdf8`, etc.) are intentionally duplicated from the CSS variables — they are passed as inline `style` props on the dot `<span>`, where CSS custom properties also work. Prefer `var(--color-insight-dasha)` etc. as the value in `generateInsights()` so the light theme colours apply automatically:
>
> ```typescript
> // lib/insights.ts — preferred
> const CATEGORY_COLORS = {
>   dasha:   'var(--color-insight-dasha)',
>   transit: 'var(--color-insight-transit)',
>   dosha:   'var(--color-insight-dosha)',
>   yoga:    'var(--color-insight-yoga)',
> }
> ```

---

## Pre-task: Verify sidecar dasha nesting

The Timeline accordion (Task 9) needs `dashas.timeline[n].antardashas[]` arrays — not just the flat timeline Mahadasha list. Verify before building.

- [ ] **Step 1: Search for nested antardasha data in the sidecar response**

```bash
grep -r "antardashas\|antardasha_list\|sub_periods" lib/engines/ app/api/readings/
```

- [ ] **Step 2: Interpret and decide**

If `antardashas` (or similar) is present on timeline entries: proceed with full accordion (Task 9 builds it).

If not: the Timeline sub-tab renders a fallback message "Drill-down coming in a future update" and Task 9 marks the accordion work as deferred. Do NOT block the rest of the plan.

- [ ] **Step 3: Record the finding as a code comment**

Add a `// SIDECAR NOTE:` comment at the top of `lib/engines/dashaflow.ts` (or wherever the sidecar fetch lives) noting whether the nested data is available and the date checked.

---

## Task 1: ProfileChip — two-line navigation chip

**Files:**
- Create: `components/profiles/ProfileChip.tsx`
- Test: `components/profiles/__tests__/ProfileChip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/profiles/__tests__/ProfileChip.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileChip } from '../ProfileChip'

describe('ProfileChip', () => {
  it('renders first name and relationship label', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={false} onClick={() => {}} />)
    expect(screen.getByText('Vinay')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('applies purple border when isActive is true', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={true} onClick={() => {}} />)
    expect(screen.getByRole('button').className).toMatch(/border-purple/)
  })

  it('shows alert dot when hasAlert is true', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={false} hasAlert onClick={() => {}} />)
    expect(screen.getByTestId('alert-dot')).toBeInTheDocument()
  })

  it('does not show alert dot when hasAlert is false', () => {
    render(<ProfileChip id="1" name="Vinay" relationship="You" isActive={false} onClick={() => {}} />)
    expect(screen.queryByTestId('alert-dot')).not.toBeInTheDocument()
  })

  it('calls onClick with the chip id when clicked', async () => {
    const onClick = vi.fn()
    render(<ProfileChip id="abc" name="Priya" relationship="Spouse" isActive={false} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('abc')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run components/profiles/__tests__/ProfileChip.test.tsx
```

Expected: FAIL — "Cannot find module '../ProfileChip'"

- [ ] **Step 3: Implement ProfileChip**

```typescript
// components/profiles/ProfileChip.tsx
"use client"
import { cn } from '@/lib/utils'

export interface ProfileChipProps {
  id: string
  name: string
  relationship: string
  isActive: boolean
  hasAlert?: boolean
  onClick: (id: string) => void
}

export function ProfileChip({ id, name, relationship, isActive, hasAlert, onClick }: ProfileChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        'relative flex flex-col items-center px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0',
        isActive
          ? 'bg-[var(--color-surface-active,#1e1a2e)] border-purple-500/30 text-purple-400'
          : 'bg-transparent border-[var(--color-border)] text-muted-foreground hover:border-purple-500/20 hover:text-[var(--color-ink-2)]'
      )}
    >
      {hasAlert && (
        <span
          data-testid="alert-dot"
          className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-orange-400"
        />
      )}
      <span className="text-[11px] font-bold leading-tight whitespace-nowrap">{name}</span>
      <span className="text-[9px] leading-tight opacity-60 whitespace-nowrap">{relationship}</span>
    </button>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run components/profiles/__tests__/ProfileChip.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add components/profiles/ProfileChip.tsx components/profiles/__tests__/ProfileChip.test.tsx
git commit -m "feat: add ProfileChip two-line nav chip"
```

---

## Task 2: ProfileNav — chip row with Ask button

**Files:**
- Create: `components/profiles/ProfileNav.tsx`
- Test: `components/profiles/__tests__/ProfileNav.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/profiles/__tests__/ProfileNav.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileNav } from '../ProfileNav'

const profiles = [
  { id: '1', name: 'Vinay Kumar', relationship: 'You' },
  { id: '2', name: 'Priya Kumar', relationship: 'Spouse' },
]

describe('ProfileNav', () => {
  it('renders first name of each profile', () => {
    render(<ProfileNav profiles={profiles} activeProfileId="1" onProfileChange={() => {}} onAskOpen={() => {}} />)
    expect(screen.getByText('Vinay')).toBeInTheDocument()
    expect(screen.getByText('Priya')).toBeInTheDocument()
  })

  it('renders the add profile link', () => {
    render(<ProfileNav profiles={profiles} activeProfileId="1" onProfileChange={() => {}} onAskOpen={() => {}} />)
    expect(screen.getByRole('link', { name: /add profile/i })).toHaveAttribute('href', '/profiles/new')
  })

  it('calls onAskOpen when Ask button is clicked', async () => {
    const onAskOpen = vi.fn()
    render(<ProfileNav profiles={profiles} activeProfileId="1" onProfileChange={() => {}} onAskOpen={onAskOpen} />)
    await userEvent.click(screen.getAllByRole('button').find(b => b.textContent?.includes('Ask'))!)
    expect(onAskOpen).toHaveBeenCalled()
  })

  it('calls onProfileChange with the clicked profile id', async () => {
    const onProfileChange = vi.fn()
    render(<ProfileNav profiles={profiles} activeProfileId="1" onProfileChange={onProfileChange} onAskOpen={() => {}} />)
    await userEvent.click(screen.getByText('Priya'))
    expect(onProfileChange).toHaveBeenCalledWith('2')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run components/profiles/__tests__/ProfileNav.test.tsx
```

Expected: FAIL — "Cannot find module '../ProfileNav'"

- [ ] **Step 3: Implement ProfileNav**

```typescript
// components/profiles/ProfileNav.tsx
"use client"
import Link from 'next/link'
import { ProfileChip } from './ProfileChip'

interface NavProfile {
  id: string
  name: string
  relationship: string | null
  hasAlert?: boolean
}

interface ProfileNavProps {
  profiles: NavProfile[]
  activeProfileId: string | null
  onProfileChange: (id: string) => void
  onAskOpen: () => void
}

export function ProfileNav({ profiles, activeProfileId, onProfileChange, onAskOpen }: ProfileNavProps) {
  return (
    <div className="flex items-center gap-2 min-w-0 flex-1">
      {/* Chip row — scrolls horizontally, never wraps */}
      <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {profiles.map(p => (
          <ProfileChip
            key={p.id}
            id={p.id}
            name={p.name.split(' ')[0]}
            relationship={p.relationship ?? 'Other'}
            isActive={p.id === activeProfileId}
            hasAlert={p.hasAlert}
            onClick={onProfileChange}
          />
        ))}
        <Link
          href="/profiles/new"
          aria-label="Add profile"
          className="flex-shrink-0 flex items-center justify-center w-9 h-[38px] rounded-lg border border-dashed border-[var(--color-border)] text-muted-foreground hover:border-purple-500/40 text-sm transition-colors"
        >
          +
        </Link>
      </div>

      {/* Ask button — pinned right, never scrolls */}
      <div className="flex-shrink-0 ml-1">
        <button
          type="button"
          onClick={onAskOpen}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-600/30 transition-colors whitespace-nowrap"
        >
          ✦ Ask an expert
        </button>
        <button
          type="button"
          onClick={onAskOpen}
          aria-label="Ask an expert"
          className="sm:hidden flex items-center px-2 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-medium"
        >
          Ask
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run components/profiles/__tests__/ProfileNav.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/profiles/ProfileNav.tsx components/profiles/__tests__/ProfileNav.test.tsx
git commit -m "feat: add ProfileNav chip row with Ask button"
```

---

## Task 3: AskPanel — context-aware side panel

**Files:**
- Create: `components/panels/AskPanel.tsx`
- Test: `components/panels/__tests__/AskPanel.test.tsx`

- [ ] **Step 1: Ensure shadcn Sheet is installed**

```bash
npx shadcn@latest add sheet
```

If already present in `components/ui/sheet.tsx`, skip.

- [ ] **Step 2: Write the failing test**

```typescript
// components/panels/__tests__/AskPanel.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AskPanel } from '../AskPanel'

const ctx = {
  profileName: 'Vinay',
  relationship: 'You',
  mahadasha: 'Sun',
  antardasha: 'Mars',
  tab: 'Today' as const,
}

describe('AskPanel', () => {
  it('does not render content when closed', () => {
    render(<AskPanel open={false} onClose={() => {}} context={ctx} />)
    expect(screen.queryByText('Ask an expert')).not.toBeInTheDocument()
  })

  it('shows profile name and dasha context when open', () => {
    render(<AskPanel open={true} onClose={() => {}} context={ctx} />)
    expect(screen.getByText(/Vinay/)).toBeInTheDocument()
    expect(screen.getByText(/Sun · Mars/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<AskPanel open={true} onClose={onClose} context={ctx} />)
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders all 4 topic options', () => {
    render(<AskPanel open={true} onClose={() => {}} context={ctx} />)
    expect(screen.getByLabelText(/career/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dasha transition/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/relationship/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/general/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run to verify it fails**

```bash
npx vitest run components/panels/__tests__/AskPanel.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Implement AskPanel**

```typescript
// components/panels/AskPanel.tsx
"use client"
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export interface AskContext {
  profileName: string
  relationship: string
  mahadasha: string
  antardasha: string
  tab: string
  insightTitle?: string
}

const TOPICS = [
  { id: 'career',     label: 'Career & professional timing' },
  { id: 'dasha',      label: 'Upcoming dasha transition' },
  { id: 'relationship', label: 'Relationship guidance' },
  { id: 'general',    label: 'General reading' },
] as const

type TopicId = typeof TOPICS[number]['id']

interface AskPanelProps {
  open: boolean
  onClose: () => void
  context: AskContext
}

export function AskPanel({ open, onClose, context }: AskPanelProps) {
  const defaultTopic: TopicId =
    context.tab === 'Compare' ? 'relationship' :
    context.tab === 'Time'    ? 'dasha'        :
    context.insightTitle?.toLowerCase().includes('career') ? 'career' :
    'general'

  const [topic, setTopic]   = useState<TopicId>(defaultTopic)
  const [notes, setNotes]   = useState('')

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-[var(--color-border)]">
          <SheetTitle className="text-base font-semibold">✦ Ask an expert</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Context block */}
          <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 px-4 py-3 text-xs space-y-1">
            <p className="text-[var(--color-ink-2)]">
              <span className="font-semibold text-purple-300">{context.profileName}</span>
              {' · '}{context.relationship}
            </p>
            <p className="text-muted-foreground">
              {context.mahadasha} · {context.antardasha} dasha
            </p>
            {context.insightTitle && (
              <p className="text-muted-foreground italic">Re: {context.insightTitle}</p>
            )}
          </div>

          {/* Topic picker */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--color-ink-2)]">What would you like to explore?</p>
            {TOPICS.map(t => (
              <label
                key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                style={{
                  borderColor: topic === t.id ? 'rgb(168 85 247 / 0.4)' : 'var(--color-border)',
                  background:  topic === t.id ? 'rgb(168 85 247 / 0.08)' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="topic"
                  value={t.id}
                  checked={topic === t.id}
                  onChange={() => setTopic(t.id)}
                  className="sr-only"
                  aria-label={t.label}
                />
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${topic === t.id ? 'border-purple-400 bg-purple-400' : 'border-muted-foreground'}`} />
                <span className={`text-xs ${topic === t.id ? 'text-purple-300' : 'text-muted-foreground'}`}>
                  {t.label}
                </span>
              </label>
            ))}
          </div>

          {/* Free text */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-ink-2)]">
              Anything specific on your mind? <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="e.g. I have a job offer decision coming up next month…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-ink-1)] placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[var(--color-border)]">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            Request consultation →
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 5: Run to verify it passes**

```bash
npx vitest run components/panels/__tests__/AskPanel.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 6: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add components/panels/AskPanel.tsx components/panels/__tests__/AskPanel.test.tsx
git commit -m "feat: add AskPanel context-aware side panel"
```

---

## Task 4: PatternsTab — wrap in 4 sub-tabs

**Files:**
- Modify: `components/unified/tabs/PatternsTab.tsx`

The current PatternsTab is one long scroll. This task wraps the four existing sections (Yogas, Doshas, Jaimini, Ashtakavarga) in a sub-tab bar. No section JSX changes — only wrapping.

- [ ] **Step 1: Add the Tabs import and sub-tab state at the top of PatternsTab**

Replace the current opening:

```typescript
// BEFORE (top of PatternsTab.tsx):
"use client";
import { SIGNS_ORDER } from "@/components/unified/types";
```

With:

```typescript
"use client";
import { useState } from "react";
import { SIGNS_ORDER } from "@/components/unified/types";
import { cn } from "@/lib/utils";

type PatternsSubTab = 'yogas' | 'doshas' | 'jaimini' | 'ashtakavarga';

const PATTERNS_TABS: { id: PatternsSubTab; label: string }[] = [
  { id: 'yogas',        label: 'Yogas' },
  { id: 'doshas',       label: 'Doshas' },
  { id: 'jaimini',      label: 'Jaimini' },
  { id: 'ashtakavarga', label: 'Ashtakavarga' },
];
```

- [ ] **Step 2: Add sub-tab state and wrap the return statement**

Replace the opening of the component function:

```typescript
// BEFORE:
export function PatternsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  // ... variable declarations ...

  return (
    <div className="space-y-8">
```

With:

```typescript
export function PatternsTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState<PatternsSubTab>('yogas');
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  // ... (all existing variable declarations stay unchanged) ...

  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div className="flex gap-1.5 mb-5">
        {PATTERNS_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-3 py-1 rounded text-[11px] border transition-colors',
              activeTab === t.id
                ? 'text-[var(--color-ink-1)] border-[var(--color-border-strong,#2a2a3e)] bg-[var(--color-surface-2)]'
                : 'text-muted-foreground border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong,#2a2a3e)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels — show only active sub-tab */}
      {activeTab === 'yogas' && (
        <section>
          {/* existing Yogas JSX — no changes */}
```

- [ ] **Step 3: Close the sub-tab panels and the outer div**

After the existing Ashtakavarga `</section>`, add the closing tags:

```typescript
      )}
    </div>   // closes outer space-y-0 div
  );
```

Each of the four existing `<section>` blocks gets wrapped in `{activeTab === '<id>' && ( ... )}`. The full structure is:

```
<div className="space-y-0">
  {/* sub-tab bar */}
  {activeTab === 'yogas' && (<section>…Yogas JSX…</section>)}
  {activeTab === 'doshas' && (<section>…Doshas JSX…</section>)}
  {activeTab === 'jaimini' && (<section>…Jaimini JSX…</section>)}
  {activeTab === 'ashtakavarga' && (<section>…Ashtakavarga JSX…</section>)}
</div>
```

- [ ] **Step 4: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 5: Smoke test visually**

Start dev server and open a profile in Full Chart → Patterns. Confirm sub-tab bar shows 4 tabs. Click each — only the matching content renders.

```bash
npm run dev
```

- [ ] **Step 6: Commit**

```bash
git add components/unified/tabs/PatternsTab.tsx
git commit -m "feat: wrap PatternsTab in 4 sub-tabs (Yogas / Doshas / Jaimini / Ashtakavarga)"
```

---

## Task 5: DashaRow — expandable accordion row

**Files:**
- Create: `components/unified/tabs/timeline/DashaRow.tsx`
- Test: `components/unified/tabs/timeline/__tests__/DashaRow.test.tsx`

> **Note:** If the Pre-task check found that the sidecar does not return nested antardasha arrays, stub this component with a placeholder and skip to Task 6.

- [ ] **Step 1: Write the failing test**

```typescript
// components/unified/tabs/timeline/__tests__/DashaRow.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashaRow } from '../DashaRow'

const mahaEntry = {
  planet: 'Sun',
  start: '2020-04-15',
  end: '2026-04-15',
  isCurrentPeriod: false,
  antardashas: [
    { planet: 'Moon', start: '2020-04-15', end: '2021-04-15', isCurrentPeriod: true, pratyantardashas: [] },
    { planet: 'Mars', start: '2021-04-15', end: '2022-04-15', isCurrentPeriod: false, pratyantardashas: [] },
  ],
}

describe('DashaRow', () => {
  it('renders planet name and date range', () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={false} />)
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText(/2020/)).toBeInTheDocument()
  })

  it('does not show child rows when collapsed', () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={false} />)
    expect(screen.queryByText('Moon')).not.toBeInTheDocument()
  })

  it('shows child rows when expanded', async () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={false} />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Moon')).toBeInTheDocument()
    expect(screen.getByText('Mars')).toBeInTheDocument()
  })

  it('shows "● now" badge on current period rows', () => {
    render(<DashaRow entry={mahaEntry} level={0} defaultExpanded={true} />)
    expect(screen.getByText('● now')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run components/unified/tabs/timeline/__tests__/DashaRow.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement DashaRow**

```typescript
// components/unified/tabs/timeline/DashaRow.tsx
"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

export interface DashaPeriodEntry {
  planet: string
  start: string
  end: string
  isCurrentPeriod: boolean
  antardashas?: DashaPeriodEntry[]
  pratyantardashas?: DashaPeriodEntry[]
  sukshmadhashas?: DashaPeriodEntry[]
  pranadashas?: DashaPeriodEntry[]
}

// Text treatment by nesting level (0=Maha, 1=Antar, 2=Pratyantar, 3=Sukshma, 4=Prana)
const LEVEL_STYLES = [
  'text-[var(--color-ink-1)] font-bold text-[13px]',
  'text-[var(--color-ink-2)] text-[12px]',
  'text-muted-foreground text-[11px]',
  'text-muted-foreground text-[10px]',
  'text-muted-foreground text-[10px]',
]

function getChildren(entry: DashaPeriodEntry): DashaPeriodEntry[] {
  return entry.antardashas
    ?? entry.pratyantardashas
    ?? entry.sukshmadhashas
    ?? entry.pranadashas
    ?? []
}

interface DashaRowProps {
  entry: DashaPeriodEntry
  level: number
  defaultExpanded?: boolean
}

export function DashaRow({ entry, level, defaultExpanded = false }: DashaRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const children = getChildren(entry)
  const hasChildren = children.length > 0
  const indent = level * 16

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(e => !e)}
        className={cn(
          'w-full flex items-center gap-2 py-1.5 px-2 rounded text-left hover:bg-[var(--color-surface-1)] transition-colors',
          entry.isCurrentPeriod ? 'text-[var(--color-accent)]' : LEVEL_STYLES[Math.min(level, 4)]
        )}
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {hasChildren && (
          <ChevronRight
            className={cn('w-3 h-3 flex-shrink-0 transition-transform', expanded && 'rotate-90')}
          />
        )}
        {!hasChildren && <span className="w-3 flex-shrink-0" />}

        <span className="font-semibold w-20 flex-shrink-0">{entry.planet}</span>
        <span className="text-muted-foreground text-[10px]">{entry.start} → {entry.end}</span>
        {entry.isCurrentPeriod && (
          <span className="ml-auto text-[var(--color-accent)] text-[10px] font-bold">● now</span>
        )}
      </button>

      {expanded && children.map((child, i) => (
        <DashaRow
          key={`${child.planet}-${i}`}
          entry={child}
          level={level + 1}
          defaultExpanded={child.isCurrentPeriod}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run components/unified/tabs/timeline/__tests__/DashaRow.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/unified/tabs/timeline/DashaRow.tsx components/unified/tabs/timeline/__tests__/DashaRow.test.tsx
git commit -m "feat: add DashaRow expandable accordion component"
```

---

## Task 6: DashaTimeline — accordion container

**Files:**
- Create: `components/unified/tabs/timeline/DashaTimeline.tsx`

- [ ] **Step 1: Implement DashaTimeline**

No separate test needed — behaviour is tested through DashaRow. This is a thin container.

```typescript
// components/unified/tabs/timeline/DashaTimeline.tsx
"use client"
import { DashaRow, DashaPeriodEntry } from './DashaRow'

interface DashaTimelineProps {
  timeline: DashaPeriodEntry[]
  currentMahaDasha: string
}

export function DashaTimeline({ timeline, currentMahaDasha }: DashaTimelineProps) {
  if (timeline.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Timeline data not available.
      </p>
    )
  }

  // If sidecar doesn't return nested antardasha arrays (Pre-task check), show fallback
  const hasNesting = timeline.some(e => (e.antardashas?.length ?? 0) > 0)

  if (!hasNesting) {
    return (
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground mb-3">
          Antardasha drill-down not yet available from the chart engine.
        </p>
        {timeline.map((entry, i) => (
          <DashaRow
            key={`${entry.planet}-${i}`}
            entry={entry}
            level={0}
            defaultExpanded={false}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {timeline.map((entry, i) => (
        <DashaRow
          key={`${entry.planet}-${i}`}
          entry={entry}
          level={0}
          defaultExpanded={entry.planet === currentMahaDasha}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/unified/tabs/timeline/DashaTimeline.tsx
git commit -m "feat: add DashaTimeline accordion container"
```

---

## Task 7: TimeTab — wrap in 4 sub-tabs

**Files:**
- Modify: `components/unified/tabs/TimeTab.tsx`

The current TimeTab has four sections in one scroll: Current Dasha Stack, Mahadasha Timeline, Transits, Career. This task wraps them in sub-tabs. The section JSX is unchanged except the Timeline section now uses `DashaTimeline`.

- [ ] **Step 1: Add imports and sub-tab state**

Add to the top of `TimeTab.tsx` after the existing imports:

```typescript
import { useState } from "react";  // add if not present — useEffect already imported, add useState
import { cn } from "@/lib/utils";
import { DashaTimeline } from "@/components/unified/tabs/timeline/DashaTimeline";
import type { DashaPeriodEntry } from "@/components/unified/tabs/timeline/DashaRow";

type TimeSubTab = 'current' | 'timeline' | 'transits' | 'career';

const TIME_TABS: { id: TimeSubTab; label: string }[] = [
  { id: 'current',  label: 'Current Period' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'transits', label: 'Transits' },
  { id: 'career',   label: 'Career' },
];
```

- [ ] **Step 2: Add sub-tab state inside the component function**

Inside `TimeTab`, after the existing `const data = ...` line, add:

```typescript
const [activeTab, setActiveTab] = useState<TimeSubTab>('current');
```

- [ ] **Step 3: Replace the return statement**

Replace the existing `return (` block with the sub-tab shell:

```typescript
  return (
    <div className="space-y-0">
      {/* Sub-tab bar */}
      <div className="flex gap-1.5 mb-5">
        {TIME_TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-3 py-1 rounded text-[11px] border transition-colors',
              activeTab === t.id
                ? 'text-[var(--color-ink-1)] border-[var(--color-border-strong,#2a2a3e)] bg-[var(--color-surface-2)]'
                : 'text-muted-foreground border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong,#2a2a3e)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Current Period sub-tab */}
      {activeTab === 'current' && dashas && (
        <section>
          <div className="space-y-1">
            {DASHA_LEVELS.map(({ key, label }, depth) => {
              const d = dashas[key];
              if (!d) return null;
              return (
                <div
                  key={key}
                  style={{ paddingLeft: `${depth * 16}px` }}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]"
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-20">{label}</span>
                  <span className="font-semibold text-sm text-[var(--color-ink-1)] w-20">{d.planet}</span>
                  <span className="text-xs text-muted-foreground">{d.start} → {d.end}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Timeline sub-tab */}
      {activeTab === 'timeline' && (
        <section>
          <DashaTimeline
            timeline={(dashas?.timeline as DashaPeriodEntry[] | undefined) ?? []}
            currentMahaDasha={dashas?.maha?.planet ?? ''}
          />
        </section>
      )}

      {/* Transits sub-tab */}
      {activeTab === 'transits' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Transits
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFetchTransit(true)}
              disabled={isTransitLoading}
              className="h-6 text-xs gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${isTransitLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {isTransitLoading && <p className="text-xs text-muted-foreground">Loading transits…</p>}

          {transit && (
            <>
              {sadeSati?.active && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 text-xs">
                  Sade Sati active · {sadeSati.phase} phase
                </div>
              )}
              {rahuKetu && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)] text-xs flex gap-6">
                  <span>Rahu: {rahuKetu.rahu_sign} (H{rahuKetu.rahu_house_from_lagna})</span>
                  <span>Ketu: {rahuKetu.ketu_sign} (H{rahuKetu.ketu_house_from_lagna})</span>
                </div>
              )}
              {transitPlanets && (
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border)]">
                        {["Planet", "Transit Sign", "H/Lagna", "H/Moon", "SAV"].map(h => (
                          <th key={h} className="text-left py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PLANET_ORDER.map(name => {
                        const t = transitPlanets[name];
                        if (!t) return null;
                        const savVal = t.sav_points ?? 0;
                        return (
                          <tr key={name} className="border-b border-[var(--color-border)]/40">
                            <td className="py-1.5 px-2 font-semibold text-[var(--color-ink-1)]">
                              {name}{t.is_retrograde && <span className="ml-1 text-orange-400 text-[10px]">℞</span>}
                            </td>
                            <td className="py-1.5 px-2 text-[var(--color-ink-2)]">{t.sign}</td>
                            <td className="py-1.5 px-2 text-center text-muted-foreground">{t.house_from_lagna}</td>
                            <td className="py-1.5 px-2 text-center text-muted-foreground">{t.house_from_moon}</td>
                            <td className={`py-1.5 px-2 text-center font-bold font-mono ${savVal >= 30 ? "text-emerald-400" : savVal <= 22 ? "text-red-400" : "text-muted-foreground"}`}>
                              {savVal}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Career sub-tab */}
      {activeTab === 'career' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Career — D10 Dashamsha
            </h3>
            {!careerData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFetchCareer(true)}
                disabled={isCareerLoading}
                className="h-6 text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isCareerLoading ? "animate-spin" : ""}`} />
                Load
              </Button>
            )}
          </div>
          {isCareerLoading && <p className="text-xs text-muted-foreground">Loading career analysis…</p>}
          {careerData && (
            <div className="space-y-3">
              {careerData.tenth_house && (
                <div className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">10th House (Karma Bhava)</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>Sign: <strong className="text-[var(--color-ink-1)]">{careerData.tenth_house.sign}</strong></span>
                    <span>Lord: <strong className="text-sky-300">{careerData.tenth_house.lord}</strong></span>
                    <span>Lord&apos;s house: <strong className="text-[var(--color-ink-2)]">{careerData.tenth_house.lord_house}</strong></span>
                    <span>Lord&apos;s D10: <strong className="text-[var(--color-ink-2)]">{careerData.tenth_house.lord_d10 ?? "—"}</strong></span>
                  </div>
                </div>
              )}
              {careerData.career_themes && careerData.career_themes.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Career Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {careerData.career_themes.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs text-[var(--color-ink-2)]">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {careerData.strength_factors && careerData.strength_factors.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Indicators</p>
                  <ul className="space-y-0.5">
                    {careerData.strength_factors.map(f => (
                      <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="text-emerald-400 mt-0.5">·</span>{f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
```

- [ ] **Step 4: Remove the old useEffect that auto-fetches on mount** — it ran unconditionally; replace it with conditional fetches triggered when the relevant sub-tab is first opened:

Find and remove:

```typescript
  useEffect(() => {
    if (!transitOutput && !isTransitLoading) onFetchTransit();
    if (!careerOutput  && !isCareerLoading)  onFetchCareer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

Add this instead, after the `const [activeTab, ...]` line:

```typescript
  useEffect(() => {
    if (activeTab === 'transits' && !transitOutput && !isTransitLoading) onFetchTransit();
    if (activeTab === 'career'   && !careerOutput  && !isCareerLoading)  onFetchCareer();
  }, [activeTab]);   // eslint-disable-line react-hooks/exhaustive-deps
```

This defers fetches until the user actually opens those sub-tabs.

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 6: Smoke test**

Open Full Chart → Time tab. Confirm 4 sub-tabs appear. Current Period shows the dasha stack. Timeline shows the accordion (or fallback). Switching to Transits triggers the fetch. Career tab shows Load button then data.

- [ ] **Step 7: Commit**

```bash
git add components/unified/tabs/TimeTab.tsx
git commit -m "feat: wrap TimeTab in 4 sub-tabs; lazy-fetch transits and career"
```

---

## Task 8: TodayInsightCard component

**Files:**
- Create: `components/tabs/TodayInsightCard.tsx`
- Test: `components/tabs/__tests__/TodayInsightCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/tabs/__tests__/TodayInsightCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodayInsightCard } from '../TodayInsightCard'

const insight = {
  id: 'test-1',
  category: 'dasha' as const,
  categoryColor: '#c084fc',
  title: 'Jupiter in 10th — career expansion',
  body: 'Strong transit through 2025.',
  cta: { label: 'Ask an expert about this →', action: 'ask' as const },
}

describe('TodayInsightCard', () => {
  it('renders title and body', () => {
    render(<TodayInsightCard insight={insight} onAsk={() => {}} onExplore={() => {}} />)
    expect(screen.getByText('Jupiter in 10th — career expansion')).toBeInTheDocument()
    expect(screen.getByText('Strong transit through 2025.')).toBeInTheDocument()
  })

  it('renders the CTA when present', () => {
    render(<TodayInsightCard insight={insight} onAsk={() => {}} onExplore={() => {}} />)
    expect(screen.getByText('Ask an expert about this →')).toBeInTheDocument()
  })

  it('calls onAsk when ask CTA is clicked', async () => {
    const onAsk = vi.fn()
    render(<TodayInsightCard insight={insight} onAsk={onAsk} onExplore={() => {}} />)
    await userEvent.click(screen.getByText('Ask an expert about this →'))
    expect(onAsk).toHaveBeenCalledWith(insight)
  })

  it('renders without CTA when none provided', () => {
    render(<TodayInsightCard insight={{ ...insight, cta: undefined }} onAsk={() => {}} onExplore={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run components/tabs/__tests__/TodayInsightCard.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement TodayInsightCard**

```typescript
// components/tabs/TodayInsightCard.tsx
"use client"

export interface TodayInsight {
  id: string
  category: 'dasha' | 'transit' | 'dosha' | 'yoga'
  categoryColor: string
  title: string
  body: string
  cta?: {
    label: string
    action: 'ask' | 'explore'
  }
}

interface TodayInsightCardProps {
  insight: TodayInsight
  onAsk: (insight: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
}

export function TodayInsightCard({ insight, onAsk, onExplore }: TodayInsightCardProps) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)]">
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: insight.categoryColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-ink-1)] leading-snug">{insight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{insight.body}</p>
          {insight.cta && (
            <button
              type="button"
              onClick={() => insight.cta!.action === 'ask' ? onAsk(insight) : onExplore(insight)}
              className="mt-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              {insight.cta.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run components/tabs/__tests__/TodayInsightCard.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/tabs/TodayInsightCard.tsx components/tabs/__tests__/TodayInsightCard.test.tsx
git commit -m "feat: add TodayInsightCard component"
```

---

## Task 9: lib/insights.ts — rule-based insight generator

**Files:**
- Create: `lib/insights.ts`
- Test: `lib/__tests__/insights.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/__tests__/insights.test.ts
import { generateInsights } from '../insights'
import type { TodayInsight } from '@/components/tabs/TodayInsightCard'

const baseDashas = {
  maha:       { planet: 'Sun',  start: '2020-04-15', end: '2026-04-15' },
  antar:      { planet: 'Mars', start: '2025-09-01', end: '2026-01-15' },
  pratyantar: { planet: 'Rahu', start: '2025-12-01', end: '2026-01-01' },
}

describe('generateInsights', () => {
  it('returns an imminent-dasha insight when antardasha ends within 8 weeks', () => {
    const today = new Date('2025-12-01')
    const insights = generateInsights({ dashas: baseDashas }, null, today)
    const dashaInsight = insights.find(i => i.category === 'dasha')
    expect(dashaInsight).toBeDefined()
    expect(dashaInsight!.title).toMatch(/dasha|shift/i)
  })

  it('does not return dasha insight when antardasha end is far away', () => {
    const today = new Date('2025-09-02')  // antar ends 2026-01-15, ~19 weeks away
    const insights = generateInsights({ dashas: baseDashas }, null, today)
    expect(insights.find(i => i.category === 'dasha')).toBeUndefined()
  })

  it('returns sade sati insight when transit data says active', () => {
    const transitOutput = { data: { sade_sati: { active: true, phase: 'peak' } } }
    const insights = generateInsights({ dashas: baseDashas }, transitOutput, new Date('2025-09-02'))
    expect(insights.find(i => i.category === 'dosha')).toBeDefined()
  })

  it('returns kaal sarpa insight when present in chart', () => {
    const chartOutput = { data: { dashas: baseDashas, kaal_sarpa: { type: 'Vasuki' } } }
    const insights = generateInsights(chartOutput, null, new Date('2025-09-02'))
    expect(insights.find(i => i.category === 'dosha' && i.title.toLowerCase().includes('kaal'))).toBeDefined()
  })

  it('returns no more than 5 insights', () => {
    const chartOutput = { data: { dashas: baseDashas, kaal_sarpa: { type: 'Vasuki' }, yogas: [
      { name: 'Gajakesari' }, { name: 'Raj Yoga' }, { name: 'Hamsa' }, { name: 'Malavya' },
    ]}}
    const today = new Date('2025-12-01')
    const insights = generateInsights(chartOutput, null, today)
    expect(insights.length).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx vitest run lib/__tests__/insights.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement lib/insights.ts**

```typescript
// lib/insights.ts
import type { TodayInsight } from '@/components/tabs/TodayInsightCard'

type DashaInfo = { planet: string; start: string; end: string }
type ChartDashas = { maha: DashaInfo; antar: DashaInfo; pratyantar?: DashaInfo }

const CATEGORY_COLORS = {
  dasha:   '#c084fc',
  transit: '#38bdf8',
  dosha:   '#f97316',
  yoga:    '#fbbf24',
}

const WEEKS_8_MS = 8 * 7 * 24 * 60 * 60 * 1000

function weeksUntil(dateStr: string, from: Date): number {
  return (new Date(dateStr).getTime() - from.getTime()) / (7 * 24 * 60 * 60 * 1000)
}

export function generateInsights(
  chartOutput: Record<string, unknown> | null,
  transitOutput: Record<string, unknown> | null,
  today: Date = new Date()
): TodayInsight[] {
  const results: TodayInsight[] = []
  const data = (chartOutput?.data as Record<string, unknown> | undefined) ?? {}
  const dashas = data.dashas as ChartDashas | undefined
  const transit = ((transitOutput as Record<string, unknown> | null)?.data ?? transitOutput) as Record<string, unknown> | null

  // 1. Imminent antardasha transition (within 8 weeks)
  if (dashas?.antar?.end) {
    const weeksLeft = weeksUntil(dashas.antar.end, today)
    if (weeksLeft >= 0 && weeksLeft <= 8) {
      const weeksDisplay = Math.round(weeksLeft)
      results.push({
        id: 'dasha-transition',
        category: 'dasha',
        categoryColor: CATEGORY_COLORS.dasha,
        title: `${dashas.antar.planet} antardasha ends in ~${weeksDisplay} week${weeksDisplay === 1 ? '' : 's'}`,
        body: `A new antardasha period begins within the ${dashas.maha.planet} mahadasha. Transitions are important moments for reflection and intention.`,
        cta: { label: 'Ask an expert about this →', action: 'ask' },
      })
    }
  }

  // 2. Active Sade Sati
  const sadeSati = transit?.sade_sati as { active?: boolean; phase?: string } | undefined
  if (sadeSati?.active) {
    results.push({
      id: 'sade-sati',
      category: 'dosha',
      categoryColor: CATEGORY_COLORS.dosha,
      title: `Sade Sati active — ${sadeSati.phase ?? ''} phase`.trim(),
      body: 'Saturn transits the sign before, on, or after your natal Moon. A 7.5-year period of lessons, restructuring, and spiritual growth.',
      cta: { label: 'Ask an expert about this →', action: 'ask' },
    })
  }

  // 3. Kaal Sarpa in natal chart
  const kaalSarpa = data.kaal_sarpa as { type?: string } | undefined
  if (kaalSarpa?.type) {
    results.push({
      id: 'kaal-sarpa',
      category: 'dosha',
      categoryColor: CATEGORY_COLORS.dosha,
      title: `Kaal Sarpa Yoga — ${kaalSarpa.type}`,
      body: 'All planets are hemmed between Rahu and Ketu in your natal chart. A powerful karmic signature that amplifies focus and intensity.',
    })
  }

  // 4. Significant transits (Jupiter, Saturn in key houses from transit data)
  const transitPlanets = transit?.planets as Record<string, { house_from_lagna?: number; sign?: string }> | undefined
  if (transitPlanets) {
    const jupiter = transitPlanets['Jupiter']
    if (jupiter?.house_from_lagna && [1, 5, 9, 10, 11].includes(jupiter.house_from_lagna)) {
      results.push({
        id: 'jupiter-transit',
        category: 'transit',
        categoryColor: CATEGORY_COLORS.transit,
        title: `Jupiter transiting your ${jupiter.house_from_lagna}th house`,
        body: `Jupiter in ${jupiter.sign ?? 'transit'} brings expansion and opportunity to the matters of this house.`,
        cta: { label: 'Explore in Chart →', action: 'explore' },
      })
    }
  }

  // 5. Major yogas from natal chart (show up to 2, not repeated every session — shown always for now)
  type Yoga = { name: string }
  const MAJOR_YOGA_NAMES = new Set(['Malavya', 'Shasha', 'Bhadra', 'Hamsa', 'Ruchaka', 'Gajakesari', 'Raj Yoga'])
  const yogas = (data.yogas as Yoga[] | undefined) ?? []
  const majorYogas = yogas.filter(y => MAJOR_YOGA_NAMES.has(y.name)).slice(0, 2)
  for (const yoga of majorYogas) {
    if (results.length >= 5) break
    results.push({
      id: `yoga-${yoga.name}`,
      category: 'yoga',
      categoryColor: CATEGORY_COLORS.yoga,
      title: `${yoga.name} in your natal chart`,
      body: 'A significant planetary combination that shapes your life themes and natural strengths.',
    })
  }

  return results.slice(0, 5)
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npx vitest run lib/__tests__/insights.test.ts
```

Expected: PASS (5 tests)

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add lib/insights.ts lib/__tests__/insights.test.ts
git commit -m "feat: add rule-based insight generator for Today tab"
```

---

## Task 10: TodayTab — hero card + insight cards

**Files:**
- Create: `components/tabs/TodayTab.tsx`

- [ ] **Step 1: Implement TodayTab**

No unit test needed — this is a layout component that composes already-tested units.

```typescript
// components/tabs/TodayTab.tsx
"use client"
import { generateInsights } from '@/lib/insights'
import { TodayInsightCard, TodayInsight } from './TodayInsightCard'

interface TodayTabProps {
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  onAsk: (insight?: TodayInsight) => void
  onExplore: (insight: TodayInsight) => void
}

export function TodayTab({ chartOutput, transitOutput, onAsk, onExplore }: TodayTabProps) {
  const data    = chartOutput?.data as Record<string, unknown> | undefined
  const dashas  = data?.dashas as {
    maha?:  { planet?: string; start?: string; end?: string }
    antar?: { planet?: string; start?: string; end?: string }
  } | undefined

  const insights = chartOutput ? generateInsights(chartOutput, transitOutput) : []

  if (!chartOutput) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Loading your chart…</p>
      </div>
    )
  }

  const mahaPlanet  = dashas?.maha?.planet  ?? '—'
  const antarPlanet = dashas?.antar?.planet ?? '—'
  const antarEnd    = dashas?.antar?.end

  // Compute weeks to next shift for the hero pill
  let shiftPill: string | null = null
  if (antarEnd) {
    const weeksLeft = Math.round(
      (new Date(antarEnd).getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)
    )
    if (weeksLeft >= 0 && weeksLeft <= 8) {
      shiftPill = `Changes in ${weeksLeft} week${weeksLeft === 1 ? '' : 's'}`
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero card — current dasha */}
      <div className="p-4 rounded-xl border border-purple-500/20 bg-gradient-to-br from-[var(--color-surface-1)] to-[var(--color-surface-2)]">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current dasha period</p>
        <h2 className="text-lg font-bold text-[var(--color-ink-1)] leading-tight">
          {mahaPlanet} · {antarPlanet}
        </h2>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[10px]">
            {mahaPlanet} mahadasha
          </span>
          {shiftPill && (
            <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 text-orange-300 text-[10px]">
              ● {shiftPill}
            </span>
          )}
        </div>
      </div>

      {/* Insight cards */}
      {insights.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">What&apos;s active now</p>
          {insights.map(insight => (
            <TodayInsightCard
              key={insight.id}
              insight={insight}
              onAsk={i => onAsk(i)}
              onExplore={onExplore}
            />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No significant patterns active right now.</p>
      )}

      <button
        type="button"
        onClick={() => onAsk()}
        className="w-full py-2.5 rounded-lg border border-purple-500/20 text-purple-300 text-xs font-medium hover:bg-purple-500/10 transition-colors"
      >
        ✦ Ask an expert about your chart
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/tabs/TodayTab.tsx
git commit -m "feat: add TodayTab with hero dasha card and insight cards"
```

---

## Task 11: CompareTab shell

**Files:**
- Create: `components/tabs/CompareTab.tsx`

This is a placeholder. Full Compare design is deferred to its own spec.

- [ ] **Step 1: Implement CompareTab shell**

```typescript
// components/tabs/CompareTab.tsx
"use client"
import type { Profile } from '@/lib/db'
import Link from 'next/link'

interface CompareTabProps {
  activeProfile: Profile
  allProfiles: Profile[]
}

export function CompareTab({ activeProfile, allProfiles }: CompareTabProps) {
  const others = allProfiles.filter(p => p.id !== activeProfile.id)

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Compare {activeProfile.name.split(' ')[0]}&apos;s chart with another person.
      </p>

      {others.length === 0 ? (
        <div className="p-4 rounded-lg border border-dashed border-[var(--color-border)] text-center">
          <p className="text-xs text-muted-foreground mb-2">No other profiles yet.</p>
          <Link href="/profiles/new" className="text-xs text-purple-400 hover:text-purple-300">
            Add a profile to compare →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {others.map(p => (
            <Link
              key={p.id}
              href={`/compatibility/${activeProfile.id}?with=${p.id}`}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] hover:border-purple-500/30 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink-1)]">{p.name.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">{p.relationship ?? 'Other'}</p>
              </div>
              <span className="text-xs text-muted-foreground">View compatibility →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

> If `Profile` is not exported from `@/lib/db`, use the shape directly or adjust the import to match the actual export.

- [ ] **Step 3: Commit**

```bash
git add components/tabs/CompareTab.tsx
git commit -m "feat: add CompareTab shell (full design deferred)"
```

---

## Task 12: ProfileView — 7-tab shell

**Files:**
- Create: `components/profiles/ProfileView.tsx`

- [ ] **Step 1: Implement ProfileView**

```typescript
// components/profiles/ProfileView.tsx
"use client"
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/db'
import { TodayTab } from '@/components/tabs/TodayTab'
import { TodayInsight } from '@/components/tabs/TodayInsightCard'
import { CompareTab } from '@/components/tabs/CompareTab'
import { ChartTab }    from '@/components/unified/tabs/ChartTab'
import { PlanetsTab }  from '@/components/unified/tabs/PlanetsTab'
import { HousesVargasTab } from '@/components/unified/tabs/HousesVargasTab'
import { PatternsTab } from '@/components/unified/tabs/PatternsTab'
import { TimeTab }     from '@/components/unified/tabs/TimeTab'
import type { AskContext } from '@/components/panels/AskPanel'

type ChartTabId = 'today' | 'chart' | 'planets' | 'houses' | 'patterns' | 'time' | 'compare'

const CHART_TABS: { id: ChartTabId; label: string }[] = [
  { id: 'today',    label: '◎ Today' },
  { id: 'chart',    label: 'Chart' },
  { id: 'planets',  label: 'Planets' },
  { id: 'houses',   label: 'Houses' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'time',     label: 'Time' },
  { id: 'compare',  label: 'Compare' },
]

interface ProfileViewProps {
  profile: Profile
  allProfiles: Profile[]
  chartOutput: Record<string, unknown> | null
  transitOutput: Record<string, unknown> | null
  careerOutput: Record<string, unknown> | null
  isTransitLoading: boolean
  isCareerLoading: boolean
  onFetchTransit: (force?: boolean) => void
  onFetchCareer: (force?: boolean) => void
  onAskOpen: (context?: Partial<AskContext>) => void
  defaultTab?: ChartTabId
}

export function ProfileView({
  profile,
  allProfiles,
  chartOutput,
  transitOutput,
  careerOutput,
  isTransitLoading,
  isCareerLoading,
  onFetchTransit,
  onFetchCareer,
  onAskOpen,
  defaultTab = 'today',
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<ChartTabId>(defaultTab)

  const handleAskFromInsight = (insight?: TodayInsight) => {
    const data = chartOutput?.data as Record<string, unknown> | undefined
    const dashas = data?.dashas as { maha?: { planet?: string }; antar?: { planet?: string } } | undefined
    onAskOpen({
      tab: activeTab,
      insightTitle: insight?.title,
      mahadasha: dashas?.maha?.planet ?? '',
      antardasha: dashas?.antar?.planet ?? '',
    })
  }

  return (
    <div className="flex flex-col min-h-0">
      {/* Tab bar */}
      <div className="overflow-x-auto border-b border-[var(--color-border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max">
          {CHART_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-white text-[var(--color-ink-1)]'
                  : 'border-transparent text-muted-foreground hover:text-[var(--color-ink-2)]'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'today' && (
          <TodayTab
            chartOutput={chartOutput}
            transitOutput={transitOutput}
            onAsk={handleAskFromInsight}
            onExplore={() => setActiveTab('chart')}
          />
        )}
        {activeTab === 'chart' && chartOutput && (
          <ChartTab chartOutput={chartOutput} />
        )}
        {activeTab === 'planets' && chartOutput && (
          <PlanetsTab chartOutput={chartOutput} />
        )}
        {activeTab === 'houses' && chartOutput && (
          <HousesVargasTab chartOutput={chartOutput} />
        )}
        {activeTab === 'patterns' && chartOutput && (
          <PatternsTab chartOutput={chartOutput} />
        )}
        {activeTab === 'time' && chartOutput && (
          <TimeTab
            chartOutput={chartOutput}
            transitOutput={transitOutput}
            careerOutput={careerOutput}
            isTransitLoading={isTransitLoading}
            isCareerLoading={isCareerLoading}
            onFetchTransit={onFetchTransit}
            onFetchCareer={onFetchCareer}
          />
        )}
        {activeTab === 'compare' && (
          <CompareTab activeProfile={profile} allProfiles={allProfiles} />
        )}
        {!chartOutput && activeTab !== 'today' && activeTab !== 'compare' && (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">Loading chart data…</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

> **Import check:** The tab components `ChartTab`, `PlanetsTab`, `HousesVargasTab` are imported from `@/components/unified/tabs/`. Check the actual filenames in that directory and adjust imports if they differ (e.g., `ChartTab.tsx` vs `chart-tab.tsx`).

- [ ] **Step 2: Verify tab component imports exist**

```bash
ls components/unified/tabs/
```

Adjust import paths in ProfileView if filenames differ.

- [ ] **Step 3: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/profiles/ProfileView.tsx
git commit -m "feat: add ProfileView 7-tab shell"
```

---

## Task 13: NavBar replacement

**Files:**
- Modify: `components/NavBar.tsx`

Replace the current section-nav model with: logo | divider | ProfileNav | settings dropdown.

- [ ] **Step 1: Read the current NavBar before editing**

Re-read `components/NavBar.tsx` to have the current file in context (already read above — proceed if context is fresh).

- [ ] **Step 2: Replace NavBar.tsx**

```typescript
// components/NavBar.tsx
"use client"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Settings, ShieldCheck, LogOut } from "lucide-react"
import { fonts, motion } from "@/lib/typography"
import { ProfileNav } from "@/components/profiles/ProfileNav"
import { ThemeToggle } from "@/components/ThemeToggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { NavProfile } from "@/components/profiles/ProfileNav"

// ── Two-orbit logo SVG (unchanged) ─────────────────────────────────────────
function TwoOrbits({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="24" cy="24" rx="21" ry="7" transform="rotate(-8 24 24)"
        stroke="var(--color-accent-dim)" strokeWidth="1.4" fill="none"/>
      <ellipse cx="24" cy="24" rx="12" ry="19" transform="rotate(22 24 24)"
        stroke="var(--color-accent-faint)" strokeWidth="1.1" fill="none"/>
      <circle cx="13.5" cy="16" r="1.5" fill="var(--color-accent-dim)"/>
      <circle cx="34.5" cy="32" r="1.5" fill="var(--color-accent-dim)"/>
      <circle cx="24"   cy="24" r="2.6" fill="var(--color-accent)"/>
    </svg>
  )
}

const navGlassStyle: React.CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  boxShadow:            "inset 0 1.5px 0 var(--color-border-subtle), inset 0 -1px 0 var(--color-border-subtle)",
}

const wordmarkStyle: React.CSSProperties = {
  ...fonts.display,
  fontSize: "1.1rem",
  letterSpacing: "0.02em",
  lineHeight: 1,
}

interface NavBarProps {
  profiles?: NavProfile[]
  activeProfileId?: string | null
  onProfileChange?: (id: string) => void
  onAskOpen?: () => void
}

export function NavBar({ profiles = [], activeProfileId = null, onProfileChange, onAskOpen }: NavBarProps) {
  const { data: session, status } = useSession()
  const isLoggedIn  = status === "authenticated"
  const showAdmin   = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true

  return (
    <nav
      className="sticky top-0 z-40 border-b border-[var(--color-border)]"
      style={{ ...navGlassStyle, transition: `background ${motion.standard}` }}
    >
      <div className="w-full px-3 sm:px-5 py-2.5 flex items-center gap-3">

        {/* Logo */}
        <Link
          href={isLoggedIn ? "/dashboard" : "/"}
          className="flex items-center gap-2 shrink-0"
          aria-label="Home"
        >
          <TwoOrbits size={32} />
          <span style={wordmarkStyle} className="hidden sm:block">
            <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
            <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Chaganti</span>
          </span>
        </Link>

        {/* Divider */}
        {isLoggedIn && (
          <div className="h-6 w-px bg-[var(--color-border)] flex-shrink-0" />
        )}

        {/* Profile chips + Ask button */}
        {isLoggedIn && onProfileChange && onAskOpen && (
          <ProfileNav
            profiles={profiles}
            activeProfileId={activeProfileId}
            onProfileChange={onProfileChange}
            onAskOpen={onAskOpen}
          />
        )}

        {/* Right side: settings */}
        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  aria-label="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href="/settings">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <ThemeToggle asMenuItem />
                </DropdownMenuItem>
                {showAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth/signin"
              className="px-4 py-1.5 rounded-md text-sm font-medium border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-accent)]"
              style={fonts.uiMedium}
            >
              Sign In
            </Link>
          )}
        </div>

      </div>

      {/* Unauthenticated mobile — keep sign-in visible */}
      {!isLoggedIn && (
        <div className="sm:hidden border-t border-[var(--color-border)] px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <TwoOrbits size={24} />
            <span style={{ ...wordmarkStyle, fontSize: "0.95rem" }}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={{ fontStyle: "italic", color: "var(--color-accent)" }}>Chaganti</span>
            </span>
          </Link>
        </div>
      )}
    </nav>
  )
}
```

> **Note:** `ThemeToggle` is used inside a DropdownMenuItem. If `ThemeToggle` doesn't accept an `asMenuItem` prop, keep it as a standalone item outside the dropdown (render it as a `<DropdownMenuItem>` wrapping a `<ThemeToggle />`), or add the prop to `ThemeToggle`. Check `components/ThemeToggle.tsx` first.

> **shadcn DropdownMenu:** install if not present: `npx shadcn@latest add dropdown-menu`

- [ ] **Step 3: Ensure DropdownMenu is available**

```bash
ls components/ui/dropdown-menu.tsx 2>/dev/null || npx shadcn@latest add dropdown-menu
```

- [ ] **Step 4: Export NavProfile from ProfileNav**

In `components/profiles/ProfileNav.tsx`, add `export` to the `NavProfile` interface:

```typescript
export interface NavProfile {
  id: string
  name: string
  relationship: string | null
  hasAlert?: boolean
}
```

- [ ] **Step 5: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

Fix any ThemeToggle type errors before proceeding.

- [ ] **Step 6: Commit**

```bash
git add components/NavBar.tsx components/profiles/ProfileNav.tsx
git commit -m "feat: replace NavBar with chip-first profile navigation"
```

---

## Task 14: DashboardClient — root interactive shell

**Files:**
- Create: `app/dashboard/DashboardClient.tsx`

This component holds all interactive state: active profile, chart fetch state, ask panel open/close.

- [ ] **Step 1: Implement DashboardClient**

```typescript
// app/dashboard/DashboardClient.tsx
"use client"
import { useState, useEffect, useCallback } from "react"
import { NavBar } from "@/components/NavBar"
import { ProfileView } from "@/components/profiles/ProfileView"
import { AskPanel, AskContext } from "@/components/panels/AskPanel"
import type { Profile } from "@/lib/db"

interface DashboardClientProps {
  profiles: Profile[]
  initialProfileId?: string
}

type EngineState<T> = { data: T | null; loading: boolean; error: string | null }

function initState<T>(): EngineState<T> {
  return { data: null, loading: false, error: null }
}

export function DashboardClient({ profiles, initialProfileId }: DashboardClientProps) {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    initialProfileId ?? profiles[0]?.id ?? null
  )
  const [chart,   setChart]   = useState(initState<Record<string, unknown>>())
  const [transit, setTransit] = useState(initState<Record<string, unknown>>())
  const [career,  setCareer]  = useState(initState<Record<string, unknown>>())
  const [askOpen, setAskOpen]  = useState(false)
  const [askCtx,  setAskCtx]  = useState<Partial<AskContext>>({})

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? null

  // Fetch chart data whenever the active profile changes
  useEffect(() => {
    if (!activeProfileId) return
    setChart({ data: null, loading: true, error: null })
    setTransit(initState())
    setCareer(initState())

    fetch(`/api/readings/dashaflow?profileId=${activeProfileId}`)
      .then(r => r.json())
      .then(data => setChart({ data, loading: false, error: null }))
      .catch(e => setChart({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId])

  const fetchTransit = useCallback((force = false) => {
    if (!activeProfileId) return
    if (transit.data && !force) return
    setTransit(s => ({ ...s, loading: true }))

    fetch(`/api/readings/transit?profileId=${activeProfileId}`)
      .then(r => r.json())
      .then(data => setTransit({ data, loading: false, error: null }))
      .catch(e => setTransit({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId, transit.data])

  const fetchCareer = useCallback((force = false) => {
    if (!activeProfileId) return
    if (career.data && !force) return
    setCareer(s => ({ ...s, loading: true }))

    fetch(`/api/readings/career?profileId=${activeProfileId}`)
      .then(r => r.json())
      .then(data => setCareer({ data, loading: false, error: null }))
      .catch(e => setCareer({ data: null, loading: false, error: String(e) }))
  }, [activeProfileId, career.data])

  const handleAskOpen = useCallback((ctx?: Partial<AskContext>) => {
    const data = chart.data?.data as Record<string, unknown> | undefined
    const dashas = data?.dashas as { maha?: { planet?: string }; antar?: { planet?: string } } | undefined
    setAskCtx({
      profileName:  activeProfile?.name.split(' ')[0] ?? '',
      relationship: activeProfile?.relationship ?? 'Other',
      mahadasha:    dashas?.maha?.planet ?? '—',
      antardasha:   dashas?.antar?.planet ?? '—',
      tab:          'Today',
      ...ctx,
    })
    setAskOpen(true)
  }, [activeProfile, chart.data])

  // First-time user: no profiles
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-ink-1)]">Your cosmic story starts here</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            Enter your birth details — everything else flows from there.
          </p>
          <a
            href="/profiles/new"
            className="px-6 py-2.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Create your first profile
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <NavBar
        profiles={profiles.map(p => ({
          id: p.id,
          name: p.name,
          relationship: p.relationship,
        }))}
        activeProfileId={activeProfileId}
        onProfileChange={setActiveProfileId}
        onAskOpen={() => handleAskOpen()}
      />

      <div className="flex-1 overflow-hidden">
        {activeProfile ? (
          <ProfileView
            profile={activeProfile}
            allProfiles={profiles}
            chartOutput={chart.data}
            transitOutput={transit.data}
            careerOutput={career.data}
            isTransitLoading={transit.loading}
            isCareerLoading={career.loading}
            onFetchTransit={fetchTransit}
            onFetchCareer={fetchCareer}
            onAskOpen={handleAskOpen}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Select a profile above.</p>
          </div>
        )}
      </div>

      <AskPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        context={{
          profileName:  askCtx.profileName  ?? '',
          relationship: askCtx.relationship ?? 'Other',
          mahadasha:    askCtx.mahadasha    ?? '—',
          antardasha:   askCtx.antardasha   ?? '—',
          tab:          askCtx.tab          ?? 'Today',
          insightTitle: askCtx.insightTitle,
        }}
      />
    </div>
  )
}
```

> **API route check:** Verify the correct paths for the three fetch calls — `dashaflow`, `transit`, `career`. Check `app/api/readings/` to confirm route folder names and adjust if they differ.

- [ ] **Step 2: Check API routes**

```bash
ls app/api/readings/
```

Adjust the three `fetch()` paths in DashboardClient if the folder names differ.

- [ ] **Step 3: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/DashboardClient.tsx
git commit -m "feat: add DashboardClient root shell with active-profile state"
```

---

## Task 15: Dashboard page wiring + profile deep-link redirect

**Files:**
- Modify: `app/dashboard/page.tsx`
- Modify: `app/profiles/[id]/page.tsx`

- [ ] **Step 1: Update the dashboard server page**

Replace `app/dashboard/page.tsx` with:

```typescript
// app/dashboard/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/app/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { profile?: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId  = (session.user as { id: string }).id;
  const profiles = await db.profiles.list(userId);

  // Allow deep-linking a specific profile via ?profile=id
  const initialProfileId = searchParams?.profile
    ? profiles.find(p => p.id === searchParams.profile)?.id
    : undefined;

  return (
    <DashboardClient
      profiles={profiles}
      initialProfileId={initialProfileId}
    />
  );
}
```

- [ ] **Step 2: Update the profile deep-link page to redirect into the dashboard**

Read `app/profiles/[id]/page.tsx` first, then replace just the page default export logic so it redirects:

```typescript
// app/profiles/[id]/page.tsx  (add redirect at the top of the default export)
import { redirect } from "next/navigation";
// ... keep existing imports ...

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  // Redirect deep links into the dashboard shell with the profile chip pre-selected
  redirect(`/dashboard?profile=${params.id}`);
}
```

> If the profile page currently does significant server-side work (loading explainers, etc.) that is still needed, keep that logic but add the redirect as the last step, or move it into `DashboardClient` as a `useEffect` that pre-fetches on mount.

- [ ] **Step 3: Type check**

```bash
./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all pass

- [ ] **Step 5: Smoke test the full flow**

```bash
npm run dev
```

Check:
1. `/dashboard` with no profiles → shows "Your cosmic story starts here" blank state
2. `/dashboard` with one profile → chip in nav bar, Today tab loads, dasha hero card shows
3. `/dashboard` with multiple profiles → all chips visible, switching chips loads new profile data
4. Ask button → opens slide panel with context pre-filled
5. `/profiles/<id>` → redirects to `/dashboard?profile=<id>` with that chip active
6. Patterns tab → 4 sub-tabs, each section correct
7. Time tab → Current Period sub-tab shows dasha stack; Timeline shows accordion or fallback

- [ ] **Step 6: Update CHANGELOG.md**

Add a dated entry describing the navigation redesign.

- [ ] **Step 7: Final commit**

```bash
git add app/dashboard/page.tsx app/profiles/[id]/page.tsx CHANGELOG.md
git commit -m "feat: wire dashboard to DashboardClient; redirect /profiles/:id to chip-based nav"
```

---

## Self-review checklist

After completing all tasks, verify:

- [ ] `./node_modules/.bin/tsc --noEmit` — 0 errors
- [ ] `npx vitest run` — all tests pass
- [ ] No `public` Cache-Control on any auth-gated route
- [ ] No `isAdmin()` calls in client components
- [ ] `CHANGELOG.md` updated
- [ ] PR targets `development`, not `main`
