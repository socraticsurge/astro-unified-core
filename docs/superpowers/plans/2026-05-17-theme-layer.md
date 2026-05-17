# Theme Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CSS custom property theme system with runtime toggle so the entire app's visual personality (colors, shape, motion, depth, typography) switches with one click and can be redefined by editing one file.

**Architecture:** Semantic CSS variables defined per theme under `[data-theme="*"]` in `globals.css`. Tailwind 4's `@theme inline` registers our tokens as utility classes. `next-themes` manages runtime switching, localStorage persistence, and SSR flash prevention. `lib/typography.ts` exports only `var(--*)` references — never hardcoded rgba/px values. All ~40 components migrated in 6 phases.

**Tech Stack:** Next.js App Router, Tailwind CSS 4 (`@theme inline`), `next-themes`, CSS custom properties, `next/font/google`

**Spec:** `docs/superpowers/specs/2026-05-17-theme-layer-design.md`

---

## File Map

**Created:**
- `lib/theme.ts` — ThemeId type, THEMES registry
- `components/ThemeProvider.tsx` — next-themes wrapper
- `components/ThemeToggle.tsx` — cycle-themes UI button

**Significantly rewritten:**
- `app/globals.css` — add semantic token `@theme inline` entries; replace `.dark {}` with `[data-theme="dark"]`; add `[data-theme="light"]`; remap shadcn vars
- `lib/typography.ts` — all tokens become `var(--*)` references; add `motion` export
- `app/layout.tsx` — preload 5 font families; wrap in ThemeProvider; remove `dark` class from `<html>`
- `components/NavBar.tsx` — migrate all hardcoded colors; add ThemeToggle

**Migrated (color/radius/motion substitutions):**
- `components/dashboard/ProfileList.tsx`
- `app/profiles/[id]/ProfileDetailClient.tsx`
- `components/ProfileForm.tsx`
- `components/profile-ui.tsx`
- `components/profile/ProfileAvatar.tsx`
- `components/profile/ProfileSelectorCard.tsx`
- `components/compatibility/CompatibilityClient.tsx`
- `app/compatibility/[id]/CompatibilityDetailClient.tsx`
- `app/consultation/ConsultationForm.tsx`
- `components/engines/` (DashaflowView, ProfessionalView, and all tab views)
- `app/admin/page.tsx`

---

## Migration Substitution Reference

Apply these substitutions consistently across all component migration tasks:

| From | To |
|---|---|
| `rgba(255,255,255,0.92)` | `var(--color-ink-1)` |
| `rgba(255,255,255,0.60)` | `var(--color-ink-2)` |
| `rgba(255,255,255,0.38)` | `var(--color-ink-3)` |
| `rgba(255,255,255,0.22)` | `var(--color-ink-4)` |
| `rgba(255,255,255,0.10)` or `rgba(255,255,255,0.07)` | `var(--color-border-subtle)` |
| `rgba(251,191,36,1)` | `var(--color-accent)` |
| `rgba(251,191,36,0.55)` | `var(--color-accent-dim)` |
| `rgba(251,191,36,0.15)` or `rgba(251,191,36,0.12)` | `var(--color-accent-faint)` |
| `rgba(255,255,255,0.04)` or `rgba(255,255,255,0.035)` | `var(--color-surface-1)` |
| `rgba(255,255,255,0.07)` or `rgba(255,255,255,0.06)` | `var(--color-surface-2)` |
| `rgba(255,255,255,0.08)` | `var(--color-surface-hover)` |
| `rgba(255,255,255,0.12)` | `var(--color-surface-active)` |
| `bg-white/5` or `bg-white/[0.04]` | `bg-[var(--color-surface-1)]` |
| `bg-white/[0.02]` or `bg-white/[0.03]` | `bg-[var(--color-surface-1)]` |
| `border-white/10` or `border-white/[0.11]` | `border-[var(--color-border)]` |
| `border-white/[0.05]` or `border-white/[0.06]` | `border-[var(--color-border-subtle)]` |
| `text-white/70` | `text-[var(--color-ink-2)]` |
| `text-white/50` or `text-white/40` | `text-[var(--color-ink-3)]` |
| `text-white/30` or `text-white/20` | `text-[var(--color-ink-4)]` |
| `hover:bg-white/[0.05]` | `hover:bg-[var(--color-surface-hover)]` |
| `hover:bg-white/[0.08]` | `hover:bg-[var(--color-surface-hover)]` |
| `borderRadius: "12px"` | `borderRadius: radii.sm` |
| `borderRadius: "16px"` | `borderRadius: radii.md` |
| `borderRadius: "20px"` | `borderRadius: radii.lg` |
| `borderRadius: "999px"` | `borderRadius: radii.full` |
| `transition: "all 0.3s ease"` or `transition: "..."` | `` transition: `all ${motion.standard}` `` |
| `backdropFilter: "blur(20px)..."` | `backdropFilter: "var(--backdrop-blur)"` and `WebkitBackdropFilter: "var(--backdrop-blur)"` |
| `boxShadow: "0 0 32px rgba(...)"` | `boxShadow: "var(--shadow-card)"` |
| `"rgba(255,255,255,0.52)"` (inactive icon) | `"var(--color-ink-3)"` |
| `bg-[rgba(251,191,36,0.1)]` (active nav bg) | `bg-[var(--color-accent-faint)]` |
| `text-amber-400` | `text-[var(--color-accent)]` |
| `border-amber-400/30` | `border-[var(--color-accent-dim)]` |
| `duration-150` (Tailwind) | remove — motion timing now from CSS var |

Import `motion` from `@/lib/typography` in any component using `motion.*`.

---

## Task 1: Install dependency

**Files:** `package.json` (modified by npm)

- [ ] **Step 1: Install next-themes**

```bash
cd /Users/vinaychaganti/Documents/VibeCodedApps/ExperimentVercelLaunch/AstroRepos/astrounified
npm install next-themes
```

Expected output: `added 1 package` (or similar, no errors).

- [ ] **Step 2: Verify types are available**

```bash
cat node_modules/next-themes/dist/index.d.ts | head -20
```

Expected: TypeScript declarations visible including `useTheme`, `ThemeProvider`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-themes for runtime theme switching"
```

---

## Task 2: Create `lib/theme.ts`

**Files:**
- Create: `lib/theme.ts`

- [ ] **Step 1: Create the file**

```typescript
// lib/theme.ts
// Theme registry — single source of truth for available themes.
// To add a theme: add one entry here and one [data-theme="id"] block in globals.css.

export type ThemeId = "dark" | "light";

export type ThemeMetadata = {
  id: ThemeId;
  label: string;
  /** Single character shown in the ThemeToggle button */
  icon: string;
};

export const THEMES: ThemeMetadata[] = [
  { id: "dark",  label: "Cosmic",   icon: "✦" },
  { id: "light", label: "Archival", icon: "◻" },
];
```

- [ ] **Step 2: Verify TypeScript accepts it**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/theme.ts
git commit -m "feat: add theme registry (lib/theme.ts)"
```

---

## Task 3: Rewrite `app/globals.css`

**Files:**
- Modify: `app/globals.css`

This is the most critical file. It defines every theme's complete personality.

- [ ] **Step 1: Replace the entire file**

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@plugin "@tailwindcss/typography";

/* Update dark variant to use data-theme attribute instead of .dark class */
@custom-variant dark (&:is([data-theme="dark"] *));

@theme inline {
  /* ── shadcn variables (kept for shadcn component compatibility) ── */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-ui);
  --font-mono: var(--font-mono);
  --font-heading: var(--font-display);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);

  /* ── Radius — now theme-aware ── */
  --radius-sm: var(--radius-sm);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
  --radius-xl: var(--radius-xl);
  --radius-2xl: var(--radius-2xl);
  --radius-3xl: var(--radius-3xl);
  --radius-4xl: var(--radius-4xl);

  /* ── Semantic ink tokens → Tailwind: text-ink-1, bg-ink-2, etc. ── */
  --color-ink-1: var(--color-ink-1);
  --color-ink-2: var(--color-ink-2);
  --color-ink-3: var(--color-ink-3);
  --color-ink-4: var(--color-ink-4);

  /* ── Semantic surface tokens → Tailwind: bg-surface-1, etc. ── */
  --color-surface-1: var(--color-surface-1);
  --color-surface-2: var(--color-surface-2);
  --color-surface-hover: var(--color-surface-hover);
  --color-surface-active: var(--color-surface-active);
  --color-border-subtle: var(--color-border-subtle);

  /* ── Status tokens → Tailwind: text-success, bg-danger, etc. ── */
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-danger: var(--color-danger);
}

/* ── Fallback root (shadcn needs a base :root) ── */
:root {
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
}

/* ══════════════════════════════════════════════════════════════
   DARK THEME — Cosmic
   To change the dark personality: edit values in this block only.
   ══════════════════════════════════════════════════════════════ */
[data-theme="dark"] {
  /* Color — backgrounds & surfaces */
  --color-bg:              oklch(0.07 0.022 275);
  --color-surface-1:       rgba(255,255,255,0.04);
  --color-surface-2:       rgba(255,255,255,0.07);
  --color-surface-hover:   rgba(255,255,255,0.08);
  --color-surface-active:  rgba(255,255,255,0.12);

  /* Color — borders */
  --color-border:          rgba(255,255,255,0.10);
  --color-border-subtle:   rgba(255,255,255,0.05);

  /* Color — ink (text hierarchy) */
  --color-ink-1:           rgba(255,255,255,0.92);
  --color-ink-2:           rgba(255,255,255,0.60);
  --color-ink-3:           rgba(255,255,255,0.38);
  --color-ink-4:           rgba(255,255,255,0.22);

  /* Color — accent (brand: amber gold) */
  --color-accent:          rgba(251,191,36,1);
  --color-accent-dim:      rgba(251,191,36,0.55);
  --color-accent-faint:    rgba(251,191,36,0.12);
  --color-accent-hover:    rgba(251,191,36,0.80);

  /* Color — status */
  --color-success:         rgba(52,211,153,0.9);
  --color-warning:         rgba(251,191,36,0.9);
  --color-danger:          rgba(248,113,113,0.9);

  /* Shape */
  --radius-sm:             12px;
  --radius-md:             16px;
  --radius-lg:             20px;
  --radius-xl:             24px;
  --radius-2xl:            28px;
  --radius-3xl:            32px;
  --radius-4xl:            36px;
  --radius-full:           999px;

  /* Motion */
  --duration-fast:         150ms;
  --duration-normal:       300ms;
  --duration-slow:         600ms;
  --easing-standard:       cubic-bezier(0.16, 1, 0.3, 1);
  --easing-exit:           ease-in;

  /* Depth */
  --shadow-card:           0 0 32px rgba(139,92,246,0.08);
  --shadow-elevated:       0 8px 32px rgba(0,0,0,0.4);
  --backdrop-blur:         blur(20px) saturate(1.6);
  --surface-blend:         rgba(255,255,255,0.04);
  --border-width:          1px;

  /* Typography character */
  --tracking-label:        0.04em;
  --label-transform:       none;
  --font-display:          var(--font-display-dark);
  --font-ui:               var(--font-ui-dark);
  --font-mono:             var(--font-mono-dark);

  /* shadcn variable remapping — keeps shadcn components themed */
  --background:            var(--color-bg);
  --foreground:            var(--color-ink-1);
  --card:                  var(--color-surface-1);
  --card-foreground:       var(--color-ink-1);
  --popover:               var(--color-surface-2);
  --popover-foreground:    var(--color-ink-1);
  --primary:               var(--color-accent);
  --primary-foreground:    #1C1917;
  --secondary:             var(--color-surface-2);
  --secondary-foreground:  var(--color-ink-1);
  --muted:                 var(--color-surface-1);
  --muted-foreground:      var(--color-ink-3);
  --accent:                var(--color-surface-2);
  --accent-foreground:     var(--color-ink-1);
  --destructive:           var(--color-danger);
  --border:                var(--color-border);
  --input:                 var(--color-border);
  --ring:                  var(--color-accent-dim);
}

/* ══════════════════════════════════════════════════════════════
   LIGHT THEME — Archival
   To change the light personality: edit values in this block only.
   ══════════════════════════════════════════════════════════════ */
[data-theme="light"] {
  /* Color — backgrounds & surfaces */
  --color-bg:              #F5F3EC;
  --color-surface-1:       #FFFCF6;
  --color-surface-2:       #FFFFFF;
  --color-surface-hover:   rgba(28,25,23,0.05);
  --color-surface-active:  rgba(28,25,23,0.10);

  /* Color — borders */
  --color-border:          #1C1917;
  --color-border-subtle:   #D6D3D1;

  /* Color — ink (text hierarchy) */
  --color-ink-1:           #1C1917;
  --color-ink-2:           #44403C;
  --color-ink-3:           #78716C;
  --color-ink-4:           #A8A29E;

  /* Color — accent (brand: crimson ink) */
  --color-accent:          #991B1B;
  --color-accent-dim:      rgba(153,27,27,0.55);
  --color-accent-faint:    rgba(153,27,27,0.08);
  --color-accent-hover:    #7F1D1D;

  /* Color — status */
  --color-success:         #166534;
  --color-warning:         #92400E;
  --color-danger:          #991B1B;

  /* Shape */
  --radius-sm:             0px;
  --radius-md:             2px;
  --radius-lg:             4px;
  --radius-xl:             6px;
  --radius-2xl:            8px;
  --radius-3xl:            10px;
  --radius-4xl:            12px;
  --radius-full:           999px;

  /* Motion */
  --duration-fast:         100ms;
  --duration-normal:       180ms;
  --duration-slow:         350ms;
  --easing-standard:       ease;
  --easing-exit:           ease-in;

  /* Depth */
  --shadow-card:           4px 4px 0px #1C1917;
  --shadow-elevated:       8px 8px 0px rgba(28,25,23,0.15);
  --backdrop-blur:         none;
  --surface-blend:         #FFFCF6;
  --border-width:          2px;

  /* Typography character */
  --tracking-label:        0.15em;
  --label-transform:       uppercase;
  --font-display:          var(--font-display-light);
  --font-ui:               var(--font-ui-light);
  --font-mono:             var(--font-mono-light);

  /* shadcn variable remapping */
  --background:            var(--color-bg);
  --foreground:            var(--color-ink-1);
  --card:                  var(--color-surface-1);
  --card-foreground:       var(--color-ink-1);
  --popover:               var(--color-surface-1);
  --popover-foreground:    var(--color-ink-1);
  --primary:               var(--color-accent);
  --primary-foreground:    #FFFCF6;
  --secondary:             var(--color-surface-hover);
  --secondary-foreground:  var(--color-ink-1);
  --muted:                 var(--color-surface-hover);
  --muted-foreground:      var(--color-ink-3);
  --accent:                var(--color-surface-hover);
  --accent-foreground:     var(--color-ink-1);
  --destructive:           var(--color-danger);
  --border:                var(--color-border);
  --input:                 var(--color-border-subtle);
  --ring:                  var(--color-accent);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    background-color: var(--color-bg);
    color: var(--color-ink-1);
  }
  html {
    @apply font-sans;
  }
}

/* ── Keyframes ── */
@keyframes spinZodiac { to { transform: rotate(360deg); } }
@keyframes shimmerBtn {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors (CSS changes don't affect TypeScript).

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: restructure globals.css with semantic theme tokens and [data-theme] blocks"
```

---

## Task 4: Rewrite `lib/typography.ts`

**Files:**
- Modify: `lib/typography.ts`

Replace all hardcoded values with CSS variable references. Add `motion` export.

- [ ] **Step 1: Replace the entire file**

```typescript
import type { CSSProperties } from "react";

// ── Font family references ─────────────────────────────────────────────────────
// These reference the active theme's fonts via CSS variables.
// The actual font families are loaded in app/layout.tsx and assigned per-theme
// in globals.css ([data-theme="dark"] / [data-theme="light"] blocks).

const DISPLAY = "var(--font-display), Georgia, serif";
const SANS    = "var(--font-ui), system-ui, sans-serif";
const MONO    = "var(--font-mono), ui-monospace, monospace";

// ── Color tokens ──────────────────────────────────────────────────────────────
// All values are CSS variable references — actual colors defined per-theme
// in globals.css. Use these in inline style props.

export const colors = {
  // Text hierarchy
  primary:      "var(--color-ink-1)",
  secondary:    "var(--color-ink-2)",
  tertiary:     "var(--color-ink-3)",
  muted:        "var(--color-ink-4)",
  faint:        "var(--color-ink-4)",

  // Brand accent
  gold:         "var(--color-accent)",
  goldDim:      "var(--color-accent-dim)",
  goldFaint:    "var(--color-accent-faint)",

  // Status
  success:      "var(--color-success)",
  warning:      "var(--color-warning)",
  danger:       "var(--color-danger)",
} as const;

// ── Font role tokens ───────────────────────────────────────────────────────────
export const fonts = {
  display:       { fontFamily: DISPLAY, fontWeight: 400 },
  displayBold:   { fontFamily: DISPLAY, fontWeight: 700 },
  displayItalic: { fontFamily: DISPLAY, fontWeight: 400, fontStyle: "italic" as const },
  ui:            { fontFamily: SANS, fontWeight: 400 },
  uiLight:       { fontFamily: SANS, fontWeight: 300 },
  uiMedium:      { fontFamily: SANS, fontWeight: 500 },
  uiSemibold:    { fontFamily: SANS, fontWeight: 600 },
  uiBold:        { fontFamily: SANS, fontWeight: 700 },
  uiItalic:      { fontFamily: SANS, fontWeight: 400, fontStyle: "italic" as const },
  mono:          { fontFamily: MONO, fontWeight: 400 },
  monoMedium:    { fontFamily: MONO, fontWeight: 600 },
} satisfies Record<string, CSSProperties>;

// ── Type scale ─────────────────────────────────────────────────────────────────
export const scale = {
  pageTitle:   "2.2rem",
  sectionHead: "1.4rem",
  subhead:     "1.15rem",
  body:        "1rem",
  label:       "0.95rem",
  small:       "0.875rem",
  xs:          "0.75rem",
} as const;

// ── Composed text styles ───────────────────────────────────────────────────────
export const textStyles = {
  pageTitle: {
    ...fonts.display,
    fontSize: scale.pageTitle,
    letterSpacing: "0.02em",
    lineHeight: 1.15,
    color: colors.primary,
  },
  sectionHead: {
    ...fonts.display,
    fontSize: scale.sectionHead,
    letterSpacing: "0.03em",
    lineHeight: 1.25,
    color: colors.primary,
  },
  subhead: {
    ...fonts.display,
    fontSize: scale.subhead,
    letterSpacing: "0.03em",
    lineHeight: 1.3,
    color: colors.primary,
  },
  stepLabel: {
    ...fonts.displayItalic,
    fontSize: scale.label,
    letterSpacing: "0.05em",
    color: colors.tertiary,
  },
  body: {
    ...fonts.ui,
    fontSize: scale.body,
    lineHeight: 1.65,
    color: colors.secondary,
  },
  bodyMedium: {
    ...fonts.uiMedium,
    fontSize: scale.body,
    lineHeight: 1.65,
    color: colors.secondary,
  },
  small: {
    ...fonts.ui,
    fontSize: scale.small,
    lineHeight: 1.5,
    color: colors.secondary,
  },
  label: {
    ...fonts.uiMedium,
    fontSize: scale.small,
    letterSpacing: "0.01em",
    color: colors.secondary,
  },
  meta: {
    ...fonts.ui,
    fontSize: scale.xs,
    letterSpacing: "0.04em",
    color: colors.muted,
  },
} satisfies Record<string, CSSProperties>;

// ── Glass / surface token ──────────────────────────────────────────────────────
// Theme-aware: dark = glassmorphism, light = solid archival panel.
// The CSS variables resolve to the correct values per theme.

export const glass: CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  border:               "var(--border-width) solid var(--color-border)",
  borderRadius:         "var(--radius-lg)",
};

// ── Text clamping ──────────────────────────────────────────────────────────────
export const clamp = {
  one: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  two: {
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
} satisfies Record<string, CSSProperties>;

// ── Border radius scale ────────────────────────────────────────────────────────
// Values come from the active theme's CSS variables.
// dark: 12/16/20/999px   light: 0/2/4/999px

export const radii = {
  sm:   "var(--radius-sm)",
  md:   "var(--radius-md)",
  lg:   "var(--radius-lg)",
  full: "var(--radius-full)",
} as const;

// ── Motion tokens ──────────────────────────────────────────────────────────────
// Use in inline transition/animation values.
// dark: springy (300ms cubic-bezier)   light: snappy (180ms ease)
//
//   style={{ transition: `all ${motion.standard}` }}

export const motion = {
  standard: "var(--duration-normal) var(--easing-standard)",
  fast:     "var(--duration-fast) var(--easing-standard)",
  slow:     "var(--duration-slow) var(--easing-standard)",
  exit:     "var(--duration-normal) var(--easing-exit)",
} as const;

// ── Interactive state tokens ───────────────────────────────────────────────────
// Tailwind class strings for hover/active states. These reference CSS variables
// via Tailwind's arbitrary value syntax so they switch with the theme.

export const interactive = {
  card:        "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  listRow:     "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  ghostButton: "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all",
  slotButton:  "hover:bg-[var(--color-accent-faint)] active:bg-[var(--color-accent-faint)] transition-all cursor-pointer",
} as const;
```

- [ ] **Step 2: Run TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no errors. (Some downstream components may now reference `motion` which doesn't exist yet — that's fine, they'll be fixed in later tasks.)

- [ ] **Step 3: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add lib/typography.ts
git commit -m "feat: migrate typography.ts to CSS variable references, add motion token"
```

---

## Task 5: Create `components/ThemeProvider.tsx`

**Files:**
- Create: `components/ThemeProvider.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";
import { THEMES } from "@/lib/theme";

/**
 * Wraps the app in next-themes' provider.
 * - attribute="data-theme": sets data-theme on <html> instead of class
 * - defaultTheme="dark": cosmic theme on first visit
 * - enableSystem=false: user's explicit choice persists, not OS preference
 * - disableTransitionOnChange=false: CSS transitions fire during switch
 */
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

- [ ] **Step 2: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ThemeProvider.tsx
git commit -m "feat: add ThemeProvider (next-themes wrapper)"
```

---

## Task 6: Create `components/ThemeToggle.tsx`

**Files:**
- Create: `components/ThemeToggle.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { THEMES } from "@/lib/theme";
import { fonts } from "@/lib/typography";

/**
 * Cycles through THEMES on each click.
 * Shows the current theme icon; clicking advances to the next theme.
 * Must be mounted before rendering to avoid SSR hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Render nothing until mounted — avoids hydration mismatch
  if (!mounted) return <div className="w-8 h-7" aria-hidden="true" />;

  const currentIndex = THEMES.findIndex(t => t.id === theme);
  const safeIndex    = currentIndex === -1 ? 0 : currentIndex;
  const currentTheme = THEMES[safeIndex];
  const nextTheme    = THEMES[(safeIndex + 1) % THEMES.length];

  return (
    <button
      onClick={() => setTheme(nextTheme.id)}
      aria-label={`Switch to ${nextTheme.label} theme`}
      title={`Switch to ${nextTheme.label}`}
      style={{ ...fonts.mono, fontSize: "0.8rem" }}
      className="w-8 h-7 flex items-center justify-center rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-all"
    >
      {currentTheme.icon}
    </button>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ThemeToggle.tsx
git commit -m "feat: add ThemeToggle component (cycles themes)"
```

---

## Task 7: Update `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

Three changes: preload all font families, wrap with ThemeProvider, remove `dark` class.

- [ ] **Step 1: Replace the entire file**

```tsx
import type { Metadata } from "next";
import {
  Philosopher,
  Mulish,
  Libre_Baskerville,
  Inter,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextAuthProvider } from "@/components/auth/NextAuthProvider";
import { NavBar } from "@/components/NavBar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AppShell } from "@/components/AppShell";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const CURRENT_YEAR = new Date().getFullYear();

// ── Dark theme fonts ───────────────────────────────────────────────────────────
const philosopher = Philosopher({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-dark",
});

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-ui-dark",
});

// ── Light theme fonts ──────────────────────────────────────────────────────────
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-light",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui-light",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono-light",
});

export const metadata: Metadata = {
  title: "Astro Chaganti — Vedic birth charts by Dr. Vinay Kumar Chaganti",
  description:
    "Detailed Vedic birth charts: Lagna, divisional charts, 5-level Vimshottari Dasha, Yogas, Shadbala, Karakamsha, and more. By Dr. Vinay Kumar Chaganti.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    // No className="dark" — next-themes sets data-theme="dark" instead
    <html lang="en" suppressHydrationWarning>
      <body
        className={[
          philosopher.variable,
          mulish.variable,
          libreBaskerville.variable,
          inter.variable,
          jetbrainsMono.variable,
          "font-sans antialiased",
        ].join(" ")}
      >
        <ThemeProvider>
          <NextAuthProvider session={session}>
            <AppShell
              navBar={<NavBar />}
              footer={
                <footer className="pb-24 sm:pb-6 pt-2 flex items-center justify-end px-4 sm:px-6 opacity-20 hover:opacity-50 transition-opacity duration-300">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--color-ink-3)] tracking-wide">
                    <span>© {CURRENT_YEAR} Astro Chaganti</span>
                    <span className="text-[var(--color-border-subtle)]">·</span>
                    <Link href="/privacy" className="hover:underline">Privacy</Link>
                    <Link href="/terms" className="hover:underline">Terms</Link>
                  </div>
                </footer>
              }
              feedback={<FeedbackWidget />}
            >
              {children}
            </AppShell>
          </NextAuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

Note: `suppressHydrationWarning` on `<html>` is required — next-themes adds `data-theme` after SSR, which would otherwise cause a hydration warning.

Note on font variable renames: The old variables `--font-sans` (Mulish) and `--font-cormorant` (Philosopher) are replaced by `--font-ui-dark` and `--font-display-dark`. Any component that referenced `var(--font-sans)` or `var(--font-cormorant)` directly in an inline style will need updating to `var(--font-ui)` and `var(--font-display)`. Task 12 includes an audit step for this.

Note on `--font-mono-dark`: the dark theme block sets `--font-mono: var(--font-mono-dark)`, but no font is loaded for this variable in `layout.tsx`. This is intentional — the dark theme uses system monospace as the fallback. `typography.ts` defines `MONO = "var(--font-mono), ui-monospace, monospace"` so system mono is always available.

- [ ] **Step 2: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: preload all theme fonts, wrap app in ThemeProvider, remove hardcoded dark class"
```

---

## Task 8: Migrate `components/NavBar.tsx` + add ThemeToggle

**Files:**
- Modify: `components/NavBar.tsx`

This is the highest-visibility component. After this task, the toggle is visible and functional.

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { fonts, motion } from "@/lib/typography";
import { NAV_CONFIG } from "@/lib/nav";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Bespoke SVG icons ──────────────────────────────────────────────────────────

function NatalIcon({ active }: { active: boolean }) {
  const c = active ? "var(--color-accent)" : "var(--color-ink-3)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12" stroke={c} strokeWidth="0.9"/>
      <circle cx="14" cy="14" r="6"  stroke={c} strokeWidth="0.7"/>
      <circle cx="14" cy="14" r="1.6" fill={c}/>
      <line x1="14" y1="2"  x2="14" y2="7"  stroke={c} strokeWidth="0.7"/>
      <line x1="14" y1="21" x2="14" y2="26" stroke={c} strokeWidth="0.7"/>
      <line x1="2"  y1="14" x2="7"  y2="14" stroke={c} strokeWidth="0.7"/>
      <line x1="21" y1="14" x2="26" y2="14" stroke={c} strokeWidth="0.7"/>
      <line x1="5"  y1="5"  x2="9"  y2="9"  stroke={c} strokeWidth="0.55"/>
      <line x1="19" y1="19" x2="23" y2="23" stroke={c} strokeWidth="0.55"/>
      <line x1="23" y1="5"  x2="19" y2="9"  stroke={c} strokeWidth="0.55"/>
      <line x1="9"  y1="19" x2="5"  y2="23" stroke={c} strokeWidth="0.55"/>
    </svg>
  );
}

function KundaliIcon({ active }: { active: boolean }) {
  const c    = active ? "var(--color-accent)" : "var(--color-ink-3)";
  const fill = active ? "var(--color-accent-faint)" : "var(--color-surface-1)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="10" cy="14" r="9" stroke={c} strokeWidth="0.9" fill="var(--color-surface-1)"/>
      <circle cx="18" cy="14" r="9" stroke={c} strokeWidth="0.9" fill="var(--color-surface-1)"/>
      <path d="M14 6.6 C16.5 8.8 16.5 19.2 14 21.4 C11.5 19.2 11.5 8.8 14 6.6Z" fill={fill}/>
    </svg>
  );
}

function ConsultIcon({ active }: { active: boolean }) {
  const c = active ? "var(--color-accent)" : "var(--color-ink-3)";
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="9" r="4.5" stroke={c} strokeWidth="0.9"/>
      <path d="M5 24 C5 18.5 8.5 15 14 15 C19.5 15 23 18.5 23 24"
        stroke={c} strokeWidth="0.9" strokeLinecap="round" fill="none"/>
      <circle cx="14" cy="9" r="1.5" fill={c}/>
    </svg>
  );
}

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
  );
}

type IconComponent = ({ active }: { active: boolean }) => React.ReactElement;

const NAV_ICONS: Record<string, IconComponent> = {
  "/dashboard":     NatalIcon,
  "/compatibility": KundaliIcon,
  "/consultation":  ConsultIcon,
};

const navGlassStyle: React.CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  boxShadow:            "inset 0 1.5px 0 var(--color-border-subtle), inset 0 -1px 0 var(--color-border-subtle)",
};

const wordmarkStyle: React.CSSProperties = {
  ...fonts.display,
  fontSize: "1.45rem",
  letterSpacing: "0.02em",
  lineHeight: 1,
};

const goldStyle: React.CSSProperties = {
  fontStyle: "italic",
  color: "var(--color-accent)",
};

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const showAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || (pathname?.startsWith("/profiles") ?? false)
      : pathname?.startsWith(href) ?? false;

  return (
    <>
      {/* ── Desktop top nav ── */}
      <nav
        className="hidden sm:flex sticky top-0 z-40 border-b border-[var(--color-border)] items-center"
        style={{ ...navGlassStyle, transition: `background ${motion.standard}` }}
      >
        <div className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between gap-6">

          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-3 shrink-0"
            aria-label="Home"
          >
            <TwoOrbits size={40} />
            <span style={wordmarkStyle}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={goldStyle}>Chaganti</span>
            </span>
          </Link>

          {isLoggedIn && (
            <div className="flex items-center gap-1">
              {NAV_CONFIG.map(({ href, label }) => {
                const Icon = NAV_ICONS[href];
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-md)] transition-all whitespace-nowrap",
                      active
                        ? "bg-[var(--color-accent-faint)] text-[var(--color-accent)]"
                        : "text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)]",
                    ].join(" ")}
                    style={{ ...fonts.uiMedium, fontSize: "0.8rem", letterSpacing: "0.02em" }}
                  >
                    <Icon active={active} />
                    {label}
                  </Link>
                );
              })}

              {showAdmin && (
                <Link
                  href="/admin"
                  className={[
                    "flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-md)] transition-all",
                    isActive("/admin")
                      ? "bg-[var(--color-accent-faint)] text-[var(--color-accent)]"
                      : "text-[var(--color-accent-dim)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-hover)]",
                  ].join(" ")}
                  style={{ ...fonts.uiMedium, fontSize: "0.75rem", letterSpacing: "0.02em" }}
                >
                  <ShieldCheck className="h-[1.1em] w-[1.1em]" />
                  Admin
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {isLoggedIn ? (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] transition-all"
                style={{ ...fonts.uiItalic, fontSize: "0.8rem", letterSpacing: "0.02em" }}
              >
                Sign Out
              </button>
            ) : (
              <Link
                href="/auth/signin"
                className="px-4 py-1.5 rounded-[var(--radius-md)] text-sm font-medium border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-accent)] hover:bg-[var(--color-accent-faint)] hover:text-[var(--color-accent-hover)] transition-all"
                style={fonts.uiMedium}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      {isLoggedIn && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)]"
          style={{
            ...navGlassStyle,
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)",
          }}
        >
          <div className="flex items-stretch justify-around px-2 pt-1">
            {NAV_CONFIG.map(({ href, short }) => {
              const Icon = NAV_ICONS[href];
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-[var(--radius-md)] transition-all min-h-[52px] justify-center",
                    active
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]",
                  ].join(" ")}
                >
                  <Icon active={active} />
                  <span style={{ ...fonts.uiMedium, fontSize: "0.7rem", letterSpacing: "0.03em" }}>
                    {short}
                  </span>
                </Link>
              );
            })}

            {showAdmin && (
              <Link
                href="/admin"
                className={[
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-[var(--radius-md)] transition-all min-h-[52px] justify-center",
                  isActive("/admin")
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-accent-dim)] hover:text-[var(--color-accent)]",
                ].join(" ")}
              >
                <ShieldCheck className="h-5 w-5" />
                <span style={{ ...fonts.uiMedium, fontSize: "0.7rem" }}>Admin</span>
              </Link>
            )}
          </div>

          {/* Utility strip: theme toggle + sign out */}
          <div className="flex justify-end items-center gap-2 px-4 pb-0.5">
            <ThemeToggle />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)] transition-all"
              style={{ ...fonts.ui, fontSize: "0.65rem", letterSpacing: "0.04em" }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Mobile unauthenticated */}
      {!isLoggedIn && (
        <nav
          className="sm:hidden sticky top-0 z-40 border-b border-[var(--color-border)] flex items-center justify-between px-4 py-3"
          style={navGlassStyle}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="Home">
            <TwoOrbits size={26} />
            <span style={{ ...wordmarkStyle, fontSize: "1.1rem" }}>
              <span style={{ color: "var(--color-ink-1)" }}>Astro </span>
              <span style={goldStyle}>Chaganti</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/auth/signin"
              className="px-4 py-1.5 rounded-[var(--radius-md)] text-sm border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-accent)] hover:bg-[var(--color-accent-faint)] transition-all"
              style={fonts.uiMedium}
            >
              Sign In
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add components/NavBar.tsx components/ThemeToggle.tsx
git commit -m "feat: migrate NavBar to theme tokens, add ThemeToggle to desktop and mobile nav"
```

---

## Task 9: Migrate profile surfaces

**Files:**
- Modify: `components/dashboard/ProfileList.tsx`
- Modify: `app/profiles/[id]/ProfileDetailClient.tsx`
- Modify: `components/ProfileForm.tsx`
- Modify: `components/profile-ui.tsx`
- Modify: `components/profile/ProfileAvatar.tsx`
- Modify: `components/profile/ProfileSelectorCard.tsx`

Apply the substitution table from the Migration Substitution Reference. Key specifics per file:

- [ ] **Step 1: Migrate `components/profile/ProfileAvatar.tsx`**

Find and replace:
```
"rgba(255,255,255,0.07)"  →  "var(--color-surface-2)"
"rgba(255,255,255,0.10)"  →  "var(--color-border)"
border: `1px solid rgba(...)`  →  border: `var(--border-width) solid var(--color-border)`
```

- [ ] **Step 2: Migrate `components/profile/ProfileSelectorCard.tsx`**

```
"rgba(251,191,36,0.50)"   →  "var(--color-accent-dim)"
"rgba(255,255,255,0.05)"  →  "var(--color-border-subtle)"
"rgba(255,255,255,0.09)"  →  "var(--color-border)"
"rgba(251,191,36,0.07)"   →  "var(--color-accent-faint)"
"rgba(255,255,255,0.015)" →  "var(--color-surface-1)"
"rgba(255,255,255,0.03)"  →  "var(--color-surface-1)"
"0 0 24px rgba(251,191,36,0.10)"  →  "var(--shadow-card)"
```

Add `import { motion } from "@/lib/typography"` and replace any hardcoded `transition` strings.

- [ ] **Step 3: Migrate `components/profile-ui.tsx`**

Replace Tailwind classes:
```
bg-amber-900/40   →  bg-[var(--color-accent-faint)]
text-amber-300    →  text-[var(--color-accent)]
ring-amber-800/50 →  ring-[var(--color-accent-dim)]
bg-red-950/30     →  bg-[var(--color-danger)]/10
text-red-400      →  text-[var(--color-danger)]
bg-blue-900/30    →  bg-[var(--color-surface-2)]
text-blue-300     →  text-[var(--color-ink-2)]
bg-violet-900/30  →  bg-[var(--color-surface-2)]
text-violet-300   →  text-[var(--color-ink-2)]
bg-white/5        →  bg-[var(--color-surface-1)]
border-white/10   →  border-[var(--color-border)]
text-muted-foreground →  text-[var(--color-ink-3)]  (or leave as-is since shadcn var is remapped)
```

- [ ] **Step 4: Migrate `components/ProfileForm.tsx`**

Replace all Tailwind color classes and inline styles:
```
text-destructive  →  text-[var(--color-danger)]
border-input      →  stays (shadcn var remapped)
bg-background     →  stays (shadcn var remapped)
```

Add `border-[var(--color-border)]` to form field containers if using raw border classes.

- [ ] **Step 5: Migrate `components/dashboard/ProfileList.tsx`**

```
bg-white/5          →  bg-[var(--color-surface-1)]
border-white/10     →  border-[var(--color-border)]
bg-white/10         →  bg-[var(--color-surface-hover)]  (hover)
bg-amber-500        →  bg-[var(--color-accent)]
hover:bg-amber-600  →  hover:bg-[var(--color-accent-hover)]
text-amber-950      →  text-[var(--color-bg)]
bg-red-950/20       →  bg-[var(--color-danger)]/10
border-red-800/40   →  border-[var(--color-danger)]/40
text-red-400        →  text-[var(--color-danger)]
bg-amber-950/20     →  bg-[var(--color-accent-faint)]
border-amber-700/40 →  border-[var(--color-accent-dim)]
text-amber-300      →  text-[var(--color-accent)]
text-muted-foreground →  text-[var(--color-ink-3)]
```

- [ ] **Step 6: Migrate `app/profiles/[id]/ProfileDetailClient.tsx`**

```
bg-amber-950/20      →  bg-[var(--color-accent-faint)]
border-amber-800/30  →  border-[var(--color-accent-dim)]
text-amber-400/80    →  text-[var(--color-accent-dim)]
text-amber-400       →  text-[var(--color-accent)]
hover:bg-amber-950/30 →  hover:bg-[var(--color-accent-faint)]
border-amber-700/40  →  border-[var(--color-accent-dim)]
bg-white/[0.03]      →  bg-[var(--color-surface-1)]
border-white/10      →  border-[var(--color-border)]
bg-red-950/20        →  bg-[var(--color-danger)]/10
border-red-800/40    →  border-[var(--color-danger)]/40
text-red-400         →  text-[var(--color-danger)]
bg-white/5           →  bg-[var(--color-surface-1)]
border-white/5       →  border-[var(--color-border-subtle)]
text-white/80        →  text-[var(--color-ink-1)]
text-white/70        →  text-[var(--color-ink-2)]
text-white/35        →  text-[var(--color-ink-4)]
text-green-400       →  text-[var(--color-success)]
text-muted-foreground →  text-[var(--color-ink-3)]
bg-yellow-400/10     →  bg-[var(--color-warning)]/10
text-yellow-400      →  text-[var(--color-warning)]
bg-violet-500/20     →  bg-[var(--color-surface-2)]
text-violet-300      →  text-[var(--color-ink-2)]
border-violet-500/30 →  border-[var(--color-border)]
bg-black/40          →  bg-[var(--color-bg)]/60
```

Also replace `bg-gradient-to-br from-amber-500 to-amber-700` monogram avatar with `bg-[var(--color-accent)]`.

- [ ] **Step 7: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 8: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add "components/profile/" "components/profile-ui.tsx" "components/ProfileForm.tsx" "components/dashboard/ProfileList.tsx" "app/profiles/[id]/ProfileDetailClient.tsx"
git commit -m "feat: migrate profile surfaces to theme tokens (phase 3)"
```

---

## Task 10: Migrate compatibility surfaces

**Files:**
- Modify: `components/compatibility/CompatibilityClient.tsx`
- Modify: `app/compatibility/[id]/CompatibilityDetailClient.tsx`

- [ ] **Step 1: Migrate `components/compatibility/CompatibilityClient.tsx`**

In `SeatCard` and surrounding elements:
```
"rgba(255,255,255,0.025)"  →  "var(--color-surface-1)"
"rgba(255,255,255,0.04)"   →  "var(--color-surface-1)"
borderRadius: "20px"       →  borderRadius: radii.lg
borderRadius: "999px"      →  borderRadius: radii.full
borderRadius: "16px"       →  borderRadius: radii.md
transition: "box-shadow..."  →  transition: `box-shadow ${motion.standard}`
```

Import `motion` and `radii` from `@/lib/typography`.

In `ScoreRing`, SVG stroke colors come from `scoreColor()` — no change needed (these are data-driven).

In the past readings list, per-row style:
```
"rgba(255,255,255,0.035)"  →  "var(--color-surface-1)"
borderRadius: "16px"       →  radii.md
```

Error banner:
```
"#fca5a5"                  →  "var(--color-danger)"
"rgba(127,29,29,0.25)"     →  "var(--color-danger-faint)"  (use "var(--color-accent-faint)" — same pattern, closest match)
```

CTA button gradient — leave as-is (this is a design accent, not a surface).

- [ ] **Step 2: Migrate `app/compatibility/[id]/CompatibilityDetailClient.tsx`**

Import `motion` from `@/lib/typography`.

Replace all inline style patterns per the substitution table. Key replacements in this file:
```
glass spread already uses glass token  →  confirm glass token is still spread correctly
radii.lg, radii.md, radii.sm           →  already using radii token, just confirm
transition: "..."                      →  transition: `all ${motion.standard}`
"rgba(255,255,255,N)"                  →  appropriate color token
```

SVG color values in `ScoreArc` and compatibility charts are data-driven via `scoreColor()` — leave those as-is.

- [ ] **Step 3: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

- [ ] **Step 5: Commit**

```bash
git add "components/compatibility/CompatibilityClient.tsx" "app/compatibility/[id]/CompatibilityDetailClient.tsx"
git commit -m "feat: migrate compatibility surfaces to theme tokens (phase 4)"
```

---

## Task 11: Migrate consultation + engine views

**Files:**
- Modify: `app/consultation/ConsultationForm.tsx`
- Modify: `components/engines/DashaflowView.tsx`
- Modify: `components/engines/ProfessionalView.tsx`
- Modify: `components/engines/AIInsightCard.tsx`
- Modify: `components/engines/AIInsightShell.tsx`
- Modify: `components/engines/SectionShell.tsx`
- Modify: `components/engines/ExplainerModal.tsx`
- Modify: `components/engines/AntardashaTimeline.tsx`
- Modify: `components/engines/CareerView.tsx`
- Modify: `components/engines/TransitView.tsx`
- Modify: `components/engines/MuhurthaView.tsx`
- Modify: `components/engines/TarabalamView.tsx`
- Modify: `components/engines/VargaDashboard.tsx`
- Modify: `components/engines/CompatibilityChat.tsx`
- Modify: `components/engines/CompatibilityInsightShell.tsx`
- Modify: `components/engines/ProfileChat.tsx`

- [ ] **Step 1: Migrate `app/consultation/ConsultationForm.tsx`**

The `glassCard` local const already uses `glass` + `radii` tokens. Confirm it reads:
```typescript
const glassCard: React.CSSProperties = { ...glass, borderRadius: radii.lg };
```

Replace remaining hardcoded patterns:
```
borderRadius: "14px"   →  borderRadius: radii.md
borderRadius: "10px"   →  borderRadius: radii.sm
borderRadius: "12px"   →  borderRadius: radii.sm
transition: "..."      →  transition: `all ${motion.standard}`
bg-amber-500/10        →  bg-[var(--color-accent-faint)]
text-amber-300         →  text-[var(--color-accent)]
```

Import `motion` from `@/lib/typography` if not already imported.

- [ ] **Step 2: Migrate engine view components**

For each file in `components/engines/`, apply the substitution table. Engine views tend to use Tailwind-only classes (no inline styles from the token system). Key patterns:

```
text-white/90          →  text-[var(--color-ink-1)]
text-white/70          →  text-[var(--color-ink-2)]
text-white/50          →  text-[var(--color-ink-3)]
text-white/30          →  text-[var(--color-ink-4)]
bg-white/[0.02]        →  bg-[var(--color-surface-1)]
bg-white/5             →  bg-[var(--color-surface-1)]
border-white/10        →  border-[var(--color-border)]
border-white/[0.06]    →  border-[var(--color-border-subtle)]
hover:bg-white/[0.06]  →  hover:bg-[var(--color-surface-hover)]
text-violet-300        →  text-[var(--color-ink-2)]
bg-violet-950/40       →  bg-[var(--color-surface-2)]
border-violet-800/30   →  border-[var(--color-border)]
text-amber-400         →  text-[var(--color-accent)]
text-amber-300/80      →  text-[var(--color-accent-dim)]
bg-amber-950/20        →  bg-[var(--color-accent-faint)]
border-amber-800/20    →  border-[var(--color-accent-dim)]
text-emerald-400       →  text-[var(--color-success)]
text-red-400           →  text-[var(--color-danger)]
text-muted-foreground  →  text-[var(--color-ink-3)]
```

SVG chart colors inside engine views that are computed from chart data (e.g., planet colors, house colors) — leave those hardcoded. They are data visualization values, not theme surfaces.

- [ ] **Step 3: TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 4: Run tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add "app/consultation/" "components/engines/"
git commit -m "feat: migrate consultation and engine views to theme tokens (phase 5)"
```

---

## Task 12: Migrate remaining components

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: any remaining files found by audit below

- [ ] **Step 1: Audit what's left**

```bash
grep -rn "rgba(255,255,255\|rgba(251,191\|bg-white/\|border-white/\|text-white/" \
  --include="*.tsx" --include="*.ts" \
  /Users/vinaychaganti/Documents/VibeCodedApps/ExperimentVercelLaunch/AstroRepos/astrounified \
  --exclude-dir=node_modules --exclude-dir=.next \
  -l
```

Fix every file that appears in the output using the substitution table.

- [ ] **Step 2: Migrate `app/admin/page.tsx`**

Apply substitution table. Admin page is low-traffic but should be consistent.

- [ ] **Step 3: Audit for old font variable references**

```bash
grep -rn "var(--font-sans)\|var(--font-cormorant)" \
  --include="*.tsx" --include="*.ts" \
  /Users/vinaychaganti/Documents/VibeCodedApps/ExperimentVercelLaunch/AstroRepos/astrounified \
  --exclude-dir=node_modules --exclude-dir=.next
```

Replace any found:
- `var(--font-sans)` → `var(--font-ui)`
- `var(--font-cormorant)` → `var(--font-display)`

- [ ] **Step 5: Check for any remaining `transition-colors duration-150` Tailwind classes**

The old `interactive` token used `transition-colors duration-150`. The new one uses `transition-all`. Find any leftover:

```bash
grep -rn "duration-150\|transition-colors duration" \
  --include="*.tsx" \
  /Users/vinaychaganti/Documents/VibeCodedApps/ExperimentVercelLaunch/AstroRepos/astrounified \
  --exclude-dir=node_modules --exclude-dir=.next
```

Replace any found with `transition-all` (timing now comes from CSS variable, not Tailwind class).

- [ ] **Step 6: Final TypeScript check**

```bash
./node_modules/.bin/tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run
```

Expected: all 150 tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: migrate remaining components to theme tokens (phase 6)"
```

---

## Task 13: Update CHANGELOG and push

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add changelog entry**

Add to the top of the dated entries in `CHANGELOG.md`:

```markdown
## [2026-05-17] — Theme layer: runtime dark/light toggle with CSS custom properties

### Added
- **`lib/theme.ts`** — theme registry; adding a new theme = one entry here + one CSS block.
- **`components/ThemeProvider.tsx`** — next-themes wrapper; sets `data-theme` on `<html>`, persists to localStorage, no flash on reload.
- **`components/ThemeToggle.tsx`** — cycles themes; visible in desktop nav and mobile utility strip.
- **`motion` token** in `lib/typography.ts` — theme-aware timing/easing for inline `transition` values.

### Changed
- **`app/globals.css`** — replaced `.dark {}` with `[data-theme="dark"]`; added `[data-theme="light"]` (archival theme); added semantic ink/surface/accent tokens to `@theme inline`; shadcn variables now remap to our semantic tokens so shadcn components participate in theming automatically.
- **`lib/typography.ts`** — all hardcoded `rgba()` and `px` values replaced with `var(--*)` references. `glass`, `radii`, `interactive` tokens are now fully theme-aware.
- **`app/layout.tsx`** — preloads 5 font families (Philosopher, Mulish for dark; Libre Baskerville, Inter, JetBrains Mono for light); removed hardcoded `dark` class from `<html>`.
- **All ~40 components** — migrated from scattered `bg-white/5`, `border-white/10`, hardcoded rgba, hardcoded px radius, hardcoded transition strings to semantic theme tokens.

### How to add a third theme
1. Add one `[data-theme="new-theme"]` block to `app/globals.css` with all token values.
2. Add one entry to `THEMES` in `lib/theme.ts`.
3. Zero component changes required.
```

- [ ] **Step 2: Final checks**

```bash
./node_modules/.bin/tsc --noEmit && npx vitest run
```

Expected: zero TypeScript errors, all tests pass.

- [ ] **Step 3: Commit and push**

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog for theme layer implementation"
git push origin development
```

---

## Verification Checklist

After all tasks complete, manually verify in the browser:

- [ ] Dark theme (default on first load): cosmic deep navy background, amber gold accents, rounded corners, springy hover transitions
- [ ] Toggle to light theme: parchment background (#F5F3EC), crimson accents, square corners, snappy transitions
- [ ] Toggle persists on page reload (localStorage)
- [ ] No flash of unstyled content on reload in either theme
- [ ] NavBar renders correctly in both themes (desktop and mobile)
- [ ] Profile list, profile detail, compatibility, consultation pages all switch cleanly
- [ ] Adding a third theme: add one block to `globals.css` + one entry to `THEMES` — verify toggle cycles through it
