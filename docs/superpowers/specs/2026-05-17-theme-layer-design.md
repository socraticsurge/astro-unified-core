# Theme Layer Design
**Date:** 2026-05-17  
**Status:** Approved  
**Scope:** Full — infrastructure + complete component migration

---

## Goal

Build a CSS custom property theme layer so that:

1. **Developer rethemability** — switching the entire app's visual personality is a single-file edit in `globals.css`.
2. **User-togglable** — a runtime toggle in the NavBar lets users switch themes, persisted to localStorage.
3. **Open-ended** — adding a third theme (or fourth) requires only one new CSS block and one registry entry. Zero component changes.

Themes control the complete design personality — not just colors, but shape, motion, depth, typography character, and interaction feel.

---

## Approach

**CSS Custom Properties + Tailwind 4 `@theme inline` + `next-themes`**

- Semantic CSS variables defined per theme in `globals.css` under `[data-theme="*"]` attribute selectors.
- Tailwind 4's `@theme inline` registers them as Tailwind utilities (`bg-surface-1`, `text-ink-2`, etc.).
- `next-themes` handles runtime switching, localStorage persistence, SSR flash prevention, and system preference detection.
- `lib/typography.ts` consumes `var(--*)` references instead of hardcoded rgba values.
- All ~40–60 components migrated to use the centralized tokens.

---

## Token Taxonomy

All tokens are named by **semantic role**, never by visual value. This is what makes themes interchangeable.

### Color Tokens

```
Background & Surface
--color-bg                page background
--color-surface-1         card / panel (slight elevation above bg)
--color-surface-2         elevated card (modal, popover)
--color-surface-hover     interactive surface hover state
--color-surface-active    interactive surface active/pressed state

Borders
--color-border            standard border (visible, not heavy)
--color-border-subtle     very light divider / separator

Text (ink hierarchy — 4 levels)
--color-ink-1             primary — highest contrast (headings, body text)
--color-ink-2             secondary — supporting text
--color-ink-3             tertiary / muted — captions, labels, placeholders
--color-ink-4             faint — disabled, ghost text

Accent (brand color)
--color-accent            full brand accent (amber in dark / crimson in light)
--color-accent-dim        ~55% accent (subdued usage)
--color-accent-faint      ~10% accent (wash / tint backgrounds)
--color-accent-hover      hover state for accent-colored elements

Status
--color-success           positive / confirmed
--color-warning           caution / attention
--color-danger            error / destructive
```

### Shape Tokens

```
--radius-sm               dark: 12px    light: 0px
--radius-md               dark: 16px    light: 2px
--radius-lg               dark: 20px    light: 4px
--radius-full             dark: 999px   light: 999px  (pills stay round)
```

### Motion Tokens

```
--duration-fast           dark: 150ms   light: 100ms
--duration-normal         dark: 300ms   light: 180ms
--duration-slow           dark: 600ms   light: 350ms
--easing-standard         dark: cubic-bezier(0.16,1,0.3,1)   light: ease
--easing-exit             dark: ease-in                       light: ease-in
```

### Depth & Surface Character Tokens

```
--shadow-card             dark: purple glow       light: 4px 4px 0 #1C1917 (hard offset)
--shadow-elevated         dark: deep glow         light: 8px 8px 0 rgba(28,25,23,0.15)
--backdrop-blur           dark: blur(20px)        light: none
--surface-blend           dark: rgba(255,255,255,0.04)   light: #FFFCF6
--border-width            dark: 1px               light: 2px
```

### Typography Character Tokens

```
--font-display            dark: Philosopher        light: Libre Baskerville
--font-ui                 dark: Mulish             light: Inter
--font-mono               dark: (system fallback)  light: JetBrains Mono
--tracking-label          dark: 0.04em             light: 0.15em
--label-transform         dark: none               light: uppercase
```

---

## Theme Definitions

### Dark — Cosmic

```css
[data-theme="dark"] {
  --color-bg:              oklch(0.07 0.022 275);
  --color-surface-1:       rgba(255,255,255,0.04);
  --color-surface-2:       rgba(255,255,255,0.07);
  --color-surface-hover:   rgba(255,255,255,0.08);
  --color-surface-active:  rgba(255,255,255,0.12);
  --color-border:          rgba(255,255,255,0.10);
  --color-border-subtle:   rgba(255,255,255,0.05);
  --color-ink-1:           rgba(255,255,255,0.92);
  --color-ink-2:           rgba(255,255,255,0.60);
  --color-ink-3:           rgba(255,255,255,0.38);
  --color-ink-4:           rgba(255,255,255,0.22);
  --color-accent:          rgba(251,191,36,1);
  --color-accent-dim:      rgba(251,191,36,0.55);
  --color-accent-faint:    rgba(251,191,36,0.12);
  --color-accent-hover:    rgba(251,191,36,0.80);
  --color-success:         rgba(52,211,153,0.9);
  --color-warning:         rgba(251,191,36,0.9);
  --color-danger:          rgba(248,113,113,0.9);

  --radius-sm:             12px;
  --radius-md:             16px;
  --radius-lg:             20px;
  --radius-full:           999px;

  --duration-fast:         150ms;
  --duration-normal:       300ms;
  --duration-slow:         600ms;
  --easing-standard:       cubic-bezier(0.16, 1, 0.3, 1);
  --easing-exit:           ease-in;

  --shadow-card:           0 0 32px rgba(139,92,246,0.08);
  --shadow-elevated:       0 8px 32px rgba(0,0,0,0.4);
  --backdrop-blur:         blur(20px);
  --surface-blend:         rgba(255,255,255,0.04);
  --border-width:          1px;

  --tracking-label:        0.04em;
  --label-transform:       none;

  --font-display:          var(--font-display-dark);
  --font-ui:               var(--font-ui-dark);
  --font-mono:             var(--font-mono-dark);

  /* shadcn variable remapping */
  --background:            var(--color-bg);
  --foreground:            var(--color-ink-1);
  --muted-foreground:      var(--color-ink-3);
  --border:                var(--color-border);
  --card:                  var(--color-surface-1);
  --card-foreground:       var(--color-ink-1);
  --primary:               var(--color-accent);
  --primary-foreground:    #1C1917;
}
```

### Light — Archival

```css
[data-theme="light"] {
  --color-bg:              #F5F3EC;
  --color-surface-1:       #FFFCF6;
  --color-surface-2:       #FFFFFF;
  --color-surface-hover:   rgba(28,25,23,0.05);
  --color-surface-active:  rgba(28,25,23,0.10);
  --color-border:          #1C1917;
  --color-border-subtle:   #D6D3D1;
  --color-ink-1:           #1C1917;
  --color-ink-2:           #44403C;
  --color-ink-3:           #78716C;
  --color-ink-4:           #A8A29E;
  --color-accent:          #991B1B;
  --color-accent-dim:      rgba(153,27,27,0.55);
  --color-accent-faint:    rgba(153,27,27,0.08);
  --color-accent-hover:    #7F1D1D;
  --color-success:         #166534;
  --color-warning:         #92400E;
  --color-danger:          #991B1B;

  --radius-sm:             0px;
  --radius-md:             2px;
  --radius-lg:             4px;
  --radius-full:           999px;

  --duration-fast:         100ms;
  --duration-normal:       180ms;
  --duration-slow:         350ms;
  --easing-standard:       ease;
  --easing-exit:           ease-in;

  --shadow-card:           4px 4px 0px #1C1917;
  --shadow-elevated:       8px 8px 0px rgba(28,25,23,0.15);
  --backdrop-blur:         none;
  --surface-blend:         #FFFCF6;
  --border-width:          2px;

  --tracking-label:        0.15em;
  --label-transform:       uppercase;

  --font-display:          var(--font-display-light);
  --font-ui:               var(--font-ui-light);
  --font-mono:             var(--font-mono-light);

  /* shadcn variable remapping */
  --background:            var(--color-bg);
  --foreground:            var(--color-ink-1);
  --muted-foreground:      var(--color-ink-3);
  --border:                var(--color-border);
  --card:                  var(--color-surface-1);
  --card-foreground:       var(--color-ink-1);
  --primary:               var(--color-accent);
  --primary-foreground:    #FFFCF6;
}
```

### Adding a Third Theme

Add one `[data-theme="new-theme"]` block to `globals.css` and one entry to `THEMES` in `lib/theme.ts`. No component changes required.

---

## File Architecture

### Files Created

| File | Purpose |
|---|---|
| `lib/theme.ts` | Theme registry — type definitions, `THEMES` array with id/label/icon |
| `components/ThemeProvider.tsx` | Thin wrapper around `next-themes` Provider |
| `components/ThemeToggle.tsx` | UI toggle component — cycles through `THEMES`, placed in NavBar |

### Files Significantly Modified

| File | What changes |
|---|---|
| `app/globals.css` | Add `@theme inline` registrations; replace `.dark {}` with `[data-theme="dark"]`; add `[data-theme="light"]`; remap shadcn variables |
| `lib/typography.ts` | All hardcoded rgba/px values → `var(--*)` references; add `motion` export; redesign `glass`, `radii`, `interactive`, `colors` |
| `app/layout.tsx` | Preload all font families for all themes; wrap with `ThemeProvider`; remove hardcoded `dark` class from `<html>` |

### Files Migrated (~40–60 components)

All component files that currently use scattered color/radius/transition patterns. See Migration Strategy below.

---

## `lib/typography.ts` After Migration

```ts
export const colors = {
  primary:   "var(--color-ink-1)",
  secondary: "var(--color-ink-2)",
  tertiary:  "var(--color-ink-3)",
  muted:     "var(--color-ink-4)",
  faint:     "var(--color-ink-4)",
  gold:      "var(--color-accent)",
  goldDim:   "var(--color-accent-dim)",
  goldFaint: "var(--color-accent-faint)",
  success:   "var(--color-success)",
  warning:   "var(--color-warning)",
  danger:    "var(--color-danger)",
}

export const glass: CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  border:               "var(--border-width) solid var(--color-border)",
  borderRadius:         "var(--radius-lg)",
}

export const radii = {
  sm:   "var(--radius-sm)",
  md:   "var(--radius-md)",
  lg:   "var(--radius-lg)",
  full: "var(--radius-full)",
}

export const motion = {
  standard: "var(--duration-normal) var(--easing-standard)",
  fast:     "var(--duration-fast) var(--easing-standard)",
  slow:     "var(--duration-slow) var(--easing-standard)",
  exit:     "var(--duration-normal) var(--easing-exit)",
}

// Interactive tokens: Tailwind arbitrary-value syntax referencing CSS vars
export const interactive = {
  card:        "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  listRow:     "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  ghostButton: "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all",
  slotButton:  "hover:bg-[var(--color-accent-faint)] active:bg-[var(--color-accent-faint)] transition-all cursor-pointer",
}
```

---

## Font Strategy

All font families for all themes are preloaded in `app/layout.tsx` at build time. Fonts are downloaded once; the CSS variable assignment switches which is active at runtime with no network cost.

```tsx
// layout.tsx — all fonts preloaded
const philosopher      = Philosopher({ subsets: ["latin"], weight: ["400","700"], variable: "--font-display-dark" });
const mulish           = Mulish({ subsets: ["latin"], variable: "--font-ui-dark" });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400","700"], variable: "--font-display-light" });
const inter            = Inter({ subsets: ["latin"], variable: "--font-ui-light" });
const jetbrainsMono    = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-light" });

// Body receives all variable class names
<body className={`${philosopher.variable} ${mulish.variable} ${libreBaskerville.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
```

Each theme block in `globals.css` assigns `--font-display` and `--font-ui` to the appropriate preloaded variable. `lib/typography.ts` `fonts` object always references `var(--font-display)` and `var(--font-ui)` — never a specific font variable.

---

## ThemeProvider and Toggle

### `components/ThemeProvider.tsx`

```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";
import { THEMES } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="data-theme"
      defaultTheme="dark"
      themes={THEMES.map(t => t.id)}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemes>
  );
}
```

### `components/ThemeToggle.tsx`

Uses `useTheme()` from next-themes. Displays the current theme icon/label. On click, cycles to the next theme in `THEMES`. Placed in the NavBar utility area (right side, alongside the existing sign-out strip on mobile).

### SSR Flash Prevention

`next-themes` with `attribute="data-theme"` suppresses the flash by injecting a blocking script that reads localStorage and sets the attribute before first paint. No additional configuration needed.

---

## Migration Strategy

Migration is executed in 6 phases. Each phase can be committed and verified independently by toggling the theme in the browser.

### Phase 1 — Infrastructure (prerequisite for all other phases)
- `app/globals.css` restructure
- `lib/typography.ts` update
- `lib/theme.ts` create
- `components/ThemeProvider.tsx` create
- `components/ThemeToggle.tsx` create
- `app/layout.tsx` update (fonts + ThemeProvider + remove `dark` class)

### Phase 2 — Core Chrome (highest visibility, proves toggle works)
- `components/NavBar.tsx`
- Layout background and body class

### Phase 3 — Profile Surfaces
- `components/dashboard/ProfileList.tsx`
- `app/profiles/[id]/ProfileDetailClient.tsx`
- `components/ProfileForm.tsx`
- `components/profile-ui.tsx`
- `components/profile/ProfileAvatar.tsx`
- `components/profile/ProfileSelectorCard.tsx`

### Phase 4 — Compatibility Surfaces
- `components/compatibility/CompatibilityClient.tsx`
- `app/compatibility/[id]/CompatibilityDetailClient.tsx`

### Phase 5 — Consultation + Engine Views
- `app/consultation/ConsultationForm.tsx`
- `components/engines/DashaflowView.tsx`
- `components/engines/ProfessionalView.tsx`
- Engine tab components (transit, career, etc.)
- `components/ui/AIInsightCard.tsx`

### Phase 6 — Remaining
- `app/admin/page.tsx` and admin components
- Any remaining miscellaneous components
- shadcn component overrides in `components/ui/` if needed

### The Migration Pattern (same for every component)

For each component, apply these 7 substitutions:

| From (scattered) | To (themed) |
|---|---|
| `rgba(255,255,255,0.92)` | `var(--color-ink-1)` or `colors.primary` |
| `rgba(255,255,255,0.60)` | `var(--color-ink-2)` or `colors.secondary` |
| `rgba(255,255,255,0.38)` | `var(--color-ink-3)` or `colors.tertiary` |
| `rgba(255,255,255,0.22)` | `var(--color-ink-4)` or `colors.muted` |
| `bg-white/5` / `bg-white/[0.04]` | `bg-[var(--color-surface-1)]` |
| `border-white/10` | `border-[var(--color-border)]` |
| `text-white/70` | `text-[var(--color-ink-2)]` |
| `text-muted-foreground` | stays — shadcn var now remapped to our token |
| `borderRadius: "16px"` | `borderRadius: radii.md` |
| `transition: "all 0.3s ease"` | `` transition: `all ${motion.standard}` `` |
| `backdropFilter: "blur(20px)"` | `backdropFilter: "var(--backdrop-blur)"` |
| `boxShadow: "..."` | `boxShadow: "var(--shadow-card)"` |
| `rgba(251,191,36,1)` | `var(--color-accent)` or `colors.gold` |

---

## What a Completed Theme Toggle Looks Like

When the toggle is clicked:

1. `next-themes` updates `data-theme` on `<html>` from `"dark"` to `"light"`.
2. CSS variable values instantly change across the entire document — no React re-render required.
3. All surfaces, borders, text colors, shadows, border radii, transition timing, and fonts switch simultaneously.
4. The change is written to localStorage. On next page load, `next-themes` reads it and sets the attribute before first paint — no flash.

The result is a complete personality switch: from deep-space glassmorphism with springy animations and amber gold, to parchment paper with hard-edged panels, mechanical motion, and crimson ink.

---

## Dependencies

- `next-themes` — install via `npm install next-themes`
- `Libre_Baskerville`, `JetBrains_Mono`, `Inter` — add to `next/font/google` imports in layout.tsx (no extra packages)

---

## Out of Scope

- Per-page theming (explicitly excluded)
- System preference auto-detection (`enableSystem: false` — user's choice persists)
- **Canvas animations on the landing page only** (`CosmicCanvas` star field, `ZodiacWheel`) — these require a separate product decision: does the light theme adapt the same animation with theme colors, or replace it with a different visual treatment (e.g., the SVG mechanical astrolabe from the archival design)? Deferred as a standalone follow-up once the core theme system ships.

## In Scope (clarified)

- **Landing page** — CSS-driven styling participates in theming fully. The `data-theme` attribute on `<html>` cascades to every page including the landing page. Only the canvas components on the landing page are deferred (see above).
- **Canvas and SVG on all other pages** — chart views, compatibility rings, score arcs, and any other SVG/canvas renderers inside the authenticated app are in scope. SVG respects CSS custom properties natively. Any canvas elements outside the landing page bridge theme colors via `getComputedStyle(document.documentElement).getPropertyValue('--color-*')` and re-render on theme change.

---

## Success Criteria

1. Toggling the theme in the NavBar switches the complete visual personality of the app with no page reload.
2. The theme persists across sessions (localStorage).
3. There is no flash of unstyled content on initial load.
4. Adding a third theme requires editing exactly two files: `globals.css` (one new block) and `lib/theme.ts` (one new entry).
5. `tsc --noEmit` passes. All 150 tests pass.
6. No hardcoded color rgba values remain in any component file.
